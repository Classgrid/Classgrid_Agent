// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// /api/music: the owner's downloaded songs (download_song). Each user only ever sees their own.
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import SavedSong from "../models/SavedSong.js";
import { publicSong, removeSong, songPlayUrl } from "../services/music.service.js";

const router = express.Router();
router.use(isAuthenticated);
const uid = (req) => req.user?._id || req.user?.id;

router.get("/saved", async (req, res) => {
    const songs = await SavedSong.find({ userId: uid(req) }).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, songs: songs.map((s) => publicSong(s)) });
});

// A fresh signed link to play or download one song (links last 15 minutes)
router.get("/:id/url", async (req, res) => {
    const song = await SavedSong.findOne({ _id: req.params.id, userId: uid(req) }).catch(() => null);
    if (!song) return res.status(404).json({ success: false, message: "Song not found." });
    res.json({ success: true, url: await songPlayUrl(song) });
});

router.delete("/:id", async (req, res) => {
    const song = await SavedSong.findOne({ _id: req.params.id, userId: uid(req) }).catch(() => null);
    if (!song) return res.status(404).json({ success: false, message: "Song not found." });
    await removeSong(song);
    res.json({ success: true });
});

export default router;
