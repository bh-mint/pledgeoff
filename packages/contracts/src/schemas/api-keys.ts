import { z } from 'zod';

export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(64),
});

export const ApiKeyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  keyPrefix: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
export type ApiKeyResponse = z.infer<typeof ApiKeyResponseSchema>;
