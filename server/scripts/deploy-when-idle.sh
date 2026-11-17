#!/bin/bash
# Puts a new server version live only when nobody is using the server (.github/workflows/deploy-backend.yml starts it
# on EC2 after each push). It waits until the server has been quiet for a full minute: no requests being answered
# (an AI answer is one long request) and no helpers working, as the running server reports in ~/.classgrid-busy
# (src/utils/busy-report.js). A server too old to report is judged by its own log instead (log_quiet). Then it takes
# the newest code from GitHub, installs packages only if they changed, and restarts. A newer push replaces this wait.
#
# The rescue server takes people's requests while the main one restarts. It is restarted only when it has finished
# what it took (its own report shows nothing running), not right after the main one: on 2026-11-17 a question asked
# in the seconds of a restart was answered by the rescue server and cut in the middle when it was restarted too
# (owner: "it shows the answer but it got hidden within a second").
set -u

# (CLASSGRID_APP: another folder, for the script's own test)
APP="${CLASSGRID_APP:-/var/www/classgrid_platform}"
BUSY_DIR="$HOME/.classgrid-busy"
PID_FILE="$HOME/.classgrid-deploy-wait.pid"
QUIET_NEEDED=4   # quiet checks in a row (15 s apart: one minute)
QUIET_SLEEP="${CLASSGRID_QUIET_SLEEP:-15}"   # (seconds between two checks; shorter only in the script's own test)

echo $$ > "$PID_FILE"
echo "[$(date -u +%FT%TZ)] waiting for a quiet moment to put the new server version live"

# Requests + helpers of the main server, from reports fresher than 20 s; -1 when there are none. (A report with
# another name is another process, the rescue server: it does not hold the main server's restart back; it has its own
# wait below, busy_of.)
busy_now() {
  node -e '
    const fs = require("fs"), path = require("path"), dir = process.argv[1];
    let total = 0, fresh = 0;
    try {
      for (const f of fs.readdirSync(dir)) {
        try {
          const r = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
          if (Date.now() - r.at > 20000) continue;
          if (r.name && r.name !== "classgrid") continue;
          fresh++;
          total += (r.requests || 0) + (r.helpers || 0);
        } catch {}
      }
    } catch {}
    console.log(fresh ? total : -1);
  ' "$BUSY_DIR"
}

# Requests + helpers of ONE process (its pm2 name), from its own report; -1 when it has no fresh report (a process
# that does not report, or one too old to)
busy_of() {
  PID=$(pm2 jlist 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const p=JSON.parse(d).find(x=>x.name===process.argv[1]);console.log(p&&p.pid?p.pid:'')}catch{console.log('')}})" "$1")
  if [ -z "$PID" ]; then echo -1; return; fi
  node -e '
    const fs = require("fs"), path = require("path");
    try {
      const r = JSON.parse(fs.readFileSync(path.join(process.argv[1], process.argv[2] + ".json"), "utf8"));
      console.log(Date.now() - r.at > 20000 ? -1 : (r.requests || 0) + (r.helpers || 0));
    } catch { console.log(-1); }
  ' "$BUSY_DIR" "$PID"
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
  sleep "$QUIET_SLEEP"
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

# The new code is on the disk; a request that came in while it was fetched is not cut: the main server is restarted
# when it is still quiet, else after its next quiet moment (two checks, 5 s apart)
quiet=0
while [ "$quiet" -lt 2 ]; do
  busy=$(busy_now)
  if [ "$busy" = "0" ] || [ "$busy" = "-1" ]; then quiet=$((quiet + 1)); else quiet=0; echo "[$(date -u +%FT%TZ)] a request came in: waiting for it before the restart (busy=$busy)"; fi
  if [ "$quiet" -lt 2 ]; then sleep 5; fi
done

pm2 restart classgrid --update-env
MAIN_UP=0
for i in $(seq 1 45); do
  if curl -sf -o /dev/null --max-time 3 http://localhost:3000/; then MAIN_UP=1; break; fi
  sleep 2
done
if [ "$MAIN_UP" = "1" ]; then
  for name in $(pm2 jlist | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).map(p=>p.name).filter(n=>n!=='classgrid').join(' ')))"); do
    # A process that answers people too (the rescue server, while the main one was restarting) is restarted when its
    # own report shows nothing running, twice in a row (5 s apart). One that does not report is restarted at once, as
    # before. After 20 minutes it is restarted whatever it is doing, so it never stays on the old code for good.
    waited=0
    calm=0
    while true; do
      b=$(busy_of "$name")
      if [ "$b" = "-1" ]; then break; fi
      if [ "$b" = "0" ]; then calm=$((calm + 1)); else calm=0; fi
      if [ "$calm" -ge 2 ]; then break; fi
      if [ "$waited" -ge 1200 ]; then echo "[$(date -u +%FT%TZ)] $name is still answering after 20 minutes (busy=$b): restarting it now"; break; fi
      if [ "$b" != "0" ] && [ $((waited % 60)) -eq 0 ]; then echo "[$(date -u +%FT%TZ)] $name is still answering (busy=$b): it is restarted when it has finished"; fi
      sleep 5
      waited=$((waited + 5))
    done
    pm2 restart "$name" --update-env
  done
  echo "[$(date -u +%FT%TZ)] the new version is live"
else
  echo "[$(date -u +%FT%TZ)] the main server did not come up, keeping the rescue server on the previous code"
fi
