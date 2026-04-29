import { z } from 'zod';
import { Result, ok, err } from 'neverthrow';

export const IdeaSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  text: z.string().min(10).max(2000),
  createdAt: z.string().datetime(),
});

export type Idea = z.infer<typeof IdeaSchema>;

export class IdeaTooShortError extends Error {
  readonly code = 'IDEA_TOO_SHORT' as const;
  constructor() {
    super('Idea text must be at least 10 characters');
    this.name = 'IdeaTooShortError';
  }
}

export class IdeaTooLongError extends Error {
  readonly code = 'IDEA_TOO_LONG' as const;
  constructor() {
    super('Idea text must be at most 2000 characters');
    this.name = 'IdeaTooLongError';
  }
}

export type CreateIdeaError = IdeaTooShortError | IdeaTooLongError;

export function createIdea(input: {
  userId: string;
  text: string;
}): Result<Idea, CreateIdeaError> {
  const trimmed = input.text.trim();
  if (trimmed.length < 10) return err(new IdeaTooShortError());
  if (trimmed.length > 2000) return err(new IdeaTooLongError());

  return ok({
    id: crypto.randomUUID(),
    userId: input.userId,
    text: trimmed,
    createdAt: new Date().toISOString(),
  });
}
