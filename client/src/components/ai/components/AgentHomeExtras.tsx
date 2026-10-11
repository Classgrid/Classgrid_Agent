// Home screen of the AI agent (empty New Chat): a greeting by time of day, starter cards that show what the
// agent can do, and a small strip with the user's connected apps and scheduled tasks.
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarCheck, BellRing, Globe, Plug, Clock } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

/** "Good evening, Nikhil" from the viewer's local time and first name. */
export function homeGreeting(name?: string | null) {
  const first = String(name || "").trim().split(/\s+/)[0];
  const h = new Date().getHours();
  const who = first ? `, ${first}` : "";
  if (h >= 5 && h < 12) return `Good morning${who}`;
  if (h >= 12 && h < 17) return `Good afternoon${who}`;
  if (h >= 17 && h < 22) return `Good evening${who}`;
  return first ? `Working late, ${first}?` : "Working late?";
}

const STARTERS = [
  { icon: BarChart3, label: "Analyse a file", prompt: "What kinds of files can you analyse for me, and what can you do with them? Tell me how to upload one." },
  { icon: CalendarCheck, label: "Exam planner", prompt: "Make me a 2-week exam study planner with daily topics, revision days and short breaks." },
  { icon: BellRing, label: "WhatsApp reminder", prompt: "Help me set up a daily WhatsApp reminder. Ask me what time and what it should say." },
  { icon: Globe, label: "Build a website", prompt: "Build me a simple, modern one-page personal portfolio website." },
];

/** Clicking a card sends its prompt to the AI straight away. */
export function StarterCards({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="grid w-full max-w-[640px] grid-cols-2 gap-2 sm:grid-cols-4">
      {STARTERS.map(({ icon: Icon, label, prompt }) => (
        <button
          key={label}
          type="button"
          onClick={() => onPick(prompt)}
          className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}

const prettyApp = (id: string) =>
  String(id).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type IntegrationInfo = { id: string; name: string; imgUrl?: string; invertInDarkMode?: boolean; invertInLightMode?: boolean };

/** Connected apps (with their real logos from the AI Hub list) and scheduled tasks; hidden when there is neither. */
export function CapabilityStrip({ integrations = [] }: { integrations?: IntegrationInfo[] }) {
  const { data: apps = [] } = useQuery({
    queryKey: ["agent-home-connected"],
    queryFn: async () => {
      const res = await apiClient.get<{ connected?: string[] }>("/api/ai-integrations/status");
      return Array.isArray(res.data?.connected) ? res.data.connected : [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const { data: scheduled = 0 } = useQuery({
    queryKey: ["agent-home-scheduled"],
    queryFn: async () => {
      const res = await apiClient.get<{ success?: boolean; schedules?: unknown[] }>("/api/ai/schedules?status=pending");
      return Array.isArray(res.data?.schedules) ? res.data.schedules.length : 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Same ids as the AI Hub (it matches this status list against INTEGRATIONS_LIST); unknown ids still show by name
  const connected = [...new Set(apps)].map((id) => {
    const info = integrations.find((i) => i.id === id || i.id === `mcp-${id}`);
    return { id, name: info?.name || prettyApp(id), info };
  });
  if (connected.length === 0 && scheduled === 0) return null;
  const label = connected.length === 1 ? `${connected[0]!.name} connected` : `${connected.length} apps connected`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {connected.length > 0 && (
        <span className="inline-flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            {connected.slice(0, 5).map(({ id, name, info }) =>
              info?.imgUrl ? (
                <img
                  key={id}
                  src={info.imgUrl}
                  alt={name}
                  title={name}
                  className={`h-4 w-4 object-contain ${info.invertInDarkMode ? "dark:invert" : ""} ${info.invertInLightMode ? "invert dark:invert-0" : ""}`}
                />
              ) : (
                <Plug key={id} className="h-3.5 w-3.5" aria-label={name} />
              )
            )}
          </span>
          {label}
        </span>
      )}
      {scheduled > 0 && (
        <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{scheduled} scheduled {scheduled === 1 ? "task" : "tasks"}</span>
      )}
    </div>
  );
}

// ── Typing greeting ──────────────────────────────────────────────────────────────────────────────────
// The heading of the home screen cycles through these lines every few seconds: the current line deletes
// itself word by word, then the next one types in word by word. The time-of-day greeting always comes first.
const HOME_LINES = [
  "What should we work on today?",
  "Analyse a file in seconds.",
  "Plan your exams, day by day.",
  "Get reminders on WhatsApp.",
  "Build and host a website.",
  "Turn a PDF into clear notes.",
  "Summarise a long document for you.",
  "Make flashcards for your next test.",
  "Explain any topic, step by step.",
  "Solve a maths problem with working.",
  "Write Python and run it for you.",
  "Draw a chart from your data.",
  "Create a PDF report in minutes.",
  "Search the web with sources.",
  "Draft an email that sounds like you.",
  "Make a weekly study timetable.",
  "Quiz you before your exam.",
  "Find the key points in a chapter.",
  "Compare two ideas side by side.",
  "Brainstorm ideas for your project.",
  "Write a cover letter that stands out.",
  "Polish your resume, line by line.",
  "Prepare you for an interview.",
  "Translate text into any language.",
  "Fix grammar and make it clearer.",
  "Turn rough notes into a neat essay.",
  "Create an image from your idea.",
  "Describe what's in a photo.",
  "Summarise a YouTube video for you.",
  "Schedule a daily summary for you.",
  "Remind you of deadlines on time.",
  "Plan a revision schedule that works.",
  "Break a big task into small steps.",
  "Write a speech for your event.",
  "Make a presentation outline fast.",
  "Explain code you don't understand.",
  "Debug an error in your code.",
  "Write SQL queries from plain English.",
  "Clean up messy spreadsheet data.",
  "Spot trends in your numbers.",
  "Calculate averages, totals and more.",
  "Find students who need extra help.",
  "Turn marks into a progress report.",
  "Write a lesson plan for tomorrow.",
  "Create a worksheet with answers.",
  "Make multiple-choice questions.",
  "Design a quiz for your class.",
  "Write feedback for an assignment.",
  "Explain a science concept simply.",
  "Help with history dates and events.",
  "Make a mind map of a topic.",
  "Write a short story with you.",
  "Come up with a catchy title.",
  "Write captions for your posts.",
  "Plan content for the whole week.",
  "Draft a project proposal.",
  "Write meeting notes and action items.",
  "Turn a voice note into text.",
  "Make a to-do list for today.",
  "Plan your day around your goals.",
  "Track habits with daily check-ins.",
  "Set a reminder for any time.",
  "Build a landing page for your idea.",
  "Make a portfolio site in one chat.",
  "Write HTML, CSS and JavaScript.",
  "Turn an idea into a web page.",
  "Explain a graph in plain words.",
  "Check your answer and show mistakes.",
  "Write a formula for your sheet.",
  "Convert units and currencies.",
  "Plan a budget for the month.",
  "Compare options before you decide.",
  "Summarise today's news on a topic.",
  "Research a topic with real sources.",
  "Outline a literature review.",
  "Cite sources in the right format.",
  "Paraphrase without losing meaning.",
  "Simplify a hard paragraph.",
  "Explain it like I'm ten.",
  "Give you practice problems.",
  "Create a study plan from your syllabus.",
  "Make notes from your lecture slides.",
  "Highlight what's likely in the exam.",
  "Write a thank-you note.",
  "Draft a leave application.",
  "Write a formal letter.",
  "Reply to a tricky message politely.",
  "Make a checklist for your trip.",
  "Plan an event step by step.",
  "Generate ideas for a science fair.",
  "Write a poem for a special day.",
  "Create a quiz from a PDF.",
  "Turn a table into a chart.",
  "Find patterns in survey results.",
  "Make a timeline of events.",
  "Explain a word with examples.",
  "Improve your vocabulary daily.",
  "Practise a language with you.",
  "Write a product description.",
  "Suggest a logo idea and colours.",
  "Write a bio for your profile.",
  "Plan a workout you can stick to.",
  "Make a meal plan for the week.",
  "Ask me anything, I'm here to help.",
  "Let's get something done together.",
];

const WORD_DELETE_MS = 80;
const WORD_TYPE_MS = 120;
const HOLD_MS = 5000;

/** Heading that types/deletes word by word through HOME_LINES. Pauses while `paused` (e.g. the user is typing). */
export function TypingGreeting({ name, paused = false }: { name?: string | null; paused?: boolean }) {
  const reduceMotion = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // The greeting first, then the other lines in a random order (different every visit)
  const lines = React.useMemo(() => {
    const rest = [...HOME_LINES];
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j]!, rest[i]!];
    }
    return [homeGreeting(name), ...rest];
  }, [name]);

  const [lineIndex, setLineIndex] = React.useState(0);
  const [wordCount, setWordCount] = React.useState(() => lines[0]!.split(" ").length);
  const [phase, setPhase] = React.useState<"hold" | "deleting" | "typing">("hold");
  const words = (lines[lineIndex] ?? "").split(" ");

  React.useEffect(() => {
    if (paused) return;
    let t: ReturnType<typeof setTimeout>;
    if (reduceMotion) {
      // No typing effect: just swap the whole line
      t = setTimeout(() => {
        const next = (lineIndex + 1) % lines.length;
        setLineIndex(next);
        setWordCount((lines[next] ?? "").split(" ").length);
      }, HOLD_MS);
    } else if (phase === "hold") {
      t = setTimeout(() => setPhase("deleting"), HOLD_MS);
    } else if (phase === "deleting") {
      t = setTimeout(() => {
        if (wordCount > 0) setWordCount(wordCount - 1);
        else {
          setLineIndex((lineIndex + 1) % lines.length);
          setPhase("typing");
        }
      }, WORD_DELETE_MS);
    } else {
      t = setTimeout(() => {
        if (wordCount < words.length) setWordCount(wordCount + 1);
        else setPhase("hold");
      }, WORD_TYPE_MS);
    }
    return () => clearTimeout(t);
  }, [paused, reduceMotion, phase, wordCount, lineIndex, lines, words.length]);

  const shown = words.slice(0, wordCount).join(" ");
  return (
    <span aria-live="polite">
      {shown || " "}
      {!reduceMotion && (
        <span aria-hidden className="ml-0.5 inline-block w-[2px] h-[1em] -mb-[0.15em] bg-foreground/70 animate-pulse" />
      )}
    </span>
  );
}
