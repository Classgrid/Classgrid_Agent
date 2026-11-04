#!/bin/bash
# Puts a new server version live only when nobody is using the server (.github/workflows/deploy-backend.yml starts it
# on EC2 after each push). It waits until the server has been quiet for a full minute: no requests being answered
# (an AI answer is one long request) and no helpers working, as the running server reports in ~/.classgrid-busy
# (server.js). A server too old to report waits for the night instead (00:00-05:00 India time). Then it takes the
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

quiet=0
last_note=0
while true; do
  busy=$(busy_now)
  if [ "$busy" = "-1" ]; then
    # (no reports: the running server is older than this script) only at night, India time
    hour=$(TZ=Asia/Kolkata date +%H)
    if [ "$hour" -lt 5 ]; then quiet=$((quiet + 1)); else quiet=0; fi
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
