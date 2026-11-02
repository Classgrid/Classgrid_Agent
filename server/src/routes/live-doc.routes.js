// Live docs (chat.classgrid.in/docs/<id>), mounted at /api/docs
import express from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import {
    listDocs, getDoc, getVersion, updateDoc, setVisibility, deleteDoc, postComment, postReply, patchComment, exportDoc,
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

export default router;
