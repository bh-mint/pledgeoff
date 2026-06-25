import { Result, err, ok } from 'neverthrow';
import { createIdea, type Idea, type CreateIdeaError, type Niche } from '../domain/idea';
import type { IIdeaRepository, IdeaRepositoryError } from '../ports/idea-repository';

export interface CreateIdeaInput {
  readonly userId: string;
  readonly text: string;
  readonly traceId: string;
  readonly teamId?: string | null;
  readonly niche?: Niche;
  readonly context?: string | null;
}

export type CreateIdeaUseCaseError = CreateIdeaError | IdeaRepositoryError;

export class CreateIdeaUseCase {
  constructor(private readonly ideaRepo: IIdeaRepository) {}

  async execute(input: CreateIdeaInput): Promise<Result<Idea, CreateIdeaUseCaseError>> {
    const ideaResult = createIdea({ userId: input.userId, text: input.text, teamId: input.teamId, niche: input.niche, context: input.context });
    if (ideaResult.isErr()) return err(ideaResult.error);

    const idea = ideaResult.value;
    const eventId = crypto.randomUUID();

    const saveResult = await this.ideaRepo.saveWithEvent(idea, {
      eventId,
      eventType: 'idea.created.v1',
      payload: {
        eventId,
        eventType: 'idea.created.v1',
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        traceId: input.traceId,
        payload: { ideaId: idea.id, userId: idea.userId, text: idea.text },
      },
    });
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(idea);
  }
}
