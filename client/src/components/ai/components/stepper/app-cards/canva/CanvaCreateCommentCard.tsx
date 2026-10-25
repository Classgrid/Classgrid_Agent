// create_comment: the comment just added to the design
import React from 'react';
import { AppCard, Pill } from '../shared';
import { CanvaCommentBubble } from './CanvaCommentBubble';

// ─── Comment added ───
export function CanvaCreateCommentCard({ data }: { data: any }) {
  const thread = data?.thread;
  const content = thread?.thread_type?.content;
  return (
    <AppCard brand="canva" title="Comment added" right={thread?.thread_type?.resolver ? <Pill tone="purple">Resolved</Pill> : undefined}>
      <CanvaCommentBubble author={thread?.author?.display_name} text={content?.plaintext || content?.markdown} when={thread?.created_at} />
    </AppCard>
  );
}
