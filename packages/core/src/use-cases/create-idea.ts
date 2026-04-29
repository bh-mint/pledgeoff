import { Result, err, ok } from 'neverthrow';
import { createIdea, type Idea, type CreateIdeaError } from '../domain/idea.js';
import type { IIdeaRepository, IdeaRepositoryError } from '../ports/idea-repository.js';
import type { IEventBus, EventBusError } from '../ports/event-bus.js';

export interface CreateIdeaInput {
  readonly userId: string;
  readonly text: string;
  readonly traceId: string;
}

export type CreateIdeaUseCaseError = CreateIdeaError | IdeaRepositoryError | EventBusError;

export class CreateIdeaUseCase {
  constructor(
    private readonly ideaRepo: IIdeaRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: CreateIdeaInput): Promise<Result<Idea, CreateIdeaUseCaseError>> {
    const ideaResult = createIdea({ userId: input.userId, text: input.text });
    if (ideaResult.isErr()) return err(ideaResult.error);

    const idea = ideaResult.value;

    const saveResult = await this.ideaRepo.save(idea);
    if (saveResult.isErr()) return err(saveResult.error);

    const publishResult = await this.eventBus.publish('idea.created.v1', {
      eventId: crypto.randomUUID(),
      eventType: 'idea.created.v1',
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      traceId: input.traceId,
      payload: { ideaId: idea.id, userId: idea.userId, text: idea.text },
    });
    if (publishResult.isErr()) return err(publishResult.error);

    return ok(idea);
  }
}
