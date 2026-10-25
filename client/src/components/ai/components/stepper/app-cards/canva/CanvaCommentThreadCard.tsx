// get_comment_thread: one comment on a design (and whether it is resolved)
import React from 'react';
import { AppCard, Pill } from '../shared';
import { CanvaCommentBubble } from './CanvaCommentBubble';

// ─── Comment thread ───
export function CanvaCommentThreadCard({ data }: { data: any }) {
  const thread = data?.thread;
  const content = thread?.thread_type?.content;
  return (
    <AppCard brand="canva" title="Comment" right={thread?.thread_type?.resolver ? <Pill tone="purple">Resolved</Pill> : undefined}>
      <CanvaCommentBubble author={thread?.author?.display_name} text={content?.plaintext || content?.markdown} when={thread?.created_at} />
    </AppCard>
  );
}
