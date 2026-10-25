// A design's comment thread as a conversation: the first comment and its replies
import React from 'react';
import { CdMessage } from './CdMessage';

export function CdDiscussion({ thread, replies }: { thread?: any; replies: any[] }) {
  const c = thread?.thread_type?.content;
  return (
    <div className="flex flex-col gap-2">
      {thread && <CdMessage name={thread.author?.display_name} when={thread.created_at} text={c?.plaintext || c?.markdown} />}
      {replies.map((r, i) => <CdMessage key={r.id ?? i} reply name={r.author?.display_name} when={r.created_at} text={r.content?.plaintext || r.content?.markdown} />)}
    </div>
  );
}
