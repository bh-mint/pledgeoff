import type { Result } from 'neverthrow';
import type { WebhookConfig, WebhookConfigRepositoryError } from '../domain/webhook-config';

export interface IWebhookConfigRepository {
  save(config: WebhookConfig): Promise<Result<WebhookConfig, WebhookConfigRepositoryError>>;
  findByUserId(userId: string): Promise<Result<WebhookConfig | null, WebhookConfigRepositoryError>>;
  deleteByUserId(userId: string): Promise<Result<void, WebhookConfigRepositoryError>>;
}
