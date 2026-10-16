#!/bin/bash
# Start (or reuse) the Project Mode editor box of one user and print its local port.
set -e
U="$1"; [[ "$U" =~ ^[a-f0-9]{24}$ ]] || { echo "bad user" >&2; exit 2; }
MAX_BOXES=5
N="ide-u-$U"; D="/home/ubuntu/ide_users/$U"
exec 9>/tmp/ide-user.lock; flock 9
mkdir -p "$D/projects" "$D/.openvscode-server/data/Machine"
[ -f "$D/.openvscode-server/data/Machine/settings.json" ] || cp /home/ubuntu/ide_branding/user-machine-settings.json "$D/.openvscode-server/data/Machine/settings.json"
if [ -z "$(docker ps -q -f name="^$N$")" ]; then
  docker rm -f "$N" >/dev/null 2>&1 || true
  RUNNING=$(docker ps -q -f name="^ide-u-" | wc -l)
  [ "$RUNNING" -lt "$MAX_BOXES" ] || { echo "busy" >&2; exit 3; }
  PORT=""
  for p in $(seq 41000 41999); do ss -ltn | grep -q ":$p " || { PORT=$p; break; }; done
  # Classgrid add-on (opens files from the chat at the right lines); installed into the user's own extensions once
  BRIDGE=1.0.2
  if [ ! -d "$D/.openvscode-server/extensions/classgrid.classgrid-bridge-$BRIDGE" ]; then
    docker run --rm -v "$D:/home/workspace" -v /home/ubuntu/ide_branding/classgrid-bridge.vsix:/tmp/cg.vsix:ro --entrypoint /opt/ide/bin/openvscode-server classgrid-ide       --server-data-dir /home/workspace/.openvscode-server --extensions-dir /home/workspace/.openvscode-server/extensions --install-extension /tmp/cg.vsix --force >/dev/null 2>&1 || true
  fi
  docker run -d --name "$N" --network ide-net --memory 768m --memory-swap 768m --cpus 1 --pids-limit 512 -e npm_config_cache=/home/workspace/.cache/npm -e PIP_CACHE_DIR=/home/workspace/.cache/pip \
    -p "127.0.0.1:$PORT:3000" -v "$D:/home/workspace" classgrid-ide >/dev/null
  for i in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 0.5; done
fi
docker port "$N" 3000/tcp | head -1 | sed "s/.*://"
