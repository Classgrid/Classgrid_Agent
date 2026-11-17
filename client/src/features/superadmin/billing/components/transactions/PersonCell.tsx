// Who paid: avatar, name and email. The name links to the person's profile while the account exists; a deleted
// account can't be opened, so it is plain text with a note on hover.
import React from "react";
import { Link } from "react-router-dom";
import { PersonAvatar } from "./PersonAvatar";
import type { Person } from "./paymentsApi";

export function PersonCell({ person, size = 32 }: { person: Person; size?: number }) {
  const name = person.name ? (
    <span className="font-medium text-foreground truncate">{person.name}</span>
  ) : (
    <span className="font-medium text-muted-foreground truncate">No name</span>
  );

  return (
    <div className="flex items-center gap-3 min-w-0">
      <PersonAvatar name={person.name} email={person.email} photoUrl={person.photoUrl} size={size} />
      <div className="min-w-0 flex flex-col">
        {person.linked && person.userId ? (
          <Link
            to={`/superadmin/global-users/${person.userId}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate hover:underline"
          >
            {name}
          </Link>
        ) : (
          <span className="truncate" title="This account no longer exists">
            {name}
          </span>
        )}
        <span className="text-xs text-muted-foreground truncate">{person.email || "No email"}</span>
      </div>
    </div>
  );
}
