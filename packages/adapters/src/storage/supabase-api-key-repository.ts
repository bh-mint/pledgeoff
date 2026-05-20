import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiKey } from '@pledgeoff/core';
import type { IApiKeyRepository, CreateApiKeyInput } from '@pledgeoff/core';

type ApiKeyRow = {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

function rowToApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    keyHash: row.key_hash,
    keyPrefix: row.key_prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  };
}

export class SupabaseApiKeyRepository implements IApiKeyRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateApiKeyInput): Promise<Result<ApiKey, Error>> {
    const { data, error } = await this.client
      .from('api_keys')
      .insert({
        user_id: input.userId,
        name: input.name,
        key_hash: input.keyHash,
        key_prefix: input.keyPrefix,
      })
      .select()
      .single<ApiKeyRow>();

    if (error) return err(new Error(error.message));
    return ok(rowToApiKey(data));
  }

  async listByUser(userId: string): Promise<Result<ApiKey[], Error>> {
    const { data, error } = await this.client
      .from('api_keys')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .returns<ApiKeyRow[]>();

    if (error) return err(new Error(error.message));
    return ok(data.map(rowToApiKey));
  }

  async findByHash(keyHash: string): Promise<Result<ApiKey | null, Error>> {
    const { data, error } = await this.client
      .from('api_keys')
      .select()
      .eq('key_hash', keyHash)
      .is('revoked_at', null)
      .maybeSingle<ApiKeyRow>();

    if (error) return err(new Error(error.message));
    return ok(data ? rowToApiKey(data) : null);
  }

  async countActiveByUser(userId: string): Promise<Result<number, Error>> {
    const { count, error } = await this.client
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('revoked_at', null);

    if (error) return err(new Error(error.message));
    return ok(count ?? 0);
  }

  async revoke(id: string, userId: string): Promise<Result<void, Error>> {
    const { error } = await this.client
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return err(new Error(error.message));
    return ok(undefined);
  }

  async updateLastUsed(id: string): Promise<Result<void, Error>> {
    const { error } = await this.client
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return err(new Error(error.message));
    return ok(undefined);
  }
}
