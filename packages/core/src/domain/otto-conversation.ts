import { z } from 'zod';
import { InvalidDomainDataError } from './errors';

export const OttoMessageRoleSchema = z.enum(['user', 'assistant']);
export type OttoMessageRole = z.infer<typeof OttoMessageRoleSchema>;

export const OttoMessageSchema = z.object({
  role: OttoMessageRoleSchema,
  content: z.string().min(1).max(10000),
  createdAt: z.string().datetime({ offset: true }),
});

export type OttoMessage = z.infer<typeof OttoMessageSchema>;

export const OttoConversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  ideaId: z.string().uuid(),
  messages: z.array(OttoMessageSchema),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type OttoConversation = z.infer<typeof OttoConversationSchema>;

export const MAX_CONVERSATION_MESSAGES = 40;

export function appendMessage(
  conversation: OttoConversation,
  role: OttoMessageRole,
  content: string,
): OttoConversation {
  const message: OttoMessage = {
    role,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  const messages = [...conversation.messages, message].slice(-MAX_CONVERSATION_MESSAGES);
  return { ...conversation, messages, updatedAt: new Date().toISOString() };
}

export function ottoConversationFromPersistence(data: unknown): OttoConversation {
  const result = OttoConversationSchema.safeParse(data);
  if (!result.success) {
    throw new InvalidDomainDataError('OttoConversation', result.error.message);
  }
  return result.data;
}

export function createOttoConversation(userId: string, ideaId: string): OttoConversation {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    userId,
    ideaId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}
