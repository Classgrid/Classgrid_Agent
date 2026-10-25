// list_comment_replies: the replies under a comment (first 4, then "Show more")
import React from 'react';
import { MessageSquare } from 'lucide-react';
import { AppCard, Pill, ShortList } from '../shared';
import { CanvaEmptyState } from './CanvaEmptyState';
import { CanvaCommentBubble } from './CanvaCommentBubble';

// ─── Replies ───
export function CanvaCommentRepliesCard({ data }: { data: any }) {
  const replies: any[] = data?.items || [];
  if (!replies.length) return <CanvaEmptyState icon={MessageSquare} text="No replies yet" />;
  return (
    <AppCard brand="canva" title="Replies" right={<Pill tone="purple">{replies.length}</Pill>}>
      <ShortList items={replies} first={4} render={(r: any) => <div key={r.id} className="py-1.5"><CanvaCommentBubble author={r.author?.display_name} text={r.content?.plaintext || r.content?.markdown} when={r.created_at} /></div>} />
    </AppCard>
  );
}
