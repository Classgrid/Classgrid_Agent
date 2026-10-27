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
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
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

import Groq from 'groq-sdk';
import AttendanceRecord from '../../models/AttendanceRecord.js';
import StudentMark from '../../models/StudentMark.js';
import QuizSession from '../../models/QuizSession.js';
import User from '../../models/User.js';

const groq = new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });

/**
 * generateStudentPersona
 * Analyzes a student's performance data and returns a personalized study persona and plan.
 */
export const generateStudentPersona = async (studentId, orgId) => {
    try {
        // 1. Fetch Student Profile
        const student = await User.findById(studentId).select('name email branch year batch academic_config');
        if (!student) throw new Error("Student not found");

        // 2. Fetch Recent Attendance (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const attendanceCount = await AttendanceRecord.countDocuments({
            student: studentId,
            markedAt: { $gte: thirtyDaysAgo }
        });

        // 3. Fetch Last 5 Marks
        const recentMarks = await StudentMark.find({ student: studentId })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // 4. Fetch Last 5 Quiz Sessions
        const recentQuizzes = await QuizSession.find({ userId: studentId })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // 5. Aggregate Data for Prompt
        const dataContext = {
            name: student.name,
            attendanceLast30Days: attendanceCount,
            academicProgress: recentMarks.map(m => ({
                exam: m.examRecord,
                percentage: m.percentage,
                grade: m.grade,
                subjects: m.subjectMarks.map(s => `${s.subjectName}:${s.marksObtained}/${s.maxMarks}`).join(', ')
            })),
            quizPerformance: recentQuizzes.map(q => ({
                topic: q.topic,
                score: `${q.score}/${q.totalQuestions}`,
                percentage: q.percentage
            }))
        };

        // 6. Request AI Analysis
        const systemPrompt = `You are the Classgrid AI Academic Coach. 
Analyze the provided student data and generate a "Student Persona" and a highly personalized "1-Week Improvement Plan".
Follow this output format strictly (Valid JSON):
{
  "personaName": "The Inconsistent High-Achiever", 
  "analysis": "A brief 2-sentence summary of their current standing.",
  "strengths": ["Physics", "Problem Solving"],
  "weaknesses": ["Attendance", "Regularity in Math"],
  "improvementPlan": [
    {"day": "Day 1-2", "focus": "Revise X topics", "reason": "Low scores in recent quiz"},
    {"day": "Day 3-4", "focus": "...", "reason": "..."},
    {"day": "Day 5-7", "focus": "...", "reason": "..."}
  ],
  "coachMotivation": "A short encouraging sentence."
}`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `STUDENT DATA:\n${JSON.stringify(dataContext, null, 2)}` }
            ],
            model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
            temperature: 0.5,
            response_format: { type: "json_object" }
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (err) {
        console.error("[Persona Service] Error:", err);
        throw new Error(`Failed to generate student persona: ${err.message}`);
    }
};
