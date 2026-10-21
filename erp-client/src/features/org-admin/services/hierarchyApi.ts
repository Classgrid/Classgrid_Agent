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

import { apiClient } from "@/lib/apiClient";

export interface AcademicNode {
  _id: string;
  name: string;
  code?: string;
  level_type: string;
  parent_id?: string | null;
  sort_order: number;
  is_active: boolean;
  children?: AcademicNode[];
}

export interface HierarchyTerminology {
  structure_type: string;
  org_type: string;
  terminology: {
    hierarchy: string[];
    [key: string]: any;
  };
}

export const hierarchyApi = {
  // Get full nested tree
  getTree: () =>
    apiClient
      .get<{ tree: AcademicNode[]; terminology: HierarchyTerminology["terminology"] }>(
        "/api/hierarchy/tree"
      )
      .then((res) => res.data),

  // Get flat list of nodes
  getFlatTree: () =>
    apiClient
      .get<{ nodes: AcademicNode[]; terminology: HierarchyTerminology["terminology"] }>(
        "/api/hierarchy/tree?flat=true"
      )
      .then((res) => res.data),

  // Get terminology
  getTerminology: () =>
    apiClient
      .get<HierarchyTerminology>("/api/hierarchy/terminology")
      .then((res) => res.data),

  // Seed default hierarchy
  seedHierarchy: () =>
    apiClient
      .post<{ message: string; total_nodes: number }>("/api/hierarchy/seed")
      .then((res) => res.data),

  // Create a single node
  createNode: (data: {
    level_type: string;
    name: string;
    code?: string;
    parent_id?: string | null;
    sort_order?: number;
  }) => apiClient.post("/api/hierarchy/node", data).then((res) => res.data),

  // Update a node
  updateNode: (
    nodeId: string,
    data: { name?: string; code?: string; sort_order?: number; is_active?: boolean }
  ) => apiClient.patch(`/api/hierarchy/node/${nodeId}`, data).then((res) => res.data),

  // Delete a node
  deleteNode: (nodeId: string) =>
    apiClient.delete(`/api/hierarchy/node/${nodeId}`).then((res) => res.data),
};
