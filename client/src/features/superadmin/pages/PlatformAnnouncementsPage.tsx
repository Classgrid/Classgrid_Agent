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
import { Megaphone, BellRing, Search, Plus } from "lucide-react";
import { toast } from "sonner";




import { Button } from "@/components/marketing_ui/button";
import { Badge } from "@/components/marketing_ui/badge";
import { Input } from "@/components/marketing_ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/marketing_ui/dialog";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";

import { announcementsApi, type Announcement } from "../services/superAdminApi";

export function PlatformAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("global");

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin-announcements"],
    queryFn: announcementsApi.list,
  });

  const broadcastMutation = useMutation({
    mutationFn: (payload: { title: string; body: string; target: string }) =>
      announcementsApi.broadcastGlobal(payload),
    onSuccess: (res) => {
      toast.success(res.message || `Broadcast sent successfully (${res.sent} devices).`);
      queryClient.invalidateQueries({ queryKey: ["superadmin-announcements"] });
      setIsModalOpen(false);
      setTitle("");
      setBody("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send broadcast.");
    },
  });

  const announcements = data?.notifications || [];
  const filteredAnnouncements = announcements.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnDef<Announcement>[] = [
    {
      header: "Title",
      accessorKey: "title",
      cell: ({ getValue }) => {
        const val = getValue<string>();
        return (
        <div className="flex items-center gap-2">
          <BellRing className="size-4 text-muted-foreground" />
          <span className="font-medium">{val}</span>
        </div>
        );
      },
    },
    {
      header: "Target Audience",
      accessorKey: "target",
      cell: ({ getValue }) => {
        const val = getValue<string>();
        return (
        <Badge variant="neutral" className="capitalize">
          {val.replace("_", " ")}
        </Badge>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ getValue }) => {
        const val = getValue<string>();
        return (
        <Badge variant={val === "sent" ? "success" : "warning"}>{val}</Badge>
        );
      },
    },
    {
      header: "Scheduled At",
      accessorKey: "scheduledAt",
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div
        title="Platform Announcements"
        description="Broadcast push notifications and system alerts to all users or specific roles."
      />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
            <Megaphone className="size-4" />
            New Broadcast
          </Button>
        </div>

        <div
          columns={columns}
          data={filteredAnnouncements}
          isLoading={isLoading}
          emptyMessage="No announcements found."
        />
      </div>

      {/* Broadcast Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Global Broadcast</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Notification Title</label>
              <Input
                placeholder="e.g., Scheduled Maintenance"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Message Body</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Enter the push notification message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Target Audience</label>
              <ResponsiveSelect
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="global">All Platform Users</option>
                <option value="all_students">All Students</option>
                <option value="all_faculty">All Faculty / Teachers</option>
                <option value="all_org_admins">All Organization Admins</option>
              </ResponsiveSelect>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => broadcastMutation.mutate({ title, body, target })}
              isLoading={broadcastMutation.isPending}
              disabled={!title || !body}
            >
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
