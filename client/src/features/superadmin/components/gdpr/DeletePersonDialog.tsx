// Privacy requests page: deleting a person's data asks for their email to be typed, so a slip of the mouse on the
// wrong row can never delete someone (the server checks the same email again)
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import type { PrivacyPerson } from "./types";

interface Props {
  person: PrivacyPerson | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (person: PrivacyPerson, typedEmail: string) => void;
}

export function DeletePersonDialog({ person, busy, onCancel, onConfirm }: Props) {
  const [typed, setTyped] = useState("");
  // (a new person opened in the dialog starts with an empty box)
  useEffect(() => { setTyped(""); }, [person?._id]);

  const matches = !!person && typed.trim().toLowerCase() === person.email.trim().toLowerCase();

  return (
    <Dialog open={!!person} onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {person?.name || "this person"}&apos;s data?</DialogTitle>
          <DialogDescription>
            Their account, chats, files, projects and everything the AI remembers about them are removed. Payments and
            invoices stay for the records. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-2"
          onSubmit={(e) => { e.preventDefault(); if (person && matches && !busy) onConfirm(person, typed.trim()); }}
        >
          <label htmlFor="gdpr-confirm-email" className="text-sm text-foreground block">
            Type <span className="font-semibold break-all">{person?.email}</span> to confirm
          </label>
          <Input
            id="gdpr-confirm-email"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={person?.email}
            autoComplete="off"
            disabled={busy}
            className="focus-visible:ring-ring"
          />
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={busy}
            disabled={!matches || busy}
            onClick={() => person && onConfirm(person, typed.trim())}
            className="bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete for good
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
