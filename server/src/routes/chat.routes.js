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
import { isAuthenticated } from '../middleware/auth.middleware.js';
import multer from 'multer';
import { getChatReply, getVisionReply, getChatReplyStream } from '../services/chat.js';
import { parsePDF } from '../services/file-parser.js';
import connectDB from '../../config/db.js';
import Classroom from '../models/Classroom.js';
import ClassroomMembership from '../models/ClassroomMembership.js';
import Timetable from '../models/Timetable.js';
import Meeting from '../models/Meeting.js';
import OrganizationAnnouncement from '../models/OrganizationAnnouncement.js';
import User from '../models/User.js';
import QuizSession from '../models/QuizSession.js';
import ExamRecord from '../models/ExamRecord.js';
import StudentMark from '../models/StudentMark.js';
import AttendanceRecord from '../models/AttendanceRecord.js';
import AttendanceSession from '../models/AttendanceSession.js';
import VivaRecord from '../models/VivaRecord.js';
import PastPaper from '../models/PastPaper.js';
import { classroomClient } from '../config/supabaseClient.js';

const router = express.Router();

// Memory storage for Vercel/Serverless compatibility
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 } // 5MB limit
});

/**
 * Build classroom context string for AI — Module 24 RAG Engine
 * 
 * Data Sources (per spec):
 *   1. Classroom info, materials, announcements, quizzes (Supabase)
 *   2. Lecture schedules / Timetable (MongoDB — Timetable model)
 *   3. Academic calendar — holidays, events, notices (MongoDB — OrganizationAnnouncement)
 *   4. Teacher availability (MongoDB — Timetable + Meeting models)
 *   5. Student profile metadata (injected separately in route handler)
 */
async function getClassroomContext(classroomId) {
  try {
    await connectDB();
    const classroom = await Classroom.findById(classroomId).populate('teacher', 'name email').lean();
    if (!classroom) return '';

    let context = `Classroom: ${classroom.name || 'Unnamed'}`;
    if (classroom.subject) context += `\nSubject: ${classroom.subject}`;
    if (classroom.description) context += `\nDescription: ${classroom.description}`;
    if (classroom.year) context += `\nYear: ${classroom.year}`;
    if (classroom.branch) context += `\nBranch: ${classroom.branch}`;
    if (classroom.semester) context += `\nSemester: ${classroom.semester}`;
    if (classroom.division) context += `\nDivision: ${classroom.division}`;

    // ──────────────────────────────────────────────────
    // RAG SOURCE 1: Materials from Supabase
    // ──────────────────────────────────────────────────
    const { data: materials } = await classroomClient
      .from('classroom_content')
      .select('title, type, description, file_url, created_at')
      .eq('classroom_id', classroomId)
      .eq('content_type', 'materials')
      .order('created_at', { ascending: false })
      .limit(10);

    if (materials?.length) {
      context += `\n\nRecent Materials (${materials.length}):`;
      materials.forEach((m, i) => {
        context += `\n${i + 1}. "${m.title}" (${m.type || 'file'})`;
        if (m.description) context += ` — ${m.description}`;
      });

      // Try to extract text from the latest PDF material
      const latestPdf = materials.find(m =>
        m.file_url && (m.type === 'pdf' || m.file_url.endsWith('.pdf') || m.title?.toLowerCase().endsWith('.pdf'))
      );

      if (latestPdf?.file_url) {
        try {
          console.log(`[RAG] Fetching latest PDF for AI context: "${latestPdf.title}"`);
          const pdfRes = await fetch(latestPdf.file_url);
          if (pdfRes.ok) {
            const buffer = Buffer.from(await pdfRes.arrayBuffer());
            const pdfText = await parsePDF(buffer);
            const trimmedText = pdfText.substring(0, 5000);
            context += `\n\n[Latest PDF Content: "${latestPdf.title}"]\n${trimmedText}\n[End of PDF Content]`;
          }
        } catch (pdfErr) {
          console.warn('[RAG] Could not extract PDF text:', pdfErr.message);
        }
      }
    }

    // ──────────────────────────────────────────────────
    // RAG SOURCE 2: Classroom Announcements (Supabase)
    // ──────────────────────────────────────────────────
    const { data: announcements } = await classroomClient
      .from('classroom_content')
      .select('message, created_at')
      .eq('classroom_id', classroomId)
      .eq('content_type', 'announcements')
      .order('created_at', { ascending: false })
      .limit(5);

    if (announcements?.length) {
      context += `\n\nRecent Classroom Announcements:`;
      announcements.forEach((a, i) => {
        context += `\n${i + 1}. ${a.message || '(no content)'}`;
      });
    }

    // ──────────────────────────────────────────────────
    // RAG SOURCE 3: Quizzes (Supabase)
    // ──────────────────────────────────────────────────
    const { data: quizzes } = await classroomClient
      .from('classroom_content')
      .select('title, description, duration')
      .eq('classroom_id', classroomId)
      .eq('content_type', 'quizzes')
      .order('created_at', { ascending: false })
      .limit(5);

    if (quizzes?.length) {
      context += `\n\nQuizzes:`;
      quizzes.forEach((q, i) => {
        context += `\n${i + 1}. "${q.title}" (${q.duration || 30} min)`;
        if (q.description) context += ` — ${q.description}`;
      });
    }

    // ──────────────────────────────────────────────────
    // RAG SOURCE 4: Lecture Schedule / Timetable (MongoDB)
    // Fetches today's + full weekly schedule for this classroom
    // ──────────────────────────────────────────────────
    try {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];

      // Today's lectures for this classroom
      const todaySchedule = await Timetable.find({
        classroom: classroomId,
        day: today
      }).sort({ startTime: 1 }).lean();

      if (todaySchedule.length > 0) {
        context += `\n\n[TODAY'S LECTURE SCHEDULE — ${today}]`;
        todaySchedule.forEach((slot, i) => {
          context += `\n${i + 1}. ${slot.startTime}–${slot.endTime} | ${slot.subject} (${slot.type})`;
          if (slot.teacher) context += ` | Teacher: ${slot.teacher}`;
          if (slot.room) context += ` | Room: ${slot.room}`;
        });
      } else {
        context += `\n\n[TODAY'S SCHEDULE — ${today}]: No lectures scheduled today.`;
      }

      // Full weekly timetable (compact)
      const weeklySchedule = await Timetable.find({
        classroom: classroomId
      }).sort({ day: 1, startTime: 1 }).lean();

      if (weeklySchedule.length > 0) {
        context += `\n\n[WEEKLY TIMETABLE]`;
        const byDay = {};
        weeklySchedule.forEach(slot => {
          if (!byDay[slot.day]) byDay[slot.day] = [];
          byDay[slot.day].push(`${slot.startTime}–${slot.endTime} ${slot.subject} (${slot.type})${slot.room ? ' R:' + slot.room : ''}`);
        });
        for (const [day, slots] of Object.entries(byDay)) {
          context += `\n${day}: ${slots.join(' | ')}`;
        }
      }
    } catch (ttErr) {
      console.warn('[RAG] Timetable fetch skipped:', ttErr.message);
    }

    // ──────────────────────────────────────────────────
    // RAG SOURCE 5: Teacher Availability (MongoDB)
    // Shows the teacher's full schedule + upcoming meetings
    // ──────────────────────────────────────────────────
    try {
      const teacherId = classroom.teacher?._id || classroom.teacher;
      if (teacherId) {
        // Teacher's name
        const teacherName = classroom.teacher?.name || 'Unknown';
        context += `\n\n[TEACHER INFO]`;
        context += `\nName: ${teacherName}`;

        // Teacher's full schedule across ALL classrooms (to show busy/free slots)
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];

        const teacherTodaySlots = await Timetable.find({
          $or: [
            { user: teacherId },
            { organization: classroom.organization_id }
          ],
          day: today
        }).sort({ startTime: 1 }).lean();

        // Filter to only this teacher's slots (by user ref or teacher name)
        const teacherSlots = teacherTodaySlots.filter(s =>
          (s.user && s.user.toString() === teacherId.toString()) ||
          (s.teacher && s.teacher.toLowerCase() === teacherName.toLowerCase())
        );

        if (teacherSlots.length > 0) {
          context += `\nToday's Schedule (${today}):`;
          teacherSlots.forEach(s => {
            context += `\n  ${s.startTime}–${s.endTime} | ${s.subject} (${s.type})${s.room ? ' | Room: ' + s.room : ''}`;
          });

          // Determine current availability
          const now = new Date();
          const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const busyNow = teacherSlots.find(s => s.startTime <= currentHHMM && s.endTime > currentHHMM);
          if (busyNow) {
            context += `\nCurrent Status: BUSY (in ${busyNow.subject} until ${busyNow.endTime})`;
          } else {
            const nextSlot = teacherSlots.find(s => s.startTime > currentHHMM);
            if (nextSlot) {
              context += `\nCurrent Status: AVAILABLE (next class at ${nextSlot.startTime})`;
            } else {
              context += `\nCurrent Status: AVAILABLE (no more classes today)`;
            }
          }
        } else {
          context += `\nToday's Schedule: No classes scheduled (teacher is likely available).`;
        }

        // Upcoming meetings for this classroom
        const upcomingMeetings = await Meeting.find({
          classroom: classroomId,
          start_time: { $gte: new Date() }
        }).sort({ start_time: 1 }).limit(3).lean();

        if (upcomingMeetings.length > 0) {
          context += `\n\n[UPCOMING MEETINGS]`;
          upcomingMeetings.forEach((m, i) => {
            const dateStr = new Date(m.start_time).toLocaleString('en-IN', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: true
            });
            context += `\n${i + 1}. "${m.topic}" — ${dateStr} (${m.duration} min) via ${m.provider}`;
          });
        }
      }
    } catch (teacherErr) {
      console.warn('[RAG] Teacher availability fetch skipped:', teacherErr.message);
    }

    // ──────────────────────────────────────────────────
    // RAG SOURCE 6: Academic Calendar (MongoDB)
    // Organization-level events, holidays, notices
    // ──────────────────────────────────────────────────
    try {
      if (classroom.organization_id) {
        const orgAnnouncements = await OrganizationAnnouncement.find({
          organization_id: classroom.organization_id,
          status: 'published',
          $or: [
            { target_type: 'all' },
            { target_classrooms: classroomId }
          ]
        })
          .sort({ sent_at: -1 })
          .limit(5)
          .lean();

        if (orgAnnouncements.length > 0) {
          // Separate into holidays/events vs general notices
          const holidays = orgAnnouncements.filter(a => a.type === 'holiday' || a.type === 'event');
          const notices = orgAnnouncements.filter(a => a.type !== 'holiday' && a.type !== 'event');

          if (holidays.length > 0) {
            context += `\n\n[ACADEMIC CALENDAR — Holidays & Events]`;
            holidays.forEach((h, i) => {
              const dateStr = h.sent_at ? new Date(h.sent_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '';
              context += `\n${i + 1}. [${h.type.toUpperCase()}] ${h.title}${dateStr ? ' (' + dateStr + ')' : ''}`;
              if (h.content) context += ` — ${h.content.substring(0, 200)}`;
            });
          }

          if (notices.length > 0) {
            context += `\n\n[ORG NOTICES]`;
            notices.forEach((n, i) => {
              context += `\n${i + 1}. [${(n.type || 'notice').toUpperCase()}] ${n.title}`;
              if (n.content) context += ` — ${n.content.substring(0, 200)}`;
            });
          }
        }
      }
    } catch (calErr) {
      console.warn('[RAG] Academic calendar fetch skipped:', calErr.message);
    }

    return context;
  } catch (err) {
    console.error('[RAG] Failed to fetch classroom context:', err.message);
    return '';
  }
}

/**
 * Build STUDENT PERFORMANCE context for AI — Module 24 RAG Engine
 * 
 * Personal Data Sources:
 *   7. Exam results & scores (StudentMark) — grades, marks, subject-wise weakness
 *   8. Quiz history (QuizSession) — recent scores, wrong answers, weak topics
 *   9. Viva performance (VivaRecord) — weak/strong areas, confidence scores
 *  10. Attendance percentage (AttendanceRecord + AttendanceSession)
 *  11. Upcoming exams (ExamRecord) — exam schedule
 *  12. AI Study Suggestions — auto-generated from weak areas
 */
async function getStudentPerformanceContext(userId, classroomId) {
  if (!userId) return '';
  let context = '';

  try {
    await connectDB();

    // ──────────────────────────────────────────────────
    // RAG SOURCE 7: Exam Results & Subject Weakness (StudentMark)
    // ──────────────────────────────────────────────────
    const weakSubjects = [];
    try {
      const marks = await StudentMark.find({
        student: userId,
        ...(classroomId ? { classroom: classroomId } : {})
      })
        .populate('examRecord', 'title examType totalMarks passingMarks')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (marks.length > 0) {
        context += `\n\n[YOUR EXAM RESULTS (Last ${marks.length} exams)]`;
        marks.forEach((m, i) => {
          const examTitle = m.examRecord?.title || 'Exam';
          const examType = m.examRecord?.examType || 'other';
          context += `\n${i + 1}. ${examTitle} (${examType}) — ${m.marksObtained}/${m.totalMarks} (${m.percentage}%) Grade: ${m.grade} ${m.isPassed ? '✅ PASS' : '❌ FAIL'}`;

          // Subject-wise breakdown for weakness detection
          if (m.subjectMarks?.length > 0) {
            m.subjectMarks.forEach(sm => {
              const pct = Math.round((sm.marksObtained / sm.maxMarks) * 100);
              if (pct < 50) {
                weakSubjects.push(sm.subjectName);
                context += `\n   ⚠️ WEAK: ${sm.subjectName} — ${sm.marksObtained}/${sm.maxMarks} (${pct}%)`;
              }
            });
          }
        });

        // Overall performance summary
        const avgPct = Math.round(marks.reduce((sum, m) => sum + m.percentage, 0) / marks.length);
        const passRate = Math.round((marks.filter(m => m.isPassed).length / marks.length) * 100);
        context += `\nOverall Average: ${avgPct}% | Pass Rate: ${passRate}%`;
      }
    } catch (markErr) {
      console.warn('[RAG] Exam results fetch skipped:', markErr.message);
    }

    // ──────────────────────────────────────────────────
    // RAG SOURCE 8: Quiz History — Scores + Wrong Answers (QuizSession)
    // ──────────────────────────────────────────────────
    const weakQuizTopics = [];
    try {
      const quizSessions = await QuizSession.find({
        userId: userId,
        ...(classroomId ? { classroomId: classroomId } : {})
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      if (quizSessions.length > 0) {
        context += `\n\n[YOUR RECENT QUIZ PERFORMANCE (Last ${quizSessions.length})]`;
        quizSessions.forEach((qs, i) => {
          context += `\n${i + 1}. ${qs.subject}/${qs.topic} (${qs.difficulty}) — Score: ${qs.score}/${qs.totalQuestions} (${qs.percentage}%)`;

          // Show what they got WRONG
          const wrongOnes = qs.questions?.filter(q => !q.isCorrect) || [];
          if (wrongOnes.length > 0) {
            context += ` | ❌ Got ${wrongOnes.length} wrong:`;
            wrongOnes.slice(0, 3).forEach(wq => {
              context += `\n   Q: "${wq.question.substring(0, 80)}..." Your ans: "${wq.studentAnswer}" Correct: "${wq.correctAnswer}"`;
            });
            weakQuizTopics.push(qs.topic);
          }
        });

        const avgQuizPct = Math.round(quizSessions.reduce((s, q) => s + q.percentage, 0) / quizSessions.length);
        context += `\nQuiz Average: ${avgQuizPct}%`;
      }
    } catch (quizErr) {
      console.warn('[RAG] Quiz history fetch skipped:', quizErr.message);
    }

    // ──────────────────────────────────────────────────
    // RAG SOURCE 9: Viva Performance (VivaRecord)
    // ──────────────────────────────────────────────────
    const vivaWeakAreas = [];
    try {
      const vivaRecords = await VivaRecord.find({
        userId: userId.toString(),
        ...(classroomId ? { classroomId: classroomId } : {})
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      if (vivaRecords.length > 0) {
        context += `\n\n[YOUR VIVA PERFORMANCE (Last ${vivaRecords.length})]`;
        vivaRecords.forEach((v, i) => {
          context += `\n${i + 1}. ${v.topic} (${v.mode}) — Score: ${v.totalScore}/5`;
          context += ` | Knowledge: ${v.parameters?.knowledge || 0}/5, Clarity: ${v.parameters?.clarity || 0}/5, Confidence: ${v.parameters?.confidence || 0}/5, Accuracy: ${v.parameters?.accuracy || 0}/5`;
          if (v.weakAreas?.length) {
            context += ` | Weak: ${v.weakAreas.join(', ')}`;
            vivaWeakAreas.push(...v.weakAreas);
          }
          if (v.strongAreas?.length) context += ` | Strong: ${v.strongAreas.join(', ')}`;
        });
      }
    } catch (vivaErr) {
      console.warn('[RAG] Viva records fetch skipped:', vivaErr.message);
    }

    // ──────────────────────────────────────────────────
    // RAG SOURCE 10: Attendance Percentage (AttendanceRecord)
    // ──────────────────────────────────────────────────
    try {
      if (classroomId) {
        // Total sessions for this classroom
        const totalSessions = await AttendanceSession.countDocuments({ classroom: classroomId });
        // Student's present records
        const presentCount = await AttendanceRecord.countDocuments({
          student: userId,
          classroom: classroomId
        });

        const attendancePct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
        context += `\n\n[YOUR ATTENDANCE]`;
        context += `\nPresent: ${presentCount}/${totalSessions} sessions (${attendancePct}%)`;
        if (attendancePct < 75) {
          context += `\n⚠️ WARNING: Attendance below 75%! You may face eligibility issues for exams.`;
        } else if (attendancePct >= 90) {
          context += `\n🌟 Excellent attendance!`;
        }
      }
    } catch (attErr) {
      console.warn('[RAG] Attendance fetch skipped:', attErr.message);
    }

    // ──────────────────────────────────────────────────
    // RAG SOURCE 11: Upcoming Exams (ExamRecord)
    // ──────────────────────────────────────────────────
    try {
      if (classroomId) {
        const upcomingExams = await ExamRecord.find({
          classroom: classroomId,
          status: { $in: ['draft', 'verified', 'published', 'active'] }
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        if (upcomingExams.length > 0) {
          context += `\n\n[EXAM SCHEDULE]`;
          upcomingExams.forEach((e, i) => {
            context += `\n${i + 1}. "${e.title}" (${e.examType}) — Total: ${e.totalMarks} marks, Passing: ${e.passingMarks} marks`;
            if (e.subjects?.length) {
              context += ` | Subjects: ${e.subjects.map(s => s.subjectName + ' (' + s.maxMarks + 'm)').join(', ')}`;
            }
            // Show class analytics if available
            if (e.analytics?.classAverage > 0) {
              context += `\n   Class Avg: ${e.analytics.classAverage}% | Pass Rate: ${e.analytics.passPercentage}% | Highest: ${e.analytics.highest} | Lowest: ${e.analytics.lowest}`;
            }
          });
        }
      }
    } catch (examErr) {
      console.warn('[RAG] Exam schedule fetch skipped:', examErr.message);
    }

    // ──────────────────────────────────────────────────
    // RAG SOURCE 12: AI Study Suggestions (Auto-generated)
    // Compiled from all weak areas across exams, quizzes, vivas
    // ──────────────────────────────────────────────────
    const allWeakAreas = [...new Set([...weakSubjects, ...weakQuizTopics, ...vivaWeakAreas])];
    if (allWeakAreas.length > 0) {
      context += `\n\n[STUDY SUGGESTIONS — Focus Areas]`;
      context += `\nBased on your exam results, quiz scores, and viva performance, you should focus on:`;
      allWeakAreas.forEach((area, i) => {
        context += `\n${i + 1}. 📚 ${area}`;
      });
      context += `\n\n[INSTRUCTION FOR AI: When the student asks for study tips or "what should I study?", use these weak areas to give specific, targeted recommendations. Do NOT just list them — explain WHY they are weak and HOW to improve.]`;
    }

    // ──────────────────────────────────────────────────
    // RAG SOURCE 13: Past Paper Analysis — Repeated Questions + Topic Patterns
    // ──────────────────────────────────────────────────
    try {
      if (classroomId) {
        // Get the classroom's subject to find matching past papers
        const classroom = await Classroom.findById(classroomId).select('subject organization_id').lean();
        if (classroom?.subject) {
          const currentYear = new Date().getFullYear();
          const papers = await PastPaper.find({
            organization_id: classroom.organization_id,
            subject: classroom.subject.toLowerCase().trim(),
            year: { $gte: currentYear - 5 },
            status: { $in: ['extracted', 'analyzed'] },
          }).sort({ year: -1 }).limit(10).lean();

          if (papers.length > 0) {
            // Find repeated questions across papers
            const questionMap = {};
            papers.forEach(p => {
              p.questions?.forEach(q => {
                const key = q.normalizedText || q.questionText?.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 80);
                if (key) {
                  if (!questionMap[key]) questionMap[key] = { text: q.questionText, topic: q.topic, years: [] };
                  questionMap[key].years.push(p.year);
                }
              });
            });

            const repeated = Object.values(questionMap)
              .filter(r => r.years.length >= 2)
              .sort((a, b) => b.years.length - a.years.length)
              .slice(0, 10);

            if (repeated.length > 0) {
              context += `\n\n[PAST PAPER ANALYSIS — ${papers.length} papers from last 5 years]`;
              context += `\n🔥 MOST REPEATED QUESTIONS (appeared 2+ times):`;
              repeated.forEach((r, i) => {
                context += `\n${i + 1}. "${r.text?.substring(0, 100)}..." — appeared ${r.years.length}x (Years: ${[...new Set(r.years)].join(', ')})${r.topic ? ' [Topic: ' + r.topic + ']' : ''}`;
              });
            }

            // Most-tested topics
            const topicCounts = {};
            papers.forEach(p => {
              p.analysis?.topTopics?.forEach(t => {
                topicCounts[t.topic] = (topicCounts[t.topic] || 0) + t.count;
              });
            });

            const hotTopics = Object.entries(topicCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8);

            if (hotTopics.length > 0) {
              context += `\n\n📊 MOST TESTED TOPICS (across ${papers.length} papers):`;
              hotTopics.forEach(([topic, count], i) => {
                context += `\n${i + 1}. ${topic} — ${count} questions total`;
              });
              context += `\n\n[INSTRUCTION FOR AI: When the student asks about "important questions", "what comes in exam", or "repeated questions", use this past paper data to give specific, data-backed study advice.]`;
            }
          }
        }
      }
    } catch (ppErr) {
      console.warn('[RAG] Past paper analysis fetch skipped:', ppErr.message);
    }

  } catch (err) {
    console.warn('[RAG] Student performance context error:', err.message);
  }

  return context;
}

/**
 * GET /api/chat/classroom-context/:classroomId
 * Returns recent classroom activity as JSON for the assistant welcome screen
 */
router.get('/classroom-context/:classroomId', async (req, res) => {
  try {
    const { classroomId } = req.params;
    if (!classroomId) return res.status(400).json({ error: 'classroomId required' });

    await connectDB();
    const classroom = await Classroom.findById(classroomId).select('name subject description').lean();
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    // Fetch recent announcements
    const { data: announcements } = await classroomClient
      .from('classroom_content')
      .select('id, message, created_at')
      .eq('classroom_id', classroomId)
      .eq('content_type', 'announcements')
      .order('created_at', { ascending: false })
      .limit(3);

    // Fetch recent materials/notes
    const { data: materials } = await classroomClient
      .from('classroom_content')
      .select('id, title, type, description, created_at')
      .eq('classroom_id', classroomId)
      .eq('content_type', 'materials')
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch recent quizzes
    const { data: quizzes } = await classroomClient
      .from('classroom_content')
      .select('id, title, description, duration, created_at')
      .eq('classroom_id', classroomId)
      .eq('content_type', 'quizzes')
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      classroom: { name: classroom.name, subject: classroom.subject || '' },
      announcements: announcements || [],
      materials: materials || [],
      quizzes: quizzes || []
    });
  } catch (err) {
    console.error('Classroom context fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch classroom context' });
  }
});

router.post('/stream', upload.none(), async (req, res) => {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    let message = req.body.message || '';
    const mode = req.body.mode || 'chat';
    const classroomId = req.body.classroomId || '';

    // Build user profile context
    const userName = req.body.userName || req.body.username || req.body.displayName || 'Student';
    const userPrn = req.body.userPrn || '';
    const userRole = req.body.userRole || 'Student';
    const userDept = req.body.userDept || '';
    const userOrg = req.body.userOrg || '';
    const userId = req.body.userId || '';
    const isFirstMessage = req.body.isFirstMessage === 'true' || req.body.isFirstMessage === true;

    let userContext = '';

    // Always build the profile if we have ANY identifier
    userContext = `\n[STUDENT PROFILE]`;
    userContext += `\nName: ${userName}`;
    if (userPrn) userContext += `\nPRN/Roll No: ${userPrn}`;
    if (userRole) userContext += `\nRole: ${userRole}`;
    if (userDept) userContext += `\nDepartment: ${userDept}`;
    if (userOrg) userContext += `\nCollege/Organization: ${userOrg}`;

    // Try to get enrolled classrooms count
    if (userId) {
      try {
        await connectDB();
        const memberships = await ClassroomMembership.find({ student: userId, status: 'approved' }).populate('classroom', 'name subject').lean();
        if (memberships.length) {
          userContext += `\nEnrolled Classrooms: ${memberships.map(m => m.classroom ? m.classroom.name : 'Unknown Classroom').join(', ')}`;
        } else {
          userContext += `\nEnrolled Classrooms: 0 (New User)`;

          if (isFirstMessage) {
            userContext += `\n
[NEW USER ONBOARDING INSTRUCTIONS]
This student hasn't joined any classrooms yet. They are brand new!
Greet them enthusiastically as "Hi ${userName}!"
Tell them you are excited to help them, and clearly explain the following steps using emojis:
1. **Join a Classroom**: "First, ask your teacher for a 10-digit Classroom Code to join their class! 🏫"
2. **Auto-Link**: "Once you join your first classroom, you are automatically linked to your college/organization."
3. **Features**: "After joining, I can help you with lecture notes, quizzes, announcements, and even simulate oral viva exams! 🎓"
4. **Honor Code**: "Remember to uphold the Classgrid Honor Code as we learn together."
Keep the tone very warm, helpful, and structured.
[END ONBOARDING INSTRUCTIONS]`;
          }
        }
      } catch (e) { /* non-critical */ }
    }

    userContext += `\n[END STUDENT PROFILE]`;

    if (isFirstMessage) {
      userContext += '\n[INSTRUCTION: This is the first message of the session. Please include a short, professional greeting using the student\'s first name as instructed.]';
    } else {
      userContext += '\n[INSTRUCTION: This is an ongoing conversation. DO NOT include any greetings or welcome messages. Do NOT use the student\'s name. Start your response directly with the answer/information.]';
    }

    // Fetch classroom context if provided
    let classroomContext = '';
    if (classroomId) {
      classroomContext = await getClassroomContext(classroomId);
    }

    // Fetch student's personal performance data
    let performanceContext = '';
    if (userId) {
      performanceContext = await getStudentPerformanceContext(userId, classroomId);
    }

    // Merge user + classroom + performance context
    const fullContext = (userContext + '\n' + classroomContext + '\n' + performanceContext).trim();

    // Parse conversation history (sent from frontend)
    let history = [];
    try {
      const rawHistory = req.body.history;
      if (rawHistory) {
        history = (typeof rawHistory === 'string' ? JSON.parse(rawHistory) : rawHistory)
          .filter(m => m.text && m.text.trim());
      }
    } catch (_) { /* ignore parse errors */ }

    // Stream the response with conversation history
    await getChatReplyStream(message, 'groq', mode, fullContext, res, history);
  } catch (error) {
    console.error('Chat Stream API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process request', details: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Failed to stream response." })}\n\n`);
      res.end();
    }
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    let message = req.body.message || '';
    const file = req.file;
    const mode = req.body.mode || 'chat';
    const classroomId = req.body.classroomId || '';

    // Build user profile context
    const userName = req.body.userName || req.body.username || req.body.displayName || 'Student';
    const userPrn = req.body.userPrn || '';
    const userRole = req.body.userRole || 'Student';
    const userDept = req.body.userDept || '';
    const userOrg = req.body.userOrg || '';
    const userId = req.body.userId || '';
    const isFirstMessage = req.body.isFirstMessage === 'true' || req.body.isFirstMessage === true;

    let userContext = '';

    // Always build the profile if we have ANY identifier
    userContext = `\n[STUDENT PROFILE]`;
    userContext += `\nName: ${userName}`;
    if (userPrn) userContext += `\nPRN/Roll No: ${userPrn}`;
    if (userRole) userContext += `\nRole: ${userRole}`;
    if (userDept) userContext += `\nDepartment: ${userDept}`;
    if (userOrg) userContext += `\nCollege/Organization: ${userOrg}`;

    // Try to get enrolled classrooms count
    if (userId) {
      try {
        await connectDB();
        // The ClassroomMembership schema uses "student" ObjectId and references "Classroom"
        const memberships = await ClassroomMembership.find({ student: userId, status: 'approved' }).populate('classroom', 'name subject').lean();
        if (memberships.length) {
          userContext += `\nEnrolled Classrooms: ${memberships.map(m => m.classroom ? m.classroom.name : 'Unknown Classroom').join(', ')}`;
        } else {
          userContext += `\nEnrolled Classrooms: 0 (New User)`;

          if (isFirstMessage) {
            userContext += `\n
[NEW USER ONBOARDING INSTRUCTIONS]
This student hasn't joined any classrooms yet. They are brand new!
Greet them enthusiastically as "Hi ${userName}!"
Tell them you are excited to help them, and clearly explain the following steps using emojis:
1. **Join a Classroom**: "First, ask your teacher for a 10-digit Classroom Code to join their class! 🏫"
2. **Auto-Link**: "Once you join your first classroom, you are automatically linked to your college/organization."
3. **Features**: "After joining, I can help you with lecture notes, quizzes, announcements, and even simulate oral viva exams! 🎓"
4. **Honor Code**: "Remember to uphold the Classgrid Honor Code as we learn together."
Keep the tone very warm, helpful, and structured.
[END ONBOARDING INSTRUCTIONS]`;
          }
        }
      } catch (e) { /* non-critical */ }
    }

    userContext += `\n[END STUDENT PROFILE]`;

    if (isFirstMessage) {
      userContext += '\n[INSTRUCTION: This is the first message of the session. Please include a short, professional greeting using the student\'s first name as instructed.]';
    } else {
      userContext += '\n[INSTRUCTION: This is an ongoing conversation. DO NOT include any greetings or welcome messages. Do NOT use the student\'s name. Start your response directly with the answer/information.]';
    }

    // Fetch classroom context if provided
    let classroomContext = '';
    if (classroomId) {
      classroomContext = await getClassroomContext(classroomId);
    }

    // Fetch student's personal performance data
    let performanceContext = '';
    if (userId) {
      performanceContext = await getStudentPerformanceContext(userId, classroomId);
    }

    // Merge user + classroom + performance context
    const fullContext = (userContext + '\n' + classroomContext + '\n' + performanceContext).trim();

    // If file is present
    if (file) {
      console.log(`Processing file: ${file.originalname} (${file.mimetype})`);

      if (file.mimetype === 'application/pdf') {
        const pdfText = await parsePDF(file.buffer);
        message += `\n\n[Attached PDF Content: ${file.originalname}]\n${pdfText}\n[End of PDF]`;
        const reply = await getChatReply(message, 'groq', mode, fullContext);
        return res.json({ reply });

      } else if (file.mimetype.startsWith('image/')) {
        const base64Image = file.buffer.toString('base64');
        const mimeType = file.mimetype;
        const reply = await getVisionReply(message, base64Image, mimeType, 'groq');
        return res.json({ reply });
      }
    }

    // Standard text-only chat
    const reply = await getChatReply(message, 'groq', mode, fullContext);
    res.json({ reply });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
});
// ─────────────────────────────────────────────
// GET GROUPS IN COMMON
// ─────────────────────────────────────────────
router.get('/groups-in-common/:userId', isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id.toString();

    // Find classrooms where both users are approved members
    const myMemberships = await ClassroomMembership.find({ student: myId, status: 'approved' }).select('classroom').lean();
    const myClassroomIds = myMemberships.map(m => m.classroom.toString());

    const theirMemberships = await ClassroomMembership.find({ student: userId, status: 'approved', classroom: { $in: myClassroomIds } })
      .populate('classroom', 'name')
      .lean();
      
    const commonClassrooms = theirMemberships.map(m => ({
      id: m.classroom._id,
      name: m.classroom.name
    }));

    res.json({ groups: commonClassrooms });
  } catch (error) {
    console.error('Groups in common API Error:', error);
    res.status(500).json({ error: 'Failed to fetch groups in common' });
  }
});

export default router;
