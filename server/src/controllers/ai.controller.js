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

import { generateEmbedding, chunkText } from "../services/ai/embeddings.service.js";
import { primarySupabaseClient } from "../config/supabaseClient.js";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import axios from "axios";
import OpenAI from "openai";
import { generateStudentPersona } from "../services/ai/persona.service.js";

const openai = new OpenAI({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });

/**
 * indexMaterial
 * Parses a material (PDF/Text) and stores its chunks in Supabase Vector DB.
 */
export const indexMaterial = async (req, res) => {
    try {
        const { materialId, fileUrl, type } = req.body;
        const orgId = req.user.organization_id.toString();

        if (!fileUrl) return res.status(400).json({ message: "fileUrl is required" });

        let text = "";

        // 1. Extract Text
        if (type === "pdf" || fileUrl.endsWith(".pdf")) {
            const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
            const data = await pdf(response.data);
            text = data.text;
        } else {
            const response = await axios.get(fileUrl);
            text = response.data;
        }

        if (!text) throw new Error("Could not extract text from document");

        // 2. Chunk Text
        const chunks = chunkText(text, 1000, 200);

        // 3. Generate Embeddings & Insert to Supabase
        const insertPromises = chunks.map(async (chunk) => {
            const embedding = await generateEmbedding(chunk);
            return {
                material_id: materialId,
                org_id: orgId,
                content: chunk,
                embedding: embedding,
                metadata: { source: fileUrl, indexedAt: new Date() }
            };
        });

        const vectors = await Promise.all(insertPromises);

        const { error } = await primarySupabaseClient
            .from("syllabus_vectors")
            .insert(vectors);

        if (error) throw error;

        res.json({ message: "Material indexed successfully", chunks: chunks.length });
    } catch (err) {
        console.error("[AI Controller] Index error:", err);
        res.status(500).json({ message: "Indexing failed", error: err.message });
    }
};

/**
 * chatWithSyllabus
 * Performs RAG search and answers user queries based on syllabus context.
 */
export const chatWithSyllabus = async (req, res) => {
    try {
        const { query, classroomId } = req.body;
        const orgId = req.user.organization_id.toString();

        if (!query) return res.status(400).json({ message: "Query is required" });

        // 1. Embed Query
        const queryEmbedding = await generateEmbedding(query);

        // 2. Vector Search in Supabase
        const { data: chunks, error } = await primarySupabaseClient.rpc("match_syllabus_chunks", {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: 5,
            p_org_id: orgId
        });

        if (error) throw error;

        // 3. Augment Prompt with Context
        const contextText = chunks.map(c => c.content).join("\n---\n");
        const systemPrompt = `You are a helpful AI study assistant on Classgrid. 
Answer the user's question using ONLY the provided syllabus context below. 
If the answer is not in the context, say "I don't have enough syllabus information on that yet."
Be concise and strictly academic.

CONTEXT:
${contextText}`;

        const completion = await openai.chat.completions.create({
            model: '@cf/deepseek-ai/deepseek-v4-pro-0813', // Fast and powerful enough for RAG
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            temperature: 0
        });

        res.json({ 
            answer: completion.choices[0].message.content,
            sources: chunks.map(c => ({ id: c.id, similarity: c.similarity }))
        });

    } catch (err) {
        console.error("[AI Controller] Chat error:", err);
        res.status(500).json({ message: "AI chat failed", error: err.message });
    }
};

/**
 * getMyPersona
 * Returns personalized academic insights for the logged-in student.
 */
export const getMyPersona = async (req, res) => {
    try {
        const studentId = req.user._id;
        const orgId = req.user.organization_id;

        const persona = await generateStudentPersona(studentId, orgId);
        res.json(persona);
    } catch (err) {
        console.error("[AI Controller] Persona error:", err);
        res.status(500).json({ message: "Failed to generate persona" });
    }
};
