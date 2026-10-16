#!/bin/bash
# Rebuild Classgrid Code on the sandbox server. Run from a checkout of the repo: infra/ide/build.sh
# Builds the editor image, the Classgrid add-on and the logos, and copies the setup files to /home/ubuntu/ide_branding.
# Needs: Docker, python3, the AI sandbox image (server/agent-sandbox-env) built as classgrid-ai-sandbox.
set -e
cd "$(dirname "$0")"
B=/home/ubuntu/ide_branding
PUB=../../client/public
# A new 40-character build id every build, so browsers load the new files
COMMIT=${COMMIT:-$(date +%s%N | sha1sum | cut -c1-40)}

# Logos (from the website's own icons)
mkdir -p assets
cp "$PUB/favicon.ico" assets/favicon.ico
cp "$PUB/android-chrome-192x192.png" assets/code-192.png
cp "$PUB/android-chrome-512x512.png" assets/code-512.png
B64=$(base64 -w0 "$PUB/android-chrome-512x512.png")
svg() { echo "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 512 512\" width=\"512\" height=\"512\"><image width=\"512\" height=\"512\" opacity=\"$1\" xlink:href=\"data:image/png;base64,$B64\"/></svg>"; }
svg 0.12 > assets/letterpress.svg
svg 1 > assets/code-icon.svg

# Editor image
docker build --build-arg COMMIT="$COMMIT" -t classgrid-ide .

# Setup files and the Classgrid add-on (bridge)
mkdir -p "$B"
cp files/Caddyfile files/ide-user.sh files/ide-firewall.sh files/ide-disk-check.sh files/user-machine-settings.json "$B/"
chmod +x "$B/ide-user.sh" "$B/ide-firewall.sh" "$B/ide-disk-check.sh"

# Safe extensions every box gets (the extension store is off), latest versions from Open VSX
mkdir -p "$B/extensions"
while read -r EXT; do
  [ -n "$EXT" ] || continue
  URL=$(curl -s "https://open-vsx.org/api/$EXT/latest" | python3 -c "import sys,json;print(json.load(sys.stdin)['files']['download'])")
  curl -sL -o "$B/extensions/$(echo "$EXT" | tr / .).vsix" "$URL"
done < files/extensions.txt
python3 build-bridge-vsix.py bridge "$B/classgrid-bridge.vsix"
echo "Built Classgrid Code (build $COMMIT). Next steps: README.md"
