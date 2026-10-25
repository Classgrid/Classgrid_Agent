// reply_comment: the reply just added to a comment
import React from 'react';
import { MessageSquare } from 'lucide-react';
import { AppCard, Pill } from '../shared';
import { CanvaEmptyState } from './CanvaEmptyState';
import { CanvaCommentBubble } from './CanvaCommentBubble';

// ─── Reply added ───
export function CanvaReplyCommentCard({ data }: { data: any }) {
  const reply = data?.reply;
  if (!reply) return <CanvaEmptyState icon={MessageSquare} text="No replies yet" />;
  return (
    <AppCard brand="canva" title="Reply added" right={<Pill tone="purple">1</Pill>}>
      <div className="py-1.5"><CanvaCommentBubble author={reply.author?.display_name} text={reply.content?.plaintext || reply.content?.markdown} when={reply.created_at} /></div>
    </AppCard>
  );
}
