# Classgrid desktop app (Windows)

Our screens (`client/`) packed in an Electron app. They run from this computer at `http://localhost:47821` and talk to the live backend (`api.classgrid.in`). Nothing loads from Vercel.

**Local runner.** A project opened from a folder on this computer runs its tools in that folder on this computer: the file tools, terminal commands, background commands and `run_code`. The backend sends them over a socket (`server/src/services/local-runner.service.js`), and `runner.js` runs them. Only folders picked in the app can be used.

## Run it while building

```
npm install
npm run build:client   # builds client/ into ./app (desktop mode)
npm start
```

To test against a local backend, add `CG_API=http://localhost:3000` to both commands.

## Make the installer

```
npm run dist           # dist/Classgrid Setup <version>.exe
```

## Publish an update

1. Raise `"version"` in `package.json`.
2. Run `npm run release`. It builds, makes the installer and uploads it with `latest.yml` to R2 (`desktop/`), using the R2 keys from `server/.env`.

Installed apps check for an update on start and every 6 hours, download it, and offer "Restart now".

**Download link:** `https://pub-96a564393c0440f2bab37ad8bbe92398.r2.dev/desktop/Classgrid%20Setup%20<version>.exe`

## Not yet

- Signing stamp: without it, Windows shows "Windows protected your PC" on the first install.
- Mac and Linux builds.
- The browser on this computer.
