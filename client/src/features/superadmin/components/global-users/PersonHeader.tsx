// The top of a person's page: picture, name, email, what they do, their role, status and plan, and their WhatsApp
// number. A banned account gets a red notice under it with when, by whom and why (when that was recorded).
import { Badge } from "@/components/marketing_ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/marketing_ui/alert";
import { PersonAvatar } from "./PersonAvatar";
import { PlanBadge } from "./PlanBadge";
import { StatusBadge } from "./StatusBadge";
import { dateText, dateTimeText, roleLabel, whatsappText } from "./format";
import type { PersonOverview } from "./types";

// "Blocked on 12 Nov 2026 by Nikhil until 19 Nov 2026, 5:30 pm. Reason: spam", leaving out whatever wasn't recorded
function banText(ban: NonNullable<PersonOverview["person"]["ban"]>): string {
  const until = ban.until ? ` Opens again on ${dateTimeText(ban.until)}.` : " Blocked until you unblock it.";
  if (!ban.at && !ban.by && !ban.reason) return `This account is blocked.${until}`;
  let first = "Blocked";
  if (ban.at) first += ` on ${dateText(ban.at)}`;
  if (ban.by) first += ` by ${ban.by}`;
  const parts = ban.at || ban.by ? [`${first}.`] : [];
  if (ban.reason) parts.push(`Reason: ${ban.reason}`);
  return parts.join(" ") + until;
}

export function PersonHeader({ overview }: { overview: PersonOverview }) {
  const { person, plan, isSelf } = overview;
  const { whatsapp } = person;
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex flex-col sm:flex-row gap-4 min-w-0">
        <PersonAvatar name={person.name} email={person.email} src={person.profilePicture} size="xl" />
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground break-words">{person.name || person.email}</h1>
            <p className="text-sm text-muted-foreground break-all">{person.email}</p>
            {person.jobRole && <p className="text-sm text-muted-foreground break-words">{person.jobRole}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="whitespace-nowrap">{roleLabel(person.role)}</Badge>
            <StatusBadge status={person.status} />
            <PlanBadge plan={plan} />
          </div>
          <div className="text-sm text-foreground flex flex-wrap items-center gap-2">
            {whatsapp.verified && whatsapp.number ? (
              <>
                <span className="break-all">WhatsApp {whatsappText(whatsapp.number)}</span>
                <Badge variant="success">Verified</Badge>
              </>
            ) : whatsapp.skipped ? (
              <span className="text-muted-foreground">WhatsApp skipped at sign-up</span>
            ) : (
              <span className="text-muted-foreground">No WhatsApp number</span>
            )}
          </div>
          {isSelf && <p className="text-xs text-muted-foreground">This is your own account.</p>}
        </div>
      </div>

      {person.ban && (
        <Alert variant="destructive" className="border-destructive/40 px-4 py-3">
          <AlertTitle>Blocked</AlertTitle>
          <AlertDescription className="break-words">{banText(person.ban)}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
