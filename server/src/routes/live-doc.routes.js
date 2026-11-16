// Live docs (chat.classgrid.in/docs/<id>), mounted at /api/docs
import express from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import {
    listDocs, getDoc, leaveDoc, getVersion, updateDoc, setVisibility, deleteDoc, postComment, postReply, patchComment, exportDoc,
    postMembers, patchMember, deleteMember, postAccessRequest, answerAccessRequest, postDuplicate, postPin, postReport,
    deleteComment, postCommentReport,
} from '../controllers/live-doc.controller.js';

const router = express.Router();

router.get('/', isAuthenticated, listDocs);
router.get('/:id', isAuthenticated, getDoc);
router.get('/:id/versions/:vid', isAuthenticated, getVersion);
router.get('/:id/export', isAuthenticated, exportDoc);
router.put('/:id', isAuthenticated, updateDoc);
router.patch('/:id/visibility', isAuthenticated, setVisibility);
router.delete('/:id', isAuthenticated, deleteDoc);
router.post('/:id/comments', isAuthenticated, postComment);
router.post('/:id/comments/:cid/replies', isAuthenticated, postReply);
router.patch('/:id/comments/:cid', isAuthenticated, patchComment);
router.delete('/:id/comments/:cid', isAuthenticated, deleteComment);
router.post('/:id/comments/:cid/report', isAuthenticated, postCommentReport);
// Sharing: people by email with a role, and requests for access to a private doc
router.post('/:id/members', isAuthenticated, postMembers);
router.patch('/:id/members/:mid', isAuthenticated, patchMember);
router.delete('/:id/members/:mid', isAuthenticated, deleteMember);
router.post('/:id/access-requests', isAuthenticated, postAccessRequest);
router.post('/:id/access-requests/:rid', isAuthenticated, answerAccessRequest);
// The doc's own menu
router.post('/:id/duplicate', isAuthenticated, postDuplicate);
router.post('/:id/pin', isAuthenticated, postPin);
router.post('/:id/report', isAuthenticated, postReport);
router.post('/:id/leave', isAuthenticated, leaveDoc);

export default router;
