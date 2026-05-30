import { describe, it, expect, beforeEach } from 'vitest';
import { RegisterWebhookUseCase } from '../register-webhook';
import type { IWebhookConfigRepository } from '../../ports/IWebhookConfigRepository';
import type { WebhookConfig, WebhookConfigRepositoryError } from '../../domain/webhook-config';
import { WebhookConfigRepositoryError as WebhookConfigRepositoryErrorClass } from '../../domain/webhook-config';
import { ok, err } from 'neverthrow';
import type { Result } from 'neverthrow';

class MockWebhookConfigRepo implements IWebhookConfigRepository {
  private store: WebhookConfig | null = null;

  async save(config: WebhookConfig): Promise<Result<WebhookConfig, WebhookConfigRepositoryError>> {
    this.store = config;
    return ok(config);
  }

  async findByUserId(_userId: string): Promise<Result<WebhookConfig | null, WebhookConfigRepositoryError>> {
    return ok(this.store);
  }

  async deleteByUserId(_userId: string): Promise<Result<void, WebhookConfigRepositoryError>> {
    this.store = null;
    return ok(undefined);
  }
}

class FailingWebhookConfigRepo implements IWebhookConfigRepository {
  async save(_config: WebhookConfig): Promise<Result<WebhookConfig, WebhookConfigRepositoryError>> {
    return err(new WebhookConfigRepositoryErrorClass('DB error'));
  }
  async findByUserId(_userId: string): Promise<Result<WebhookConfig | null, WebhookConfigRepositoryError>> {
    return ok(null);
  }
  async deleteByUserId(_userId: string): Promise<Result<void, WebhookConfigRepositoryError>> {
    return ok(undefined);
  }
}

describe('RegisterWebhookUseCase', () => {
  let repo: MockWebhookConfigRepo;
  let useCase: RegisterWebhookUseCase;

  beforeEach(() => {
    repo = new MockWebhookConfigRepo();
    useCase = new RegisterWebhookUseCase(repo);
  });

  it('registers a valid https URL and returns config with signing secret', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      url: 'https://example.com/webhook',
      traceId: 'trace-1',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.config.url).toBe('https://example.com/webhook');
      expect(result.value.config.userId).toBe('user-1');
      expect(result.value.config.active).toBe(true);
      expect(result.value.config.signingSecret).toMatch(/^po_whsec_[0-9a-f]{64}$/);
    }
  });

  it('rejects http:// URLs', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      url: 'http://example.com/webhook',
      traceId: 'trace-1',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('WEBHOOK_URL_INVALID');
    }
  });

  it('rejects invalid URLs', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      url: 'not-a-url',
      traceId: 'trace-1',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('WEBHOOK_URL_INVALID');
    }
  });

  it('replaces existing config (deletes before saving)', async () => {
    await useCase.execute({ userId: 'user-1', url: 'https://old.example.com/hook', traceId: 'trace-1' });
    const result = await useCase.execute({ userId: 'user-1', url: 'https://new.example.com/hook', traceId: 'trace-2' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.config.url).toBe('https://new.example.com/hook');
    }
  });

  it('propagates repository save error', async () => {
    const failUseCase = new RegisterWebhookUseCase(new FailingWebhookConfigRepo());
    const result = await failUseCase.execute({
      userId: 'user-1',
      url: 'https://example.com/webhook',
      traceId: 'trace-1',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('WEBHOOK_CONFIG_REPOSITORY_ERROR');
    }
  });

  it('two registrations produce different secrets', async () => {
    const r1 = await useCase.execute({ userId: 'user-1', url: 'https://a.example.com/hook', traceId: 't1' });
    const r2 = await useCase.execute({ userId: 'user-2', url: 'https://b.example.com/hook', traceId: 't2' });

    expect(r1.isOk()).toBe(true);
    expect(r2.isOk()).toBe(true);
    if (r1.isOk() && r2.isOk()) {
      expect(r1.value.config.signingSecret).not.toBe(r2.value.config.signingSecret);
    }
  });
});
