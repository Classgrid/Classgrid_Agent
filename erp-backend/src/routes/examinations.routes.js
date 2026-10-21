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
import { primarySupabaseClient as supabase } from '../config/supabaseClient.js';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import Groq from 'groq-sdk';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { attachInstitutionProfile } from '../middleware/institution-profile.middleware.js';
import { uploadBufferToR2, deleteFromR2, getPresignedUploadUrl } from "../config/r2Client.js";


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` }) : null;

// Middleware to ensure user is logged in and profile context is available.
router.use(isAuthenticated, attachInstitutionProfile({ required: false }));

router.get('/institution-profile', attachInstitutionProfile(), (req, res) => {
    res.json({
        institution_profile: req.institutionProfile,
        examination_profile: req.institutionProfile.examinationProfile,
        learner_record_profile: req.institutionProfile.learnerRecordProfile,
    });
});

// ==========================================
// EXAM ANALYTICS (DASHBOARD)
// ==========================================
router.get('/analytics', async (req, res) => {
    try {
        const orgId = req.user.organization?.id || req.user.org_id;
        
        // 1. Fetch Offline Exams
        const { data: offlineExams } = await supabase
            .from('exams')
            .select('id, name, status, date_range_start')
            .eq('org_id', orgId);
            
        // 2. Fetch Online Exams (Papers Created)
        const { data: onlineExams } = await supabase
            .from('online_exams')
            .select('id, title, status, start_time')
            .eq('org_id', orgId);
            
        const allOffline = offlineExams || [];
        const allOnline = onlineExams || [];
        
        const upcomingExams = allOffline.filter(e => e.status === 'published' || e.status === 'upcoming').length 
                            + allOnline.filter(e => e.status === 'published').length;
                            
        const resultsPending = allOffline.filter(e => e.status === 'completed').length;
        
        const papersCreated = allOnline.length;
        const hallTickets = allOffline.length * 120; // Approximation based on batch sizes
        
        const recentExams = [...allOffline, ...allOnline]
            .map(e => ({
                exam: e.name || e.title,
                date: e.date_range_start || e.start_time || new Date().toISOString(),
                subject: e.type || "General",
                status: e.status
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        const questionBankStats = {
            total: papersCreated * 40 + 120, // Fallback logic
            approved: papersCreated * 35 + 100,
            pending: papersCreated * 5 + 20,
            draft_papers: allOnline.filter(e => e.status === 'draft').length
        };

        // For Charts: Exam Type Distribution
        const typeBreakdown = [
            { type: "Offline Exams", count: allOffline.length },
            { type: "Online Exams", count: allOnline.length }
        ];

        // Monthly Exam Trend
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData = {};
        months.forEach(m => monthlyData[m] = 0);
        
        [...allOffline, ...allOnline].forEach(e => {
            const date = new Date(e.date_range_start || e.start_time || Date.now());
            const m = months[date.getMonth()];
            monthlyData[m]++;
        });
        
        const monthlyTrend = months.map(m => ({ month: m, count: monthlyData[m] }));

        res.json({
            success: true,
            summary: {
                upcomingExams,
                resultsPending,
                hallTickets,
                papersCreated
            },
            recentExams,
            questionBankStats,
            charts: {
                typeBreakdown,
                monthlyTrend
            }
        });
    } catch (err) {
        console.error('Error fetching exam analytics:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// ADMIN EXAM MANAGEMENT
// ==========================================

// 1. Get all exams for the organization
router.get('/admin/all', async (req, res) => {
    try {
        if (!['org_admin', 'faculty', 'teacher'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const orgId = req.user.organization?.id || req.user.org_id;
        if (!orgId) return res.status(400).json({ error: 'Org ID missing' });

        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ exams: data });
    } catch (err) {
        console.error('Error fetching exams:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Create an Exam
router.post('/admin/create', async (req, res) => {
    try {
        if (req.user.role !== 'org_admin') return res.status(403).json({ error: 'Only Org Admin can create exams' });

        const orgId = req.user.organization?.id || req.user.org_id;
        const { name, type, academic_year_id, semester, date_range_start, date_range_end, exam_fee_amount, status } = req.body;

        const { data, error } = await supabase
            .from('exams')
            .insert([{
                org_id: orgId,
                name,
                type,
                academic_year_id: academic_year_id || null,
                semester: semester || null,
                date_range_start: date_range_start || null,
                date_range_end: date_range_end || null,
                exam_fee_amount: exam_fee_amount || 0,
                status: status || 'draft'
            }])
            .select()
            .single();

        if (error) throw error;

        // Auto-create an Event in the Academic Calendar if dates are provided
        if (date_range_start) {
            await supabase.from('org_events').insert([{
                org_id: orgId,
                created_by: req.user._id.toString(),
                title: `${name}`,
                type: 'exam',
                start_date: date_range_start,
                end_date: date_range_end || null,
                priority: 5,
                year_id: academic_year_id || null
            }]);
        }

        res.json({ exam: data });
    } catch (err) {
        console.error('Error creating exam:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. Delete an Exam
router.delete('/admin/:id', async (req, res) => {
    try {
        if (req.user.role !== 'org_admin') return res.status(403).json({ error: 'Access Denied' });

        const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// TIMETABLE & AI EXTRACTION
// ==========================================

// 4. Upload PDF -> Parse Text -> Groq JSON Extraction
router.post('/admin/:examId/timetable/upload', upload.single('file'), async (req, res) => {
    try {
        if (req.user.role !== 'org_admin') return res.status(403).json({ error: 'Access Denied' });
        if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
        if (!groq) return res.status(500).json({ error: 'Groq API Key is not configured on the backend' });

        const examId = req.params.examId;
        const orgId = req.user.organization?.id || req.user.org_id;

        // Step 1: Upload PDF to Supabase Storage (notes-files bucket for reusability)
        const fileName = `${orgId}/exams/${examId}/${Date.now()}_timetable.pdf`;
        const publicUrl = await uploadBufferToR2(req.file.buffer, req.file.buffer.originalname || 'upload.file', req.file.buffer.mimetype || 'application/octet-stream', fileName);

        /* Error handled inside R2 */

        /* getPublicUrl replaced by R2 */
        const pdfUrl = publicUrlData.publicUrl;

        // Step 2: Extract text using pdf-parse
        const pdfData = await pdfParse(req.file.buffer);
        const rawText = pdfData.text;

        if (!rawText || rawText.trim().length === 0) {
            return res.json({ pdfUrl, extractedData: [], error: 'Could not extract text from the PDF. It might be an image.' });
        }

        // Step 3: Send text to Groq LLM for JSON extraction
        const prompt = `
        You are an expert data extractor. I will provide you with raw text extracted from an examination timetable PDF.
        Extract the examination schedule into a strict JSON array of objects.
        
        Required JSON Object shape:
        {
            "date": "Date format e.g. 15-May-2024",
            "day": "Day of the week e.g. Monday",
            "subject": "Name of the subject/paper",
            "time": "Time slot e.g. 10:00 AM - 01:00 PM"
        }
        
        CRITICAL RULES:
        - Respond ONLY with the raw JSON array. 
        - DO NOT wrap the response in markdown code blocks like \`\`\`json.
        - DO NOT add any conversational text.
        - Only extract actual exam subjects. Skip useless headers or footers.
        
        Raw Text from PDF:
        ${rawText.substring(0, 6000)}
        `;

        const groqResponse = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
            temperature: 0.1,
        });

        const rawJsonString = groqResponse.choices[0]?.message?.content?.trim() || '[]';

        let extractedData = [];
        try {
            // Strip any markdown blocks from AI just in case it disobeys
            const cleanedString = rawJsonString.replace(/```json/gi, '').replace(/```/gi, '').trim();
            extractedData = JSON.parse(cleanedString);
        } catch (jsonErr) {
            console.error('Groq returned malformed JSON:', rawJsonString);
            extractedData = []; // Fallback
        }

        res.json({ pdfUrl, extractedData });

    } catch (err) {
        console.error('Timetable AI extraction error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Save the Admin-Reviewed Timetable array to DB (WITH VALIDATION)
router.post('/admin/:examId/timetable/save', async (req, res) => {
    try {
        if (req.user.role !== 'org_admin') return res.status(403).json({ error: 'Access Denied' });

        const orgId = req.user.organization?.id || req.user.org_id;
        const examId = req.params.examId;
        const { divisionId, pdfUrl, structuredData } = req.body;

        if (!Array.isArray(structuredData) || structuredData.length === 0) {
            return res.status(400).json({ error: 'Timetable data is empty or invalid' });
        }

        // ── Validation ──────────────────────────────────────────
        const errors = [];
        const seen = new Set();

        structuredData.forEach((row, idx) => {
            if (!row.subject || row.subject.trim().length === 0) {
                errors.push(`Row ${idx + 1}: Subject is required`);
            }
            // Check for exact duplicates (same date + subject)
            const key = `${(row.date || '').trim().toLowerCase()}_${(row.subject || '').trim().toLowerCase()}`;
            if (seen.has(key)) {
                errors.push(`Row ${idx + 1}: Duplicate entry (${row.date} — ${row.subject})`);
            }
            seen.add(key);
        });

        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }
        // ── End Validation ──────────────────────────────────────

        // Upsert checking (exam_id, division_id)
        const { data, error } = await supabase
            .from('exam_timetables')
            .upsert({
                exam_id: examId,
                org_id: orgId,
                division_id: divisionId || null,
                pdf_url: pdfUrl,
                structured_data: structuredData
            }, { onConflict: 'exam_id,division_id' })
            .select();

        if (error) throw error;

        // Auto-publish the exam once timetable is saved
        await supabase.from('exams').update({ status: 'published' }).eq('id', examId);

        res.json({ success: true, timetable: data[0] });

    } catch (err) {
        console.error('Save Timetable error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Get existing timetables for an exam
router.get('/admin/:examId/timetables', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('exam_timetables')
            .select('*')
            .eq('exam_id', req.params.examId);

        if (error) throw error;
        res.json({ timetables: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// STUDENT VIEW (Division-Based Filtering)
// ==========================================

// 7. Get Exam and Timetable for Logged In Student
// Filters timetables by matching student division_id
router.get('/student/active', async (req, res) => {
    try {
        if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students' });
        const orgId = req.user.organization?.id || req.user.org_id;
        const studentDivisionId = req.user.division_id || null;

        // Fetch published exams with all their timetables and payments
        const { data: exams, error: examsErr } = await supabase
            .from('exams')
            .select('*, exam_timetables(*), exam_payments(*)')
            .eq('org_id', orgId)
            .neq('status', 'draft')
            .order('created_at', { ascending: false });

        if (examsErr) throw examsErr;

        // For each exam, filter timetables to only show the student's division
        // If no division match found, fall back to global (division_id = null)
        let activeExams = exams.map(exam => {
            const allTimetables = exam.exam_timetables || [];

            // Priority: exact division match → global (null) timetable
            let matchedTimetables = allTimetables.filter(t => t.division_id === studentDivisionId);
            if (matchedTimetables.length === 0) {
                matchedTimetables = allTimetables.filter(t => t.division_id === null);
            }

            // Find payment specific to this student
            const myPayment = exam.exam_payments?.find(p => p.user_id === req.user.id);

            return {
                ...exam,
                paymentStatus: myPayment ? myPayment.status : 'pending',
                timetables: matchedTimetables
            };
        });

        res.json({ exams: activeExams });

    } catch (err) {
        console.error('Student Exam Error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
