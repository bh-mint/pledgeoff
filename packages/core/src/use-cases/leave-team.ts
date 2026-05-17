import { Result, ok, err } from 'neverthrow';
import type { ITeamRepository } from '../ports/team-repository';
import {
  LeaveTeamNotMemberError,
  TeamRepositoryError,
} from '../domain/team';

export type LeaveTeamInput = {
  userId: string;
  traceId: string;
};

export type LeaveTeamError =
  | LeaveTeamNotMemberError
  | TeamRepositoryError;

export class LeaveTeamUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(input: LeaveTeamInput): Promise<Result<void, LeaveTeamError>> {
    const { userId } = input;

    // Find the team the user is a member of
    const teamResult = await this.teamRepo.findByMemberId(userId);
    if (teamResult.isErr()) return err(teamResult.error);
    if (!teamResult.value) return err(new LeaveTeamNotMemberError());

    // Find the specific membership row
    const membershipsResult = await this.teamRepo.findMembershipsByTeamId(teamResult.value.id);
    if (membershipsResult.isErr()) return err(membershipsResult.error);

    const membership = membershipsResult.value.find(
      (m) => m.userId === userId && m.status === 'active',
    );
    if (!membership) return err(new LeaveTeamNotMemberError());

    const now = new Date().toISOString();
    const updateResult = await this.teamRepo.updateMembership({
      ...membership,
      status: 'left',
      leftAt: now,
      removedBy: userId,
      removalReason: 'left',
      updatedAt: now,
    });
    if (updateResult.isErr()) return err(updateResult.error);

    return ok(undefined);
  }
}
