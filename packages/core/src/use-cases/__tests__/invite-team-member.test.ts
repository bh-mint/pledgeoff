import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { InviteTeamMemberUseCase } from '../invite-team-member';
import type { ITeamRepository } from '../../ports/team-repository';
import {
  TeamSeatLimitError,
  TeamMemberAlreadyExistsError,
  TeamForbiddenError,
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
    invitedAt: '2026-01-01T00:00:00.000Z',
    acceptedAt: '2026-01-01T01:00:00.000Z',
    leftAt: null, removedBy: null, removalReason: null,
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
    updateTeam: async (t) => ok(t),
    saveMembership: async (m) => ok(m),
    updateMembership: async (m) => ok(m),
    updateMembershipRole: async (id, role, updatedAt) => ok(makeMembership({ id, role, updatedAt })),
    findMembershipByUserId: async () => ok(null),
    findMembershipByToken: async () => ok(null),
    findMembershipsByTeamId: async () => ok([]),
    deleteMembership: async () => ok(undefined),
    countActiveMembers: async () => ok(0),
    findInviteLinkByToken: async () => ok(null),
    findInviteLinkByTeamId: async () => ok(null),
    saveInviteLink: async (l) => ok(l),
    revokeInviteLink: async () => ok(undefined),
    findDomainAllowlistsByTeamId: async () => ok([]),
    findTeamByEmailDomain: async () => ok(null),
    saveDomainAllowlist: async (e) => ok(e),
    deleteDomainAllowlist: async () => ok(undefined),
    ...overrides,
  };
}

describe('InviteTeamMemberUseCase', () => {
  const baseInput = {
    callerId: 'owner-1',
    maxSeats: 3,
    invitedEmail: 'new@example.com',
    traceId: 'trace-1',
  };

  it('creates a team if owner has none and saves pending membership', async () => {
    const saved = { team: null as Team | null, membership: null as TeamMembership | null };

    const repo = mockRepo({
      saveTeam: async (t) => { saved.team = t; return ok(t); },
      saveMembership: async (m) => { saved.membership = m; return ok(m); },
    });

    const useCase = new InviteTeamMemberUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(saved.team).not.toBeNull();
    expect(saved.membership?.status).toBe('pending');
    expect(saved.membership?.invitedEmail).toBe('new@example.com');
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
      // maxSeats=3: owner(1) + 2 members → countActiveMembers=2 → 2+1=3 >= 3
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
    findInviteLinkByToken: async () => ok(null),
    findInviteLinkByTeamId: async () => ok(null),
    saveInviteLink: async (l) => ok(l),
    revokeInviteLink: async () => ok(undefined),
    findDomainAllowlistsByTeamId: async () => ok([]),
    findTeamByEmailDomain: async () => ok(null),
    saveDomainAllowlist: async (e) => ok(e),
    deleteDomainAllowlist: async () => ok(undefined),
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

  it('allows an active admin member to invite', async () => {
    const team = makeTeam({ ownerId: 'owner-1' });
    const adminMembership = makeMembership({ userId: 'admin-1', role: 'admin', status: 'active' });

    const repo = mockRepo({
      findByOwnerId: async () => ok(null),
      findByMemberId: async () => ok(team),
      findMembershipByUserId: async () => ok(adminMembership),
      countActiveMembers: async () => ok(0),
      findMembershipsByTeamId: async () => ok([adminMembership]),
    });

    const useCase = new InviteTeamMemberUseCase(repo);
    const result = await useCase.execute({ ...baseInput, callerId: 'admin-1' });

    expect(result.isOk()).toBe(true);
  });

  it('rejects a plain member trying to invite', async () => {
    const team = makeTeam({ ownerId: 'owner-1' });
    const plainMembership = makeMembership({ userId: 'member-1', role: 'member', status: 'active' });

    const repo = mockRepo({
      findByOwnerId: async () => ok(null),
      findByMemberId: async () => ok(team),
      findMembershipByUserId: async () => ok(plainMembership),
    });

    const useCase = new InviteTeamMemberUseCase(repo);
    const result = await useCase.execute({ ...baseInput, callerId: 'member-1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamForbiddenError);
  });
});
