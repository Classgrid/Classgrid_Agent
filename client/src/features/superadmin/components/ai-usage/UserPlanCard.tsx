// A user's plan (Free, Pro, Max, Enterprise), set by hand by the super admin: a gift, a test account, a refund case.
import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient as api } from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Label } from "@/components/marketing_ui/label";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { X } from "lucide-react";

// A day as "YYYY-MM-DD" <-> a Date, for the app's own calendar (NikhilTimeCalendar) instead of the browser's date box
const dateOf = (iso: string) => (iso ? new Date(`${iso}T00:00:00`) : undefined);
const isoOf = (d?: Date) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "");

const PLAN_NAMES: Record<string, string> = { free: "Free", pro: "Pro", max: "Max", enterprise: "Enterprise" };

type StudentInfo = { email?: string | null; method?: string; verified_at?: string; expires_at?: string | null } | null;

export function UserPlanCard({ userId, plan, student }: { userId: string; plan?: { id?: string; status?: string; billing?: string; expires_at?: string | null; note?: string; set_by?: string }; student?: StudentInfo }) {
  const queryClient = useQueryClient();
  const [planId, setPlanId] = useState(plan?.id || "free");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setPlanId(plan?.id || "free");
    setExpiresAt(plan?.expires_at ? new Date(plan.expires_at).toISOString().slice(0, 10) : "");
    setNote(plan?.note || "");
  }, [plan?.id, plan?.expires_at, plan?.note]);

  const save = useMutation({
    mutationFn: async () => (await api.put(`/api/super-admin/ai-usage/users/${userId}/plan`, { planId, expires_at: expiresAt || null, note })).data,
    onSuccess: () => { toast.success(`Plan set to ${PLAN_NAMES[planId] || planId}`); queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not set the plan"),
  });

  // Student prices: confirmed by a school email, or by hand here (for a student without one)
  const setStudent = useMutation({
    mutationFn: async (verified: boolean) => (await api.put(`/api/super-admin/ai-usage/users/${userId}/student`, { verified })).data,
    onSuccess: (_d, verified) => { toast.success(verified ? "Confirmed as a student" : "Student price removed"); queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error || "Could not change the student price"),
  });
  const studentOn = !!student?.verified_at && !(student.expires_at && new Date(student.expires_at).getTime() < Date.now());
  const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

  const current = plan?.id || "free";
  const expired = plan?.expires_at ? new Date(plan.expires_at).getTime() < Date.now() : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan</CardTitle>
        <CardDescription>
          Now on <span className="font-medium text-foreground">{PLAN_NAMES[current] || current}</span>
          {plan?.billing && plan.billing !== "none" ? ` (${plan.billing.replace(/_/g, " ")})` : ""}
          {plan?.expires_at ? `, ${expired ? "expired" : "until"} ${new Date(plan.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
          {plan?.set_by ? `, set by ${plan.set_by}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="user-plan" className="text-xs">Plan</Label>
            <Select value={planId} onValueChange={(v) => v && setPlanId(v as string)} disabled={save.isPending}>
              <SelectTrigger id="user-plan" className="h-9 w-full"><SelectValue>{PLAN_NAMES[planId] || planId}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectGroup>{Object.entries(PLAN_NAMES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="user-plan-until" className="text-xs">Until (empty = no end)</Label>
            <div className={`flex items-center gap-1 ${save.isPending || planId === "free" ? "pointer-events-none opacity-60" : ""}`}>
              <NikhilTimeCalendar value={dateOf(expiresAt)} onChange={(d) => setExpiresAt(isoOf(d))} showTime={false} placeholder="No end" className="flex-1 h-9 border border-input bg-background" />
              {expiresAt && (
                <Button type="button" variant="ghost" size="sm" className="h-9 px-2 shrink-0" title="Clear date" onClick={() => setExpiresAt("")}><X className="w-4 h-4" /></Button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="user-plan-note" className="text-xs">Note</Label>
            <Input id="user-plan-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. gift for feedback" disabled={save.isPending} className="h-9" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Spinner className="w-4 h-4 mr-2" />}
            Set plan
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="text-sm">
            <div className="font-medium text-foreground">Student price</div>
            <div className="text-xs text-muted-foreground">
              {studentOn
                ? `Confirmed${student?.method === "admin" ? " by hand" : student?.email ? ` with ${student.email}` : ""}, until ${day(student?.expires_at)}`
                : "Not confirmed. The user confirms a school or university email in Settings > Billing, or you confirm them here."}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setStudent.mutate(!studentOn)} disabled={setStudent.isPending}>
            {setStudent.isPending && <Spinner className="w-4 h-4 mr-2" />}
            {studentOn ? "Remove" : "Confirm as student"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
