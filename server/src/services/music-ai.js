// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// The AI's song tools. play_song is for every user (YouTube's own player in the chat, nothing stored);
// download_song is only offered to the owner's accounts (music.service.js DOWNLOAD_EMAILS), for personal use.
// Results are JSON; the chat shows them with the songs card (client answer-cards/songs).
import { canDownloadSongs, downloadSong, publicSong, searchSongs, songPlayUrl } from "./music.service.js";

export const PLAY_SONG_TOOL = {
    type: "function",
    function: {
        name: "play_song",
        description: "Find a song (or a few) on YouTube and play it right in the chat with YouTube's own player. Works for every user, no login or Spotify Premium needed. Use it whenever the user asks to play, hear or find a song or music, unless they ask for Spotify by name. Pass the song name with the artist when you know it, or a YouTube link.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "Song name and artist (e.g. 'Kesariya Arijit Singh'), a mood ('calm lofi for studying') or a YouTube link." },
                count: { type: "number", description: "How many results to show, 1-10. Default 5; the first one plays." },
            },
            required: ["query"],
        },
    },
};

export const DOWNLOAD_SONG_TOOL = {
    type: "function",
    function: {
        name: "download_song",
        description: "Download a song's audio from YouTube and save it to the user's private song library, with a player and a download button in the chat. Only for this account's personal use; never offer to share the file. Pass a song name or a YouTube link.",
        parameters: {
            type: "object",
            properties: { query: { type: "string", description: "Song name and artist, or a YouTube link." } },
            required: ["query"],
        },
    },
};

/** Tools for this user: play_song always, download_song only for the owner's accounts */
export function songTools(email) {
    return canDownloadSongs(email) ? [PLAY_SONG_TOOL, DOWNLOAD_SONG_TOOL] : [PLAY_SONG_TOOL];
}

export async function runPlaySong(args = {}) {
    try {
        const songs = await searchSongs(args.query, args.count || 5);
        if (!songs.length) return JSON.stringify({ error: `No songs found for "${args.query}".` });
        return JSON.stringify({ songs, playing: songs[0].title, note: "The chat shows these in a player card under your reply; the first one is playing. Say it in one short line and don't paste the links." });
    } catch (err) {
        return JSON.stringify({ error: `Couldn't search songs: ${err.message}` });
    }
}

export async function runDownloadSong(user, args = {}) {
    if (!canDownloadSongs(user?.email)) return JSON.stringify({ error: "Downloading songs isn't available for this account." });
    try {
        const { song, already } = await downloadSong(user._id || user.id, args.query);
        return JSON.stringify({ saved: publicSong(song, await songPlayUrl(song)), already_saved: already, note: "The chat shows a player and a download button for it." });
    } catch (err) {
        return JSON.stringify({ error: `Couldn't download it: ${err.message}` });
    }
}
