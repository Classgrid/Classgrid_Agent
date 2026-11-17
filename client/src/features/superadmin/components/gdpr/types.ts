// Privacy requests page (super admin): one person as GET /api/super-admin/gdpr/people returns them
export interface PrivacyPerson {
  _id: string;
  name: string;
  email: string;
  photo: string | null;
  plan: string;
  joinedAt: string | null;
  isSuperAdmin: boolean;
  // Erased by the old erase (before 2026-11-17): only renamed, so chats and files may still be stored
  erasedEarlier: boolean;
}

export interface PrivacyPeoplePage {
  success: boolean;
  data: PrivacyPerson[];
  total: number;
  page: number;
  limit: number;
}

const PLAN_NAMES: Record<string, string> = { free: "Free", pro: "Pro", max: "Max", enterprise: "Enterprise" };
export const planName = (id: string) => PLAN_NAMES[id] || id || "Free";
