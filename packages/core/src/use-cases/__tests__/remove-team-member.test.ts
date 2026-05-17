import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { RemoveTeamMemberUseCase } from '../remove-team-member';
import type { ITeamRepository } from '../../ports/team-repository';
import {
  TeamForbiddenError,
  TeamNotFoundError,
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

function makeMembership(override?: Partial<TeamMembership>): TeamMembership {
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
    findMembershipByToken: async () => ok(null),
    findMembershipsByTeamId: async () => ok([]),
    deleteMembership: async () => ok(undefined),
    countActiveMembers: async () => ok(0),
    ...overrides,
  };
}

describe('RemoveTeamMemberUseCase', () => {
  const baseInput = { ownerId: 'owner-1', membershipId: 'mem-1', traceId: 'trace-1' };

  it('soft-deletes a member (status=removed, removalReason=removed_by_owner)', async () => {
    const team = makeTeam();
    const membership = makeMembership();
    const captured = { m: null as TeamMembership | null };

    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      findMembershipsByTeamId: async () => ok([membership]),
      updateMembership: async (m) => { captured.m = m; return ok(m); },
    });

    const useCase = new RemoveTeamMemberUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(captured.m?.status).toBe('removed');
    expect(captured.m?.removedBy).toBe('owner-1');
    expect(captured.m?.removalReason).toBe('removed_by_owner');
    expect(captured.m?.leftAt).toBeTruthy();
  });

  it('rejects when caller has no team', async () => {
    const repo = mockRepo({ findByOwnerId: async () => ok(null) });
    const useCase = new RemoveTeamMemberUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamNotFoundError);
  });

  it('rejects when membership does not belong to caller team', async () => {
    const team = makeTeam();
    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      findMembershipsByTeamId: async () => ok([makeMembership({ id: 'other-mem' })]),
    });
    const useCase = new RemoveTeamMemberUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamForbiddenError);
  });

  it('rejects removing the owner membership', async () => {
    const team = makeTeam();
    const ownerMembership = makeMembership({ id: 'mem-1', role: 'owner' });
    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      findMembershipsByTeamId: async () => ok([ownerMembership]),
    });
    const useCase = new RemoveTeamMemberUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamForbiddenError);
  });

  it('propagates repository error', async () => {
    const repoError = new TeamRepositoryError('DB error');
    const repo = mockRepo({ findByOwnerId: async () => err(repoError) });
    const useCase = new RemoveTeamMemberUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamRepositoryError);
  });
});
