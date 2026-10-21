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
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import Groq from 'groq-sdk';
import { isAuthenticated, requireRole } from '../middleware/auth.middleware.js';
import { attachInstitutionProfile } from '../middleware/institution-profile.middleware.js';
import { primarySupabaseClient as supabase } from '../config/supabaseClient.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const groq = new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });

router.use(isAuthenticated, attachInstitutionProfile({ required: false }));

router.get('/institution-profile', attachInstitutionProfile(), (req, res) => {
    res.json({
        institution_profile: req.institutionProfile,
        examination_profile: req.institutionProfile.examinationProfile,
        learner_record_profile: req.institutionProfile.learnerRecordProfile,
    });
});

// ── Helper: get org_id from user ──────────────────────────────────────────
function getOrgId(user) {
    return user?.organization?._id?.toString() || user?.organization?.toString() || user?.org_id?.toString();
}

// ── CREATE EXAM ───────────────────────────────────────────────────────────
router.post('/', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { exam_name, type = 'college', date_from, date_to, exam_fee = 0, fee_enabled = false } = req.body;
        if (!exam_name) return res.status(400).json({ message: 'Exam name is required' });

        const org_id = getOrgId(req.user);
        if (!org_id) return res.status(400).json({ message: 'Organization not found' });

        const { data, error } = await supabase
            .from('exams')
            .insert({ org_id, exam_name, type, date_from, date_to, exam_fee, fee_enabled, created_by: req.user._id.toString(), status: 'upcoming' })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: 'Exam created', exam: data });
    } catch (err) {
        console.error('[Exam] Create error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── LIST EXAMS (org-scoped) ───────────────────────────────────────────────
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const org_id = getOrgId(req.user);
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .eq('org_id', org_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ exams: data });
    } catch (err) {
        console.error('[Exam] List error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── GET EXAM + TIMETABLE ─────────────────────────────────────────────────
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const [{ data: exam, error: eErr }, { data: entries, error: tErr }] = await Promise.all([
            supabase.from('exams').select('*').eq('id', req.params.id).single(),
            supabase.from('exam_timetable_entries').select('*').eq('exam_id', req.params.id).order('exam_date', { ascending: true })
        ]);
        if (eErr) throw eErr;
        if (tErr) throw tErr;
        res.json({ exam, entries });
    } catch (err) {
        console.error('[Exam] Get error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── DELETE EXAM ────────────────────────────────────────────────────────────
router.delete('/:id', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { error } = await supabase.from('exams').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Exam deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── UPLOAD PDF → AI EXTRACTION ─────────────────────────────────────────────
router.post('/:id/parse-timetable', isAuthenticated, requireRole('org_admin'), upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'PDF file is required' });

        // 1. Extract raw text from PDF
        const pdfData = await pdfParse(req.file.buffer);
        const rawText = pdfData.text.substring(0, 8000); // cap for Groq context

        if (!rawText.trim()) return res.status(400).json({ message: 'No text found in PDF' });

        // 2. Ask Groq to parse structured timetable
        const prompt = `You are a timetable parser. Extract the exam timetable entries from this text:

${rawText}

Return ONLY a valid JSON array. Each object must have these exact keys:
- "subject" (string): Subject/paper name
- "exam_date" (string): Date in YYYY-MM-DD format
- "day_of_week" (string): Day name e.g. "Monday"
- "start_time" (string): Start time in HH:MM format (24h)
- "end_time" (string): End time in HH:MM format (24h)
- "room" (string): Room/hall or "" if not specified

If a field is missing, use empty string "". Do not include any explanation, just the JSON array.`;

        const completion = await groq.chat.completions.create({
            /* model: 'llama3-70b-8192' */
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 3000,
        });

        const aiResponse = completion.choices[0]?.message?.content?.trim() || '[]';

        // 3. Parse and clean the JSON
        let entries = [];
        try {
            // Handle markdown code blocks if AI wraps it
            const cleaned = aiResponse.replace(/```json|```/g, '').trim();
            entries = JSON.parse(cleaned);
            if (!Array.isArray(entries)) entries = [];
        } catch {
            return res.status(422).json({ message: 'AI could not extract timetable. Please try a clearer PDF or add rows manually.', rawText: rawText.substring(0, 500) });
        }

        // 4. Validate & sanitize entries
        entries = entries.filter(e => e.subject && e.exam_date).map((e, i) => ({
            subject: String(e.subject || '').trim(),
            exam_date: String(e.exam_date || '').trim(),
            day_of_week: String(e.day_of_week || '').trim(),
            start_time: String(e.start_time || '').trim(),
            end_time: String(e.end_time || '').trim(),
            room: String(e.room || '').trim(),
            sort_order: i,
        }));

        res.json({ message: 'Timetable extracted successfully', entries, rawText: rawText.substring(0, 500) });
    } catch (err) {
        console.error('[Exam] PDF parse error:', err);
        res.status(500).json({ message: 'Failed to parse PDF', error: err.message });
    }
});

// ── SAVE TIMETABLE ENTRIES ────────────────────────────────────────────────
router.post('/:id/timetable', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { entries } = req.body;
        if (!Array.isArray(entries) || entries.length === 0)
            return res.status(400).json({ message: 'No entries provided' });

        // Delete old and re-insert
        await supabase.from('exam_timetable_entries').delete().eq('exam_id', req.params.id);

        const rows = entries.map((e, i) => ({
            exam_id: req.params.id,
            subject: e.subject,
            exam_date: e.exam_date,
            day_of_week: e.day_of_week || '',
            start_time: e.start_time || '',
            end_time: e.end_time || '',
            room: e.room || '',
            sort_order: i,
        }));

        const { data, error } = await supabase.from('exam_timetable_entries').insert(rows).select();
        if (error) throw error;

        // Update exam status based on dates
        if (entries.length > 0) {
            const dates = entries.map(e => e.exam_date).filter(Boolean).sort();
            await supabase.from('exams').update({ date_from: dates[0], date_to: dates[dates.length - 1] }).eq('id', req.params.id);
        }

        res.json({ message: 'Timetable saved', entries: data });
    } catch (err) {
        console.error('[Exam] Save timetable error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── EDIT SINGLE TIMETABLE ROW ─────────────────────────────────────────────
router.put('/:id/timetable/:entryId', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { subject, exam_date, day_of_week, start_time, end_time, room } = req.body;
        const { data, error } = await supabase
            .from('exam_timetable_entries')
            .update({ subject, exam_date, day_of_week, start_time, end_time, room })
            .eq('id', req.params.entryId)
            .eq('exam_id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json({ message: 'Entry updated', entry: data });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── DELETE SINGLE TIMETABLE ROW ────────────────────────────────────────────
router.delete('/:id/timetable/:entryId', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { error } = await supabase.from('exam_timetable_entries').delete().eq('id', req.params.entryId).eq('exam_id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Entry deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── FEE MANAGEMENT ─────────────────────────────────────────────────────────
router.post('/:id/fees/set', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { exam_fee, fee_enabled } = req.body;
        const { data, error } = await supabase.from('exams').update({ exam_fee, fee_enabled }).eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json({ message: 'Fee updated', exam: data });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/:id/fees', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { data, error } = await supabase.from('exam_fees').select('*').eq('exam_id', req.params.id);
        if (error) throw error;
        const paid = data.filter(f => f.status === 'paid').length;
        const unpaid = data.filter(f => f.status === 'unpaid').length;
        res.json({ fees: data, summary: { paid, unpaid, total: data.length } });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
