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
import { primarySupabaseClient } from './src/config/supabaseClient.js';

async function clear() {
    await primarySupabaseClient.from('ai_chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await primarySupabaseClient.from('ai_chat_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('All chats cleared successfully!');
}
clear();
