// Canva cards for the canva_connector tool: one card per operation (each in its own file in this folder),
// built from the small Canva pieces here and the shared card parts in ../shared.
import React from 'react';
import { CanvaProfileCard } from './CanvaProfileCard';
import { CanvaListDesignsCard } from './CanvaListDesignsCard';
import { CanvaGetDesignCard } from './CanvaGetDesignCard';
import { CanvaCreateDesignCard } from './CanvaCreateDesignCard';
import { CanvaDesignPagesCard } from './CanvaDesignPagesCard';
import { CanvaExportFormatsCard } from './CanvaExportFormatsCard';
import { CanvaExportCard } from './CanvaExportCard';
import { CanvaUploadAssetCard } from './CanvaUploadAssetCard';
import { CanvaGetAssetCard } from './CanvaGetAssetCard';
import { CanvaUpdateAssetCard } from './CanvaUpdateAssetCard';
import { CanvaDeleteAssetCard } from './CanvaDeleteAssetCard';
import { CanvaCreateFolderCard } from './CanvaCreateFolderCard';
import { CanvaGetFolderCard } from './CanvaGetFolderCard';
import { CanvaRenameFolderCard } from './CanvaRenameFolderCard';
import { CanvaDeleteFolderCard } from './CanvaDeleteFolderCard';
import { CanvaFolderItemsCard } from './CanvaFolderItemsCard';
import { CanvaMoveItemCard } from './CanvaMoveItemCard';
import { CanvaCreateCommentCard } from './CanvaCreateCommentCard';
import { CanvaReplyCommentCard } from './CanvaReplyCommentCard';
import { CanvaCommentThreadCard } from './CanvaCommentThreadCard';
import { CanvaCommentRepliesCard } from './CanvaCommentRepliesCard';
import { CanvaBrandTemplatesCard } from './CanvaBrandTemplatesCard';
import { CanvaTemplateDatasetCard } from './CanvaTemplateDatasetCard';
import { CanvaAutofillCard } from './CanvaAutofillCard';
import { CanvaResizeCard } from './CanvaResizeCard';
import { CanvaImportCard } from './CanvaImportCard';

// ─── Which card for which operation ───
export function CanvaResult({ args, data }: { args: any; data: any }) {
  const op = String(args?.operation || '');
  switch (op) {
    case 'get_profile': return <CanvaProfileCard data={data} />;
    case 'list_designs': return <CanvaListDesignsCard args={args} data={data} />;
    case 'get_design': return <CanvaGetDesignCard data={data} />;
    case 'create_design': return <CanvaCreateDesignCard data={data} />;
    case 'get_design_pages': return <CanvaDesignPagesCard data={data} />;
    case 'get_export_formats': return <CanvaExportFormatsCard data={data} />;
    case 'export_design': return <CanvaExportCard args={args} data={data} />;
    case 'upload_asset_from_url': return <CanvaUploadAssetCard data={data} />;
    case 'get_asset': return <CanvaGetAssetCard data={data} />;
    case 'update_asset': return <CanvaUpdateAssetCard data={data} />;
    case 'delete_asset': return <CanvaDeleteAssetCard />;
    case 'create_folder': return <CanvaCreateFolderCard data={data} />;
    case 'get_folder': return <CanvaGetFolderCard data={data} />;
    case 'rename_folder': return <CanvaRenameFolderCard data={data} />;
    case 'delete_folder': return <CanvaDeleteFolderCard />;
    case 'list_folder_items': return <CanvaFolderItemsCard data={data} />;
    case 'move_item': return <CanvaMoveItemCard args={args} />;
    case 'create_comment': return <CanvaCreateCommentCard data={data} />;
    case 'get_comment_thread': return <CanvaCommentThreadCard data={data} />;
    case 'reply_comment': return <CanvaReplyCommentCard data={data} />;
    case 'list_comment_replies': return <CanvaCommentRepliesCard data={data} />;
    case 'list_brand_templates': return <CanvaBrandTemplatesCard data={data} />;
    case 'get_brand_template_dataset': return <CanvaTemplateDatasetCard data={data} />;
    case 'autofill_brand_template': return <CanvaAutofillCard data={data} />;
    case 'resize_design': return <CanvaResizeCard data={data} />;
    case 'import_design_from_url': return <CanvaImportCard data={data} />;
    default: return null;
  }
}
