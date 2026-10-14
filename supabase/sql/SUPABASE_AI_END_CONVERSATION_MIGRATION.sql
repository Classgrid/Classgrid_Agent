-- Adds the fields used by end_conversation / warn_user. Additive only.
alter table public.ai_chat_sessions
  add column if not exists ended boolean not null default false,
  add column if not exists ended_at timestamptz,
  add column if not exists end_reason text,
  add column if not exists end_summary text,
  add column if not exists warned_count integer not null default 0,
  add column if not exists last_warning_at timestamptz;
