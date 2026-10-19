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

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MessageSquare, Search, Bug, Lightbulb, Mail } from "lucide-react";
import { toast } from "sonner";


import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Button } from "@/components/marketing_ui/button";
import { Badge } from "@/components/marketing_ui/badge";
import { Input } from "@/components/marketing_ui/input";

import { feedbackApi, type PlatformFeedback } from "../services/superAdminApi";

export function FeedbackPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin-feedback"],
    queryFn: feedbackApi.getAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => feedbackApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Feedback status updated.");
      queryClient.invalidateQueries({ queryKey: ["superadmin-feedback"] });
    },
    onError: () => {
      toast.error("Failed to update feedback status.");
    },
  });

  const feedbacks = data?.data || [];
  const filteredFeedbacks = feedbacks.filter((f) =>
    f.message.toLowerCase().includes(search.toLowerCase()) ||
    f.user.name.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "bug":
        return <Bug className="size-4 text-destructive" />;
      case "feature_request":
        return <Lightbulb className="size-4 text-amber-500" />;
      default:
        return <MessageSquare className="size-4 text-muted-foreground" />;
    }
  };

  const columns: ColumnDef<PlatformFeedback>[] = [
    {
      header: "User",
      accessorKey: "user.name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.original.user.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.user.email}</span>
        </div>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: ({ getValue }) => {
        const val = getValue<string>();
        return (
        <div className="flex items-center gap-2">
          {getCategoryIcon(val)}
          <span className="capitalize">{val.replace("_", " ")}</span>
        </div>
        );
      },
    },
    {
      header: "Message",
      accessorKey: "message",
      cell: ({ getValue }) => {
        const val = getValue<string>();
        return (
        <p className="max-w-md truncate text-sm" title={val}>
          {val}
        </p>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ getValue }) => {
        const val = getValue<string>();
        return (
        <Badge variant={val === "new" ? "warning" : val === "reviewed" ? "success" : "neutral"}>
          {val}
        </Badge>
        );
      },
    },
    {
      header: "Actions",
      accessorKey: "_id",
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.status !== "reviewed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateMutation.mutate({ id: row.original._id, status: "reviewed" })}
            >
              Mark Reviewed
            </Button>
          )}
          {row.original.status !== "archived" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateMutation.mutate({ id: row.original._id, status: "archived" })}
            >
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div
        title="Platform Feedback"
        description="Review feature requests, bug reports, and general feedback from platform users."
      />

      <SectionPanel>
        <div className="mb-4 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search feedback..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Mail className="size-4" />
            Send Broadcast
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filteredFeedbacks}
          isLoading={isLoading}
          emptyMessage="No feedback submitted yet."
        />
      </SectionPanel>
    </div>
  );
}
