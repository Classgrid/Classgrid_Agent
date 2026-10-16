import express from "express";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

// The IDE (OpenVSCode Server) on the sandbox (https://ide.classgrid.in) asks this before every request:
// the browser's normal Classgrid login cookie (.classgrid.in) comes along, and only super admins get through.
router.get("/check", isAuthenticated, requireRole("super_admin"), (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendStatus(204);
});

export default router;
