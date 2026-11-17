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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/**
 * ==============================================================================
 * 🚨 AI AGENT WARNING: BREADCRUMB POLICY 🚨
 * ==============================================================================
 * NEVER hardcode "Super Admin Dashboard /" as a breadcrumb on any deep dive page.
 * Deep dive pages or sub-pages MUST accurately reflect the actual parent pages 
 * they were opened from (e.g., Organizations / [Name] / Configuration / ...).
 * DO NOT use generic dashboard text for breadcrumbs.
 * ==============================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */


// Privacy requests (superadmin.classgrid.in/superadmin/gdpr), rebuilt 2026-11-17. The old page listed "No users."
// with 42 users: it passed the list to DataTable as `data`, but DataTable reads `rows`. It now has its own list
// (GET /api/super-admin/gdpr/people, which also gives each person's plan), plain words for the two actions, a
// download that carries the sign-in (an <a href> to the API did not send the token), and a delete that asks for
// the person's email.
import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiClient } from "@/lib/apiClient";
import { getSocket } from "@/lib/socketClient";
import { PrivacyActionCards } from "../components/gdpr/PrivacyActionCards";
import { PeopleList } from "../components/gdpr/PeopleList";
import { DeletePersonDialog } from "../components/gdpr/DeletePersonDialog";
import type { PrivacyPeoplePage, PrivacyPerson } from "../components/gdpr/types";

const PAGE_SIZE = 25;

export function GdprPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<PrivacyPerson | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // The search waits for typing to pause, and starts again from the first page
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["gdpr-people", query, page],
    queryFn: () => apiClient.get<PrivacyPeoplePage>("/api/super-admin/gdpr/people", { params: { q: query, page, limit: PAGE_SIZE } }).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  // Another super admin deleted someone: the list follows
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["gdpr-people"] });
    socket.on("platform_gdpr_updated", refresh);
    return () => { socket.off("platform_gdpr_updated", refresh); };
  }, [queryClient]);

  const people = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // (deleting the last person on the last page leaves that page empty: go back to the last page that has people)
  useEffect(() => { if (data && page > pages) setPage(pages); }, [data, page, pages]);

  async function handleDownload(person: PrivacyPerson) {
    setDownloadingId(person._id);
    try {
      // Fetched through apiClient so the sign-in goes with it, then saved as a file
      const res = await apiClient.get(`/api/super-admin/gdpr/export/${person._id}`, { responseType: "blob", timeout: 120_000 });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `classgrid-data-${(person.email || person._id).replace(/[^a-z0-9._-]+/gi, "_")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success(`${person.name || person.email}'s data was downloaded.`);
    } catch {
      toast.error("The data couldn't be downloaded. Try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  const deleteMut = useMutation({
    // (removing chats, files and projects can take a while, so this waits longer than a normal request)
    mutationFn: ({ person, typedEmail }: { person: PrivacyPerson; typedEmail: string }) =>
      apiClient
        .post<{ success: boolean; message: string; failedParts?: string[] }>(`/api/super-admin/gdpr/erase/${person._id}`, { confirmEmail: typedEmail }, { timeout: 180_000 })
        .then((r) => r.data),
    onSuccess: (res, { person }) => {
      const who = person.name || person.email;
      if (res.failedParts?.length) toast.warning(`${who}'s data was deleted, but some parts failed: ${res.failedParts.join(", ")}.`);
      else toast.success(`${who}'s data was deleted.`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["gdpr-people"] });
    },
    onError: (e: any) => toast.error(e?.message || "The data couldn't be deleted."),
  });

  return (
    <div className="flex flex-col gap-5 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <PrivacyActionCards />

      <p className="text-xs text-muted-foreground">
        Download is GDPR Article 20 (data portability); delete is GDPR Article 17 (right to erasure). Every download and
        delete is written to the audit log.
      </p>

      <PeopleList
        people={people}
        total={total}
        page={page}
        pages={pages}
        isLoading={isLoading}
        isError={isError}
        search={search}
        onSearch={setSearch}
        onPage={setPage}
        onRetry={() => refetch()}
        downloadingId={downloadingId}
        onDownload={handleDownload}
        onDelete={setDeleteTarget}
      />

      <DeletePersonDialog
        person={deleteTarget}
        busy={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(person, typedEmail) => deleteMut.mutate({ person, typedEmail })}
      />
    </div>
  );
}
