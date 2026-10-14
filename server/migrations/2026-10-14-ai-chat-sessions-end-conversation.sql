-- End-conversation support for the AI chat (run once on the primary Supabase project bumxgscngzjadyozdpce)
alter table public.ai_chat_sessions
  add column if not exists ended      boolean     not null default false,
  add column if not exists ended_at   timestamptz,
  add column if not exists end_reason text        check (end_reason in ('user_requested','abusive_after_warning')),
  add column if not exists warned_at  timestamptz;

create index if not exists ai_chat_sessions_ended_idx on public.ai_chat_sessions (ended) where ended = true;
