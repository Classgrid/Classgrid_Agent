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
const fs = require("fs");
const path = require("path");

const root = "C:\\Users\\nikhi\\OneDrive\\Documents\\classgrid_marketting";

function abs(rel) {
  return path.join(root, rel);
}

function read(rel) {
  return fs.readFileSync(abs(rel), "utf8").replace(/\r\n/g, "\n");
}

function write(rel, content) {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), content, "utf8");
}

function replaceOnce(rel, from, to) {
  const content = read(rel);
  if (!content.includes(from)) {
    if (content.includes(to)) return;
    throw new Error(`Could not find expected snippet in ${rel}`);
  }
  write(rel, content.replace(from, to));
}

function writeCircularTimelineSchema() {
  write(
    "sanity/schemaTypes/circularTimelineType.ts",
    `import { defineField, defineType } from 'sanity'

const themeOptions = [
  { title: 'Emerald', value: 'emerald' },
  { title: 'Blue', value: 'blue' },
  { title: 'Fuchsia', value: 'fuchsia' },
  { title: 'Amber', value: 'amber' },
]

export const circularTimelineRingType = defineType({
  name: 'circularTimelineRing',
  title: 'Circular Timeline Ring',
  type: 'object',
  fields: [
    defineField({
      name: 'nodes',
      title: 'Role Nodes',
      description:
        'Keep this compact for the orbital UI: 2 nodes for the inner ring, and no more than 3 nodes for middle/outer rings.',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (Rule) => Rule.min(1).max(3),
    }),
  ],
  preview: {
    select: { nodes: 'nodes' },
    prepare({ nodes }) {
      return {
        title: Array.isArray(nodes) && nodes.length > 0 ? nodes.join(' / ') : 'Timeline ring',
      }
    },
  },
})

export const circularTimelineTabType = defineType({
  name: 'circularTimelineTab',
  title: 'Circular Timeline Tab',
  type: 'object',
  fields: [
    defineField({
      name: 'id',
      title: 'ID',
      description: 'Stable ID used by the frontend, for example school, college, engineering, coaching.',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Tab Label',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'features',
      title: 'Optional Feature Lines',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'rings',
      title: 'Rings',
      description:
        'Use exactly 3 rings: inner core users, middle operational users, and outer leadership/admins.',
      type: 'array',
      of: [{ type: 'circularTimelineRing' }],
      validation: (Rule) => Rule.required().length(3),
    }),
  ],
  preview: {
    select: { title: 'heading', subtitle: 'label' },
  },
})

export const circularTimelineRoleType = defineType({
  name: 'circularTimelineRole',
  title: 'Circular Timeline Role Popup',
  type: 'object',
  fields: [
    defineField({
      name: 'roleKey',
      title: 'Role Name / Node Label',
      description:
        'This must exactly match a role node in the rings, for example Operations Admins or Department Heads.',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Popup Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'badge',
      title: 'Badge',
      type: 'string',
      initialValue: 'System Connected',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'desc',
      title: 'Description',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tooltip',
      title: 'Hover Tooltip',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'features',
      title: 'Left Card Features',
      description: 'Three short bullets work best in the popup.',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (Rule) => Rule.max(3),
    }),
    defineField({
      name: 'stats',
      title: 'Right Card Benefits',
      description: 'Three short benefit lines work best in the popup.',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (Rule) => Rule.max(3),
    }),
    defineField({
      name: 'metric',
      title: 'Bottom Highlight Metric',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'theme',
      title: 'Theme',
      type: 'string',
      options: { list: themeOptions, layout: 'radio' },
      initialValue: 'emerald',
    }),
  ],
  preview: {
    select: { title: 'roleKey', subtitle: 'title' },
  },
})

export const circularTimelineType = defineType({
  name: 'circularTimeline',
  title: 'Circular Timeline',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Internal Title',
      type: 'string',
      initialValue: 'Circular Timeline',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Internal Notes',
      type: 'text',
      rows: 2,
      description: 'Editor notes only. The homepage section heading still comes from Home Page copy.',
    }),
    defineField({
      name: 'tabs',
      title: 'Organization Tabs and Rings',
      type: 'array',
      of: [{ type: 'circularTimelineTab' }],
      validation: (Rule) => Rule.required().min(1).max(4),
    }),
    defineField({
      name: 'roles',
      title: 'Role Popup Content',
      description:
        'Add one popup entry for every node label used in the rings. You can edit, delete, replace, or add roles here.',
      type: 'array',
      of: [{ type: 'circularTimelineRole' }],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'subtitle' },
  },
})
`
  );
}

function updateSchemaIndex() {
  let content = read("sanity/schemaTypes/index.ts");
  if (!content.includes("circularTimelineType")) {
    content = content.replace(
      "import { appEcosystemType } from './appEcosystemType'\n",
      "import { appEcosystemType } from './appEcosystemType'\nimport {\n  circularTimelineRingType,\n  circularTimelineRoleType,\n  circularTimelineTabType,\n  circularTimelineType,\n} from './circularTimelineType'\n"
    );
    content = content.replace(
      "    homeTimelineRingType,\n    homeTimelineTabType,\n",
      "    homeTimelineRingType,\n    homeTimelineTabType,\n    circularTimelineRingType,\n    circularTimelineTabType,\n    circularTimelineRoleType,\n    circularTimelineType,\n"
    );
    write("sanity/schemaTypes/index.ts", content);
  }
}

function updateDeskStructure() {
  let content = read("sanity/deskStructure.ts");
  if (!content.includes('"circularTimeline"')) {
    content = content.replace(
      'const singletonTypes = new Set(["homePage", "homeStats", "aboutPage", "compareHubPage", "changelogSettings", "turboClassgrid", "isometricStack", "appEcosystem"]);',
      'const singletonTypes = new Set(["homePage", "circularTimeline", "homeStats", "aboutPage", "compareHubPage", "changelogSettings", "turboClassgrid", "isometricStack", "appEcosystem"]);'
    );
  }
  if (!content.includes("circularTimelineSingleton")) {
    content = content.replace(
      `      S.listItem()
        .title("Home Page")
        .id("homePageSingleton")
        .child(S.document().schemaType("homePage").documentId("homePage")),
`,
      `      S.listItem()
        .title("Home Page")
        .id("homePageSingleton")
        .child(S.document().schemaType("homePage").documentId("homePage")),

      S.listItem()
        .title("Circular Timeline")
        .id("circularTimelineSingleton")
        .child(S.document().schemaType("circularTimeline").documentId("circularTimeline")),
`
    );
  }
  write("sanity/deskStructure.ts", content);
}

function updateQueries() {
  let content = read("sanity/lib/queries.ts");
  if (!content.includes("export const circularTimelineQuery")) {
    const query = `export const circularTimelineQuery = \`*[_type == "circularTimeline" && _id == "circularTimeline"][0]{
  _id,
  title,
  subtitle,
  tabs[]{
    id,
    label,
    heading,
    description,
    features,
    rings[]{
      nodes
    }
  },
  roles[]{
    roleKey,
    title,
    badge,
    desc,
    tooltip,
    features,
    stats,
    metric,
    theme
  }
}\`;

`;
    content = content.replace("export const pricingPageQuery", query + "export const pricingPageQuery");
    write("sanity/lib/queries.ts", content);
  }
}

function updateMarketingLib() {
  let content = read("sanity/lib/marketing.ts");
  if (!content.includes("circularTimelineQuery")) {
    content = content.replace(
      "  classgridTalkQuery,\n",
      "  classgridTalkQuery,\n  circularTimelineQuery,\n"
    );
  }
  if (!content.includes("getCircularTimeline")) {
    content = content.replace(
      "export const getHomePage = () => safeFetch(homePageQuery, undefined, { disableInMemoryCache: true })\n",
      "export const getHomePage = () => safeFetch(homePageQuery, undefined, { disableInMemoryCache: true })\nexport const getCircularTimeline = () => safeFetch(circularTimelineQuery, undefined, { disableInMemoryCache: true })\n"
    );
  }
  write("sanity/lib/marketing.ts", content);
}

function updatePage() {
  let content = read("app/page.tsx");
  if (!content.includes("getCircularTimeline")) {
    content = content.replace("  getHomePage,\n", "  getHomePage,\n  getCircularTimeline,\n");
  }
  if (!content.includes("type TimelineRoleData")) {
    content = content.replace(
      `type TimelineTab = {
  id: string;
  label: string;
  heading?: string;
  description?: string;
  features?: string[];
  rings: string[][];
};

`,
      `type TimelineTab = {
  id: string;
  label: string;
  heading?: string;
  description?: string;
  features?: string[];
  rings: string[][];
};

type TimelineRoleData = {
  title: string;
  badge: string;
  desc: string;
  tooltip: string;
  features: string[];
  stats: string[];
  metric: string;
  theme?: string;
};

type TimelineRoleDataMap = Record<string, TimelineRoleData>;

`
    );
  }
  if (!content.includes("function normalizeTimelineRoleDataMap")) {
    content = content.replace(
      `type LocalizedPageProps = {
  lang: string;
};
`,
      `function normalizeTimelineRoleDataMap(value: unknown, lang: string): TimelineRoleDataMap {
  if (!Array.isArray(value)) {
    return {};
  }

  return value.reduce<TimelineRoleDataMap>((acc, role: any) => {
    const rawKey = getLocalized(role?.roleKey ?? role?.label ?? role?.name, lang, "");
    if (!hasNonEmptyString(rawKey)) {
      return acc;
    }

    const roleKey = rawKey.trim();
    const features = Array.isArray(role?.features)
      ? role.features
          .map((feature: any) => getLocalized(feature, lang, ""))
          .filter(hasNonEmptyString)
          .map((feature: string) => feature.trim())
      : [];
    const stats = Array.isArray(role?.stats)
      ? role.stats
          .map((stat: any) => getLocalized(stat, lang, ""))
          .filter(hasNonEmptyString)
          .map((stat: string) => stat.trim())
      : [];

    acc[roleKey] = {
      title: withFallbackString(getLocalized(role?.title, lang, ""), roleKey + " Workspace"),
      badge: withFallbackString(getLocalized(role?.badge, lang, ""), "System Connected"),
      desc: withFallbackString(getLocalized(role?.desc ?? role?.description, lang, ""), "Role-based Classgrid workspace."),
      tooltip: withFallbackString(getLocalized(role?.tooltip, lang, ""), roleKey),
      features,
      stats,
      metric: withFallbackString(getLocalized(role?.metric, lang, ""), "Result: connected operations"),
      theme: hasNonEmptyString(role?.theme) ? role.theme.trim() : "emerald",
    };

    return acc;
  }, {});
}

type LocalizedPageProps = {
  lang: string;
};
`
    );
  }
  if (!content.includes("cmsCircularTimeline")) {
    content = content.replace("    cms,\n    cmsTestimonials,\n", "    cms,\n    cmsCircularTimeline,\n    cmsTestimonials,\n");
    content = content.replace("    getHomePage(),\n    getClassgridTalks(),\n", "    getHomePage(),\n    getCircularTimeline(),\n    getClassgridTalks(),\n");
    content = content.replace(
      "  const cmsHome = (cms as any) ?? {};\n  const home = resolveHomePageContent(cmsHome) as any;\n",
      "  const cmsHome = (cms as any) ?? {};\n  const circularTimeline = (cmsCircularTimeline as any) ?? {};\n  const home = resolveHomePageContent(cmsHome) as any;\n"
    );
  }
  if (!content.includes("const circularTimelineTabs")) {
    content = content.replace(
      `  const timelineTabs: TimelineTab[] = withFallbackItems(
    normalizeTimelineTabs(home?.timelineTabs, lang),
    normalizeTimelineTabs(placeholderHomePage.timelineTabs, lang)
  );
  const defaultTimelineTab = timelineTabs[0]?.id ?? "";
`,
      `  const circularTimelineTabs = normalizeTimelineTabs(circularTimeline?.tabs, lang);
  const homeTimelineTabs = normalizeTimelineTabs(home?.timelineTabs, lang);
  const fallbackTimelineTabs = normalizeTimelineTabs(placeholderHomePage.timelineTabs, lang);
  const timelineTabs: TimelineTab[] = withFallbackItems(
    circularTimelineTabs,
    withFallbackItems(homeTimelineTabs, fallbackTimelineTabs)
  );
  const timelineRoleDataMap = normalizeTimelineRoleDataMap(circularTimeline?.roles, lang);
  const defaultTimelineTab = timelineTabs[0]?.id ?? "";
`
    );
  }
  if (!content.includes("roleDataMap={timelineRoleDataMap}")) {
    content = content.replace(
      `            tabs={timelineTabs}
            defaultTab={defaultTimelineTab}
`,
      `            tabs={timelineTabs}
            defaultTab={defaultTimelineTab}
            roleDataMap={timelineRoleDataMap}
`
    );
  }
  write("app/page.tsx", content);
}

function updateTimelineSection() {
  let content = read("components/sections/TimelineSection.tsx");
  if (!content.includes("RoleDataMap")) {
    content = content.replace(
      'import { cn } from "@/lib/utils";\n',
      'import { cn } from "@/lib/utils";\nimport type { RoleDataMap } from "@/components/ui/radial-orbital-timeline";\n'
    );
    content = content.replace(
      `  tabs: TimelineTab[];
  defaultTab: string;
};

export function TimelineSection({ title, subtitle, tabs, defaultTab }: TimelineSectionProps) {
`,
      `  tabs: TimelineTab[];
  defaultTab: string;
  roleDataMap?: RoleDataMap;
};

export function TimelineSection({ title, subtitle, tabs, defaultTab, roleDataMap }: TimelineSectionProps) {
`
    );
    content = content.replace(
      `          rings={activeTabData.rings}
          activeTab={activeTabData.id}
`,
      `          rings={activeTabData.rings}
          activeTab={activeTabData.id}
          roleDataMap={roleDataMap}
`
    );
    write("components/sections/TimelineSection.tsx", content);
  }
}

function updateTimelineWrapper() {
  let content = read("components/ui/radial-orbital-timeline-wrapper.tsx");
  if (!content.includes("RoleDataMap")) {
    content = content.replace(
      'import { useEffect, useState } from "react";\n',
      'import { useEffect, useState } from "react";\nimport type { RoleDataMap } from "./radial-orbital-timeline";\n'
    );
    content = content.replace(
      `const RadialOrbitalTimeline = dynamic(() => import("./radial-orbital-timeline"), { ssr: false });

export default function RadialOrbitalTimelineWrapper({ rings, activeTab }: { rings: string[][], activeTab: string }) {
`,
      `const RadialOrbitalTimeline = dynamic(() => import("./radial-orbital-timeline"), { ssr: false });

type RadialOrbitalTimelineWrapperProps = {
  rings: string[][];
  activeTab: string;
  roleDataMap?: RoleDataMap;
};

export default function RadialOrbitalTimelineWrapper({ rings, activeTab, roleDataMap }: RadialOrbitalTimelineWrapperProps) {
`
    );
    content = content.replace(
      `  return <RadialOrbitalTimeline rings={rings} activeTab={activeTab} />;
`,
      `  return <RadialOrbitalTimeline rings={rings} activeTab={activeTab} roleDataMap={roleDataMap} />;
`
    );
    write("components/ui/radial-orbital-timeline-wrapper.tsx", content);
  }
}

function updateRadialTimeline() {
  let content = read("components/ui/radial-orbital-timeline.tsx");
  if (!content.includes("export interface RoleData")) {
    content = content.replace("interface RoleData {", "export interface RoleData {");
    content = content.replace(
      `  theme: string;
}

const role =`,
      `  theme?: string;
}

export type RoleDataMap = Record<string, RoleData>;

const role =`
    );
  }
  content = content.replace(
    "export const roleDataMap: Record<string, RoleData> = {",
    "export const DEFAULT_ROLE_DATA_MAP: RoleDataMap = {"
  );
  content = content.replace(
    "type RadialOrbitalTimelineProps = { activeTab: string; rings: string[][] };",
    "type RadialOrbitalTimelineProps = { activeTab: string; rings: string[][]; roleDataMap?: RoleDataMap };"
  );
  content = content.replace(
    "export default function RadialOrbitalTimeline({ activeTab, rings }: RadialOrbitalTimelineProps) {",
    "export default function RadialOrbitalTimeline({ activeTab, rings, roleDataMap = DEFAULT_ROLE_DATA_MAP }: RadialOrbitalTimelineProps) {"
  );
  write("components/ui/radial-orbital-timeline.tsx", content);
}

function writeSeedScript() {
  write(
    "scripts/seed-circular-timeline.mjs",
    `import { createClient } from "@sanity/client";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;

    for (const line of fs.readFileSync(fullPath, "utf8").split("\\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex <= 0) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "a4wk6kp5";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_TOKEN ||
  process.env.SANITY_API_TOKEN;

if (!token) {
  throw new Error("Missing SANITY_API_WRITE_TOKEN. Add a write token to .env.local before running this script.");
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: "2026-04-20",
  useCdn: false,
});

const tabs = [
  {
    id: "school",
    label: "School",
    heading: "For Schools",
    description:
      "Classgrid connects K-12 students, parents, teachers, office teams, finance, exams, and school leadership into one operating view.",
    features: [],
    rings: [
      ["Students", "Parents"],
      ["Teachers", "Operations Admins", "Finance & Exams"],
      ["Academic Leaders", "Trustees"],
    ],
  },
  {
    id: "college",
    label: "Junior College",
    heading: "For Junior Colleges",
    description:
      "For FYJC/SYJC junior colleges, Classgrid supports students, parents, lecturers, departments, exams, finance teams, and institutional leadership.",
    features: [],
    rings: [
      ["Students", "Parents"],
      ["Lecturers", "Department Heads", "Finance & Exams"],
      ["Academic Leaders", "Institution Admins"],
    ],
  },
  {
    id: "engineering",
    label: "Engineering",
    heading: "For Engineering",
    description:
      "For technical institutions, Classgrid connects students, faculty, departments, placements, compliance, academic leadership, and executive oversight.",
    features: [],
    rings: [
      ["Students", "Parents"],
      ["Faculty", "Department Heads", "Placements & Compliance"],
      ["Academic Leaders", "Executive Leadership"],
    ],
  },
  {
    id: "coaching",
    label: "Coaching",
    heading: "For Coaching",
    description:
      "For coaching institutes, Classgrid brings students, parents, mentors, operations, test series teams, center leadership, and owners into one system.",
    features: [],
    rings: [
      ["Students", "Parents"],
      ["Mentors", "Operations Admins", "Test Series Team"],
      ["Center Leadership", "Owners"],
    ],
  },
];

const roles = [
  {
    roleKey: "Students",
    title: "Student Workspace",
    badge: "System Connected",
    desc: "Personal academics, services, fees, exams, and updates.",
    tooltip: "View learning, fees, exams",
    features: ["Timetable, attendance, assignments", "Results, fees, certificates, ID", "Library, notes, exams, feedback"],
    stats: ["Own-record visibility", "Mobile-first academic flow", "No cross-student data exposure"],
    metric: "Result: clearer student accountability",
    theme: "blue",
  },
  {
    roleKey: "Parents",
    title: "Parent Tracker",
    badge: "System Connected",
    desc: "Child-specific visibility for admissions, attendance, fees, and updates.",
    tooltip: "Track child progress",
    features: ["Admission status and documents", "Attendance and fee alerts", "Parent-scoped child visibility"],
    stats: ["Child-only data boundary", "Fewer office follow-ups", "Clearer family communication"],
    metric: "Result: stronger parent trust",
    theme: "blue",
  },
  {
    roleKey: "Teachers",
    title: "Teacher Workspace",
    badge: "System Connected",
    desc: "Classroom delivery for teachers and class teachers without manual follow-up.",
    tooltip: "Run daily classroom work",
    features: ["Attendance, homework, assignments", "Class teacher coordination", "Student and parent communication"],
    stats: ["Assigned-class access", "Faster daily updates", "Better homework visibility"],
    metric: "Result: less manual teaching admin",
    theme: "emerald",
  },
  {
    roleKey: "Operations Admins",
    title: "Operations Admin Workspace",
    badge: "System Connected",
    desc: "A shared operating layer for admission, attendance, HR, transport, library, canteen, and support teams.",
    tooltip: "Coordinate campus operations",
    features: ["Admission officers, front office, HR", "Attendance, transport, library, canteen", "Announcements, records, follow-ups"],
    stats: ["Less department switching", "Cleaner operational handoffs", "Role-aware access control"],
    metric: "Result: smoother daily administration",
    theme: "emerald",
  },
  {
    roleKey: "Finance & Exams",
    title: "Finance & Exams Workspace",
    badge: "System Connected",
    desc: "Critical fee, payment, examination, marks, hall ticket, and result workflows in one controlled layer.",
    tooltip: "Control fees and exams",
    features: ["Accountants and fees clerks", "Exam controllers and result teams", "Receipts, hall tickets, marks, reports"],
    stats: ["Stronger collection visibility", "Cleaner result cycles", "Fewer manual spreadsheets"],
    metric: "Result: trusted finance and exam operations",
    theme: "fuchsia",
  },
  {
    roleKey: "Academic Leaders",
    title: "Academic Leadership Console",
    badge: "System Connected",
    desc: "Principals, vice principals, headmasters, deans, and senior academic leaders get decision-ready visibility.",
    tooltip: "Monitor academic health",
    features: ["Attendance and academic progress", "Faculty, syllabus, and department signals", "Admissions, results, and compliance view"],
    stats: ["Earlier intervention", "Leadership-ready reporting", "Clear academic accountability"],
    metric: "Result: sharper academic governance",
    theme: "fuchsia",
  },
  {
    roleKey: "Trustees",
    title: "Trustee Board",
    badge: "System Connected",
    desc: "High-level institution performance and investment visibility.",
    tooltip: "Review leadership metrics",
    features: ["Admissions and fees overview", "Growth and operations signals", "Institution-level dashboards"],
    stats: ["Better fiscal visibility", "Leadership-ready metrics", "Less dependency on manual reports"],
    metric: "Result: informed oversight",
    theme: "amber",
  },
  {
    roleKey: "Lecturers",
    title: "Lecturer Workspace",
    badge: "System Connected",
    desc: "Teaching, attendance, assignments, tests, notes, and student support for junior college.",
    tooltip: "Teach FYJC/SYJC classes",
    features: ["Stream and division teaching", "Internal tests and notes", "Attendance and grading"],
    stats: ["Assigned-class focus", "Board-prep support", "Clear student updates"],
    metric: "Result: structured FYJC/SYJC teaching",
    theme: "emerald",
  },
  {
    roleKey: "Department Heads",
    title: "Department Head Console",
    badge: "System Connected",
    desc: "HODs and department leads monitor academic health across teams, branches, streams, and programs.",
    tooltip: "Monitor departments",
    features: ["HOD and department oversight", "Faculty activity and syllabus progress", "Internal assessment and student risk signals"],
    stats: ["Branch-wise visibility", "Earlier intervention", "Cleaner department reporting"],
    metric: "Result: stronger department control",
    theme: "fuchsia",
  },
  {
    roleKey: "Institution Admins",
    title: "Institution Admin Command",
    badge: "System Connected",
    desc: "Org admins and senior administrators manage users, modules, hierarchy, reporting, and operating permissions.",
    tooltip: "Control tenant operations",
    features: ["Organization configuration", "User and role management", "Dashboards, exports, and audit visibility"],
    stats: ["Unified operating layer", "Tenant-level control", "Role-based governance"],
    metric: "Result: one admin surface",
    theme: "fuchsia",
  },
  {
    roleKey: "Faculty",
    title: "Faculty Console",
    badge: "System Connected",
    desc: "Academic delivery for classes, labs, assignments, attendance, and grading.",
    tooltip: "Manage academic delivery",
    features: ["Session attendance", "Assignments and internal tests", "Notes and academic planning"],
    stats: ["Assigned-work access", "Faster student feedback", "Less manual consolidation"],
    metric: "Result: more teaching time",
    theme: "emerald",
  },
  {
    roleKey: "Placements & Compliance",
    title: "Placements & Compliance Hub",
    badge: "System Connected",
    desc: "Placement officers, alumni teams, and NBA/NAAC coordinators manage career and evidence workflows.",
    tooltip: "Coordinate outcomes and evidence",
    features: ["TPO and placement activity", "Alumni and career communication", "NBA/NAAC evidence and audit trails"],
    stats: ["Placement-ready visibility", "Cleaner accreditation evidence", "Better department coordination"],
    metric: "Result: stronger outcomes and compliance",
    theme: "amber",
  },
  {
    roleKey: "Executive Leadership",
    title: "Executive Leadership Console",
    badge: "System Connected",
    desc: "Directors, deans, principals, and institutional leaders see performance across academics, finance, admissions, and operations.",
    tooltip: "Review institution health",
    features: ["Institution dashboards", "Admissions and revenue view", "Academic and compliance signals"],
    stats: ["Top-level clarity", "Cross-department trends", "Decision-ready data"],
    metric: "Result: sharper institutional control",
    theme: "amber",
  },
  {
    roleKey: "Mentors",
    title: "Mentor Workspace",
    badge: "System Connected",
    desc: "Coaching mentors, tutors, and instructors manage batches, learning support, practice, and progress.",
    tooltip: "Guide student progress",
    features: ["Batch teaching workflows", "Practice sets and doubt support", "Student progress and reminders"],
    stats: ["Better student follow-through", "Focused mentoring", "Earlier support signals"],
    metric: "Result: more guided learning",
    theme: "emerald",
  },
  {
    roleKey: "Test Series Team",
    title: "Test Series Workspace",
    badge: "System Connected",
    desc: "Mock tests, quiz calendars, attempts, scores, and exam practice cycles for coaching teams.",
    tooltip: "Run test series cycles",
    features: ["Test scheduling", "Online exam coordination", "Results and rank analytics"],
    stats: ["Frequent practice cycles", "Faster score release", "Batch-wise performance insight"],
    metric: "Result: disciplined test culture",
    theme: "fuchsia",
  },
  {
    roleKey: "Center Leadership",
    title: "Center Leadership Command",
    badge: "System Connected",
    desc: "Center heads, directors, and coordinators run branch-level admissions, batches, fees, and academics.",
    tooltip: "Run center operations",
    features: ["Center performance view", "Admissions and fee follow-up", "Mentor and batch oversight"],
    stats: ["Local operating control", "Faster issue response", "Growth clarity"],
    metric: "Result: better center execution",
    theme: "amber",
  },
  {
    roleKey: "Owners",
    title: "Owner Growth Dashboard",
    badge: "System Connected",
    desc: "Owners and org admins track institute growth, revenue, leads, students, fees, tests, and engagement.",
    tooltip: "Track institute growth",
    features: ["Lead and admission analytics", "Fee and revenue visibility", "Student engagement signals"],
    stats: ["Growth dashboard", "Collection health", "Active student trends"],
    metric: "Result: sharper owner visibility",
    theme: "amber",
  },
];

function keyFrom(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const document = {
  _id: "circularTimeline",
  _type: "circularTimeline",
  title: "Circular Timeline",
  subtitle: "Homepage orbital stakeholder timeline. Edit tabs, rings, role names, and popup content here.",
  tabs: tabs.map((tab) => ({
    _key: keyFrom(tab.id),
    ...tab,
    rings: tab.rings.map((nodes, index) => ({
      _key: tab.id + "-ring-" + index,
      nodes,
    })),
  })),
  roles: roles.map((role) => ({
    _key: keyFrom(role.roleKey),
    ...role,
  })),
};

const result = await client.createOrReplace(document);

console.log("[sanity] Target: project " + projectId + ", dataset " + dataset);
console.log("[sanity] Upserted " + result._id + " with " + tabs.length + " tabs and " + roles.length + " role popups.");
`
  );
}

function updatePackageScript() {
  const rel = "package.json";
  const pkg = JSON.parse(read(rel));
  pkg.scripts = pkg.scripts || {};
  if (!pkg.scripts["sanity:seed:circular-timeline"]) {
    pkg.scripts["sanity:seed:circular-timeline"] = "node scripts/seed-circular-timeline.mjs";
    write(rel, JSON.stringify(pkg, null, 2) + "\n");
  }
}

writeCircularTimelineSchema();
updateSchemaIndex();
updateDeskStructure();
updateQueries();
updateMarketingLib();
updatePage();
updateTimelineSection();
updateTimelineWrapper();
updateRadialTimeline();
writeSeedScript();
updatePackageScript();

console.log("Circular timeline schema, query, UI wiring, and seed script are updated.");
