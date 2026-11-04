#!/bin/bash
# Puts a new server version live only when nobody is using the server (.github/workflows/deploy-backend.yml starts it
# on EC2 after each push). It waits until the server has been quiet for a full minute: no requests being answered
# (an AI answer is one long request) and no helpers working, as the running server reports in ~/.classgrid-busy
# (server.js). A server too old to report is judged by its own log instead (log_quiet). Then it takes the
# newest code from GitHub, installs packages only if they changed, and restarts. A newer push replaces this wait.
set -u

APP=/var/www/classgrid_platform
BUSY_DIR="$HOME/.classgrid-busy"
PID_FILE="$HOME/.classgrid-deploy-wait.pid"
QUIET_NEEDED=4   # quiet checks in a row (15 s apart: one minute)

echo $$ > "$PID_FILE"
echo "[$(date -u +%FT%TZ)] waiting for a quiet moment to put the new server version live"

# Requests + helpers of every running server process, from reports fresher than 20 s; -1 when there are none
busy_now() {
  node -e '
    const fs = require("fs"), path = require("path"), dir = process.argv[1];
    let total = 0, fresh = 0;
    try {
      for (const f of fs.readdirSync(dir)) {
        try {
          const r = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
          if (Date.now() - r.at > 20000) continue;
          fresh++;
          total += (r.requests || 0) + (r.helpers || 0);
        } catch {}
      }
    } catch {}
    console.log(fresh ? total : -1);
  ' "$BUSY_DIR"
}

# (a server too old to report) its own log says whether an AI answer is running: 1 when no AI line was written for 3
# minutes and every answer that started in the last 30 minutes has ended, else 0
log_quiet() {
  LOG=$(pm2 jlist 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const p=JSON.parse(d).find(x=>x.name==='classgrid');console.log(p?p.pm2_env.pm_out_log_path:'')}catch{console.log('')}})")
  if [ -z "$LOG" ] || [ ! -f "$LOG" ]; then echo 0; return; fi
  tail -n 6000 "$LOG" | node -e '
    let d = "";
    process.stdin.on("data", (c) => (d += c)).on("end", () => {
      const now = Date.now();
      let lastAi = 0, started = 0, ended = 0;
      for (const l of d.split("\n")) {
        const m = l.match(/(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z)\s.*\[AI-/);
        if (!m) continue;
        const at = Date.parse(m[1]);
        lastAi = Math.max(lastAi, at);
        if (now - at > 30 * 60 * 1000) continue;
        if (/GENERATE START/.test(l)) started++;
        else if (/GENERATE END|ATTEMPT \d+ ERROR|replaced this answer|Request aborted/.test(l)) ended++;
      }
      console.log(now - lastAi > 3 * 60 * 1000 && ended >= started ? 1 : 0);
    });'
}

quiet=0
last_note=0
while true; do
  busy=$(busy_now)
  if [ "$busy" = "-1" ]; then
    # (no reports: the running server is older than this script) quiet when its log shows no AI answer running
    if [ "$(log_quiet)" = "1" ]; then quiet=$((quiet + 1)); else quiet=0; fi
  elif [ "$busy" = "0" ]; then
    quiet=$((quiet + 1))
  else
    quiet=0
  fi
  if [ "$quiet" -ge "$QUIET_NEEDED" ]; then break; fi
  now=$(date +%s)
  if [ $((now - last_note)) -ge 600 ]; then
    echo "[$(date -u +%FT%TZ)] still waiting: busy=$busy"
    last_note=$now
  fi
  sleep 15
done

echo "[$(date -u +%FT%TZ)] quiet for a minute: putting the new version live"
# (from here on a newer push doesn't stop this one: it waits for its own quiet moment after this restart)
rm -f "$PID_FILE"
cd "$APP" || exit 1
OLD_LOCK=$(git rev-parse HEAD:server/package-lock.json 2>/dev/null || echo none)
git fetch origin
git reset --hard origin/main
NEW_LOCK=$(git rev-parse HEAD:server/package-lock.json 2>/dev/null || echo none)

cd server
sudo chown -R ubuntu:ubuntu . || true
if [ "$OLD_LOCK" != "$NEW_LOCK" ] || [ ! -d node_modules ]; then
  echo "[$(date -u +%FT%TZ)] packages changed: installing"
  sudo apt-get clean || true
  npm cache clean --force || true
  npm install --omit=dev --no-audit --no-fund --legacy-peer-deps || (sudo rm -rf node_modules && npm install --omit=dev --no-audit --no-fund --legacy-peer-deps)
fi

pm2 restart classgrid --update-env
MAIN_UP=0
for i in $(seq 1 45); do
  if curl -sf -o /dev/null --max-time 3 http://localhost:3000/; then MAIN_UP=1; break; fi
  sleep 2
done
if [ "$MAIN_UP" = "1" ]; then
  for name in $(pm2 jlist | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).map(p=>p.name).filter(n=>n!=='classgrid').join(' ')))"); do
    pm2 restart "$name" --update-env
  done
  echo "[$(date -u +%FT%TZ)] the new version is live"
else
  echo "[$(date -u +%FT%TZ)] the main server did not come up, keeping the rescue server on the previous code"
fi
