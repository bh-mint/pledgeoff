export type WebhookConfig = {
  readonly id: string;
  readonly userId: string;
  readonly url: string;
  /** Plaintext HMAC signing secret — stored in DB, protected via RLS + service_role only */
  readonly signingSecret: string;
  readonly active: boolean;
  readonly createdAt: string;
};

export class WebhookConfigRepositoryError extends Error {
  readonly code = 'WEBHOOK_CONFIG_REPOSITORY_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'WebhookConfigRepositoryError';
  }
}

export class WebhookUrlInvalidError extends Error {
  readonly code = 'WEBHOOK_URL_INVALID';
  constructor() {
    super('Webhook URL must be a valid https:// URL');
    this.name = 'WebhookUrlInvalidError';
  }
}

export function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
