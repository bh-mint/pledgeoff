import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EngineeringSnapshot, VelocityMetrics } from '@pledgeoff/core';
import { EngineeringSnapshotRepositoryError, type IEngineeringSnapshotRepository } from '@pledgeoff/core';

// AES-256-GCM: 12-byte IV + 16-byte auth tag + ciphertext, all base64-encoded
function encryptToken(plaintext: string, masterKey: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptToken(encoded: string, masterKey: Buffer): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

type SnapshotRow = {
  id: string;
  user_id: string;
  github_org: string;
  github_access_token_encrypted: string;
  repo_filter: string[] | null;
  velocity_metrics: VelocityMetrics;
  bottlenecks: string[];
  snapshot_at: string;
  created_at: string;
};

function rowToSnapshot(row: SnapshotRow): EngineeringSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    githubOrg: row.github_org,
    repoFilter: row.repo_filter,
    velocityMetrics: row.velocity_metrics,
    bottlenecks: row.bottlenecks,
    snapshotAt: row.snapshot_at,
    createdAt: row.created_at,
  };
}

export class SupabaseEngineeringSnapshotRepository implements IEngineeringSnapshotRepository {
  private readonly masterKey: Buffer;

  constructor(
    private readonly client: SupabaseClient,
    masterKeyHex: string,
  ) {
    if (!masterKeyHex || masterKeyHex.length !== 64) {
      throw new Error('GITHUB_TOKEN_MASTER_KEY must be a 64-character hex string (32 bytes)');
    }
    this.masterKey = Buffer.from(masterKeyHex, 'hex');
  }

  async save(snapshot: EngineeringSnapshot, plainToken: string): Promise<Result<EngineeringSnapshot, EngineeringSnapshotRepositoryError>> {
    const encrypted = encryptToken(plainToken, this.masterKey);

    const { data, error } = await this.client
      .from('engineering_snapshots')
      .upsert(
        {
          id: snapshot.id,
          user_id: snapshot.userId,
          github_org: snapshot.githubOrg,
          github_access_token_encrypted: encrypted,
          repo_filter: snapshot.repoFilter,
          velocity_metrics: snapshot.velocityMetrics,
          bottlenecks: snapshot.bottlenecks,
          snapshot_at: snapshot.snapshotAt,
          created_at: snapshot.createdAt,
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single<SnapshotRow>();

    if (error) return err(new EngineeringSnapshotRepositoryError(error.message));
    return ok(rowToSnapshot(data));
  }

  async findByUserId(userId: string): Promise<Result<EngineeringSnapshot | null, EngineeringSnapshotRepositoryError>> {
    const { data, error } = await this.client
      .from('engineering_snapshots')
      .select('id, user_id, github_org, repo_filter, velocity_metrics, bottlenecks, snapshot_at, created_at')
      .eq('user_id', userId)
      .maybeSingle<Omit<SnapshotRow, 'github_access_token_encrypted'>>();

    if (error) return err(new EngineeringSnapshotRepositoryError(error.message));
    if (!data) return ok(null);

    return ok(rowToSnapshot({ ...data, github_access_token_encrypted: '' }));
  }

  async findAllWithTokens(): Promise<Result<Array<{ snapshot: EngineeringSnapshot; plainToken: string }>, EngineeringSnapshotRepositoryError>> {
    const { data, error } = await this.client
      .from('engineering_snapshots')
      .select()
      .returns<SnapshotRow[]>();

    if (error) return err(new EngineeringSnapshotRepositoryError(error.message));

    const results: Array<{ snapshot: EngineeringSnapshot; plainToken: string }> = [];
    for (const row of data ?? []) {
      try {
        const plainToken = decryptToken(row.github_access_token_encrypted, this.masterKey);
        results.push({ snapshot: rowToSnapshot(row), plainToken });
      } catch {
        // Skip rows with corrupted tokens rather than failing the whole batch
      }
    }
    return ok(results);
  }

  async deleteByUserId(userId: string): Promise<Result<void, EngineeringSnapshotRepositoryError>> {
    const { error } = await this.client
      .from('engineering_snapshots')
      .delete()
      .eq('user_id', userId);

    if (error) return err(new EngineeringSnapshotRepositoryError(error.message));
    return ok(undefined);
  }
}
