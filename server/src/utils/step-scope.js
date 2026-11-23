// Whose step on the user's computer this is: a helper's (run_project_helpers) or the main answer's own.
//
// A helper's steps reach the app the same way the main answer's do (local-runner.service.js: a `pc_tool_call` on the
// answer's stream, with the same chat id), so the app could not tell them apart. It has to: a message another
// Classgrid session sent (desktop/sessions.js) is handed to the chat's AI after its next step, and it must never be
// handed to a helper instead (the helper would read it, the chat's AI never would).
//
// Everything a helper does runs inside helperScope.run({ helper }, ...): its own loop (ai-chat.controller.js
// runHelper), and each step the app tells the server to run for it (local-loop.service.js runOne, which is called
// from the app's HTTP command and so starts outside the helper's own chain). inHelper() is then true in every call
// under it, however deep, and local-runner.service.js marks the step it sends with `helper: true`.
import { AsyncLocalStorage } from "node:async_hooks";

export const helperScope = new AsyncLocalStorage();
export const inHelper = () => helperScope.getStore() != null;
