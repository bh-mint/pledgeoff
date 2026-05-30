import { Result, ok, err } from 'neverthrow';
import type { WebhookConfig, WebhookConfigRepositoryError } from '../domain/webhook-config';
import { validateWebhookUrl, WebhookUrlInvalidError } from '../domain/webhook-config';
import type { IWebhookConfigRepository } from '../ports/IWebhookConfigRepository';

export type RegisterWebhookInput = {
  readonly userId: string;
  readonly url: string;
  readonly traceId: string;
};

export type RegisterWebhookOutput = {
  readonly config: WebhookConfig;
};

export type RegisterWebhookError = WebhookUrlInvalidError | WebhookConfigRepositoryError;

export class RegisterWebhookUseCase {
  constructor(private readonly webhookConfigRepo: IWebhookConfigRepository) {}

  async execute(input: RegisterWebhookInput): Promise<Result<RegisterWebhookOutput, RegisterWebhookError>> {
    if (!validateWebhookUrl(input.url)) {
      return err(new WebhookUrlInvalidError());
    }

    const deleteResult = await this.webhookConfigRepo.deleteByUserId(input.userId);
    if (deleteResult.isErr()) return err(deleteResult.error);

    const signingSecret = generateSecret();

    const config: WebhookConfig = {
      id: crypto.randomUUID(),
      userId: input.userId,
      url: input.url,
      signingSecret,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.webhookConfigRepo.save(config);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok({ config: saveResult.value });
  }
}

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `po_whsec_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
