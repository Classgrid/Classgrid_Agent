// Canva cards for the canva_connector tool: design previews (single and carousel), page strips, export downloads,
// images, folders and their items, comments, brand templates and their fields, and the results of autofill / resize / import.
import React, { useState } from 'react';
import {
  PenLine, Eye, Download, Folder, Image as ImageIcon, LayoutTemplate, MessageSquare, Trash2, FolderInput,
  FileText, Layers, Type, BarChart3, Sparkles, Upload, Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppCard, CardButton, Carousel, DoneLine, FailLine, Pill, ShortList, Thumb, fmtWhen } from './shared';

type Design = { id?: string; title?: string; thumbnail?: { url?: string; width?: number; height?: number }; urls?: { edit_url?: string; view_url?: string }; url?: string; page_count?: number; updated_at?: number; created_at?: number };

const editUrl = (d: Design) => d.urls?.edit_url || d.url;
const viewUrl = (d: Design) => d.urls?.view_url;

// ─── 1. One design ───
function DesignCard({ design, label }: { design: Design; label: string }) {
  return (
    <AppCard brand="canva" title={label} right={design.page_count ? <Pill tone="purple"><Layers className="h-3 w-3" />{design.page_count} page{design.page_count === 1 ? '' : 's'}</Pill> : undefined}>
      <div className="rounded-xl bg-slate-100 dark:bg-[#222] overflow-hidden flex items-center justify-center" style={{ maxHeight: 340 }}>
        <Thumb src={design.thumbnail?.url} alt={design.title} className="w-full max-h-[340px] object-contain" rounded="rounded-none" />
      </div>
      <div className="mt-2.5 min-w-0">
        <div className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{design.title || 'Untitled design'}</div>
        {(design.updated_at || design.created_at) && <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a]">Edited {fmtWhen(design.updated_at || design.created_at)}</div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {editUrl(design) && <CardButton brand="canva" primary href={editUrl(design)} icon={<PenLine className="h-3.5 w-3.5" />}>Edit in Canva</CardButton>}
        {viewUrl(design) && <CardButton brand="canva" href={viewUrl(design)} icon={<Eye className="h-3.5 w-3.5" />}>View</CardButton>}
      </div>
    </AppCard>
  );
}

// ─── 2. Design tile (for carousels) ───
function DesignTile({ design }: { design: Design }) {
  return (
    <a href={editUrl(design) || viewUrl(design)} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1.5 min-w-0">
      <div className="relative aspect-[4/3] rounded-xl bg-slate-100 dark:bg-[#222] overflow-hidden">
        <Thumb src={design.thumbnail?.url} alt={design.title} className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300" rounded="rounded-none" />
        {design.page_count && design.page_count > 1 ? <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10.5px] font-medium text-white">{design.page_count} pages</span> : null}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-slate-900 dark:text-white truncate group-hover:underline">{design.title || 'Untitled design'}</div>
        {(design.updated_at || design.created_at) && <div className="text-[11.5px] text-slate-500 dark:text-[#9a9a9a]">{fmtWhen(design.updated_at || design.created_at)}</div>}
      </div>
    </a>
  );
}

// ─── 3. Designs carousel ───
function DesignsCard({ designs, title, more }: { designs: Design[]; title: string; more?: boolean }) {
  if (!designs.length) return <DoneLine brand="canva" icon={<LayoutTemplate className="h-[18px] w-[18px]" />} text="No designs found" />;
  if (designs.length === 1) return <DesignCard design={designs[0]!} label={title} />;
  return (
    <AppCard brand="canva" title={title} right={<Pill tone="purple">{designs.length}{more ? '+' : ''} designs</Pill>}>
      <Carousel>{designs.map((d) => <DesignTile key={d.id} design={d} />)}</Carousel>
      {designs.length > 8 && <div className="mt-2 text-[12px] text-slate-500 dark:text-[#9a9a9a]">Showing 8 of {designs.length}. Ask to see more.</div>}
    </AppCard>
  );
}

// ─── 4. Pages strip ───
function PagesCard({ pages }: { pages: any[] }) {
  const [big, setBig] = useState<number | null>(null);
  if (!pages.length) return <DoneLine brand="canva" icon={<Layers className="h-[18px] w-[18px]" />} text="No pages found" />;
  const sel = big !== null ? pages[big] : null;
  return (
    <AppCard brand="canva" title="Design pages" right={<Pill tone="purple">{pages.length} pages</Pill>}>
      {sel && (
        <div className="mb-2.5 rounded-xl bg-slate-100 dark:bg-[#222] overflow-hidden">
          <Thumb src={sel.thumbnail?.url} alt={`Page ${sel.index}`} className="w-full max-h-[320px] object-contain" rounded="rounded-none" />
        </div>
      )}
      <Carousel itemClass="basis-[30%] sm:basis-[22%]">
        {pages.map((p, i) => (
          <button key={p.index ?? i} type="button" onClick={() => setBig(big === i ? null : i)} className={cn('flex flex-col gap-1 cursor-pointer rounded-lg p-0.5', big === i && 'ring-2 ring-[#7D2AE8]')}>
            <Thumb src={p.thumbnail?.url} alt={`Page ${p.index}`} className="aspect-[4/3] w-full" />
            <span className="text-[11px] text-slate-500 dark:text-[#9a9a9a]">Page {p.index ?? i + 1}</span>
          </button>
        ))}
      </Carousel>
    </AppCard>
  );
}

// ─── 5. Export formats ───
const FORMAT_LABEL: Record<string, string> = { pdf: 'PDF', jpg: 'JPG', png: 'PNG', gif: 'GIF', pptx: 'PowerPoint', mp4: 'MP4 video', csv: 'CSV', html_bundle: 'HTML bundle', html_standalone: 'HTML' };
function FormatsCard({ formats }: { formats: Record<string, any> }) {
  const keys = Object.keys(formats || {});
  return (
    <AppCard brand="canva" title="Can be exported as">
      <div className="flex flex-wrap gap-1.5">{keys.length ? keys.map((k) => <Pill key={k} tone="purple">{FORMAT_LABEL[k] ?? k.toUpperCase()}</Pill>) : <span className="text-[13px] text-slate-500">No export formats</span>}</div>
    </AppCard>
  );
}

// ─── 6. Export result: previews for images, download buttons for every file ───
function ExportCard({ job, format }: { job: any; format: string }) {
  if (job?.status === 'failed') return <FailLine brand="canva" text={`Export failed: ${job.error?.message || job.error?.code || 'unknown error'}`} />;
  if (job?.status === 'in_progress') return <DoneLine brand="canva" icon={<Download className="h-[18px] w-[18px]" />} text="Export is still running in Canva" sub="Ask again in a moment for the download links." />;
  const urls: string[] = job?.urls || [];
  const isImage = ['png', 'jpg', 'gif'].includes(format);
  const label = FORMAT_LABEL[format] ?? format.toUpperCase();
  return (
    <AppCard brand="canva" title={`Exported as ${label}`} right={<Pill tone="purple">{urls.length} file{urls.length === 1 ? '' : 's'}</Pill>}>
      {isImage && urls.length > 0 && (
        urls.length === 1
          ? <div className="rounded-xl bg-slate-100 dark:bg-[#222] overflow-hidden"><Thumb src={urls[0]} className="w-full max-h-[340px] object-contain" rounded="rounded-none" /></div>
          : <Carousel itemClass="basis-[46%] sm:basis-[31%]">{urls.map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1"><Thumb src={u} className="aspect-[4/3] w-full" /><span className="text-[11px] text-slate-500">Page {i + 1}</span></a>)}</Carousel>
      )}
      {!isImage && (
        <div className="flex flex-col gap-1.5">
          {urls.map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-[#1f1f1f] transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7D2AE8]/10 text-[#7D2AE8] dark:text-[#b586ff]"><FileText className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-slate-900 dark:text-white">{label} file{urls.length > 1 ? ` ${i + 1}` : ''}</div>
                <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a]">Link works for 24 hours</div>
              </div>
              <Download className="h-4 w-4 text-slate-400" />
            </a>
          ))}
        </div>
      )}
      {urls.length === 1 && <div className="mt-3"><CardButton brand="canva" primary href={urls[0]} icon={<Download className="h-3.5 w-3.5" />}>Download {label}</CardButton></div>}
    </AppCard>
  );
}

// ─── 7. Image (asset) ───
function AssetCard({ asset, label }: { asset: any; label: string }) {
  return (
    <AppCard brand="canva" title={label}>
      <div className="flex gap-3">
        <Thumb src={asset?.thumbnail?.url} alt={asset?.name} className="h-20 w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold text-slate-900 dark:text-white truncate">{asset?.name || 'Image'}</div>
          <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a]">{[asset?.type, fmtWhen(asset?.updated_at || asset?.created_at)].filter(Boolean).join(' · ')}</div>
          {asset?.tags?.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{asset.tags.slice(0, 6).map((t: string) => <Pill key={t}><Tag className="h-3 w-3" />{t}</Pill>)}</div>}
        </div>
      </div>
    </AppCard>
  );
}

// ─── 8. Folder ───
function FolderCard({ folder, label }: { folder: any; label: string }) {
  return (
    <AppCard brand="canva" title={label}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7D2AE8]/10 text-[#7D2AE8] dark:text-[#b586ff]"><Folder className="h-6 w-6" /></div>
        <div className="min-w-0">
          <div className="text-[14.5px] font-semibold text-slate-900 dark:text-white truncate">{folder?.name || 'Folder'}</div>
          {(folder?.updated_at || folder?.created_at) && <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a]">Updated {fmtWhen(folder.updated_at || folder.created_at)}</div>}
        </div>
      </div>
    </AppCard>
  );
}

// ─── 9. What's inside a folder: subfolders as rows, designs and images as tiles ───
function FolderItemsCard({ items }: { items: any[] }) {
  const folders = items.filter((i) => i.type === 'folder').map((i) => i.folder);
  const designs = items.filter((i) => i.type === 'design').map((i) => i.design);
  const images = items.filter((i) => i.type === 'image').map((i) => i.image);
  if (!items.length) return <DoneLine brand="canva" icon={<Folder className="h-[18px] w-[18px]" />} text="This folder is empty" />;
  return (
    <AppCard brand="canva" title="Folder contents" right={<Pill tone="purple">{items.length} items</Pill>}>
      <div className="flex flex-col gap-3">
        {folders.length > 0 && (
          <ShortList items={folders} first={4} render={(f: any) => (
            <div key={f.id} className="flex items-center gap-2.5 py-1">
              <Folder className="h-4 w-4 text-[#7D2AE8] dark:text-[#b586ff]" />
              <span className="text-[13.5px] text-slate-900 dark:text-white truncate">{f.name}</span>
            </div>
          )} />
        )}
        {designs.length > 0 && <Carousel>{designs.map((d: Design) => <DesignTile key={d.id} design={d} />)}</Carousel>}
        {images.length > 0 && (
          <Carousel itemClass="basis-[30%] sm:basis-[22%]">
            {images.map((im: any) => (
              <div key={im.id} className="flex flex-col gap-1 min-w-0">
                <Thumb src={im.thumbnail?.url} alt={im.name} className="aspect-square w-full" />
                <span className="text-[11px] text-slate-500 dark:text-[#9a9a9a] truncate">{im.name}</span>
              </div>
            ))}
          </Carousel>
        )}
      </div>
    </AppCard>
  );
}

// ─── 10. Comment thread, 11. replies ───
function Bubble({ author, text, when }: { author?: string; text?: string; when?: number }) {
  const initial = (author || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="flex gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7D2AE8]/15 text-[12px] font-semibold text-[#6a1fd0] dark:text-[#b586ff]">{initial}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium text-slate-900 dark:text-white truncate">{author || 'Someone'}</span>
          {when && <span className="text-[11px] text-slate-400 dark:text-[#7d7d7d]">{fmtWhen(when)}</span>}
        </div>
        <div className="text-[13.5px] text-slate-700 dark:text-[#d6d6d6] whitespace-pre-wrap break-words">{text}</div>
      </div>
    </div>
  );
}
function ThreadCard({ thread, label }: { thread: any; label: string }) {
  const content = thread?.thread_type?.content;
  return (
    <AppCard brand="canva" title={label} right={thread?.thread_type?.resolver ? <Pill tone="purple">Resolved</Pill> : undefined}>
      <Bubble author={thread?.author?.display_name} text={content?.plaintext || content?.markdown} when={thread?.created_at} />
    </AppCard>
  );
}
function RepliesCard({ replies, label }: { replies: any[]; label: string }) {
  if (!replies.length) return <DoneLine brand="canva" icon={<MessageSquare className="h-[18px] w-[18px]" />} text="No replies yet" />;
  return (
    <AppCard brand="canva" title={label} right={<Pill tone="purple">{replies.length}</Pill>}>
      <ShortList items={replies} first={4} render={(r: any) => <div key={r.id} className="py-1.5"><Bubble author={r.author?.display_name} text={r.content?.plaintext || r.content?.markdown} when={r.created_at} /></div>} />
    </AppCard>
  );
}

// ─── 12. Brand templates ───
function TemplatesCard({ templates }: { templates: any[] }) {
  if (!templates.length) return <DoneLine brand="canva" icon={<LayoutTemplate className="h-[18px] w-[18px]" />} text="No brand templates found" sub="Brand templates need Canva Teams or Enterprise." />;
  return (
    <AppCard brand="canva" title="Brand templates" right={<Pill tone="purple">{templates.length}</Pill>}>
      <Carousel>
        {templates.map((t) => (
          <a key={t.id} href={t.create_url || t.view_url} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1.5 min-w-0">
            <div className="aspect-[4/3] rounded-xl bg-slate-100 dark:bg-[#222] overflow-hidden"><Thumb src={t.thumbnail?.url} alt={t.title} className="h-full w-full group-hover:scale-[1.03] transition-transform duration-300" rounded="rounded-none" /></div>
            <div className="text-[13px] font-medium text-slate-900 dark:text-white truncate group-hover:underline">{t.title || 'Template'}</div>
          </a>
        ))}
      </Carousel>
    </AppCard>
  );
}

// ─── 13. Template fields (what autofill can fill) ───
const fieldIcon = (type?: string) => (type === 'image' ? ImageIcon : type === 'chart' ? BarChart3 : Type);
function DatasetCard({ dataset }: { dataset: Record<string, any> }) {
  const fields = Object.entries(dataset || {});
  if (!fields.length) return <DoneLine brand="canva" icon={<LayoutTemplate className="h-[18px] w-[18px]" />} text="This template has no fillable fields" />;
  return (
    <AppCard brand="canva" title="Template fields" right={<Pill tone="purple">{fields.length}</Pill>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {fields.map(([name, f]) => {
          const Icon = fieldIcon(f?.type);
          return (
            <div key={name} className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-[#2a2a2a] px-2.5 py-2">
              <Icon className="h-4 w-4 text-[#7D2AE8] dark:text-[#b586ff]" />
              <span className="text-[13px] text-slate-900 dark:text-white truncate">{name}</span>
              <span className="ml-auto text-[11.5px] text-slate-500 dark:text-[#9a9a9a]">{f?.type}</span>
            </div>
          );
        })}
      </div>
    </AppCard>
  );
}

// ─── 14. Profile ───
function ProfileCard({ data }: { data: any }) {
  const name = data?.profile?.display_name || 'Canva account';
  return (
    <AppCard brand="canva" title="Canva account">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#00C4CC] to-[#7D2AE8] text-white text-[18px] font-semibold">{name.charAt(0).toUpperCase()}</div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{name}</div>
          {data?.team_user?.team_id && <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a] truncate">Team {data.team_user.team_id}</div>}
        </div>
      </div>
    </AppCard>
  );
}

// ─── 15. Jobs that make a design (autofill, resize, import) ───
function JobDesignCard({ job, label }: { job: any; label: string }) {
  if (job?.status === 'failed') return <FailLine brand="canva" text={`${label} failed: ${job.error?.message || job.error?.code || 'unknown error'}`} />;
  if (job?.status === 'in_progress') return <DoneLine brand="canva" icon={<Sparkles className="h-[18px] w-[18px]" />} text={`${label} is still running in Canva`} sub="Ask again in a moment." />;
  const designs: Design[] = job?.result?.designs || (job?.result?.design ? [job.result.design] : []);
  return <DesignsCard designs={designs} title={label} />;
}

// ─── Which card for which operation ───
export function CanvaResult({ args, data }: { args: any; data: any }) {
  const op = String(args?.operation || '');
  switch (op) {
    case 'get_profile': return <ProfileCard data={data} />;
    case 'list_designs': return <DesignsCard designs={data?.items || []} title={args.query ? `Designs for "${args.query}"` : 'Your designs'} more={!!data?.continuation} />;
    case 'get_design': return data?.design ? <DesignCard design={data.design} label="Design" /> : null;
    case 'create_design': return data?.design ? <DesignCard design={data.design} label="New design created" /> : null;
    case 'get_design_pages': return <PagesCard pages={data?.items || []} />;
    case 'get_export_formats': return <FormatsCard formats={data?.formats || {}} />;
    case 'export_design': return <ExportCard job={data?.job} format={String(args.format || 'pdf')} />;
    case 'upload_asset_from_url':
      if (data?.job?.status === 'failed') return <FailLine brand="canva" text={`Upload failed: ${data.job.error?.message || 'unknown error'}`} />;
      return data?.job?.asset ? <AssetCard asset={data.job.asset} label="Uploaded to Canva" /> : <DoneLine brand="canva" icon={<Upload className="h-[18px] w-[18px]" />} text="Upload is still running in Canva" />;
    case 'get_asset': return <AssetCard asset={data?.asset} label="Image" />;
    case 'update_asset': return <AssetCard asset={data?.asset} label="Image updated" />;
    case 'delete_asset': return <DoneLine brand="canva" icon={<Trash2 className="h-[18px] w-[18px]" />} text="Image deleted" />;
    case 'create_folder': return <FolderCard folder={data?.folder} label="Folder created" />;
    case 'get_folder': return <FolderCard folder={data?.folder} label="Folder" />;
    case 'rename_folder': return <FolderCard folder={data?.folder} label="Folder renamed" />;
    case 'delete_folder': return <DoneLine brand="canva" icon={<Trash2 className="h-[18px] w-[18px]" />} text="Folder deleted" />;
    case 'list_folder_items': return <FolderItemsCard items={data?.items || []} />;
    case 'move_item': return <DoneLine brand="canva" icon={<FolderInput className="h-[18px] w-[18px]" />} text="Moved" sub={args.folder_id && args.folder_id !== 'root' ? 'Into the folder' : 'To the top level of Projects'} />;
    case 'create_comment': return <ThreadCard thread={data?.thread} label="Comment added" />;
    case 'get_comment_thread': return <ThreadCard thread={data?.thread} label="Comment" />;
    case 'reply_comment': return <RepliesCard replies={data?.reply ? [data.reply] : []} label="Reply added" />;
    case 'list_comment_replies': return <RepliesCard replies={data?.items || []} label="Replies" />;
    case 'list_brand_templates': return <TemplatesCard templates={data?.items || []} />;
    case 'get_brand_template_dataset': return <DatasetCard dataset={data?.dataset || {}} />;
    case 'autofill_brand_template': return <JobDesignCard job={data?.job} label="Design made from template" />;
    case 'resize_design': return <JobDesignCard job={data?.job} label="Resized design" />;
    case 'import_design_from_url': return <JobDesignCard job={data?.job} label="Imported into Canva" />;
    default: return null;
  }
}
