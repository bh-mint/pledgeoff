import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WebhookConfig } from '@pledgeoff/core';
import { WebhookConfigRepositoryError } from '@pledgeoff/core';
import type { IWebhookConfigRepository } from '@pledgeoff/core';

type WebhookConfigRow = {
  id: string;
  user_id: string;
  url: string;
  secret_hash: string;
  active: boolean;
  created_at: string;
};

function rowToConfig(row: WebhookConfigRow): WebhookConfig {
  return {
    id: row.id,
    userId: row.user_id,
    url: row.url,
    signingSecret: row.secret_hash,
    active: row.active,
    createdAt: row.created_at,
  };
}

export class SupabaseWebhookConfigRepository implements IWebhookConfigRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(config: WebhookConfig): Promise<Result<WebhookConfig, WebhookConfigRepositoryError>> {
    const { data, error } = await this.supabase
      .from('webhook_configs')
      .upsert(
        {
          id: config.id,
          user_id: config.userId,
          url: config.url,
          secret_hash: config.signingSecret,
          active: config.active,
          created_at: config.createdAt,
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single<WebhookConfigRow>();

    if (error) return err(new WebhookConfigRepositoryError(error.message));
    return ok(rowToConfig(data));
  }

  async findByUserId(userId: string): Promise<Result<WebhookConfig | null, WebhookConfigRepositoryError>> {
    const { data, error } = await this.supabase
      .from('webhook_configs')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<WebhookConfigRow>();

    if (error) return err(new WebhookConfigRepositoryError(error.message));
    return ok(data ? rowToConfig(data) : null);
  }

  async deleteByUserId(userId: string): Promise<Result<void, WebhookConfigRepositoryError>> {
    const { error } = await this.supabase
      .from('webhook_configs')
      .delete()
      .eq('user_id', userId);

    if (error) return err(new WebhookConfigRepositoryError(error.message));
    return ok(undefined);
  }
}
