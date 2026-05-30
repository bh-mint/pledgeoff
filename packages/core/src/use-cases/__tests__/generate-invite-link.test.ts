import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { GenerateInviteLinkUseCase } from '../generate-invite-link';
import type { ITeamRepository } from '../../ports/team-repository';
import {
  TeamNotFoundError,
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

describe('GenerateInviteLinkUseCase', () => {
  const baseInput = { ownerId: 'owner-1', traceId: 'trace-1' };

  it('generates a new link when owner has a team and no existing link', async () => {
    const team = makeTeam();
    let saved: TeamInviteLink | null = null;

    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      saveInviteLink: async (l) => { saved = l; return ok(l); },
    });

    const useCase = new GenerateInviteLinkUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(saved).not.toBeNull();
    expect(saved!.teamId).toBe('team-1');
    expect(saved!.revokedAt).toBeNull();
  });

  it('revokes existing link before generating a new one', async () => {
    const team = makeTeam();
    const existingLink = makeLink();
    let revokedId: string | null = null;

    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      findInviteLinkByTeamId: async () => ok(existingLink),
      revokeInviteLink: async (id) => { revokedId = id; return ok(undefined); },
    });

    const useCase = new GenerateInviteLinkUseCase(repo);
    await useCase.execute(baseInput);

    expect(revokedId).toBe('link-1');
  });

  it('does not revoke already-revoked link', async () => {
    const team = makeTeam();
    const revokedLink = makeLink({ revokedAt: '2026-01-15T00:00:00+00:00' });
    let revokeCalled = false;

    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      findInviteLinkByTeamId: async () => ok(revokedLink),
      revokeInviteLink: async () => { revokeCalled = true; return ok(undefined); },
    });

    const useCase = new GenerateInviteLinkUseCase(repo);
    await useCase.execute(baseInput);

    expect(revokeCalled).toBe(false);
  });

  it('returns TeamNotFoundError when owner has no team', async () => {
    const repo = mockRepo({ findByOwnerId: async () => ok(null) });

    const useCase = new GenerateInviteLinkUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamNotFoundError);
  });

  it('propagates repository error', async () => {
    const dbError = new TeamRepositoryError('DB down');
    const repo = mockRepo({ findByOwnerId: async () => err(dbError) });

    const useCase = new GenerateInviteLinkUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamRepositoryError);
  });
});
