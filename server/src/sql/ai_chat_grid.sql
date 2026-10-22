-- Share Grid: up to 4 people in one Classgrid AI chat (owner + 3).
-- Only adds new tables and one new column. Nothing old is changed.

-- 1. Who is in the chat
CREATE TABLE IF NOT EXISTS ai_chat_grid_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (session_id, user_email)
);
CREATE INDEX IF NOT EXISTS idx_grid_members_user ON ai_chat_grid_members(user_email);

-- 2. Every invite (copy link, from Grids, by email) and what happened to it: the history
CREATE TABLE IF NOT EXISTS ai_chat_grid_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  invite_type VARCHAR(10) NOT NULL CHECK (invite_type IN ('link', 'grids', 'email')),
  token VARCHAR(32) UNIQUE,
  invited_email VARCHAR(255),
  invited_by_email VARCHAR(255) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  accepted_by_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_grid_invites_session ON ai_chat_grid_invites(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grid_invites_email ON ai_chat_grid_invites(invited_email);

-- 3. Who sent each message (empty for old messages and for AI replies)
-- (no new index here: building one on this big table would scan every message)
ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);

-- Only our server (service role) reads and writes these
ALTER TABLE ai_chat_grid_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_grid_invites ENABLE ROW LEVEL SECURITY;
