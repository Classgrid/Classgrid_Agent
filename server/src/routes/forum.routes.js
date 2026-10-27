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

import express from "express";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import ForumPost from "../models/ForumPost.js";
import ForumComment from "../models/ForumComment.js";

const router = express.Router();

// ══════════════════════════════════════════════════════════════
//  GET /api/forum/posts — List all posts (with filters)
// ══════════════════════════════════════════════════════════════
const GLOBAL_ORG_ID = "661a73e86366f10000000001"; // Reserved ID for Classgrid Global Forum

router.get("/posts", isAuthenticated, async (req, res) => {
    try {
        const { category, sort = "hot", search, scope = "institute", page = 1, limit = 20 } = req.query;

        const orgId = scope === "global" 
            ? GLOBAL_ORG_ID 
            : (req.effectiveOrganizationId || req.user.organization_id);

        const filter = { organization_id: orgId, isDeleted: false };
        if (category && category !== "all") filter.category = category;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { body: { $regex: search, $options: "i" } }
            ];
        }

        const sortOption = sort === "new"
            ? { isPinned: -1, createdAt: -1 }
            : { isPinned: -1, upvotes: -1, createdAt: -1 };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [posts, total] = await Promise.all([
            ForumPost.find(filter)
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .populate("author", "name email role profilePicture")
                .lean(),
            ForumPost.countDocuments(filter)
        ]);

        res.json({ success: true, posts, total, page: parseInt(page) });
    } catch (err) {
        console.error("[Forum] List error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/forum/posts — Create a new post
// ══════════════════════════════════════════════════════════════
router.post("/posts", isAuthenticated, async (req, res) => {
    try {
        const { title, body, category, tags, scope = "institute" } = req.body;
        if (!title?.trim() || !body?.trim()) {
            return res.status(400).json({ success: false, message: "Title and body are required" });
        }

        const orgId = scope === "global" 
            ? GLOBAL_ORG_ID 
            : (req.effectiveOrganizationId || req.user.organization_id);

        const post = await ForumPost.create({
            title: title.trim(),
            body: body.trim(),
            category: category || "general",
            tags: tags || [],
            author: req.user._id,
            organization_id: orgId
        });

        const populated = await ForumPost.findById(post._id)
            .populate("author", "name email role profilePicture")
            .lean();

        res.status(201).json({ success: true, post: populated });
    } catch (err) {
        console.error("[Forum] Create error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/forum/posts/:id/upvote — Toggle upvote
// ══════════════════════════════════════════════════════════════
router.post("/posts/:id/upvote", isAuthenticated, async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        const userId = req.user._id;
        const alreadyUpvoted = post.upvotedBy.includes(userId);

        if (alreadyUpvoted) {
            post.upvotedBy.pull(userId);
            post.upvotes = Math.max(0, post.upvotes - 1);
        } else {
            post.upvotedBy.push(userId);
            post.upvotes += 1;
        }
        await post.save();

        res.json({ success: true, upvotes: post.upvotes, upvoted: !alreadyUpvoted });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  GET /api/forum/posts/:id — Get single post with comments
// ══════════════════════════════════════════════════════════════
router.get("/posts/:id", isAuthenticated, async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id)
            .populate("author", "name email role profilePicture")
            .lean();
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        const comments = await ForumComment.find({ post: post._id, isDeleted: false })
            .sort({ createdAt: 1 })
            .populate("author", "name email role profilePicture")
            .lean();

        res.json({ success: true, post, comments });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/forum/posts/:id/comments — Add a comment
// ══════════════════════════════════════════════════════════════
router.post("/posts/:id/comments", isAuthenticated, async (req, res) => {
    try {
        const { body, parentComment } = req.body;
        if (!body?.trim()) return res.status(400).json({ success: false, message: "Comment body is required" });

        const post = await ForumPost.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });
        if (post.isLocked) return res.status(403).json({ success: false, message: "This post is locked" });

        const comment = await ForumComment.create({
            post: post._id,
            parentComment: parentComment || null,
            body: body.trim(),
            author: req.user._id,
            organization_id: req.effectiveOrganizationId || req.user.organization_id
        });

        // Increment comment count
        post.commentCount += 1;
        await post.save();

        const populated = await ForumComment.findById(comment._id)
            .populate("author", "name email role profilePicture")
            .lean();

        res.status(201).json({ success: true, comment: populated });
    } catch (err) {
        console.error("[Forum] Comment error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  PATCH /api/forum/posts/:id/pin — Pin/Unpin (admin only)
// ══════════════════════════════════════════════════════════════
router.patch("/posts/:id/pin", isAuthenticated, requireRole("org_admin", "super_admin"), async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        post.isPinned = !post.isPinned;
        await post.save();

        res.json({ success: true, isPinned: post.isPinned });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  DELETE /api/forum/posts/:id — Soft delete (author or admin)
// ══════════════════════════════════════════════════════════════
router.delete("/posts/:id", isAuthenticated, async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        const isAuthor = post.author.toString() === req.user._id.toString();
        const isAdmin = ["org_admin", "super_admin"].includes(req.user.role);
        if (!isAuthor && !isAdmin) return res.status(403).json({ success: false, message: "Not authorized" });

        post.isDeleted = true;
        await post.save();

        res.json({ success: true, message: "Post deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  PATCH /api/forum/posts/:id/lock — Lock/Unlock thread (admin only)
// ══════════════════════════════════════════════════════════════
router.patch("/posts/:id/lock", isAuthenticated, requireRole("org_admin", "super_admin"), async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        post.isLocked = !post.isLocked;
        await post.save();

        res.json({ success: true, isLocked: post.isLocked, message: post.isLocked ? "Thread locked" : "Thread unlocked" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/forum/comments/:id/upvote — Toggle comment upvote
// ══════════════════════════════════════════════════════════════
router.post("/comments/:id/upvote", isAuthenticated, async (req, res) => {
    try {
        const comment = await ForumComment.findById(req.params.id);
        if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

        const userId = req.user._id;
        const alreadyUpvoted = comment.upvotedBy.includes(userId);

        if (alreadyUpvoted) {
            comment.upvotedBy.pull(userId);
            comment.upvotes = Math.max(0, comment.upvotes - 1);
        } else {
            comment.upvotedBy.push(userId);
            comment.upvotes += 1;
        }
        await comment.save();

        res.json({ success: true, upvotes: comment.upvotes, upvoted: !alreadyUpvoted });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  DELETE /api/forum/comments/:id — Soft delete comment (author or admin)
// ══════════════════════════════════════════════════════════════
router.delete("/comments/:id", isAuthenticated, async (req, res) => {
    try {
        const comment = await ForumComment.findById(req.params.id);
        if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

        const isAuthor = comment.author.toString() === req.user._id.toString();
        const isAdmin = ["org_admin", "super_admin"].includes(req.user.role);
        if (!isAuthor && !isAdmin) return res.status(403).json({ success: false, message: "Not authorized" });

        comment.isDeleted = true;
        await comment.save();

        // Decrement comment count on the parent post
        await ForumPost.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } });

        res.json({ success: true, message: "Comment deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN: GET /api/forum/admin/posts — All posts across all orgs
// ══════════════════════════════════════════════════════════════
router.get("/admin/posts", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { status, scope, category, page = 1, limit = 30 } = req.query;
        const filter = {};

        // Filter by scope
        if (scope === "global") filter.organization_id = GLOBAL_ORG_ID;
        else if (scope === "institute") filter.organization_id = { $ne: GLOBAL_ORG_ID };

        // Filter by category
        if (category && category !== "all") filter.category = category;

        // Filter by status
        if (status === "deleted") filter.isDeleted = true;
        else if (status === "locked") filter.isLocked = true;
        else if (status === "pinned") filter.isPinned = true;
        else filter.isDeleted = false; // Default: show active

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [posts, total] = await Promise.all([
            ForumPost.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("author", "name email role profilePicture")
                .populate("organization_id", "name slug")
                .lean(),
            ForumPost.countDocuments(filter)
        ]);

        // Stats
        const [totalPosts, globalPosts, pinnedPosts, lockedPosts, deletedPosts] = await Promise.all([
            ForumPost.countDocuments({ isDeleted: false }),
            ForumPost.countDocuments({ organization_id: GLOBAL_ORG_ID, isDeleted: false }),
            ForumPost.countDocuments({ isPinned: true, isDeleted: false }),
            ForumPost.countDocuments({ isLocked: true, isDeleted: false }),
            ForumPost.countDocuments({ isDeleted: true })
        ]);

        res.json({
            success: true,
            posts,
            total,
            page: parseInt(page),
            stats: {
                totalPosts,
                globalPosts,
                institutePosts: totalPosts - globalPosts,
                pinnedPosts,
                lockedPosts,
                deletedPosts
            }
        });
    } catch (err) {
        console.error("[Forum] Admin list error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN: GET /api/forum/admin/analytics — Forum engagement stats
// ══════════════════════════════════════════════════════════════
router.get("/admin/analytics", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        // Overall engagement metrics
        const [totalPosts, totalComments, totalUpvotes] = await Promise.all([
            ForumPost.countDocuments({ isDeleted: false }),
            ForumComment.countDocuments({ isDeleted: false }),
            ForumPost.aggregate([
                { $match: { isDeleted: false } },
                { $group: { _id: null, total: { $sum: "$upvotes" } } }
            ])
        ]);

        // Posts per category
        const categoryBreakdown = await ForumPost.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: "$category", count: { $sum: 1 }, upvotes: { $sum: "$upvotes" } } },
            { $sort: { count: -1 } }
        ]);

        // Top 5 most engaged posts (by upvotes + comments)
        const topPosts = await ForumPost.find({ isDeleted: false })
            .sort({ upvotes: -1, commentCount: -1 })
            .limit(5)
            .populate("author", "name role")
            .populate("organization_id", "name")
            .select("title upvotes commentCount category organization_id author createdAt")
            .lean();

        // Top 5 most active authors
        const topAuthors = await ForumPost.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: "$author", postCount: { $sum: 1 }, totalUpvotes: { $sum: "$upvotes" } } },
            { $sort: { postCount: -1 } },
            { $limit: 5 }
        ]);

        // Posts per day (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const postsPerDay = await ForumPost.aggregate([
            { $match: { isDeleted: false, createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // Global vs Institute split
        const globalCount = await ForumPost.countDocuments({ organization_id: GLOBAL_ORG_ID, isDeleted: false });

        res.json({
            success: true,
            analytics: {
                totalPosts,
                totalComments,
                totalUpvotes: totalUpvotes[0]?.total || 0,
                globalPosts: globalCount,
                institutePosts: totalPosts - globalCount,
                categoryBreakdown,
                topPosts,
                topAuthors,
                postsPerDay
            }
        });
    } catch (err) {
        console.error("[Forum] Analytics error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN: PATCH /api/forum/admin/posts/:id — Bulk moderation action
// ══════════════════════════════════════════════════════════════
router.patch("/admin/posts/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { isPinned, isLocked, isDeleted } = req.body;
        const update = {};
        if (isPinned !== undefined) update.isPinned = isPinned;
        if (isLocked !== undefined) update.isLocked = isLocked;
        if (isDeleted !== undefined) update.isDeleted = isDeleted;

        const post = await ForumPost.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' })
            .populate("author", "name email role")
            .lean();

        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        res.json({ success: true, message: "Post updated", post });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

export default router;
