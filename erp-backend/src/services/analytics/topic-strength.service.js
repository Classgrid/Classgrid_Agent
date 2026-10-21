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

/**
 * Topic Strength Analysis Engine
 * ─────────────────────────────────────────────────────
 * Aggregates a student's performance across all Online Exams
 * and Advanced Quizzes to auto-tag topics as Weak / Average / Strong.
 *
 * Logic:
 *   For each exam section or quiz topic, we compute accuracy (correct / attempted).
 *   - >= 75% accuracy  → "strong"
 *   - 40% - 74%        → "average"
 *   - < 40%            → "weak"
 *
 * Data Sources:
 *   1. online_exam_attempts → section_responses (per-section correct/wrong)
 *   2. quiz_attempts        → responses (per-question correct/wrong)
 *   3. QuizSession (MongoDB) → subject + topic + score + percentage
 */

import { getChatSb } from "../../config/supabaseClient.js";
import QuizSession from "../../models/QuizSession.js";
import connectDB from "../../../config/db.js";

/**
 * Analyze a student's topic-wise strengths & weaknesses.
 * Returns an array of { topic, totalQuestions, correct, wrong, accuracy, strength }
 * sorted weakest-first so faculty dashboard can highlight problem areas.
 */
export async function analyzeStudentTopics(userId) {
    const supabase = getChatSb();
    const topicMap = {}; // { "Physics": { correct, wrong, total } }

    // ──────────────────────────────────────────────
    // 1. ONLINE EXAM DATA (Supabase — section-level)
    // ──────────────────────────────────────────────
    const { data: examAttempts } = await supabase
        .from('online_exam_attempts')
        .select('exam_id, section_responses, is_submitted')
        .eq('user_id', userId)
        .eq('is_submitted', true);

    if (examAttempts && examAttempts.length > 0) {
        const examIds = [...new Set(examAttempts.map(a => a.exam_id))];
        const { data: exams } = await supabase
            .from('online_exams')
            .select('id, sections')
            .in('id', examIds);

        const examMap = {};
        (exams || []).forEach(e => { examMap[e.id] = e; });

        for (const attempt of examAttempts) {
            const exam = examMap[attempt.exam_id];
            if (!exam || !exam.sections) continue;

            exam.sections.forEach((section, sIdx) => {
                const sectionName = section.name || `Section ${sIdx + 1}`;
                if (!topicMap[sectionName]) {
                    topicMap[sectionName] = { correct: 0, wrong: 0, unattempted: 0, total: 0, source: "exam" };
                }

                const responses = attempt.section_responses?.[sIdx] || {};
                section.questions.forEach((q, qIdx) => {
                    topicMap[sectionName].total += 1;
                    const resp = responses[qIdx];

                    if (!resp || resp.answer === null || resp.answer === undefined || resp.answer === '') {
                        topicMap[sectionName].unattempted += 1;
                    } else if (JSON.stringify(resp.answer) === JSON.stringify(q.correct_answer)) {
                        topicMap[sectionName].correct += 1;
                    } else {
                        topicMap[sectionName].wrong += 1;
                    }
                });
            });
        }
    }

    // ──────────────────────────────────────────────
    // 2. ADVANCED QUIZ DATA (Supabase — per-question)
    // ──────────────────────────────────────────────
    const { data: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, responses, score, is_submitted')
        .eq('user_id', userId)
        .eq('is_submitted', true);

    if (quizAttempts && quizAttempts.length > 0) {
        const quizIds = [...new Set(quizAttempts.map(a => a.quiz_id))];
        const { data: quizzes } = await supabase
            .from('advanced_quizzes')
            .select('id, title, questions, type')
            .in('id', quizIds);

        const quizMap = {};
        (quizzes || []).forEach(q => { quizMap[q.id] = q; });

        for (const attempt of quizAttempts) {
            const quiz = quizMap[attempt.quiz_id];
            if (!quiz || quiz.type === 'google') continue;

            // Use quiz title as topic label
            const topicLabel = quiz.title || "Untitled Quiz";
            if (!topicMap[topicLabel]) {
                topicMap[topicLabel] = { correct: 0, wrong: 0, unattempted: 0, total: 0, source: "quiz" };
            }

            const questionMap = new Map((quiz.questions || []).map(q => [q.question_id, q]));
            (attempt.responses || []).forEach(r => {
                const q = questionMap.get(r.question_id);
                if (!q) return;
                topicMap[topicLabel].total += 1;

                let isCorrect = false;
                if (typeof q.correct_answer === 'number') {
                    const selectedIdx = typeof r.selected_answer === 'number'
                        ? r.selected_answer
                        : (q.options || []).indexOf(r.selected_answer);
                    isCorrect = selectedIdx === q.correct_answer;
                } else {
                    isCorrect = String(r.selected_answer || '').trim() === String(q.correct_answer || '').trim();
                }

                if (isCorrect) topicMap[topicLabel].correct += 1;
                else topicMap[topicLabel].wrong += 1;
            });
        }
    }

    // ──────────────────────────────────────────────
    // 3. MONGO AI QUIZ SESSIONS (MongoDB — topic-level)
    // ──────────────────────────────────────────────
    await connectDB();
    const mongoSessions = await QuizSession.find({ userId })
        .select("subject topic score totalQuestions percentage")
        .lean();

    for (const session of mongoSessions) {
        const label = session.topic ? `${session.subject} — ${session.topic}` : session.subject;
        if (!topicMap[label]) {
            topicMap[label] = { correct: 0, wrong: 0, unattempted: 0, total: 0, source: "ai_quiz" };
        }
        topicMap[label].correct += session.score || 0;
        topicMap[label].wrong += (session.totalQuestions - session.score) || 0;
        topicMap[label].total += session.totalQuestions || 0;
    }

    // ──────────────────────────────────────────────
    // 4. COMPUTE STRENGTH RATINGS
    // ──────────────────────────────────────────────
    const results = Object.entries(topicMap).map(([topic, stats]) => {
        const attempted = stats.correct + stats.wrong;
        const accuracy = attempted > 0 ? Math.round((stats.correct / attempted) * 100) : 0;

        let strength;
        if (accuracy >= 75) strength = "strong";
        else if (accuracy >= 40) strength = "average";
        else strength = "weak";

        return {
            topic,
            totalQuestions: stats.total,
            attempted,
            correct: stats.correct,
            wrong: stats.wrong,
            unattempted: stats.unattempted,
            accuracy,
            strength,
            source: stats.source
        };
    });

    // Sort: weakest first so dashboards can highlight problem areas immediately
    results.sort((a, b) => a.accuracy - b.accuracy);

    return results;
}
