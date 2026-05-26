-- Backfill: trim otto_conversations.messages to last 40 entries
-- Domain enforces MAX_CONVERSATION_MESSAGES=40 at appendMessage() time,
-- but conversations created before this constraint may exceed the limit.
-- Rollback: no structural change — data loss on trim is acceptable (old messages).

UPDATE public.otto_conversations
SET messages = (
  SELECT jsonb_agg(msg)
  FROM (
    SELECT msg
    FROM jsonb_array_elements(messages) AS msg
    ORDER BY (msg->>'createdAt') ASC
    OFFSET GREATEST(0, jsonb_array_length(messages) - 40)
  ) sub
)
WHERE jsonb_array_length(messages) > 40;
