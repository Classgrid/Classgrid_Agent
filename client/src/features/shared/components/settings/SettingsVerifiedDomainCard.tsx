import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Check, Copy, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Spinner } from "@/components/marketing_ui/spinner";
import { apiClient } from "@/lib/apiClient";

type DomainState = {
  domain: string | null;
  verified: boolean;
  verifiedAt?: string | null;
  dns?: { type: string; host: string; hostShort: string; value: string } | null;
};

const KEY = ["user-verified-domain"];

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 min-w-0">
        <code className="flex-1 min-w-0 break-all font-mono text-[13px] text-foreground">{value}</code>
        <button
          type="button"
          onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
          title="Copy"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/** Settings → Verify your domain: one domain per user, proved with a DNS TXT record. Nothing is hosted on it. */
export function SettingsVerifiedDomainCard() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const { data, isLoading } = useQuery<DomainState>({
    queryKey: KEY,
    queryFn: async () => (await apiClient.get<DomainState>("/api/user/domain")).data,
  });

  const setState = (state: DomainState) => queryClient.setQueryData(KEY, state);
  // apiClient rejects with { message, code } (the server's message)
  const errorText = (err: any, fallback: string) => err?.message || err?.response?.data?.message || fallback;

  const add = useMutation({
    mutationFn: async () => (await apiClient.post<DomainState>("/api/user/domain", { domain: input })).data,
    onSuccess: (state) => { setState(state); setInput(""); },
    onError: (err) => toast.error(errorText(err, "Could not add the domain.")),
  });
  const verify = useMutation({
    mutationFn: async () => (await apiClient.post<DomainState>("/api/user/domain/verify")).data,
    onSuccess: (state) => { setState(state); toast.success(`${state.domain} is verified.`); },
    onError: (err) => toast.error(errorText(err, "Could not verify the domain.")),
  });
  const remove = useMutation({
    mutationFn: async () => (await apiClient.delete<DomainState>("/api/user/domain")).data,
    onSuccess: (state) => { setState(state); toast.success("Domain removed."); },
    onError: (err) => toast.error(errorText(err, "Could not remove the domain.")),
  });

  const busy = add.isPending || verify.isPending || remove.isPending;

  return (
    <div className="border border-border rounded-xl overflow-hidden mt-2 shadow-sm">
      <div className="p-6 bg-card flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            Verify your domain
          </h3>
          <p className="text-sm text-muted-foreground">
            Prove you own a domain by adding one DNS record. You can verify one domain. This only verifies ownership; nothing is hosted on your domain.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="size-4" />Loading…</div>
        ) : !data?.domain ? (
          <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={(e) => { e.preventDefault(); if (input.trim()) add.mutate(); }}
          >
            <Input
              placeholder="example.com"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="sm:flex-1"
              aria-label="Domain"
            />
            <Button type="submit" variant="secondary" disabled={!input.trim() || busy}>
              {add.isPending && <Spinner className="size-4 mr-2" />}
              Add domain
            </Button>
          </form>
        ) : data.verified ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 min-w-0">
            <BadgeCheck className="h-5 w-5 shrink-0 text-foreground" />
            <span className="font-medium text-foreground break-all">{data.domain}</span>
            <span className="ml-auto shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Verified</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground">
              Add this <span className="font-semibold">TXT</span> record where you manage DNS for <span className="font-semibold break-all">{data.domain}</span> (GoDaddy, Cloudflare, Namecheap, Hostinger…), then press <span className="font-semibold">Verify</span>.
            </p>
            {data.dns && (
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <CopyRow label="Type" value={data.dns.type} />
                <CopyRow label="Name / Host" value={data.dns.hostShort} />
                <div className="sm:col-span-2"><CopyRow label="Value" value={data.dns.value} /></div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Some DNS providers want the full name: <span className="font-mono break-all">{data.dns?.host}</span>. DNS changes can take a few minutes to show up.
            </p>
          </div>
        )}
      </div>

      {data?.domain && (
        <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={() => remove.mutate()}>
            {remove.isPending && <Spinner className="size-4 mr-2" />}
            Remove
          </Button>
          {!data.verified && (
            <Button variant="secondary" disabled={busy} onClick={() => verify.mutate()}>
              {verify.isPending && <Spinner className="size-4 mr-2" />}
              Verify
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
