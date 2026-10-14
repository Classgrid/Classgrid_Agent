import { useEffect, useMemo, useState } from "react";
import { fetchWithRescue } from "@/lib/rescue";
import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Moon, CloudMoon,
  Droplets, Wind, MapPin, Navigation, ExternalLink, TrendingUp, TrendingDown, type LucideIcon,
} from "lucide-react";

// Live cards the AI can drop into an answer. Each fetches its own fresh data, so it stays correct later:
//   ```weather   {"place": "Pune, India"}                       Open-Meteo (no key)
//   ```market    {"kind": "stock", "symbol": "RELIANCE.NS"}  /  {"kind": "fx", "from": "USD", "to": "INR"}
//   ```map       {"place": "Gateway of India, Mumbai"}  or  {"from": "Pune", "to": "Mumbai"}
//   ```countdown {"title": "Board exams start", "date": "2027-02-15T10:00:00+05:30"}

const API_ORIGIN = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "https://api.classgrid.in";

const CARD = "my-4 max-w-[560px] rounded-3xl bg-black/[0.05] px-6 py-5 sm:px-7 dark:bg-white/[0.08]";
const TEXT = "text-[#2C2C2B] dark:text-[#F0EFED]";
const MUTED = "text-[#2C2C2B]/65 dark:text-[#F0EFED]/65";

type Place = { name: string; lat: number; lon: number; timezone?: string };

// Landmarks, schools, streets and areas: OpenStreetMap search (Nominatim; light use from the browser)
async function geocodeOsm(query: string): Promise<Place | null> {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, {
    headers: { "Accept-Language": "en" },
  });
  if (!r.ok) return null;
  const hit = (await r.json())?.[0];
  if (!hit) return null;
  const lat = parseFloat(hit.lat), lon = parseFloat(hit.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { name: String(hit.display_name || query), lat, lon } : null;
}

// Place name -> coordinates. Cities via Open-Meteo ("Pune, Maharashtra, India" searches "Pune"),
// anything else (landmarks, areas) via OpenStreetMap. `preferOsm` puts OpenStreetMap first (maps).
async function geocode(query: string, preferOsm = false): Promise<Place | null> {
  if (preferOsm) return (await geocodeOsm(query).catch(() => null)) || geocodeCity(query);
  return (await geocodeCity(query).catch(() => null)) || geocodeOsm(query);
}

async function geocodeCity(query: string): Promise<Place | null> {
  const name = query.split(",")[0]?.trim();
  if (!name) return null;
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en`);
  if (!r.ok) return null;
  const data = await r.json();
  const results: any[] = Array.isArray(data?.results) ? data.results : [];
  if (results.length === 0) return null;
  // Prefer a result whose country / region appears in the rest of the query
  const rest = query.toLowerCase();
  const best = results.find((p) => [p.country, p.admin1].some((v) => v && rest.includes(String(v).toLowerCase()))) || results[0];
  return { name: [best.name, best.admin1, best.country].filter(Boolean).join(", "), lat: best.latitude, lon: best.longitude, timezone: best.timezone };
}

function useFetched<T>(load: () => Promise<T | null>, deps: unknown[], refreshMs?: number) {
  const [state, setState] = useState<{ data: T | null; error: boolean; loading: boolean }>({ data: null, error: false, loading: true });
  useEffect(() => {
    let alive = true;
    const run = () =>
      load()
        .then((data) => alive && setState({ data, error: !data, loading: false }))
        .catch(() => alive && setState((s) => ({ data: s.data, error: !s.data, loading: false })));
    run();
    const timer = refreshMs ? setInterval(run, refreshMs) : undefined;
    return () => { alive = false; if (timer) clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function CardMessage({ children }: { children: React.ReactNode }) {
  return <div className={`${CARD} ${MUTED} text-[15px]`}>{children}</div>;
}

function Skeleton({ height = 120 }: { height?: number }) {
  return <div className={`${CARD} animate-pulse`} style={{ height }} />;
}

// ── Weather ────────────────────────────────────────────────────────────────────────────────────────
const WEATHER: { codes: number[]; label: string; icon: LucideIcon; night?: LucideIcon }[] = [
  { codes: [0], label: "Clear", icon: Sun, night: Moon },
  { codes: [1, 2], label: "Partly cloudy", icon: CloudSun, night: CloudMoon },
  { codes: [3], label: "Cloudy", icon: Cloud },
  { codes: [45, 48], label: "Fog", icon: CloudFog },
  { codes: [51, 53, 55, 56, 57], label: "Drizzle", icon: CloudDrizzle },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], label: "Rain", icon: CloudRain },
  { codes: [71, 73, 75, 77, 85, 86], label: "Snow", icon: CloudSnow },
  { codes: [95, 96, 99], label: "Thunderstorm", icon: CloudLightning },
];
function weatherInfo(code: number, isDay = true) {
  const w = WEATHER.find((x) => x.codes.includes(code)) || WEATHER[2]!;
  return { label: w.label, Icon: !isDay && w.night ? w.night : w.icon };
}

export type WeatherData = { place?: string; lat?: number; lon?: number; unit?: "celsius" | "fahrenheit" };

export function WeatherCard({ data }: { data: WeatherData }) {
  const fahrenheit = data.unit === "fahrenheit";
  const state = useFetched(async () => {
    let place: Place | null = null;
    if (typeof data.lat === "number" && typeof data.lon === "number") place = { name: data.place || "", lat: data.lat, lon: data.lon };
    else if (data.place) place = await geocode(data.place);
    if (!place) return null;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}`
      + `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
      + (fahrenheit ? "&temperature_unit=fahrenheit" : "");
    const r = await fetch(url);
    if (!r.ok) return null;
    const w = await r.json();
    return { place, w };
  }, [data.place, data.lat, data.lon, fahrenheit], 10 * 60 * 1000);

  if (state.loading) return <Skeleton height={190} />;
  if (!state.data) return <CardMessage>Couldn&apos;t load the weather for {data.place || "this place"}.</CardMessage>;

  const { place, w } = state.data;
  const cur = w.current || {};
  const now = weatherInfo(cur.weather_code, cur.is_day !== 0);
  const unit = fahrenheit ? "°F" : "°C";
  const days: { date: string; code: number; max: number; min: number }[] = (w.daily?.time || []).map((d: string, i: number) => ({
    date: d, code: w.daily.weather_code[i], max: w.daily.temperature_2m_max[i], min: w.daily.temperature_2m_min[i],
  }));

  return (
    <div className={CARD}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-[15px] ${MUTED}`}>{data.place || place.name}</p>
          <p className={`mt-1 text-[44px] font-semibold leading-none tabular-nums ${TEXT}`}>{Math.round(cur.temperature_2m)}{unit}</p>
          <p className={`mt-2 text-[15px] ${TEXT}`}>{now.label} · Feels like {Math.round(cur.apparent_temperature)}{unit}</p>
          <p className={`mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] ${MUTED}`}>
            <span className="inline-flex items-center gap-1"><Droplets className="h-4 w-4" />{cur.relative_humidity_2m}%</span>
            <span className="inline-flex items-center gap-1"><Wind className="h-4 w-4" />{Math.round(cur.wind_speed_10m)} km/h</span>
          </p>
        </div>
        <now.Icon className={`h-16 w-16 shrink-0 ${TEXT}`} strokeWidth={1.5} />
      </div>
      {days.length > 0 && (
        <div className="mt-5 grid grid-cols-5 gap-2 border-t border-black/10 pt-4 dark:border-white/10">
          {days.map((d, i) => {
            const info = weatherInfo(d.code);
            const label = i === 0 ? "Today" : new Date(`${d.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
            return (
              <div key={d.date} className="flex flex-col items-center gap-1 text-center">
                <span className={`text-[13px] ${MUTED}`}>{label}</span>
                <info.Icon className={`h-6 w-6 ${TEXT}`} strokeWidth={1.75} />
                <span className={`text-[13px] font-medium tabular-nums ${TEXT}`}>{Math.round(d.max)}°</span>
                <span className={`text-[12px] tabular-nums ${MUTED}`}>{Math.round(d.min)}°</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Market (stock / currency) ──────────────────────────────────────────────────────────────────────
export type MarketData = { kind?: "stock" | "fx"; symbol?: string; from?: string; to?: string };
type Quote = { kind: string; symbol: string; name: string; exchange: string; currency: string; price: number; change: number | null; changePct: number | null; asOf: number; points: { t: number; v: number }[] };

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: value < 10 ? 4 : 2 }).format(value);
  } catch {
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
}

function Sparkline({ points, up }: { points: { v: number }[]; up: boolean }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const W = 480, H = 90;
  const d = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - 6 - ((v - min) / span) * (H - 12)}`).join(" L ");
  const color = up ? "#10b981" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-[90px] w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`spark-${up ? "up" : "down"}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M 0,${H} L ${d} L ${W},${H} Z`} fill={`url(#spark-${up ? "up" : "down"})`} />
      <path d={`M ${d}`} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function MarketCard({ data }: { data: MarketData }) {
  const isFx = data.kind === "fx";
  const query = isFx
    ? `kind=fx&from=${encodeURIComponent((data.from || "").toUpperCase())}&to=${encodeURIComponent((data.to || "").toUpperCase())}`
    : `kind=stock&symbol=${encodeURIComponent((data.symbol || "").toUpperCase())}`;
  const state = useFetched<Quote>(async () => {
    const r = await fetchWithRescue(`${API_ORIGIN}/api/ai/market?${query}`);
    return r.ok ? r.json() : null;
  }, [query], 2 * 60 * 1000);

  if (state.loading) return <Skeleton height={220} />;
  const q = state.data;
  if (!q) return <CardMessage>Couldn&apos;t load prices for {isFx ? `${data.from}/${data.to}` : data.symbol}.</CardMessage>;

  const up = (q.change ?? 0) >= 0;
  const Arrow = up ? TrendingUp : TrendingDown;
  return (
    <div className={CARD}>
      <p className={`text-[15px] font-medium ${TEXT}`}>{q.name}</p>
      <p className={`text-[13px] ${MUTED}`}>{q.symbol}{q.exchange ? ` · ${q.exchange}` : ""}</p>
      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
        <span className={`text-[38px] font-semibold leading-none tabular-nums ${TEXT}`}>
          {isFx ? q.price.toLocaleString("en-IN", { maximumFractionDigits: 4 }) : formatMoney(q.price, q.currency)}
        </span>
        {q.change !== null && (
          <span className={`inline-flex items-center gap-1 pb-1 text-[15px] font-medium tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
            <Arrow className="h-4 w-4" />
            {up ? "+" : ""}{q.change.toFixed(isFx ? 4 : 2)}{q.changePct !== null ? ` (${up ? "+" : ""}${q.changePct.toFixed(2)}%)` : ""}
          </span>
        )}
      </div>
      <Sparkline points={q.points} up={up} />
      <p className={`mt-2 text-[12px] ${MUTED}`}>
        Past month · as of {new Date(q.asOf).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: isFx ? undefined : "short" })}
        {isFx ? " · ECB reference rate" : " · may be delayed"}
      </p>
    </div>
  );
}

// ── Map ────────────────────────────────────────────────────────────────────────────────────────────
export type MapData = { place?: string; lat?: number; lon?: number; from?: string; to?: string };

export function MapCard({ data }: { data: MapData }) {
  const isRoute = Boolean(data.from && data.to);
  const state = useFetched(async () => {
    if (isRoute) {
      // One after the other: OpenStreetMap search allows about one request per second
      const a = await geocode(data.from!, true);
      const b = a ? await geocode(data.to!, true) : null;
      return a && b ? { points: [a, b] } : null;
    }
    if (typeof data.lat === "number" && typeof data.lon === "number") return { points: [{ name: data.place || "", lat: data.lat, lon: data.lon }] };
    const p = data.place ? await geocode(data.place, true) : null;
    return p ? { points: [p] } : null;
  }, [data.place, data.lat, data.lon, data.from, data.to]);

  const view = useMemo(() => {
    const pts = state.data?.points || [];
    if (pts.length === 0) return null;
    const lats = pts.map((p) => p.lat), lons = pts.map((p) => p.lon);
    const pad = pts.length > 1 ? 0.15 : 0.01;
    const spanLat = Math.max(...lats) - Math.min(...lats), spanLon = Math.max(...lons) - Math.min(...lons);
    const bbox = [Math.min(...lons) - pad - spanLon * 0.1, Math.min(...lats) - pad - spanLat * 0.1, Math.max(...lons) + pad + spanLon * 0.1, Math.max(...lats) + pad + spanLat * 0.1];
    const marker = pts[pts.length - 1]!;
    return {
      embed: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.map((n) => n.toFixed(5)).join("%2C")}&layer=mapnik&marker=${marker.lat.toFixed(5)}%2C${marker.lon.toFixed(5)}`,
      open: pts.length > 1
        ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(data.from!)}&destination=${encodeURIComponent(data.to!)}`
        : `https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lon}`,
      directions: `https://www.google.com/maps/dir/?api=1&destination=${marker.lat},${marker.lon}`,
    };
  }, [state.data, data.from, data.to]);

  if (state.loading) return <Skeleton height={320} />;
  if (!view) return <CardMessage>Couldn&apos;t find {isRoute ? `${data.from} → ${data.to}` : data.place || "that place"} on the map.</CardMessage>;

  return (
    <div className="my-4 max-w-[560px] overflow-hidden rounded-3xl bg-black/[0.05] dark:bg-white/[0.08]">
      {/* OpenStreetMap's tile policy needs a referrer, so the site origin is sent (not the full page URL) */}
      <iframe title="Map" src={view.embed} className="h-[260px] w-full border-0" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className={`inline-flex min-w-0 items-center gap-2 text-[15px] font-medium ${TEXT}`}>
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{isRoute ? `${data.from} → ${data.to}` : data.place || state.data?.points[0]?.name}</span>
        </p>
        <div className="flex items-center gap-2">
          <a href={view.open} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-1.5 text-[13px] font-medium no-underline hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10 ${TEXT}`}>
            <ExternalLink className="h-3.5 w-3.5" />{isRoute ? "Route" : "Open"}
          </a>
          {!isRoute && (
            <a href={view.directions} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-1.5 text-[13px] font-medium no-underline hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10 ${TEXT}`}>
              <Navigation className="h-3.5 w-3.5" />Directions
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Countdown ──────────────────────────────────────────────────────────────────────────────────────
// A date ("date": ISO) for deadlines, or a length ("seconds" / "minutes" / "hours") for timers. A timer counts
// from `startedAt` (when the answer was written), to the second — the AI only knows the time to the minute,
// so "1 minute from now" as a date could end almost at once.
export type CountdownData = { title?: string; date?: string; seconds?: number; minutes?: number; hours?: number };

export function CountdownCard({ data, startedAt }: { data: CountdownData; startedAt?: number }) {
  const [mountedAt] = useState(() => Date.now());
  const durationMs = ((Number(data.hours) || 0) * 3600 + (Number(data.minutes) || 0) * 60 + (Number(data.seconds) || 0)) * 1000;
  const isTimer = durationMs > 0;
  const target = useMemo(
    () => (isTimer ? (startedAt ?? mountedAt) + durationMs : data.date ? new Date(data.date).getTime() : NaN),
    [isTimer, startedAt, mountedAt, durationMs, data.date],
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  if (!Number.isFinite(target)) return <CardMessage>That date couldn&apos;t be read.</CardMessage>;
  const diff = target - now;
  const passed = diff <= 0;
  // A finished timer stops at zero; a past date counts the time since
  const abs = isTimer && passed ? 0 : Math.abs(diff);
  // Whole seconds, rounded up while counting down (a 60 s timer shows 01:00 at the start, not 00:59)
  const total = passed ? Math.floor(abs / 1000) : Math.ceil(abs / 1000);
  const units = [
    { label: "days", value: Math.floor(total / 86400) },
    { label: "hours", value: Math.floor(total / 3600) % 24 },
    { label: "minutes", value: Math.floor(total / 60) % 60 },
    { label: "seconds", value: total % 60 },
  ];
  const when = isTimer
    ? `Ends at ${new Date(target).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
    : new Date(target).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" });
  const finishedTimer = isTimer && passed;

  return (
    <div className={`${CARD} ${finishedTimer ? "ring-2 ring-emerald-500/60" : ""}`}>
      <p className={`text-[15px] font-medium ${TEXT}`}>{data.title || (isTimer ? "Timer" : "Countdown")}</p>
      <p className={`text-[13px] ${MUTED}`}>{when}</p>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        {units.map((u) => (
          <div key={u.label} className="rounded-2xl bg-black/[0.05] px-2 py-3 text-center dark:bg-white/[0.07]">
            <p className={`text-[30px] font-semibold leading-none tabular-nums sm:text-[36px] ${TEXT}`}>{String(u.value).padStart(2, "0")}</p>
            <p className={`mt-1.5 text-[12px] ${MUTED}`}>{u.label}</p>
          </div>
        ))}
      </div>
      <p className={`mt-3 text-[13px] ${finishedTimer ? "font-medium text-emerald-600 dark:text-emerald-400" : MUTED}`}>
        {finishedTimer ? "⏰ Time's up!" : passed ? "This date has passed (time since)." : "Counting down live."}
      </p>
    </div>
  );
}
