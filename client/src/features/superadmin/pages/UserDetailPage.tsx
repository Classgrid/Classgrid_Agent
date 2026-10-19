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

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { apiClient } from "@/lib/apiClient";
import { Table, TableBody, TableCell, TableRow } from "@/components/marketing_ui/table";
import { Card } from "@/components/marketing_ui/card";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";
import { useEffect } from "react";

type ProfileField = {
  key: string;
  label: string;
  type?: string;
  private?: boolean;
};

type ProfileSection = {
  sectionId: string;
  sectionTitle: string;
  fields: ProfileField[];
};

type UserDetailResponse = {
  success: boolean;
  data: {
    user: Record<string, any>;
    organization: Record<string, any> | null;
    profile: Record<string, any> | null;
    schema: ProfileSection[];
  };
};

function formatLabel(value?: string) {
  if (!value) return "";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateValue(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN");
}

function getNestedValue(source: Record<string, any> | null | undefined, path: string) {
  return path.split(".").reduce<any>((current, key) => current?.[key], source);
}
function normalizeAcademicYear(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number") return formatAcademicYearRange(value, value + 1);
  return String(value).trim();
}

function formatAcademicYearRange(startYear: number, endYear: number) {
  return `${startYear}-${String(endYear).slice(-2)}`;
}

function getCurrentAcademicYear() {
  const today = new Date();
  const calendarYear = today.getFullYear();
  const startYear = today.getMonth() >= 3 ? calendarYear : calendarYear - 1;
  return formatAcademicYearRange(startYear, startYear + 1);
}

function getRecordAcademicYear(
  organization: Record<string, any> | null | undefined,
  profile: Record<string, any> | null | undefined
) {
  const academicConfig = organization?.academic_config || {};
  const configuredYear =
    academicConfig.currentAcademicYear ||
    academicConfig.current_academic_year ||
    academicConfig.academicYear ||
    academicConfig.academic_year ||
    academicConfig.activeAcademicYear ||
    academicConfig.active_academic_year ||
    academicConfig.session ||
    academicConfig.academicSession ||
    academicConfig.academic_session ||
    profile?.admission_details?.academic_year ||
    profile?.education?.academic_year ||
    profile?.academic_year ||
    organization?.currentAcademicYear ||
    organization?.academic_year;

  if (configuredYear) return normalizeAcademicYear(configuredYear);

  const startYear = academicConfig.academic_year_start || academicConfig.startYear || academicConfig.start_year;
  const endYear = academicConfig.academic_year_end || academicConfig.endYear || academicConfig.end_year;
  if (startYear && endYear) return `${startYear}-${String(endYear).slice(-2)}`;

  return getCurrentAcademicYear();
}

export function UserDetailPage() {
  const navigate = useNavigate();
  const { userId } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["super-admin-user-detail", userId],
    queryFn: () =>
      apiClient
        .get<UserDetailResponse>(`/api/super-admin/users/${userId}/full`)
        .then((response) => response.data),
    enabled: Boolean(userId),
  });

  const user = data?.data?.user;
  const organization = data?.data?.organization;
  const profile = data?.data?.profile;
  const schema = data?.data?.schema ?? [];
  const recordAcademicYear = getRecordAcademicYear(organization, profile);

  const { setBreadcrumbs } = useBreadcrumbStore();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Global Users", href: "/superadmin/global-users" },
      { label: user?.name || "User Details" }
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, user?.name]);

  const getFieldValue = (key: string, type?: string): string => {
    // 1. Try flat key in user.metadata (where ContextualProfile saves new data)
    let value = user?.metadata?.[key];
    
    // 2. Try nested key in profile (legacy UserProfile)
    if (value === undefined || value === null || value === "") {
      value = getNestedValue(profile, key);
    }
    
    // 3. Try flat key in profile
    if (value === undefined || value === null || value === "") {
      value = profile?.[key];
    }

    // 4. Try root user properties as fallback for essential fields
    if (value === undefined || value === null || value === "") {
       if (key === "contact.personal_email") value = user?.email;
       if (key === "contact.mobile_number") value = user?.phoneNumber;
       if (key === "identity.first_name") value = user?.name?.split(" ")[0];
       if (key === "identity.last_name") value = user?.name?.split(" ").slice(1).join(" ");
    }

    if (value === undefined || value === null || value === "") return "";
    
    if (Array.isArray(value)) return value.filter(Boolean).join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (type === "date" || key.toLowerCase().includes("date")) return formatDateValue(value);
    if (typeof value === "object") return Object.values(value).filter(Boolean).join(", ");
    return String(value);
  };

  const sectionsWithData = useMemo(
    () =>
      schema
        .map((section) => ({
          ...section,
          fields: section.fields.filter((field) => getFieldValue(field.key, field.type)),
        }))
        .filter((section) => section.fields.length > 0),
    [schema, profile, user]
  );

  const renderFieldRows = (fields: ProfileField[]) => {
    const rows = [];

    for (let index = 0; index < fields.length; index += 2) {
      const firstField = fields[index];
      const secondField = fields[index + 1];

      rows.push(
        <TableRow key={firstField.key}>
          <TableCell className="bg-muted/20 font-medium text-muted-foreground w-[25%] border-r border-border/50">
            {firstField.label}{firstField.private ? " [private]" : ""}
          </TableCell>
          <TableCell className="w-[25%] border-r border-border/50 break-words">
            {getFieldValue(firstField.key, firstField.type)}
          </TableCell>
          {secondField ? (
            <>
              <TableCell className="bg-muted/20 font-medium text-muted-foreground w-[25%] border-r border-border/50">
                {secondField.label}{secondField.private ? " [private]" : ""}
              </TableCell>
              <TableCell className="w-[25%] break-words">
                {getFieldValue(secondField.key, secondField.type)}
              </TableCell>
            </>
          ) : (
            <TableCell colSpan={2} />
          )}
        </TableRow>
      );
    }

    return rows;
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading user record...</div>;
  }

  if (isError || !user) {
    return <div className="p-6 text-sm text-destructive">Unable to load user record.</div>;
  }

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 animate-in fade-in user-detail-page">
      <style>{`
        .document-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          max-width: 980px;
          margin: 0 auto 16px;
          width: 100%;
        }

        .document-actions button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          font-size: 14px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .document-actions button:hover {
          background: hsl(var(--muted));
        }

        .record-container {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
        }

        .org-logo-cell {
          width: 130px;
          text-align: center;
          vertical-align: middle;
          padding: 24px;
          background: hsl(var(--muted) / 0.1);
        }

        .org-logo-cell img {
          max-width: 80px;
          max-height: 80px;
          object-fit: contain;
        }

        .org-logo-placeholder {
          display: inline-flex;
          width: 80px;
          height: 80px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: hsl(var(--muted) / 0.5);
          color: hsl(var(--muted-foreground));
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .org-title-cell {
          padding: 24px;
          vertical-align: middle;
          background: hsl(var(--muted) / 0.1);
        }

        .org-title {
          font-size: 22px;
          font-weight: 600;
          color: hsl(var(--foreground));
          margin-bottom: 6px;
          letter-spacing: -0.02em;
        }

        .org-address {
          color: hsl(var(--muted-foreground));
          font-size: 14px;
          white-space: pre-wrap;
          line-height: 1.5;
        }

        .record-title {
          text-align: center;
          font-weight: 600;
          padding: 16px;
          color: hsl(var(--foreground));
          background: hsl(var(--muted) / 0.3);
          font-size: 13px;
          letter-spacing: 0.05em;
        }

        .photo-cell {
          width: 150px;
          text-align: center;
          vertical-align: middle;
          padding: 16px;
        }

        .photo-cell img {
          width: 120px;
          height: 160px;
          object-fit: cover;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          border: 1px solid hsl(var(--border) / 0.5);
        }

        .photo-placeholder {
          display: inline-flex;
          width: 120px;
          height: 160px;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: hsl(var(--muted) / 0.3);
          border: 1px dashed hsl(var(--border));
          color: hsl(var(--muted-foreground));
          font-size: 13px;
          font-weight: 500;
        }

        /* Cleaned up custom CSS since we are using Shadcn Table components now */

        @media print {
          .no-print {
            display: none;
          }

          body {
            margin: 0;
            background: white !important;
          }

          .user-detail-page {
            padding: 0 !important;
            max-width: none !important;
          }

          .record-container {
            max-width: none;
            box-shadow: none;
            border: none;
          }
        }
      `}</style>

      <div className="document-actions no-print" style={{ justifyContent: "flex-end" }}>
        <button type="button" onClick={() => window.print()}>
          <Printer size={16} />
          Print
        </button>
      </div>

      <Card className="record-container overflow-hidden">
        <Table className="table-fixed w-full">
        <TableBody>
          <TableRow className="hover:bg-transparent">
            <TableCell className="w-[25%] p-6 text-center align-middle bg-muted/10 border-r border-border/50">
              {organization?.logo_url ? (
                <img src={organization.logo_url} alt={`${organization?.name || "Organization"} logo`} className="max-w-[80px] max-h-[80px] object-contain mx-auto" />
              ) : (
                <span className="org-logo-placeholder mx-auto">LOGO</span>
              )}
            </TableCell>
            <TableCell colSpan={3} className="w-[75%] p-6 align-middle bg-muted/10">
              <div className="org-title">{organization?.name || "Platform Organization"}</div>
              <div className="org-address">{organization?.address || organization?.location || ""}</div>
            </TableCell>
          </TableRow>
          <TableRow className="hover:bg-transparent bg-muted/30">
            <TableCell colSpan={4} className="text-center font-semibold py-4 text-foreground/80 text-[13px] tracking-wide">
              USER RECORD FOR ACADEMIC YEAR {recordAcademicYear}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="bg-muted/20 font-medium text-muted-foreground w-[25%] border-r border-border/50">Role</TableCell>
            <TableCell className="w-[25%] border-r border-border/50">{formatLabel(user.role)}</TableCell>
            <TableCell rowSpan={2} colSpan={2} className="w-[50%] p-4 text-center align-middle">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.name || "User photo"} className="w-[120px] h-[160px] object-cover rounded-md shadow-sm border border-border/50 mx-auto" />
              ) : (
                <span className="photo-placeholder mx-auto">PHOTO</span>
              )}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="bg-muted/20 font-medium text-muted-foreground w-[25%] border-r border-border/50">Org Type</TableCell>
            <TableCell className="w-[25%] border-r border-border/50">{formatLabel(organization?.org_type)}</TableCell>
          </TableRow>
        </TableBody>

        {sectionsWithData.map((section) => (
          <TableBody key={section.sectionId}>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableCell colSpan={4} className="font-semibold text-muted-foreground uppercase text-xs tracking-wider py-3">
                {section.sectionTitle}
              </TableCell>
            </TableRow>
            {renderFieldRows(section.fields)}
          </TableBody>
        ))}
      </Table>
      </Card>
    </div>
  );
}