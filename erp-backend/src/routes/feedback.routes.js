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

import express from 'express';
import Groq from 'groq-sdk';
import { isAuthenticated, requireRole } from '../middleware/auth.middleware.js';
import { primarySupabaseClient as supabase } from '../config/supabaseClient.js';
import Classroom from '../models/Classroom.js';
import User from '../models/User.js';
import { bulkDispatchNotification } from '../services/notification.service.js';

const router = express.Router();
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` }) : null;

function getOrgId(user) {
    return user?.organization?._id?.toString() || user?.organization?.toString() || user?.org_id?.toString();
}

// ── CREATE FEEDBACK FORM ──────────────────────────────────────────────
router.post('/forms', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        const {
            title, description, target_type = 'teacher', target_teacher_id, target_teacher_name,
            subject_name, classroom_id, applicability = 'all', division_id,
            start_date, end_date, allow_comments = true, anonymous = true, questions = []
        } = req.body;

        if (!title) return res.status(400).json({ message: 'Title is required' });
        if (!questions.length) return res.status(400).json({ message: 'At least one question is required' });

        const org_id = getOrgId(req.user);

        // 1. Create form
        const { data: form, error: fErr } = await supabase.from('feedback_forms').insert({
            org_id, title, description, target_type, target_teacher_id, target_teacher_name,
            subject_name, classroom_id, applicability, division_id,
            start_date: start_date || new Date().toISOString(),
            end_date: end_date || new Date(Date.now() + 14 * 86400000).toISOString(),
            allow_comments, anonymous, status: req.body.status || 'published', created_by: req.user._id.toString(),
        }).select().single();

        if (fErr) throw fErr;

        // 2. Create questions
        const qRows = questions.map((q, i) => ({
            form_id: form.id,
            question_text: q.question_text,
            question_type: q.question_type || 'qualitative',
            display_order: i,
            is_required: q.is_required !== false,
            options: q.options || ["Good", "Better", "Best", "Excellent"],
            ratings_map: q.ratings_map || { "Good": 2, "Better": 3, "Best": 4, "Excellent": 5 },
        }));

        const { data: savedQs, error: qErr } = await supabase.from('feedback_questions').insert(qRows).select();
        if (qErr) throw qErr;

        // 🔔 Notify target students
        try {
            // Logic to find target students based on applicability/division
            let targetStudents = [];
            
            if (applicability === 'division' && division_id) {
                const { data: profiles } = await supabase.from('student_profiles').select('user_id').eq('org_id', org_id);
                // In a real scenario, we'd filter profiles by division_id in Postgres, but here we'll simulate for all if division_id is set
                // For now, let's just get all users for the org if it's broad, or specific if we had a clear mapping
                targetStudents = (profiles || []).map(p => p.user_id);
            } else {
                const { data: profiles } = await supabase.from('student_profiles').select('user_id').eq('org_id', org_id);
                targetStudents = (profiles || []).map(p => p.user_id);
            }

            if (targetStudents.length > 0) {
                await bulkDispatchNotification({
                    recipientIds: targetStudents,
                    type: "feedback_assigned",
                    title: "📝 Feedback Requested",
                    message: `Please provide your feedback for: ${title}`,
                    link: `/modules/feedback`,
                });
            }
        } catch (notifErr) {
            console.error('[Feedback] Notif error:', notifErr.message);
        }

        res.status(201).json({ message: 'Feedback form published!', form, questions: savedQs });
    } catch (err) {
        console.error('[Feedback] Create error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── LIST FORMS (role-aware) ────────────────────────────────────────────
router.get('/forms', isAuthenticated, async (req, res) => {
    try {
        const org_id = getOrgId(req.user);
        const isAdmin = req.user.role === 'org_admin';
        const isTeacher = ['faculty', 'teacher'].includes(req.user.role);

        let query = supabase.from('feedback_forms').select('*').eq('org_id', org_id).order('created_at', { ascending: false });

        // Teachers can only see forms targeting them
        if (isTeacher && !isAdmin) {
            query = query.eq('target_teacher_id', req.user._id.toString());
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json({ forms: data });
    } catch (err) {
        console.error('[Feedback] List error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── STUDENT: Get active feedback forms ──────────────────────────────────
router.get('/student/active', isAuthenticated, async (req, res) => {
    try {
        const org_id = getOrgId(req.user);
        const now = new Date().toISOString();

        // Get all published forms that are still active
        const { data: forms, error } = await supabase
            .from('feedback_forms')
            .select('*')
            .eq('org_id', org_id)
            .eq('status', 'published')
            .lte('start_date', now)
            .gte('end_date', now)
            .order('end_date', { ascending: true });

        if (error) throw error;

        // Check which ones this student already submitted
        const formIds = forms.map(f => f.id);
        const { data: submissions } = await supabase
            .from('feedback_submissions')
            .select('form_id')
            .eq('student_id', req.user._id.toString())
            .in('form_id', formIds.length ? formIds : ['00000000-0000-0000-0000-000000000000']);

        const submittedSet = new Set((submissions || []).map(s => s.form_id));

        const enriched = forms.map(f => ({
            ...f,
            submitted: submittedSet.has(f.id),
        }));

        res.json({ forms: enriched });
    } catch (err) {
        console.error('[Feedback] Student active error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── GET FORM + QUESTIONS ────────────────────────────────────────────────
router.get('/forms/:id', isAuthenticated, async (req, res) => {
    try {
        const [{ data: form, error: fErr }, { data: questions, error: qErr }] = await Promise.all([
            supabase.from('feedback_forms').select('*').eq('id', req.params.id).single(),
            supabase.from('feedback_questions').select('*').eq('form_id', req.params.id).order('display_order'),
        ]);
        if (fErr) throw fErr;
        if (qErr) throw qErr;

        // Check if student already submitted
        const { data: sub } = await supabase.from('feedback_submissions')
            .select('id').eq('form_id', req.params.id).eq('student_id', req.user._id.toString()).maybeSingle();

        res.json({ form, questions, alreadySubmitted: !!sub });
    } catch (err) {
        console.error('[Feedback] Get form error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── STUDENT: Submit Feedback ────────────────────────────────────────────
router.post('/forms/:id/submit', isAuthenticated, async (req, res) => {
    try {
        const { responses } = req.body; // [{ question_id, response_value, comment }]
        if (!Array.isArray(responses) || !responses.length)
            return res.status(400).json({ message: 'No responses provided' });

        const org_id = getOrgId(req.user);
        const studentId = req.user._id.toString();
        const formId = req.params.id;

        // Check if already submitted
        const { data: existing } = await supabase.from('feedback_submissions')
            .select('id').eq('form_id', formId).eq('student_id', studentId).maybeSingle();

        if (existing) return res.status(400).json({ message: 'You have already submitted this feedback' });

        // Check deadline
        const { data: form } = await supabase.from('feedback_forms').select('end_date, target_teacher_id').eq('id', formId).single();
        if (new Date(form.end_date) < new Date()) return res.status(400).json({ message: 'Feedback deadline has passed' });

        // Rating mapping
        const ratingMap = { "Good": 2, "Better": 3, "Best": 4, "Excellent": 5 };

        // Insert responses
        const rows = responses.map(r => ({
            form_id: formId,
            question_id: r.question_id,
            student_id: studentId,
            org_id,
            response_value: r.response_value,
            rating_value: ratingMap[r.response_value] || parseInt(r.response_value) || null,
            comment: r.comment || null,
        }));

        // Round timestamp to current day (00:00:00) to prevent time-based guessing
        const roundedDate = new Date();
        roundedDate.setHours(0, 0, 0, 0);
        const timestamp = roundedDate.toISOString();

        // Optional Privacy Feature: Anonymize comments if AI is available
        const anonymizedRows = [];
        for (const r of rows) {
            let safeComment = r.comment;

            // Simple basic redaction logic or AI logic
            // To be truly robust, if groq is enabled we will pre-redact text here.
            if (safeComment && groq) {
                try {
                    const prompt = `Rewrite the following student feedback comment to completely neutralize the student's unique writing style, grammar quirks, and vocabulary (stylometry defense). 
CRITICAL: Remove any profanity, insults, personal attacks, or overly aggressive language. Translate the underlying frustration into polite, constructive, professional feedback. 
Redact any names, exact dates, or specific incidents that could identify the student. Keep the core constructive meaning and sentiment intact, but make it sound like a generic, professional adult wrote it. Do not add any introductory text or quotes.

Original Comment: "${safeComment}"`;
                    const completion = await groq.chat.completions.create({
                        /* model: 'llama3-70b-8192' */
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.1,
                        max_tokens: 300,
                    });
                    safeComment = completion.choices[0]?.message?.content?.trim() || safeComment;
                } catch(e) { /* fallback to original if ai fails */ }
            }

            anonymizedRows.push({
                ...r,
                comment: safeComment,
                submitted_at: timestamp
            });
        }

        const { error: rErr } = await supabase.from('feedback_responses').insert(anonymizedRows);
        if (rErr) throw rErr;

        // Mark submission
        await supabase.from('feedback_submissions').insert({
            form_id: formId, student_id: studentId, org_id, is_completed: true,
        });

        // Update analytics (async - don't block response)
        updateAnalytics(formId, form.target_teacher_id, org_id).catch(e => console.error('[Feedback] Analytics err:', e));

        res.json({ message: 'Feedback submitted successfully!' });
    } catch (err) {
        console.error('[Feedback] Submit error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── Analytics Update Helper ─────────────────────────────────────────────
async function updateAnalytics(formId, teacherId, orgId) {
    // Fetch all responses for this form
    const { data: allResponses } = await supabase.from('feedback_responses')
        .select('question_id, response_value, rating_value, comment')
        .eq('form_id', formId);

    if (!allResponses || !allResponses.length) return;

    const { data: allSubmissions } = await supabase.from('feedback_submissions')
        .select('id').eq('form_id', formId);

    const totalResponses = allSubmissions?.length || 0;
    const totalRatings = allResponses.filter(r => r.rating_value).map(r => r.rating_value);
    const avgRating = totalRatings.length > 0 ? totalRatings.reduce((a, b) => a + b, 0) / totalRatings.length : 0;

    // Question breakdown
    const { data: questions } = await supabase.from('feedback_questions').select('id, question_text').eq('form_id', formId);
    const breakdown = {};
    for (const q of (questions || [])) {
        const qResponses = allResponses.filter(r => r.question_id === q.id);
        const qRatings = qResponses.filter(r => r.rating_value).map(r => r.rating_value);
        const dist = {};
        qResponses.forEach(r => { if (r.response_value) dist[r.response_value] = (dist[r.response_value] || 0) + 1; });
        breakdown[q.id] = {
            question: q.question_text,
            average: qRatings.length ? (qRatings.reduce((a, b) => a + b, 0) / qRatings.length).toFixed(1) : 0,
            distribution: dist,
            count: qResponses.length,
        };
    }

    const perfTag = avgRating >= 4.5 ? 'excellent' : avgRating >= 3.5 ? 'strong' : avgRating >= 2.5 ? 'average' : 'needs_improvement';

    // Upsert analytics
    await supabase.from('feedback_analytics').upsert({
        form_id: formId,
        teacher_id: teacherId || null,
        org_id: orgId,
        avg_rating: parseFloat(avgRating.toFixed(2)),
        total_responses: totalResponses,
        question_breakdown: breakdown,
        performance_tag: perfTag,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'form_id,teacher_id' });
}

// ── GET ANALYTICS (Admin/Teacher) ───────────────────────────────────────
router.get('/forms/:id/analytics', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        const { data: analytics } = await supabase.from('feedback_analytics')
            .select('*').eq('form_id', req.params.id).maybeSingle();

        // Comments
        const { data: comments } = await supabase.from('feedback_responses')
            .select('comment, submitted_at').eq('form_id', req.params.id)
            .not('comment', 'is', null).not('comment', 'eq', '');

        const { data: form } = await supabase.from('feedback_forms').select('*').eq('id', req.params.id).single();

        // ENTERPRISE PRIVACY: Minimum threshold rule
        // If responses < 5, wipe the comments and distribution from the result to prevent guessing
        const THRESHOLD = 5;
        let safeAnalytics = analytics || {};
        let safeComments = comments || [];

        if (safeAnalytics.total_responses && safeAnalytics.total_responses < THRESHOLD) {
             safeComments = []; // Hide comments to prevent linguistic tracking
             
             // Soften the breakdown distribution so teachers can't pinpoint
             if (safeAnalytics.question_breakdown) {
                 for (const q in safeAnalytics.question_breakdown) {
                     safeAnalytics.question_breakdown[q].distribution = { Hidden: 'Not enough responses for anonymity' };
                 }
             }
        } else {
             // ENTERPRISE PRIVACY: Shuffle comments to prevent pattern-based time correlation
             // Even though dates are rounded to 00:00:00, sorting them randomly completely destroys any chronological guessing
             if (safeComments.length > 0) {
                 safeComments = safeComments.sort(() => Math.random() - 0.5);
             }
        }

        res.json({ 
            analytics: safeAnalytics, 
            comments: safeComments, 
            form,
            privacy_alert: (safeAnalytics.total_responses < THRESHOLD) ? `Comments and exact breakdowns are hidden until ${THRESHOLD} students respond, to ensure complete anonymity.` : null
        });
    } catch (err) {
        console.error('[Feedback] Analytics error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── EXPORT PARTICIPATION REPORT (CSV) ──────────────────────────────────
router.get('/forms/:id/participation', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        const { data: form } = await supabase.from('feedback_forms').select('*').eq('id', req.params.id).single();
        if (!form) return res.status(404).json({ message: 'Form not found' });

        // Get all students in this org
        const { data: allStudents } = await supabase.from('student_profiles')
            .select(`
                user_id,
                users ( name, email ),
                roll_no,
                academic_history ( division_id )
            `)
            .eq('org_id', form.org_id);

        // Get division details to enrich CSV (Standard, Branch, etc)
        const { data: divisions } = await supabase.from('divisions')
            .select('id, division_name, course, branch, type')
            .eq('org_id', form.org_id);
        const divMap = new Map((divisions || []).map(d => [d.id, d]));

        // Filter target students
        let targetStudents = allStudents || [];
        if (form.division_id) {
            targetStudents = targetStudents.filter(s => s.academic_history?.some(h => h.division_id === form.division_id));
        }

        // Get submissions
        const { data: submissions } = await supabase.from('feedback_submissions')
            .select('student_id, created_at').eq('form_id', req.params.id);
        const submittedMap = new Map((submissions || []).map(s => [s.student_id, s.created_at]));

        // Generate Report
        const report = targetStudents.map(s => {
            const isSubmitted = submittedMap.has(s.user_id);
            // Get their active division
            const activeDivId = s.academic_history?.[0]?.division_id;
            const divData = divMap.get(activeDivId) || {};

            return {
                Name: s.users?.name || 'Unknown',
                RollNo: s.roll_no || 'N/A',
                Standard: divData.course || '-',
                Branch: divData.branch || '-',
                Division: divData.division_name || '-',
                Status: isSubmitted ? 'Submitted' : 'Pending',
                SubmittedAt: isSubmitted ? new Date(submittedMap.get(s.user_id)).toLocaleString() : '-'
            };
        });

        res.json({ report, total: report.length, submitted: submissions?.length || 0 });
    } catch (err) {
        console.error('[Feedback] Participation error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── AI INSIGHTS (Groq) ─────────────────────────────────────────────────
router.post('/forms/:id/ai-insights', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        if (!groq) return res.status(400).json({ message: 'AI not configured' });

        // Fetch responses + comments
        const { data: responses } = await supabase.from('feedback_responses')
            .select('response_value, rating_value, comment')
            .eq('form_id', req.params.id);

        const { data: form } = await supabase.from('feedback_forms').select('title, target_teacher_name, subject_name').eq('id', req.params.id).single();

        const comments = (responses || []).filter(r => r.comment).map(r => r.comment);
        const ratings = (responses || []).filter(r => r.response_value).map(r => r.response_value);

        const prompt = `You're an educational analytics AI. Analyze this teacher feedback data:

Teacher: ${form.target_teacher_name || 'Unknown'}
Subject: ${form.subject_name || 'General'}
Feedback Title: ${form.title}

Rating Distribution:
${ratings.join(', ')}

Student Comments:
${comments.length > 0 ? comments.join('\n') : 'No comments provided.'}

Based on this data, provide:
1. 3 Strengths (bullet points)
2. 2 Areas for Improvement (bullet points)
3. 2 Specific Suggestions (bullet points)

Return as valid JSON:
{"strengths": ["..."], "weaknesses": ["..."], "suggestions": ["..."]}`;

        const completion = await groq.chat.completions.create({
            /* model: 'llama3-70b-8192' */
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 1000,
        });

        let insights;
        try {
            const raw = completion.choices[0]?.message?.content?.trim() || '{}';
            insights = JSON.parse(raw.replace(/```json|```/g, '').trim());
        } catch {
            insights = { strengths: ['Analysis could not be generated'], weaknesses: [], suggestions: [] };
        }

        // Save to analytics
        await supabase.from('feedback_analytics')
            .update({ ai_insights: insights, updated_at: new Date().toISOString() })
            .eq('form_id', req.params.id);

        res.json({ insights });
    } catch (err) {
        console.error('[Feedback] AI insights error:', err);
        res.status(500).json({ message: 'Failed to generate AI insights' });
    }
});

// ── DELETE FORM ──────────────────────────────────────────────────────────
router.delete('/forms/:id', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        await supabase.from('feedback_forms').delete().eq('id', req.params.id);
        res.json({ message: 'Feedback form deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── CLOSE FORM ───────────────────────────────────────────────────────────
router.put('/forms/:id/close', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        const { data, error } = await supabase.from('feedback_forms')
            .update({ status: 'closed', is_active: false, updated_at: new Date().toISOString() })
            .eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json({ message: 'Feedback closed', form: data });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── FACULTY RATINGS LEADERBOARD (Admin) ──────────────────────────────────
router.get('/faculty-ratings', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const org_id = getOrgId(req.user);

        // 1. Get all analytics rows for this org
        const { data: analytics, error } = await supabase
            .from('feedback_analytics')
            .select('teacher_id, avg_rating, total_responses, performance_tag, ai_insights')
            .eq('org_id', org_id)
            .not('teacher_id', 'is', null);

        if (error) throw error;

        // 2. Aggregate per teacher (a teacher may have multiple forms)
        const teacherMap = {};
        for (const row of (analytics || [])) {
            if (!row.teacher_id) continue;
            if (!teacherMap[row.teacher_id]) {
                teacherMap[row.teacher_id] = { ratings: [], totalResponses: 0, insights: null, perfTag: null };
            }
            teacherMap[row.teacher_id].ratings.push(row.avg_rating);
            teacherMap[row.teacher_id].totalResponses += (row.total_responses || 0);
            if (row.ai_insights) teacherMap[row.teacher_id].insights = row.ai_insights;
            if (row.performance_tag) teacherMap[row.teacher_id].perfTag = row.performance_tag;
        }

        // 3. Fetch teacher profiles from MongoDB
        const teacherIds = Object.keys(teacherMap);
        const teachers = teacherIds.length > 0
            ? await User.find({ _id: { $in: teacherIds } }).select('name profilePicture email qualification department subject role').lean()
            : [];

        // Also get form-level teacher names for teachers not in MongoDB
        const { data: forms } = await supabase.from('feedback_forms')
            .select('target_teacher_id, target_teacher_name, subject_name')
            .eq('org_id', org_id)
            .not('target_teacher_id', 'is', null);

        const formNameMap = {};
        (forms || []).forEach(f => {
            if (f.target_teacher_id && f.target_teacher_name) {
                formNameMap[f.target_teacher_id] = { name: f.target_teacher_name, subject: f.subject_name };
            }
        });

        // 4. Build ranked list
        const teacherLookup = {};
        teachers.forEach(t => { teacherLookup[t._id.toString()] = t; });

        const facultyList = teacherIds.map(tid => {
            const agg = teacherMap[tid];
            const avgAll = agg.ratings.length > 0
                ? agg.ratings.reduce((a, b) => a + b, 0) / agg.ratings.length
                : 0;

            const mongoTeacher = teacherLookup[tid];
            const formInfo = formNameMap[tid];

            // Determine performance tag from aggregated rating
            const perfTag = avgAll >= 4.5 ? 'excellent' : avgAll >= 3.5 ? 'strong' : avgAll >= 2.5 ? 'average' : 'needs_improvement';

            return {
                teacher_id: tid,
                name: mongoTeacher?.name || formInfo?.name || 'Unknown',
                profilePicture: mongoTeacher?.profilePicture || null,
                email: mongoTeacher?.email || '',
                qualification: mongoTeacher?.qualification || '',
                department: mongoTeacher?.department || '',
                subject: mongoTeacher?.subject || formInfo?.subject || '',
                avg_rating: parseFloat(avgAll.toFixed(2)),
                total_responses: agg.totalResponses,
                performance_tag: perfTag,
                ai_insights: agg.insights,
            };
        }).sort((a, b) => b.avg_rating - a.avg_rating); // Sorted by rating descending

        res.json({ faculty: facultyList });
    } catch (err) {
        console.error('[Feedback] Faculty ratings error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── ORG-WIDE ANALYTICS ROLLUP (Executive View) ──────────────────────────
router.get('/org-analytics', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const org_id = getOrgId(req.user);

        // Fetch all analytics for the org
        const { data: allAnalytics, error: aErr } = await supabase
            .from('feedback_analytics')
            .select('*')
            .eq('org_id', org_id);
        
        if (aErr) throw aErr;

        const { data: allForms, error: fErr } = await supabase
            .from('feedback_forms')
            .select('id, target_type, target_teacher_id')
            .eq('org_id', org_id);

        if (fErr) throw fErr;

        const totalForms = allForms.length;
        const totalResponses = (allAnalytics || []).reduce((sum, a) => sum + (a.total_responses || 0), 0);
        const orgAvgRating = allAnalytics.length > 0 
            ? (allAnalytics.reduce((sum, a) => sum + (a.avg_rating || 0), 0) / allAnalytics.length).toFixed(2)
            : 0;

        // Group by performance tag
        const tagBreakdown = { excellent: 0, strong: 0, average: 0, needs_improvement: 0 };
        (allAnalytics || []).forEach(a => {
            if (tagBreakdown[a.performance_tag] !== undefined) tagBreakdown[a.performance_tag]++;
        });

        // Identify Top 3 and Bottom 3 Teachers (Aggregated)
        // (Similar logic to faculty-ratings but specifically for this summary)
        const teacherStats = {};
        allAnalytics.forEach(a => {
            if (a.teacher_id) {
                if (!teacherStats[a.teacher_id]) teacherStats[a.teacher_id] = { ratings: [], count: 0 };
                teacherStats[a.teacher_id].ratings.push(a.avg_rating);
                teacherStats[a.teacher_id].count += a.total_responses;
            }
        });

        const rankedTeachers = Object.entries(teacherStats).map(([tid, stats]) => ({
            teacher_id: tid,
            avg: stats.ratings.reduce((p, c) => p + c, 0) / stats.ratings.length,
            totalResponses: stats.count
        })).sort((a, b) => b.avg - a.avg);

        // Get names for top/bottom
        const targetIds = [...rankedTeachers.slice(0, 3), ...rankedTeachers.slice(-3)].map(t => t.teacher_id);
        const users = await User.find({ _id: { $in: targetIds } }).select('name department').lean();
        const userMap = {};
        users.forEach(u => { userMap[u._id.toString()] = u; });

        const enrich = (t) => ({
            ...t,
            name: userMap[t.teacher_id]?.name || 'Unknown',
            department: userMap[t.teacher_id]?.department || 'N/A'
        });

        res.json({
            summary: {
                totalForms,
                totalResponses,
                orgAvgRating,
                participationRate: 'Calculated in frontend vs total students'
            },
            performanceBreakdown: tagBreakdown,
            hallOfFame: rankedTeachers.slice(0, 3).map(enrich),
            areasForReview: rankedTeachers.slice(-3).reverse().map(enrich)
        });
    } catch (err) {
        console.error('[Feedback] Org analytics error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
