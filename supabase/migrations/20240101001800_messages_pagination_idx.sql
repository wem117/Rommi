-- Composite index for bounded chat fetches.
--
-- getMessagesForConversation() now reads the newest N messages per
-- conversation: WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 200.
-- The existing single-column index (conversation_id) satisfies the filter but
-- not the ordering, forcing a sort of the conversation's full history on every
-- open. This composite serves filter + order + limit in one index scan.
--
-- Run once (supabase db push or the SQL editor). Idempotent.

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);
