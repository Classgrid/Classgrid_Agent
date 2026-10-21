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
import { isAuthenticated, requireRole } from '../middleware/auth.middleware.js';
import { attachInstitutionProfile } from '../middleware/institution-profile.middleware.js';
import { getChatSb } from '../config/supabaseClient.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import { sendEmail } from '../services/aws-ses.service.js';

const router = express.Router();

router.use(isAuthenticated, attachInstitutionProfile({ required: false }));

router.get('/institution-profile', attachInstitutionProfile(), (req, res) => {
    res.json({
        institution_profile: req.institutionProfile,
        library_profile: req.institutionProfile.libraryProfile,
        learner_record_profile: req.institutionProfile.learnerRecordProfile,
    });
});

// ======================================================
// Helper: Get Supabase Client & Org ID
// ======================================================
const getSbAndOrg = (req) => {
    const sb = getChatSb();
    const orgId = req.effectiveOrganizationId || req.user.organization_id?.toString();
    return { sb, orgId };
};

// ======================================================
// GET /api/library/catalog
// Fetch all books (Accessible to anyone in the org)
// ======================================================
router.get('/catalog', isAuthenticated, async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        if (!orgId) return res.status(400).json({ message: 'No organization linked' });

        const search = req.query.search || '';

        let query = sb
            .from('library_books')
            .select(`
                *,
                library_copies (
                    id, copy_id, status
                )
            `)
            .eq('org_id', orgId)
            .order('book_name', { ascending: true });

        if (search) {
            query = query.or(`book_name.ilike.%${search}%,book_id.ilike.%${search}%,subject.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json({ books: data });
    } catch (err) {
        console.error('[Library Catalog Error]:', err);
        res.status(500).json({ message: 'Failed to fetch library catalog' });
    }
});

// ======================================================
// POST /api/library/books
// Add or manually edit a book (Managers/Admins only)
// ======================================================
router.post('/books', isAuthenticated, requireRole('org_admin', 'library_manager'), async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        if (!orgId) return res.status(400).json({ message: 'No organization linked' });

        const { id, book_id, book_name, subject, total_copies } = req.body;

        if (!book_id || !book_name) {
            return res.status(400).json({ message: 'Book ID and Book Name are required' });
        }

        const payload = {
            org_id: orgId,
            book_id: book_id.trim(),
            book_name: book_name.trim(),
            subject: subject?.trim() || 'General',
            total_copies: parseInt(total_copies) || 1,
            available_copies: parseInt(total_copies) || 1 // simplified for manual entry
        };

        let result;
        if (id) {
            // Update existing
            const { data, error } = await sb
                .from('library_books')
                .update({ 
                    ...payload,
                    // calculate new available copies based on diff, but UI should ideally handle this logic better
                    // for now, we just overwrite. More complex logic needed if copies change while issued.
                })
                .eq('id', id)
                .eq('org_id', orgId)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            // Insert new
            const { data, error } = await sb
                .from('library_books')
                .insert(payload)
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        res.json({ message: 'Book saved successfully', book: result });
    } catch (err) {
        console.error('[Library Add Book Error]:', err);
        if (err?.code === '23505') { // Postgres unique violation
            return res.status(409).json({ message: 'A book with this ID already exists in your organization.' });
        }
        res.status(500).json({ message: 'Failed to save book' });
    }
});

// ======================================================
// POST /api/library/import
// Bulk import books via Excel/CSV. Uses Groq to predict missing subjects.
// ======================================================
router.post('/import', isAuthenticated, requireRole('org_admin', 'library_manager'), async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        if (!orgId) return res.status(400).json({ message: 'No organization linked' });

        const { books } = req.body; // Array of { book_name, book_id, subject, total_copies }
        if (!Array.isArray(books) || books.length === 0) {
            return res.status(400).json({ message: 'Invalid or empty books array' });
        }

        // 1. Separate books that need AI categorization
        const validBooks = [];
        const needsAI = [];

        for (const b of books) {
            if (!b.book_name || !b.book_id) continue;
            
            const cleanBook = {
                org_id: orgId,
                book_name: b.book_name.trim(),
                book_id: b.book_id.trim(),
                subject: b.subject ? String(b.subject).trim() : '',
                total_copies: parseInt(b.total_copies) || 1,
                available_copies: parseInt(b.total_copies) || 1,
                is_auto_categorized: false
            };

            if (!cleanBook.subject || cleanBook.subject.toLowerCase() === 'undefined' || cleanBook.subject.toLowerCase() === 'null') {
                needsAI.push(cleanBook); // Reference to mutate later
            }
            
            validBooks.push(cleanBook);
        }

        if (validBooks.length === 0) {
            return res.status(400).json({ message: 'No valid books found to import' });
        }

        // 2. Call Groq AI for missing subjects (Batch processing)
        if (needsAI.length > 0 && process.env.GROQ_API_KEY) {
            try {
                // To avoid massive payloads, we extract just the titles
                const titlesToAnalyze = needsAI.map(b => b.book_name);
                
                // Dynamic import Groq to avoid failing if SDK is missing or not installed
                const { default: Groq } = await import('groq-sdk').catch(() => ({ default: null }));
                
                if (Groq) {
                    const groq = new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });
                    
                    const prompt = `You are a librarian AI. Categorize these books into standard broad academic subjects (like 'Physics', 'Computer Science', 'Literature', 'Commerce', etc.). 
Respond ONLY with a valid JSON array of strings in the exact same order as the input. Do not include any markdown formatting, backticks, or explanation.
Input: ${JSON.stringify(titlesToAnalyze)}`;

                    const completion = await groq.chat.completions.create({
                        messages: [{ role: "user", content: prompt }],
                        model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
                        temperature: 0.1,
                        max_tokens: 2000
                    });

                    const responseText = completion.choices[0]?.message?.content || '[]';
                    let predictedSubjects = [];
                    try {
                        // Strip markdown fences just in case Llama ignored instructions
                        const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
                        predictedSubjects = JSON.parse(cleanedText);
                    } catch (e) {
                        console.error('Groq JSON Parse Error during library import:', e, 'Raw output:', responseText);
                    }

                    // Map predictions back
                    if (Array.isArray(predictedSubjects) && predictedSubjects.length === needsAI.length) {
                        for (let i = 0; i < needsAI.length; i++) {
                            needsAI[i].subject = predictedSubjects[i] || 'General';
                            needsAI[i].is_auto_categorized = true;
                        }
                    } else {
                        // Fallback if AI response array length mismatches
                        needsAI.forEach(b => b.subject = 'General');
                    }
                } else {
                    needsAI.forEach(b => b.subject = 'General');
                }
            } catch (aiErr) {
                console.error('[Library Import AI Error]:', aiErr);
                // Fallback gracefully without failing the import
                needsAI.forEach(b => b.subject = 'General');
            }
        } else if (needsAI.length > 0) {
            needsAI.forEach(b => b.subject = 'General');
        }

        // 3. Upsert into Supabase (Insert or Update if book_id exists)
        const { data, error } = await sb
            .from('library_books')
            .upsert(validBooks, { 
                onConflict: 'org_id, book_id',
                ignoreDuplicates: false // Updates existing records
            })
            .select();

        if (error) throw error;

        res.json({ 
            message: `Successfully imported ${validBooks.length} books.`, 
            aiFilledCount: needsAI.length,
            records: data 
        });

    } catch (err) {
        console.error('[Library Import Error]:', err);
        res.status(500).json({ message: 'Failed to complete batch import.' });
    }
});

// ======================================================
// POST /api/library/issue
// Issue a book to a user
// ======================================================
router.post('/issue', isAuthenticated, requireRole('org_admin', 'library_manager'), async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        const { book_db_id, student_mongo_id, copy_db_id, due_date } = req.body;

        if (!book_db_id || !student_mongo_id || !due_date) {
            return res.status(400).json({ message: 'Missing required fields for issuing' });
        }

        // 1. Check availability
        const { data: book, error: bookErr } = await sb
            .from('library_books')
            .select('*')
            .eq('id', book_db_id)
            .eq('org_id', orgId)
            .single();

        if (bookErr || !book) return res.status(404).json({ message: 'Book not found' });
        if (book.available_copies <= 0) return res.status(400).json({ message: 'No copies available' });

        // 2. Decrement available copies
        const { error: updErr } = await sb
            .from('library_books')
            .update({ available_copies: book.available_copies - 1 })
            .eq('id', book_db_id);
        if (updErr) throw updErr;

        // 3. Update copy status if granular copies are tracked
        if (copy_db_id) {
            await sb.from('library_copies').update({ status: 'Issued' }).eq('id', copy_db_id);
        }

        // 4. Create transaction log
        const { data: trans, error: transErr } = await sb
            .from('library_transactions')
            .insert({
                org_id: orgId,
                book_id: book_db_id,
                copy_id: copy_db_id || null,
                student_id: student_mongo_id,
                issued_by: req.user._id.toString(),
                due_date: new Date(due_date).toISOString(),
                status: 'Issued'
            })
            .select()
            .single();

        if (transErr) {
            // Rollback availability (crude fallback without true RPC transaction)
            await sb.from('library_books').update({ available_copies: book.available_copies }).eq('id', book_db_id);
            throw transErr;
        }

        // 5. Send checkout email to student
        const student = await User.findById(student_mongo_id).select('name email').lean();
        if (student && student.email) {
            try {
                await sendEmail(
                    student.email,
                    '📚 Library Book Issued',
                    `<h3>Hello ${student.name},</h3>
                    <p>You have successfully issued the book <strong>${book.book_name}</strong>.</p>
                    <p><strong>Due Date:</strong> ${new Date(due_date).toLocaleDateString()}</p>
                    <p>Please return the book on time to avoid late fines.</p>
                    <p>Thank you,<br/>Library Manager</p>`
                );
                // 6. Create In-App Notification
                await Notification.create({
                    recipient: student._id,
                    type: 'library',
                    title: '📚 Library Book Issued',
                    message: `You have successfully issued the book ${book.book_name}. It is due on ${new Date(due_date).toLocaleDateString()}. Please return it on time to avoid fines.`,
                    relatedId: trans.id,
                    emailSent: true,
                    emailSentAt: new Date()
                });
            } catch (notifyErr) {
                console.error('[Library Issue Notification Error]:', notifyErr);
            }
        }

        res.json({ message: 'Book issued successfully', transaction: trans });
    } catch (err) {
        console.error('[Library Issue Error]:', err);
        res.status(500).json({ message: 'Failed to issue book' });
    }
});

// ======================================================
// POST /api/library/return
// Return a book
// ======================================================
router.post('/return', isAuthenticated, requireRole('org_admin', 'library_manager'), async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        const { transaction_id, fine_amount, fine_status } = req.body;

        if (!transaction_id) return res.status(400).json({ message: 'Transaction ID is required' });

        // 1. Get transaction
        const { data: trans, error: transErr } = await sb
            .from('library_transactions')
            .select('*')
            .eq('id', transaction_id)
            .eq('org_id', orgId)
            .single();

        if (transErr || !trans) return res.status(404).json({ message: 'Transaction not found' });
        if (trans.status !== 'Issued') return res.status(400).json({ message: 'Book is not currently issued' });

        // 2. Mark return
        const { error: updTransErr } = await sb
            .from('library_transactions')
            .update({
                status: 'Returned',
                return_date: new Date().toISOString(),
                fine_amount: fine_amount || 0,
                fine_status: fine_status || (fine_amount > 0 ? 'Unpaid' : 'Paid')
            })
            .eq('id', transaction_id);
        
        if (updTransErr) throw updTransErr;

        // 3. Increment book availability
        const { data: book } = await sb.from('library_books').select('available_copies').eq('id', trans.book_id).single();
        if (book) {
            await sb.from('library_books').update({ available_copies: book.available_copies + 1 }).eq('id', trans.book_id);
        }

        // 4. Update copy status if tracked
        if (trans.copy_id) {
            await sb.from('library_copies').update({ status: 'Available' }).eq('id', trans.copy_id);
        }

        res.json({ message: 'Book returned successfully' });
    } catch (err) {
        console.error('[Library Return Error]:', err);
        res.status(500).json({ message: 'Failed to return book' });
    }
});

// ======================================================
// GET /api/library/transactions
// Get active or past transactions
// ======================================================
router.get('/transactions', isAuthenticated, requireRole('org_admin', 'library_manager'), async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        const status = req.query.status; // 'Issued' or 'Returned'

        let query = sb
            .from('library_transactions')
            .select(`
                *,
                library_books ( book_name, book_id ),
                library_copies ( copy_id )
            `)
            .eq('org_id', orgId)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        // We need to fetch student names from MongoDB
        const studentIds = [...new Set(data.map(t => t.student_id))];
        const students = await User.find({ _id: { $in: studentIds } }, 'name prn roll_no _id').lean();
        const studentMap = students.reduce((acc, s) => {
            acc[s._id.toString()] = s;
            return acc;
        }, {});

        const enrichedData = data.map(t => ({
            ...t,
            studentInfo: studentMap[t.student_id] || { name: 'Unknown Student' }
        }));

        res.json({ transactions: enrichedData });
    } catch (err) {
        console.error('[Library Transactions Error]:', err);
        res.status(500).json({ message: 'Failed to fetch transactions' });
    }
});

// ======================================================
// GET /api/library/student/books
// Fetch active books and history for the logged-in student
// ======================================================
router.get('/student/books', isAuthenticated, async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        if (!orgId) return res.status(400).json({ message: 'No organization linked' });

        const studentId = req.user._id.toString();

        const { data, error } = await sb
            .from('library_transactions')
            .select(`
                *,
                library_books ( book_name, book_id, subject )
            `)
            .eq('org_id', orgId)
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate active fines dynamically for UI
        const today = new Date();
        const enrichedData = data.map(trans => {
            let active_fine = trans.fine_amount || 0;
            if (trans.status === 'Issued' && new Date(trans.due_date) < today) {
                const diffTime = Math.abs(today - new Date(trans.due_date));
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                active_fine = diffDays * 5; // ₹5 per day
            }
            return { ...trans, active_fine };
        });

        res.json({ transactions: enrichedData });
    } catch (err) {
        console.error('[Library Student Books Error]:', err);
        res.status(500).json({ message: 'Failed to fetch student library data' });
    }
});

// ======================================================
// POST /api/library/student/book-info
// Fetch AI-generated summary/details about a book
// ======================================================
router.post('/student/book-info', isAuthenticated, async (req, res) => {
    try {
        const { book_name, subject } = req.body;
        if (!book_name) return res.status(400).json({ message: 'Book name is required' });

        if (!process.env.GROQ_API_KEY) {
            return res.json({ summary: "AI Summary is currently unavailable (API key missing)." });
        }

        const { default: Groq } = await import('groq-sdk').catch(() => ({ default: null }));
        if (!Groq) return res.json({ summary: "AI module not loaded." });

        const groq = new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });
        
        const prompt = `You are a knowledgeable librarian. Provide a very concise, engaging, 2-3 sentence overview about the book titled "${book_name}" (Subject: ${subject || 'Unknown'}). Describe what the student will learn from it or what it's about. No markdown formatting.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
            temperature: 0.5,
            max_tokens: 150
        });

        const summary = completion.choices[0]?.message?.content?.trim() || 'No summary available.';

        res.json({ summary });
    } catch (err) {
        console.error('[Library Student AI Error]:', err);
        res.status(500).json({ message: 'Failed to fetch AI book summary' });
    }
});

// ======================================================
// BOOK RESERVATION / HOLD SYSTEM
// ======================================================

// POST /api/library/reserve — Student requests a hold on an unavailable book
router.post('/reserve', isAuthenticated, async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        const { book_db_id } = req.body;
        const studentId = req.user._id.toString();

        if (!book_db_id) return res.status(400).json({ message: 'Book ID required' });

        // Check if book exists
        const { data: book, error: bookErr } = await sb
            .from('library_books').select('*').eq('id', book_db_id).eq('org_id', orgId).single();
        if (bookErr || !book) return res.status(404).json({ message: 'Book not found' });

        // Check if student already has an active reservation for this book
        const { data: existing } = await sb
            .from('library_reservations')
            .select('id')
            .eq('book_id', book_db_id)
            .eq('student_id', studentId)
            .eq('status', 'pending')
            .limit(1);

        if (existing?.length > 0) {
            return res.status(409).json({ message: 'You already have a pending reservation for this book' });
        }

        // Get queue position
        const { data: queue } = await sb
            .from('library_reservations')
            .select('id')
            .eq('book_id', book_db_id)
            .eq('status', 'pending');

        const position = (queue?.length || 0) + 1;

        const { data: reservation, error: resErr } = await sb
            .from('library_reservations')
            .insert({
                org_id: orgId,
                book_id: book_db_id,
                student_id: studentId,
                status: 'pending',
                queue_position: position
            })
            .select()
            .single();

        if (resErr) throw resErr;

        res.json({ message: `Book reserved! You are #${position} in queue.`, reservation });
    } catch (err) {
        console.error('[Library Reserve Error]:', err);
        res.status(500).json({ message: 'Failed to reserve book' });
    }
});

// GET /api/library/reservations — Admin views all pending reservations
router.get('/reservations', isAuthenticated, requireRole('org_admin', 'library_manager'), async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        const { data, error } = await sb
            .from('library_reservations')
            .select('*, library_books(book_name, book_id, available_copies)')
            .eq('org_id', orgId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const studentIds = [...new Set(data.map(r => r.student_id))];
        const students = await User.find({ _id: { $in: studentIds } }, 'name prn roll_no _id').lean();
        const studentMap = students.reduce((acc, s) => { acc[s._id.toString()] = s; return acc; }, {});

        res.json({
            reservations: data.map(r => ({ ...r, studentInfo: studentMap[r.student_id] || {} }))
        });
    } catch (err) {
        console.error('[Library Reservations Error]:', err);
        res.status(500).json({ message: 'Failed to fetch reservations' });
    }
});

// GET /api/library/student/reservations — Student views their own reservations
router.get('/student/reservations', isAuthenticated, async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        const { data, error } = await sb
            .from('library_reservations')
            .select('*, library_books(book_name, book_id)')
            .eq('org_id', orgId)
            .eq('student_id', req.user._id.toString())
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ reservations: data });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch your reservations' });
    }
});

// POST /api/library/cancel-reservation
router.post('/cancel-reservation', isAuthenticated, async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        const { reservation_id } = req.body;
        if (!reservation_id) return res.status(400).json({ message: 'Reservation ID required' });

        const { error } = await sb
            .from('library_reservations')
            .update({ status: 'cancelled' })
            .eq('id', reservation_id)
            .eq('org_id', orgId);

        if (error) throw error;
        res.json({ message: 'Reservation cancelled' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to cancel reservation' });
    }
});

// POST /api/library/fulfill-reservation — Admin marks reservation as fulfilled (book issued)
router.post('/fulfill-reservation', isAuthenticated, requireRole('org_admin', 'library_manager'), async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        const { reservation_id } = req.body;

        const { error } = await sb
            .from('library_reservations')
            .update({ status: 'fulfilled' })
            .eq('id', reservation_id)
            .eq('org_id', orgId);

        if (error) throw error;

        // Get reservation to notify student
        const { data: resv } = await sb
            .from('library_reservations')
            .select('student_id, library_books(book_name)')
            .eq('id', reservation_id)
            .single();

        if (resv?.student_id) {
            try {
                const student = await User.findById(resv.student_id).select('name email').lean();
                if (student?.email) {
                    await sendEmail(
                        student.email,
                        '📚 Your Reserved Book is Ready!',
                        `<h3>Hello ${student.name},</h3>
                        <p>Great news! The book <strong>${resv.library_books?.book_name}</strong> you reserved is now available.</p>
                        <p>Please visit the library to collect it within 48 hours.</p>`
                    );
                }
                await Notification.create({
                    recipient: new mongoose.Types.ObjectId(resv.student_id),
                    type: 'library',
                    title: '📚 Reserved Book Available!',
                    message: `Your reserved book "${resv.library_books?.book_name}" is ready for pickup!`,
                    relatedId: reservation_id
                });
            } catch (notifyErr) {
                console.error('[Reservation Notify Error]:', notifyErr);
            }
        }

        res.json({ message: 'Reservation fulfilled & student notified' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fulfill reservation' });
    }
});

// ======================================================
// OVERDUE REMINDER SYSTEM
// ======================================================
router.get('/overdue-check', isAuthenticated, requireRole('org_admin', 'library_manager'), async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);

        const { data: overdueTransactions, error } = await sb
            .from('library_transactions')
            .select('*, library_books(book_name)')
            .eq('org_id', orgId)
            .eq('status', 'Issued')
            .lt('due_date', new Date().toISOString());

        if (error) throw error;
        if (!overdueTransactions?.length) return res.json({ message: 'No overdue books!', sent: 0 });

        let sentCount = 0;
        const studentIds = [...new Set(overdueTransactions.map(t => t.student_id))];
        const students = await User.find({ _id: { $in: studentIds } }, 'name email _id').lean();
        const studentMap = students.reduce((acc, s) => { acc[s._id.toString()] = s; return acc; }, {});

        for (const trans of overdueTransactions) {
            const student = studentMap[trans.student_id];
            if (!student?.email) continue;

            const daysOverdue = Math.ceil((Date.now() - new Date(trans.due_date).getTime()) / (1000 * 60 * 60 * 24));
            const fine = daysOverdue * 5;

            try {
                await sendEmail(
                    student.email,
                    '⚠️ Library Book Overdue Reminder',
                    `<h3>Hello ${student.name},</h3>
                    <p>The book <strong>${trans.library_books?.book_name}</strong> was due on <strong>${new Date(trans.due_date).toLocaleDateString()}</strong>.</p>
                    <p>It is now <strong>${daysOverdue} days overdue</strong>. Current fine: <strong>₹${fine}</strong>.</p>
                    <p>Please return it immediately to avoid further fines.</p>`
                );

                await Notification.create({
                    recipient: new mongoose.Types.ObjectId(trans.student_id),
                    type: 'library',
                    title: '⚠️ Overdue Book Reminder',
                    message: `"${trans.library_books?.book_name}" is ${daysOverdue} days overdue. Fine: ₹${fine}. Return ASAP.`,
                    relatedId: trans.id
                });

                sentCount++;
            } catch (mailErr) {
                console.error(`[Overdue Mail Error] Student ${trans.student_id}:`, mailErr.message);
            }
        }

        res.json({
            message: `Sent ${sentCount} overdue reminders`,
            sent: sentCount,
            totalOverdue: overdueTransactions.length
        });
    } catch (err) {
        console.error('[Overdue Check Error]:', err);
        res.status(500).json({ message: 'Failed to check overdue books' });
    }
});

// ======================================================
// ANALYTICS & REPORTS
// ======================================================
router.get('/analytics', isAuthenticated, requireRole('org_admin', 'library_manager'), async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);

        // 1. All transactions
        const { data: allTrans, error: tErr } = await sb
            .from('library_transactions')
            .select('*, library_books(book_name, book_id)')
            .eq('org_id', orgId);
        if (tErr) throw tErr;

        // 2. Most Issued Books (top 10)
        const bookCounts = {};
        for (const t of allTrans) {
            const name = t.library_books?.book_name || 'Unknown';
            bookCounts[name] = (bookCounts[name] || 0) + 1;
        }
        const mostIssued = Object.entries(bookCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ book_name: name, issue_count: count }));

        // 3. Top Defaulters (students with most overdue)
        const now = new Date();
        const overdueByStudent = {};
        for (const t of allTrans) {
            if (t.status === 'Issued' && new Date(t.due_date) < now) {
                overdueByStudent[t.student_id] = (overdueByStudent[t.student_id] || 0) + 1;
            }
        }
        const defaulterIds = Object.keys(overdueByStudent);
        const defaulterStudents = defaulterIds.length > 0
            ? await User.find({ _id: { $in: defaulterIds } }, 'name prn _id').lean()
            : [];
        const defaulterMap = defaulterStudents.reduce((acc, s) => { acc[s._id.toString()] = s; return acc; }, {});
        const topDefaulters = Object.entries(overdueByStudent)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([id, count]) => ({
                student_name: defaulterMap[id]?.name || 'Unknown',
                prn: defaulterMap[id]?.prn || '',
                overdue_count: count
            }));

        // 4. Monthly Trends (last 6 months)
        const monthlyTrends = {};
        for (const t of allTrans) {
            const d = new Date(t.created_at || t.issue_date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyTrends[key]) monthlyTrends[key] = { issued: 0, returned: 0 };
            if (t.status === 'Issued' || t.status === 'Returned') {
                monthlyTrends[key].issued++;
            }
            if (t.status === 'Returned') {
                monthlyTrends[key].returned++;
            }
        }
        const trends = Object.entries(monthlyTrends)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-6)
            .map(([month, data]) => ({ month, ...data }));

        // 5. Summary
        const { data: books } = await sb.from('library_books').select('total_copies, available_copies').eq('org_id', orgId);
        let totalBooks = 0;
        let availableBooks = 0;
        if (books) {
            books.forEach(b => {
                totalBooks += b.total_copies || 0;
                availableBooks += b.available_copies || 0;
            });
        }

        const totalIssued = allTrans.filter(t => t.status === 'Issued').length;
        const totalReturned = allTrans.filter(t => t.status === 'Returned').length;
        const totalOverdue = allTrans.filter(t => t.status === 'Issued' && new Date(t.due_date) < now).length;
        const totalFines = allTrans
            .filter(t => t.status === 'Issued' && new Date(t.due_date) < now)
            .reduce((acc, t) => {
                const days = Math.ceil((now - new Date(t.due_date)) / (1000 * 60 * 60 * 24));
                return acc + days * 5;
            }, 0);

        res.json({
            success: true,
            summary: { totalBooks, availableBooks, totalIssued, totalReturned, totalOverdue, totalFines },
            mostIssued,
            topDefaulters,
            trends
        });
    } catch (err) {
        console.error('[Library Analytics Error]:', err);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
});

// ======================================================
// DELETE BOOK
// ======================================================
router.delete('/books/:id', isAuthenticated, requireRole('org_admin', 'library_manager'), async (req, res) => {
    try {
        const { sb, orgId } = getSbAndOrg(req);
        const { error } = await sb.from('library_books').delete().eq('id', req.params.id).eq('org_id', orgId);
        if (error) throw error;
        res.json({ message: 'Book deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete book' });
    }
});

export default router;
