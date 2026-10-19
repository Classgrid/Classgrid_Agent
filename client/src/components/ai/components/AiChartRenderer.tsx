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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  PolarAreaController,
  ScatterController,
  BubbleController
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { useTheme } from "next-themes";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  PolarAreaController,
  ScatterController,
  BubbleController
);

// Bar chart extras the AI's chart blocks can use (no extra library): the value at the end of each bar
// (options.plugins.valueLabels, on by default) and a grey track behind each bar up to the axis maximum
// (options.plugins.barTrack, off by default).
const MAX_LABELLED_BARS = 30;

const barExtrasPlugin = {
  id: "classgridBars",
  beforeDatasetsDraw(chart: any, _args: any, opts: any) {
    if (!opts?.track) return;
    const { ctx, chartArea } = chart;
    const horizontal = chart.options.indexAxis === "y";
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.fillStyle = opts.trackColor;
    for (const bar of meta.data || []) {
      const { x, y, width, height, base } = bar.getProps(["x", "y", "width", "height", "base"], true);
      ctx.beginPath();
      if (horizontal) {
        const top = y - height / 2;
        ctx.roundRect(Math.min(base, chartArea.left), top, chartArea.right - Math.min(base, chartArea.left), height, 6);
      } else {
        const left = x - width / 2;
        ctx.roundRect(left, chartArea.top, width, Math.max(base, chartArea.bottom) - chartArea.top, 6);
      }
      ctx.fill();
    }
    ctx.restore();
  },
  afterDatasetsDraw(chart: any, _args: any, opts: any) {
    if (!opts?.labels) return;
    const { ctx, chartArea } = chart;
    const horizontal = chart.options.indexAxis === "y";
    ctx.save();
    ctx.fillStyle = opts.textColor;
    ctx.font = `600 13px ${ChartJS.defaults.font.family}`;
    chart.data.datasets.forEach((ds: any, di: number) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden || (meta.type && meta.type !== "bar")) return;
      meta.data.forEach((bar: any, i: number) => {
        const raw = ds.data?.[i];
        const value = typeof raw === "object" && raw !== null ? (horizontal ? raw.x : raw.y) : raw;
        if (value === null || value === undefined || Number.isNaN(Number(value))) return;
        const text = Number(value).toLocaleString();
        const { x, y } = bar.getProps(["x", "y"], true);
        if (horizontal) {
          // With a track the numbers sit after the track's end, otherwise just after the bar
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(text, (opts.track ? chartArea.right : x) + 10, y);
        } else {
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(text, x, (opts.track ? chartArea.top : y) - 6);
        }
      });
    });
    ctx.restore();
  },
};
ChartJS.register(barExtrasPlugin);

interface AiChartRendererProps {
  config: any;
}

export function AiChartRenderer({ config }: AiChartRendererProps) {
  const { resolvedTheme } = useTheme();
  // We use a small delay to ensure CSS variables are applied when switching themes
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey((prev) => prev + 1);
  }, [resolvedTheme]);

  const defaultStyles = useMemo(() => {
    // Force dependency on key so it re-computes when theme changes
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _force = key;
    
    if (typeof window === "undefined") return { text: "#666", grid: "#ddd", colors: [] };
    
    const style = getComputedStyle(document.body);
    
    // Helper to get raw CSS var value, which might be in oklch(l c h) format
    // Chart.js requires standard color strings. Fortunately it supports oklch() in modern browsers!
    const getVar = (name: string, fallback: string) => {
      let val = style.getPropertyValue(name).trim();
      if (!val) return fallback;
      // If it's a raw oklch value without the function wrapper (Tailwind v4), wrap it
      if (/^0\.\d+/.test(val) || /^\d+\.?\d*/.test(val)) {
         val = `oklch(${val})`;
      }
      return val;
    };

    // If --foreground is just 'hsl(var(--foreground))', we assume modern CSS setup.
    // In global.css, --foreground is a hex code or hsl depending on the class.
    // We will extract it.
    let textStr = style.getPropertyValue("--foreground").trim();
    if (!textStr.startsWith("#") && !textStr.startsWith("rgb") && !textStr.startsWith("hsl") && !textStr.startsWith("oklch")) {
       textStr = textStr ? `hsl(${textStr})` : "#666";
       // Handle hex raw
       if (textStr.includes("#")) {
         textStr = style.getPropertyValue("--foreground").trim();
       }
    }
    
    let borderStr = style.getPropertyValue("--border").trim();
    if (!borderStr.startsWith("#") && !borderStr.startsWith("rgb") && !borderStr.startsWith("hsl") && !borderStr.startsWith("oklch")) {
       borderStr = borderStr ? `hsl(${borderStr})` : "#ddd";
       if (borderStr.includes("rgba") || borderStr.includes("#")) {
          borderStr = style.getPropertyValue("--border").trim();
       }
    }

    const c1 = getVar("--chart-1", "#3b82f6");
    const c2 = getVar("--chart-2", "#10b981");
    const c3 = getVar("--chart-3", "#f59e0b");
    const c4 = getVar("--chart-4", "#ef4444");
    const c5 = getVar("--chart-5", "#8b5cf6");

    return {
      text: textStr || (resolvedTheme === 'dark' ? "#fff" : "#000"),
      grid: borderStr || (resolvedTheme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
      colors: [c1, c2, c3, c4, c5]
    };
  }, [key, resolvedTheme]);

  const chartData = useMemo(() => {
    if (!config?.data) return { datasets: [] };
    const cloned = JSON.parse(JSON.stringify(config.data));
    if (cloned.datasets) {
      cloned.datasets.forEach((ds: any, idx: number) => {
        // Apply default colors if not provided
        if (!ds.backgroundColor) {
           const color = defaultStyles.colors[idx % defaultStyles.colors.length];
           ds.backgroundColor = color;
           // If pie/doughnut, distribute colors to elements
           if (config.type === "pie" || config.type === "doughnut" || config.type === "polarArea") {
             ds.backgroundColor = ds.data.map((_: any, i: number) => defaultStyles.colors[i % defaultStyles.colors.length]);
           }
        }
        if (!ds.borderColor) {
          const color = defaultStyles.colors[idx % defaultStyles.colors.length];
          ds.borderColor = color;
           if (config.type === "pie" || config.type === "doughnut" || config.type === "polarArea") {
             ds.borderColor = resolvedTheme === 'dark' ? '#111' : '#fff'; // separate slices
           }
        }
        // Round bars
        if (config.type === 'bar' || ds.type === 'bar') {
          ds.borderRadius = 6;
          ds.borderSkipped = false;
        }
      });
    }
    return cloned;
  }, [config, defaultStyles, resolvedTheme]);

  // Bar chart extras: numbers at the bar ends (default on) and the grey track (when the AI asks for it)
  const barExtras = useMemo(() => {
    const base = config?.options || {};
    const datasets = config?.data?.datasets || [];
    const isBar = config?.type === "bar";
    const barCount = datasets.reduce((n: number, ds: any) => n + (Array.isArray(ds.data) ? ds.data.length : 0), 0);
    const stacked = !!(base.scales?.x?.stacked || base.scales?.y?.stacked);
    const labels = isBar && !stacked && barCount > 0 && barCount <= MAX_LABELLED_BARS && base.plugins?.valueLabels !== false;
    const track = isBar && !stacked && datasets.length === 1 && base.plugins?.barTrack === true;
    return { labels, track, horizontal: base.indexAxis === "y" };
  }, [config]);

  const chartOptions = useMemo(() => {
    const base = config?.options || {};

    // Apply global font and colors
    ChartJS.defaults.color = defaultStyles.text;
    ChartJS.defaults.font.family = 'var(--font-body), sans-serif';

    // With numbers on the bars, the value axis is only clutter (unless the AI set it up itself)
    const valueAxis = barExtras.horizontal ? "x" : "y";
    const categoryAxis = barExtras.horizontal ? "y" : "x";
    const hideValueAxis = barExtras.labels && base.scales?.[valueAxis]?.display === undefined;
    const isDark = resolvedTheme === "dark";

    const options = {
      ...base,
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        ...base.layout,
        // room for the numbers after the bars / above the columns
        padding: barExtras.labels
          ? (barExtras.horizontal ? { right: 44, ...base.layout?.padding } : { top: 24, ...base.layout?.padding })
          : base.layout?.padding,
      },
      plugins: {
        ...base.plugins,
        // The title and subtitle are drawn above the chart in HTML (bigger, left-aligned)
        title: { ...base.plugins?.title, display: false },
        subtitle: { ...base.plugins?.subtitle, display: false },
        classgridBars: {
          labels: barExtras.labels,
          track: barExtras.track,
          textColor: defaultStyles.text,
          trackColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        },
        legend: {
          ...base.plugins?.legend,
          labels: {
            ...base.plugins?.legend?.labels,
            color: defaultStyles.text
          }
        },
        tooltip: {
          backgroundColor: resolvedTheme === 'dark' ? '#000' : '#fff',
          titleColor: resolvedTheme === 'dark' ? '#fff' : '#000',
          bodyColor: resolvedTheme === 'dark' ? '#eee' : '#222',
          borderColor: defaultStyles.grid,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          ...base.plugins?.tooltip
        }
      },
      scales: (config.type !== 'pie' && config.type !== 'doughnut' && config.type !== 'radar' && config.type !== 'polarArea') ? {
        x: {
          ...base.scales?.x,
          ...(hideValueAxis && valueAxis === "x" ? { display: false } : {}),
          ...(config.type === "bar" ? { beginAtZero: true } : {}),
          grid: {
            color: defaultStyles.grid,
            ...(config.type === "bar" && categoryAxis === "x" ? { display: false } : {}),
            ...base.scales?.x?.grid
          },
          ticks: {
            color: defaultStyles.text,
            ...(config.type === "bar" && categoryAxis === "x" ? { font: { size: 13, weight: 600 } } : {}),
            ...base.scales?.x?.ticks
          }
        },
        y: {
          ...base.scales?.y,
          ...(hideValueAxis && valueAxis === "y" ? { display: false } : {}),
          ...(config.type === "bar" ? { beginAtZero: true } : {}),
          grid: {
            color: defaultStyles.grid,
            ...(config.type === "bar" && categoryAxis === "y" ? { display: false } : {}),
            ...base.scales?.y?.grid
          },
          ticks: {
            color: defaultStyles.text,
            ...(config.type === "bar" && categoryAxis === "y" ? { font: { size: 14, weight: 600 } } : {}),
            ...base.scales?.y?.ticks
          }
        }
      } : base.scales
    };

    if (config.type === 'radar' || config.type === 'polarArea') {
       options.scales = {
         r: {
           ...base.scales?.r,
           grid: { color: defaultStyles.grid },
           angleLines: { color: defaultStyles.grid },
           ticks: { backdropColor: 'transparent', color: defaultStyles.text },
           pointLabels: { color: defaultStyles.text }
         }
       };
    }

    return options;
  }, [config, defaultStyles, resolvedTheme, barExtras]);

  if (!config || !config.type) {
    return <div className="text-red-500 p-4 border rounded-xl">Invalid Chart Config</div>;
  }

  const titleOpt = config.options?.plugins?.title;
  const subtitleOpt = config.options?.plugins?.subtitle;
  const asText = (t: any) => (Array.isArray(t) ? t.join(" ") : typeof t === "string" ? t : "");
  const title = titleOpt?.display !== false ? asText(titleOpt?.text) : "";
  const subtitle = subtitleOpt?.display !== false ? asText(subtitleOpt?.text) : "";

  return (
    <div className="w-full font-sans">
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h3 className="text-[17px] font-semibold leading-snug text-foreground">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div className="w-full h-[300px] sm:h-[350px] relative" key={key}>
        <Chart type={config.type} data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
