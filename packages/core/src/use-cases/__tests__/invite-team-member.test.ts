import { describe, it, expect, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { InviteTeamMemberUseCase } from '../invite-team-member';
import type { ITeamRepository } from '../../ports/team-repository';
import {
  TeamSeatLimitError,
  TeamMemberAlreadyExistsError,
  TeamRepositoryError,
  type Team,
  type TeamMembership,
} from '../../domain/team';

function makeTeam(override?: Partial<Team>): Team {
  return {
    id: 'team-1',
    name: 'My Team',
    ownerId: 'owner-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...override,
  };
}

function makeMembership(override?: Partial<TeamMembership>): TeamMembership {
  return {
    id: 'membership-1',
    teamId: 'team-1',
    userId: 'user-2',
    invitedEmail: 'member@example.com',
    role: 'member',
    status: 'active',
    inviteToken: 'token-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...override,
  };
}

function mockRepo(overrides?: Partial<ITeamRepository>): ITeamRepository {
  return {
    findById: async () => ok(null),
    findByOwnerId: async () => ok(null),
    findByMemberId: async () => ok(null),
    saveTeam: async (team) => ok(team),
    saveMembership: async (m) => ok(m),
    updateMembership: async (m) => ok(m),
    findMembershipByToken: async () => ok(null),
    findMembershipsByTeamId: async () => ok([]),
    deleteMembership: async () => ok(undefined),
    countActiveMembers: async () => ok(0),
    ...overrides,
  };
}

describe('InviteTeamMemberUseCase', () => {
  const baseInput = {
    ownerId: 'owner-1',
    ownerPlan: 'pro' as const,
    invitedEmail: 'new@example.com',
    traceId: 'trace-1',
  };

  it('creates a team if owner has none and saves pending membership', async () => {
    let savedTeam: Team | null = null;
    let savedMembership: TeamMembership | null = null;

    const repo = mockRepo({
      saveTeam: async (t) => { savedTeam = t; return ok(t); },
      saveMembership: async (m) => { savedMembership = m; return ok(m); },
    });

    const useCase = new InviteTeamMemberUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(savedTeam).not.toBeNull();
    expect(savedMembership?.status).toBe('pending');
    expect(savedMembership?.invitedEmail).toBe('new@example.com');
  });

  it('uses existing team when owner already has one', async () => {
    const existingTeam = makeTeam();
    let teamSaveCalled = false;

    const repo = mockRepo({
      findByOwnerId: async () => ok(existingTeam),
      saveTeam: async (t) => { teamSaveCalled = true; return ok(t); },
    });

    const useCase = new InviteTeamMemberUseCase(repo);
    await useCase.execute(baseInput);

    expect(teamSaveCalled).toBe(false);
  });

  it('rejects when seat limit is reached', async () => {
    const team = makeTeam();
    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      // pro plan has 3 seats: owner(1) + 2 members → countActiveMembers=2 → 2+1=3 >= 3
      countActiveMembers: async () => ok(2),
    });

    const useCase = new InviteTeamMemberUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamSeatLimitError);
  });

  it('rejects when email is already a member or has pending invite', async () => {
    const team = makeTeam();
    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      countActiveMembers: async () => ok(0),
      findMembershipsByTeamId: async () =>
        ok([makeMembership({ invitedEmail: 'new@example.com' })]),
    });

    const useCase = new InviteTeamMemberUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamMemberAlreadyExistsError);
  });

  it('normalises email to lowercase', async () => {
    let savedEmail = '';
    const repo = mockRepo({
      saveMembership: async (m) => { savedEmail = m.invitedEmail; return ok(m); },
    });

    const useCase = new InviteTeamMemberUseCase(repo);
    await useCase.execute({ ...baseInput, invitedEmail: 'UPPER@EXAMPLE.COM' });

    expect(savedEmail).toBe('upper@example.com');
  });

  it('propagates repository error from saveTeam', async () => {
    const repoError = new TeamRepositoryError('DB down');
    const repo = mockRepo({
      saveTeam: async () => err(repoError),
    });

    const useCase = new InviteTeamMemberUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamRepositoryError);
  });
});
