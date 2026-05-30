import { Result, ok, err } from 'neverthrow';
import type { IIdeaRepository } from '../ports/idea-repository';

export class DeleteIdeaError extends Error {
  constructor(readonly code: 'NOT_FOUND' | 'INTERNAL') {
    super(code);
  }
}

export class DeleteIdeaUseCase {
  constructor(private readonly ideaRepo: IIdeaRepository) {}

  async execute(input: {
    ideaId: string;
    userId: string;
    traceId: string;
  }): Promise<Result<void, DeleteIdeaError>> {
    const findResult = await this.ideaRepo.findById(input.ideaId);
    if (findResult.isErr()) return err(new DeleteIdeaError('INTERNAL'));

    const idea = findResult.value;
    if (!idea) return err(new DeleteIdeaError('NOT_FOUND'));
    if (idea.userId !== input.userId) return err(new DeleteIdeaError('NOT_FOUND'));

    const deleteResult = await this.ideaRepo.delete(input.ideaId, input.userId);
    if (deleteResult.isErr()) return err(new DeleteIdeaError('INTERNAL'));

    return ok(undefined);
  }
}
