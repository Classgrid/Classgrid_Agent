// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// Spotify Web API (endpoints as of the February 2026 changes): the user's token (refreshed when it expires) and every
// operation of the spotify_connector tool. The OAuth login itself is in routes/auth.spotify.routes.js.
import User from "../models/User.js";

const API = "https://api.spotify.com/v1";
export const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
export const spotifyBasicAuth = () => `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID?.trim()}:${process.env.SPOTIFY_CLIENT_SECRET?.trim()}`).toString("base64")}`;

// Saves a Spotify token response on the user (a refresh may or may not return a new refresh token)
export function saveSpotifyTokens(user, data) {
    user.spotify_access_token = data.access_token;
    if (data.refresh_token) user.spotify_refresh_token = data.refresh_token;
    user.spotify_token_expires_at = data.expires_in ? new Date(Date.now() + (data.expires_in - 60) * 1000) : null;
}

// A working Spotify access token for this user (refreshed when it has expired), or null when Spotify is not connected
export async function getSpotifyAccessToken(userOrId) {
    const user = typeof userOrId === "object" && userOrId?.save ? userOrId : await User.findById(userOrId);
    if (!user?.spotify_access_token) return null;
    if (!user.spotify_token_expires_at || user.spotify_token_expires_at > new Date()) return user.spotify_access_token;
    if (!user.spotify_refresh_token) return null;
    const res = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: spotifyBasicAuth() },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: user.spotify_refresh_token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        console.error("[Spotify] token refresh failed:", res.status, data?.error || "");
        return null;
    }
    saveSpotifyTokens(user, data);
    await user.save();
    return user.spotify_access_token;
}

async function call(token, method, path, body) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 204 || res.status === 202) return { success: true };
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.error?.message || data?.error || "request failed";
        // Player control needs Spotify Premium and an open Spotify app on some device
        const hint = /premium/i.test(msg) ? " (playback control needs Spotify Premium)" : /no active device/i.test(msg) ? " (open Spotify on a phone or computer first, or use transfer_playback)" : "";
        throw new Error(`Spotify API ${res.status}: ${msg}${hint}`);
    }
    return data;
}

const q = (params) => {
    const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])).toString();
    return s ? `?${s}` : "";
};
const need = (v, name) => {
    if (!v) throw new Error(`${name} is required for this operation`);
    return encodeURIComponent(String(v));
};
const list = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map((s) => String(s).trim()).filter(Boolean);
// Short form of a track (full objects are very long). id, image and duration_ms are for the song cards in the chat.
const image = (images) => (images || []).find((i) => i?.width && i.width <= 320)?.url || images?.[0]?.url || null;
const track = (t) => t && ({
    id: t.id, name: t.name, uri: t.uri, artists: (t.artists || []).map((a) => a.name).join(", "), album: t.album?.name,
    image: image(t.album?.images || t.images), duration_ms: t.duration_ms, url: t.external_urls?.spotify,
});

export async function runSpotifyOperation(token, a) {
    switch (a.operation) {
        case "get_profile": {
            const me = await call(token, "GET", "/me");
            return { id: me.id, name: me.display_name, email: me.email, country: me.country, plan: me.product, followers: me.followers?.total, image: image(me.images), url: me.external_urls?.spotify };
        }
        case "search": {
            const data = await call(token, "GET", `/search${q({ q: a.query, type: a.type || "track", limit: Math.min(Number(a.limit) || 5, 10), offset: a.offset })}`);
            const out = {};
            if (data.tracks) out.tracks = data.tracks.items.map(track);
            if (data.artists) out.artists = data.artists.items.map((x) => ({ id: x.id, name: x.name, uri: x.uri, genres: x.genres, image: image(x.images), url: x.external_urls?.spotify }));
            if (data.albums) out.albums = data.albums.items.map((x) => ({ id: x.id, name: x.name, uri: x.uri, artists: (x.artists || []).map((r) => r.name).join(", "), release_date: x.release_date, total_tracks: x.total_tracks, image: image(x.images), url: x.external_urls?.spotify }));
            if (data.playlists) out.playlists = data.playlists.items.filter(Boolean).map((x) => ({ id: x.id, name: x.name, uri: x.uri, owner: x.owner?.display_name, total: x.items?.total ?? x.tracks?.total, image: image(x.images), url: x.external_urls?.spotify }));
            return out;
        }
        case "get_current_playback": {
            const data = await call(token, "GET", "/me/player");
            if (data.success) return { playing: false, note: "Nothing is playing right now." };
            return { playing: data.is_playing, device: data.device?.name, volume: data.device?.volume_percent, shuffle: data.shuffle_state, repeat: data.repeat_state, track: track(data.item), progress_ms: data.progress_ms };
        }
        case "get_devices":
            return call(token, "GET", "/me/player/devices");
        case "play": {
            const uris = list(a.uris);
            const body = a.context_uri ? { context_uri: a.context_uri } : uris.length ? { uris } : undefined;
            return call(token, "PUT", `/me/player/play${q({ device_id: a.device_id })}`, body);
        }
        case "pause":
            return call(token, "PUT", `/me/player/pause${q({ device_id: a.device_id })}`);
        case "next":
            return call(token, "POST", `/me/player/next${q({ device_id: a.device_id })}`);
        case "previous":
            return call(token, "POST", `/me/player/previous${q({ device_id: a.device_id })}`);
        case "set_volume":
            return call(token, "PUT", `/me/player/volume${q({ volume_percent: Math.max(0, Math.min(100, Number(a.volume) || 0)), device_id: a.device_id })}`);
        case "set_shuffle":
            return call(token, "PUT", `/me/player/shuffle${q({ state: !!a.state, device_id: a.device_id })}`);
        case "set_repeat":
            return call(token, "PUT", `/me/player/repeat${q({ state: a.repeat || "off", device_id: a.device_id })}`);
        case "add_to_queue":
            return call(token, "POST", `/me/player/queue${q({ uri: a.uri, device_id: a.device_id })}`);
        case "transfer_playback":
            return call(token, "PUT", "/me/player", { device_ids: [a.device_id], play: a.state !== false });
        case "list_playlists": {
            const data = await call(token, "GET", `/me/playlists${q({ limit: a.limit || 20, offset: a.offset })}`);
            return { total: data.total, playlists: (data.items || []).filter(Boolean).map((p) => ({ id: p.id, name: p.name, uri: p.uri, owner: p.owner?.display_name, public: p.public, total: p.items?.total ?? p.tracks?.total, image: image(p.images), url: p.external_urls?.spotify })) };
        }
        case "get_playlist_items": {
            const data = await call(token, "GET", `/playlists/${need(a.playlist_id, "playlist_id")}/items${q({ limit: a.limit || 50, offset: a.offset })}`);
            return { total: data.total, items: (data.items || []).map((i) => track(i.item || i.track)) };
        }
        case "create_playlist": {
            const p = await call(token, "POST", "/me/playlists", { name: a.name || "New playlist", description: a.description || "", public: !!a.public });
            return { id: p.id, name: p.name, uri: p.uri, description: p.description, public: p.public, image: image(p.images), url: p.external_urls?.spotify };
        }
        case "add_to_playlist":
            return call(token, "POST", `/playlists/${need(a.playlist_id, "playlist_id")}/items`, { uris: list(a.uris) });
        case "remove_from_playlist":
            return call(token, "DELETE", `/playlists/${need(a.playlist_id, "playlist_id")}/items`, { items: list(a.uris).map((uri) => ({ uri })) });
        case "update_playlist":
            return call(token, "PUT", `/playlists/${need(a.playlist_id, "playlist_id")}`, { ...(a.name ? { name: a.name } : {}), ...(a.description !== undefined ? { description: a.description } : {}), ...(a.public !== undefined ? { public: !!a.public } : {}) });
        case "get_top_items": {
            const data = await call(token, "GET", `/me/top/${a.type === "artists" ? "artists" : "tracks"}${q({ time_range: a.time_range || "medium_term", limit: a.limit || 10 })}`);
            return (data.items || []).map((x) => (a.type === "artists" ? { id: x.id, name: x.name, uri: x.uri, genres: x.genres, image: image(x.images), url: x.external_urls?.spotify } : track(x)));
        }
        case "get_recently_played": {
            const data = await call(token, "GET", `/me/player/recently-played${q({ limit: a.limit || 20 })}`);
            return (data.items || []).map((i) => ({ ...track(i.track), played_at: i.played_at }));
        }
        case "get_saved_tracks": {
            const data = await call(token, "GET", `/me/tracks${q({ limit: a.limit || 20, offset: a.offset })}`);
            return { total: data.total, tracks: (data.items || []).map((i) => ({ ...track(i.track), added_at: i.added_at })) };
        }
        case "save_to_library":
            return call(token, "PUT", `/me/library${q({ uris: list(a.uris).join(",") })}`, { uris: list(a.uris) });
        case "remove_from_library":
            return call(token, "DELETE", `/me/library${q({ uris: list(a.uris).join(",") })}`, { uris: list(a.uris) });
        default:
            throw new Error(`Unknown operation: ${a.operation}`);
    }
}
