// How and when the person signs in: when they joined, the way they signed up, their last sign-in, the browsers
// saved at sign-in checks and the phone app. Sign-in keeps no sessions on the server, so there is no list of open
// sessions to show; the footer says so and points at "Log out everywhere".
import { UserRound } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { InfoList, InfoRow } from "./InfoRow";
import { dateText, dateTimeText, phonePlatformLabel, relativeText, signupLabel } from "./format";
import type { PersonOverview } from "./types";

export function AccountCard({ account, person, className }: { account: PersonOverview["account"]; person: PersonOverview["person"]; className?: string }) {
  const methods = [...new Set((account.signInMethods || []).map(signupLabel))];
  const usesOn = [
    account.usesOn?.website && "Website",
    account.usesOn?.desktop && "Desktop app",
    account.usesOn?.phone && "Phone app",
    account.usesOn?.whatsapp && "WhatsApp",
  ].filter(Boolean) as string[];
  const hasAge = person.age !== null && person.age !== undefined && String(person.age).trim() !== "";
  const addedEmails = person.addedEmails || [];
  const browsers = account.browsers || [];
  const phoneApps = account.phoneApps || [];

  return (
    <SectionCard icon={UserRound} title="Account" note="How and when they sign in." className={className}>
      <InfoList>
        <InfoRow label="Joined">{dateTimeText(account.joinedAt)}</InfoRow>
        <InfoRow label="Signed up with">{signupLabel(account.signupMethod)}</InfoRow>
        <InfoRow label="Last sign-in">
          {account.lastSignInAt
            ? `${dateTimeText(account.lastSignInAt)}${account.lastSignInMethod ? ` with ${signupLabel(account.lastSignInMethod)}` : ""}`
            : "Never"}
        </InfoRow>
        <InfoRow label="Last seen">{relativeText(account.lastSeenAt)}</InfoRow>
        <InfoRow label="Sign-in methods">{methods.length ? methods.join(", ") : "–"}</InfoRow>
        <InfoRow label="Email confirmed">{account.emailVerified ? "Yes" : "No"}</InfoRow>
        {addedEmails.length > 0 && (
          <InfoRow label="Other emails">
            <ul className="flex flex-col gap-1">
              {addedEmails.map((e) => (
                <li key={e.email} className="break-all">
                  {e.email}
                  <span className="text-muted-foreground">{e.verifiedAt ? " · confirmed" : " · not confirmed"}</span>
                </li>
              ))}
            </ul>
          </InfoRow>
        )}
        <InfoRow label="Uses Classgrid on">{usesOn.length ? usesOn.join(", ") : "Not yet"}</InfoRow>
        {hasAge && <InfoRow label="Age">{String(person.age)}</InfoRow>}
      </InfoList>

      {account.lockedUntil && (
        <p className="text-sm text-destructive mt-3">Locked after wrong passwords until {dateTimeText(account.lockedUntil)}</p>
      )}

      <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground">Browsers</h3>
          {browsers.length ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {browsers.map((b, i) => (
                <li key={`${b.browser}-${b.os}-${i}`} className="text-sm text-foreground break-words">
                  {`${b.browser || "Browser"} on ${b.os || "an unknown system"}`}
                  {b.addedAt && <span className="text-muted-foreground">{` · added ${dateText(b.addedAt)}`}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">None saved</p>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground">Phone app</h3>
          {phoneApps.length ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {phoneApps.map((p, i) => (
                <li key={`${p.platform}-${i}`} className="text-sm text-foreground break-words">
                  {`${phonePlatformLabel(p.platform)}${p.appVersion ? ` · app ${p.appVersion}` : ""}`}
                  {p.updatedAt && <span className="text-muted-foreground">{` · last seen ${dateText(p.updatedAt)}`}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Not installed</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Sign-ins aren&apos;t kept as sessions, so there&apos;s no list of open sessions. Use Log out everywhere to end them all.
      </p>
    </SectionCard>
  );
}
