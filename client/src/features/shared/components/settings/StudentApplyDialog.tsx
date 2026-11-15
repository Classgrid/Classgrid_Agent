// The student application (Settings > Billing; owner, 2026-11-15, like GitHub's student benefits):
//   1. School: picked from the school list, or typed in full when it is not listed.
//   2. School details: only for a school that is not listed (its website, the email it gives students, kind, size,
//      address).
//   3. School email: when the school gives students one, it must be confirmed on the account (added right here with
//      a code, or picked from the account's emails).
//   4. Proof: a document that shows the student studies there. Then it is sent for review (within 2 days).
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { useAccountEmails, allEmails } from "@/features/shared/queries/useAccountEmails";
import { useSchoolSearch, useApplyStudent, dayText, type StudentState, type SchoolMatch } from "@/features/shared/queries/usePlanOverview";
import { AddEmailForm, btnGrey, btnWhite, field, input, inDomain } from "./AddEmailForm";
import { goToSettings } from "@/lib/settingsPath";

type Step = "school" | "details" | "email" | "proof" | "done";
const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** "students.pccoepune.org" from "name@students.pccoepune.org", "@pccoepune.org" or "https://pccoepune.org/" */
const domainOf = (v: string) => {
  let d = v.trim().toLowerCase();
  if (d.includes("@")) d = d.split("@").pop() || "";
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0] || "";
  d = d.replace(/^\.+|\.+$/g, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : "";
};

function Label({ children, need }: { children: React.ReactNode; need?: boolean }) {
  return <div className="text-[13px] font-medium mt-3.5 first:mt-0">{children}{need && <span className="text-red-500"> *</span>}</div>;
}

export function StudentApplyDialog({ open, onClose, state }: { open: boolean; onClose: () => void; state?: StudentState }) {
  const { data: emails } = useAccountEmails();
  const apply = useApplyStudent();
  const [step, setStep] = useState<Step>("school");
  const [err, setErr] = useState("");
  // the school
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<SchoolMatch | null>(null);
  const [showList, setShowList] = useState(false);
  const { data: matches, isFetching } = useSchoolSearch(picked ? "" : q);
  // a school that is not listed
  const [website, setWebsite] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [kind, setKind] = useState("");
  const [size, setSize] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("India");
  // the school email and the proof
  const [schoolEmail, setSchoolEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("school"); setErr(""); setQ(""); setPicked(null); setShowList(false); setWebsite(""); setStudentEmail(""); setKind(""); setSize("");
    setStreet(""); setCity(""); setRegion(""); setCountry("India"); setSchoolEmail(""); setFile(null);
  }, [open]);

  const domains = useMemo(() => (picked ? picked.domains : domainOf(studentEmail) ? [domainOf(studentEmail)] : []), [picked, studentEmail]);
  // A different school (or school email format) starts the school email again
  useEffect(() => { setSchoolEmail(""); }, [picked?.id, studentEmail]);
  const fitting = allEmails(emails).filter((e) => domains.some((d) => inDomain(e.email, d)));
  useEffect(() => { if (step === "email" && !schoolEmail && fitting[0]) setSchoolEmail(fitting[0].email); }, [step, fitting.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxMb = state?.max_document_mb || 10;
  const reviewDays = state?.review_days || 2;
  const kinds = state?.kinds?.length ? state.kinds : ["University", "College", "School", "Coaching or training institute", "Other"];
  const sizes = state?.sizes?.length ? state.sizes : ["Under 500", "500 to 2,000", "2,000 to 10,000", "Over 10,000"];
  const pending = state?.application?.status === "pending";

  const next = () => {
    setErr("");
    if (step === "school") {
      if (!picked && q.trim().length < 3) { setErr("Enter your school's full name."); return; }
      setStep(picked ? (picked.domains.length ? "email" : "proof") : "details");
    } else if (step === "details") {
      if (!kind || !size || !city.trim() || !country.trim()) { setErr("Fill in what kind of school it is, how many students it has, its city and its country."); return; }
      if (studentEmail.trim() && !domainOf(studentEmail)) { setErr("Enter the school email the way your school gives it, for example name@students.yourschool.edu."); return; }
      setStep(domains.length ? "email" : "proof");
    } else if (step === "email") {
      if (!schoolEmail) { setErr("Add and confirm your school email first."); return; }
      setStep("proof");
    }
  };
  const back = () => {
    setErr("");
    if (step === "details") setStep("school");
    else if (step === "email") setStep(picked ? "school" : "details");
    else if (step === "proof") setStep(domains.length ? "email" : picked ? "school" : "details");
  };

  const pickFile = (f: File | null) => {
    setErr("");
    if (!f) return;
    if (!PROOF_TYPES.includes(f.type)) { setErr("Upload a JPG, PNG, WebP or PDF file."); return; }
    if (f.size > maxMb * 1024 * 1024) { setErr(`The file is over ${maxMb} MB. Upload a smaller one.`); return; }
    setFile(f);
  };

  const submit = async () => {
    setErr("");
    if (!file) { setErr("Upload a document that shows you study there."); return; }
    const form = new FormData();
    if (picked) form.append("school_id", picked.id);
    else {
      form.append("school_name", q.trim());
      form.append("school_website", website.trim());
      form.append("school_email_domain", studentEmail.trim());
      form.append("school_kind", kind);
      form.append("school_students", size);
      form.append("school_street", street.trim());
      form.append("school_city", city.trim());
      form.append("school_state", region.trim());
      form.append("school_country", country.trim());
    }
    if (schoolEmail) form.append("school_email", schoolEmail);
    form.append("document", file);
    try { await apply.mutateAsync(form); setStep("done"); }
    catch (e: any) {
      const r = e?.response?.data;
      setErr(r?.error || "Couldn't send your application. Please try again.");
      if (r?.code === "school_email_needed") setStep("email");
      if (r?.code === "school_listed") setStep("school");
    }
  };

  const select = "h-11 px-3 rounded-[10px] border border-border bg-background text-base text-foreground w-full outline-none focus:border-[#7aa7ff]";
  const title = step === "done" ? "Application sent" : "Apply for student prices";
  const description = step === "school" ? "Students get Pro and Max at a lower price. Tell us where you study, then upload a document that shows it. We review every application by hand."
    : step === "details" ? "Your school is not on our list yet. Tell us about it."
    : step === "email" ? `Students of ${picked?.name || q.trim()} apply with a school email ending in ${domains.join(" or ")}. It must be confirmed on your account.`
    : step === "proof" ? "Upload a clear photo or scan that shows your name, your school and that you study there this year: your student ID card, fee receipt, bonafide certificate or admission letter."
    : `We review it within ${reviewDays} days and email you the answer at ${emails?.primary.email || "your email"}.`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[520px] p-6 max-h-[92vh] overflow-y-auto" overlayClassName="supports-backdrop-filter:backdrop-blur-none !backdrop-blur-none !bg-black/40">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{pending && step !== "done" ? "Your application is being reviewed" : title}</DialogTitle>
          <DialogDescription>
            {pending && step !== "done"
              ? `You applied for ${state?.application?.school} on ${dayText(state!.application!.submitted_at)}. We review it within ${reviewDays} days and email you the answer.`
              : description}
          </DialogDescription>
        </DialogHeader>

        {pending || step === "done" ? (
          <div className="flex justify-end"><button type="button" className={btnWhite} onClick={onClose}>Done</button></div>
        ) : (
          <>
            {step === "school" && (
              <div>
                <Label need>What is the name of your school?</Label>
                <div className="relative mt-2">
                  <div className={field}>
                    <input data-no-ring="true" className={input} placeholder="Start typing your school or college" value={picked ? picked.name : q} autoFocus
                      onChange={(e) => { setPicked(null); setQ(e.target.value); setShowList(true); }} onFocus={() => setShowList(true)} />
                    {(picked || q) && <button type="button" className="text-muted-foreground hover:text-foreground cursor-pointer text-sm" aria-label="Clear" onClick={() => { setPicked(null); setQ(""); }}>✕</button>}
                  </div>
                  {showList && !picked && q.trim().length >= 2 && (matches?.length || 0) > 0 && (
                    <div className="absolute z-10 left-0 right-0 mt-1 rounded-[10px] border border-border bg-popover shadow-lg overflow-hidden">
                      {matches!.map((m) => (
                        <button key={m.id} type="button" className="w-full text-left px-3.5 py-2.5 text-[15px] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] cursor-pointer" onClick={() => { setPicked(m); setShowList(false); }}>
                          {m.name}{m.city ? <span className="text-muted-foreground text-[13px]"> · {m.city}</span> : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {isFetching ? "Searching" : "If your school is not listed, type its full name and continue. You'll be asked about your school next."}
                </p>
                {picked && picked.domains.length > 0 && (
                  <div className="mt-3 rounded-[10px] border border-amber-400/40 bg-amber-400/10 px-3.5 py-3 text-[13px] text-foreground">
                    Students of <strong>{picked.name}</strong> apply with a school email ending in <strong>{picked.domains.join(" or ")}</strong>. You'll add it next if it is not on your account yet.
                  </div>
                )}
              </div>
            )}

            {step === "details" && (
              <div>
                <Label>School website</Label>
                <div className={`${field} mt-2`}><input data-no-ring="true" className={input} placeholder="https://yourschool.edu" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
                <Label>What email does your school give students?</Label>
                <div className={`${field} mt-2`}><input data-no-ring="true" className={input} placeholder="name@students.yourschool.edu" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} /></div>
                <p className="text-xs text-muted-foreground mt-1.5">Leave it empty if your school does not give students an email.</p>
                <Label need>How would you describe your school?</Label>
                <select className={`${select} mt-2`} value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="">Choose</option>
                  {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <Label need>How many students are enrolled at your school?</Label>
                <select className={`${select} mt-2`} value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="">Choose</option>
                  {sizes.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <Label>Street address</Label>
                <div className={`${field} mt-2`}><input data-no-ring="true" className={input} value={street} onChange={(e) => setStreet(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label need>City</Label><div className={`${field} mt-2`}><input data-no-ring="true" className={input} value={city} onChange={(e) => setCity(e.target.value)} /></div></div>
                  <div><Label>State, region or province</Label><div className={`${field} mt-2`}><input data-no-ring="true" className={input} value={region} onChange={(e) => setRegion(e.target.value)} /></div></div>
                </div>
                <Label need>Country</Label>
                <div className={`${field} mt-2`}><input data-no-ring="true" className={input} value={country} onChange={(e) => setCountry(e.target.value)} /></div>
              </div>
            )}

            {step === "email" && (
              <div>
                {fitting.length > 0 ? (
                  <>
                    <Label need>Your school email</Label>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {fitting.map((e) => (
                        <label key={e.email} className="flex items-center gap-2.5 text-[15px] cursor-pointer">
                          <input type="radio" name="school-email" checked={schoolEmail === e.email} onChange={() => setSchoolEmail(e.email)} />
                          {e.email}
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] text-muted-foreground mb-3">Add your school email to your account. We send it a 6-digit code. You can sign in with it too, and your usage stays the same.</p>
                    <AddEmailForm requiredDomains={domains} onAdded={(e) => setSchoolEmail(e)} />
                    <p className="text-xs text-muted-foreground mt-2">
                      An account has up to 3 emails and one school email. To make room, remove one in{" "}
                      <button type="button" className="underline cursor-pointer" onClick={() => { onClose(); goToSettings("account"); }}>Settings › Account</button>.
                    </p>
                  </>
                )}
              </div>
            )}

            {step === "proof" && (
              <div>
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
                <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-[10px] border border-dashed border-border px-4 py-6 text-center cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                  <div className="text-[15px] text-foreground">{file ? file.name : "Choose a file"}</div>
                  <div className="text-xs text-muted-foreground mt-1">{file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · Choose another file` : `JPG, PNG, WebP or PDF, up to ${maxMb} MB`}</div>
                </button>
                <p className="text-xs text-muted-foreground mt-2">Only Classgrid's review team sees it. It is deleted 30 days after the decision.</p>
              </div>
            )}

            <div className="text-xs text-red-500 min-h-[16px] mt-2">{err}</div>
            <div className="flex justify-between gap-2 mt-1">
              {step === "school" ? <button type="button" className={btnGrey} onClick={onClose}>Cancel</button> : <button type="button" className={btnGrey} onClick={back}>Back</button>}
              {step === "proof"
                ? <button type="button" className={btnWhite} disabled={!file || apply.isPending} onClick={submit}>{apply.isPending ? "Sending" : "Send application"}</button>
                : <button type="button" className={btnWhite} disabled={step === "email" && !schoolEmail} onClick={next}>Continue</button>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
