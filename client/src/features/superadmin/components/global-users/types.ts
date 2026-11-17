// The shapes the Users pages get from the server (GET /api/super-admin/users/list, /users/:id/overview and
// /users/:id/payments). They follow the build spec word for word, because the server side is written from the
// same spec by someone else at the same time: a field renamed here would silently show up empty on the page.

export type PlanId = "free" | "pro" | "max" | "enterprise";
export type PlanBilling = "none" | "granted" | "upi_autopay" | "manual_monthly" | "prepaid_yearly" | "org_seat" | "play";
export type PlanSource = "free" | "bought" | "gifted" | "phone_app" | "seat";
export type SignupMethod = "email" | "google" | "github" | "other";

// The plan a person is really on today (an ended or cancelled plan counts as Free), plus what is saved on the account
export interface PlanSummary {
  id: PlanId;
  name: string;
  savedId: string | null;
  ended: boolean;
  billing: PlanBilling;
  source: PlanSource;
  status: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  setBy: string | null;
  note: string | null;
  noLimits: boolean;
}

// One line of the people list
export interface PersonRow {
  _id: string;
  name: string;
  email: string;
  profilePicture: string | null;
  role: string;
  status: string;
  plan: PlanSummary;
  joinedAt: string;
  lastActiveAt: string | null;
  chats: number | null; // null = the count failed this time
  signupMethod: SignupMethod;
  whatsappVerified: boolean;
}

export interface PeopleResponse {
  success: boolean;
  data: PersonRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  unfinishedSignups: number;
}

// What the list can be filtered and sorted by (each one is also kept in the page address)
export type PlanFilter = "all" | "free" | "pro" | "max" | "enterprise" | "none";
export type StatusFilter = "all" | "active" | "banned" | "erased";
export type MethodFilter = "all" | "email" | "google" | "github";
export type SignupFilter = "finished" | "unfinished" | "all";
export type SortKey = "joined" | "last_active";
export type SortDir = "desc" | "asc";

export interface PeopleParams {
  q: string;
  plan: PlanFilter;
  status: StatusFilter;
  method: MethodFilter;
  signup: SignupFilter;
  sort: SortKey;
  dir: SortDir;
  page: number;
}

// One payment: a plan bought for a month or a year, or a credit top-up
export interface PaymentRow {
  _id: string;
  kind: "plan" | "topup";
  planId: string | null;
  planName: string | null;
  term: "month" | "year" | null;
  periodStart: string | null;
  periodEnd: string | null;
  amountInr: number;
  credits: number;
  status: string; // "success" | "failed" | "pending", or anything else the payment record holds
  paymentId: string;
  method: string;
  paidAt: string;
}

export interface PlanHistoryItem {
  at: string;
  action: "gift" | "end";
  plan: string;
  planName: string;
  expiresAt: string | null;
  reason: string;
  by: string;
}

export type AdminAction = "ban" | "unban" | "force_logout" | "reset_password" | "role_change" | "plan_gift" | "plan_end";

export interface AdminLogItem {
  at: string;
  action: AdminAction;
  by: string;
  detail: string | null;
}

export interface StudentPrice {
  verified: boolean;
  method: "email" | "admin" | "review" | null;
  verifiedAt: string | null;
  expiresAt: string | null;
}

// Everything the person page shows, in one answer from the server
export interface PersonOverview {
  isSelf: boolean;
  person: {
    _id: string;
    name: string;
    email: string;
    username: string | null;
    profilePicture: string | null;
    role: string;
    status: string;
    jobRole: string | null;
    age: number | string | null;
    whatsapp: { number: string | null; verified: boolean; skipped: boolean };
    addedEmails: { email: string; verifiedAt: string | null; addedAt: string | null }[];
    // (until: when the block ends by itself; null = until it is unblocked)
    ban: { at: string | null; reason: string | null; by: string | null; until?: string | null } | null;
  };
  plan: PlanSummary & { student: StudentPrice; history: PlanHistoryItem[] };
  account: {
    joinedAt: string;
    lastSignInAt: string | null;
    lastSignInMethod: "google" | "github" | "email" | null;
    lastSeenAt: string | null;
    lastActiveAt: string | null;
    signupMethod: SignupMethod;
    signInMethods: string[];
    emailVerified: boolean;
    lockedUntil: string | null;
    browsers: { browser: string; os: string; addedAt: string | null }[];
    phoneApps: { platform: string; appVersion: string; updatedAt: string | null }[];
    usesOn: { website: boolean; desktop: boolean; phone: boolean; whatsapp: boolean };
    // The devices signed in now, as in their Settings > Devices (null = couldn't be read; max null = no limit)
    devices?: { used: number; max: number | null; items: { id: string; kind: string; name: string; signedInAt: string | null; lastUsedAt: string | null }[] } | null;
  };
  activity: {
    chats: number | null;
    lastChatAt: string | null;
    projects: number | null;
    liveDocs: number | null;
    pages: number | null;
    calls: number | null;
    lastAiUseAt: string | null;
    firstAiUseAt?: string | null;
    activeDays?: number | null;
    aiAnswers?: number | null;
    scheduledTasks?: number | null;
    libraryFiles?: number | null;
  };
  // How many plans they bought, and how often an admin gave them a plan or moved them back to Free (null = couldn't count)
  planCounts?: { bought: number | null; gifted: number | null; movedToFree: number | null };
  // The skills they saved for their AI (null = couldn't be read)
  skills?: { _id: string; name: string; instructions: string; active: boolean; isDefault: boolean; createdAt: string | null; updatedAt: string | null }[] | null;
  payments: { items: PaymentRow[]; count: number; totalPaidInr: number };
  adminLog: AdminLogItem[];
}

export interface PaymentsResponse {
  success: boolean;
  data: PaymentRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  totalPaidInr: number;
}

// The things the Actions card can do to an account
export type PersonActionInput =
  | { type: "ban"; reason: string; days?: number; until?: string }
  | { type: "unban" }
  | { type: "force_logout" }
  | { type: "reset_password" }
  | { type: "role"; role: string };
