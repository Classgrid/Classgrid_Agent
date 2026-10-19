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
// Skeleton placeholder for now, you can style this based on the platform's skeleton
export default function LoginLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="h-7 w-36 rounded-md bg-card animate-pulse" />
      </div>

      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-[460px] rounded-2xl border border-border bg-card p-8 shadow-[0_30px_100px_rgba(0,0,0,0.32)] sm:p-10">
          <div className="mb-3 h-4 w-36 rounded-full bg-secondary/70 animate-pulse" />
          <div className="mb-3 h-10 w-64 rounded-lg bg-secondary/70 animate-pulse" />
          <div className="mb-8 h-5 w-80 rounded-lg bg-secondary/50 animate-pulse" />

          <div className="space-y-3">
            <div className="h-12 w-full rounded-xl bg-secondary/60 animate-pulse" />
            <div className="h-12 w-full rounded-xl bg-secondary/60 animate-pulse" />
            <div className="h-12 w-full rounded-xl bg-secondary/60 animate-pulse" />
          </div>

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-border animate-pulse" />
            <div className="h-3 w-8 rounded bg-secondary/60 animate-pulse" />
            <div className="h-px flex-1 bg-border animate-pulse" />
          </div>

          <div className="mb-2 h-4 w-10 rounded bg-secondary/60 animate-pulse" />
          <div className="mb-6 h-12 w-full rounded-xl bg-secondary/60 animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-primary/40 animate-pulse" />
        </div>
      </div>
    </main>
  );
}
