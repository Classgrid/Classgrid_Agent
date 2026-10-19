/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
import { useEffect, useMemo, useState } from "react";

// ```clock block: a live clock card for a place (digital time + analog clock with moving hands), like
// ChatGPT's time answer. The time is computed in the browser every second, so it stays correct after the
// answer was written. {"timeZone": "Asia/Kolkata", "place": "Pimpri, Maharashtra, India"}

export type ClockData = { timeZone?: string; place?: string };

function validZone(tz?: string) {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

// Wall-clock parts of `date` in a time zone
function partsIn(date: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour") % 24, mi: get("minute"), s: get("second") };
}

// "Today, +0hrs" / "Tomorrow, +5:30hrs" relative to the viewer's own clock
function relativeLabel(now: Date, timeZone?: string) {
  const there = partsIn(now, timeZone);
  const here = partsIn(now);
  const thereMs = Date.UTC(there.y, there.mo - 1, there.d, there.h, there.mi);
  const hereMs = Date.UTC(here.y, here.mo - 1, here.d, here.h, here.mi);
  const diffMin = Math.round((thereMs - hereMs) / 60000);
  const dayDiff = Math.round((Date.UTC(there.y, there.mo - 1, there.d) - Date.UTC(here.y, here.mo - 1, here.d)) / 86400000);
  const day = dayDiff === 0 ? "Today" : dayDiff > 0 ? "Tomorrow" : "Yesterday";
  const sign = diffMin < 0 ? "-" : "+";
  const abs = Math.abs(diffMin);
  const hrs = Math.floor(abs / 60);
  const mins = abs % 60;
  return `${day}, ${sign}${mins ? `${hrs}:${String(mins).padStart(2, "0")}` : hrs}hrs`;
}

// Short zone code like "IST", "BST", "CEST", "AEST". en-US only names US zones (India comes out as
// "GMT+5:30"), so a few English locales are tried and the first real code wins; else the GMT offset.
function zoneAbbreviation(timeZone: string | undefined, date: Date) {
  let fallback = "";
  for (const locale of ["en-US", "en-GB", "en-IN", "en-AU"]) {
    try {
      const name = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" })
        .formatToParts(date).find((p) => p.type === "timeZoneName")?.value || "";
      if (name && !/^(GMT|UTC)[+-]/.test(name)) return name;
      if (!fallback) fallback = name;
    } catch { /* unsupported locale */ }
  }
  return fallback;
}

export function ClockBlock({ data }: { data: ClockData }) {
  const timeZone = useMemo(() => validZone(data.timeZone), [data.timeZone]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Every animation frame, so the second hand sweeps smoothly (the browser pauses it in hidden tabs)
    let frame = 0;
    const tick = () => {
      setNow(new Date());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const { h, mi } = partsIn(now, timeZone);
  const s = partsIn(now, timeZone).s + now.getMilliseconds() / 1000;
  const digital = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).format(now);
  const zoneName = useMemo(() => zoneAbbreviation(timeZone, now), [timeZone, now.getHours()]); // eslint-disable-line react-hooks/exhaustive-deps
  const placeText = data.place
    ? (zoneName && !data.place.includes(`(${zoneName})`) ? `${data.place} (${zoneName})` : data.place)
    : zoneName || "Local time";

  const secondAngle = s * 6;
  const minuteAngle = mi * 6 + s * 0.1;
  const hourAngle = (h % 12) * 30 + mi * 0.5;

  return (
    <div className="my-4 flex max-w-[540px] items-center justify-between gap-6 rounded-3xl bg-black/[0.05] px-6 py-6 sm:px-8 dark:bg-white/[0.08]">
      <div className="min-w-0">
        <p className="text-[30px] font-semibold leading-tight tabular-nums text-[#2C2C2B] dark:text-[#F0EFED]">{digital}</p>
        <p className="mt-3 text-[16px] text-[#2C2C2B]/85 dark:text-[#F0EFED]/85">{placeText}</p>
        <p className="mt-1 text-[16px] text-[#2C2C2B]/85 dark:text-[#F0EFED]/85">{relativeLabel(now, timeZone)}</p>
      </div>

      <svg viewBox="0 0 140 140" className="h-[124px] w-[124px] shrink-0 sm:h-[140px] sm:w-[140px]" role="img" aria-label={`Clock showing ${digital}`}>
        {Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const a = (n * 30 - 90) * (Math.PI / 180);
          return (
            <text
              key={n}
              x={70 + 56 * Math.cos(a)}
              y={70 + 56 * Math.sin(a)}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-[#2C2C2B] text-[13px] font-semibold dark:fill-[#F0EFED]"
            >
              {n}
            </text>
          );
        })}
        <line x1="70" y1="70" x2="70" y2="38" strokeWidth="4" strokeLinecap="round" className="stroke-[#2C2C2B] dark:stroke-[#F0EFED]" transform={`rotate(${hourAngle} 70 70)`} />
        <line x1="70" y1="70" x2="70" y2="24" strokeWidth="3" strokeLinecap="round" className="stroke-[#2C2C2B] dark:stroke-[#F0EFED]" transform={`rotate(${minuteAngle} 70 70)`} />
        <line x1="70" y1="78" x2="70" y2="20" strokeWidth="1.5" strokeLinecap="round" stroke="#F59E0B" transform={`rotate(${secondAngle} 70 70)`} />
        <circle cx="70" cy="70" r="3.5" fill="#F59E0B" />
      </svg>
    </div>
  );
}
