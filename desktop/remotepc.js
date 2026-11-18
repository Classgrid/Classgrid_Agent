// Remote PC on this computer (owner, 2026-11-18: the chat on the computer followed and answered from the phone; "add
// essential settings in Classgrid Code, VSX, the desktop app and the mobile app"). The work runs on this computer, so
// it goes on only while the app runs and the computer is awake. What this file does, each part a setting in
// Settings > General > Remote PC (kept in remote-pc.json in the app's folder):
//   - allow:        this computer can be controlled from the phone (off: the server refuses messages from the phone
//                   for its chats; the app tells it, PUT /api/remote/devices/:deviceId)
//   - trayOnClose:  closing the window hides the app to the tray (an icon by the clock) and the work goes on; the
//                   tray's Quit ends it, asking first while the AI is working. Before this, closing the window quit the
//                   app and stopped every running command.
//   - keepAwake:    while the AI works on this computer (a step running, or a background command), the computer is
//                   kept from going to sleep by itself (powerSaveBlocker "prevent-app-suspension"). Closing a laptop's
//                   lid still sleeps it: that is Windows' own setting (Power Options > "Choose what closing the lid
//                   does"), which an app must not change; Settings shows where it is.
//   - openAtLogin:  Classgrid starts (hidden, in the tray) when the person signs in to Windows; off by default.
//   - defaultMode:  the permission mode the phone starts with for this computer's chats (the phone can change it).
// After sleep, the connection to the server is made again at once (powerMonitor "resume").
const { app, Tray, Menu, powerSaveBlocker, powerMonitor, nativeImage, dialog } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULTS = { allow: true, keepAwake: true, trayOnClose: true, openAtLogin: false, defaultMode: "default" };
const MODES = new Set(["review", "default", "auto", "turbo"]);
const IDLE_MS = 3 * 60 * 1000; // the computer may sleep again this long after the last step

let file = null;
let settings = { ...DEFAULTS };
let tray = null;
let quitting = false;
let blocker = null;
let idleTimer = null;
let ctx = { getWindow: () => null, runner: null, icon: null, onAllowChanged: null };

function read() {
    try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, "utf8")) }; } catch { return { ...DEFAULTS }; }
}

/** Only known settings, of the right kind (what the screens send is checked) */
function clean(patch) {
    const out = {};
    for (const key of ["allow", "keepAwake", "trayOnClose", "openAtLogin"]) if (typeof patch?.[key] === "boolean") out[key] = patch[key];
    if (MODES.has(patch?.defaultMode)) out.defaultMode = patch.defaultMode;
    return out;
}

function applyLogin() {
    if (!app.isPackaged) return; // (a test copy is never put in Windows' start list)
    try { app.setLoginItemSettings({ openAtLogin: !!settings.openAtLogin, args: ["--hidden"] }); } catch { /* not on this system */ }
}

function release() {
    if (blocker !== null) { try { powerSaveBlocker.stop(blocker); } catch { /* already stopped */ } blocker = null; }
}

// A step started or ended: keep the computer awake while it works, and for a few minutes after the last step (the AI
// is usually about to run the next one)
function onActivity() {
    if (!settings.keepAwake) return release();
    if (blocker === null) { try { blocker = powerSaveBlocker.start("prevent-app-suspension"); } catch { blocker = null; } }
    if (idleTimer) clearTimeout(idleTimer);
    const check = () => {
        if (ctx.runner?.busy()) { idleTimer = setTimeout(check, IDLE_MS); idleTimer.unref?.(); return; }
        release();
    };
    idleTimer = setTimeout(check, IDLE_MS);
    idleTimer.unref?.();
}

function showWindow() {
    const win = ctx.getWindow();
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
}

function ensureTray() {
    if (tray) return;
    try {
        tray = new Tray(nativeImage.createFromPath(ctx.icon).resize({ width: 16, height: 16 }));
        tray.setToolTip("Classgrid");
        tray.setContextMenu(Menu.buildFromTemplate([
            { label: "Open Classgrid", click: showWindow },
            { type: "separator" },
            { label: "Quit Classgrid", click: () => quit() },
        ]));
        tray.on("click", showWindow);
    } catch (e) {
        console.log("[remote pc] tray:", e.message);
        tray = null;
    }
}

/** Asks before ending work that is running on this computer. True: go on (nothing runs, or the person said yes). */
async function okToStop(detailWhy) {
    if (!ctx.runner?.busy()) return true;
    const win = ctx.getWindow();
    const { response } = await dialog.showMessageBox(win && !win.isDestroyed() ? win : undefined, {
        type: "warning",
        title: "Classgrid",
        message: "Classgrid is working on this computer.",
        detail: `${detailWhy} The command or task that is running now stops.`,
        buttons: ["Quit anyway", "Keep working"],
        defaultId: 1,
        cancelId: 1,
    });
    return response === 0;
}

async function quit() {
    if (!(await okToStop("Quitting stops it."))) return;
    quitting = true;
    app.quit();
}

module.exports = {
    /** userDataDir; getWindow: the main window; runner; icon: the app's icon file. Call before the window is made. */
    init(userDataDir, options) {
        file = path.join(userDataDir, "remote-pc.json");
        ctx = { ...ctx, ...options };
        settings = read();
        applyLogin();
        ctx.runner?.onActivity(onActivity);
        powerMonitor.on("resume", () => { try { ctx.runner?.reconnect(); } catch { /* reconnects by itself later */ } });
        app.on("before-quit", () => { quitting = true; release(); });
    },
    get: () => ({ ...settings }),
    /** Saves the settings given; returns all of them. */
    save(patch) {
        const before = settings;
        settings = { ...settings, ...clean(patch) };
        try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(settings)); } catch { /* kept for this run */ }
        if (before.openAtLogin !== settings.openAtLogin) applyLogin();
        if (!settings.keepAwake) release();
        if (!settings.trayOnClose && tray && ctx.getWindow()?.isVisible()) { tray.destroy(); tray = null; }
        if (before.allow !== settings.allow) { try { ctx.onAllowChanged?.(settings.allow); } catch { /* the screens tell the server */ } }
        return { ...settings };
    },
    /** The main window's close button hides it to the tray (trayOnClose), unless the app is quitting. */
    attachWindow(win) {
        win.on("close", (e) => {
            if (quitting || !settings.trayOnClose) return;
            e.preventDefault();
            win.hide();
            ensureTray();
        });
    },
    /** Started by Windows at sign-in (--hidden): no window, only the tray. */
    startHidden: () => process.argv.includes("--hidden"),
    showInTray: ensureTray,
    /** The app stays open with no window (tray mode). */
    keepsRunning: () => !!tray && !quitting,
    okToStop,
    markQuitting() { quitting = true; },
};
