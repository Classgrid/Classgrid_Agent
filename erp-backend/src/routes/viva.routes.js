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

import express from "express";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import VivaRecord from "../models/VivaRecord.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import { bulkDispatchNotification } from "../services/notification.service.js";
import { getChatReply } from "../services/chat.js";
import Groq from "groq-sdk";
import mongoose from "mongoose";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });

// ═══════════════════════════════════════════════════════════════
// VIVA SCHEDULE MODEL (Inline — Faculty schedules class-wide vivas)
// ═══════════════════════════════════════════════════════════════
const VivaScheduleSchema = new mongoose.Schema({
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    createdBy: { type: String, required: true }, // Faculty user ID
    topic: { type: String, required: true },
    subject: { type: String },
    mode: { type: String, enum: ['practice', 'exam', 'rapid_fire'], default: 'exam' },
    status: { type: String, enum: ['scheduled', 'active', 'completed'], default: 'scheduled' },
    scheduledAt: { type: Date, required: true },
    deadline: { type: Date },
    thinkingTimeSec: { type: Number, default: 20 },      // Seconds allowed per question
    totalQuestions: { type: Number, default: 5 },
    settings: {
        voiceRequired: { type: Boolean, default: false },
        hintsAllowed: { type: Boolean, default: false },
        autoTriggerFromExam: { type: Boolean, default: false } // AI Learning Loop trigger
    }
}, { timestamps: true });

const VivaSchedule = mongoose.models.VivaSchedule || mongoose.model('VivaSchedule', VivaScheduleSchema);


// ═══════════════════════════════════════════════════════════════
// 🎯 VIVA SYSTEM PROMPT GENERATOR
// Dynamically constructs persona based on Practice, Exam, or Rapid Fire
// ═══════════════════════════════════════════════════════════════
const getVivaSystemPrompt = (mode, topic, studentName, thinkingTimeSec = 20, totalQuestions = 5) => {
    const base = `You are a high-level academic examiner conducting a VIVA (ORAL EXAM) for ${studentName} on the topic of "${topic}".
    
    PERSONA RULES:
    - Maintain strict academic rigor but be encouraging.
    - Ask ONE question at a time.
    - Never give away the answer; guide the student if they are close.
    - The student has ${thinkingTimeSec} seconds to think per question (if they exceed this, note it as hesitation).
    - Conduct exactly ${totalQuestions} questions before ending the session.
    
    BEHAVIORAL RULES (Follow-Up Logic):
    1. If the answer is PARTIAL: Ask a follow-up for clarification ("Can you elaborate on X?").
    2. If the answer is WRONG: Ask a simpler foundational fallback question to find their base level.
    3. If the answer is STRONG: Ask a difficult "Application-Based" or "Critical Thinking" question.
    4. If the student says "I don't know" or hesitates too long: Mark as a confidence lapse, say "Let's move on", and proceed.
    5. If the student's answer shows misconception: Politely challenge with "Are you sure about that? Think again."
    
    SCORING PROTOCOL:
    After all ${totalQuestions} questions, you MUST output a JSON block wrapped in triple backticks.
    Evaluate across 4 parameters:
    \`\`\`json
    {
      "knowledge": (0-5),
      "clarity": (0-5),
      "confidence": (0-5),
      "accuracy": (0-5),
      "totalScore": (weighted average 0-5),
      "weakAreas": ["specific sub-topic 1", "specific sub-topic 2"],
      "strongAreas": ["specific sub-topic 1"],
      "feedback": "2-3 sentence examiner summary."
    }
    \`\`\`
    
    MODE-SPECIFIC INSTRUCTIONS:`;

    const modes = {
        practice: `
        - MODE: 🟢 PRACTICE (Friendly)
        - You CAN provide small hints if the student is stuck (e.g., "Think about Newton's Third Law...").
        - Explain why an answer is wrong immediately after they answer.
        - Tone: Supportive tutor, celebrating correct answers with enthusiasm.
        - Timer pressure is relaxed.`,
        
        exam: `
        - MODE: 🔴 EXAM (Strict)
        - NO HINTS. NO EXPLANATIONS during the session.
        - If they don't know, say "Let's move on" coldly and proceed to the next question.
        - Tone: Formal University Professor conducting a semester viva.
        - ${thinkingTimeSec}-second timer is strictly enforced. If they take too long, mark confidence as weak.
        - Do NOT reveal correct answers until the final evaluation.`,
        
        rapid_fire: `
        - MODE: 🔵 RAPID FIRE (High-Speed)
        - Short, punchy questions focusing on definitions, formulas, and instant recall.
        - Maximum 10 seconds per answer expected.
        - If they hesitate even slightly, move on immediately.
        - Questions should be one-liners, not paragraphs.
        - Tone: Fast-paced quiz show host.`
    };

    return `${base}\n${modes[mode] || modes.practice}\n\nStart the viva by introducing yourself briefly and asking the first question.`;
};


// ═══════════════════════════════════════════════════════════════
// STUDENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/viva/initialize
 * Start a new Viva session (self-initiated or from a scheduled viva).
 */
router.post("/initialize", isAuthenticated, async (req, res) => {
    try {
        const { topic, subject, mode, classroomId, scheduleId, thinkingTimeSec, totalQuestions } = req.body;
        const studentName = req.user.name || "Student";
        const vivaMode = mode || 'practice';

        // If this is a scheduled viva, validate it
        let schedule = null;
        if (scheduleId) {
            schedule = await VivaSchedule.findById(scheduleId);
            if (!schedule) return res.status(404).json({ error: "Scheduled viva not found" });
            if (schedule.status === 'completed') return res.status(403).json({ error: "This viva session has expired" });
        }

        const actualTopic = schedule?.topic || topic;
        const actualMode = schedule?.mode || vivaMode;
        const actualThinkingTime = schedule?.thinkingTimeSec || thinkingTimeSec || 20;
        const actualTotalQuestions = schedule?.totalQuestions || totalQuestions || 5;

        const systemPrompt = getVivaSystemPrompt(actualMode, actualTopic, studentName, actualThinkingTime, actualTotalQuestions);
        
        // Generate the introductory question from the AI
        const firstMessage = await getChatReply("Begin the viva session.", "groq", "chat", `[VIVA SYSTEM PROMPT]\n${systemPrompt}`);
        
        res.json({
            sessionId: Date.now().toString(),
            introduction: firstMessage,
            systemPrompt,
            config: {
                mode: actualMode,
                topic: actualTopic,
                thinkingTimeSec: actualThinkingTime,
                totalQuestions: actualTotalQuestions,
                voiceRequired: schedule?.settings?.voiceRequired || false,
                hintsAllowed: actualMode === 'practice'
            }
        });
    } catch (err) {
        console.error("Viva Init Error:", err);
        res.status(500).json({ error: "Failed to initialize viva session" });
    }
});

/**
 * POST /api/viva/evaluate-session
 * Final step: Pass transcript + timing metadata to AI for 4-parameter evaluation.
 * Saves result permanently to VivaRecord in MongoDB.
 */
router.post("/evaluate-session", isAuthenticated, async (req, res) => {
    try {
        const { 
            transcript, 
            topic, 
            subject, 
            mode, 
            classroomId, 
            scheduleId,
            // Thinking Time + Pressure Tracking
            thinkingTimes,     // Array of seconds per question: [5, 12, 8, 20, 3]
            // Voice Confidence Metadata
            voiceMetadata      // { avgPauseDuration, hesitationCount, speechRate }
        } = req.body;

        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        // Calculate thinking time averages
        const avgThinkingTime = thinkingTimes && thinkingTimes.length > 0
            ? Math.round(thinkingTimes.reduce((a, b) => a + b, 0) / thinkingTimes.length)
            : null;

        const evaluationPrompt = `Analyze the following Viva (Oral Exam) transcript and provide a structured JSON evaluation.
        
        Topic: ${topic}
        Mode: ${mode}
        Average Thinking Time Per Question: ${avgThinkingTime || 'Not tracked'} seconds
        Voice Metadata: ${voiceMetadata ? JSON.stringify(voiceMetadata) : 'Not available'}
        
        TRANSCRIPT:
        ${JSON.stringify(transcript)}
        
        EVALUATION CRITERIA:
        - knowledge (0-5): Depth of theoretical understanding demonstrated.
        - clarity (0-5): Ability to explain concepts simply and logically.
        - confidence (0-5): Speed of response, assertiveness, lack of hesitation. Factor in thinking times if provided — long pauses (>15s) suggest lower confidence.
        - accuracy (0-5): Technical correctness of facts, formulas, and definitions.
        
        You must return ONLY a valid JSON object with this exact structure:
        {
          "knowledge": (0-5),
          "clarity": (0-5),
          "confidence": (0-5),
          "accuracy": (0-5),
          "totalScore": (0-5 weighted average),
          "weakAreas": ["specific sub-topic 1", "specific sub-topic 2"],
          "strongAreas": ["specific sub-topic 1"],
          "feedback": "Concise paragraph summarizing performance and specific improvements needed."
        }`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: evaluationPrompt }],
            model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
            response_format: { type: "json_object" }
        });

        const report = JSON.parse(completion.choices[0].message.content);

        // Calculate session duration from transcript timestamps
        let durationSeconds = null;
        if (transcript && transcript.length >= 2) {
            const first = new Date(transcript[0]?.timestamp);
            const last = new Date(transcript[transcript.length - 1]?.timestamp);
            if (!isNaN(first) && !isNaN(last)) {
                durationSeconds = Math.round((last - first) / 1000);
            }
        }

        // Compute voice confidence score from metadata
        let voiceConfidenceScore = null;
        if (voiceMetadata) {
            // Higher speech rate + fewer hesitations = higher confidence
            const hesitationPenalty = (voiceMetadata.hesitationCount || 0) * 5;
            const pausePenalty = Math.min(30, (voiceMetadata.avgPauseDuration || 0) * 10);
            voiceConfidenceScore = Math.max(0, 100 - hesitationPenalty - pausePenalty);
        }

        // Save to Database
        const newRecord = new VivaRecord({
            userId,
            classroomId: classroomId || null,
            topic,
            subject,
            mode: mode || 'practice',
            totalScore: report.totalScore,
            parameters: {
                knowledge: report.knowledge,
                clarity: report.clarity,
                confidence: report.confidence,
                accuracy: report.accuracy
            },
            weakAreas: report.weakAreas || [],
            strongAreas: report.strongAreas || [],
            feedback: report.feedback,
            sessionTranscript: transcript.map(t => ({ 
                role: t.role, 
                content: t.content,
                timestamp: t.timestamp ? new Date(t.timestamp) : new Date()
            })),
            durationSeconds,
            status: 'completed',
            metadata: {
                voiceConfidence: voiceConfidenceScore,
                thinkingTimeAvg: avgThinkingTime
            }
        });

        await newRecord.save();

        res.json({
            message: "Viva evaluated and saved successfully",
            vivaId: newRecord._id,
            report: {
                ...report,
                durationSeconds,
                avgThinkingTime,
                voiceConfidence: voiceConfidenceScore
            }
        });

    } catch (err) {
        console.error("Viva Evaluation Error:", err);
        res.status(500).json({ error: "Failed to evaluate viva session" });
    }
});

/**
 * GET /api/viva/history
 * Fetch student's viva history with progress tracking data
 */
router.get("/history", isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id ? req.user._id.toString() : req.user.id;
        const history = await VivaRecord.find({ userId })
            .sort({ createdAt: -1 })
            .select("-sessionTranscript") // Don't send full transcripts in list view
            .lean();

        // Compute improvement trend
        let trend = "stable";
        if (history.length >= 3) {
            const recent = history.slice(0, 3).map(h => h.totalScore);
            const older = history.slice(-3).map(h => h.totalScore);
            const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
            const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
            if (avgRecent - avgOlder > 0.5) trend = "improving";
            else if (avgOlder - avgRecent > 0.5) trend = "declining";
        }

        // Aggregate weak areas across all sessions
        const weakAreaFrequency = {};
        history.forEach(h => {
            (h.weakAreas || []).forEach(area => {
                weakAreaFrequency[area] = (weakAreaFrequency[area] || 0) + 1;
            });
        });
        const persistentWeakAreas = Object.entries(weakAreaFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([area, count]) => ({ area, frequency: count }));

        res.json({
            totalSessions: history.length,
            trend,
            persistentWeakAreas,
            avgScore: history.length > 0
                ? Math.round((history.reduce((sum, h) => sum + h.totalScore, 0) / history.length) * 100) / 100
                : 0,
            sessions: history
        });
    } catch (err) {
        console.error("Viva History Error:", err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

/**
 * GET /api/viva/:vivaId/transcript
 * Get the full transcript and detailed report for a specific viva session
 */
router.get("/:vivaId/transcript", isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id ? req.user._id.toString() : req.user.id;
        const record = await VivaRecord.findOne({ _id: req.params.vivaId, userId }).lean();
        if (!record) return res.status(404).json({ error: "Viva record not found" });
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch transcript" });
    }
});

/**
 * GET /api/viva/scheduled
 * Get all scheduled vivas for the student's classrooms
 */
router.get("/scheduled", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const { default: ClassroomMembership } = await import("../models/ClassroomMembership.js");
        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        const memberships = await ClassroomMembership.find({ userId, status: 'approved' }).select('classroomId').lean();
        const classroomIds = memberships.map(m => m.classroomId);

        const schedules = await VivaSchedule.find({
            classroomId: { $in: classroomIds },
            status: { $in: ['scheduled', 'active'] }
        }).sort({ scheduledAt: 1 }).lean();

        // Check which ones the student has already completed
        const completedVivaTopics = await VivaRecord.find({ userId })
            .select('topic classroomId')
            .lean();

        const completedSet = new Set(completedVivaTopics.map(v => `${v.classroomId}_${v.topic}`));

        const enriched = schedules.map(s => ({
            ...s,
            alreadyCompleted: completedSet.has(`${s.classroomId}_${s.topic}`)
        }));

        res.json(enriched);
    } catch (err) {
        console.error("Scheduled Viva Error:", err);
        res.status(500).json({ error: "Failed to fetch scheduled vivas" });
    }
});


// ═══════════════════════════════════════════════════════════════
// FACULTY ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/viva/schedule
 * Faculty schedules a class-wide viva for a specific topic
 */
router.post("/schedule", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const {
            classroomId,
            topic,
            subject,
            mode,
            scheduledAt,
            deadline,
            thinkingTimeSec,
            totalQuestions,
            settings
        } = req.body;

        if (!classroomId || !topic || !scheduledAt) {
            return res.status(400).json({ error: "classroomId, topic, and scheduledAt are required" });
        }

        const schedule = new VivaSchedule({
            classroomId,
            createdBy: req.user._id ? req.user._id.toString() : req.user.id,
            topic,
            subject,
            mode: mode || 'exam',
            scheduledAt: new Date(scheduledAt),
            deadline: deadline ? new Date(deadline) : null,
            thinkingTimeSec: thinkingTimeSec || 20,
            totalQuestions: totalQuestions || 5,
            settings: settings || {}
        });

        await schedule.save();

        // 🔔 Push notification to all students in classroomId
        try {
            const members = await ClassroomMembership.find({ classroom: classroomId, status: "approved" }).select("student").lean();
            const studentIds = members.map(m => m.student.toString());
            
            if (studentIds.length > 0) {
                await bulkDispatchNotification({
                    recipientIds: studentIds,
                    type: "viva_scheduled",
                    title: `🎙️ New Viva Scheduled`,
                    message: `A viva for "${topic}" has been scheduled for ${new Date(scheduledAt).toLocaleString()}.`,
                    link: `/modules/viva`, // Deep link to viva module
                });
            }
        } catch (notifErr) {
            console.error("[Viva] Notification error:", notifErr.message);
        }

        res.status(201).json({
            message: `Viva scheduled for "${topic}" successfully`,
            schedule
        });
    } catch (err) {
        console.error("Viva Schedule Error:", err);
        res.status(500).json({ error: "Failed to schedule viva" });
    }
});

/**
 * GET /api/viva/faculty/dashboard/:classroomId
 * Faculty dashboard: View all student viva results for a classroom
 */
router.get("/faculty/dashboard/:classroomId", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { default: User } = await import("../models/User.js");
        const { classroomId } = req.params;

        // Get all viva records for this classroom
        const records = await VivaRecord.find({ classroomId })
            .sort({ createdAt: -1 })
            .select("-sessionTranscript")
            .lean();

        // Get unique student IDs
        const studentIds = [...new Set(records.map(r => r.userId))];

        // Fetch student names
        const students = await User.find({ _id: { $in: studentIds } }).select('name prn email').lean();
        const studentMap = {};
        students.forEach(s => { studentMap[s._id.toString()] = s; });

        // Group by student, compute averages
        const studentSummaries = [];
        const groupedByStudent = {};
        records.forEach(r => {
            if (!groupedByStudent[r.userId]) groupedByStudent[r.userId] = [];
            groupedByStudent[r.userId].push(r);
        });

        for (const [userId, vivaRecords] of Object.entries(groupedByStudent)) {
            const student = studentMap[userId];
            const avgScore = Math.round(
                (vivaRecords.reduce((sum, v) => sum + v.totalScore, 0) / vivaRecords.length) * 100
            ) / 100;

            // Aggregate weak areas across sessions
            const weakAreas = {};
            vivaRecords.forEach(v => {
                (v.weakAreas || []).forEach(area => {
                    weakAreas[area] = (weakAreas[area] || 0) + 1;
                });
            });

            const topWeakAreas = Object.entries(weakAreas)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([area]) => area);

            studentSummaries.push({
                userId,
                studentName: student?.name || 'Unknown',
                prn: student?.prn || 'N/A',
                email: student?.email || '',
                totalSessions: vivaRecords.length,
                avgScore,
                latestScore: vivaRecords[0]?.totalScore || 0,
                latestDate: vivaRecords[0]?.createdAt,
                persistentWeakAreas: topWeakAreas,
                latestParameters: vivaRecords[0]?.parameters || {}
            });
        }

        // Sort by average score (weakest first so faculty can prioritize)
        studentSummaries.sort((a, b) => a.avgScore - b.avgScore);

        // Get scheduled vivas for this classroom
        const schedules = await VivaSchedule.find({ classroomId }).sort({ scheduledAt: -1 }).lean();

        res.json({
            totalStudents: studentSummaries.length,
            totalSessions: records.length,
            classAvgScore: studentSummaries.length > 0
                ? Math.round((studentSummaries.reduce((sum, s) => sum + s.avgScore, 0) / studentSummaries.length) * 100) / 100
                : 0,
            students: studentSummaries,
            scheduledVivas: schedules
        });
    } catch (err) {
        console.error("Faculty Viva Dashboard Error:", err);
        res.status(500).json({ error: "Failed to load faculty viva dashboard" });
    }
});

/**
 * GET /api/viva/faculty/student/:studentId
 * Faculty views detailed viva history for a specific student
 */
router.get("/faculty/student/:studentId", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { default: User } = await import("../models/User.js");
        const student = await User.findById(req.params.studentId).select('name prn email').lean();

        const records = await VivaRecord.find({ userId: req.params.studentId })
            .sort({ createdAt: -1 })
            .lean();

        // Progress over time data (for improvement graph)
        const progressData = records.map(r => ({
            date: r.createdAt,
            topic: r.topic,
            totalScore: r.totalScore,
            knowledge: r.parameters?.knowledge,
            clarity: r.parameters?.clarity,
            confidence: r.parameters?.confidence,
            accuracy: r.parameters?.accuracy,
            mode: r.mode,
            thinkingTimeAvg: r.metadata?.thinkingTimeAvg,
            voiceConfidence: r.metadata?.voiceConfidence
        })).reverse(); // Oldest first for graph

        res.json({
            student: student || { name: 'Unknown' },
            totalSessions: records.length,
            progressData,
            detailedRecords: records
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch student viva data" });
    }
});

/**
 * PATCH /api/viva/schedule/:scheduleId/activate
 * Faculty activates a scheduled viva so students can start it
 */
router.patch("/schedule/:scheduleId/activate", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const schedule = await VivaSchedule.findByIdAndUpdate(
            req.params.scheduleId,
            { status: 'active' },
            { returnDocument: 'after' }
        );
        if (!schedule) return res.status(404).json({ error: "Schedule not found" });
        res.json({ message: "Viva is now active", schedule });
    } catch (err) {
        res.status(500).json({ error: "Failed to activate viva" });
    }
});

/**
 * PATCH /api/viva/schedule/:scheduleId/complete
 * Faculty marks a scheduled viva as completed
 */
router.patch("/schedule/:scheduleId/complete", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const schedule = await VivaSchedule.findByIdAndUpdate(
            req.params.scheduleId,
            { status: 'completed' },
            { returnDocument: 'after' }
        );
        if (!schedule) return res.status(404).json({ error: "Schedule not found" });
        res.json({ message: "Viva marked as completed", schedule });
    } catch (err) {
        res.status(500).json({ error: "Failed to complete viva" });
    }
});


export default router;
