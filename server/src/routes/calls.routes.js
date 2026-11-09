// /api/calls: the user's calls with Classgrid AI and what the AI did for each (read-only; see controllers/calls.controller.js)
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { listCalls, getCall } from "../controllers/calls.controller.js";

const router = express.Router();

router.get("/", isAuthenticated, listCalls);
router.get("/:id", isAuthenticated, getCall);

export default router;
