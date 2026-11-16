// A live doc's Share box (owner, 2026-11-16, from the share box he showed): two tabs.
//   Share   add people by email with a role, the access requests waiting for an answer, the people with access
//           (each with a role menu that says what the role means), general access (only the people added, or
//           anyone signed in with the link, and what the link lets them do), and the link itself.
//   Export  the doc as a Word file, a PDF, Markdown or one web page.
// The owner and the editors share the doc; everyone else sees who owns it, what they themselves can do, and the link.
// What is picked shows at once and is saved behind it (no spinner); if saving fails the box goes back and says why.
import { useEffect, useState } from "react";
import { Check, Download, FileCode2, FileText, FileType2, Globe2, Link2, Lock, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/marketing_ui/dialog";
import { Button } from "@/components/marketing_ui/button";
import { cn } from "@/lib/utils";
import { PersonPhoto } from "./DocPeople";
import { PickMenu, type PickChoice } from "./PickMenu";
import * as api from "./liveDocsApi";
import type { DocRole, ExportFormat, LiveDoc } from "./liveDocsApi";

export type ShareTab = "share" | "export";
type Say = (text: string, bad?: boolean) => void;

const ROLE_NAMES: Record<DocRole | "owner", string> = { owner: "Owner", viewer: "Viewer", commenter: "Commenter", editor: "Editor" };
const ROLE_CHOICES: PickChoice<DocRole>[] = [
  { value: "editor", name: "Editor", about: "Changes the doc, and can share it with others up to Editor." },
  { value: "commenter", name: "Commenter", about: "Reads the doc and can comment." },
  { value: "viewer", name: "Viewer", about: "Reads the doc." },
];
const OWNER_CHOICE: PickChoice<"owner"> = { value: "owner", name: "Owner", about: "The doc becomes theirs. You stay on it as an editor." };
const REMOVE_CHOICE: PickChoice<"remove"> = { value: "remove", name: "Remove", danger: true };
const ACCESS_CHOICES: PickChoice<LiveDoc["visibility"]>[] = [
  { value: "private", name: "Only people added", about: "Others who open the link can ask for access." },
  { value: "link", name: "Anyone with the link", about: "Anyone signed in to Classgrid who has the link." },
];
const LINK_ABOUT: Record<DocRole, string> = { viewer: "can read it", commenter: "can read it and comment", editor: "can read it, comment and edit" };
const EXPORT_ICONS: Record<ExportFormat, typeof FileText> = { docx: FileText, pdf: FileType2, md: FileCode2, html: Globe2 };

export function ShareDialog({ doc, meName, meEmail, mePhoto, open, tab, onTab, onClose, onDoc, onLeft, say }: {
  doc: LiveDoc;
  meName: string;
  meEmail: string;
  mePhoto: string;
  open: boolean;
  tab: ShareTab;
  onTab: (tab: ShareTab) => void;
  onClose: () => void;
  onDoc: (doc: LiveDoc) => void;
  /** This person took themselves off the doc and can't open it any more. */
  onLeft: () => void;
  say: Say;
}) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<DocRole>("viewer");
  const [notes, setNotes] = useState<string[]>([]); // what could not be done for some of the emails
  const [askRoles, setAskRoles] = useState<Record<string, DocRole>>({});
  const [making, setMaking] = useState<ExportFormat | null>(null);
  const [copied, setCopied] = useState(false);
  const [handOver, setHandOver] = useState<{ id: string; name: string } | null>(null);
  const sharer = doc.can.share;
  const link = `https://chat.classgrid.in/docs/${doc.id}`;

  useEffect(() => {
    if (!open) { setEmails(""); setNotes([]); setCopied(false); setHandOver(null); }
  }, [open]);

  /** Shows `next` at once, saves behind it, and goes back to how it was when saving fails. */
  const quietly = (next: LiveDoc, work: () => Promise<LiveDoc>, done?: string) => {
    const before = doc;
    onDoc(next);
    work().then((saved) => { onDoc(saved); if (done) say(done); }).catch((e) => { onDoc(before); say(api.errorText(e, "That could not be saved. Please try again."), true); });
  };

  const invite = () => {
    const typed = emails;
    setEmails("");
    setNotes([]);
    api.invitePeople(doc.id, typed, role).then(({ doc: next, results }) => {
      onDoc(next);
      const added = results.filter((r) => r.ok && !r.already).length;
      const kept = results.filter((r) => r.already).length;
      const problems = results.filter((r) => r.error || r.note).map((r) => `${r.email}: ${r.error || r.note}`);
      setNotes(problems);
      setEmails(results.filter((r) => r.error).map((r) => r.email).join(", "));
      if (added) say(added === 1 ? "Shared. They were sent an email with the link." : `Shared with ${added} people. Each was sent an email with the link.`);
      else if (kept && !problems.length) say("They already had access. Their role was updated.");
    }).catch((e) => { setEmails(typed); say(api.errorText(e, "The doc could not be shared. Please try again."), true); });
  };

  const people = doc.people || [];
  const requests = doc.requests || [];

  const changePerson = (personId: string, next: DocRole | "owner" | "remove") => {
    const person = people.find((p) => p.id === personId);
    if (!person) return;
    if (next === "owner") { setHandOver({ id: personId, name: person.name || person.email }); return; }
    if (next === "remove") {
      if (person.me) {
        api.removePerson(doc.id, personId).then((left) => { if (left) onDoc(left); else { onClose(); onLeft(); } }).catch((e) => say(api.errorText(e), true));
        return;
      }
      quietly({ ...doc, people: people.filter((p) => p.id !== personId) }, async () => (await api.removePerson(doc.id, personId)) || doc, "Removed. They can no longer open the doc.");
      return;
    }
    quietly({ ...doc, people: people.map((p) => (p.id === personId ? { ...p, role: next } : p)) }, () => api.setPersonRole(doc.id, personId, next));
  };

  const answer = (requestId: string, action: "approve" | "decline") => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;
    const asRole = askRoles[requestId] || request.wants;
    quietly(
      { ...doc, requests: requests.filter((r) => r.id !== requestId) },
      () => api.answerRequest(doc.id, requestId, action, asRole),
      action === "approve" ? "Approved. They were sent an email." : "Request declined.",
    );
  };

  const setAccess = (body: { visibility?: LiveDoc["visibility"]; linkRole?: DocRole }) => quietly({ ...doc, ...body }, () => api.setAccess(doc.id, body));

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { say("The link could not be copied. Copy it from the address bar.", true); }
  };

  const download = async (format: ExportFormat) => {
    setMaking(format);
    try { await api.exportDoc(doc.id, format, doc.title); say("Downloaded."); }
    catch (e: any) { say(String(e?.message || "The file could not be made. Please try again."), true); }
    finally { setMaking(null); }
  };

  const linkOn = doc.visibility === "link";
  const personChoices = (canHandOver: boolean): PickChoice<DocRole | "owner" | "remove">[] => [...(canHandOver ? [OWNER_CHOICE] : []), ...ROLE_CHOICES, REMOVE_CHOICE];

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent showCloseButton={false} className="flex max-h-[min(86vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px]">
        <div className="flex items-start gap-3 px-5 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <DialogTitle className="[overflow-wrap:anywhere] text-[16px] font-semibold leading-6">{doc.title}</DialogTitle>
            <DialogDescription className="sr-only">Share this doc with people, or download it as a file.</DialogDescription>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1.5 -mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div role="tablist" aria-label="Share or export" className="mx-5 grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-black/[0.05] p-1 dark:bg-white/[0.08]">
          {(["share", "export"] as ShareTab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTab(t)}
              className={cn("h-8 rounded-lg text-[13.5px] font-medium transition-colors", tab === t ? "bg-background text-foreground shadow-sm dark:bg-white/[0.16]" : "text-muted-foreground hover:text-foreground")}
            >
              {t === "share" ? "Share" : "Export"}
            </button>
          ))}
        </div>

        {handOver ? (
          <div className="px-5 pt-5 pb-5">
            <h3 className="text-[15px] font-semibold">Make {handOver.name} the owner?</h3>
            <p className="mt-1.5 text-[13.5px] leading-5 text-muted-foreground">The doc becomes theirs: only they can delete it or hand it on. You stay on it as an editor.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" className="h-9 px-4" onClick={() => setHandOver(null)}>Cancel</Button>
              <Button
                size="sm"
                className="h-9 px-4"
                onClick={() => {
                  const to = handOver;
                  setHandOver(null);
                  api.makeOwner(doc.id, to.id).then((next) => { onDoc(next); say(`${to.name} is the owner now.`); }).catch((e) => say(api.errorText(e, "The owner could not be changed."), true));
                }}
              >
                Make owner
              </Button>
            </div>
          </div>
        ) : tab === "share" ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-2">
              {sharer && (
                <>
                  <div className="flex items-center gap-2 rounded-xl bg-black/[0.05] pl-3.5 pr-1.5 dark:bg-white/[0.08] focus-within:ring-1 focus-within:ring-foreground/30">
                    <input
                      value={emails}
                      onChange={(e) => { setEmails(e.target.value); setNotes([]); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && emails.trim()) { e.preventDefault(); invite(); } }}
                      placeholder="Add people by email"
                      aria-label="Add people by email"
                      autoComplete="off"
                      spellCheck={false}
                      data-no-ring
                      className="h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
                    />
                    {emails.trim() && <PickMenu label="Role for the people you add" value={role} choices={ROLE_CHOICES} onPick={setRole} />}
                  </div>
                  {emails.trim() && (
                    <div className="mt-2 flex items-center gap-3">
                      <p className="min-w-0 flex-1 text-[12.5px] leading-[18px] text-muted-foreground">Each person gets an email with the link. Put a comma between emails.</p>
                      <Button size="sm" className="h-8 shrink-0 px-3.5" onClick={invite}>Share</Button>
                    </div>
                  )}
                  {notes.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[12.5px] text-red-600 dark:text-red-400">
                      {notes.map((n) => <li key={n} className="break-words">{n}</li>)}
                    </ul>
                  )}

                  {requests.length > 0 && (
                    <section className="mt-5" aria-label="Access requests">
                      <h3 className="text-[13px] font-medium text-muted-foreground">Access requests</h3>
                      <ul className="mt-1">
                        {requests.map((r) => (
                          <li key={r.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 py-2">
                            <PersonPhoto name={r.name || r.email} photo={r.photo} size="lg" />
                            <div className="min-w-0 flex-1 basis-40">
                              <div className="[overflow-wrap:anywhere] text-[14px] font-medium">{r.name || r.email}</div>
                              <div className="[overflow-wrap:anywhere] text-[12.5px] text-muted-foreground">{r.email}</div>
                              <div className="[overflow-wrap:anywhere] text-[12.5px] text-muted-foreground">{r.has ? `Asked to ${r.wants === "editor" ? "edit" : "comment on"} this doc` : "Asked to open this doc"}</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <PickMenu label={`Role for ${r.email}`} value={askRoles[r.id] || r.wants} choices={ROLE_CHOICES} onPick={(next) => setAskRoles((all) => ({ ...all, [r.id]: next }))} />
                              <button type="button" onClick={() => answer(r.id, "decline")} className="h-8 rounded-lg px-2.5 text-[13px] font-medium text-foreground hover:bg-accent">Decline</button>
                              <button type="button" onClick={() => answer(r.id, "approve")} className="h-8 rounded-lg bg-foreground px-3 text-[13px] font-medium text-background hover:bg-foreground/90">Approve</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[12px] leading-[17px] text-muted-foreground">Go by the email address when you decide: the name is chosen by the person.</p>
                    </section>
                  )}
                </>
              )}

              <section className={cn(sharer && "mt-5")} aria-label="People with access">
                <h3 className="text-[13px] font-medium text-muted-foreground">People with access</h3>
                <ul className="mt-1">
                  <li className="flex items-center gap-2.5 py-2">
                    <PersonPhoto name={doc.isOwner ? meName || doc.ownerName : doc.ownerName} photo={doc.isOwner ? mePhoto || doc.ownerPhoto : doc.ownerPhoto} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="[overflow-wrap:anywhere] text-[14px] font-medium">{doc.isOwner ? <>{meName || doc.ownerName} <span className="font-normal text-muted-foreground">(you)</span></> : doc.ownerName || "The owner"}</div>
                      {doc.isOwner && meEmail && <div className="[overflow-wrap:anywhere] text-[12.5px] text-muted-foreground">{meEmail}</div>}
                    </div>
                    <span className="px-2.5 text-[13px] text-muted-foreground">Owner</span>
                  </li>
                  {!doc.isOwner && !people.some((p) => p.me) && (
                    <li className="flex items-center gap-2.5 py-2">
                      <PersonPhoto name={meName || meEmail} photo={mePhoto} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="[overflow-wrap:anywhere] text-[14px] font-medium">{meName || "You"} <span className="font-normal text-muted-foreground">(you)</span></div>
                        {meEmail && <div className="[overflow-wrap:anywhere] text-[12.5px] text-muted-foreground">{meEmail}</div>}
                      </div>
                      <span className="px-2.5 text-[13px] text-muted-foreground">{ROLE_NAMES[doc.role]}</span>
                    </li>
                  )}
                  {people.map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5 py-2">
                      <PersonPhoto name={p.name || p.email} photo={p.me ? mePhoto || p.photo : p.photo} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="[overflow-wrap:anywhere] text-[14px] font-medium">{p.name || p.email}{p.me && <span className="font-normal text-muted-foreground"> (you)</span>}</div>
                        <div className="[overflow-wrap:anywhere] text-[12.5px] text-muted-foreground">{p.name ? p.email : p.joined ? "" : "Invited, has not opened it yet"}</div>
                      </div>
                      {p.me ? (
                        <PickMenu label="Your role" value={null} shown={ROLE_NAMES[p.role]} choices={[{ value: "remove", name: "Leave this doc", danger: true }]} onPick={() => changePerson(p.id, "remove")} />
                      ) : (
                        <PickMenu label={`Role of ${p.name || p.email}`} value={p.role} choices={personChoices(doc.can.manage && p.joined)} onPick={(next) => changePerson(p.id, next)} />
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-4" aria-label="General access">
                <h3 className="text-[13px] font-medium text-muted-foreground">General access</h3>
                <div className="mt-1 flex items-center gap-2.5 py-2">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-foreground dark:bg-white/[0.09]">
                    {linkOn ? <Globe2 className="size-[18px]" /> : <Lock className="size-[18px]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {sharer
                      ? <PickMenu quiet align="start" label="Who can open the doc" value={doc.visibility} choices={ACCESS_CHOICES} onPick={(visibility) => setAccess({ visibility })} />
                      : <div className="text-[14px] font-medium">{linkOn ? "Anyone with the link" : "Only people added"}</div>}
                  </div>
                  {linkOn && (sharer
                    ? <PickMenu label="What the link lets people do" value={doc.linkRole} choices={ROLE_CHOICES} onPick={(linkRole) => setAccess({ linkRole })} />
                    : <span className="px-2.5 text-[13px] text-muted-foreground">{ROLE_NAMES[doc.linkRole]}</span>)}
                </div>
              </section>
            </div>

            <div className="flex shrink-0 items-center gap-3 border-t border-border px-5 py-3.5">
              <p className="min-w-0 flex-1 text-[13px] leading-[18px] text-muted-foreground">
                {linkOn ? `Anyone signed in with the link ${LINK_ABOUT[doc.linkRole]}` : "Only the people added can open this link"}
              </p>
              <button type="button" onClick={copy} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-black/[0.05] px-3 text-[13.5px] font-medium text-foreground hover:bg-black/[0.09] dark:bg-white/[0.09] dark:hover:bg-white/[0.14]">
                {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}{copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-4">
            <ul>
              {api.EXPORTS.map(({ format, name, about }) => {
                const Icon = EXPORT_ICONS[format];
                return (
                  <li key={format}>
                    <button
                      type="button"
                      onClick={() => download(format)}
                      disabled={!!making}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground"><Icon className="size-[18px]" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium">{name}</span>
                        <span className="block [overflow-wrap:anywhere] text-[12.5px] text-muted-foreground">{making === format ? "Making the file" : about}</span>
                      </span>
                      <Download className={cn("size-4 shrink-0", making === format ? "animate-pulse text-foreground" : making ? "text-muted-foreground/40" : "text-muted-foreground")} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
