// A page the AI published, on its own address (chat.classgrid.in/p/<id>). The page itself is SharePageView.tsx,
// which Studio's right pane shows too.
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { SharePageView } from "./SharePageView";

export function SharePagePage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading } = useCurrentUser();

  // Signed out: log in, then come back here (with the address as it was: "?share=requests" of a request email stays)
  useEffect(() => {
    if (!isLoading && !user) navigate(`/login?next=${encodeURIComponent(`/p/${id}${window.location.search}`)}`, { replace: true });
  }, [isLoading, user, id, navigate]);

  if (isLoading || !user) {
    return (
      <div className="flex h-dvh w-full flex-col bg-background" aria-busy="true">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border/50 px-3">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-6">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }
  return <SharePageView key={id} id={id} />;
}

export default SharePagePage;
