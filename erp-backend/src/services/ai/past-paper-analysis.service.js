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

import PastPaper from '../../models/PastPaper.js';
import { extractQuestionsFromImage } from './ocr-quiz.service.js';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });

/**
 * Past Paper Analysis Engine — Module 24 Extension
 * 
 * Pipeline: Image → Cloudflare Vision OCR → Normalize → MongoDB → Groq Analysis → Cached Results
 * 
 * Supports: 2, 3, 4, 5, 7, 10 year analysis windows
 */

// ──────────────────────────────────────────────────
// STEP 1: Ingest — Upload image, OCR extract, store in MongoDB
// ──────────────────────────────────────────────────
export async function ingestPastPaper({
    imageBuffer, mimeType, title, subject, year, month,
    semester, branch, university, examType,
    classroomId, organizationId, uploadedBy, fileUrl
}) {
    // Step 1a: OCR — Extract questions via Cloudflare Vision
    const rawQuestions = await extractQuestionsFromImage(imageBuffer, mimeType);

    // Step 1b: Normalize — Clean text for similarity matching
    const questions = rawQuestions.map(q => ({
        questionText: q.question || q.questionText || '',
        normalizedText: normalizeText(q.question || q.questionText || ''),
        options: q.options || [],
        correctAnswer: q.correct_answer || q.correctAnswer || '',
        marks: q.marks || 0,
        topic: '',           // Will be filled by AI analysis
        difficulty: 'unknown',
        questionType: q.type || 'other',
    }));

    // Step 1c: Store in MongoDB
    const paper = await PastPaper.create({
        classroom: classroomId,
        organization_id: organizationId,
        uploadedBy,
        title,
        subject: subject.toLowerCase().trim(),
        examType: examType || 'university',
        year,
        month: month || '',
        semester: semester || null,
        branch: branch || '',
        university: university || '',
        questions,
        totalQuestions: questions.length,
        totalMarks: questions.reduce((sum, q) => sum + (q.marks || 0), 0),
        sourceFile: {
            originalName: title,
            fileUrl: fileUrl || '',
            mimeType: mimeType || '',
        },
        status: 'extracted',
    });

    // Step 1d: Run AI topic detection asynchronously
    classifyTopics(paper._id).catch(err =>
        console.warn('[PastPaper] Topic classification failed:', err.message)
    );

    return paper;
}

// ──────────────────────────────────────────────────
// STEP 2: Normalize text for similarity matching
// ──────────────────────────────────────────────────
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ')        // Collapse whitespace
        .trim();
}

// ──────────────────────────────────────────────────
// STEP 3: AI Topic Classification (Groq Llama 3.3)
// ──────────────────────────────────────────────────
async function classifyTopics(paperId) {
    const paper = await PastPaper.findById(paperId);
    if (!paper) return;

    const questionTexts = paper.questions.map((q, i) =>
        `Q${i + 1}: ${q.questionText.substring(0, 150)}`
    ).join('\n');

    const response = await groq.chat.completions.create({
        model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
        messages: [{
            role: 'system',
            content: `You are an academic question classifier for the subject "${paper.subject}".
For each question, output a JSON array with objects: { "index": number, "topic": string, "difficulty": "easy"|"medium"|"hard" }.
Topic should be a short, standardized topic name (e.g., "Thermodynamics", "Linked Lists", "Integration").`
        }, {
            role: 'user',
            content: questionTexts
        }],
        temperature: 0.1,
        max_tokens: 2000,
    });

    try {
        const text = response.choices[0]?.message?.content || '';
        const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const classifications = JSON.parse(cleanedJson);

        classifications.forEach(c => {
            if (c.index >= 0 && c.index < paper.questions.length) {
                paper.questions[c.index].topic = c.topic || '';
                paper.questions[c.index].difficulty = c.difficulty || 'unknown';
            }
        });

        // Compute analysis cache
        const topicCounts = {};
        const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
        const typeCounts = { mcq: 0, short: 0, long: 0, numerical: 0 };

        paper.questions.forEach(q => {
            if (q.topic) topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
            if (q.difficulty in difficultyCounts) difficultyCounts[q.difficulty]++;
            if (q.questionType in typeCounts) typeCounts[q.questionType]++;
        });

        paper.analysis = {
            topTopics: Object.entries(topicCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([topic, count]) => ({
                    topic,
                    count,
                    percentage: Math.round((count / paper.totalQuestions) * 100)
                })),
            difficultyDistribution: difficultyCounts,
            questionTypeDistribution: typeCounts,
        };

        paper.status = 'analyzed';
        await paper.save();
    } catch (err) {
        console.warn('[PastPaper] Topic parse error:', err.message);
        paper.status = 'extracted'; // Keep as extracted even if classification fails
        await paper.save();
    }
}

// ──────────────────────────────────────────────────
// STEP 4: Multi-Year Analysis — Repeated Questions + Topic Frequency
// Supports: 2, 3, 4, 5, 7, 10 year windows
// ──────────────────────────────────────────────────
export async function analyzeMultiYear({
    classroomId, organizationId, subject, yearWindow = 5
}) {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - yearWindow;

    // Fetch all papers for this subject within the year window
    const papers = await PastPaper.find({
        ...(classroomId ? { classroom: classroomId } : { organization_id: organizationId }),
        subject: subject.toLowerCase().trim(),
        year: { $gte: startYear, $lte: currentYear },
        status: { $in: ['extracted', 'analyzed'] },
    }).sort({ year: -1 }).lean();

    if (papers.length === 0) {
        return {
            yearWindow,
            subject,
            papersFound: 0,
            message: `No papers found for "${subject}" in the last ${yearWindow} years.`,
        };
    }

    // Collect ALL questions across all years
    const allQuestions = [];
    papers.forEach(paper => {
        paper.questions.forEach(q => {
            allQuestions.push({
                ...q,
                year: paper.year,
                month: paper.month,
                examType: paper.examType,
                paperId: paper._id,
            });
        });
    });

    // ── Detect Repeated Questions ──
    // Group by normalized text similarity (exact + fuzzy)
    const repeatedMap = {};
    allQuestions.forEach(q => {
        const key = q.normalizedText || normalizeText(q.questionText);
        if (!repeatedMap[key]) {
            repeatedMap[key] = {
                questionText: q.questionText,
                topic: q.topic,
                appearances: [],
            };
        }
        repeatedMap[key].appearances.push({
            year: q.year,
            month: q.month,
            examType: q.examType,
        });
    });

    const repeatedQuestions = Object.values(repeatedMap)
        .filter(r => r.appearances.length >= 2) // Appeared 2+ times
        .sort((a, b) => b.appearances.length - a.appearances.length)
        .map(r => ({
            questionText: r.questionText,
            topic: r.topic,
            timesRepeated: r.appearances.length,
            years: r.appearances.map(a => `${a.year}${a.month ? ' ' + a.month : ''}`),
        }));

    // ── Topic Frequency Analysis ──
    const topicFrequency = {};
    allQuestions.forEach(q => {
        if (q.topic) {
            if (!topicFrequency[q.topic]) {
                topicFrequency[q.topic] = { count: 0, years: new Set() };
            }
            topicFrequency[q.topic].count++;
            topicFrequency[q.topic].years.add(q.year);
        }
    });

    const topTopics = Object.entries(topicFrequency)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([topic, data]) => ({
            topic,
            totalAppearances: data.count,
            yearsAppeared: [...data.years].sort((a, b) => b - a),
            consistency: Math.round((data.years.size / papers.length) * 100), // % of papers with this topic
            importance: data.years.size >= Math.ceil(papers.length * 0.7) ? 'MUST STUDY' :
                        data.years.size >= Math.ceil(papers.length * 0.4) ? 'IMPORTANT' : 'OCCASIONALLY ASKED',
        }));

    // ── Year-wise Question Distribution ──
    const yearDistribution = {};
    papers.forEach(p => {
        yearDistribution[p.year] = {
            title: p.title,
            totalQuestions: p.totalQuestions,
            totalMarks: p.totalMarks,
        };
    });

    return {
        yearWindow,
        subject,
        papersFound: papers.length,
        yearsAnalyzed: papers.map(p => p.year),
        totalQuestionsAcrossYears: allQuestions.length,

        // 🔥 Most Repeated Questions (for exam prep)
        repeatedQuestions: repeatedQuestions.slice(0, 25),
        totalRepeated: repeatedQuestions.length,

        // 📊 Topic Frequency (what to study)
        topTopics: topTopics.slice(0, 20),

        // 📅 Year-wise breakdown
        yearDistribution,
    };
}

// ──────────────────────────────────────────────────
// STEP 5: Generate AI-Powered Mock Test from Repeated/Important Questions
// ──────────────────────────────────────────────────
export async function generateMockFromPastPapers({
    classroomId, organizationId, subject, yearWindow = 5, questionCount = 20
}) {
    const analysis = await analyzeMultiYear({
        classroomId, organizationId, subject, yearWindow
    });

    if (analysis.papersFound === 0) return { error: analysis.message };

    // Priority order: repeated questions first, then questions from "MUST STUDY" topics
    const mockQuestions = [];

    // Add repeated questions (highest value)
    analysis.repeatedQuestions.slice(0, Math.ceil(questionCount * 0.5)).forEach(rq => {
        mockQuestions.push({
            questionText: rq.questionText,
            topic: rq.topic,
            source: `Repeated ${rq.timesRepeated}x (${rq.years.join(', ')})`,
            priority: 'HIGH — Repeated across years',
        });
    });

    // Fill remaining from "MUST STUDY" topics
    const mustStudyTopics = analysis.topTopics
        .filter(t => t.importance === 'MUST STUDY')
        .map(t => t.topic);

    // Fetch actual questions from these topics
    const currentYear = new Date().getFullYear();
    const topicPapers = await PastPaper.find({
        ...(classroomId ? { classroom: classroomId } : { organization_id: organizationId }),
        subject: subject.toLowerCase().trim(),
        year: { $gte: currentYear - yearWindow },
        'questions.topic': { $in: mustStudyTopics },
    }).lean();

    const topicQuestions = [];
    topicPapers.forEach(p => {
        p.questions.forEach(q => {
            if (mustStudyTopics.includes(q.topic)) {
                topicQuestions.push({
                    questionText: q.questionText,
                    topic: q.topic,
                    source: `${p.year} ${p.month || ''} — ${p.title}`,
                    priority: 'MEDIUM — From frequently tested topic',
                });
            }
        });
    });

    // Deduplicate and fill
    const existingTexts = new Set(mockQuestions.map(q => normalizeText(q.questionText)));
    topicQuestions.forEach(q => {
        if (mockQuestions.length >= questionCount) return;
        const norm = normalizeText(q.questionText);
        if (!existingTexts.has(norm)) {
            existingTexts.add(norm);
            mockQuestions.push(q);
        }
    });

    return {
        subject,
        yearWindow,
        papersAnalyzed: analysis.papersFound,
        mockTestQuestions: mockQuestions.slice(0, questionCount),
        totalAvailable: mockQuestions.length,
        studyPriorities: analysis.topTopics.slice(0, 10),
    };
}

// ──────────────────────────────────────────────────
// STEP 6: Get All Papers for a Subject (for frontend listing)
// ──────────────────────────────────────────────────
export async function listPastPapers({ classroomId, organizationId, subject }) {
    const query = {
        ...(classroomId ? { classroom: classroomId } : { organization_id: organizationId }),
        ...(subject ? { subject: subject.toLowerCase().trim() } : {}),
    };

    return PastPaper.find(query)
        .select('title subject year month examType totalQuestions totalMarks status createdAt')
        .sort({ year: -1, createdAt: -1 })
        .lean();
}
