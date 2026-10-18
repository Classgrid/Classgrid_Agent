import React, { useEffect, useMemo, useState } from "react";
import { FlaskConical, Coins, Repeat, Gauge, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { ScrollArea } from "@/components/marketing_ui/scroll-area";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/marketing_ui/table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/marketing_ui/empty";
import { getSocket } from "@/lib/socketClient";

// Playground: the super admin's own AI messages, live. The server sends each round's tokens, every tool call,
// the words as they are written and what was charged at the end (events "playground:*" on the user's channel).

type RoundRow = {
  who: string; model: string; round: number; input: number; output: number; cacheRead: number; cacheWrite: number;
  cacheCounted: boolean; cut?: boolean; cost: number; spent: number; spendable: number | null; at: number;
};
type ToolRow = { who: string; tool: string; detail: string; at: number };
type EndInfo = { model: string; realCost: number; charged: number; uncharged: number; balanceAfter: number | null; meterTotal: number; spendable: number | null; stopped: boolean };
type Run = {
  id: string; question: string; model: string; spendable: number | null; startedAt: number;
  rounds: RoundRow[]; tools: ToolRow[]; text: string; thought: string;
  stop: { who: string; spent: number; spendable: number | null } | null; end: EndInfo | null;
};

const n = (v: number | null | undefined) => (v === null || v === undefined ? "No limit" : Math.round(v).toLocaleString("en-IN"));
const shortModel = (m: string) => String(m || "").replace(/^@cf\/[^/]+\//, "").replace(/-\d{4}$/, "");
const time = (at: number) => new Date(at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function PlaygroundPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // The live connection can open a moment after the page: look for it until it is there
    let socket = getSocket();
    let retry: ReturnType<typeof setInterval> | null = null;
    const update = (id: string, change: (r: Run) => Run) =>
      setRuns((prev) => prev.map((r) => (r.id === id ? change(r) : r)));

    const onStart = (d: any) => {
      setRuns((prev) => [{ id: d.runId, question: d.question, model: d.model, spendable: d.spendable, startedAt: d.at, rounds: [], tools: [], text: "", thought: "", stop: null, end: null }, ...prev].slice(0, 20));
      setSelectedId(d.runId);
    };
    const onRound = (d: any) => update(d.runId, (r) => ({ ...r, rounds: [...r.rounds, d as RoundRow] }));
    const onTool = (d: any) => update(d.runId, (r) => ({ ...r, tools: [...r.tools, d as ToolRow] }));
    const onText = (d: any) => update(d.runId, (r) => ({ ...r, text: r.text + (d.text || ""), thought: r.thought + (d.thought || "") }));
    const onStop = (d: any) => update(d.runId, (r) => ({ ...r, stop: { who: d.who, spent: d.spent, spendable: d.spendable } }));
    const onEnd = (d: any) => update(d.runId, (r) => ({ ...r, end: d as EndInfo }));

    const attach = (s: NonNullable<ReturnType<typeof getSocket>>) => {
      s.on("playground:start", onStart);
      s.on("playground:round", onRound);
      s.on("playground:tool", onTool);
      s.on("playground:text", onText);
      s.on("playground:stop", onStop);
      s.on("playground:end", onEnd);
    };
    if (socket) attach(socket);
    else retry = setInterval(() => {
      socket = getSocket();
      if (socket) { attach(socket); if (retry) clearInterval(retry); }
    }, 1000);

    return () => {
      if (retry) clearInterval(retry);
      socket?.off("playground:start", onStart);
      socket?.off("playground:round", onRound);
      socket?.off("playground:tool", onTool);
      socket?.off("playground:text", onText);
      socket?.off("playground:stop", onStop);
      socket?.off("playground:end", onEnd);
    };
  }, []);

  const run = useMemo(() => runs.find((r) => r.id === selectedId) || runs[0] || null, [runs, selectedId]);
  const spent = run?.rounds[run.rounds.length - 1]?.spent ?? 0;
  const status = !run ? null : run.end ? (run.end.stopped ? "stopped" : "done") : run.stop || run.rounds.some((r) => r.cut) ? "stopped" : "running";

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <PageHeader title="Playground">
        <Button variant="outline" onClick={() => { setRuns([]); setSelectedId(null); }} disabled={!runs.length}>Clear</Button>
      </PageHeader>

      {!run ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><FlaskConical /></EmptyMedia>
                <EmptyTitle>Waiting for your next message</EmptyTitle>
                <EmptyDescription>Send a message in the chat (Agent or Project Mode) from this account. Each round shows up here as it happens.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          {runs.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {runs.map((r) => (
                <Button key={r.id} size="sm" variant={r.id === run.id ? "default" : "outline"} onClick={() => setSelectedId(r.id)}>
                  {time(r.startedAt)} · {r.question.slice(0, 30) || "Message"}
                </Button>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Balance at start" value={n(run.spendable)} icon={Coins} trend={shortModel(run.model)} />
            <StatCard title="Spent so far" value={n(spent)} icon={Gauge} trend={run.spendable ? `${Math.min(100, Math.round((spent / run.spendable) * 100))}% of the balance` : undefined} />
            <StatCard title="Rounds" value={run.rounds.length} icon={Repeat} trend={`${run.tools.length} tool call${run.tools.length === 1 ? "" : "s"}`} />
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Status</CardTitle></CardHeader>
              <CardContent>
                {status === "running" && <Badge variant="info" dot>Working</Badge>}
                {status === "done" && <Badge variant="success">Finished</Badge>}
                {status === "stopped" && <Badge variant="warning">Stopped: tokens ran out</Badge>}
                <CardDescription className="mt-2 line-clamp-2">{run.question}</CardDescription>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rounds</CardTitle>
              <CardDescription>One row per trip to the AI, with the real numbers the provider sent back. Each round sends the conversation again, so input grows. Cached input is the part the model remembered from the last round. "cut" means the round's real input used up the tokens left, so it was stopped before writing anything.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Input</TableHead>
                    <TableHead className="text-right">Cached</TableHead>
                    <TableHead className="text-right">Output</TableHead>
                    <TableHead className="text-right">This round costs</TableHead>
                    <TableHead className="text-right">Total so far</TableHead>
                    <TableHead className="text-right">Left</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.rounds.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.round}{r.cut && <Badge variant="warning" className="ml-1">cut</Badge>}</TableCell>
                      <TableCell><Badge variant={r.who === "Agent" ? "secondary" : "info"}>{r.who}</Badge></TableCell>
                      <TableCell>{shortModel(r.model)}</TableCell>
                      <TableCell className="text-right">{n(r.input)}</TableCell>
                      <TableCell className="text-right">
                        {n(r.cacheRead)}
                        {r.cacheRead > 0 && !r.cacheCounted && <Badge variant="neutral" className="ml-1">full price</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{n(r.output)}</TableCell>
                      <TableCell className="text-right">{n(r.cost)}</TableCell>
                      <TableCell className="text-right">{n(r.spent)}</TableCell>
                      <TableCell className="text-right">{r.spendable === null ? "No limit" : n(r.spendable - r.spent)}</TableCell>
                      <TableCell>{time(r.at)}</TableCell>
                    </TableRow>
                  ))}
                  {status === "running" && (
                    <TableRow>
                      <TableCell colSpan={10}><Badge variant="info" dot>Round {run.rounds.length + 1} running…</Badge></TableCell>
                    </TableRow>
                  )}
                  {run.stop && (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <Badge variant="warning">Stopped ({run.stop.who}): spent {n(run.stop.spent)} of {n(run.stop.spendable)}, nothing left for another round</Badge>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Live words</CardTitle>
                <CardDescription>What the AI is thinking and writing, as it comes in.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80 rounded-md border p-3">
                  {run.thought && <CardDescription className="whitespace-pre-wrap italic mb-3">{run.thought}</CardDescription>}
                  {run.text ? <p className="whitespace-pre-wrap text-sm">{run.text}</p> : !run.thought && <CardDescription>No words yet.</CardDescription>}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tool calls</CardTitle>
                <CardDescription>Every tool the agent and its helpers ran, in order.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80 rounded-md border p-3">
                  {run.tools.length === 0 && <CardDescription>No tools yet.</CardDescription>}
                  <div className="flex flex-col gap-2">
                    {run.tools.map((t, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Badge variant={t.who === "Agent" ? "secondary" : "info"}><Wrench className="h-3 w-3 mr-1" />{t.who}</Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{t.tool}</p>
                          <CardDescription className="break-all text-xs">{t.detail}</CardDescription>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {run.end && (
            <Card>
              <CardHeader>
                <CardTitle>Charged</CardTitle>
                <CardDescription>What this message really cost compared with what was taken from the balance.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <StatCard title="Real cost (agent)" value={n(run.end.realCost)} trend={shortModel(run.end.model)} />
                  <StatCard title="All rounds (with helpers)" value={n(run.end.meterTotal)} />
                  <StatCard title="Charged" value={n(run.end.charged)} />
                  <StatCard title="Not charged" value={n(run.end.uncharged)} trend={run.end.uncharged > 0 ? "Lost: the balance ran out" : "Nothing lost"} />
                  <StatCard title="Balance after" value={n(run.end.balanceAfter)} />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default PlaygroundPage;
