// Super admin > Student applications (owner, 2026-11-15): review students' applications for student prices, see
// their documents, and keep the school list. Mounted at /api/super-admin/students (super admins only).
import express from "express";
import { adminListApplications, adminGetDocument, adminDecide, adminListSchools, adminSaveSchool, adminDeleteSchool } from "../../controllers/ai-student.controller.js";

const router = express.Router();

router.get("/applications", adminListApplications);
router.get("/applications/:id/document", adminGetDocument);
router.post("/applications/:id/decision", adminDecide);
router.get("/schools", adminListSchools);
router.post("/schools", adminSaveSchool);
router.put("/schools/:id", adminSaveSchool);
router.delete("/schools/:id", adminDeleteSchool);

export default router;
