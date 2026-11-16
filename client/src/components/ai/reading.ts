import { useSyncExternalStore } from "react";
import { fetchWithRescue } from "@/lib/rescue";

/**
 * Read aloud with a player, the same as the phone app's (owner, 2026-11-16: "you added pause and the line on the
 * phone, add it for web also"). Before this the website asked for ONE sound file of the whole answer, so the first
 * word waited for all of it, and the only control was stop (which also showed "The voice could not play this
 * answer", because emptying the sound's address counts as a playing error).
 *
 * Now the reading is asked for as a stream, the way the phone asks (POST /api/ai/speak, stream: true, audio:
 * "mp3": one `audio` event per sentence, the first on its way while the others are still being made). Every
 * sentence is kept, in its order, and one sound player plays them one after another, so the reading can be paused,
 * moved back and forward, sped up and played again. The bar that shows it is components/ReadingBar.tsx.
 *
 * One reading at a time. A reading that was heard to its end stays open (the bar shows "play again") until it is
 * closed or another one starts. A reading whose every sentence arrived is kept (the last 20 answers), so
 * listening to the same answer again asks the server for nothing and does not count as another voice reply.
 */

export type ReadingPhase = "loading" | "playing" | "paused" | "ended";

export type ReadingState = {
  /** The answer being read. */
  messageId: string;
  phase: ReadingPhase;
  positionMs: number;
  /** How much of the reading has arrived; the whole reading once `complete`. */
  durationMs: number;
  complete: boolean;
  /** Playing, but waiting for the next sentence. */
  buffering: boolean;
  speed: number;
};

/** How a reading went: heard to its end, closed by the user (`stopped`), or it could not be read (`message`). */
export type ReadingResult = { ok: true } | { ok: false; stopped: boolean; message: string };

const FAILED = "The voice could not read this answer right now. Try again in a moment.";
const NOT_PLAYED = "The voice could not play this answer. Try again.";
const STOPPED: ReadingResult = { ok: false, stopped: true, message: "" };

/** The speeds the bar's speed button goes through. */
export const READING_SPEEDS = [1, 1.25, 1.5, 2, 0.75];
export const nextReadingSpeed = (speed: number) => {
  const at = READING_SPEEDS.findIndex((s) => Math.abs(s - speed) < 0.01);
  return READING_SPEEDS[(at + 1) % READING_SPEEDS.length] ?? 1;
};
/** "1x", "1.25x", "0.75x". */
export const speedLabel = (speed: number) => `${Number(speed.toFixed(2))}x`;
/** "00:07", "12:34", "1:02:03". */
export const clockTime = (ms: number) => {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const two = (n: number) => String(n).padStart(2, "0");
  const hours = Math.floor(total / 3600);
  const rest = `${two(Math.floor((total % 3600) / 60))}:${two(total % 60)}`;
  return hours > 0 ? `${hours}:${rest}` : rest;
};

// ── What the reading is doing now, for the bar and the speaker button under the answer ──

let state: ReadingState | null = null;
const listeners = new Set<() => void>();
const setState = (next: ReadingState | null) => {
  state = next;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // a screen error never breaks the reading
    }
  });
};

export const getReading = () => state;
export const subscribeReading = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
/** What the reading is doing now, or null when nothing is being read (the bar: it follows every moment of it). */
export const useReading = () => useSyncExternalStore(subscribeReading, getReading, getReading);

const readingOn = () => state !== null;
/** Whether a reading is on: the chat leaves room for the bar. Changes only when a reading starts or is closed. */
export const useReadingOn = () => useSyncExternalStore(subscribeReading, readingOn, readingOn);

/**
 * What the speaker button under answer `messageId` shows: its reading is being fetched, is on (paused too), or
 * neither (a reading heard to its end is over for the button: the bar offers "play again"). Changes only then,
 * so the answers are not drawn again at every moment of a reading.
 */
export const useReadingOf = (messageId: string) => {
  const of = (): "idle" | "loading" | "playing" =>
    state?.messageId === messageId && state.phase !== "ended" ? (state.phase === "loading" ? "loading" : "playing") : "idle";
  return useSyncExternalStore(subscribeReading, of, of);
};

/**
 * Helpful / Not helpful belong to the answer's own row of buttons (AskAiPanel's MessageActions keeps them). The
 * bar's thumbs ask that row to act (ASK), and the row tells what the answer's mark is now (SET), so both show the
 * same thing.
 */
export const ANSWER_FEEDBACK_ASK = "classgrid:answer-feedback-ask";
export const ANSWER_FEEDBACK_SET = "classgrid:answer-feedback-set";
export type AnswerFeedback = "up" | "down" | null;

// ── The sentences ──

/** One sentence's sound: where the player finds it and how long it is. */
type Piece = { url: string; ms: number };

/** Whole readings kept for listening again: messageId → its sentences (the oldest goes past 20). */
const kept = new Map<string, Piece[]>();
const KEPT_AT_MOST = 20;

const forget = (pieces: Piece[]) => pieces.forEach((piece) => URL.revokeObjectURL(piece.url));

const bytesOf = (base64: string): ArrayBuffer => {
  const text = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(text.length));
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return bytes.buffer;
};

/** One event of the reading's stream (the server's ai-speak.controller.js speakStream). */
type SpeakEvent = { type?: unknown; data?: unknown; format?: unknown; encoding?: unknown; sampleRate?: unknown; failed?: unknown; message?: unknown };

/** Raw 16-bit mono sound as a WAV file (a server that does not send compressed sentences). */
const wavOf = (pcm: ArrayBuffer, rate: number) => {
  const header = new DataView(new ArrayBuffer(44));
  const word = (at: number, text: string) => {
    for (let i = 0; i < text.length; i++) header.setUint8(at + i, text.charCodeAt(i));
  };
  word(0, "RIFF");
  header.setUint32(4, 36 + pcm.byteLength, true);
  word(8, "WAVE");
  word(12, "fmt ");
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true); // plain PCM
  header.setUint16(22, 1, true); // one channel
  header.setUint32(24, rate, true);
  header.setUint32(28, rate * 2, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  word(36, "data");
  header.setUint32(40, pcm.byteLength, true);
  return new Blob([header.buffer as ArrayBuffer, pcm], { type: "audio/wav" });
};

/**
 * One `audio` event as a sentence the player can play. Its length is worked out from its size (a compressed
 * sentence has a steady bit rate, named in its format: "mp3_24000_48" is 48 kbit a second); the player corrects it
 * when it has opened the sentence.
 */
function pieceOf(event: SpeakEvent): Piece | null {
  try {
    const bytes = bytesOf(String(event.data));
    if (!bytes.byteLength) return null;
    const format = String(event.format || "");
    if (event.encoding === "mp3" || format.startsWith("mp3")) {
      const kbit = Number(format.split("_")[2]) || 48;
      return { url: URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" })), ms: (bytes.byteLength * 8) / kbit };
    }
    const rate = Number(event.sampleRate) || 24000;
    return { url: URL.createObjectURL(wavOf(bytes, rate)), ms: (bytes.byteLength / 2 / rate) * 1000 };
  } catch {
    return null;
  }
}

// ── The reading that is on ──

type Reading = {
  messageId: string;
  audio: HTMLAudioElement;
  pieces: Piece[];
  /** The sentence in the player (-1: none has arrived yet). */
  at: number;
  /** Where to start inside the sentence being opened (seconds), when it is not its beginning. */
  startAt: number | null;
  /** The user wants to hear it (false: paused). */
  wanted: boolean;
  /** Every sentence that arrived was heard, and more are on their way. */
  waiting: boolean;
  /** Every sentence has arrived. */
  complete: boolean;
  /** Heard to its end. */
  ended: boolean;
  speed: number;
  /** Tells whoever asked for the reading that it was heard to its end. */
  heard: () => void;
  close: (result: ReadingResult) => void;
};

let current: Reading | null = null;

const lengthOf = (pieces: Piece[], count = pieces.length) => {
  let ms = 0;
  for (let i = 0; i < count; i++) ms += pieces[i]?.ms ?? 0;
  return ms;
};

/** Tells the bar what the reading is doing now. */
function show(r: Reading) {
  if (current !== r) return;
  const durationMs = lengthOf(r.pieces);
  const positionMs = r.at < 0 ? 0 : r.ended || r.waiting ? durationMs : Math.min(durationMs, lengthOf(r.pieces, r.at) + (r.startAt ?? r.audio.currentTime) * 1000);
  setState({
    messageId: r.messageId,
    phase: r.at < 0 ? "loading" : r.ended ? "ended" : r.wanted ? "playing" : "paused",
    positionMs,
    durationMs,
    complete: r.complete,
    buffering: r.wanted && (r.waiting || r.at < 0),
    speed: r.speed,
  });
}

function play(r: Reading) {
  r.audio.play().catch((error) => {
    // The browser did not let the sound start by itself: the bar shows Play, and pressing it starts it
    if (current === r && error?.name === "NotAllowedError") {
      r.wanted = false;
      show(r);
    }
  });
}

/** Puts sentence `index` in the player, from `seconds` inside it. */
function open(r: Reading, index: number, seconds = 0) {
  r.at = index;
  r.waiting = false;
  r.ended = false;
  r.startAt = seconds > 0 ? seconds : null;
  r.audio.src = r.pieces[index]?.url ?? "";
  // (a newly opened sound starts at the default speed, so the chosen speed is the default too)
  r.audio.defaultPlaybackRate = r.speed;
  r.audio.playbackRate = r.speed;
  if (r.wanted) play(r);
  show(r);
}

/** The reading has been heard to its end. It stays open: the bar shows "play again". */
function end(r: Reading) {
  r.waiting = false;
  r.ended = true;
  r.wanted = false;
  r.heard();
  show(r);
}

/** The sentence in the player has been heard: the next one, or the end, or a wait for the next one. */
function after(r: Reading) {
  if (r.at + 1 < r.pieces.length) {
    open(r, r.at + 1);
  } else if (r.complete) {
    end(r);
  } else {
    r.waiting = true;
    show(r);
  }
}

/** Moves to `ms` from the reading's start, inside what has arrived. */
function moveTo(r: Reading, ms: number) {
  if (r.at < 0) return;
  const total = lengthOf(r.pieces);
  const target = Math.max(0, ms);
  if (target >= total) {
    // The end of what has arrived: the reading's end, or a wait for the next sentence
    r.audio.pause();
    r.at = r.pieces.length - 1;
    r.startAt = null;
    if (r.complete) {
      end(r);
    } else {
      r.waiting = true;
      show(r);
    }
    return;
  }
  let index = 0;
  let before = 0;
  for (const piece of r.pieces.slice(0, -1)) {
    if (before + piece.ms > target) break;
    before += piece.ms;
    index += 1;
  }
  const seconds = (target - before) / 1000;
  if (index === r.at && !r.waiting && !r.ended && r.startAt === null) {
    r.audio.currentTime = seconds;
    show(r);
  } else {
    open(r, index, seconds);
  }
}

function makeReading(messageId: string, pieces: Piece[], settle: (result: ReadingResult) => void, stopAsking: () => void): Reading {
  const audio = new Audio();
  audio.preload = "auto";
  let closed = false;

  const r: Reading = {
    messageId,
    audio,
    pieces,
    at: -1,
    startAt: null,
    wanted: true,
    waiting: false,
    complete: false,
    ended: false,
    speed: 1,
    heard: () => settle({ ok: true }),
    close: (result) => {
      if (closed) return;
      closed = true;
      stopAsking();
      // (the player's listeners go first: emptying it below would otherwise count as a playing error)
      audio.onloadedmetadata = audio.ontimeupdate = audio.onended = audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (kept.get(messageId) !== pieces) forget(pieces);
      if (current === r) {
        current = null;
        setState(null);
      }
      settle(result);
    },
  };

  audio.onloadedmetadata = () => {
    if (closed || r.at < 0) return;
    // The player knows the sentence's real length now
    const piece = r.pieces[r.at];
    if (piece && Number.isFinite(audio.duration) && audio.duration > 0) piece.ms = audio.duration * 1000;
    if (r.startAt !== null) {
      const seconds = Math.min(r.startAt, Number.isFinite(audio.duration) ? audio.duration : r.startAt);
      r.startAt = null;
      audio.currentTime = seconds;
    }
    show(r);
  };
  audio.ontimeupdate = () => {
    if (!closed) show(r);
  };
  audio.onended = () => {
    if (!closed) after(r);
  };
  audio.onerror = () => {
    if (!closed) r.close({ ok: false, stopped: false, message: NOT_PLAYED });
  };
  return r;
}

/** Every sentence of `r` has arrived: it is kept for listening again. */
function keep(r: Reading) {
  r.complete = true;
  if (r.messageId) {
    kept.delete(r.messageId);
    if (kept.size >= KEPT_AT_MOST) {
      const oldest = kept.keys().next().value as string;
      const pieces = kept.get(oldest)!;
      kept.delete(oldest);
      forget(pieces);
    }
    kept.set(r.messageId, r.pieces);
  }
  // (the last sentence was already heard while the server was saying there are no more)
  if (r.waiting) end(r);
  else show(r);
}

/**
 * Reads `text` (the answer `messageId`) aloud through the player. Resolves when it was heard to its end, was
 * closed, or could not be read. `onStarted` is called once, when the first sentence is in the player.
 */
export function startReading(text: string, messageId: string, onStarted?: () => void): Promise<ReadingResult> {
  current?.close(STOPPED);

  return new Promise<ReadingResult>((resolve) => {
    let settled = false;
    const settle = (result: ReadingResult) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    const abort = new AbortController();
    const again = kept.get(messageId);
    const r = makeReading(messageId, again || [], settle, () => abort.abort());
    current = r;
    show(r);

    if (again) {
      // Heard before: nothing is asked of the server
      r.complete = true;
      open(r, 0);
      onStarted?.();
      return;
    }

    let added = 0;
    let over = false;
    /** No more sentences are coming. */
    const noMore = () => {
      if (over || current !== r) return;
      over = true;
      if (added > 0) keep(r);
      else r.close({ ok: false, stopped: false, message: FAILED });
    };
    const take = (line: string) => {
      if (over || current !== r || !line.startsWith("data:")) return;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") return;
      let event: SpeakEvent | null;
      try {
        event = JSON.parse(data);
      } catch {
        return;
      }
      if (event?.type === "audio") {
        if (event.failed || typeof event.data !== "string" || !event.data) return; // (a sentence that could not be voiced is skipped)
        const piece = pieceOf(event);
        if (!piece) return;
        r.pieces.push(piece);
        added += 1;
        if (r.at < 0) {
          open(r, 0);
          onStarted?.();
        } else if (r.waiting) {
          open(r, r.at + 1);
        } else {
          show(r);
        }
      } else if (event?.type === "error") {
        over = true;
        r.close({ ok: false, stopped: false, message: String(event.message || FAILED) });
      } else if (event?.type === "done") {
        noMore();
      }
    };

    (async () => {
      try {
        const base = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
        const token = localStorage.getItem("token");
        const res = await fetchWithRescue(`${base}/api/ai/speak`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ messageId, text, stream: true, audio: "mp3" }),
          signal: abort.signal,
        });
        if (!res.ok || !res.body) {
          // The server refused before reading (the day's readings are used up, nothing to read, voice not set up)
          const body = await res.json().catch(() => ({}));
          r.close({ ok: false, stopped: false, message: String(body?.error || FAILED) });
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let waitingText = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          waitingText += decoder.decode(value, { stream: true });
          const lines = waitingText.split("\n");
          waitingText = lines.pop() || "";
          lines.forEach(take);
        }
        take(waitingText);
        noMore();
      } catch {
        if (abort.signal.aborted || current !== r) return;
        // The connection went mid-reading: what already arrived can still be heard
        if (added > 0) noMore();
        else r.close({ ok: false, stopped: false, message: "No connection. Check your internet and try again." });
      }
    })();
  });
}

// ── The bar's buttons ──

export const pauseReading = () => {
  const r = current;
  if (!r || r.at < 0) return;
  r.wanted = false;
  r.audio.pause();
  show(r);
};

export const resumeReading = () => {
  const r = current;
  if (!r || r.at < 0) return;
  if (r.ended) {
    replayReading();
    return;
  }
  r.wanted = true;
  if (!r.waiting) play(r);
  show(r);
};

/** Back (negative) or forward by `seconds`, inside what has arrived. */
export const seekReading = (seconds: number) => {
  const r = current;
  if (!r || !state) return;
  moveTo(r, state.positionMs + seconds * 1000);
  // (a player that reached its end starts again by itself when moved back: it follows what the user asked for)
  if (!r.waiting && !r.ended) {
    if (r.wanted) play(r);
    else r.audio.pause();
  }
};

export const replayReading = () => {
  const r = current;
  if (!r || r.at < 0) return;
  r.wanted = true;
  open(r, 0);
};

export const setReadingSpeed = (speed: number) => {
  const r = current;
  if (!r) return;
  r.speed = speed;
  r.audio.defaultPlaybackRate = speed;
  r.audio.playbackRate = speed;
  show(r);
};

/** Closes the reading: silence, and the bar goes away. */
export const closeReading = () => {
  current?.close(STOPPED);
};
