import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { UpdateMemberRoleUseCase } from '../update-member-role';
import type { ITeamRepository } from '../../ports/team-repository';
import {
  TeamForbiddenError,
  TeamNotFoundError,
  TeamUnauthorizedRoleChangeError,
  TeamRepositoryError,
  type Team,
  type TeamMembership,
} from '../../domain/team';

function makeTeam(override?: Partial<Team>): Team {
  return {
    id: 'team-1', name: 'My Team', ownerId: 'owner-1',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...override,
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

describe('UpdateMemberRoleUseCase', () => {
  const baseInput = { callerId: 'owner-1', membershipId: 'mem-1', newRole: 'admin' as const, traceId: 'trace-1' };

  it('promotes a member to admin', async () => {
    const team = makeTeam();
    const membership = makeMembership({ id: 'mem-1', role: 'member' });
    let capturedRole: TeamMembership['role'] | undefined;

    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      findMembershipsByTeamId: async () => ok([membership]),
      updateMembershipRole: async (id, role, updatedAt) => {
        capturedRole = role;
        return ok(makeMembership({ id, role, updatedAt }));
      },
    });

    const useCase = new UpdateMemberRoleUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(capturedRole).toBe('admin');
  });

  it('demotes an admin back to member', async () => {
    const team = makeTeam();
    const membership = makeMembership({ id: 'mem-1', role: 'admin' });
    let capturedRole: TeamMembership['role'] | undefined;

    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      findMembershipsByTeamId: async () => ok([membership]),
      updateMembershipRole: async (id, role, updatedAt) => {
        capturedRole = role;
        return ok(makeMembership({ id, role, updatedAt }));
      },
    });

    const useCase = new UpdateMemberRoleUseCase(repo);
    const result = await useCase.execute({ ...baseInput, newRole: 'member' });

    expect(result.isOk()).toBe(true);
    expect(capturedRole).toBe('member');
  });

  it('rejects when caller is not the team owner', async () => {
    const repo = mockRepo({ findByOwnerId: async () => ok(null) });
    const useCase = new UpdateMemberRoleUseCase(repo);
    const result = await useCase.execute({ ...baseInput, callerId: 'not-owner' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamForbiddenError);
  });

  it('rejects changing the owner role', async () => {
    const team = makeTeam();
    const ownerMembership = makeMembership({ id: 'mem-1', role: 'owner' });

    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      findMembershipsByTeamId: async () => ok([ownerMembership]),
    });

    const useCase = new UpdateMemberRoleUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamUnauthorizedRoleChangeError);
  });

  it('rejects changing role of a pending (non-active) member', async () => {
    const team = makeTeam();
    const pendingMembership = makeMembership({ id: 'mem-1', role: 'member', status: 'pending' });

    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      findMembershipsByTeamId: async () => ok([pendingMembership]),
    });

    const useCase = new UpdateMemberRoleUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamUnauthorizedRoleChangeError);
  });

  it('rejects when membership not found in caller team', async () => {
    const team = makeTeam();

    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      findMembershipsByTeamId: async () => ok([makeMembership({ id: 'other-mem' })]),
    });

    const useCase = new UpdateMemberRoleUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamNotFoundError);
  });

  it('propagates repository error', async () => {
    const repoError = new TeamRepositoryError('DB error');
    const repo = mockRepo({ findByOwnerId: async () => err(repoError) });
    const useCase = new UpdateMemberRoleUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamRepositoryError);
  });
});
