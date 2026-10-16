# Classgrid Code (Project Mode editor): rebuild guide

Everything that runs on the **sandbox server** for Project Mode, so it can be rebuilt if that server is lost.
The backend side lives in `server/src/routes/ide.routes.js`, `server/src/services/ide-project.service.js` and
`server/src/mcp/tools.js`; the page is `client/src/features/superadmin/pages/ProjectModePage.tsx`.

## What runs on the sandbox

| Piece | What it does |
|---|---|
| `classgrid-ide` image | OpenVSCode Server (pinned version) renamed to "Classgrid Code": Classgrid theme and logo, no VS Code AI chat or account icon, auto-save on. Built on top of the AI sandbox image, so the editor's terminal has the same tools as the AI. |
| `ide` container | Serves only the editor's program files (no user data) on `127.0.0.1:3000`. |
| `ide-u-<userId>` containers | One editor box per user, started by `ide-user.sh` when they open a project. Sees only `/home/ubuntu/ide_users/<userId>`. 1.25 GB / 1 CPU, max 5 at once, stopped by the backend after 30 idle minutes. |
| `caddy` container | `https://ide.classgrid.in`. Checks the Classgrid login (`/api/ide/check`) and sends each user to their own box. |
| `ide-net` network + `ide-firewall.sh` | Boxes can't reach each other, cloud metadata, private networks or the host. |
| Classgrid add-on (`bridge/`) | Built into the image (users can't disable or uninstall it). Opens files from the chat at the right lines; keeps `.classgrid/context.json` (open file, cursor, selection, tabs, errors) for the AI. |
| Extensions | No extension store and no Extensions icon. Every box gets the safe ones in `files/extensions.txt` (Prettier, ESLint, Code Runner for the ▷ Run button), installed from `/home/ubuntu/ide_branding/extensions`. |
| Cron jobs | Clean chat `scratch/` folders (1 day) and package caches (30 days); hourly disk check per user (`ide-disk-check.sh`, 3 GB limit, report in `ide_branding/disk-report.txt`); re-apply the firewall after a restart. |

Folders on the sandbox: `/home/ubuntu/ide_branding` (setup files), `/home/ubuntu/ide_users/<userId>` (projects,
editor settings, package cache), `/home/ubuntu/sandbox_data/<chatId>` (the AI's chat folders).

## Rebuild from scratch

On the sandbox server, with Docker installed and this repo checked out:

```sh
# 1. The AI sandbox image (Python, Node, ffmpeg, LibreOffice ...)
docker build -t classgrid-ai-sandbox server/agent-sandbox-env

# 2. Classgrid Code image, add-on and setup files
infra/ide/build.sh

# 3. Network and firewall for user boxes (+ after every restart)
docker network create --subnet 172.30.0.0/16 --opt com.docker.network.bridge.enable_icc=false ide-net
sudo sh /home/ubuntu/ide_branding/ide-firewall.sh
sudo cp infra/ide/files/cron-classgrid-ide /etc/cron.d/classgrid-ide

# 4. Cleanup jobs (ubuntu user's crontab)
( crontab -l 2>/dev/null; cat infra/ide/files/crontab-ubuntu ) | sort -u | crontab -

# 5. Program files box and HTTPS
docker run -d --name ide --restart unless-stopped -p 127.0.0.1:3000:3000 classgrid-ide
docker run -d --name caddy --restart unless-stopped --network host -v caddy_data:/data \
  -v /home/ubuntu/ide_branding/Caddyfile:/etc/caddy/Caddyfile:ro caddy:2
```

Also needed: DNS `ide.classgrid.in` → the sandbox's public IP (A record in Vercel), and ports 80/443 open in its
AWS security group (keep SSH 22 open: the backend reaches the sandbox over SSH).

## Changing things

- **Editor changes** (defaults, name, theme): edit `patch-ide.sh`, then `infra/ide/build.sh`, then
  `docker rm -f ide && docker run ...` (step 5) and remove the `ide-u-*` boxes (they restart on the next open).
  Each build gets a new build id, so browsers load the new files.
- **Add-on changes**: edit `bridge/`, raise `version` in `bridge/package.json`, run `build.sh`, restart the
  `ide` container and remove the `ide-u-*` boxes.
- **Base version**: `patch-ide.sh` matches exact code of the pinned OpenVSCode version; after changing the
  `FROM` digest, the build stops with `PATCH FAILED: ...` where a change needs updating.
