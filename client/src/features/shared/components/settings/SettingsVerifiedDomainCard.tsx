import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Check, CheckCircle2, Copy, Globe, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Spinner } from "@/components/marketing_ui/spinner";
import { StatusButton, VerifiedButton } from "@/components/marketing_ui/status-button";
import { apiClient } from "@/lib/apiClient";

type DomainState = {
  domain: string | null;
  verified: boolean;
  verifiedAt?: string | null;
  dns?: { type: string; host: string; hostShort: string; value: string } | null;
  /** The TXT record that proved ownership (shown with a green tick once verified) */
  record?: { type: string; host: string; hostShort: string; value: string } | null;
};

const KEY = ["user-verified-domain"];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function DnsRecordTable({ name, value, found }: { name: string; value: string; found: boolean }) {
  return (
    <div className="rounded-xl border border-border/50 overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-muted/30 border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Name (Host)</th>
            <th className="px-4 py-3 font-medium">Value</th>
            <th className="px-4 py-3 font-medium">TTL</th>
            <th className="px-4 py-3 font-medium text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-4 font-medium text-foreground">TXT</td>
            <td className="px-4 py-4">
              <div className="flex items-center gap-2">
                <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs">{name}</code>
                <CopyButton value={name} />
              </div>
            </td>
            <td className="px-4 py-4">
              <div className="flex items-center gap-2 max-w-[300px]">
                <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs break-all">{value}</code>
                <CopyButton value={value} />
              </div>
            </td>
            <td className="px-4 py-4"><span className="text-sm text-foreground whitespace-nowrap">1 Hour</span></td>
            <td className="px-4 py-4 text-center">
              {found
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" aria-label="Record found" />
                : <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" aria-label="Not found yet" />}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Settings → Verify your domain: one domain per user, proved with a DNS TXT record. Nothing is hosted on it. */
export function SettingsVerifiedDomainCard() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [conflict, setConflict] = useState(false);

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
    onSuccess: (state) => { setState(state); setConflict(false); toast.success(`${state.domain} is verified.`); },
    onError: (err: any) => {
      if (String(err?.code) === "409") setConflict(true);
      toast.error(errorText(err, "Could not verify the domain."));
    },
  });
  const remove = useMutation({
    mutationFn: async () => (await apiClient.delete<DomainState>("/api/user/domain")).data,
    onSuccess: (state) => { setState(state); setConflict(false); toast.success("Domain removed."); },
    onError: (err) => toast.error(errorText(err, "Could not remove the domain.")),
  });

  const busy = add.isPending || verify.isPending || remove.isPending;

  return (
    <div className="border border-border rounded-xl overflow-hidden mt-2 shadow-sm">
      <div className="p-6 bg-card flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <h3 className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              Verify your domain
            </h3>
            <p className="text-sm text-muted-foreground">
              Prove you own a domain by adding one DNS record. You can verify one domain.
            </p>
          </div>
          {data?.domain && (
            <div className="shrink-0">
              {data.verified ? (
                <VerifiedButton size="sm" />
              ) : conflict ? (
                <StatusButton variant="warning" size="sm" text="DNS conflict" />
              ) : (
                <StatusButton variant="default" size="sm" text="Pending Verification" />
              )}
            </div>
          )}
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 min-w-0">
              <BadgeCheck className="h-5 w-5 shrink-0 text-foreground" />
              <span className="font-medium text-foreground break-all">{data.domain}</span>
            </div>
            {data.record && <DnsRecordTable name={data.record.hostShort} value={data.record.value} found />}
            {data.verifiedAt && (
              <span className="text-xs text-muted-foreground">Verified at: {new Date(data.verifiedAt).toLocaleString()}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground">
              Add this <span className="font-semibold">TXT</span> record where you manage DNS for <span className="font-semibold break-all">{data.domain}</span> (GoDaddy, Cloudflare, Namecheap, Hostinger…), then press <span className="font-semibold">Verify</span>.
            </p>
            {data.dns && <DnsRecordTable name={data.dns.hostShort} value={data.dns.value} found={false} />}
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
