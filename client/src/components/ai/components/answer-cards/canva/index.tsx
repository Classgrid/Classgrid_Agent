// Canva display in the AI's answer: collects what the Canva steps of this answer produced and shows the finished results
import React from 'react';
import { CdDisplay, type CanvaDisplayData } from './CdDisplay';

/** A step's result as data (tool results arrive as JSON text; an error arrives as plain text) */
function read(result: unknown): { data?: any; error?: string } {
  if (result && typeof result === 'object') return { data: result };
  const raw = String(result ?? '').trim();
  try { return { data: JSON.parse(raw) }; } catch { return /^error\b/i.test(raw) ? { error: raw.replace(/^error:\s*/i, '') } : {}; }
}

const NEW_DESIGN_OPS = new Set(['create_design', 'import_design_from_url', 'autofill_brand_template', 'resize_design']);

/** Turns this answer's Canva steps into what the display shows (finished things only, newest first, no duplicates) */
export function collectCanva(steps: any[]): CanvaDisplayData {
  const out: CanvaDisplayData = { designs: [], decks: [], exports: [], assets: [], folders: [], discussions: [], templates: [], datasets: [], errors: [] };
  const seen = new Set<string>();
  const addDesign = (d: any) => { if (d && !seen.has(d.id || d.title)) { seen.add(d.id || d.title); out.designs.unshift(d); } };
  let listed: any[] = [];
  for (const s of steps) {
    if (s?.type !== 'tool' || s.tool !== 'canva_connector' || s.status !== 'success') continue;
    const op = String(s.args?.operation || '');
    const { data, error } = read(s.result);
    if (error) { out.errors.push(error); continue; }
    if (!data) continue;
    if (op === 'get_profile') out.profile = data;
    else if (NEW_DESIGN_OPS.has(op)) {
      if (data.design) addDesign(data.design);
      const job = data.job;
      if (job?.status === 'failed') out.errors.push(job.error?.message || job.error?.code || 'Canva could not finish this.');
      (job?.result?.designs || (job?.result?.design ? [job.result.design] : [])).forEach(addDesign);
      out.highlight = op === 'import_design_from_url' ? 'Imported into Canva' : op === 'resize_design' ? 'Resized design ready' : op === 'autofill_brand_template' ? 'Design made from your template' : 'New design ready';
    } else if (op === 'get_design' && data.design) addDesign(data.design);
    else if (op === 'list_designs') listed = data.items || [];
    else if (op === 'get_design_pages') out.decks.push({ designId: s.args?.design_id, slides: (data.items || []).map((p: any) => ({ src: p.thumbnail?.url })) });
    else if (op === 'export_design') {
      const job = data.job;
      if (job?.status === 'failed') out.errors.push(job.error?.message || job.error?.code || 'Export failed.');
      else if (job?.urls?.length) { out.exports.push({ format: String(s.args?.format || 'pdf'), urls: job.urls }); out.highlight = String(s.args?.format || 'File').toUpperCase() + ' ready to download'; }
    } else if (op === 'upload_asset_from_url' && data.job?.asset) out.assets.unshift(data.job.asset);
    else if ((op === 'get_asset' || op === 'update_asset') && data.asset) {
      const i = out.assets.findIndex((a) => a.id === data.asset.id);
      if (i >= 0) out.assets[i] = data.asset; else out.assets.unshift(data.asset);
    } else if (['create_folder', 'get_folder', 'rename_folder'].includes(op) && data.folder) {
      const f = out.folders.find((x) => (x.folder as any).id === data.folder.id);
      if (f) f.folder = data.folder; else out.folders.unshift({ folder: data.folder, items: [] });
    } else if (op === 'list_folder_items') {
      const id = s.args?.folder_id;
      const f = out.folders.find((x) => (x.folder as any).id === id);
      if (f) f.items = data.items || []; else out.folders.push({ folder: { name: id === 'root' || !id ? 'Projects' : 'Folder' }, items: data.items || [] });
    } else if ((op === 'create_comment' || op === 'get_comment_thread') && data.thread) {
      if (!out.discussions.some((d) => d.thread?.id === data.thread.id)) out.discussions.push({ thread: data.thread, replies: [] });
    } else if (op === 'reply_comment' && data.reply) {
      const d = out.discussions.find((x) => x.thread?.id === s.args?.thread_id);
      if (d) d.replies.push(data.reply); else out.discussions.push({ replies: [data.reply] });
    } else if (op === 'list_comment_replies') {
      const d = out.discussions.find((x) => x.thread?.id === s.args?.thread_id);
      if (d) d.replies = data.items || []; else out.discussions.push({ replies: data.items || [] });
    } else if (op === 'list_brand_templates') out.templates = data.items || [];
    else if (op === 'get_brand_template_dataset' && data.dataset) out.datasets.push(data.dataset);
  }
  // Only list the account's designs when nothing new was made (a fresh result is what the user wants to see)
  if (!out.designs.length) listed.forEach((d) => out.designs.push(d));
  return out;
}

export function CanvaDisplay({ steps }: { steps: any[] }) {
  if (!steps?.some((s) => s?.type === 'tool' && s.tool === 'canva_connector')) return null;
  return <CdDisplay data={collectCanva(steps)} />;
}
