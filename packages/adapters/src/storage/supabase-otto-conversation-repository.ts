import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OttoConversation, OttoMessage } from '@pledgeoff/core';
import { OttoConversationRepositoryError, type IOttoConversationRepository } from '@pledgeoff/core';

type OttoConversationRow = {
  id: string;
  user_id: string;
  idea_id: string;
  messages: OttoMessage[];
  created_at: string;
  updated_at: string;
};

function rowToConversation(row: OttoConversationRow): OttoConversation {
  return {
    id: row.id,
    userId: row.user_id,
    ideaId: row.idea_id,
    messages: row.messages ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseOttoConversationRepository implements IOttoConversationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByUserAndIdea(userId: string, ideaId: string): Promise<Result<OttoConversation | null, OttoConversationRepositoryError>> {
    const { data, error } = await this.client
      .from('otto_conversations')
      .select()
      .eq('user_id', userId)
      .eq('idea_id', ideaId)
      .maybeSingle<OttoConversationRow>();

    if (error) return err(new OttoConversationRepositoryError(error.message));
    if (!data) return ok(null);
    return ok(rowToConversation(data));
  }

  async save(conversation: OttoConversation): Promise<Result<OttoConversation, OttoConversationRepositoryError>> {
    const { data, error } = await this.client
      .from('otto_conversations')
      .upsert({
        id: conversation.id,
        user_id: conversation.userId,
        idea_id: conversation.ideaId,
        messages: conversation.messages,
        created_at: conversation.createdAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,idea_id' })
      .select()
      .single<OttoConversationRow>();

    if (error) return err(new OttoConversationRepositoryError(error.message));
    return ok(rowToConversation(data));
  }
}
