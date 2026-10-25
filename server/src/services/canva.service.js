// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// Canva Connect (REST API): the user's token (refreshed when it expires) and every operation of the canva_connector tool.
// The OAuth login itself is in routes/auth.canva.routes.js.
import User from "../models/User.js";

const API = "https://api.canva.com/rest/v1";
export const CANVA_TOKEN_URL = `${API}/oauth/token`;
export const canvaBasicAuth = () => `Basic ${Buffer.from(`${process.env.CANVA_CLIENT_ID?.trim()}:${process.env.CANVA_CLIENT_SECRET?.trim()}`).toString("base64")}`;

// Saves a Canva token response on the user (each refresh token works only once, so the new one always replaces it)
export function saveCanvaTokens(user, data) {
    user.canva_access_token = data.access_token;
    if (data.refresh_token) user.canva_refresh_token = data.refresh_token;
    user.canva_token_expires_at = data.expires_in ? new Date(Date.now() + (data.expires_in - 60) * 1000) : null;
}

// A working Canva access token for this user (refreshed when it has expired), or null when Canva is not connected
export async function getCanvaAccessToken(userOrId) {
    const user = typeof userOrId === "object" && userOrId?.save ? userOrId : await User.findById(userOrId);
    if (!user?.canva_access_token) return null;
    if (!user.canva_token_expires_at || user.canva_token_expires_at > new Date()) return user.canva_access_token;
    if (!user.canva_refresh_token) return null;
    const res = await fetch(CANVA_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: canvaBasicAuth() },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: user.canva_refresh_token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        console.error("[Canva] token refresh failed:", res.status, data?.error || data?.message || "");
        return null;
    }
    saveCanvaTokens(user, data);
    await user.save();
    return user.canva_access_token;
}

async function call(token, method, path, body) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 204) return { success: true };
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Canva API ${res.status}: ${data?.message || data?.code || data?.error || "request failed"}`);
    return data;
}

// Export, upload, autofill, resize and import run as jobs: checked every 2 seconds for up to 90 seconds
async function waitForJob(token, path, job) {
    let current = job;
    for (let i = 0; i < 45 && current?.status === "in_progress"; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        current = (await call(token, "GET", `${path}/${encodeURIComponent(current.id)}`)).job;
    }
    return current;
}

const q = (params) => {
    const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])).toString();
    return s ? `?${s}` : "";
};
const id = (v, name) => {
    if (!v) throw new Error(`${name} is required for this operation`);
    return encodeURIComponent(String(v));
};
// design_type: "doc" | "email" | "presentation" | "whiteboard", or custom width/height in pixels
const designType = (a) => a.width && a.height
    ? { type: "custom", width: Number(a.width), height: Number(a.height) }
    : { type: "preset", name: a.design_type || "presentation" };

export async function runCanvaOperation(token, a) {
    switch (a.operation) {
        case "get_profile": {
            const [me, profile] = await Promise.all([call(token, "GET", "/users/me"), call(token, "GET", "/users/me/profile")]);
            return { ...me, ...profile };
        }
        case "list_designs":
            return call(token, "GET", `/designs${q({ query: a.query, ownership: a.ownership, sort_by: a.sort_by, limit: a.limit, continuation: a.continuation })}`);
        case "get_design":
            return call(token, "GET", `/designs/${id(a.design_id, "design_id")}`);
        case "get_design_pages":
            return call(token, "GET", `/designs/${id(a.design_id, "design_id")}/pages`);
        case "get_export_formats":
            return call(token, "GET", `/designs/${id(a.design_id, "design_id")}/export-formats`);
        case "create_design":
            return call(token, "POST", "/designs", { type: "type_and_asset", design_type: designType(a), ...(a.asset_id ? { asset_id: a.asset_id } : {}), ...(a.title ? { title: a.title } : {}) });
        case "export_design": {
            const format = { type: a.format || "pdf", ...(Array.isArray(a.pages) && a.pages.length ? { pages: a.pages.map(Number) } : {}) };
            if (a.format === "mp4") format.quality = a.quality || "horizontal_1080p";
            if (a.format === "pdf" && a.size) format.size = a.size;
            if (["jpg", "png", "gif"].includes(a.format) && a.width) format.width = Number(a.width);
            if (["jpg", "png", "gif"].includes(a.format) && a.height) format.height = Number(a.height);
            if (a.format === "jpg") format.quality = Number(a.quality) || 90;
            const { job } = await call(token, "POST", "/exports", { design_id: a.design_id, format });
            return { job: await waitForJob(token, "/exports", job), note: "Download links expire after 24 hours." };
        }
        case "upload_asset_from_url": {
            const { job } = await call(token, "POST", "/url-asset-uploads", { name: a.name || "Uploaded by Classgrid AI", url: a.url });
            return { job: await waitForJob(token, "/url-asset-uploads", job) };
        }
        case "get_asset":
            return call(token, "GET", `/assets/${id(a.asset_id, "asset_id")}`);
        case "update_asset":
            return call(token, "PATCH", `/assets/${id(a.asset_id, "asset_id")}`, { ...(a.name ? { name: a.name } : {}), ...(Array.isArray(a.tags) ? { tags: a.tags } : {}) });
        case "delete_asset":
            return call(token, "DELETE", `/assets/${id(a.asset_id, "asset_id")}`);
        case "create_folder":
            return call(token, "POST", "/folders", { name: a.name, parent_folder_id: a.folder_id || "root" });
        case "get_folder":
            return call(token, "GET", `/folders/${id(a.folder_id, "folder_id")}`);
        case "rename_folder":
            return call(token, "PATCH", `/folders/${id(a.folder_id, "folder_id")}`, { name: a.name });
        case "delete_folder":
            return call(token, "DELETE", `/folders/${id(a.folder_id, "folder_id")}`);
        case "list_folder_items":
            return call(token, "GET", `/folders/${id(a.folder_id || "root", "folder_id")}/items${q({ item_types: a.item_types, sort_by: a.sort_by, continuation: a.continuation })}`);
        case "move_item":
            return call(token, "POST", "/folders/move", { item_id: a.item_id, to_folder_id: a.folder_id || "root" });
        case "create_comment":
            return call(token, "POST", `/designs/${id(a.design_id, "design_id")}/comments`, { message_plaintext: a.message, ...(a.assignee_id ? { assignee_id: a.assignee_id } : {}) });
        case "reply_comment":
            return call(token, "POST", `/designs/${id(a.design_id, "design_id")}/comments/${id(a.thread_id, "thread_id")}/replies`, { message_plaintext: a.message });
        case "get_comment_thread":
            return call(token, "GET", `/designs/${id(a.design_id, "design_id")}/comments/${id(a.thread_id, "thread_id")}`);
        case "list_comment_replies":
            return call(token, "GET", `/designs/${id(a.design_id, "design_id")}/comments/${id(a.thread_id, "thread_id")}/replies${q({ limit: a.limit, continuation: a.continuation })}`);
        case "list_brand_templates":
            return call(token, "GET", `/brand-templates${q({ query: a.query, continuation: a.continuation })}`);
        case "get_brand_template_dataset":
            return call(token, "GET", `/brand-templates/${id(a.brand_template_id, "brand_template_id")}/dataset`);
        case "autofill_brand_template": {
            const { job } = await call(token, "POST", "/autofills", { type: "create_from_brand_template", brand_template_id: a.brand_template_id, ...(a.title ? { title: a.title } : {}), data: a.data || {} });
            return { job: await waitForJob(token, "/autofills", job) };
        }
        case "resize_design": {
            const { job } = await call(token, "POST", "/resizes", { design_id: a.design_id, design_type: designType(a) });
            return { job: await waitForJob(token, "/resizes", job) };
        }
        case "import_design_from_url": {
            const { job } = await call(token, "POST", "/url-imports", { title: a.title || a.name || "Imported by Classgrid AI", url: a.url, ...(a.mime_type ? { mime_type: a.mime_type } : {}) });
            return { job: await waitForJob(token, "/url-imports", job) };
        }
        default:
            throw new Error(`Unknown operation: ${a.operation}`);
    }
}
