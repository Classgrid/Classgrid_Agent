/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
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

import mongoose from "mongoose";

const { Schema } = mongoose;

// ─── Sub-schemas ────────────────────────────────────────────────────────────

const ThemeSchema = new Schema({
  primary:     { type: String, default: "#1e3a8a" }, // College picks this
  primaryDark: { type: String, default: "#1e3085" }, // Auto-derived (20% darker)
  accent:      { type: String, default: "#ffffff" },
}, { _id: false });

const PageContentSchema = new Schema({
  html:      { type: String, default: "" },
  status:    { type: String, enum: ["draft", "published"], default: "draft" },
  updatedAt: { type: Date },
}, { _id: false });
const StatSchema = new Schema({
  icon:  { type: String }, // Lucide icon name: GraduationCap, Trophy, etc.
  value: { type: String }, // "5000+" or "96%"
  label: { type: String }, // "Students Enrolled"
}, { _id: false });

const HeroSchema = new Schema({
  badge:         { type: String, default: "Admissions Open" },
  headline:      { type: String },
  subHeadline:   { type: String },
  description:   { type: String },
  videoUrl:      { type: String, default: "" },    // Supabase short campus loop video (max 20MB)
  fallbackImage: { type: String, default: "" },    // Shown on mobile instead of video
  stats:         [StatSchema],
}, { _id: false });

const NoticeSchema = new Schema({
  id:       { type: String },
  category: { type: String, enum: ["Exam", "Admission", "Holiday", "General", "Event"], default: "General" },
  title:    { type: String, required: true },
  date:     { type: String },                      // ISO date string "2026-05-18"
  summary:  { type: String },
  body:     { type: String },                      // Full Rich Text
  pdfUrl:   { type: String, default: "" },         // Supabase PDF URL
  isPublic: { type: Boolean, default: true },
});

const ProgramSchema = new Schema({
  id:          { type: String },
  icon:        { type: String },
  group:       { type: String },
  name:        { type: String, required: true },
  duration:    { type: String },
  description: { type: String },
  subjects:    [{ type: String }],
  intake:      { type: String },
  eligibility: { type: String },
  schedule:    { type: String },
});

const AdmissionDateSchema = new Schema({
  label: { type: String },
  date:  { type: String },
}, { _id: false });

const AdmissionBannerSchema = new Schema({
  title:          { type: String, default: "Admissions Open" },
  description:    { type: String },
  importantDates: [AdmissionDateSchema],
  ctaLabel:       { type: String, default: "Apply Now" },
}, { _id: false });

const FacultySchema = new Schema({
  id:          { type: String },
  name:        { type: String, required: true },
  designation: { type: String },
  department:  { type: String },
  subject:     { type: String },
  image:       { type: String, default: "" },       // Supabase URL
  isPublic:    { type: Boolean, default: true },
});

const GalleryImageSchema = new Schema({
  id:       { type: String },
  category: { type: String },
  image:    { type: String },                       // Supabase URL
  title:    { type: String },
});

const GalleryVideoSchema = new Schema({
  id:         { type: String },
  title:      { type: String },
  youtubeUrl: { type: String },                     // YouTube embed URL ONLY — no Supabase video
  thumbnail:  { type: String },
});

const TestimonialSchema = new Schema({
  id:       { type: String },
  name:     { type: String, required: true },
  batch:    { type: String },
  program:  { type: String },
  rating:   { type: Number, default: 5 },
  text:     { type: String },
  image:    { type: String, default: "" },
  facebook: { type: String, default: "" },
  linkedin: { type: String, default: "" },
});

const TopperSchema = new Schema({
  id:      { type: String },
  name:    { type: String },
  score:   { type: String },
  program: { type: String },
  batch:   { type: String },
  image:   { type: String, default: "" },
});

const MeritListSchema = new Schema({
  id:      { type: String },
  title:   { type: String },
  program: { type: String },
  round:   { type: String },
  date:    { type: String },
  pdfUrl:  { type: String, default: "" },           // Supabase PDF URL
});

const FeeRowSchema = new Schema({
  id:          { type: String },
  program:     { type: String },
  intake:      { type: String },
  annualFees:  { type: String },
  oneTimeFees: { type: String },
  total:       { type: String },
  installments:[{ type: String }],
});

const EventScheduleSchema = new Schema({
  time:  { type: String },
  title: { type: String },
}, { _id: false });

const EventSchema = new Schema({
  slug:          { type: String, required: true },
  title:         { type: String, required: true },
  category:      { type: String },
  status:        { type: String, enum: ["Upcoming", "Past", "Ongoing"], default: "Upcoming" },
  date:          { type: String },
  time:          { type: String },
  venue:         { type: String },
  image:         { type: String, default: "" },
  summary:       { type: String },
  description:   { type: String },
  registerLabel: { type: String, default: "Register Now" },
  schedule:      [EventScheduleSchema],
  gallery:       [{ type: String }],               // Supabase image URLs
  isPublic:      { type: Boolean, default: true },
});

const AlumniSchema = new Schema({
  id:          { type: String },
  name:        { type: String, required: true },
  batchYear:   { type: String },
  program:     { type: String },
  currentOrg:  { type: String },
  city:        { type: String },
  achievement: { type: String },
  quote:       { type: String },
  linkedin:    { type: String, default: "" },
  image:       { type: String, default: "" },
});

const BlogPostSchema = new Schema({
  slug:       { type: String, required: true },
  category:   { type: String },
  title:      { type: String, required: true },
  excerpt:    { type: String },
  image:      { type: String, default: "" },
  author:     { type: String },
  authorRole: { type: String },
  date:       { type: String },
  content:    [{ type: String }],                  // Array of paragraphs
  isPublic:   { type: Boolean, default: true },
});

const ContactPageSchema = new Schema({
  officeHours: { type: String, default: "Monday to Saturday: 9:00 AM - 5:00 PM" },
  mapEmbedUrl: { type: String, default: "" },
}, { _id: false });

const SocialLinkSchema = new Schema({
  label:    { type: String },
  href:     { type: String, default: "#" },
  platform: { type: String, enum: ["facebook", "instagram", "linkedin", "youtube", "whatsapp"] },
}, { _id: false });

const PrincipalSchema = new Schema({
  name:        { type: String },
  designation: { type: String, default: "Principal" },
  message:     { type: String },
  image:       { type: String, default: "" },
}, { _id: false });

// ─── NEW: Governance & Disclosures ───────────────────────────────────────────

const CommitteeMemberSchema = new Schema({
  role:  { type: String },
  name:  { type: String, required: true },
  phone: { type: String },
  email: { type: String },
}, { _id: false });

const CommitteeSchema = new Schema({
  id:          { type: String },
  name:        { type: String, required: true },
  description: { type: String },
  members:     [CommitteeMemberSchema],
});

const FacilitySchema = new Schema({
  id:          { type: String },
  category:    { type: String, enum: ["Classrooms", "Labs", "Library", "Sports", "Hostel", "Transport", "Safety", "Other"], default: "Other" },
  name:        { type: String, required: true },
  description: { type: String },
  images:      [{ type: String }], // Supabase URLs
});

// ─── NEW: Academics & Students ───────────────────────────────────────────────

const AcademicCalendarEventSchema = new Schema({
  date:        { type: String }, // ISO string
  description: { type: String },
}, { _id: false });

const AcademicCalendarTermSchema = new Schema({
  term:   { type: String },
  events: [AcademicCalendarEventSchema],
}, { _id: false });

const SyllabusSchema = new Schema({
  id:          { type: String },
  group:       { type: String }, // Class / Stream / Batch
  subject:     { type: String, required: true },
  description: { type: String },
  pdfUrl:      { type: String },
});

const DownloadSchema = new Schema({
  id:       { type: String },
  title:    { type: String, required: true },
  category: { type: String, enum: ["Admission", "Syllabus", "Exam", "Circular", "Other"], default: "Other" },
  date:     { type: String },
  url:      { type: String, required: true },
});

// ─── NEW: Org-Specific Details ───────────────────────────────────────────────

const CutoffSchema = new Schema({
  year:   { type: String },
  stream: { type: String },
  cutoff: { type: String },
}, { _id: false });

const SeoMetaSchema = new Schema({
  defaultTitle:       { type: String },
  defaultDescription: { type: String },
  googleAnalyticsId:  { type: String },
}, { _id: false });

// ─── Main Schema ─────────────────────────────────────────────────────────────

const OrgWebsiteContentSchema = new Schema({
  // Links to Organization
  organization_id: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    unique: true,                                   // One website per org
  },
  org_slug: {
    type: String,
    required: true,
    unique: true,                                   // e.g. "riverview-jc" → riverview-jc.classgrid.in
    lowercase: true,
    trim: true,
  },

  // ── Theme ────────────────────────────────────────────────────────────────
  theme: { type: ThemeSchema, default: () => ({}) },

  // Rich page content edited from the ERP Website CMS.
  pages: {
    home:       { type: PageContentSchema, default: () => ({}) },
    about:      { type: PageContentSchema, default: () => ({}) },
    admissions: { type: PageContentSchema, default: () => ({}) },
    facilities: { type: PageContentSchema, default: () => ({}) },
    contact:    { type: PageContentSchema, default: () => ({}) },
  },

  // ── Institution Info ─────────────────────────────────────────────────────
  institution: {
    name:            { type: String, required: true },
    shortName:       { type: String },
    type:            { type: String, enum: ["school", "junior-college", "coaching"], required: true },
    tagline:         { type: String },
    location:        { type: String },
    address:         { type: String },
    email:           { type: String },
    phone:           { type: String },
    whatsapp:        { type: String },
    establishedYear: { type: Number },
    logoUrl:         { type: String, default: "" }, // Supabase URL for college logo
    logoText:        { type: String },              // Fallback: text abbreviation (e.g. "RJC")
    heroImage:       { type: String, default: "" }, // Fallback image for hero (mobile)
  },

  // ── Hero Section ─────────────────────────────────────────────────────────
  hero: { type: HeroSchema, default: () => ({}) },

  // ── Accreditations (About page) ──────────────────────────────────────────
  accreditations: [{ type: String }],              // ["NAAC A+", "AICTE", "ISO"]

  // ── Principal ────────────────────────────────────────────────────────────
  principal: { type: PrincipalSchema, default: () => ({}) },

  // ── Story (About page) ───────────────────────────────────────────────────
  story:       { type: String, default: "" },
  storyImage:  { type: String, default: "" },
  vision:      { type: String, default: "" },
  mission:     { type: String, default: "" },

  // ── Admission Banner ─────────────────────────────────────────────────────
  admissionBanner: { type: AdmissionBannerSchema, default: () => ({}) },

  // ── Programs ─────────────────────────────────────────────────────────────
  programs: [ProgramSchema],

  // ── Notices ──────────────────────────────────────────────────────────────
  notices: [NoticeSchema],

  // ── Faculty ──────────────────────────────────────────────────────────────
  faculty: [FacultySchema],

  // ── Gallery ──────────────────────────────────────────────────────────────
  gallery: {
    images: [GalleryImageSchema],
    videos: [GalleryVideoSchema],                   // YouTube only
  },

  // ── Testimonials ─────────────────────────────────────────────────────────
  testimonials: [TestimonialSchema],

  // ── Merit List ───────────────────────────────────────────────────────────
  toppers:     [TopperSchema],
  meritLists:  [MeritListSchema],
  resultStats: [{
    label: { type: String },
    value: { type: String },
  }],

  // ── Fees ─────────────────────────────────────────────────────────────────
  fees:             [FeeRowSchema],
  scholarshipText:  { type: String, default: "" },
  feesPolicies:     [{ id: String, title: String, text: String }],

  // ── Events ───────────────────────────────────────────────────────────────
  events: [EventSchema],

  // ── Alumni ───────────────────────────────────────────────────────────────
  alumni: [AlumniSchema],

  // ── Blog ─────────────────────────────────────────────────────────────────
  blogPosts: [BlogPostSchema],

  // ── Contact Page ─────────────────────────────────────────────────────────
  contactPage: { type: ContactPageSchema, default: () => ({}) },

  // ── Social Links ─────────────────────────────────────────────────────────
  socialLinks: [SocialLinkSchema],

  // ── Governance & Infrastructure (NEW) ────────────────────────────────────
  mandatoryDisclosures: {
    trustName: { type: String },
    affiliationDetails: { type: String },
    pdfs: [{ title: String, url: String }],
  },
  committees: [CommitteeSchema],
  infrastructure: [FacilitySchema],

  // ── Academics (NEW) ──────────────────────────────────────────────────────
  academicCalendar: {
    text: { type: String },
    pdfUrl: { type: String },
    terms: [AcademicCalendarTermSchema],
  },
  syllabus: [SyllabusSchema],
  examinationDetails: {
    text: { type: String },
    pdfUrl: { type: String },
  },

  // ── Student Corner (NEW) ─────────────────────────────────────────────────
  downloads: [DownloadSchema],

  // ── Org-Type Specific Details (NEW) ──────────────────────────────────────
  schoolDetails: {
    timings:      { type: String },
    transport:    { type: String },
    rules:        { type: String },
    safetyPolicy: { type: String },
  },
  juniorCollegeDetails: {
    capInfo: { type: String },
    cutoffs: [CutoffSchema],
  },
  coachingDetails: {
    resultHighlights: { type: String },
    batchTimings:     { type: String },
    refundPolicy:     { type: String },
    refundPolicyPdf:  { type: String },
  },

  // ── Platform-Level (NEW) ─────────────────────────────────────────────────
  seoMeta: { type: SeoMetaSchema, default: () => ({}) },

  // ── Website Status ───────────────────────────────────────────────────────
  isPublished: { type: Boolean, default: false },  // Toggle to go live
  lastEditedBy: { type: Schema.Types.ObjectId, ref: "User" },

}, {
  timestamps: true,
  collection: "org_website_contents",
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
OrgWebsiteContentSchema.index({ isPublished: 1 });

export default mongoose.model("OrgWebsiteContent", OrgWebsiteContentSchema);
