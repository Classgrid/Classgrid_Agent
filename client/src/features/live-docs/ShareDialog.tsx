// The Share box of a live doc and of a published page (owner, 2026-11-16, from the share box he showed): two tabs.
//   Share   add people by email with a role, the access requests waiting for an answer, the people with access
//           (each with a role menu that says what the role means), general access (only the people added, or
//           anyone signed in with the link, and what the link lets them do), and the link itself.
//   Export  download it as a file (the choices come from the screen that opens the box).
// The owner and the editors share it; everyone else sees who owns it, what they themselves can do, and the link.
// What is picked shows at once and is saved behind it (no spinner); if saving fails the box goes back and says why.
// The box, its buttons and its fields have the look of the chat's own boxes (docLook.ts).
import { useEffect, useState } from "react";
import { Check, Download, Globe2, Link2, Lock, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/marketing_ui/dialog";
import { cn } from "@/lib/utils";
import { PersonPhoto } from "./DocPeople";
import { PickMenu, type PickChoice } from "./PickMenu";
import { errorText } from "./liveDocsApi";
import type { DocRole } from "./liveDocsApi";
import type { ExportChoice, ShareCalls, Shared } from "./shareApi";
import { barIcon, boxAbout, boxBtnMain, boxBtnPlain, boxCls, boxFoot, boxHead, boxLine, boxOverlay, boxTitle } from "./docLook";

export type ShareTab = "share" | "export";
type Say = (text: string, bad?: boolean) => void;

const ROLE_NAMES: Record<DocRole | "owner", string> = { owner: "Owner", viewer: "Viewer", commenter: "Commenter", editor: "Editor" };
const WORDS = {
  doc: {
    editor: "Changes the doc, and can share it with others up to Editor.",
    commenter: "Reads the doc and can comment.",
    viewer: "Reads the doc.",
    link: { viewer: "can read it", commenter: "can read it and comment", editor: "can read it, comment and edit" } as Record<DocRole, string>,
    about: "Share this doc with people, or download it as a file.",
  },
  page: {
    editor: "Renames the page, and can share it with others up to Editor.",
    commenter: "Opens the page and can comment.",
    viewer: "Opens the page.",
    link: { viewer: "can open it", commenter: "can open it and comment", editor: "can open it, comment and share it" } as Record<DocRole, string>,
    about: "Share this page with people, or download it as a file.",
  },
};
const REMOVE_CHOICE: PickChoice<"remove"> = { value: "remove", name: "Remove", danger: true };
const ACCESS_CHOICES: PickChoice<Shared["visibility"]>[] = [
  { value: "private", name: "Only people added", about: "Others who open the link can ask for access." },
  { value: "link", name: "Anyone with the link", about: "Anyone signed in to Classgrid who has the link." },
];
const heading = "text-[12px] font-medium text-muted-foreground";
const name = "[overflow-wrap:anywhere] text-[13px] font-medium";
const under = "[overflow-wrap:anywhere] text-[12px] text-muted-foreground";

export function ShareDialog<T extends Shared>({ item, calls, exports, meName, meEmail, mePhoto, open, tab, onTab, onClose, onItem, onLeft, say }: {
  /** The doc or the page. */
  item: T;
  calls: ShareCalls<T>;
  /** The files it can be downloaded as (the Export tab). */
  exports: ExportChoice[];
  meName: string;
  meEmail: string;
  mePhoto: string;
  open: boolean;
  tab: ShareTab;
  onTab: (tab: ShareTab) => void;
  onClose: () => void;
  onItem: (item: T) => void;
  /** This person took themselves off it and can't open it any more. */
  onLeft: () => void;
  say: Say;
}) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<DocRole>("viewer");
  const [notes, setNotes] = useState<string[]>([]); // what could not be done for some of the emails
  const [askRoles, setAskRoles] = useState<Record<string, DocRole>>({});
  const [making, setMaking] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [handOver, setHandOver] = useState<{ id: string; name: string } | null>(null);
  const noun = calls.kind;
  const words = WORDS[noun];
  const sharer = item.can.share;
  const link = calls.link(item.id);
  const roleChoices: PickChoice<DocRole>[] = [
    { value: "editor", name: "Editor", about: words.editor },
    { value: "commenter", name: "Commenter", about: words.commenter },
    { value: "viewer", name: "Viewer", about: words.viewer },
  ];
  const ownerChoice: PickChoice<"owner"> = { value: "owner", name: "Owner", about: `The ${noun} becomes theirs. You stay on it as an editor.` };

  useEffect(() => {
    if (!open) { setEmails(""); setNotes([]); setCopied(false); setHandOver(null); }
  }, [open]);

  /** Shows `next` at once, saves behind it, and goes back to how it was when saving fails. */
  const quietly = (next: T, work: () => Promise<T>, done?: string) => {
    const before = item;
    onItem(next);
    work().then((saved) => { onItem(saved); if (done) say(done); }).catch((e) => { onItem(before); say(errorText(e, "That could not be saved. Please try again."), true); });
  };

  const invite = () => {
    const typed = emails;
    setEmails("");
    setNotes([]);
    calls.invitePeople(item.id, typed, role).then(({ item: next, results }) => {
      onItem(next);
      const added = results.filter((r) => r.ok && !r.already).length;
      const kept = results.filter((r) => r.already).length;
      const problems = results.filter((r) => r.error || r.note).map((r) => `${r.email}: ${r.error || r.note}`);
      setNotes(problems);
      setEmails(results.filter((r) => r.error).map((r) => r.email).join(", "));
      if (added) say(added === 1 ? "Shared. They were sent an email with the link." : `Shared with ${added} people. Each was sent an email with the link.`);
      else if (kept && !problems.length) say("They already had access. Their role was updated.");
    }).catch((e) => { setEmails(typed); say(errorText(e, `The ${noun} could not be shared. Please try again.`), true); });
  };

  const people = item.people || [];
  const requests = item.requests || [];

  const changePerson = (personId: string, next: DocRole | "owner" | "remove") => {
    const person = people.find((p) => p.id === personId);
    if (!person) return;
    if (next === "owner") { setHandOver({ id: personId, name: person.name || person.email }); return; }
    if (next === "remove") {
      if (person.me) {
        calls.removePerson(item.id, personId).then((left) => { if (left) onItem(left); else { onClose(); onLeft(); } }).catch((e) => say(errorText(e), true));
        return;
      }
      quietly({ ...item, people: people.filter((p) => p.id !== personId) }, async () => (await calls.removePerson(item.id, personId)) || item, `Removed. They can no longer open the ${noun}.`);
      return;
    }
    quietly({ ...item, people: people.map((p) => (p.id === personId ? { ...p, role: next } : p)) }, () => calls.setPersonRole(item.id, personId, next));
  };

  const answer = (requestId: string, action: "approve" | "decline") => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;
    const asRole = askRoles[requestId] || request.wants;
    quietly(
      { ...item, requests: requests.filter((r) => r.id !== requestId) },
      () => calls.answerRequest(item.id, requestId, action, asRole),
      action === "approve" ? "Approved. They were sent an email." : "Request declined.",
    );
  };

  const setAccess = (body: { visibility?: Shared["visibility"]; linkRole?: DocRole }) => quietly({ ...item, ...body }, () => calls.setAccess(item.id, body));

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { say("The link could not be copied. Copy it from the address bar.", true); }
  };

  const download = async (choice: ExportChoice) => {
    setMaking(choice.id);
    try { await choice.run(); const done = choice.done ?? "Downloaded."; if (done) say(done); }
    catch (e: any) { say(String(e?.message || "The file could not be made. Please try again."), true); }
    finally { setMaking(null); }
  };

  const linkOn = item.visibility === "link";
  const personChoices = (canHandOver: boolean): PickChoice<DocRole | "owner" | "remove">[] => [...(canHandOver ? [ownerChoice] : []), ...roleChoices, REMOVE_CHOICE];

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent showCloseButton={false} overlayClassName={boxOverlay} className={cn("flex max-h-[min(86vh,720px)] flex-col sm:max-w-[30rem]", boxCls)}>
        <div className={cn("flex items-start gap-3", boxHead)}>
          <div className="min-w-0 flex-1">
            <DialogTitle className={boxTitle}>{item.title}</DialogTitle>
            <DialogDescription className={boxAbout}>{words.about}</DialogDescription>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" title="Close" className={cn(barIcon, "-mr-2 -mt-1")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div role="tablist" aria-label="Share or export" className={cn("mx-5 grid shrink-0 grid-cols-2 gap-0.5 rounded-md border bg-black/[0.03] p-0.5 dark:bg-[#161616]", boxLine)}>
          {(["share", "export"] as ShareTab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTab(t)}
              className={cn("h-7 cursor-pointer rounded-[5px] text-[13px] font-medium transition-colors", tab === t ? "bg-white text-foreground shadow-sm dark:bg-white/[0.12]" : "text-muted-foreground hover:text-foreground")}
            >
              {t === "share" ? "Share" : "Export"}
            </button>
          ))}
        </div>

        {handOver ? (
          <>
            <div className="px-5 pt-4 pb-5">
              <h3 className="text-[14px] font-medium [overflow-wrap:anywhere]">Make {handOver.name} the owner?</h3>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground">The {noun} becomes theirs: only they can delete it or hand it on. You stay on it as an editor.</p>
            </div>
            <div className={boxFoot}>
              <button type="button" className={boxBtnPlain} onClick={() => setHandOver(null)}>Cancel</button>
              <button
                type="button"
                className={boxBtnMain}
                onClick={() => {
                  const to = handOver;
                  setHandOver(null);
                  calls.makeOwner(item.id, to.id).then((next) => { onItem(next); say(`${to.name} is the owner now.`); }).catch((e) => say(errorText(e, "The owner could not be changed."), true));
                }}
              >
                Make owner
              </button>
            </div>
          </>
        ) : tab === "share" ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-3">
              {sharer && (
                <>
                  <div className={cn("flex items-center gap-2 rounded-md border bg-white pl-3 pr-1 focus-within:border-black/30 dark:bg-[#161616] dark:focus-within:border-white/25", boxLine)}>
                    <input
                      value={emails}
                      onChange={(e) => { setEmails(e.target.value); setNotes([]); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && emails.trim()) { e.preventDefault(); invite(); } }}
                      placeholder="Add people by email"
                      aria-label="Add people by email"
                      autoComplete="off"
                      spellCheck={false}
                      data-no-ring
                      className="h-9 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                    />
                    {emails.trim() && <PickMenu quiet label="Role for the people you add" value={role} choices={roleChoices} onPick={setRole} />}
                  </div>
                  {emails.trim() && (
                    <div className="mt-2 flex items-center gap-3">
                      <p className="min-w-0 flex-1 text-[12px] leading-[17px] text-muted-foreground">Each person gets an email with the link. Put a comma between emails.</p>
                      <button type="button" className={boxBtnMain} onClick={invite}>Share</button>
                    </div>
                  )}
                  {notes.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[12px] text-red-600 dark:text-red-400">
                      {notes.map((n) => <li key={n} className="break-words">{n}</li>)}
                    </ul>
                  )}

                  {requests.length > 0 && (
                    <section className="mt-4" aria-label="Access requests">
                      <h3 className={heading}>Access requests</h3>
                      <ul className="mt-0.5">
                        {requests.map((r) => (
                          <li key={r.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 py-2">
                            <PersonPhoto name={r.name || r.email} photo={r.photo} size="md" />
                            <div className="min-w-0 flex-1 basis-40">
                              <div className={name}>{r.name || r.email}</div>
                              <div className={under}>{r.email}</div>
                              <div className={under}>{r.has ? `Asked to ${r.wants === "editor" ? "edit" : "comment on"} this ${noun}` : `Asked to open this ${noun}`}</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <PickMenu label={`Role for ${r.email}`} value={askRoles[r.id] || r.wants} choices={roleChoices} onPick={(next) => setAskRoles((all) => ({ ...all, [r.id]: next }))} />
                              <button type="button" onClick={() => answer(r.id, "decline")} className={boxBtnPlain}>Decline</button>
                              <button type="button" onClick={() => answer(r.id, "approve")} className={boxBtnMain}>Approve</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[12px] leading-[17px] text-muted-foreground">Go by the email address when you decide: the name is chosen by the person.</p>
                    </section>
                  )}
                </>
              )}

              <section className={cn(sharer && "mt-4")} aria-label="People with access">
                <h3 className={heading}>People with access</h3>
                <ul className="mt-0.5">
                  <li className="flex items-center gap-2.5 py-2">
                    <PersonPhoto name={item.isOwner ? meName || item.ownerName : item.ownerName} photo={item.isOwner ? mePhoto || item.ownerPhoto : item.ownerPhoto} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className={name}>{item.isOwner ? <>{meName || item.ownerName} <span className="font-normal text-muted-foreground">(you)</span></> : item.ownerName || "The owner"}</div>
                      {item.isOwner && meEmail && <div className={under}>{meEmail}</div>}
                    </div>
                    <span className="px-2.5 text-[13px] text-muted-foreground">Owner</span>
                  </li>
                  {!item.isOwner && !people.some((p) => p.me) && (
                    <li className="flex items-center gap-2.5 py-2">
                      <PersonPhoto name={meName || meEmail} photo={mePhoto} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className={name}>{meName || "You"} <span className="font-normal text-muted-foreground">(you)</span></div>
                        {meEmail && <div className={under}>{meEmail}</div>}
                      </div>
                      <span className="px-2.5 text-[13px] text-muted-foreground">{ROLE_NAMES[item.role]}</span>
                    </li>
                  )}
                  {people.map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5 py-2">
                      <PersonPhoto name={p.name || p.email} photo={p.me ? mePhoto || p.photo : p.photo} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className={name}>{p.name || p.email}{p.me && <span className="font-normal text-muted-foreground"> (you)</span>}</div>
                        <div className={under}>{p.name ? p.email : p.joined ? "" : "Invited, has not opened it yet"}</div>
                      </div>
                      {p.me ? (
                        <PickMenu label="Your role" value={null} shown={ROLE_NAMES[p.role]} choices={[{ value: "remove", name: `Leave this ${noun}`, danger: true }]} onPick={() => changePerson(p.id, "remove")} />
                      ) : (
                        <PickMenu label={`Role of ${p.name || p.email}`} value={p.role} choices={personChoices(item.can.manage && p.joined)} onPick={(next) => changePerson(p.id, next)} />
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-3" aria-label="General access">
                <h3 className={heading}>General access</h3>
                <div className="mt-0.5 flex items-center gap-2.5 py-2">
                  <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-foreground", boxLine)}>
                    {linkOn ? <Globe2 className="size-4" /> : <Lock className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {sharer
                      ? <PickMenu quiet align="start" label={`Who can open the ${noun}`} value={item.visibility} choices={ACCESS_CHOICES} onPick={(visibility) => setAccess({ visibility })} />
                      : <div className={name}>{linkOn ? "Anyone with the link" : "Only people added"}</div>}
                  </div>
                  {linkOn && (sharer
                    ? <PickMenu label="What the link lets people do" value={item.linkRole} choices={roleChoices} onPick={(linkRole) => setAccess({ linkRole })} />
                    : <span className="px-2.5 text-[13px] text-muted-foreground">{ROLE_NAMES[item.linkRole]}</span>)}
                </div>
              </section>
            </div>

            <div className={cn(boxFoot, "shrink-0 justify-between gap-3")}>
              <p className="min-w-0 flex-1 text-[12px] leading-[17px] text-muted-foreground">
                {linkOn ? `Anyone signed in with the link ${words.link[item.linkRole]}` : "Only the people added can open this link"}
              </p>
              <button type="button" onClick={copy} className={boxBtnMain}>
                {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}{copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-4">
            <ul>
              {exports.map((choice) => (
                <li key={choice.id}>
                  <button
                    type="button"
                    onClick={() => download(choice)}
                    disabled={!!making}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-black/[0.04] disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-white/[0.05]"
                  >
                    <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-foreground", boxLine)}><choice.icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium">{choice.name}</span>
                      <span className={cn("block", under)}>{making === choice.id ? "Making the file" : choice.about}</span>
                    </span>
                    <Download className={cn("size-4 shrink-0", making === choice.id ? "animate-pulse text-foreground" : making ? "text-muted-foreground/40" : "text-muted-foreground")} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
