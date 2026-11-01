// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * Songs in the AI chat (owner's order, 2026-11-01):
 * - play_song (every user): finds songs on YouTube; the chat plays them with YouTube's own embedded player.
 *   Nothing is downloaded or stored.
 * - download_song (only DOWNLOAD_EMAILS, the owner's own accounts, personal use): downloads the audio with
 *   yt-dlp and keeps it in R2 under an unguessable key, played through short-lived signed links.
 *
 * Search uses the YouTube Data API when GOOGLE_API_KEY (or YOUTUBE_API_KEY) is set, otherwise yt-dlp's own search.
 * The yt-dlp program is fetched once from its GitHub releases into ~/.cache/classgrid/.
 */
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import SavedSong from "../models/SavedSong.js";
import { uploadPrivateBufferToR2, getPrivateDownloadUrl, deleteFromR2 } from "../config/r2Client.js";

export const DOWNLOAD_EMAILS = ["support@classgrid.in", "nikhil.shinde@classgrid.in"];
export const canDownloadSongs = (email) => DOWNLOAD_EMAILS.includes(String(email || "").trim().toLowerCase());

const MAX_SECONDS = 20 * 60; // longer than this is a mix or a film, not a song
const BIN_DIR = path.join(os.homedir(), ".cache", "classgrid");
const BIN = path.join(BIN_DIR, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
const BIN_ASSET = process.platform === "win32" ? "yt-dlp.exe" : process.platform === "darwin" ? "yt-dlp_macos" : "yt-dlp_linux";
let binReady = null;

async function ensureBinary() {
    if (fs.existsSync(BIN)) return BIN;
    if (!binReady) {
        binReady = (async () => {
            fs.mkdirSync(BIN_DIR, { recursive: true });
            const res = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${BIN_ASSET}`, { signal: AbortSignal.timeout(120000) });
            if (!res.ok) throw new Error(`Couldn't get yt-dlp (${res.status})`);
            const tmp = `${BIN}.part`;
            fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
            fs.chmodSync(tmp, 0o755);
            fs.renameSync(tmp, BIN);
            return BIN;
        })().finally(() => { binReady = null; });
    }
    return binReady;
}

function runYtDlp(args, timeoutMs) {
    return new Promise(async (resolve, reject) => {
        let bin;
        try { bin = await ensureBinary(); } catch (e) { return reject(e); }
        execFile(bin, ["--no-warnings", "--no-progress", ...args], { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
            if (err) {
                const msg = String(stderr || err.message || "");
                if (/confirm you.?re not a bot|sign in to confirm/i.test(msg)) return reject(new Error("YouTube is blocking downloads from our server right now (it asks to confirm we're not a bot)."));
                return reject(new Error(msg.split("\n").filter((l) => /ERROR/.test(l)).pop()?.replace(/^ERROR:\s*/, "") || "yt-dlp failed"));
            }
            resolve(stdout);
        });
    });
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
export function videoIdFrom(input) {
    const s = String(input || "").trim();
    if (VIDEO_ID.test(s)) return s;
    try {
        const u = new URL(s);
        if (/(^|\.)youtu\.be$/.test(u.hostname)) return u.pathname.slice(1, 12);
        if (/(^|\.)youtube\.com$/.test(u.hostname)) return u.searchParams.get("v") || (u.pathname.match(/\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/)?.[2]) || null;
    } catch { /* not a link */ }
    return null;
}

const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const decode = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Songs on YouTube for a search: [{ videoId, title, channel, durationSec, thumbnail, url }] */
export async function searchSongs(query, limit = 5) {
    const q = String(query || "").trim();
    if (!q) throw new Error("Say which song to look for.");
    const n = Math.min(Math.max(Number(limit) || 5, 1), 10);
    const key = process.env.GOOGLE_API_KEY || process.env.YOUTUBE_API_KEY;
    if (key) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoCategoryId=10&maxResults=${n}&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`;
        const data = await (await fetch(url, { signal: AbortSignal.timeout(15000) })).json();
        if (!data.error) {
            return (data.items || []).map((it) => ({
                videoId: it.id.videoId, title: decode(it.snippet.title), channel: decode(it.snippet.channelTitle),
                durationSec: 0, thumbnail: thumb(it.id.videoId), url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
            }));
        }
        console.warn("[music] YouTube API search failed, using yt-dlp:", data.error.message);
    }
    const out = await runYtDlp([`ytsearch${n}:${q}`, "--flat-playlist", "-J"], 45000);
    const entries = (JSON.parse(out).entries || []).filter((e) => e?.id && VIDEO_ID.test(e.id));
    return entries.map((e) => ({
        videoId: e.id, title: e.title || "", channel: e.channel || e.uploader || "",
        durationSec: Math.round(Number(e.duration) || 0), thumbnail: thumb(e.id), url: `https://www.youtube.com/watch?v=${e.id}`,
    }));
}

/** Downloads one song's audio to R2 for this user (owner only). Returns the SavedSong document. */
export async function downloadSong(userId, input) {
    let videoId = videoIdFrom(input);
    if (!videoId) {
        const [first] = await searchSongs(input, 1);
        if (!first) throw new Error(`No song found for "${input}".`);
        videoId = first.videoId;
    }
    const existing = await SavedSong.findOne({ userId, videoId });
    if (existing) return { song: existing, already: true };

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-song-"));
    try {
        const info = JSON.parse(await runYtDlp([
            `https://www.youtube.com/watch?v=${videoId}`,
            "-f", "bestaudio[ext=m4a]/bestaudio",
            "--no-playlist", "--max-filesize", "60M",
            "--match-filter", `duration < ${MAX_SECONDS}`,
            "-o", path.join(dir, "song.%(ext)s"),
            "--no-simulate", "-j",
        ], 240000));
        const file = fs.readdirSync(dir).find((f) => f.startsWith("song.") && !f.endsWith(".part"));
        if (!file) throw new Error(info?.duration >= MAX_SECONDS ? "That video is longer than 20 minutes, so it isn't saved as a song." : "The download didn't finish.");
        const ext = path.extname(file).slice(1).toLowerCase();
        const mimeType = ext === "m4a" || ext === "mp4" ? "audio/mp4" : ext === "webm" ? "audio/webm" : ext === "mp3" ? "audio/mpeg" : "audio/ogg";
        const buf = fs.readFileSync(path.join(dir, file));
        const r2Key = `private/songs/${userId}/${crypto.randomUUID()}.${ext}`;
        await uploadPrivateBufferToR2(buf, r2Key, mimeType);
        const song = await SavedSong.create({
            userId, videoId, title: info.title || "", channel: info.channel || info.uploader || "",
            durationSec: Math.round(Number(info.duration) || 0), thumbnail: thumb(videoId), r2Key, mimeType, sizeBytes: buf.length,
        });
        return { song, already: false };
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

export async function songPlayUrl(song) {
    return getPrivateDownloadUrl(song.r2Key, 900);
}

export async function removeSong(song) {
    await deleteFromR2(song.r2Key).catch(() => {});
    await song.deleteOne();
}

export function publicSong(song, url) {
    return {
        id: String(song._id), videoId: song.videoId, title: song.title, channel: song.channel, durationSec: song.durationSec,
        thumbnail: song.thumbnail, mimeType: song.mimeType, sizeBytes: song.sizeBytes, createdAt: song.createdAt, ...(url ? { url } : {}),
    };
}
