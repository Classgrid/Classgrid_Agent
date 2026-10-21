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

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Spinner } from "@/components/marketing_ui/spinner";
import { validateActivationToken, activateAdmin, sendOnboardingOtp, verifyOnboardingOtp, checkUsername, fetchAllTerminology } from "../api";
import {
  CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Mail, Smartphone, Key, User,
  Upload, School, GraduationCap, Building2, Briefcase, PlaySquare, Eye, EyeOff, Moon, Sun, ChevronDown,
  ArrowRight, GitBranch, BookOpen, ChevronUp, Globe, Sparkles
} from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/marketing_ui/alert-dialog";
import { useTheme } from "next-themes";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Textarea } from "@/components/marketing_ui/textarea";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { getResolvedProfileStrategy } from "@/features/shared/lib/profile-strategy-selector";
const Confetti = React.lazy(() => import("react-confetti"));
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/marketing_ui/input-otp";
import { Calendar } from "@/components/marketing_ui/nikhil_calendar";
const ImageCropperModal = React.lazy(() => import("@/components/marketing_ui/ImageCropperModal").then(module => ({ default: module.ImageCropperModal })));
import { Popover } from "@base-ui/react/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import locationsData from "@/data/india-locations.json";
import erpData from "@/data/full_erp_data.json";

export const normalizeOrgType = (raw: string): string => {
  if (!raw) return "Junior College";
  const norm = raw.toLowerCase().replace(/_/g, " ").trim();
  if (norm.includes("junior")) return "Junior College";
  if (norm.includes("engineering")) return "Engineering College";
  if (norm.includes("diploma") || norm.includes("polytechnic")) return "Diploma College";
  if (norm.includes("coaching") || norm.includes("institute")) return "Coaching Institute";
  if (norm.includes("school")) return "School";
  return "Junior College";
};

export const normalizePhoneDigits = (num: string): string => {
  if (!num) return "";
  const digits = num.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

export const isPhoneMatch = (p1: string, p2: string): boolean => {
  const n1 = normalizePhoneDigits(p1);
  const n2 = normalizePhoneDigits(p2);
  return Boolean(n1 && n2 && n1.length === 10 && n2.length === 10 && n1 === n2);
};

export const isEmailMatch = (e1: string, e2: string): boolean => {
  if (!e1 || !e2) return false;
  return e1.trim().toLowerCase() === e2.trim().toLowerCase();
};

const CONCEPT_LABELS: Record<string, string> = {
  org_label:        "Org Label",
  top_level:        "Top Level",
  course:           "Course",
  year:             "Year",
  period:           "Period",
  division:         "Division",
  sub_batch:        "Sub Batch",
  student_id:       "Student ID",
  teacher:          "Teacher",
  assignment_label: "Assignment",
  exam_label:       "Exam",
};

const COL_LABELS: Record<string, string> = {
  engineering:    "Engineering",
  school:         "School",
  coaching:       "Coaching",
  junior_college: "Jr. College",
  diploma:        "Diploma",
};

const DEFAULT_COMPARISON_CONCEPTS = [
  "org_label",
  "top_level",
  "course",
  "year",
  "period",
  "division",
  "sub_batch",
  "student_id",
  "teacher",
  "assignment_label",
  "exam_label",
];

const resolveMongoTerminology = (rawOrgType: string, mongoMap: Record<string, any>) => {
  const norm = (rawOrgType || "").toLowerCase().trim();

  let matchedKey = "engineering";
  if (norm.includes("junior")) matchedKey = "junior_college";
  else if (norm.includes("school")) matchedKey = "school";
  else if (norm.includes("diploma") || norm.includes("polytechnic")) matchedKey = "diploma";
  else if (norm.includes("coaching") || norm.includes("institute")) matchedKey = "coaching";
  else if (norm.includes("other") || norm.includes("custom")) matchedKey = "other";

  const dbData = mongoMap?.[matchedKey] || mongoMap?.["engineering"];

  if (dbData) {
    const terms = dbData.terminology || {};
    const levels: string[] = dbData.hierarchyLevels || [];
    const examples: string[] = dbData.hierarchyExamples || [];

    const hierarchyTree = levels.map((lvl: string, idx: number) => ({
      name: lvl,
      example: examples[idx] || null
    }));

    return {
      matchedKey,
      displayName: terms.org_label || "Junior College",
      orgLabel: terms.org_label || "Organization",
      topLevel: terms.top_level || "Top Level",
      course: terms.course || "Course",
      year: terms.year || "Year",
      period: terms.period || "Period",
      division: terms.division || "Division",
      subBatch: terms.sub_batch || "Batch",
      studentId: terms.student_id || "Roll No",
      teacher: terms.teacher || "Lecturer",
      assignment: terms.assignment_label || "Assignment",
      exam: terms.exam_label || "Examination",
      hierarchyTree
    };
  }

  // Pure dynamic fallback matching MongoDB structure
  if (norm.includes("junior")) {
    return {
      matchedKey: "junior_college",
      displayName: "Junior College",
      orgLabel: "Junior College",
      topLevel: "Stream",
      course: "Stream",
      year: "Standard",
      period: "Term",
      division: "Division",
      subBatch: "Batch",
      studentId: "Roll No",
      teacher: "Lecturer",
      assignment: "Assignment",
      exam: "Examination",
      hierarchyTree: [
        { name: "Stream", example: "Science / Commerce / Arts" },
        { name: "Standard", example: "11th / 12th" },
        { name: "Division", example: "A / B" },
        { name: "Batch", example: "Batch 1 / Batch 2" },
      ]
    };
  }

  if (norm.includes("school")) {
    return {
      matchedKey: "school",
      displayName: "School",
      orgLabel: "School",
      topLevel: "Standard",
      course: "Class",
      year: "Class",
      period: "Term",
      division: "Section",
      subBatch: "—",
      studentId: "Roll No",
      teacher: "Teacher",
      assignment: "Homework",
      exam: "Test",
      hierarchyTree: [
        { name: "Standard", example: "Class 1 – 10" },
        { name: "Section", example: "A / B / C" }
      ]
    };
  }

  return {
    matchedKey: "engineering",
    displayName: "Engineering College",
    orgLabel: "College",
    topLevel: "Degree",
    course: "Branch",
    year: "Year",
    period: "Semester",
    division: "Division",
    subBatch: "Lab Batch",
    studentId: "PRN",
    teacher: "Faculty",
    assignment: "Assignment",
    exam: "Examination",
    hierarchyTree: [
      { name: "Degree", example: "B.Tech / M.Tech" },
      { name: "Department", example: "Computer / IT / ENTC / Mech" },
      { name: "Year", example: "FY / SY / TY / Final Year" },
      { name: "Semester", example: "Sem 1 / Sem 2" },
      { name: "Division", example: "A / B / C" },
      { name: "Lab Batch", example: "L1 / L2 / L3" }
    ]
  };
};

const getTerminologyLabels = (rawOrgType: string) => resolveMongoTerminology(rawOrgType, {});

const getDepartmentOptions = (rawOrgType: string) => {
  const norm = (rawOrgType || "").toLowerCase().trim();
  if (norm.includes("junior")) return ["Administration", "Science Faculty", "Commerce Faculty", "Arts Faculty", "Other"];
  if (norm.includes("school")) return ["Administration", "Primary Section", "Secondary Section", "High School", "Science Dept", "Arts & Humanities", "Sports & Physical Ed", "Other"];
  if (norm.includes("diploma") || norm.includes("polytechnic")) return ["Administration", "Computer Engineering", "Mechanical", "Electrical", "Civil", "Other"];
  if (norm.includes("coaching") || norm.includes("institute")) return ["Administration", "JEE Division", "NEET Division", "Foundation", "Other"];
  return ["Administration", "Computer Science", "Mechanical", "Electrical", "Civil", "Electronics", "IT", "Other"];
};

const JOB_TITLE_OPTIONS = [
  "Academic Coordinator", "Academic Director", "Accountant", "Adjunct Faculty", "Admin Officer", 
  "Admission Counselor", "Admission Officer", "Assistant Librarian", "Assistant Professor", "Associate Dean", 
  "Associate Professor", "Attendant", "Batch Coordinator", "Branch Manager", "Cashier", 
  "Center Head", "CEO", "Chairman", "Chancellor", "Class Teacher", 
  "Clerk", "Coach", "Compliance Officer", "Controller of Examinations (COE)", "COO", 
  "Corporate Trainer", "Counselor", "Course Coordinator", "Curriculum Head", "Data Entry Operator", 
  "Dean", "Dean of Academics", "Dean of Student Affairs", "Director", "Educator", 
  "Exam Coordinator", "Finance Manager", "Founder", "Co-Founder", "Guest Teacher", 
  "Head Clerk", "Head of Department (HOD)", "Head of Institution", "Hostel Warden", "HR Manager", 
  "Instructor", "IQAC Director", "IT Manager", "Junior Clerk", "Lab Assistant", 
  "Lecturer", "Librarian", "Managing Director", "Medical Officer", "Mentor", 
  "NAAC Coordinator", "NBA Coordinator", "Network Engineer", "Nurse", "Office Superintendent", 
  "Peon", "Physical Training Instructor (PTI)", "Placement Officer (TPO)", "Post Graduate Teacher (PGT)", 
  "Pre-Primary Teacher", "President", "Primary Teacher (PRT)", "Principal", "PRO (Public Relations Officer)", 
  "Professor", "Program Director", "Provost", "Registrar", "Research Scholar", 
  "Senior Clerk", "Senior Lecturer", "Senior Teacher", "Special Educator", "Sports Director", 
  "Student Welfare Officer", "Subject Coordinator", "Subject Matter Expert (SME)", "System Administrator", "Teacher", 
  "Teaching Assistant (TA)", "Trainer", "Training & Placement Head", "Trained Graduate Teacher (TGT)", "Tutor", 
  "Vice Chancellor", "Vice Principal", "Visiting Faculty", "Other (Please specify)"
];

export function OnboardingWizardPage() {
  const { theme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState("");
  const [showCustomDesignation, setShowCustomDesignation] = useState(false);

  // Persisted state initialization
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");
      const savedToken = localStorage.getItem("onboarding_token");
      
      // If there's a new token that differs from the one in storage, start fresh!
      if (urlToken && urlToken !== savedToken) {
        localStorage.removeItem("onboarding_step");
        localStorage.removeItem("onboarding_adminName");
        localStorage.removeItem("onboarding_formData");
        localStorage.setItem("onboarding_token", urlToken);
        return 0;
      }

      const saved = localStorage.getItem("onboarding_step");
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Central form state: sectionKey -> { fieldKey: value }
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>(() => {
    try {
      const saved = localStorage.getItem("onboarding_formData");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });


  // Welcome step: editable name field
  const [adminName, setAdminName] = useState(() => {
    try {
      const saved = localStorage.getItem("onboarding_adminName");
      return saved || "";
    } catch {
      return "";
    }
  });

  // Persist form data and current step
  React.useEffect(() => {
    localStorage.setItem("onboarding_step", currentStep.toString());
  }, [currentStep]);

  React.useEffect(() => {
    localStorage.setItem("onboarding_formData", JSON.stringify(formData));
  }, [formData]);



  const [isCompleted, setIsCompleted] = useState(false);

  // Clean up on unmount or complete
  React.useEffect(() => {
    if (isCompleted) {
      localStorage.removeItem("onboarding_step");
      localStorage.removeItem("onboarding_formData");
      localStorage.removeItem("onboarding_adminName");
      localStorage.removeItem("onboarding_fetchedEmail");
      localStorage.removeItem("onboarding_phone");
    }
  }, [isCompleted]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchedEmail, setFetchedEmail] = useState(() => {
    try { return localStorage.getItem("onboarding_fetchedEmail") || ""; } catch { return ""; }
  });

  React.useEffect(() => {
    if (fetchedEmail) localStorage.setItem("onboarding_fetchedEmail", fetchedEmail);
  }, [fetchedEmail]);

  const [fetchedName, setFetchedName] = useState("");
  const [fetchedRole, setFetchedRole] = useState("");
  const [fetchedOrgType, setFetchedOrgType] = useState("school");
  const [fetchedSubdomain, setFetchedSubdomain] = useState("/");
  const [dashboardUrl, setDashboardUrl] = useState("/");
  const [mongoTerminologyMap, setMongoTerminologyMap] = useState<Record<string, any>>({});

  // Fetch MongoDB terminology dictionary dynamically from backend API
  React.useEffect(() => {
    fetchAllTerminology()
      .then((res) => {
        if (res && res.allTerminology) {
          setMongoTerminologyMap(res.allTerminology);
        }
      })
      .catch((err) => {
        console.error("Failed to load MongoDB terminology from backend:", err);
      });
  }, []);
  // Org data auto-fetched from Book a Demo lead
  const [fetchedOrgName, setFetchedOrgName] = useState("");
  const [fetchedAddress, setFetchedAddress] = useState("");
  const [fetchedCity, setFetchedCity] = useState("");
  const [fetchedState, setFetchedState] = useState("");
  const [fetchedDistrict, setFetchedDistrict] = useState("");
  const [fetchedTaluka, setFetchedTaluka] = useState("");
  const [fetchedWebsite, setFetchedWebsite] = useState("");



  // Phone Verification Handlers
  const handleSendOrgPhoneOtp = async () => {
    // Strictly requires 91 followed by 10 digits (12 digits total)
    const phoneRegex = /^91\d{10}$/;
    const cleanPhone = orgPhone.replace(/[\s-+]/g, '');
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      showAlert("Please enter a valid Indian number starting with 91 (e.g. 919876543210).");
      return;
    }

    const adminPhoneVal = phone || formData["personal_details"]?.phone || "";
    if (adminPhoneVal && isPhoneMatch(orgPhone, adminPhoneVal)) {
      showAlert("Already registered.");
      return;
    }

    if (isSendingPhoneOtp) return; // Prevent double click

    setIsSendingPhoneOtp(true);
    try {
      await sendOnboardingOtp({ target: orgPhone, type: "phone" });
      setOrgPhoneOtpSent(true);
      setOrgPhoneOtpTimer(30);
      showAlert("OTP sent successfully to " + orgPhone);
    } catch (err: any) {
      showAlert(err.response?.data?.message || err.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyOrgPhoneOtp = async (code: string) => {
    if (!code || code.length !== 6 || isVerifyingOrgPhone) return;

    setIsVerifyingOrgPhone(true);
    try {
      const result = await verifyOnboardingOtp({ target: orgPhone, otp: code });
      if (result.verified) {
        setIsOrgPhoneVerified(true);
      } else {
        showAlert("Invalid OTP. Please try again.");
      }
    } catch (err: any) {
      showAlert(err.message || "Invalid OTP. Please try again.");
    } finally {
      setIsVerifyingOrgPhone(false);
    }
  };
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phone, setPhone] = useState(() => {
    try { return localStorage.getItem("onboarding_phone") || ""; } catch { return ""; }
  });

  React.useEffect(() => {
    if (phone) localStorage.setItem("onboarding_phone", phone);
  }, [phone]);

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  // Username States
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState("");

  // Org Verification States
  const [orgEmail, setOrgEmail] = useState("");
  const [orgEmailOtp, setOrgEmailOtp] = useState("");
  const [isOrgEmailVerified, setIsOrgEmailVerified] = useState(false);
  const [orgEmailOtpSent, setOrgEmailOtpSent] = useState(false);
  const [isVerifyingOrgEmail, setIsVerifyingOrgEmail] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [orgPhone, setOrgPhone] = useState("");
  const [orgPhoneOtp, setOrgPhoneOtp] = useState("");
  const [isOrgPhoneVerified, setIsOrgPhoneVerified] = useState(false);
  const [orgPhoneOtpSent, setOrgPhoneOtpSent] = useState(false);
  const [isVerifyingOrgPhone, setIsVerifyingOrgPhone] = useState(false);


  const [isInitializing, setIsInitializing] = useState(true); // Start true to prevent flash
  const [isBuildingWorkspace, setIsBuildingWorkspace] = useState(false);

  // Sending OTP guards (prevent double-click)
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);

  // OTP Timers
  const [emailOtpTimer, setEmailOtpTimer] = useState(0);
  const [phoneOtpTimer, setPhoneOtpTimer] = useState(0);
  const [orgEmailOtpTimer, setOrgEmailOtpTimer] = useState(0);
  const [orgPhoneOtpTimer, setOrgPhoneOtpTimer] = useState(0);

  // Derived Dropdown Data (from india-locations.json & full_erp_data.json)
  const stateOptions = useMemo(() => {
    const fromLoc = Object.keys(locationsData.states);
    const fromErp = (erpData as any).birthstatelist || [];
    return Array.from(new Set([...fromLoc, ...fromErp])).filter(Boolean).sort();
  }, []);

  const getDistrictsForState = (stateName: string): string[] => {
    let districts: string[] = [];
    if (stateName) {
      const cleanState = stateName.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [sKey, dObj] of Object.entries(locationsData.states)) {
        const cleanKey = sKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey.includes(cleanState) || cleanState.includes(cleanKey)) {
          districts = Object.keys(dObj);
          break;
        }
      }
    }
    const fromErp = (erpData as any).birthdistrictlist || [];
    if (!districts.length) {
      districts = fromErp;
    }
    return Array.from(new Set(districts)).filter(Boolean).sort();
  };

  const getTalukasForDistrict = (stateName: string, districtName: string): string[] => {
    if (!districtName) return [];
    if (stateName) {
      const cleanState = stateName.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [sKey, dObj] of Object.entries(locationsData.states)) {
        const cleanKey = sKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey.includes(cleanState) || cleanState.includes(cleanKey)) {
          if ((dObj as any)[districtName]) return (dObj as any)[districtName] as string[];
          const cleanDist = districtName.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const [dKey, tList] of Object.entries(dObj)) {
            if (dKey.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanDist) return tList as string[];
          }
        }
      }
    }
    const cleanDist = districtName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const dObj of Object.values(locationsData.states)) {
      for (const [dKey, tList] of Object.entries(dObj)) {
        if (dKey.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanDist) return tList as string[];
      }
    }
    return [];
  };

  const getCitiesForState = (stateName: string, districtName?: string) => {
    if (districtName) {
      const talukas = getTalukasForDistrict(stateName, districtName);
      if (talukas.length > 0) return talukas;
    }
    if (!stateName) return [];
    const cleanState = stateName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let districtsObj: any = null;
    for (const [sKey, dObj] of Object.entries(locationsData.states)) {
      const cleanKey = sKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey.includes(cleanState) || cleanState.includes(cleanKey)) {
        districtsObj = dObj;
        break;
      }
    }
    if (!districtsObj) return [];
    const cities = new Set<string>();
    Object.values(districtsObj).forEach((districtCities: any) => {
      if (Array.isArray(districtCities)) {
        districtCities.forEach((city: string) => cities.add(city));
      }
    });
    return Array.from(cities).sort();
  };

  const selectedState = (formData["org_details"]?.["state"] && formData["org_details"]?.["state"] !== "") ? formData["org_details"]["state"] : (fetchedState || "");
  const selectedDistrict = (formData["org_details"]?.["district"] && formData["org_details"]?.["district"] !== "") ? formData["org_details"]["district"] : (fetchedDistrict || "");
  const selectedTaluka = (formData["org_details"]?.["taluka"] && formData["org_details"]?.["taluka"] !== "") ? formData["org_details"]["taluka"] : (fetchedTaluka || "");
  const selectedCity = (formData["org_details"]?.["city"] && formData["org_details"]?.["city"] !== "") ? formData["org_details"]["city"] : (fetchedCity || "");

  const districtOptions = useMemo(() => getDistrictsForState(selectedState), [selectedState]);
  const talukaOptions = useMemo(() => getTalukasForDistrict(selectedState, selectedDistrict), [selectedState, selectedDistrict]);
  const cityOptions = useMemo(() => getCitiesForState(selectedState, selectedDistrict), [selectedState, selectedDistrict]);

  const boardOptions = useMemo(() => {
    const defaultBoards: string[] = [];
    const erpList = ((erpData as any).erpboardlist || [])
      .map((item: any) => (typeof item === 'object' ? (item.name || item.board) : item))
      .filter(Boolean);
    return Array.from(new Set([...defaultBoards, ...erpList])).sort();
  }, []);

  const universityOptions = useMemo(() => {
    const defaultUnis: string[] = [];
    const erpList = ((erpData as any).erpuniversitylist || [])
      .map((item: any) => (typeof item === 'object' ? (item.name || item.university) : item))
      .filter(Boolean);
    return Array.from(new Set([...defaultUnis, ...erpList])).sort();
  }, []);

  const languageOptions = useMemo(() => {
    if (!erpData.mothertoungelist) return [];
    return erpData.mothertoungelist
      .map((item: any) => (typeof item === 'object' ? (item.name || item.mothertounge) : item))
      .filter(Boolean)
      .sort();
  }, []);

  const activeOrgName = formData["org_details"]?.["name"] || formData["organization_details"]?.["name"] || fetchedOrgName || "";
  const activeShortName = formData["org_details"]?.["short_name"] || formData["organization_details"]?.["short_name"] || "";

  const portalUrlSuggestions = useMemo(() => {
    const list: string[] = [];

    if (activeShortName.trim()) {
      const cleanShort = activeShortName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
      if (cleanShort && !list.includes(cleanShort)) list.push(cleanShort);
    }

    if (activeOrgName.trim()) {
      // 1. Full clean slug
      const cleanFull = activeOrgName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .slice(0, 30);
      if (cleanFull && !list.includes(cleanFull)) list.push(cleanFull);

      // 2. First word / main brand word (if multiple words)
      const words = activeOrgName.trim().split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean);
      if (words.length > 1) {
        const firstWord = words[0];
        if (firstWord.length >= 3 && !list.includes(firstWord)) list.push(firstWord);

        // 3. Initials
        const initials = words.map(w => w[0]).join('');
        if (initials.length >= 2 && !list.includes(initials)) list.push(initials);
      }
    }

    // Fallbacks if list is empty
    if (list.length === 0) {
      list.push("my-school", "campus", "portal");
    }

    return list.slice(0, 4);
  }, [activeOrgName, activeShortName]);

  // Auto-fill custom portal URL slug with top suggestion if user hasn't explicitly set one
  React.useEffect(() => {
    if (!formData["org_identity"]?.["slug"] && portalUrlSuggestions.length > 0) {
      const topSug = portalUrlSuggestions[0];
      if (topSug && topSug !== "my-school") {
        setFormData((prev) => ({
          ...prev,
          org_identity: {
            ...(prev["org_identity"] || {}),
            slug: topSug,
          }
        }));
      }
    }
  }, [portalUrlSuggestions]);

  // Timer Effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (emailOtpTimer > 0 || phoneOtpTimer > 0 || orgEmailOtpTimer > 0 || orgPhoneOtpTimer > 0) {
      interval = setInterval(() => {
        setEmailOtpTimer(prev => (prev > 0 ? prev - 1 : 0));
        setPhoneOtpTimer(prev => (prev > 0 ? prev - 1 : 0));
        setOrgEmailOtpTimer(prev => (prev > 0 ? prev - 1 : 0));
        setOrgPhoneOtpTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [emailOtpTimer, phoneOtpTimer, orgEmailOtpTimer, orgPhoneOtpTimer]);

  const [alertState, setAlertState] = useState({ open: false, title: "", message: "" });
  const showAlert = (message: string, title: string = "Notice") => { setAlertState({ open: true, title, message }); };

  const handleSendOrgEmailOtp = async () => {
    if (!orgEmail || !orgEmail.includes("@")) {
      showAlert("Please enter a valid organization email.");
      return;
    }
    const adminEmailVal = fetchedEmail || formData["personal_details"]?.email || "";
    if (adminEmailVal && isEmailMatch(orgEmail, adminEmailVal)) {
      showAlert("Already registered.");
      return;
    }
    try {
      await sendOnboardingOtp({ target: orgEmail, type: "email" });
      setOrgEmailOtpSent(true);
      setOrgEmailOtpTimer(30);
      toast.success("OTP sent to organization email!");
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to send OTP");
    }
  };

  const handleVerifyOrgEmailOtp = async (otpValue: string) => {
    if (otpValue.length !== 6) return;
    setIsVerifyingOrgEmail(true);
    try {
      const res = await verifyOnboardingOtp({ target: orgEmail, otp: otpValue });
      if (res.verified) {
        setIsOrgEmailVerified(true);
      }
    } catch (e: any) {
      toast.error(e.message || "Invalid OTP");
    } finally {
      setIsVerifyingOrgEmail(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!fetchedEmail || isSendingEmailOtp) return;
    setIsSendingEmailOtp(true);
    try {
      await sendOnboardingOtp({ target: fetchedEmail, type: "email" });
      setEmailOtpSent(true);
      setEmailOtpTimer(30);
      toast.success("OTP sent to your email!");
    } catch (e: any) {
      toast.error(e.message || "Failed to send OTP");
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async (otpValue: string) => {
    if (otpValue.length !== 6) return;
    setIsVerifyingEmail(true);
    try {
      const res = await verifyOnboardingOtp({ target: fetchedEmail, otp: otpValue });
      if (res.verified) {
        setIsEmailVerified(true);
      }
    } catch (e: any) {
      toast.error(e.message || "Invalid OTP");
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!phone || phone.length < 10) {
      showAlert("Please enter a valid phone number.");
      return;
    }
    if (isSendingPhoneOtp) return;
    setIsSendingPhoneOtp(true);
    try {
      await sendOnboardingOtp({ target: phone, type: "phone" });
      setPhoneOtpSent(true);
      setPhoneOtpTimer(30);
      toast.success("OTP sent to your phone!");
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to send OTP");
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async (otpValue: string) => {
    if (otpValue.length !== 6) return;
    setIsVerifyingPhone(true);
    try {
      const res = await verifyOnboardingOtp({ target: phone, otp: otpValue });
      if (res.verified) {
        setIsPhoneVerified(true);
      }
    } catch (e: any) {
      toast.error(e.message || "Invalid OTP");
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const checkUsernameTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const handleUsernameChange = async (val: string) => {
    const rawVal = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(rawVal);
    setUsernameAvailable(null);
    setUsernameMessage("");

    if (rawVal.length < 3) {
      setUsernameMessage("Must be at least 3 characters.");
      return;
    }

    if (checkUsernameTimeout.current) {
      clearTimeout(checkUsernameTimeout.current);
    }

    setIsCheckingUsername(true);

    checkUsernameTimeout.current = setTimeout(async () => {
      try {
        const res = await checkUsername(rawVal);
        setUsernameAvailable(res.available);
        setUsernameMessage(res.message);
      } catch (err: any) {
        setUsernameAvailable(false);
        setUsernameMessage("Error checking username");
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);
  };

  // Auto-suggest @username from admin name
  React.useEffect(() => {
    if (adminName && !username) {
      const suggested = adminName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 20);
      if (suggested.length >= 3) {
        setUsername(suggested);
        handleUsernameChange(suggested);
      }
    }
  }, [adminName]);

  React.useEffect(() => {
    if (token) {
      validateActivationToken(token)
        .then((res) => {
          if (res.valid) {
            setIsTokenValid(true);
            if (res.email) setFetchedEmail(res.email);
            if (res.phone) setPhone(prev => prev || res.phone || "");
            // Only set adminName from fetch if it's currently empty (don't overwrite user's typing from localStorage)
            if (res.name) {
              setFetchedName(res.name);
              setAdminName(prev => prev || res.name);
            }
            if (res.role) setFetchedRole(res.role);
            
            const normType = res.orgType ? normalizeOrgType(res.orgType) : "Junior College";
            setFetchedOrgType(normType);

            if (res.subdomain) setFetchedSubdomain(res.subdomain);
            if (res.orgName) setFetchedOrgName(res.orgName);
            if (res.address) setFetchedAddress(res.address);
            if (res.city) setFetchedCity(res.city);
            if (res.state) setFetchedState(res.state);
            if (res.district) setFetchedDistrict(res.district);
            if (res.taluka) setFetchedTaluka(res.taluka);
            if (res.website) setFetchedWebsite(res.website);

            // Pre-fill formData from MongoDB demo lead
            setFormData(prev => {
              const currentOrg = prev["org_details"] || {};
              return {
                ...prev,
                org_details: {
                  ...currentOrg,
                  name: (currentOrg.name && currentOrg.name !== "") ? currentOrg.name : (res.orgName || ""),
                  type: (currentOrg.type && currentOrg.type !== "") ? currentOrg.type : normType,
                  address: (currentOrg.address && currentOrg.address !== "") ? currentOrg.address : (res.address || ""),
                  state: (currentOrg.state && currentOrg.state !== "") ? currentOrg.state : (res.state || ""),
                  city: (currentOrg.city && currentOrg.city !== "") ? currentOrg.city : (res.city || ""),
                  district: (currentOrg.district && currentOrg.district !== "") ? currentOrg.district : (res.district || ""),
                  taluka: (currentOrg.taluka && currentOrg.taluka !== "") ? currentOrg.taluka : (res.taluka || ""),
                  website: (currentOrg.website && currentOrg.website !== "") ? currentOrg.website : (res.website || ""),
                  board: currentOrg.board || "",
                  university: currentOrg.university || "",
                }
              };
            });
          } else {
            setIsTokenValid(false);
            setTokenError("This activation link is invalid or has expired after 12 hours.");
          }
        })
        .catch((err) => {
          console.error("Token validation failed:", err);
          setIsTokenValid(false);
          setTokenError(err?.message || "Failed to validate link. It might be expired or invalid.");
        })
        .finally(() => {
          setIsInitializing(false);
        });
    } else {
      setIsInitializing(false);
    }
  }, [token]);


  // Password UI State (Ported from ResetPasswordPage)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const passwordRules = useMemo(() => {
    return {
      minLength: password.length >= 8,
      maxLength: password.length > 0 && password.length <= 64,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[@#$%^&*!?_.\-]/.test(password),
    };
  }, [password]);

  const passedRules = Object.values(passwordRules).filter(Boolean).length;

  const strength = useMemo(() => {
    if (!password) return "empty";
    if (passedRules <= 3) return "weak";
    if (passedRules <= 5) return "medium";
    return "strong";
  }, [password, passedRules]);

  const isStrongPassword =
    passwordRules.minLength &&
    passwordRules.maxLength &&
    passwordRules.uppercase &&
    passwordRules.lowercase &&
    passwordRules.number &&
    passwordRules.special;

  const isConfirmTouched = confirmPassword.length > 0;
  const isPasswordMatch = password === confirmPassword && isConfirmTouched;

  const strengthStyles = {
    empty: { border: "border-input", glow: "", text: "text-muted-foreground", bar: "bg-muted-foreground/20 w-0" },
    weak: { border: "border-red-500/70", glow: "shadow-[0_0_12px_rgba(239,68,68,0.15)]", text: "text-red-500", bar: "bg-red-500 w-1/3" },
    medium: { border: "border-orange-500/70", glow: "shadow-[0_0_12px_rgba(249,115,22,0.15)]", text: "text-orange-500", bar: "bg-orange-500 w-2/3" },
    strong: { border: "border-emerald-500/80", glow: "shadow-[0_0_12px_rgba(16,185,129,0.2)]", text: "text-emerald-500", bar: "bg-emerald-500 w-full" },
  };

  const current = strengthStyles[strength as keyof typeof strengthStyles];

  const confirmBorder = !isConfirmTouched
    ? "border-input"
    : isPasswordMatch
      ? "border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
      : "border-red-500/70 shadow-[0_0_12px_rgba(239,68,68,0.15)]";

  const handleFieldChange = (sectionKey: string, fieldKey: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        [fieldKey]: value,
      }
    }));
  };

  // -- DEBUG / DEV MODE STATE --
  const [debugRole, setDebugRole] = useState("student");
  const [debugOrgType, setDebugOrgType] = useState("engineering");

  const effectiveRole = fetchedRole || debugRole;
  const effectiveOrgType = fetchedRole ? fetchedOrgType : debugOrgType;

  // Fetch dynamic sections
  const strategy = getResolvedProfileStrategy({
    targetRole: effectiveRole,
    viewerRole: effectiveRole,
    orgType: effectiveOrgType,
    structureType: effectiveOrgType,
    isSelfView: true
  });

  const isOrgAdmin = effectiveRole === "org_admin";

  const dynamicSections = (strategy.sections || []).filter(sec => {
    // Remove onboarding-specific org/admin/contact sections — they duplicate fixed steps
    if (sec.key === "organization_details" || sec.key === "onboarding_organization_details") return false;
    if (sec.key === "admin_basic_identity" || sec.key === "onboarding_personal_details") return false;
    if (sec.key === "official_contact_info" || sec.key === "onboarding_contact_details") return false;
    // Skip the bloated basic profile and contact details for ALL users during onboarding
    // to prevent asking for Name, Email, and Phone multiple times.
    // They are already collected in fixed steps (Verification, Personal details).
    // Optional demographic data can be filled in later in profile settings.
    if (sec.key === "personal_details" || sec.key === "contact_details") return false;
    return true;
  });

  // Create one step per dynamic section
  const steps: any[] = [
    {
      id: "welcome",
      title: "Welcome",
      subtitle: "Let's get started.",
      icon: User,
      type: "fixed_welcome"
    },
    {
      id: "contact_verification",
      title: "Contact Verification",
      subtitle: "Verify your email and phone number.",
      icon: ShieldCheck,
      type: "fixed_verification"
    },
    {
      id: "profile_photo",
      title: "Profile Photo",
      subtitle: "Official passport-size portrait.",
      icon: User,
      type: "fixed_profile_photo"
    },
    {
      id: "personal_details",
      title: "Personal Identity",
      subtitle: "Set up your public profile and @username.",
      icon: Briefcase,
      type: "fixed_personal_details"
    },
    ...dynamicSections.map((section: any) => ({
      id: section.key,
      title: section.label,
      subtitle: "Please provide the following required details.",
      icon: typeof section.icon === 'string' ? getIconComponent(section.icon) : (section.icon || Building2),
      type: "dynamic_group",
      dynamicSections: [section]
    })),
    ...(isOrgAdmin ? [
      {
        id: "terminology",
        title: "Platform Terminology",
        subtitle: "How we organize your digital campus.",
        icon: Building2,
        type: "fixed_terminology"
      },
      {
        id: "org_identity",
        title: "Organization Identity",
        subtitle: "Your logo and portal URL.",
        icon: Building2,
        type: "fixed_org_identity"
      },
      {
        id: "org_details",
        title: "Organization Details",
        subtitle: "Legal and address details.",
        icon: Building2,
        type: "fixed_org_details"
      },
      {
        id: "org_verification",
        title: "Organization Verification",
        subtitle: "Verify official organization contact.",
        icon: ShieldCheck,
        type: "fixed_org_verification"
      }
    ] : []),
    {
      id: "password",
      title: "Secure Your Account",
      subtitle: "Create a strong password to protect your account.",
      icon: Key,
      type: "fixed_password"
    },
    {
      id: "review_submit",
      title: "Review & Submit",
      subtitle: "Please review all your details before final submission.",
      icon: CheckCircle2,
      type: "review"
    }
  ];

  const totalSteps = steps.length;
  const currentStepData = steps[currentStep] || steps[0];

  // Find the password step index dynamically
  const passwordStepIndex = steps.findIndex(s => s.id === "password");

  const handleNext = async () => {
    // Welcome step: require a name
    if (currentStepData.id === "welcome") {
      if (!adminName.trim()) {
        showAlert("Please enter your name to continue.");
        return;
      }
    }
    // Password step: validate strong password
    if (currentStepData.id === "password") {
      if (!password || !isStrongPassword || !isPasswordMatch) {
        showAlert("Please enter a valid, matching, strong password to continue.");
        return;
      }
    }
    
    // Review step: require terms acceptance
    if (currentStepData.id === "review_submit") {
      if (!acceptedTerms) {
        showAlert("Please accept the Terms of Service and Privacy Policy to continue.");
        return;
      }
    }
    // Contact Verification step: validate both are verified
    if (currentStepData.id === "contact_verification") {
      if (!isEmailVerified || !isPhoneVerified) {
        showAlert("Please verify both your email and phone number to continue.");
        return;
      }
    }
    // Personal Details step: validate username
    if (currentStepData.id === "personal_details") {
        const pd = formData["personal_details"] || {};
        const pFirstName = pd.first_name || (fetchedName ? fetchedName.split(" ")[0] : "");
        const pLastName = pd.last_name || (fetchedName && fetchedName.split(" ").length > 1 ? fetchedName.split(" ").slice(1).join(" ") : "");
        if (!pFirstName.trim() || !pLastName.trim()) {
          showAlert("First Name and Last Name are required.");
          return;
        }
        if (!username || !usernameAvailable) {
          showAlert("A valid and available username is required.");
          return;
        }
    }
    // Org Verification step
    if (currentStepData.id === "org_verification") {
      const adminEmailVal = fetchedEmail || formData["personal_details"]?.email || "";
      const adminPhoneVal = phone || formData["personal_details"]?.phone || "";

      if (adminEmailVal && isEmailMatch(orgEmail, adminEmailVal)) {
        showAlert("Already registered.");
        return;
      }
      if (adminPhoneVal && isPhoneMatch(orgPhone, adminPhoneVal)) {
        showAlert("Already registered.");
        return;
      }
      if (!isOrgEmailVerified || !isOrgPhoneVerified) {
        showAlert("Please verify both the official organization contact email and phone number.");
        return;
      }
    }
    
    if (currentStepData.type === "dynamic") {
      const section = dynamicSections.find(s => s.key === currentStepData.id);
      if (section && section.fields) {
        for (const field of section.fields) {
          if (field.dependsOn) {
            const parentKey = field.dependsOn.field.split('.').pop()!;
            if (formData[section.key]?.[parentKey] !== field.dependsOn.value) continue;
          }
          const val = formData[section.key]?.[field.key];
          if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
            showAlert(`Please fill out the "${field.label}" field to continue.`);
            return;
          }
        }
      }
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // --- GLOBAL VALIDATION ---
      const welcomeStepIndex = steps.findIndex(s => s.id === "welcome");
      if (welcomeStepIndex !== -1 && !adminName.trim()) {
        setCurrentStep(welcomeStepIndex);
        showAlert("Please enter your name to continue.");
        return;
      }
      if (!password || !isStrongPassword || !isPasswordMatch) {
        setCurrentStep(passwordStepIndex);
        showAlert("Please enter a valid, matching, strong password to continue.");
        return;
      }
      const contactStepIndex = steps.findIndex(s => s.id === "contact_verification");
      if (contactStepIndex !== -1 && (!isEmailVerified || !isPhoneVerified)) {
        setCurrentStep(contactStepIndex);
        showAlert("Please verify both your email and phone number to continue.");
        return;
      }
      const personalStepIndex = steps.findIndex(s => s.id === "personal_details");
      if (personalStepIndex !== -1) {
        const pd = formData["personal_details"] || {};
        const pFirstName = pd.first_name || (fetchedName ? fetchedName.split(" ")[0] : "");
        const pLastName = pd.last_name || (fetchedName && fetchedName.split(" ").length > 1 ? fetchedName.split(" ").slice(1).join(" ") : "");
        if (!pFirstName.trim() || !pLastName.trim()) {
          setCurrentStep(personalStepIndex);
          showAlert("First Name and Last Name are required.");
          return;
        }
        if (!username || !usernameAvailable) {
          setCurrentStep(personalStepIndex);
          showAlert("A valid and available username is required.");
          return;
        }
      }
      const orgVerStepIndex = steps.findIndex(s => s.id === "org_verification");
      if (orgVerStepIndex !== -1 && (!isOrgEmailVerified || !isOrgPhoneVerified)) {
        setCurrentStep(orgVerStepIndex);
        showAlert("Please verify both the official organization contact email and phone number.");
        return;
      }
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].type === "dynamic") {
          const section = dynamicSections.find(s => s.key === steps[i].id);
          if (section && section.fields) {
            for (const field of section.fields) {
              if (field.dependsOn) {
                const parentKey = field.dependsOn.field.split('.').pop()!;
                if (formData[section.key]?.[parentKey] !== field.dependsOn.value) continue;
              }
              const val = formData[section.key]?.[field.key];
              if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
                setCurrentStep(i);
                showAlert(`Please fill out the "${field.label}" field to continue.`);
                return;
              }
            }
          }
        }
      }
      if (!acceptedTerms) {
        const reviewStepIndex = steps.findIndex(s => s.id === "review_submit");
        setCurrentStep(reviewStepIndex !== -1 ? reviewStepIndex : steps.length - 1);
        showAlert("Please accept the Terms of Service and Privacy Policy to continue.");
        return;
      }
      // --- END GLOBAL VALIDATION ---

      console.log("FINAL SUBMITTED PROFILE DATA:", formData);
      setIsSubmitting(true);
      try {
        if (token && password) {
          const payload: any = {
            token,
            password,
            username,
            orgEmail,
            orgPhone,
            personalDetails: formData["personal_details"],
            orgIdentity: formData["org_identity"],
            orgDetails: formData["org_details"],
            dynamicData: formData
          };
          if (effectiveRole === "org_admin" && fetchedSubdomain) {
            payload.subdomain = fetchedSubdomain;
          }
          if (formData["org_identity"]?.["slug"]) {
            payload.subdomain = formData["org_identity"]["slug"];
          }
          const res = await activateAdmin(payload);
          if (res.redirectTo) {
            setDashboardUrl(res.redirectTo);
          }
        }
        setIsCompleted(true);
        setShowConfetti(true);
      } catch (err: any) {
        console.error(err);
        showAlert(err.response?.data?.message || err.message || "Failed to complete setup. Please check your details and try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isBuildingWorkspace || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Spinner className="size-10 text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center relative z-10">
          <h1 className="text-9xl font-extrabold text-muted-foreground/20 tracking-widest relative">
            404
            <div className="bg-background/80 px-2 text-sm rounded absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 font-bold text-foreground">
              Page Not Found
            </div>
          </h1>
          <p className="text-muted-foreground mt-8 mb-6">The page you are looking for doesn't exist or has been moved.</p>
          <Button variant="outline" className="h-10 px-8" onClick={() => window.location.href = 'https://classgrid.in'}>Return to Homepage</Button>
        </div>
      </div>
    );
  }

  if (isTokenValid === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center relative z-10">
          <div className="size-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="size-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
            Link Expired
          </h1>
          <p className="text-muted-foreground mb-8">
            {tokenError || "This activation link is invalid or has expired after 12 hours. Please request a new one from your administrator or contact support."}
          </p>
          <Button className="h-10 px-8" onClick={() => window.location.href = 'https://classgrid.in'}>Return to Homepage</Button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background flex items-center justify-center p-4">
        {showConfetti && <React.Suspense fallback={null}><Confetti width={window.innerWidth} height={window.innerHeight} /></React.Suspense>}
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 30%, #1e3a5f 0%, #0a0e1a 50%, #05070d 100%)" }}>
          {/* Starfield */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${Math.random() * 2 + 1}px`,
                  height: `${Math.random() * 2 + 1}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5 + 0.1,
                }}
              />
            ))}
          </div>
          {/* Aurora Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(56,142,255,0.3) 0%, rgba(56,142,255,0.1) 40%, transparent 70%)", filter: "blur(80px)" }} />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 text-center px-6 max-w-xl"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-emerald-400 text-lg font-semibold mb-4 tracking-wide uppercase"
            >
              Setup Complete
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-4xl md:text-5xl font-bold text-white mb-10 leading-tight"
            >
              Welcome to your new digital campus
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
            >
              <Button
                size="lg"
                onClick={() => window.location.href = dashboardUrl}
                className="h-14 px-10 text-base font-semibold rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all duration-300 shadow-lg shadow-blue-500/10"
              >
                Enter Dashboard <ChevronRight className="ml-2 size-5" />
              </Button>
            </motion.div>
          </motion.div>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.7; } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-background flex flex-col font-sans overflow-hidden">
      {/* Debug Panel - Only show if not using a real token */}
      {!token && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3 flex flex-wrap items-center justify-center gap-6 text-sm z-50 shrink-0">
          <span className="font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
            <PlaySquare className="size-4" /> LOCAL DEBUG MODE
          </span>
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground font-medium">Test Role:</label>
            <select
              value={debugRole}
              onChange={e => { setDebugRole(e.target.value); setCurrentStep(0); }}
              className="bg-background border rounded px-3 py-1.5 font-medium"
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="org_admin">Org Admin</option>
              <option value="hr_dept">HR Admin</option>
              <option value="admission_head">Admission Admin</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground font-medium">Org Type:</label>
            <select
              value={debugOrgType}
              onChange={e => { setDebugOrgType(e.target.value); setCurrentStep(0); }}
              className="bg-background border rounded px-3 py-1.5 font-medium"
            >
              <option value="engineering">Engineering College</option>
              <option value="school">K-12 School</option>
              <option value="coaching">Coaching Center</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Layout */}
      {currentStepData.type === "fixed_welcome" ? (
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden relative" style={{ background: "radial-gradient(ellipse at 50% 120%, #1e3a5f 0%, #0a0e1a 50%, #05070d 100%)" }}>
          {/* Starfield */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 80 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${Math.random() * 2 + 1}px`,
                  height: `${Math.random() * 2 + 1}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.6 + 0.1,
                  animation: `pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
          {/* Aurora Glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(56,142,255,0.25) 0%, rgba(56,142,255,0.08) 40%, transparent 70%)", filter: "blur(60px)" }} />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 text-center px-6 max-w-2xl"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-white/60 text-lg mb-4 font-medium tracking-wide"
            >
              Welcome to Classgrid
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
            >
              {(adminName || fetchedName) ? `Hey, ${(adminName || fetchedName).split(' ')[0]}` : 'Welcome to Classgrid'}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.8 }}
              className="text-white/50 text-lg md:text-xl leading-relaxed mb-10"
            >
              Let's set up your digital campus. Just a few quick basics before you jump in.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.6 }}
            >
              <Button
                size="lg"
                onClick={() => {
                  setIsBuildingWorkspace(true);
                  setTimeout(() => {
                    setIsBuildingWorkspace(false);
                    setCurrentStep(prev => prev + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 1500);
                }}
                className="h-14 px-10 text-base font-semibold rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all duration-300 shadow-lg shadow-blue-500/10"
              >
                Get Started <ChevronRight className="ml-2 size-5" />
              </Button>
            </motion.div>
          </motion.div>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.7; } }`}</style>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">

          {/* Sidebar */}
        <div className="hidden lg:flex w-[260px] bg-white dark:bg-card border-r border-border/50 flex-col p-6 z-10 shadow-xl overflow-y-auto">
          <div className="flex items-center gap-3 mb-8 shrink-0">
            {/* Org Logo */}
            <div className="size-10 bg-black rounded-xl flex items-center justify-center shrink-0 shadow-md p-1 border border-border">
              <img src="/logo.png" className="w-full h-full object-contain" alt="Classgrid Logo" />
            </div>
            {/* Org Name */}
            <h2 className="font-extrabold text-lg leading-tight tracking-tight text-foreground">
              <span>Classgrid</span><br />
              {/* Platform is our repo name, ERP is our product name */}
              <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">ERP</span>
            </h2>
          </div>

          <div className="flex-1 pb-4">
            <div className="space-y-1 relative">
              {/* Progress Line */}
              <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-secondary -z-10 rounded-full" />
              <div
                className="absolute left-5 top-6 w-0.5 bg-primary -z-10 rounded-full transition-all duration-500"
                style={{ height: `${(currentStep / (totalSteps - 1)) * 100}%` }}
              />

              {steps.map((step, idx) => {
                const isActive = idx === currentStep;
                const isPast = idx < currentStep;
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 py-3 ${isPast ? "cursor-pointer hover:opacity-80 transition-opacity" : isActive ? "cursor-default" : "cursor-default"}`}
                    onClick={() => isPast && setCurrentStep(idx)}
                  >
                    <div className={`size-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${isActive ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30 scale-105" :
                      isPast ? "bg-primary border-primary text-primary-foreground" :
                        "bg-muted/50 border-border text-muted-foreground"
                      }`}>
                      {isPast ? <CheckCircle2 className="size-5" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                    </div>
                    <div>
                      <span className={`block text-sm transition-colors ${isActive ? "text-foreground font-bold" :
                        isPast ? "text-foreground font-medium" : "text-muted-foreground font-medium"
                        }`}>
                        {step.type === "fixed_terminology"
                          ? `${resolveMongoTerminology(formData["org_details"]?.type || formData["organization_details"]?.type || fetchedOrgType || "Engineering", mongoTerminologyMap).displayName} Terminology`
                          : step.title
                        }
                      </span>
                      {isActive && <span className="text-[10px] uppercase tracking-wider text-primary font-bold mt-0.5 block">Current Step</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-border flex items-center justify-center">
            <div className="bg-secondary/50 rounded-full p-1 flex items-center shadow-inner">
              <button
                onClick={() => setTheme("light")}
                className={cn("p-2 px-3 rounded-full transition-all", theme === "light" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Sun className="size-4" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn("p-2 px-3 rounded-full transition-all", theme === "dark" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Moon className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative bg-slate-50/50 dark:bg-background overflow-hidden">

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto relative">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-full h-[300px] bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none" />

            <div className="max-w-6xl w-full mx-auto px-6 py-8 md:px-10 lg:py-10 flex flex-col">

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >




                  {/* Verification Step */}
                  {currentStepData.type === "fixed_verification" && (
                    <div className="space-y-6">
                      {/* Email Verification */}
                      <div className="bg-white dark:bg-card p-6 rounded-2xl shadow-sm border border-border/60">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="size-10 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center">
                            <Mail className="size-5" />
                          </div>
                          <h3 className="text-lg font-bold">1. Verify your Email</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className={isEmailVerified ? "md:col-span-2" : ""}>
                            <label className="text-xs font-semibold text-foreground mb-1.5 block">Email Address (From Invite)</label>
                            <div className="flex gap-2">
                              <Input value={fetchedEmail || "Loading..."} readOnly className="bg-secondary/50 h-10 flex-1 text-sm font-medium" />
                              {!isEmailVerified && (
                                <Button
                                  variant="outline"
                                  className="h-10 px-4 text-sm font-semibold min-w-[110px]"
                                  onClick={handleSendEmailOtp}
                                  disabled={isSendingEmailOtp || (emailOtpSent && emailOtpTimer > 0)}
                                >
                                  {isSendingEmailOtp ? "Sending..." : emailOtpTimer > 0 ? `Resend (${emailOtpTimer}s)` : emailOtpSent ? "Resend" : "Send OTP"}
                                </Button>
                              )}
                            </div>
                            {isEmailVerified && (
                              <p className="text-emerald-600 text-sm mt-2 font-medium flex items-center gap-1">
                                <CheckCircle2 className="size-4" /> Email verified.
                              </p>
                            )}
                          </div>
                          {!isEmailVerified && (
                            <div className="flex-1">
                              {emailOtpSent ? (
                                <>
                                  <label className="text-xs font-semibold text-foreground mb-1.5 block">6-Digit Verification Code</label>
                                  <InputOTP
                                    maxLength={6}
                                    disabled={isVerifyingEmail}
                                    value={emailOtp}
                                    onChange={(v) => { setEmailOtp(v); if (v.length === 6) handleVerifyEmailOtp(v); }}
                                  >
                                    <InputOTPGroup className="gap-2">
                                      {[0, 1, 2, 3, 4, 5].map((index) => (
                                        <InputOTPSlot key={index} index={index} className="w-12 h-12 text-lg font-bold rounded-xl border border-input bg-transparent" />
                                      ))}
                                    </InputOTPGroup>
                                  </InputOTP>
                                </>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Block 2: Phone Verification */}
                      <div className="bg-white dark:bg-card p-6 rounded-2xl shadow-sm border border-border/60">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="size-10 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Smartphone className="size-5" />
                          </div>
                          <h3 className="text-lg font-bold">2. Verify your Phone <span className="text-danger">*</span></h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">A verified phone number is strictly required to access the platform.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className={isPhoneVerified ? "md:col-span-2" : ""}>
                            <label className="text-xs font-semibold text-foreground mb-1.5 block">Mobile Number</label>
                            <div className="flex gap-2">
                              <Input defaultValue="+91" disabled className="w-16 bg-secondary/50 h-10 text-center text-sm font-medium" />
                              <Input
                                placeholder="10-digit number"
                                className="h-10 flex-1 text-sm"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                disabled={isPhoneVerified}
                              />
                              {!isPhoneVerified && (
                                <Button
                                  className="h-10 px-4 text-sm font-semibold min-w-[110px]"
                                  onClick={handleSendPhoneOtp}
                                  disabled={(phoneOtpSent && phone.length === 10 && phoneOtpTimer > 0) || phone.length < 10}
                                >
                                  {phoneOtpTimer > 0 ? `Resend (${phoneOtpTimer}s)` : phoneOtpSent ? "Resend" : "Send OTP"}
                                </Button>
                              )}
                            </div>
                            {isPhoneVerified && (
                              <p className="text-emerald-600 text-sm mt-2 font-medium flex items-center gap-1">
                                <CheckCircle2 className="size-4" /> Phone number verified.
                              </p>
                            )}
                          </div>
                          {!isPhoneVerified && (
                            <div className="flex-1">
                              {phoneOtpSent ? (
                                <>
                                  <label className="text-xs font-semibold text-foreground mb-1.5 block">SMS Verification Code</label>
                                  <InputOTP
                                    maxLength={6}
                                    disabled={isVerifyingPhone}
                                    value={phoneOtp}
                                    onChange={(v) => { setPhoneOtp(v); if (v.length === 6) handleVerifyPhoneOtp(v); }}
                                  >
                                    <InputOTPGroup className="gap-2">
                                      {[0, 1, 2, 3, 4, 5].map((index) => (
                                        <InputOTPSlot key={index} index={index} className="w-12 h-12 text-lg font-bold rounded-xl border border-input bg-transparent" />
                                      ))}
                                    </InputOTPGroup>
                                  </InputOTP>
                                </>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}



                  {/* ── RENDER: PROFILE PHOTO (FIXED STEP) ── */}
                  {currentStepData.type === "fixed_profile_photo" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-white dark:bg-card p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/60 text-center flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden">

                        {/* Decorative Background Pattern */}
                        <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10" style={{ backgroundImage: "radial-gradient(circle at center, #10b981 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

                        <div className="relative z-10 flex flex-col items-center w-full max-w-md">
                          <h2 className="text-2xl font-bold mb-3">Add Your Identity</h2>
                          <p className="text-muted-foreground mb-10 text-sm leading-relaxed">
                            Upload a high-quality, passport-sized photo for your official ID card. A clear front-facing picture ensures a perfect fit.
                          </p>

                          <div className="w-full flex justify-center mb-2">
                            <ImageUploadField
                              label="Upload Photo"
                              value={formData["profile_photo"]?.["image"]}
                              onChange={(base64) => handleFieldChange("profile_photo", "image", base64)}
                              circular={true}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── RENDER: PERSONAL DETAILS (FIXED STEP) ── */}
                  {currentStepData.type === "fixed_personal_details" && (
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-card p-6 rounded-2xl shadow-sm border border-border/60">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="size-10 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Briefcase className="size-5" />
                          </div>
                          <h3 className="text-xl font-bold">Personal Profile & @username</h3>
                        </div>

                        <div className="space-y-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-sm font-semibold text-foreground mb-1.5 block">First Name <span className="text-danger">*</span></label>
                              <Input
                                placeholder="e.g. John"
                                className="h-10"
                                value={formData["personal_details"]?.["first_name"] ?? (fetchedName ? fetchedName.split(" ")[0] : "")}
                                onChange={(e) => handleFieldChange("personal_details", "first_name", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-foreground mb-1.5 block">Last Name <span className="text-danger">*</span></label>
                              <Input
                                placeholder="e.g. Doe"
                                className="h-10"
                                value={formData["personal_details"]?.["last_name"] ?? (fetchedName && fetchedName.split(" ").length > 1 ? fetchedName.split(" ").slice(1).join(" ") : "")}
                                onChange={(e) => handleFieldChange("personal_details", "last_name", e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-foreground mb-1.5 block">Unique @username <span className="text-danger">*</span></label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">@</span>
                              <Input
                                placeholder="e.g. john_doe"
                                className="pl-8 h-10"
                                value={username}
                                onChange={(e) => handleUsernameChange(e.target.value)}
                              />
                            </div>
                            <div className="h-6 mt-1 flex items-center">
                              {isCheckingUsername && <span className="text-xs text-muted-foreground">Checking availability...</span>}
                              {!isCheckingUsername && usernameMessage && (
                                <span className={cn("text-xs font-medium", usernameAvailable ? "text-emerald-500" : "text-red-500")}>
                                  {usernameMessage}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-sm font-semibold text-foreground mb-1.5 block">Job Title / Designation</label>
                              <ResponsiveSelect
                                className="w-full h-10 rounded-lg border-input bg-background"
                                value={
                                  showCustomDesignation || (!!formData["personal_details"]?.["designation"] && !JOB_TITLE_OPTIONS.includes(formData["personal_details"]?.["designation"]))
                                    ? "Other (Please specify)"
                                    : (formData["personal_details"]?.["designation"] || "")
                                }
                                onChange={(e) => {
                                  if (e.target.value === "Other (Please specify)") {
                                    setShowCustomDesignation(true);
                                    handleFieldChange("personal_details", "designation", "");
                                  } else {
                                    setShowCustomDesignation(false);
                                    handleFieldChange("personal_details", "designation", e.target.value);
                                  }
                                }}
                              >
                                <option value="" disabled>Select Job Title...</option>
                                {JOB_TITLE_OPTIONS.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </ResponsiveSelect>
                              
                              {(showCustomDesignation || (!!formData["personal_details"]?.["designation"] && !JOB_TITLE_OPTIONS.includes(formData["personal_details"]?.["designation"]))) && (
                                <Input
                                  placeholder="Type your custom designation..."
                                  className="h-10 mt-3 border-primary/40 focus-visible:ring-primary/20 transition-all shadow-sm"
                                  autoFocus
                                  value={formData["personal_details"]?.["designation"] || ""}
                                  onChange={(e) => handleFieldChange("personal_details", "designation", e.target.value)}
                                />
                              )}
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-foreground mb-1.5 block">Department</label>
                              <ResponsiveSelect
                                className="w-full h-10 rounded-lg border-input bg-background"
                                value={formData["personal_details"]?.["department"] || ""}
                                onChange={(e) => handleFieldChange("personal_details", "department", e.target.value)}
                              >
                                <option value="" disabled>Select Department...</option>
                                {getDepartmentOptions(formData["org_details"]?.["type"] || fetchedOrgType || "School").map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </ResponsiveSelect>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-foreground mb-1.5 block">Preferred Language</label>
                            <ResponsiveSelect
                              className="w-full h-10 rounded-lg border-input bg-background"
                              value={formData["personal_details"]?.["preferred_language"] || "English"}
                              onChange={(e) => handleFieldChange("personal_details", "preferred_language", e.target.value)}
                            >
                              <option value="English">English</option>
                              {languageOptions.map((lang: string) => (
                                <option key={lang} value={lang}>{lang}</option>
                              ))}
                            </ResponsiveSelect>
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-foreground mb-1.5 block">Timezone</label>
                            <ResponsiveSelect
                              className="w-full h-10 rounded-lg border-input bg-background"
                              value={formData["personal_details"]?.["timezone"] || "Asia/Kolkata"}
                              onChange={(e) => handleFieldChange("personal_details", "timezone", e.target.value)}
                            >
                              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                              <option value="America/New_York">America/New_York (EST)</option>
                              <option value="Europe/London">Europe/London (GMT)</option>
                              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                            </ResponsiveSelect>
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-foreground mb-1.5 block">LinkedIn Profile (Optional)</label>
                            <Input
                              placeholder="e.g., https://linkedin.com/in/yourprofile"
                              className="h-10"
                              value={formData["personal_details"]?.["linkedin"] || ""}
                              onChange={(e) => handleFieldChange("personal_details", "linkedin", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── RENDER: TERMINOLOGY VISUAL (FIXED STEP) ── */}
                  {currentStepData.type === "fixed_terminology" && (() => {
                    const currentOrgType = formData["org_details"]?.type || formData["organization_details"]?.type || fetchedOrgType || "Engineering";
                    const terms = resolveMongoTerminology(currentOrgType, mongoTerminologyMap);

                    return (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm">
                          <p className="text-sm text-muted-foreground mb-6">
                            This is how your campus is structured in Classgrid. Each level branches into the next.
                          </p>

                          {/* ── Vertical Top-Down Tree ── */}
                          <div className="flex flex-col items-center gap-0">

                            {/* Root Node: Org Name */}
                            <motion.div
                              className="w-full max-w-xs bg-primary text-primary-foreground px-6 py-4 rounded-2xl text-center shadow-md"
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                            >
                              <Building2 className="size-6 mx-auto mb-1.5" />
                              <div className="font-bold text-lg tracking-tight">{terms.displayName}</div>
                              <div className="text-xs opacity-80 mt-0.5">Your Institution</div>
                            </motion.div>

                            {/* Connector from root */}
                            <div className="w-0.5 h-6 bg-primary/40" />

                            {/* Hierarchy Levels */}
                            {terms.hierarchyTree.map((node, i) => (
                              <React.Fragment key={i}>
                                <motion.div
                                  className="w-full max-w-sm bg-background border border-border rounded-2xl p-4 text-center shadow-sm hover:border-primary/40 transition-colors"
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.1 * (i + 1) }}
                                >
                                  <div className="font-bold text-foreground text-base">{node.name}</div>
                                  {node.example && (
                                    <div className="text-sm text-muted-foreground mt-1">{node.example}</div>
                                  )}
                                </motion.div>

                                {/* Connector line between levels */}
                                {i < terms.hierarchyTree.length - 1 && (
                                  <div className="flex flex-col items-center">
                                    <div className="w-0.5 h-4 bg-border" />
                                    <ChevronDown className="size-4 text-muted-foreground -my-1" />
                                    <div className="w-0.5 h-4 bg-border" />
                                  </div>
                                )}
                              </React.Fragment>
                            ))}

                            {/* Fork connector to roles */}
                            <div className="flex flex-col items-center mt-1">
                              <div className="w-0.5 h-5 bg-border" />
                              <div className="flex items-center gap-0">
                                <div className="w-16 sm:w-24 h-0.5 bg-border" />
                                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                <div className="w-16 sm:w-24 h-0.5 bg-border" />
                              </div>
                            </div>

                            {/* Role Cards: Student & Educator */}
                            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-1">
                              <motion.div
                                className="bg-background border border-border rounded-2xl p-4 text-center shadow-sm"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (terms.hierarchyTree.length + 1) }}
                              >
                                <GraduationCap className="size-5 text-primary mx-auto mb-1.5" />
                                <div className="font-bold text-foreground text-sm">Student</div>
                                <div className="text-xs text-muted-foreground mt-1">ID: {terms.studentId}</div>
                              </motion.div>

                              <motion.div
                                className="bg-background border border-border rounded-2xl p-4 text-center shadow-sm"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (terms.hierarchyTree.length + 2) }}
                              >
                                <User className="size-5 text-primary mx-auto mb-1.5" />
                                <div className="font-bold text-foreground text-sm">{terms.teacher}</div>
                                <div className="text-xs text-muted-foreground mt-1">Educator</div>
                              </motion.div>
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── RENDER: ORG IDENTITY (FIXED STEP) ── */}
                  {currentStepData.type === "fixed_org_identity" && (() => {
                    const currentSlug = formData["org_identity"]?.["slug"] || "";
                    const previewUrl = currentSlug ? `${currentSlug}.classgrid.in` : "";

                    return (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-card p-8 rounded-3xl shadow-sm border border-border/60">
                          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-border/60">
                            <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold">
                              <Globe className="size-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-foreground">Brand & Custom Portal Address</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">Customize your institution logo and dedicated URL for portal access.</p>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-10">
                            <div>
                              <label className="text-sm font-semibold mb-2 block text-foreground">Upload Institute Logo</label>
                              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                                Upload a high-resolution logo for your login screen and official reports. A square transparent PNG works best.
                              </p>
                              <div className="flex justify-start">
                                <ImageUploadField
                                  label="Upload Logo"
                                  value={formData["org_identity"]?.["logo"]}
                                  onChange={(base64) => handleFieldChange("org_identity", "logo", base64)}
                                  circular={false}
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label htmlFor="slug-input" className="text-sm font-semibold mb-1 block cursor-pointer text-foreground">
                                  Your Custom Portal Subdomain <span className="text-danger">*</span>
                                </label>
                                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                                  Choose a short, memorable subdomain for your portal login URL.
                                </p>

                                {/* Input Group with Left Prefix & Right Suffix Badge */}
                                <div className="flex items-center rounded-2xl border-2 border-border/80 bg-background overflow-hidden focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-200 shadow-sm h-12 hover:border-border">
                                  <div className="flex items-center gap-1.5 px-3.5 h-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-mono text-xs font-semibold border-r border-border shrink-0 select-none">
                                    <Globe className="size-3.5 text-primary" />
                                    <span>https://</span>
                                  </div>
                                  <input
                                    id="slug-input"
                                    type="text"
                                    className="flex-1 bg-transparent border-none outline-none px-3.5 text-sm font-bold tracking-tight text-foreground h-full focus:ring-0 placeholder:text-muted-foreground/30 placeholder:font-normal"
                                    placeholder="e.g. cambridge-school"
                                    value={currentSlug}
                                    onChange={(e) => handleFieldChange("org_identity", "slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                  />
                                  <div className="flex items-center gap-1 px-3 py-1.5 mr-2 rounded-lg bg-primary/10 text-primary font-bold text-xs border border-primary/20 shrink-0 select-none">
                                    .classgrid.in
                                  </div>
                                </div>
                              </div>

                              {/* Smart Dynamic Suggestions */}
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                  <Sparkles className="size-3.5 text-amber-500 animate-pulse" />
                                  <span>Suggested for your campus (click to apply):</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {portalUrlSuggestions.map((sug) => (
                                    <button
                                      type="button"
                                      key={sug}
                                      onClick={() => handleFieldChange("org_identity", "slug", sug)}
                                      className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer",
                                        currentSlug === sug
                                          ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                                          : "bg-secondary/60 hover:bg-secondary text-secondary-foreground border-border/80 hover:border-primary/40"
                                      )}
                                    >
                                      <span>{sug}.classgrid.in</span>
                                      {currentSlug === sug && <CheckCircle2 className="size-3 text-primary-foreground" />}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Live Active Preview Banner */}
                              {currentSlug ? (
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between shadow-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                                    <span>Portal URL: <strong className="font-bold underline tracking-wide">https://{previewUrl}</strong></span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                    Ready
                                  </span>
                                </motion.div>
                              ) : (
                                <p className="text-xs text-muted-foreground/70 font-medium">
                                  Enter lowercase letters, numbers, or hyphens.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── RENDER: ORG DETAILS (FIXED STEP) ── */}
                  {currentStepData.type === "fixed_org_details" && (
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-card p-8 rounded-3xl shadow-sm border border-border/60">
                        <h3 className="text-xl font-bold mb-6">Organization Details</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold block mb-1.5">Legal Organization Name <span className="text-danger">*</span></label>
                            <Input
                              value={formData["org_details"]?.["name"] ?? fetchedOrgName ?? ""}
                              onChange={(e) => handleFieldChange("org_details", "name", e.target.value)}
                              placeholder="e.g. Cambridge International School"
                              fieldState={formData["org_details"]?.["name"] ? "normal" : (fetchedOrgName ? "prefilled" : "normal")}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold block mb-1.5">
                              Organization Type <span className="text-danger">*</span>
                            </label>
                            <Input
                              value={normalizeOrgType(formData["org_details"]?.["type"] || fetchedOrgType || "Junior College")}
                              disabled
                              fieldState="locked"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold block mb-1.5">Board & Affiliation <span className="text-danger">*</span></label>
                            <ResponsiveSelect
                              className="w-full h-10 rounded-lg border-input bg-background"
                              value={formData["org_details"]?.["board"] || ""}
                              onChange={(e) => handleFieldChange("org_details", "board", e.target.value)}
                              fieldState={formData["org_details"]?.["board"] ? "normal" : "default"}
                            >
                              <option value="" disabled>Select Board</option>
                              {boardOptions.map((boardName: string) => (
                                <option key={boardName} value={boardName}>{boardName}</option>
                              ))}
                            </ResponsiveSelect>
                          </div>
                          <div>
                            <label className="text-sm font-semibold block mb-1.5">Affiliated University <span className="text-danger">*</span></label>
                            <ResponsiveSelect
                              className="w-full h-10 rounded-lg border-input bg-background"
                              value={formData["org_details"]?.["university"] || ""}
                              onChange={(e) => handleFieldChange("org_details", "university", e.target.value)}
                              fieldState={formData["org_details"]?.["university"] ? "normal" : "default"}
                            >
                              <option value="" disabled>Select University</option>
                              {universityOptions.map((uniName: string) => (
                                <option key={uniName} value={uniName}>{uniName}</option>
                              ))}
                            </ResponsiveSelect>
                          </div>
                          <div>
                            <label className="text-sm font-semibold block mb-1.5">Affiliation Registration Number <span className="text-danger">*</span></label>
                            <Input
                              value={formData["org_details"]?.["affiliation_number"] || ""}
                              onChange={(e) => handleFieldChange("org_details", "affiliation_number", e.target.value)}
                              placeholder="e.g. CBSE-AFF-2300123"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold block mb-1.5">Organization Short Name Code <span className="text-danger">*</span></label>
                            <Input
                              value={formData["org_details"]?.["short_name"] || ""}
                              onChange={(e) => handleFieldChange("org_details", "short_name", e.target.value)}
                              placeholder="e.g. CIS, ABPS"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold block mb-1.5">
                              {normalizeOrgType(formData["org_details"]?.["type"] || fetchedOrgType || "Junior College")} Address <span className="text-danger">*</span>
                            </label>
                            <Textarea
                              value={(formData["org_details"]?.["address"] !== undefined && formData["org_details"]?.["address"] !== "") ? formData["org_details"].address : (fetchedAddress || "")}
                              onChange={(e) => handleFieldChange("org_details", "address", e.target.value)}
                              placeholder={`Complete registered address of the ${normalizeOrgType(formData["org_details"]?.["type"] || fetchedOrgType || "Junior College").toLowerCase()}`}
                              fieldState={formData["org_details"]?.["address"] ? "normal" : (fetchedAddress ? "prefilled" : "normal")}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-semibold block mb-1.5">State <span className="text-danger">*</span></label>
                            <ResponsiveSelect
                              className="w-full h-10 rounded-lg border-input bg-background"
                              value={selectedState}
                              onChange={(e) => {
                                handleFieldChange("org_details", "state", e.target.value);
                              }}
                              fieldState={formData["org_details"]?.["state"] ? "normal" : (fetchedState ? "prefilled" : "normal")}
                            >
                              <option value="">Select State...</option>
                              {selectedState && !stateOptions.includes(selectedState) && (
                                <option value={selectedState}>{selectedState}</option>
                              )}
                              {stateOptions.map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </ResponsiveSelect>
                          </div>
                          <div>
                            <label className="text-sm font-semibold block mb-1.5">District</label>
                            <ResponsiveSelect
                              className="w-full h-10 rounded-lg border-input bg-background"
                              value={selectedDistrict}
                              onChange={(e) => {
                                handleFieldChange("org_details", "district", e.target.value);
                              }}
                              fieldState={formData["org_details"]?.["district"] ? "normal" : (fetchedDistrict ? "prefilled" : "normal")}
                            >
                              <option value="">Select District...</option>
                              {selectedDistrict && !districtOptions.includes(selectedDistrict) && (
                                <option value={selectedDistrict}>{selectedDistrict}</option>
                              )}
                              {districtOptions.map(dist => (
                                <option key={dist} value={dist}>{dist}</option>
                              ))}
                            </ResponsiveSelect>
                          </div>
                          <div>
                            <label className="text-sm font-semibold block mb-1.5">Taluka</label>
                            <ResponsiveSelect
                              className="w-full h-10 rounded-lg border-input bg-background"
                              value={selectedTaluka}
                              onChange={(e) => handleFieldChange("org_details", "taluka", e.target.value)}
                              fieldState={formData["org_details"]?.["taluka"] ? "normal" : (fetchedTaluka ? "prefilled" : "normal")}
                            >
                              <option value="">Select Taluka...</option>
                              {selectedTaluka && !talukaOptions.includes(selectedTaluka) && (
                                <option value={selectedTaluka}>{selectedTaluka}</option>
                              )}
                              {talukaOptions.map(tal => (
                                <option key={tal} value={tal}>{tal}</option>
                              ))}
                            </ResponsiveSelect>
                          </div>
                          <div>
                            <label className="text-sm font-semibold block mb-1.5">City or Village <span className="text-danger">*</span></label>
                            <Input
                              value={formData["org_details"]?.["city"] ?? fetchedCity ?? ""}
                              onChange={(e) => handleFieldChange("org_details", "city", e.target.value)}
                              placeholder="e.g. Bhinga or Gohpur"
                              fieldState={formData["org_details"]?.["city"] ? "normal" : (fetchedCity ? "prefilled" : "normal")}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold block mb-1.5">PIN Code <span className="text-danger">*</span></label>
                            <Input
                              value={formData["org_details"]?.["pincode"] || ""}
                              onChange={(e) => handleFieldChange("org_details", "pincode", e.target.value)}
                              placeholder="e.g. 110001"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-semibold block mb-1.5">Website URL</label>
                            <Input
                              value={formData["org_details"]?.["website"] || fetchedWebsite || ""}
                              onChange={(e) => handleFieldChange("org_details", "website", e.target.value)}
                              placeholder="https://www.yourschool.com"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── RENDER: ORG VERIFICATION (FIXED STEP) ── */}
                  {currentStepData.type === "fixed_org_verification" && (() => {
                    const adminEmailVal = fetchedEmail || formData["personal_details"]?.email || "";
                    const adminPhoneVal = phone || formData["personal_details"]?.phone || "";
                    const isSameEmail = isEmailMatch(orgEmail, adminEmailVal);
                    const isSamePhone = isPhoneMatch(orgPhone, adminPhoneVal);

                    return (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-card p-8 rounded-3xl shadow-sm border border-border/60">
                          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/60">
                            <div className="size-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                              <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-foreground">Verify Official Organization Contact</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Organization contact details must be official institution records and cannot be identical to your personal admin profile.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-8">
                            {/* ── ORG EMAIL SECTION ── */}
                            <div className="bg-secondary/30 p-6 rounded-2xl border border-border/80 space-y-4">
                              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Mail className="size-4 text-primary" />
                                <span>Official Organization Email <span className="text-danger">*</span></span>
                              </label>

                              <div className="grid md:grid-cols-2 gap-6 items-start">
                                <div>
                                  <div className="flex gap-2">
                                    <Input
                                      value={orgEmail}
                                      onChange={(e) => {
                                        setOrgEmail(e.target.value);
                                        setIsOrgEmailVerified(false);
                                        setOrgEmailOtpSent(false);
                                      }}
                                      disabled={isOrgEmailVerified}
                                      placeholder="e.g. contact@school.edu.in"
                                      className={cn("h-12 flex-1 text-sm font-medium rounded-xl", isSameEmail ? "border-red-500 ring-2 ring-red-500/20" : "")}
                                    />
                                    {!isOrgEmailVerified && (
                                      <Button
                                        variant="outline"
                                        className="h-12 px-6 text-sm font-semibold rounded-xl shrink-0 min-w-[120px]"
                                        onClick={handleSendOrgEmailOtp}
                                        disabled={(orgEmailOtpSent && orgEmailOtpTimer > 0) || isSendingEmailOtp || isSameEmail}
                                      >
                                        {isSendingEmailOtp ? "Sending..." : orgEmailOtpTimer > 0 ? `Resend (${orgEmailOtpTimer}s)` : orgEmailOtpSent ? "Resend" : "Send OTP"}
                                      </Button>
                                    )}
                                  </div>
                                  {isSameEmail && (
                                    <p className="text-red-500 text-xs mt-2.5 font-semibold flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 w-fit">
                                      <span>Already registered</span>
                                    </p>
                                  )}
                                  {isOrgEmailVerified && !isSameEmail && (
                                    <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-2.5 font-semibold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
                                      <CheckCircle2 className="size-4" />
                                      <span>Verified Official Email</span>
                                    </p>
                                  )}
                                </div>

                                {!isOrgEmailVerified && (
                                  <div className="flex-1">
                                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Enter 6-Digit Verification Code</label>
                                    <InputOTP
                                      maxLength={6}
                                      disabled={!orgEmailOtpSent || isOrgEmailVerified || isVerifyingOrgEmail || isSameEmail}
                                      value={orgEmailOtp}
                                      onChange={(v) => { setOrgEmailOtp(v); if (v.length === 6) handleVerifyOrgEmailOtp(v); }}
                                    >
                                      <InputOTPGroup className="gap-2">
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                          <InputOTPSlot key={index} index={index} className="w-11 h-11 text-lg font-bold rounded-xl border border-input bg-background" />
                                        ))}
                                      </InputOTPGroup>
                                    </InputOTP>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── ORG PHONE SECTION ── */}
                            <div className="bg-secondary/30 p-6 rounded-2xl border border-border/80 space-y-4">
                              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Smartphone className="size-4 text-primary" />
                                <span>Official Organization Phone <span className="text-danger">*</span></span>
                              </label>

                              <div className="grid md:grid-cols-2 gap-6 items-start">
                                <div>
                                  <div className="flex gap-2">
                                    <Input
                                      type="tel"
                                      value={orgPhone}
                                      onChange={(e) => {
                                        setOrgPhone(e.target.value);
                                        setIsOrgPhoneVerified(false);
                                        setOrgPhoneOtpSent(false);
                                      }}
                                      disabled={isOrgPhoneVerified}
                                      placeholder="e.g. 02228901234 or 9870000000"
                                      className={cn("h-12 flex-1 text-sm font-medium rounded-xl", isSamePhone ? "border-red-500 ring-2 ring-red-500/20" : "")}
                                    />
                                    {!isOrgPhoneVerified && (
                                      <Button
                                        variant="outline"
                                        className="h-12 px-6 text-sm font-semibold rounded-xl shrink-0"
                                        onClick={handleSendOrgPhoneOtp}
                                        disabled={(orgPhoneOtpSent && orgPhoneOtpTimer > 0) || isSendingPhoneOtp || isSamePhone}
                                      >
                                        {isSendingPhoneOtp ? "Sending..." : orgPhoneOtpTimer > 0 ? `Resend (${orgPhoneOtpTimer}s)` : orgPhoneOtpSent ? "Resend" : "Send OTP"}
                                      </Button>
                                    )}
                                  </div>
                                  {isSamePhone && (
                                    <p className="text-red-500 text-xs mt-2.5 font-semibold flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 w-fit">
                                      <span>Already registered</span>
                                    </p>
                                  )}
                                  {isOrgPhoneVerified && !isSamePhone && (
                                    <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-2.5 font-semibold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
                                      <CheckCircle2 className="size-4" />
                                      <span>Verified Official Phone</span>
                                    </p>
                                  )}
                                </div>

                                {!isOrgPhoneVerified && (
                                  <div className="flex-1">
                                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Enter 6-Digit Verification Code</label>
                                    <InputOTP
                                      maxLength={6}
                                      disabled={!orgPhoneOtpSent || isOrgPhoneVerified || isVerifyingOrgPhone || isSamePhone}
                                      value={orgPhoneOtp}
                                      onChange={(v) => { setOrgPhoneOtp(v); if (v.length === 6) handleVerifyOrgPhoneOtp(v); }}
                                    >
                                      <InputOTPGroup className="gap-2">
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                          <InputOTPSlot key={index} index={index} className="w-11 h-11 text-lg font-bold rounded-xl border border-input bg-background" />
                                        ))}
                                      </InputOTPGroup>
                                    </InputOTP>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── RENDER: PASSWORD STEP ── */}
                  {currentStepData.type === "fixed_password" && (
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-sm border border-border/60">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="size-12 bg-green-500/10 text-green-600 rounded-xl flex items-center justify-center">
                            <Key className="size-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">Create Your Password</h3>
                            <p className="text-sm text-muted-foreground">This will be used to log in to your Classgrid dashboard.</p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="relative">
                            <label className="text-xs font-semibold text-foreground mb-1.5 block">New Password</label>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                maxLength={64}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                                placeholder="Enter new password"
                                className={`h-12 w-full rounded-xl border bg-background px-4 pr-10 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground ${current.border} ${current.glow}`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                              >
                                {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </button>
                            </div>

                            {/* Floating Rules Popover */}
                            {isPasswordFocused && password.length >= 2 && (
                              <div className="absolute left-[calc(100%+12px)] top-8 z-50 w-[240px] rounded-xl border border-border bg-popover p-3 shadow-lg hidden md:block animate-in fade-in zoom-in-95">
                                <div className="absolute -left-1.5 top-3 h-3 w-3 rotate-45 border-b border-l border-border bg-popover" />
                                <p className="text-[12px] font-semibold text-foreground">Password must contain:</p>
                                <ul className="mt-2 flex flex-col gap-1 text-[11px] text-muted-foreground">
                                  <li className="flex items-center gap-2">
                                    <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.minLength ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                                    Between 8 and 64 characters
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.uppercase && passwordRules.lowercase ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                                    Uppercase & lowercase letters
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.number ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                                    At least 1 number
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.special ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                                    At least 1 special character
                                  </li>
                                </ul>
                              </div>
                            )}

                            {password && (
                              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                                <div className={`h-full rounded-full transition-all duration-300 ${current.bar}`} />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-foreground mb-1.5 block">Confirm Password</label>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                maxLength={64}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter password"
                                className={`h-12 w-full rounded-xl border bg-background px-4 pr-10 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground ${confirmBorder}`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                              >
                                {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </button>
                            </div>
                            {isConfirmTouched && (
                              <p className={`mt-1.5 text-xs font-medium ${isPasswordMatch ? "text-emerald-500" : "text-red-500"}`}>
                                {isPasswordMatch ? "Passwords match" : "Passwords do not match"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                  {/* ── RENDER PHASE 3: DYNAMIC GROUPS (ONE SECTION PER SCREEN) ── */}
                  {currentStepData.type === "dynamic_group" && (
                    <div className="space-y-6">
                      {currentStepData.dynamicSections?.map((section: any, idx: number) => (
                        <div key={idx} className="bg-white dark:bg-card p-6 rounded-2xl shadow-sm border border-border/60">
                          <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-3">
                            <div className="size-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                              {React.createElement(getIconComponent(section.icon), { className: "size-4" })}
                            </div>
                            <h3 className="text-lg font-bold">{section.label}</h3>
                          </div>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                            {section.fields.map((field: any, fieldIdx: number) => {
                              if (field.dependsOn) {
                                // Extract the relative field name since the data is nested under section.key
                                const parentKey = field.dependsOn.field.split('.').pop()!;
                                const parentValue = formData[section.key]?.[parentKey];
                                if (parentValue !== field.dependsOn.value) return null;
                              }

                              const isFullWidth = (field.type === 'text' && field.label.includes('Address')) || field.type === 'image';
                              return (
                                <div key={fieldIdx} className={`grid gap-1.5 ${isFullWidth ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
                                  {field.type !== 'image' && (
                                    <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                                      {field.label}
                                      <span className="text-danger">*</span>
                                    </label>
                                  )}

                                  {field.type === 'dropdown' ? (
                                    <ResponsiveSelect
                                      className="h-10 w-full rounded-lg border-input bg-background px-3 text-sm"
                                      value={formData[section.key]?.[field.key] || ""}
                                      onChange={(e) => handleFieldChange(section.key, field.key, e.target.value)}
                                    >
                                      <option value="">Select...</option>
                                      {Array.isArray(field.options) ? field.options.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      )) : null}
                                    </ResponsiveSelect>
                                  ) : field.type === 'date' ? (
                                    <DatePickerField
                                      value={formData[section.key]?.[field.key]}
                                      onChange={(date) => handleFieldChange(section.key, field.key, date)}
                                    />
                                  ) : field.type === 'number' ? (
                                    <Input
                                      type="number"
                                      className="h-10 rounded-lg px-3 text-sm"
                                      placeholder="0"
                                      value={formData[section.key]?.[field.key] || ""}
                                      onChange={(e) => handleFieldChange(section.key, field.key, e.target.value)}
                                    />
                                  ) : field.type === 'boolean' ? (
                                    <div className="flex items-center gap-2 h-10">
                                      <input
                                        type="checkbox"
                                        className="size-4 rounded border-input"
                                        checked={!!formData[section.key]?.[field.key]}
                                        onChange={(e) => handleFieldChange(section.key, field.key, e.target.checked)}
                                      />
                                      <span className="text-sm font-medium">{field.label}</span>
                                    </div>
                                  ) : field.type === 'image' ? (
                                    <ImageUploadField
                                      label={field.label}
                                      value={formData[section.key]?.[field.key]}
                                      onChange={(base64) => handleFieldChange(section.key, field.key, base64)}
                                    />
                                  ) : (
                                    <Input
                                      type="text"
                                      className="h-10 rounded-lg px-3 text-sm"
                                      placeholder={`Enter ${field.label.toLowerCase()}`}
                                      value={formData[section.key]?.[field.key] || ""}
                                      onChange={(e) => handleFieldChange(section.key, field.key, e.target.value)}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── RENDER PHASE 4: REVIEW PAGE ── */}
                  {currentStepData.type === "review" && (
                    <div className="bg-white dark:bg-card p-6 md:p-8 rounded-2xl shadow-sm border border-border/60">
                      <div className="text-center mb-6">
                        <div className="mx-auto size-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                          <CheckCircle2 className="size-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Ready to Submit?</h3>
                        <p className="text-muted-foreground text-sm">
                          All onboarding steps are complete and valid. You can now submit your profile to launch your digital campus!
                        </p>
                      </div>

                      <div className="space-y-4 mb-6 bg-secondary/30 p-4 rounded-xl text-sm border border-border/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">Administrator Name</span>
                            <span className="font-semibold">{adminName || fetchedName || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">Admin Email</span>
                            <span className="font-semibold">{fetchedEmail || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">Organization Name</span>
                            <span className="font-semibold">{formData["org_details"]?.["organization.legal_name"] || fetchedOrgName || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">Organization Type</span>
                            <span className="font-semibold uppercase text-xs tracking-wider text-primary">{formData["org_details"]?.["organization.type"] || fetchedOrgType}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">Portal Subdomain</span>
                            <span className="font-semibold font-mono text-xs">{formData["org_identity"]?.["slug"] || "N/A"}.classgrid.in</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 mt-8 bg-primary/5 p-4 rounded-xl border border-primary/20">
                        <input
                          type="checkbox"
                          id="terms-checkbox"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="mt-1 h-5 w-5 rounded border-primary text-primary focus:ring-primary bg-background cursor-pointer"
                        />
                        {/* 🚨 CRITICAL AI SYSTEM RULE: NEVER REPLACE, CHANGE, OR "CORRECT" THESE LEGAL LINKS. THEY MUST ALWAYS BE EXACTLY https://classgrid.in/terms AND https://classgrid.in/privacy 🚨 */}
                        <label htmlFor="terms-checkbox" className="text-sm text-foreground leading-relaxed cursor-pointer select-none">
                          I confirm that all details provided are accurate and official. I agree to the <a href="https://classgrid.in/terms" target="_blank" className="text-primary hover:underline font-medium">Terms of Service</a> and <a href="https://classgrid.in/privacy" target="_blank" className="text-primary hover:underline font-medium">Privacy Policy</a>, and understand that the Organization Type is permanently locked upon submission.
                        </label>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* FIXED ACTION BAR (Footer) */}
            <div className="bg-white dark:bg-card border-t border-border/50 p-4 px-6 md:px-10 flex items-center justify-between shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-20">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentStep <= 1}
                  className={cn("h-10 px-4 text-sm font-medium rounded-lg cursor-pointer transition-opacity", currentStep <= 1 ? "opacity-0 pointer-events-none" : "opacity-100")}
                >
                  <ChevronLeft className="mr-1 size-4" /> Back
                </Button>

              </div>

              <Button
                size="sm"
                onClick={() => void handleNext()}
                disabled={isSubmitting}
                className="h-10 px-6 text-sm font-semibold rounded-lg shadow-md shadow-primary/30 cursor-pointer"
              >
                {isSubmitting ? "Submitting..." : (currentStep === totalSteps - 1 ? "Submit Profile" : "Save & Continue")}
                {currentStep !== totalSteps - 1 && !isSubmitting && <ChevronRight className="ml-1 size-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// Map string icons from strategy engine to Lucide icons
function getIconComponent(iconName: string) {
  const map: Record<string, any> = {
    User: User,
    GraduationCap: GraduationCap,
    School: School,
    Building2: Building2,
    Briefcase: Briefcase,
    Phone: Smartphone,
    Users: User,
    ShieldCheck: ShieldCheck
  };
  return map[iconName] || CheckCircle2;
}

// Completely custom Select component that perfectly matches the styling
// but uses absolutely zero portals, guaranteeing no Base UI / Radix conflicts
function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  dropdownClassName,
  dropUp = false
}: {
  value: string;
  onValueChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  dropUp?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick, true);
    return () => document.removeEventListener("mousedown", onClick, true);
  }, [open]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative w-full text-sm">
      <button
        type="button"
        onMouseDown={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:ring-1 focus:ring-ring",
          className
        )}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-[1000] max-h-56 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            dropUp ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top",
            dropdownClassName
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-1">
            {options.map((opt) => (
              <div
                key={opt.value}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onValueChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === opt.value ? "bg-accent/50 text-accent-foreground font-medium" : ""
                )}
              >
                {value === opt.value && (
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <CheckCircle2 className="size-3.5" />
                  </span>
                )}
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DatePickerField({ value, onChange }: { value?: Date; onChange?: (date?: Date) => void }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(value);
  const [viewMonth, setViewMonth] = React.useState<Date>(value || new Date());

  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = React.useState((value || new Date()).getMonth().toString());
  const [selectedYear, setSelectedYear] = React.useState((value || new Date()).getFullYear().toString());

  React.useEffect(() => {
    setInternalDate(value);
    if (value) {
      setViewMonth(value);
      setSelectedMonth(value.getMonth().toString());
      setSelectedYear(value.getFullYear().toString());
    }
  }, [value, isOpen]); // Reset internal date when reopening

  const handleSelect = (d: Date | undefined) => {
    if (d) {
      setInternalDate(d);
      setViewMonth(d);
      setSelectedMonth(d.getMonth().toString());
      setSelectedYear(d.getFullYear().toString());
    }
  };

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    const newMonth = new Date(parseInt(selectedYear), parseInt(val), 1);
    setViewMonth(newMonth);
  };

  const handleYearChange = (val: string) => {
    setSelectedYear(val);
    const newMonth = new Date(parseInt(val), parseInt(selectedMonth), 1);
    setViewMonth(newMonth);
  };

  const handleNavMonthChange = (newMonth: Date) => {
    setViewMonth(newMonth);
    setSelectedMonth(newMonth.getMonth().toString());
    setSelectedYear(newMonth.getFullYear().toString());
  };

  const handleApply = () => {
    if (internalDate) {
      onChange?.(internalDate);
    }
    setIsOpen(false);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
  ];
  const monthOptions = monthNames.map((m, i) => ({ label: m, value: i.toString() }));

  const yearOptions = Array.from({ length: 100 }, (_, i) => {
    const v = (currentYear - i).toString();
    return { label: v, value: v };
  });

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger
        render={
          <button
            type="button"
            className={cn(
              "h-10 w-full flex items-center justify-start text-left font-normal rounded-lg border border-input bg-background px-3 text-sm hover:bg-muted/50",
              !value && "text-muted-foreground"
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? format(value, "PPP") : <span>Pick a date</span>}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={4}>
          <Popover.Popup
            className="z-[1050] w-[320px] p-0 flex flex-col rounded-xl bg-popover text-popover-foreground text-foreground shadow-2xl border border-border outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
          >
            {/* Custom Month/Year Header */}
            <div className="flex items-center gap-2 p-3 pb-0">
              <div className="flex-1">
                <CustomSelect
                  value={selectedMonth}
                  onValueChange={handleMonthChange}
                  options={monthOptions}
                  className="h-8 border-none bg-accent/50 hover:bg-accent font-semibold"
                  dropdownClassName="w-40 -ml-2"
                />
              </div>
              <div className="flex-1">
                <CustomSelect
                  value={selectedYear}
                  onValueChange={handleYearChange}
                  options={yearOptions}
                  className="h-8 border-none bg-accent/50 hover:bg-accent font-semibold"
                  dropdownClassName="w-32"
                />
              </div>
            </div>

            <div className="px-3 pb-3">
              <Calendar
                mode="single"
                month={viewMonth}
                onMonthChange={handleNavMonthChange}
                selected={internalDate}
                fixedWeeks={true}
                showOutsideDays={true}
                onSelect={handleSelect}
                className="bg-transparent p-0 mt-3 flex justify-center"
                classNames={{
                  months: "bg-transparent",
                  month: "bg-transparent",
                  caption_label: "hidden",
                  table: "w-full border-collapse space-y-1 mx-auto",
                }}
              />
            </div>

            {/* Action Button exactly like NikhilTimeCalendar */}
            <div className="p-3 bg-muted/20 border-t border-border rounded-b-xl">
              <Button
                type="button"
                className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium"
                onClick={handleApply}
              >
                Apply Date
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ImageUploadField({ label, value, onChange, circular = false }: { label: string; value?: string; onChange?: (base64: string) => void; circular?: boolean }) {
  const [isCropOpen, setIsCropOpen] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState("");
  const [croppedImage, setCroppedImage] = React.useState<string | null>(value || null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync external value
  React.useEffect(() => {
    if (value) setCroppedImage(value);
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || "");
        setIsCropOpen(true);
      });
      const file = e.target.files[0];
      if (file) {
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCropComplete = async (blob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      setCroppedImage(base64data);
      onChange?.(base64data);
    };
  };

  return (
    <div className="w-full flex justify-center">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {!croppedImage ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed border-border p-4 flex flex-col items-center justify-center bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer text-center group",
            circular ? "size-48 md:size-56 rounded-full" : "w-full max-w-sm rounded-xl h-32"
          )}
        >
          <div className="size-10 bg-background rounded-full shadow-sm flex items-center justify-center mb-2">
            <Upload className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
      ) : (
        <div className={cn(
          "relative overflow-hidden shadow-lg border-2 border-border group",
          circular ? "size-48 md:size-56 rounded-full" : "w-32 h-32 rounded-xl"
        )}>
          <img src={croppedImage} alt="Cropped preview" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-[2px]"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="text-white text-xs font-semibold tracking-wider uppercase">Change</span>
          </div>
        </div>
      )}

      <React.Suspense fallback={null}><ImageCropperModal
        isOpen={isCropOpen}
        onClose={() => {
          setIsCropOpen(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        imageSrc={imageSrc}
        onCropComplete={handleCropComplete}
        circularCrop={true}
        aspectRatio={1}
        title={`Crop ${label}`}
      />
      </React.Suspense>

      <AlertDialog open={alertState.open} onOpenChange={(open) => setAlertState(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertState.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertState.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertState(prev => ({ ...prev, open: false }))}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
