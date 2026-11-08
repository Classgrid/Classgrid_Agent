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
// Model picker shown next to the mic button in the AI chat input.
// The list mirrors docs/AI_MODEL_PICKER_LIST.md (models checked live on 8 Oct 2026).
// The chosen id is sent to /api/ai/ask as `selectedModel`; "auto" lets the backend router decide.

import React from "react";
import { Check, ChevronDown, Sparkles, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import { cn } from "../utils";

// Brand logos hosted on the Classgrid CDN.
const ICON_BASE = "https://cdn.classgrid.in/classgrid_intgration";

type ModelLogo = { src: string; monochrome?: boolean; className?: string };

const LOGOS = {
  claude: { src: `${ICON_BASE}/Claude_AI_symbol.svg` },
  deepseek: { src: `${ICON_BASE}/DeepSeek_logo.svg`, className: "scale-[1.7]" },
  openai: { src: `${ICON_BASE}/chatgpt-light_(1).svg`, monochrome: true },
  kimi: { src: `${ICON_BASE}/kimi-ai-icon.svg` },
  glm: { src: `${ICON_BASE}/glmv-color.svg` },
  qwen: { src: `${ICON_BASE}/Qwen_logo.svg` },
  google: { src: `${ICON_BASE}/google.svg` },
  nvidia: { src: `${ICON_BASE}/nvidia-nemotron.svg` },
  meta: { src: `${ICON_BASE}/Meta_Platforms_logo.svg` },
  mistral: { src: `${ICON_BASE}/mistral-ai-icon.svg` },
} satisfies Record<string, ModelLogo>;

export type ChatModelOption = {
  id: string;
  name: string;
  description: string;
  provider: "anthropic" | "cloudflare";
  logo: ModelLogo;
  /** Day the model was added (YYYY-MM-DD). It shows a "New" badge for NEW_BADGE_DAYS after this date. */
  addedAt?: string;
};

const NEW_BADGE_DAYS = 15;
const isNewModel = (m: ChatModelOption) => !!m.addedAt && Date.now() - Date.parse(m.addedAt) < NEW_BADGE_DAYS * 24 * 60 * 60 * 1000;

export const AUTO_MODEL_ID = "auto";

export const MODEL_GROUPS: { label: string; models: ChatModelOption[] }[] = [
  {
    label: "Claude",
    models: [
      { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", description: "Fastest, for quick everyday answers", provider: "anthropic", logo: LOGOS.claude },
      { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", description: "Best mix of speed and intelligence", provider: "anthropic", logo: LOGOS.claude },
      { id: "claude-opus-5-5", name: "Claude Opus 5.5", description: "Complex projects, coding and agents", provider: "anthropic", logo: LOGOS.claude },
      { id: "claude-fable-5-1", name: "Claude Fable 5.1", description: "Most capable, for the hardest reasoning", provider: "anthropic", logo: LOGOS.claude },
    ],
  },
  {
    label: "DeepSeek",
    models: [
      { id: "@cf/deepseek-ai/deepseek-v4.1-flash-1017", name: "DeepSeek V4.1 Flash", description: "Newest DeepSeek: fast, low cost and sees images", provider: "cloudflare", logo: LOGOS.deepseek, addedAt: "2026-10-29" },
    ],
  },
  {
    label: "More models",
    models: [
      { id: "@cf/openai/gpt-oss-120b", name: "GPT-OSS 120B", description: "OpenAI open-weight model", provider: "cloudflare", logo: LOGOS.openai },
      { id: "@cf/openai/gpt-oss-20b", name: "GPT-OSS 20B", description: "Small and fast OpenAI open-weight model", provider: "cloudflare", logo: LOGOS.openai },
      { id: "@cf/zai-org/glm-5.3", name: "GLM 5.3", description: "Large Z.ai model", provider: "cloudflare", logo: LOGOS.glm },
      { id: "@cf/zai-org/glm-4.7-flash", name: "GLM 4.7 Flash", description: "Lowest cost Z.ai model", provider: "cloudflare", logo: LOGOS.glm },
      { id: "@cf/qwen/qwen3.8-27b", name: "Qwen 3.8 27B", description: "Alibaba Qwen model", provider: "cloudflare", logo: LOGOS.qwen },
      { id: "@cf/google/gemma-4-26b-a4b-it", name: "Gemma 4 26B", description: "Google open model", provider: "cloudflare", logo: LOGOS.google },
      { id: "@cf/meta/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", description: "Meta open model", provider: "cloudflare", logo: LOGOS.meta },
      { id: "@cf/mistralai/mistral-small-3.1-24b-instruct", name: "Mistral Small 3.1", description: "Mistral open model", provider: "cloudflare", logo: LOGOS.mistral },
    ],
  },
];

const ALL_MODELS = MODEL_GROUPS.flatMap((g) => g.models);
const STORAGE_KEY = "classgrid-ai-selected-model";

export function isKnownModelId(id: string) {
  return id === AUTO_MODEL_ID || ALL_MODELS.some((m) => m.id === id);
}

// Remembers the viewer's pick across reloads; falls back to Auto when storage is unavailable.
export function useSelectedModel() {
  const [selectedModel, setSelectedModelState] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved && isKnownModelId(saved) ? saved : AUTO_MODEL_ID;
    } catch {
      return AUTO_MODEL_ID;
    }
  });

  const setSelectedModel = React.useCallback((id: string) => {
    setSelectedModelState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* storage blocked: keep in memory only */ }
  }, []);

  return [selectedModel, setSelectedModel] as const;
}

function ModelLogoImg({ logo, className }: { logo: ModelLogo; className?: string }) {
  return (
    <img
      src={logo.src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={cn("h-4 w-4 shrink-0 object-contain", logo.monochrome && "brightness-0 dark:invert", logo.className, className)}
    />
  );
}

interface ModelPickerProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

// How hard the AI thinks: Fast (quick, short answers), Normal, or Deep (checks its work twice). Kept across reloads.
export type ThinkingLevel = "fast" | "normal" | "deep";
const THINKING_KEY = "cg_thinking_level";
export function getThinkingLevel(): ThinkingLevel {
  try {
    const v = localStorage.getItem(THINKING_KEY);
    return v === "fast" || v === "deep" ? v : "normal";
  } catch {
    return "normal";
  }
}
const THINKING_LEVELS: { id: ThinkingLevel; label: string; hint: string }[] = [
  { id: "fast", label: "Fast", hint: "Quick, short answers" },
  { id: "normal", label: "Normal", hint: "The usual" },
  { id: "deep", label: "Deep", hint: "Thinks longer, checks its work twice" },
];

// Claude Fable 5.1 is locked until the person has topped up ₹299 in total (server enforces it too)
const FABLE_ID = "claude-fable-5-1";

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  const selected = ALL_MODELS.find((m) => m.id === value);
  const { data: access } = useQuery({
    queryKey: ["model-access"],
    queryFn: async () => {
      const data = (await apiClient.get("/api/ai/model-access")).data as { fable?: { unlocked: boolean; exempt?: boolean; toppedUpInr: number; requiredInr: number }; disabledModels?: string[] };
      // An answer without "fable" is not this call's answer (in Classgrid Code, before bridge.js numbered each page's
      // calls apart, a reloaded panel got another call's answer here and crashed with "reading 'unlocked'"): it is
      // asked again instead of being shown
      if (!data || typeof data !== "object" || !data.fable) throw new Error("model access not available");
      return data as { fable: { unlocked: boolean; exempt?: boolean; toppedUpInr: number; requiredInr: number }; disabledModels?: string[] };
    },
    staleTime: 60 * 1000,
    retry: 3,
    retryDelay: (n) => Math.min(2000 * 2 ** n, 15000),
  });
  const fable = access?.fable;
  const fableLocked = fable ? !fable.unlocked : false;
  const fableLeft = fable ? Math.max(0, fable.requiredInr - fable.toppedUpInr) : 0;
  // Models the super admin turned off (Model manager) are not shown
  const offModels = new Set(access?.disabledModels || []);

  // A locked Fable that is still selected (e.g. saved from before) falls back to Auto
  React.useEffect(() => {
    if (fableLocked && value === FABLE_ID) onChange(AUTO_MODEL_ID);
    if (access?.disabledModels?.includes(value)) onChange(AUTO_MODEL_ID);
  }, [fableLocked, access, value, onChange]);

  const openTopUp = () => window.dispatchEvent(new CustomEvent("open-ai-hub", { detail: { tab: "upgrade" } }));
  const [thinking, setThinkingState] = React.useState<ThinkingLevel>(getThinkingLevel);
  const setThinking = (id: ThinkingLevel) => {
    setThinkingState(id);
    try { localStorage.setItem(THINKING_KEY, id); } catch { /* storage blocked: this message only */ }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="h-8 shrink-0 rounded-full flex items-center gap-1.5 px-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-50 transition-all cursor-pointer"
          title={selected ? selected.name : "Auto: picks the best model for each message"}
        >
          {/* A narrow chat (Studio with the side pane open) shows only the arrow, so the input's buttons don't overlap */}
          {selected ? <ModelLogoImg logo={selected.logo} className="h-3.5 w-3.5 @max-[28rem]:hidden" /> : null}
          <span className="hidden sm:inline @max-[28rem]:hidden">{selected ? selected.name : "Auto"}</span>
          {!selected && <span className="sm:hidden @max-[28rem]:hidden">Auto</span>}
          {thinking !== "normal" && <span className="hidden sm:inline @max-[40rem]:hidden text-muted-foreground/80">· {thinking === "fast" ? "Fast" : "Deep"}</span>}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-[300px] max-h-[min(460px,var(--available-height))] z-[100] bg-white dark:bg-[#202123] border border-slate-200 dark:border-white/10 shadow-xl rounded-xl p-1.5"
      >
        <DropdownMenuLabel className="px-2 pt-1.5 pb-1">Thinking</DropdownMenuLabel>
        <div className="flex gap-1 px-1 pb-1" role="radiogroup" aria-label="Thinking">
          {THINKING_LEVELS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={thinking === t.id}
              title={t.hint}
              onClick={() => setThinking(t.id)}
              className={cn(
                "flex-1 h-8 rounded-lg text-[13px] font-medium transition-colors cursor-pointer",
                thinking === t.id ? "bg-slate-100 dark:bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-white/5",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1" />
        <DropdownMenuItem onClick={() => onChange(AUTO_MODEL_ID)} className="gap-2.5 cursor-pointer py-2 items-start">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-medium">Auto</span>
            <span className="text-xs text-muted-foreground">Picks the best model for each message</span>
          </div>
          {value === AUTO_MODEL_ID && <Check className="h-4 w-4 mt-0.5" />}
        </DropdownMenuItem>

        {MODEL_GROUPS.map((g) => ({ ...g, models: g.models.filter((m) => !offModels.has(m.id)) })).filter((g) => g.models.length > 0).map((group) => (
          <React.Fragment key={group.label}>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1" />
            <DropdownMenuLabel className="px-2 pt-1.5 pb-1">{group.label}</DropdownMenuLabel>
            {group.models.map((model) => {
              const locked = model.id === FABLE_ID && fableLocked;
              return (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => (locked ? openTopUp() : onChange(model.id))}
                  className="gap-2.5 cursor-pointer py-1.5 items-start"
                  title={locked ? `Top up ₹${access?.fable.requiredInr ?? 299} in total to unlock` : undefined}
                >
                  <ModelLogoImg logo={model.logo} className={cn("mt-0.5", locked && "opacity-50")} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className={cn("truncate", locked && "text-muted-foreground")}>{model.name}</span>
                      {isNewModel(model) && (
                        <span className="shrink-0 rounded-full border border-border px-1.5 py-px text-[10px] font-medium leading-4 text-foreground">New</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-normal break-words">
                      {locked ? (access?.fable.toppedUpInr ? `Top up ₹${fableLeft} more to unlock` : `Top up ₹${access?.fable.requiredInr ?? 299} to unlock`) : model.id === FABLE_ID && access && !access.fable.exempt ? "Most capable · uses paid credits only" : model.description}
                    </span>
                  </div>
                  {locked ? <Lock className="h-4 w-4 mt-0.5 text-muted-foreground" /> : value === model.id && <Check className="h-4 w-4 mt-0.5" />}
                </DropdownMenuItem>
              );
            })}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
