import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { LeaveTeamUseCase } from '../leave-team';
import type { ITeamRepository } from '../../ports/team-repository';
import {
  LeaveTeamNotMemberError,
  TeamRepositoryError,
  type Team,
  type TeamMembership,
} from '../../domain/team';

function makeTeam(): Team {
  return {
    id: 'team-1', name: 'My Team', ownerId: 'owner-1',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeActiveMembership(override?: Partial<TeamMembership>): TeamMembership {
  return {
    id: 'mem-1', teamId: 'team-1', userId: 'user-2',
    invitedEmail: 'member@example.com', role: 'member', status: 'active',
    inviteToken: 'token-1',
    invitedAt: '2026-01-01T00:00:00.000Z',
    acceptedAt: '2026-01-01T01:00:00.000Z',
    leftAt: null, removedBy: null, removalReason: null,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...override,
  };
}

function mockRepo(overrides?: Partial<ITeamRepository>): ITeamRepository {
  return {
    findById: async () => ok(null),
    findByOwnerId: async () => ok(null),
    findByMemberId: async () => ok(null),
    saveTeam: async (t) => ok(t),
    updateTeam: async (t) => ok(t),
    saveMembership: async (m) => ok(m),
    updateMembership: async (m) => ok(m),
    updateMembershipRole: async (id, role, updatedAt) => ok({ id, role, updatedAt } as never),
    findMembershipByUserId: async () => ok(null),
    findMembershipByToken: async () => ok(null),
    findMembershipsByTeamId: async () => ok([]),
    deleteMembership: async () => ok(undefined),
    countActiveMembers: async () => ok(0),
    findInviteLinkByToken: async () => ok(null),
    findInviteLinkByTeamId: async () => ok(null),
    saveInviteLink: async (l) => ok(l),
    revokeInviteLink: async () => ok(undefined),
    ...overrides,
  };
}

describe('LeaveTeamUseCase', () => {
  const baseInput = { userId: 'user-2', traceId: 'trace-1' };

  it('soft-deletes membership with status=left and removalReason=left', async () => {
    const team = makeTeam();
    const membership = makeActiveMembership();
    const captured = { m: null as TeamMembership | null };

    const repo = mockRepo({
      findByMemberId: async () => ok(team),
      findMembershipsByTeamId: async () => ok([membership]),
      updateMembership: async (m) => { captured.m = m; return ok(m); },
    });

    const useCase = new LeaveTeamUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(captured.m?.status).toBe('left');
    expect(captured.m?.removedBy).toBe('user-2');
    expect(captured.m?.removalReason).toBe('left');
    expect(captured.m?.leftAt).toBeTruthy();
  });

  it('rejects when user is not a member of any team', async () => {
    const repo = mockRepo({ findByMemberId: async () => ok(null) });
    const useCase = new LeaveTeamUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(LeaveTeamNotMemberError);
  });

  it('rejects when active membership not found in team memberships list', async () => {
    const team = makeTeam();
    const repo = mockRepo({
      findByMemberId: async () => ok(team),
      findMembershipsByTeamId: async () => ok([makeActiveMembership({ userId: 'other-user' })]),
    });
    const useCase = new LeaveTeamUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(LeaveTeamNotMemberError);
  });

  it('propagates repository error from findByMemberId', async () => {
    const repoError = new TeamRepositoryError('DB error');
    const repo = mockRepo({ findByMemberId: async () => err(repoError) });
    const useCase = new LeaveTeamUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamRepositoryError);
  });
});
