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
//
// One person on Plans & Usage (/superadmin/ai-usage?user=<id>, owner, 2026-11-17), top to bottom: who they are, their
// plan, their usage now (the same numbers as their Settings > Usage), gifting a plan, the history (payments, plan
// changes by a super admin, the last 14 days of use), their credits (closed at first) and their AI access.
// Everything comes from GET /users/:id/detail; the page's socket listener refreshes it when anything changes.
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, History } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/marketing_ui/avatar";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/marketing_ui/empty";
import { dayText, n } from "@/features/shared/queries/usePlanOverview";
import { useAiPlans, useAiUserDetail } from "@/features/superadmin/queries/useAiUsage";
import socketClient from "@/lib/socketClient";
import { PlanHeaderCard, PlanUsageBars, PlanHistoryList, PaymentsList, UserUsageHistory, HistoryHeading } from "./UserPlanUsage";
import { UserPlanCard } from "./UserPlanCard";
import { PersonCredits } from "./PersonCredits";
import { PersonAccess } from "./PersonAccess";
import { Section } from "./Section";
import { firstNameOf, isPersonId } from "./planText";

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <Empty className="border border-dashed border-border bg-card py-12">
      <EmptyHeader>
        <EmptyTitle className="text-base">We could not find this person.</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" variant="outline" size="sm" onClick={onBack}>Back to everyone</Button>
      </EmptyContent>
    </Empty>
  );
}

export function AiUserDetailPanel({ userId, onBack }: { userId: string; onBack: () => void }) {
  const valid = isPersonId(userId);
  const { data: detail, isLoading, isError, error, refetch } = useAiUserDetail(valid ? userId : "");
  const { data: plansData } = useAiPlans();
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;
    // The person's own token updates (their chat sends ai_token_update). Its own handler, so leaving this view never
    // removes the page's "ai_usage_updated" listener.
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] });
    socket.on("ai_token_update", refresh);
    return () => { socket.off("ai_token_update", refresh); };
  }, [queryClient]);

  const back = (
    <Button type="button" variant="ghost" size="sm" onClick={onBack} className="self-start -ml-2 font-medium">
      <ChevronLeft className="w-4 h-4 mr-1" />Back to everyone
    </Button>
  );

  if (!valid) return <div className="flex flex-col gap-4">{back}<NotFound onBack={onBack} /></div>;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex flex-col gap-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64" /></div></div>
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !detail) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    if (status === 400 || status === 404) return <div className="flex flex-col gap-4">{back}<NotFound onBack={onBack} /></div>;
    return (
      <div className="flex flex-col gap-4">
        {back}
        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Could not read this person right now.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  const name = detail.name || detail.email || "Person";
  const first = firstNameOf(detail.name);
  const photo = detail.photo || detail.profilePicture;
  const facts = [
    detail.joinedAt ? `Joined ${dayText(detail.joinedAt)}` : "",
    detail.lastLoginAt ? `Last signed in ${dayText(detail.lastLoginAt)}` : "",
    typeof detail.totalChats === "number" ? `${n(detail.totalChats)} ${detail.totalChats === 1 ? "chat" : "chats"}` : "",
  ].filter(Boolean);
  const plansEnabled = plansData?.enabled ?? detail.overview?.enabled;

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {back}

      {/* Who they are */}
      <div className="flex items-start gap-4 min-w-0">
        <Avatar className="size-12">
          {photo && <AvatarImage src={photo} alt="" />}
          <AvatarFallback className="text-base font-semibold">{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground break-words">{detail.name || detail.email}</h1>
            {detail.isBlocked && <Badge variant="danger">Blocked</Badge>}
            {detail.staff && <Badge variant="neutral">Classgrid staff</Badge>}
          </div>
          {detail.name && <div className="text-sm text-muted-foreground break-all">{detail.email}</div>}
          {facts.length > 0 && <div className="text-xs text-muted-foreground">{facts.join(" · ")}</div>}
        </div>
      </div>

      {/* 1. The plan */}
      <PlanHeaderCard
        userId={detail.id}
        plan={detail.plan}
        planKey={detail.planKey}
        student={detail.student}
        staff={detail.staff}
        plansEnabled={plansEnabled}
        firstName={first}
        customWindowLimit={detail.customWindowLimit}
      />

      {/* 2. The usage bars, as they see them in Settings > Usage */}
      <PlanUsageBars overview={detail.overview} callCounts={detail.callCounts} firstName={first} />

      {/* 3. Gift a plan */}
      <UserPlanCard inline userId={detail.id} plan={detail.plan} name={detail.name || detail.email} staff={detail.staff} plansEnabled={plansEnabled} />

      {/* 4. History */}
      <Section icon={History} title="History">
        <div className="flex flex-col gap-6">
          <div>
            <HistoryHeading>Payments</HistoryHeading>
            <PaymentsList payments={detail.payments ?? []} />
          </div>
          <div>
            <HistoryHeading>Plan changes by a super admin</HistoryHeading>
            <PlanHistoryList rows={detail.planHistory ?? []} />
          </div>
          <div>
            <HistoryHeading>Usage, last 14 days</HistoryHeading>
            <UserUsageHistory userId={detail.id} />
          </div>
        </div>
      </Section>

      {/* 5. Credits (closed at first) */}
      <PersonCredits detail={detail} />

      {/* 6. AI access */}
      <PersonAccess userId={detail.id} name={name} isBlocked={!!detail.isBlocked} />
    </div>
  );
}
