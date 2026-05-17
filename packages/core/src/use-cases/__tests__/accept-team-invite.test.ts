import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { AcceptTeamInviteUseCase } from '../accept-team-invite';
import type { ITeamRepository } from '../../ports/team-repository';
import {
  TeamInviteNotFoundError,
  TeamNotFoundError,
  TeamRepositoryError,
  UserAlreadyInTeamError,
  type Team,
  type TeamMembership,
} from '../../domain/team';

function makeTeam(): Team {
  return {
    id: 'team-1', name: 'My Team', ownerId: 'owner-1',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makePendingMembership(): TeamMembership {
  return {
    id: 'mem-1', teamId: 'team-1', userId: null,
    invitedEmail: 'new@example.com', role: 'member', status: 'pending',
    inviteToken: 'token-abc',
    invitedAt: '2026-01-01T00:00:00.000Z',
    acceptedAt: null, leftAt: null, removedBy: null, removalReason: null,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function mockRepo(overrides?: Partial<ITeamRepository>): ITeamRepository {
  return {
    findById: async () => ok(null),
    findByOwnerId: async () => ok(null),
    findByMemberId: async () => ok(null),
    saveTeam: async (t) => ok(t),
    saveMembership: async (m) => ok(m),
    updateMembership: async (m) => ok(m),
    findMembershipByToken: async () => ok(null),
    findMembershipsByTeamId: async () => ok([]),
    deleteMembership: async () => ok(undefined),
    countActiveMembers: async () => ok(0),
    ...overrides,
  };
}

describe('AcceptTeamInviteUseCase', () => {
  const baseInput = { inviteToken: 'token-abc', userId: 'user-2', traceId: 'trace-1' };

  it('activates a pending membership and returns team', async () => {
    const team = makeTeam();
    const pending = makePendingMembership();
    const saved = { membership: null as TeamMembership | null };

    const repo = mockRepo({
      findMembershipByToken: async () => ok(pending),
      findById: async () => ok(team),
      updateMembership: async (m) => { saved.membership = m; return ok(m); },
    });

    const useCase = new AcceptTeamInviteUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(saved.membership?.status).toBe('active');
    expect(saved.membership?.userId).toBe('user-2');
    expect(result._unsafeUnwrap().team.id).toBe('team-1');
  });

  it('rejects when user is already a member of another team', async () => {
    const existingTeam = makeTeam();
    const repo = mockRepo({
      findByMemberId: async () => ok(existingTeam),
    });
    const useCase = new AcceptTeamInviteUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UserAlreadyInTeamError);
  });

  it('rejects when token does not exist', async () => {
    const repo = mockRepo({ findMembershipByToken: async () => ok(null) });
    const useCase = new AcceptTeamInviteUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamInviteNotFoundError);
  });

  it('rejects when membership is already active', async () => {
    const active = { ...makePendingMembership(), status: 'active' as const };
    const repo = mockRepo({ findMembershipByToken: async () => ok(active) });
    const useCase = new AcceptTeamInviteUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamInviteNotFoundError);
  });

  it('returns error if team not found after accepting', async () => {
    const repo = mockRepo({
      findMembershipByToken: async () => ok(makePendingMembership()),
      findById: async () => ok(null),
    });
    const useCase = new AcceptTeamInviteUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamNotFoundError);
  });

  it('propagates repository error from updateMembership', async () => {
    const repoError = new TeamRepositoryError('DB error');
    const repo = mockRepo({
      findMembershipByToken: async () => ok(makePendingMembership()),
      updateMembership: async () => err(repoError),
    });
    const useCase = new AcceptTeamInviteUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamRepositoryError);
  });
});
