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
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DropdownMaster from './src/models/DropdownMaster.js';

dotenv.config();

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/classgrid';

const seedData = [
  // 1. ORGANIZATION TYPES
  ...['School', 'Junior College', 'Degree College', 'Engineering College', 'Polytechnic / Diploma College', 'Coaching Institute', 'Vocational / Training Institute', 'University', 'Multi-campus Education Group', 'Other'].map(name => ({
    type: 'ORG_TYPE', name, is_active: true
  })),

  // 2. ROLE CATEGORIES
  ...['Org Admin', 'Admissions', 'Fees & Accounts', 'Examination', 'Library', 'Attendance', 'HR & Payroll', 'Hostel & Transport', 'Student', 'Faculty', 'IT & ERP', 'Laboratory', 'Placement & Career Services', 'Student Support', 'Support Staff', 'Other'].map(name => ({
    type: 'ROLE_CATEGORY', name, is_active: true
  })),

  // 3. DEPARTMENTS
  ...[
    // School
    { name: 'Administration', type: 'DEPARTMENT', organization_types: ['School', 'Junior College', 'Engineering College', 'Coaching Institute'] },
    { name: 'Academics (Primary)', type: 'DEPARTMENT', organization_types: ['School'] },
    { name: 'Academics (Secondary)', type: 'DEPARTMENT', organization_types: ['School'] },
    { name: 'Admissions', type: 'DEPARTMENT', organization_types: ['School', 'Junior College', 'Engineering College', 'Coaching Institute'] },
    { name: 'Fees & Accounts', type: 'DEPARTMENT', organization_types: ['School', 'Junior College', 'Engineering College', 'Coaching Institute'] },
    { name: 'Examination', type: 'DEPARTMENT', organization_types: ['School', 'Junior College', 'Engineering College'] },
    { name: 'Library', type: 'DEPARTMENT', organization_types: ['School', 'Junior College', 'Engineering College'] },
    { name: 'HR & Payroll', type: 'DEPARTMENT', organization_types: ['School', 'Junior College', 'Engineering College', 'Coaching Institute'] },
    { name: 'Hostel', type: 'DEPARTMENT', organization_types: ['School', 'Junior College', 'Engineering College'] },
    { name: 'Transport', type: 'DEPARTMENT', organization_types: ['School', 'Junior College', 'Engineering College'] },
    { name: 'Sports', type: 'DEPARTMENT', organization_types: ['School'] },
    { name: 'Arts & Culture', type: 'DEPARTMENT', organization_types: ['School'] },
    // Junior College
    { name: 'Science Stream', type: 'DEPARTMENT', organization_types: ['Junior College'] },
    { name: 'Commerce Stream', type: 'DEPARTMENT', organization_types: ['Junior College'] },
    { name: 'Arts Stream', type: 'DEPARTMENT', organization_types: ['Junior College'] },
    // Engineering
    { name: 'Computer Science / IT', type: 'DEPARTMENT', organization_types: ['Engineering College'] },
    { name: 'Mechanical Engineering', type: 'DEPARTMENT', organization_types: ['Engineering College'] },
    { name: 'Civil Engineering', type: 'DEPARTMENT', organization_types: ['Engineering College'] },
    { name: 'Electrical Engineering', type: 'DEPARTMENT', organization_types: ['Engineering College'] },
    { name: 'Electronics & Communication', type: 'DEPARTMENT', organization_types: ['Engineering College'] },
    { name: 'Applied Sciences (First Year)', type: 'DEPARTMENT', organization_types: ['Engineering College'] },
    { name: 'Training & Placement', type: 'DEPARTMENT', organization_types: ['Engineering College'] },
    // Coaching
    { name: 'JEE/NEET Faculty', type: 'DEPARTMENT', organization_types: ['Coaching Institute'] },
    { name: 'Foundation Batch Faculty', type: 'DEPARTMENT', organization_types: ['Coaching Institute'] }
  ],

  // 4. DESIGNATIONS
  ...[
    // Org Admin Dashboard
    { name: 'Organization Admin', type: 'DESIGNATION', role_categories: ['Org Admin'] },
    { name: 'Principal', type: 'DESIGNATION', role_categories: ['Org Admin'] },
    { name: 'Vice Principal', type: 'DESIGNATION', role_categories: ['Org Admin'] },
    { name: 'Head of Department (HOD)', type: 'DESIGNATION', role_categories: ['Org Admin'], organization_types: ['Junior College', 'Engineering College'] },
    { name: 'Academic Coordinator', type: 'DESIGNATION', role_categories: ['Org Admin'] },
    { name: 'Training & Placement Officer', type: 'DESIGNATION', role_categories: ['Org Admin'], organization_types: ['Engineering College'] },
    
    // Admissions
    { name: 'Admissions Department Head', type: 'DESIGNATION', role_categories: ['Admissions'] },
    { name: 'Admission Verifier', type: 'DESIGNATION', role_categories: ['Admissions'] },
    { name: 'Admission Counselor', type: 'DESIGNATION', role_categories: ['Admissions'] },
    { name: 'Admission Clerk', type: 'DESIGNATION', role_categories: ['Admissions'] },

    // Fees
    { name: 'Fees & Accounts Manager', type: 'DESIGNATION', role_categories: ['Fees & Accounts'] },

    // Examination
    { name: 'Examination Controller', type: 'DESIGNATION', role_categories: ['Examination'] },

    // Library
    { name: 'Library Manager', type: 'DESIGNATION', role_categories: ['Library'] },
    { name: 'Library Admin', type: 'DESIGNATION', role_categories: ['Library'] },

    // Attendance
    { name: 'Attendance Admin', type: 'DESIGNATION', role_categories: ['Attendance'] },

    // HR & Payroll
    { name: 'HR & Payroll Manager', type: 'DESIGNATION', role_categories: ['HR & Payroll'] },

    // Hostel & Transport
    { name: 'Hostel Manager', type: 'DESIGNATION', role_categories: ['Hostel & Transport'] },
    { name: 'Transport Manager', type: 'DESIGNATION', role_categories: ['Hostel & Transport'] },

    // Faculty
    { name: 'Teacher', type: 'DESIGNATION', role_categories: ['Faculty'], organization_types: ['School'] },
    { name: 'Lecturer', type: 'DESIGNATION', role_categories: ['Faculty'], organization_types: ['Junior College'] },
    { name: 'Faculty', type: 'DESIGNATION', role_categories: ['Faculty'], organization_types: ['Engineering College'] },
    { name: 'Mentor', type: 'DESIGNATION', role_categories: ['Faculty'], organization_types: ['Coaching Institute'] },
    { name: 'Student Counselor', type: 'DESIGNATION', role_categories: ['Faculty'] },
  ]
];

const seed = async () => {
  try {
    await mongoose.connect(dbURI);
    console.log('Connected to DB');

    await DropdownMaster.deleteMany({});
    console.log('Cleared existing dropdowns');

    await DropdownMaster.insertMany(seedData);
    console.log('Inserted seed data successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seed();
