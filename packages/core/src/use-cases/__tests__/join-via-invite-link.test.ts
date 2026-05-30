import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { JoinViaInviteLinkUseCase } from '../join-via-invite-link';
import type { ITeamRepository } from '../../ports/team-repository';
import {
  TeamInviteLinkNotFoundError,
  TeamInviteLinkExpiredError,
  TeamInviteLinkRevokedError,
  TeamSeatLimitError,
  UserAlreadyInTeamError,
  TeamRepositoryError,
  type Team,
  type TeamInviteLink,
} from '../../domain/team';

function makeTeam(override?: Partial<Team>): Team {
  return {
    id: 'team-1',
    name: 'My Team',
    ownerId: 'owner-1',
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...override,
  };
}

function makeLink(override?: Partial<TeamInviteLink>): TeamInviteLink {
  return {
    id: 'link-1',
    teamId: 'team-1',
    token: 'token-abc',
    expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
    revokedAt: null,
    createdBy: 'owner-1',
    createdAt: '2026-01-01T00:00:00+00:00',
    ...override,
  };
}

function mockRepo(overrides?: Partial<ITeamRepository>): ITeamRepository {
  return {
    findById: async () => ok(makeTeam()),
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
    findInviteLinkByToken: async () => ok(makeLink()),
    findInviteLinkByTeamId: async () => ok(null),
    saveInviteLink: async (l) => ok(l),
    revokeInviteLink: async () => ok(undefined),
    ...overrides,
  };
}

describe('JoinViaInviteLinkUseCase', () => {
  const baseInput = {
    token: 'token-abc',
    userId: 'user-2',
    userEmail: 'user@example.com',
    maxSeats: 3,
    traceId: 'trace-1',
  };

  it('creates active membership for valid link', async () => {
    const repo = mockRepo();
    const useCase = new JoinViaInviteLinkUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().membership.status).toBe('active');
    expect(result._unsafeUnwrap().membership.userId).toBe('user-2');
  });

  it('returns TeamInviteLinkNotFoundError when token does not exist', async () => {
    const repo = mockRepo({ findInviteLinkByToken: async () => ok(null) });
    const useCase = new JoinViaInviteLinkUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamInviteLinkNotFoundError);
  });

  it('returns TeamInviteLinkRevokedError when link is revoked', async () => {
    const revokedLink = makeLink({ revokedAt: '2026-01-15T00:00:00+00:00' });
    const repo = mockRepo({ findInviteLinkByToken: async () => ok(revokedLink) });
    const useCase = new JoinViaInviteLinkUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamInviteLinkRevokedError);
  });

  it('returns TeamInviteLinkExpiredError when link is expired', async () => {
    const expiredLink = makeLink({ expiresAt: '2025-01-01T00:00:00+00:00' });
    const repo = mockRepo({ findInviteLinkByToken: async () => ok(expiredLink) });
    const useCase = new JoinViaInviteLinkUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamInviteLinkExpiredError);
  });

  it('returns TeamSeatLimitError when seats are full', async () => {
    // maxSeats=3: owner(1) + 2 active members → 2+1=3 >= 3
    const repo = mockRepo({ countActiveMembers: async () => ok(2) });
    const useCase = new JoinViaInviteLinkUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamSeatLimitError);
  });

  it('returns UserAlreadyInTeamError when user is already in a team', async () => {
    const repo = mockRepo({ findByMemberId: async () => ok(makeTeam()) });
    const useCase = new JoinViaInviteLinkUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UserAlreadyInTeamError);
  });

  it('returns UserAlreadyInTeamError when user is the team owner', async () => {
    const repo = mockRepo({
      findInviteLinkByToken: async () => ok(makeLink()),
      findById: async () => ok(makeTeam({ ownerId: 'user-2' })),
    });
    const useCase = new JoinViaInviteLinkUseCase(repo);
    const result = await useCase.execute({ ...baseInput, userId: 'user-2' });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UserAlreadyInTeamError);
  });

  it('propagates repository error', async () => {
    const dbError = new TeamRepositoryError('DB down');
    const repo = mockRepo({ findInviteLinkByToken: async () => err(dbError) });
    const useCase = new JoinViaInviteLinkUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamRepositoryError);
  });
});
