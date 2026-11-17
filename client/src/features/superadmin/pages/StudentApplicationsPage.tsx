// Super admin > Student applications (owner, 2026-11-15): students' applications for student prices, reviewed by hand
// within 2 days (approve, or reject with the reason the student is emailed), each with its document; and the school
// list the students pick from (a school a student typed in can be added when its application is approved).
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/marketing_ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { apiClient } from "@/lib/apiClient";

type Status = "pending" | "approved" | "rejected";
type SchoolInfo = { name: string; listed: boolean; domains: string[]; website: string; kind: string; students: string; street: string; city: string; state: string; country: string };
type Application = {
  id: string; status: Status; user: { id: string; name: string; email: string }; school_id: string | null; school: SchoolInfo;
  school_email: string | null; document: { name: string; mime: string; size: number; deleted: boolean };
  submitted_at: string; decided_at: string | null; decided_by_email: string; reject_reason: string; added_school_id: string | null;
};
type School = { id: string; name: string; domains: string[]; website: string; kind: string; students: string; street: string; city: string; state: string; country: string; from_application: string | null };
type Page<T> = { rows: T[]; total: number; page: number; pages: number; counts?: Record<string, number> };

const day = (d?: string | null) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "");
const btn = "inline-flex items-center h-8 px-3.5 rounded-full text-[13px] font-medium cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-default";
const btnGrey = `${btn} bg-black/[0.06] dark:bg-white/[0.09] text-foreground hover:bg-black/[0.1] dark:hover:bg-white/[0.14]`;
const btnWhite = `${btn} bg-foreground text-background hover:bg-foreground/90`;
const btnRed = `${btn} bg-red-500/15 text-red-500 hover:bg-red-500/25`;
const inputCls = "h-10 w-full rounded-[10px] border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-[#7aa7ff]";

/** The document, fetched with the super admin's sign-in (it has no public link) */
function DocumentView({ app }: { app: Application }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let made: string | null = null;
    setUrl(null); setErr("");
    if (app.document.deleted) { setErr("The document was deleted 30 days after the decision."); return; }
    apiClient.get(`/api/super-admin/students/applications/${app.id}/document`, { responseType: "blob" })
      .then((r) => { made = URL.createObjectURL(r.data as Blob); setUrl(made); })
      .catch(() => setErr("Couldn't load the document."));
    return () => { if (made) URL.revokeObjectURL(made); };
  }, [app.id, app.document.deleted]);
  if (err) return <div className="text-sm text-muted-foreground">{err}</div>;
  if (!url) return <div className="h-64 rounded-lg bg-muted animate-pulse" />;
  return (
    <div>
      {app.document.mime === "application/pdf"
        ? <iframe title="Document" src={url} className="w-full h-[480px] rounded-lg border border-border bg-white" />
        : <img src={url} alt="Student document" className="max-h-[480px] w-auto rounded-lg border border-border mx-auto" />}
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline text-muted-foreground mt-1.5 inline-block">Open in a new tab</a>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  if (!v) return null;
  return <div className="flex gap-3 text-sm py-1"><span className="w-40 shrink-0 text-muted-foreground">{k}</span><span className="text-foreground min-w-0 break-words">{v}</span></div>;
}

function ApplicationDialog({ app, onClose }: { app: Application | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [addSchool, setAddSchool] = useState(true);
  const [domains, setDomains] = useState("");
  useEffect(() => { setReason(""); setRejecting(false); setAddSchool(true); setDomains((app?.school.domains || []).join(", ")); }, [app?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const decide = useMutation({
    mutationFn: async (body: Record<string, unknown>) => (await apiClient.post(`/api/super-admin/students/applications/${app!.id}/decision`, body)).data,
    onSuccess: (_r, body) => {
      toast.success(body.approve ? "Approved. The student got an email." : "Rejected. The student got an email with the reason.");
      qc.invalidateQueries({ queryKey: ["student-applications"] }); qc.invalidateQueries({ queryKey: ["student-schools-admin"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || "Couldn't save the decision."),
  });
  if (!app) return null;
  const s = app.school;
  return (
    <Dialog open={!!app} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[760px] p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{app.user.name || app.user.email}</DialogTitle>
          <DialogDescription>{app.user.email} · sent {day(app.submitted_at)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          <div>
            <div className="text-sm font-semibold mb-1">School</div>
            <Row k="Name" v={<>{s.name} {s.listed ? <span className="text-xs text-emerald-500">on the list</span> : <span className="text-xs text-amber-500">typed by the student</span>}</>} />
            <Row k="Email domains" v={s.domains.join(", ")} />
            <Row k="Website" v={s.website ? <a className="underline" href={/^https?:/.test(s.website) ? s.website : `https://${s.website}`} target="_blank" rel="noopener noreferrer">{s.website}</a> : ""} />
            <Row k="Kind" v={s.kind} />
            <Row k="Students" v={s.students} />
            <Row k="Address" v={[s.street, s.city, s.state, s.country].filter(Boolean).join(", ")} />
            <Row k="School email" v={app.school_email ? `${app.school_email} (confirmed on the account)` : "None: the school gives no student email"} />
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">Document · {app.document.name}</div>
            <DocumentView app={app} />
          </div>
          {app.status === "pending" ? (
            rejecting ? (
              <div>
                <div className="text-sm font-semibold mb-1.5">Why is it not approved? The student gets this in the email.</div>
                <textarea className={`${inputCls} h-24 py-2`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: the document does not show this year, or the name does not match." autoFocus />
                <div className="flex justify-end gap-2 mt-3">
                  <button type="button" className={btnGrey} onClick={() => setRejecting(false)}>Back</button>
                  <button type="button" className={btnRed} disabled={reason.trim().length < 5 || decide.isPending} onClick={() => decide.mutate({ approve: false, reason: reason.trim() })}>Reject and email the student</button>
                </div>
              </div>
            ) : (
              <div>
                {!s.listed && (
                  <div className="rounded-lg border border-border p-3 mb-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={addSchool} onChange={(e) => setAddSchool(e.target.checked)} /> Add {s.name} to the school list</label>
                    {addSchool && (
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">Its students' email domains (comma separated; empty if it gives none)</div>
                        <input className={inputCls} value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="pccoepune.org" />
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button type="button" className={btnRed} onClick={() => setRejecting(true)}>Reject</button>
                  <button type="button" className={btnWhite} disabled={decide.isPending} onClick={() => decide.mutate({ approve: true, ...(s.listed ? {} : { add_school: addSchool, school_domains: domains.split(/[,\s]+/).filter(Boolean) }) })}>Approve</button>
                </div>
              </div>
            )
          ) : (
            <div className="text-sm text-muted-foreground">
              {app.status === "approved" ? "Approved" : "Rejected"} by {app.decided_by_email || "a super admin"} on {day(app.decided_at)}.
              {app.reject_reason ? ` Reason: ${app.reject_reason}` : ""}{app.added_school_id ? " The school was added to the list." : ""}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Applications({ status }: { status: Status }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Application | null>(null);
  useEffect(() => setPage(1), [status]);
  const { data, isLoading } = useQuery({
    queryKey: ["student-applications", status, page],
    queryFn: async () => (await apiClient.get("/api/super-admin/students/applications", { params: { status, page } })).data?.data as Page<Application>,
  });
  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading</div> : !data?.rows.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{status === "pending" ? "No applications to review." : `No ${status} applications yet.`}</div>
        ) : (
          <div className="divide-y divide-border">
            {data.rows.map((a) => (
              <button key={a.id} type="button" onClick={() => setOpen(a)} className="w-full text-left px-5 py-3.5 hover:bg-muted/50 cursor-pointer flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium truncate">{a.user.name || a.user.email} <span className="text-muted-foreground font-normal text-sm">{a.user.email}</span></div>
                  <div className="text-[13px] text-muted-foreground truncate">{a.school.name}{a.school.listed ? "" : " (new school)"} · {a.school_email || "no school email"}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{day(a.status === "pending" ? a.submitted_at : a.decided_at)}</div>
              </button>
            ))}
          </div>
        )}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border text-sm">
            <button type="button" className={btnGrey} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="text-muted-foreground">Page {data.page} of {data.pages}</span>
            <button type="button" className={btnGrey} disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </CardContent>
      <ApplicationDialog app={open} onClose={() => setOpen(null)} />
    </Card>
  );
}

const emptySchool = { name: "", domains: "", website: "", kind: "", students: "", street: "", city: "", state: "", country: "India" };

function Schools() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<(typeof emptySchool & { id?: string }) | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["student-schools-admin", q, page],
    queryFn: async () => (await apiClient.get("/api/super-admin/students/schools", { params: { q, page } })).data?.data as Page<School>,
  });
  const save = useMutation({
    mutationFn: async (s: typeof emptySchool & { id?: string }) => {
      const body = { ...s, domains: s.domains.split(/[,\s]+/).filter(Boolean) };
      return (s.id ? await apiClient.put(`/api/super-admin/students/schools/${s.id}`, body) : await apiClient.post("/api/super-admin/students/schools", body)).data;
    },
    onSuccess: () => { toast.success("School saved"); setEdit(null); qc.invalidateQueries({ queryKey: ["student-schools-admin"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error || "Couldn't save the school."),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => (await apiClient.delete(`/api/super-admin/students/schools/${id}`)).data,
    onSuccess: () => { toast.success("School deleted"); setEdit(null); qc.invalidateQueries({ queryKey: ["student-schools-admin"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error || "Couldn't delete the school."),
  });
  const f = (k: keyof typeof emptySchool, label: string, ph = "") => (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <input className={inputCls} value={edit?.[k] || ""} placeholder={ph} onChange={(e) => setEdit((p) => (p ? { ...p, [k]: e.target.value } : p))} />
    </div>
  );
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <input className={`${inputCls} max-w-sm`} placeholder="Search by name or domain" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <span className="text-xs text-muted-foreground">{data ? `${data.total} schools` : ""}</span>
          <button type="button" className={`${btnWhite} ml-auto`} onClick={() => setEdit({ ...emptySchool })}>Add school</button>
        </div>
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading</div> : !data?.rows.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{q ? "No school matches." : "No schools yet. Add one, or add a school when you approve its first student."}</div>
        ) : (
          <div className="divide-y divide-border">
            {data.rows.map((s) => (
              <button key={s.id} type="button" onClick={() => setEdit({ id: s.id, name: s.name, domains: s.domains.join(", "), website: s.website, kind: s.kind, students: s.students, street: s.street, city: s.city, state: s.state, country: s.country })} className="w-full text-left px-5 py-3 hover:bg-muted/50 cursor-pointer flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium truncate">{s.name}</div>
                  <div className="text-[13px] text-muted-foreground truncate">{s.domains.length ? s.domains.join(", ") : "No email domain"}{s.city ? ` · ${s.city}` : ""}{s.country ? `, ${s.country}` : ""}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border text-sm">
            <button type="button" className={btnGrey} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="text-muted-foreground">Page {data.page} of {data.pages}</span>
            <button type="button" className={btnGrey} disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </CardContent>
      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent className="sm:max-w-[560px] p-6">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Edit school" : "Add school"}</DialogTitle>
            <DialogDescription>Students of this school apply with an email at one of its domains. Leave domains empty if it gives students no email.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">{f("name", "Full name", "Pimpri Chinchwad College of Engineering")}</div>
            <div className="col-span-2">{f("domains", "Email domains (comma separated)", "pccoepune.org")}</div>
            {f("website", "Website")}{f("kind", "Kind", "College")}
            {f("city", "City")}{f("state", "State")}
            {f("country", "Country")}{f("students", "Students", "2,000 to 10,000")}
            <div className="col-span-2">{f("street", "Street address")}</div>
          </div>
          <div className="flex justify-between gap-2 mt-2">
            {edit?.id ? <button type="button" className={btnRed} disabled={remove.isPending} onClick={() => remove.mutate(edit.id!)}>Delete</button> : <span />}
            <div className="flex gap-2">
              <button type="button" className={btnGrey} onClick={() => setEdit(null)}>Cancel</button>
              <button type="button" className={btnWhite} disabled={!edit || edit.name.trim().length < 3 || save.isPending} onClick={() => edit && save.mutate(edit)}>Save</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function StudentApplicationsPage() {
  const [tab, setTab] = useState<Status | "schools">("pending");
  const { data } = useQuery({
    queryKey: ["student-applications", "pending", 1],
    queryFn: async () => (await apiClient.get("/api/super-admin/students/applications", { params: { status: "pending", page: 1 } })).data?.data as Page<Application>,
  });
  const counts = data?.counts || {};
  const tabs: { id: Status | "schools"; label: string }[] = [
    { id: "pending", label: `To review${counts.pending ? ` (${counts.pending})` : ""}` },
    { id: "approved", label: `Approved${counts.approved ? ` (${counts.approved})` : ""}` },
    { id: "rejected", label: `Rejected${counts.rejected ? ` (${counts.rejected})` : ""}` },
    { id: "schools", label: "Schools" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`h-9 px-5 rounded-full text-[15px] cursor-pointer ${tab === t.id ? "bg-black/[0.07] dark:bg-white/[0.1] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "schools" ? <Schools /> : <Applications status={tab} />}
    </div>
  );
}
