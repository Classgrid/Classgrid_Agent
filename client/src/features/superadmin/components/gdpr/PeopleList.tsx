// Privacy requests page: everyone with an account, searchable by name or email, each with Download and Delete.
// Rows, not a table, so the actions stay reachable at phone width.
import { Download, Search, ShieldCheck, Trash2, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/marketing_ui/avatar";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { formatDate } from "@/utils/dateUtils";
import { planName, type PrivacyPerson } from "./types";

interface Props {
  people: PrivacyPerson[];
  total: number;
  page: number;
  pages: number;
  isLoading: boolean;
  isError: boolean;
  search: string;
  onSearch: (value: string) => void;
  onPage: (page: number) => void;
  onRetry: () => void;
  downloadingId: string | null;
  onDownload: (person: PrivacyPerson) => void;
  onDelete: (person: PrivacyPerson) => void;
}

export function PeopleList({ people, total, page, pages, isLoading, isError, search, onSearch, onPage, onRetry, downloadingId, onDownload, onDelete }: Props) {
  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-5 min-w-0">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Users className="w-4 h-4 text-foreground" /></span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">People</h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `${total} ${total === 1 ? "person" : "people"}${search.trim() ? " found" : ""}. Find the person who asked, then pick what to do.`}
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search by name or email"
          className="pl-9 focus-visible:ring-ring"
        />
      </div>

      <div className="mt-4 divide-y divide-border border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3"><Skeleton className="h-10 w-full" /></div>
          ))
        ) : isError ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            The list couldn&apos;t be loaded.{" "}
            <button type="button" className="underline underline-offset-2 text-foreground" onClick={onRetry}>Try again</button>
          </div>
        ) : people.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {search.trim() ? "No one matches that name or email." : "No people yet."}
          </div>
        ) : (
          people.map((p) => (
            <div key={p._id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar size="lg">
                  {p.photo && <AvatarImage src={p.photo} alt="" />}
                  <AvatarFallback>{(p.name || p.email || "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{p.name || "(no name)"}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-foreground">{planName(p.plan)}</span>
                    {p.joinedAt && <span>Joined {formatDate(p.joinedAt)}</span>}
                    {p.erasedEarlier && <span>Erased the old way: chats and files may still be stored</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 sm:justify-end">
                <Button variant="outline" size="sm" isLoading={downloadingId === p._id} disabled={!!downloadingId} onClick={() => onDownload(p)} className="flex-1 sm:flex-none">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                </Button>
                {p.isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1.5 h-9 px-3 text-xs text-muted-foreground flex-1 sm:flex-none justify-center" title="Super admin accounts can't be deleted">
                    <ShieldCheck className="w-3.5 h-3.5" /> Protected
                  </span>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => onDelete(p)} className="flex-1 sm:flex-none text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 mt-4 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => onPage(page - 1)}>Previous</Button>
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages || isLoading} onClick={() => onPage(page + 1)}>Next</Button>
        </div>
      )}
    </section>
  );
}
