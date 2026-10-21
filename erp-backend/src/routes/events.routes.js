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
import { primarySupabaseClient as supabase } from '../config/supabaseClient.js';

const router = express.Router();

const getOrgId = (user) => user?.organization_id || user?.org_id || user?.organization?._id || user?.organization;

const getTypePriority = (type) => ({ exam: 5, test: 4, academic: 3, event: 2, holiday: 1 }[type] || 1);

// ══════════════════════════════════════════════════════════════════════════
// ADMIN: CREATE EVENT
// ══════════════════════════════════════════════════════════════════════════
router.post('/', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { title, type, start_date, end_date, description, year_id, department, division_id, recurrence } = req.body;

        if (!title || !type || !start_date) {
            return res.status(400).json({ message: 'Title, type, and start_date are required' });
        }

        const org_id = getOrgId(req.user);
        const calcEndDate = end_date || start_date;

        // --- Overlap Validation (Block Exam/Test over Holiday, or Holiday over Exam/Test) ---
        if (['exam', 'test', 'holiday'].includes(type)) {
            const conflictTypes = type === 'holiday' ? ['exam', 'test'] : ['holiday'];
            
            const { data: overlapping } = await supabase.from('org_events')
                .select('id, title, type')
                .eq('org_id', org_id)
                .in('type', conflictTypes)
                .lte('start_date', calcEndDate)
                .gte('end_date', start_date);

            // Wait, supabase `end_date` can be null. Coalesce it in query is hard, so let's just fetch overlapping based on start_date logic or filter in memory
            const { data: checkEvents } = await supabase.from('org_events')
                .select('id, title, type, start_date, end_date')
                .eq('org_id', org_id)
                .in('type', conflictTypes);

            const sDate = new Date(start_date).getTime();
            const eDate = new Date(calcEndDate).getTime();
            const hasOverlap = checkEvents?.some(ev => {
                const evS = new Date(ev.start_date).getTime();
                const evE = new Date(ev.end_date || ev.start_date).getTime();
                return sDate <= evE && eDate >= evS;
            });

            if (hasOverlap && req.query.force !== 'true') {
                return res.status(409).json({ 
                    needs_force: true, 
                    message: `Warning: This ${type} overlaps with existing critical events. Proceed anyway?` 
                });
            }
        }

        const priority = getTypePriority(type);

        const { data, error } = await supabase.from('org_events').insert({
            org_id,
            created_by: req.user._id.toString(),
            title,
            type,
            start_date,
            end_date: end_date || null,
            description: description || null,
            year_id: year_id || null,
            department: department || null,
            division_id: division_id || null,
            priority,
            recurrence: recurrence || null
        }).select().single();

        if (error) throw error;

        // TODO: Notification hooks can be added here (e.g. notify students of new Exam)
        res.status(201).json({ message: 'Event created', event: data });
    } catch (err) {
        console.error('[Events] Create error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// ADMIN: UPDATE EVENT
// ══════════════════════════════════════════════════════════════════════════
router.put('/:id', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { title, type, start_date, end_date, description, year_id, department, division_id, recurrence } = req.body;
        const updates = {};
        
        if (title !== undefined) updates.title = title;
        if (type !== undefined) {
            updates.type = type;
            updates.priority = getTypePriority(type);
        }
        if (start_date !== undefined) updates.start_date = start_date;
        if (end_date !== undefined) updates.end_date = end_date || null;
        if (description !== undefined) updates.description = description || null;
        if (year_id !== undefined) updates.year_id = year_id || null;
        if (department !== undefined) updates.department = department || null;
        if (division_id !== undefined) updates.division_id = division_id || null;
        if (recurrence !== undefined) updates.recurrence = recurrence ? (typeof recurrence === 'string' ? JSON.parse(recurrence) : recurrence) : null;

        updates.updated_by = req.user._id.toString();

        const { data, error } = await supabase.from('org_events')
            .update(updates).eq('id', req.params.id)
            .select().single();

        if (error) throw error;
        res.json({ message: 'Event updated', event: data });
    } catch (err) {
        console.error('[Events] Update error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// ADMIN: DELETE EVENT
// ══════════════════════════════════════════════════════════════════════════
router.delete('/:id', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { error } = await supabase.from('org_events').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Event deleted' });
    } catch (err) {
        console.error('[Events] Delete error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// EVERYONE: UPCOMING EVENTS (Next 7 Days)
// ══════════════════════════════════════════════════════════════════════════
router.get('/upcoming', isAuthenticated, async (req, res) => {
    try {
        const org_id = getOrgId(req.user);
        const today = new Date().toISOString();
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        let query = supabase.from('org_events')
            .select('*')
            .eq('org_id', org_id)
            .gte('start_date', today)
            .lte('start_date', nextWeek)
            .order('start_date', { ascending: true });

        // Same standard student scoping
        if (req.user.role === 'student') {
            const { data: stuRecord } = await supabase.from('students')
                .select('standard_id, branch_id, division_id').eq('user_id', req.user._id.toString()).single();
                
            if (stuRecord) {
                const terms = ['and(year_id.is.null,department.is.null,division_id.is.null)'];
                if (stuRecord.standard_id) terms.push(`year_id.eq.${stuRecord.standard_id}`);
                if (stuRecord.branch_id) terms.push(`department.eq.${stuRecord.branch_id}`);
                if (stuRecord.division_id) terms.push(`division_id.eq.${stuRecord.division_id}`);
                query = query.or(terms.join(','));
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json({ upcoming: data || [] });

    } catch (err) {
        console.error('[Events] Upcoming error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// EVERYONE: LIST EVENTS (Filtered by scope & Virt-Expanded)
// ══════════════════════════════════════════════════════════════════════════
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const org_id = getOrgId(req.user);
        
        // Start building query
        let query = supabase.from('org_events')
            .select('*')
            .eq('org_id', org_id)
            .order('start_date', { ascending: true });

        // If student, filter out events that don't apply to them
        if (req.user.role === 'student') {
            const studentUser = req.user;
            // A student should see:
            // 1. Global events (year_id IS NULL AND department IS NULL)
            // 2. Events matching their year/standard
            // 3. Events matching their department (if college)
            
            // Note: Since req.user from MongoDB might not have division_id/standard readily available
            // we will fetch their latest profile info from Supabase if needed, OR we can let the frontend send it,
            // OR we use the simplest standard OR logic:
            
            // We use PostgREST OR logic:
            // (year_id IS NULL AND department IS NULL) OR (year_id = 'my-year') OR (department = 'my-dept')
            // Actually, for robust scoping, fetch student from Supabase students table:
            
            const { data: stuRecord } = await supabase.from('students')
                .select('standard_id, branch_id, division_id').eq('user_id', studentUser._id.toString()).single();
                
            if (stuRecord) {
                const terms = [];
                // Global event check
                terms.push('and(year_id.is.null,department.is.null,division_id.is.null)');
                
                // Specific matching
                if (stuRecord.standard_id) terms.push(`year_id.eq.${stuRecord.standard_id}`);
                if (stuRecord.branch_id) terms.push(`department.eq.${stuRecord.branch_id}`);
                if (stuRecord.division_id) terms.push(`division_id.eq.${stuRecord.division_id}`);
                
                query = query.or(terms.join(','));
            }
        }

        const { data, error } = await query;

        if (error) throw error;
        
        // --- Virtual Expansion for Recurring events ---
        // Generates dates across current viewing year based on recurrence JSON
        const expandedEvents = [];
        const expansionLimit = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Max 1yr future
        
        for (const ev of (data || [])) {
            expandedEvents.push(ev);
            
            if (ev.recurrence && typeof ev.recurrence === 'object' && ev.recurrence.freq) {
                const freq = ev.recurrence.freq; // 'WEEKLY', 'MONTHLY'
                let currDate = new Date(ev.start_date);
                const endDate = ev.end_date ? new Date(ev.end_date) : new Date(ev.start_date);
                const duration = endDate.getTime() - currDate.getTime();
                
                // create max 52 virtual ones to avoid loop blowups
                for (let i = 1; i <= 52; i++) {
                    if (freq === 'WEEKLY') currDate.setDate(currDate.getDate() + 7);
                    else if (freq === 'MONTHLY') currDate.setMonth(currDate.getMonth() + 1);
                    
                    if (currDate > expansionLimit) break;
                    
                    expandedEvents.push({
                        ...ev,
                        id: `${ev.id}-virt-${i}`,
                        start_date: new Date(currDate).toISOString(),
                        end_date: ev.end_date ? new Date(currDate.getTime() + duration).toISOString() : null,
                        is_virtual: true
                    });
                }
            }
        }
        
        res.json({ events: expandedEvents });

    } catch (err) {
        console.error('[Events] List error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
