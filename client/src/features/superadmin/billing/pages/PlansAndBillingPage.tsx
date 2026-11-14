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
// Plans & Billing (rebuilt, owner 2026-11-14): the Classgrid AI plans. The old versioned catalog (modules, organisation
// subscriptions, overrides, invoice rules, taxes) is gone with the ERP. Three tabs: the plan table (every limit and
// price, the on/off switch), who is on a paid plan (and setting a plan by hand), and the plan payments.
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/marketing_ui/tabs';
import { Input } from '@/components/marketing_ui/input';
import { Skeleton } from '@/components/marketing_ui/skeleton';
import { apiClient as api } from '@/lib/apiClient';
import { PlanConfigPanel } from '@/features/superadmin/components/PlanConfigPanel';
import { UserPlanCard } from '@/features/superadmin/components/ai-usage/UserPlanCard';

type Subscriber = {
  _id: string; email: string; name?: string; role?: string;
  plan: { id?: string; status?: string; billing?: string; started_at?: string | null; expires_at?: string | null; note?: string; set_by?: string };
};
type Payment = {
  _id: string; userEmail?: string; userName?: string; plan_key?: string; plan_term?: string; amount_inr?: number; status?: string;
  razorpay_payment_id?: string; plan_period_start?: string | null; plan_period_end?: string | null; paymentTime?: string | null; createdAt?: string;
};

const PLAN_NAMES: Record<string, string> = { free: 'Free', pro: 'Pro', max: 'Max', enterprise: 'Enterprise' };
const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const inr = (n?: number) => (typeof n === 'number' ? `₹${Math.round(n).toLocaleString('en-IN')}` : '');
const billingText = (b?: string) => (b === 'prepaid_yearly' ? 'Paid, 1 year' : b === 'manual_monthly' ? 'Paid, 1 month' : b === 'granted' ? 'Granted' : b || '');

const useSubscribers = () => useQuery({
  queryKey: ['ai-plan-subscribers'],
  queryFn: async () => (await api.get('/api/super-admin/ai-usage/plans/subscribers')).data as { users: Subscriber[]; payments: Payment[] },
});

function Subscribers() {
  const { data, isLoading } = useSubscribers();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const users = useMemo(() => {
    const list = data?.users || [];
    const needle = q.trim().toLowerCase();
    return needle ? list.filter((u) => `${u.email} ${u.name || ''}`.toLowerCase().includes(needle)) : list;
  }, [data, q]);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">{data?.users.length || 0} on a paid plan. Click a row to change the plan by hand.</p>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or name" className="h-9 max-w-xs" />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 text-left text-muted-foreground">
              <th className="p-3 font-medium">User</th>
              <th className="p-3 font-medium">Plan</th>
              <th className="p-3 font-medium">How</th>
              <th className="p-3 font-medium">Since</th>
              <th className="p-3 font-medium">Until</th>
              <th className="p-3 font-medium">Set by</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No one is on a paid plan yet.</td></tr>
            )}
            {users.map((u) => {
              const expired = u.plan?.expires_at ? new Date(u.plan.expires_at).getTime() < Date.now() : false;
              return (
                <React.Fragment key={u._id}>
                  <tr onClick={() => setOpen(open === u._id ? null : u._id)} className="border-t border-border/60 cursor-pointer hover:bg-muted/20">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{u.name || u.email}</div>
                      {u.name && <div className="text-xs text-muted-foreground">{u.email}</div>}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex rounded-full bg-foreground text-background px-2 py-0.5 text-xs font-medium">{PLAN_NAMES[u.plan?.id || ''] || u.plan?.id}</span>
                      {expired && <span className="ml-2 text-xs text-red-500">expired</span>}
                    </td>
                    <td className="p-3 text-muted-foreground">{billingText(u.plan?.billing)}</td>
                    <td className="p-3 text-muted-foreground">{date(u.plan?.started_at)}</td>
                    <td className="p-3 text-muted-foreground">{u.plan?.expires_at ? date(u.plan.expires_at) : 'No end'}</td>
                    <td className="p-3 text-muted-foreground">{u.plan?.set_by || (u.plan?.billing === 'granted' ? '' : 'payment')}</td>
                  </tr>
                  {open === u._id && (
                    <tr className="border-t border-border/60 bg-muted/10">
                      <td colSpan={6} className="p-3"><UserPlanCard userId={u._id} plan={u.plan} /></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Payments() {
  const { data, isLoading } = useSubscribers();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const payments = data?.payments || [];
  const total = payments.filter((p) => p.status === 'success').reduce((s, p) => s + (p.amount_inr || 0), 0);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{payments.length} plan payment{payments.length === 1 ? '' : 's'}, {inr(total)} in all. Top-ups are under Transactions.</p>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 text-left text-muted-foreground">
              <th className="p-3 font-medium">Paid on</th>
              <th className="p-3 font-medium">User</th>
              <th className="p-3 font-medium">Plan</th>
              <th className="p-3 font-medium">Term</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Period</th>
              <th className="p-3 font-medium">Payment id</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No plan has been paid for yet.</td></tr>
            )}
            {payments.map((p) => (
              <tr key={p._id} className="border-t border-border/60">
                <td className="p-3 text-muted-foreground">{date(p.paymentTime || p.createdAt)}</td>
                <td className="p-3">
                  <div className="font-medium text-foreground">{p.userName || p.userEmail}</div>
                  {p.userName && <div className="text-xs text-muted-foreground">{p.userEmail}</div>}
                </td>
                <td className="p-3">{PLAN_NAMES[p.plan_key || ''] || p.plan_key}</td>
                <td className="p-3 text-muted-foreground">{p.plan_term === 'year' ? '1 year' : '1 month'}</td>
                <td className="p-3 font-medium">{inr(p.amount_inr)}{p.status && p.status !== 'success' ? <span className="ml-2 text-xs text-red-500">{p.status}</span> : null}</td>
                <td className="p-3 text-muted-foreground">{date(p.plan_period_start)} to {date(p.plan_period_end)}</td>
                <td className="p-3 text-xs font-mono text-muted-foreground">{p.razorpay_payment_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PlansAndBillingPage = () => {
  const [activeTab, setActiveTab] = useState('plans');
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="border-b border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Plans & Billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The Classgrid AI plans: every limit and price, who is on a paid plan, and what was paid.
        </p>
      </div>
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
            <TabsTrigger value="payments">Plan payments</TabsTrigger>
          </TabsList>
          <TabsContent value="plans" className="mt-6"><PlanConfigPanel /></TabsContent>
          <TabsContent value="subscribers" className="mt-6"><Subscribers /></TabsContent>
          <TabsContent value="payments" className="mt-6"><Payments /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PlansAndBillingPage;
