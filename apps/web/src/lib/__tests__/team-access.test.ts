import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { TeamRepositoryError } from '@pledgeoff/core';
import type { Team, TeamMembership } from '@pledgeoff/core';

const mockFindByMemberId = vi.fn();
const mockFindByOwnerId = vi.fn();
const mockFindMembershipsByTeamId = vi.fn();

vi.mock('@/lib/container', () => ({
  container: {
    teamRepo: {
      findByMemberId: mockFindByMemberId,
      findByOwnerId: mockFindByOwnerId,
      findMembershipsByTeamId: mockFindMembershipsByTeamId,
    },
  },
}));

const { isTeamMember } = await import('@/lib/team-access');

const TEAM_ID = 'tttttttt-tttt-tttt-tttt-tttttttttttt';
const REQUESTER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const IDEA_OWNER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_TEAM_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: TEAM_ID,
    name: 'Test Team',
    ownerId: REQUESTER_ID,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeMembership(overrides: Partial<TeamMembership> = {}): TeamMembership {
  return {
    id: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm',
    teamId: TEAM_ID,
    userId: IDEA_OWNER_ID,
    invitedEmail: 'owner@example.com',
    role: 'member',
    status: 'active',
    inviteToken: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    invitedAt: '2026-01-01T00:00:00Z',
    acceptedAt: '2026-01-01T00:00:00Z',
    leftAt: null,
    removedBy: null,
    removalReason: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('isTeamMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindByMemberId.mockResolvedValue(ok(null));
    mockFindByOwnerId.mockResolvedValue(ok(null));
    mockFindMembershipsByTeamId.mockResolvedValue(ok([]));
  });

  it('returns false when requester has no team', async () => {
    const result = await isTeamMember(IDEA_OWNER_ID, REQUESTER_ID);
    expect(result).toBe(false);
  });

  it('returns true when requester owns the team and idea owner is team owner (self)', async () => {
    // requester is the team owner, idea owner is the requester
    const team = makeTeam({ ownerId: REQUESTER_ID });
    mockFindByOwnerId.mockResolvedValue(ok(team));
    const result = await isTeamMember(REQUESTER_ID, REQUESTER_ID);
    expect(result).toBe(true);
  });

  it('returns true when requester is team owner and idea owner is team member', async () => {
    const team = makeTeam({ ownerId: REQUESTER_ID });
    mockFindByOwnerId.mockResolvedValue(ok(team));
    const membership = makeMembership({ userId: IDEA_OWNER_ID, status: 'active' });
    mockFindMembershipsByTeamId.mockResolvedValue(ok([membership]));

    const result = await isTeamMember(IDEA_OWNER_ID, REQUESTER_ID);
    expect(result).toBe(true);
  });

  it('returns true when requester is member and idea owner is team owner', async () => {
    // requester found via findByMemberId, idea owner is the team owner
    const team = makeTeam({ ownerId: IDEA_OWNER_ID });
    mockFindByMemberId.mockResolvedValue(ok(team));
    mockFindMembershipsByTeamId.mockResolvedValue(ok([]));

    const result = await isTeamMember(IDEA_OWNER_ID, REQUESTER_ID);
    expect(result).toBe(true);
  });

  it('returns true when both are active members of the same team', async () => {
    const team = makeTeam({ ownerId: 'other-owner-id' });
    mockFindByMemberId.mockResolvedValue(ok(team));
    const membership = makeMembership({ userId: IDEA_OWNER_ID, status: 'active' });
    mockFindMembershipsByTeamId.mockResolvedValue(ok([membership]));

    const result = await isTeamMember(IDEA_OWNER_ID, REQUESTER_ID);
    expect(result).toBe(true);
  });

  it('returns false when idea owner is a removed member', async () => {
    const team = makeTeam({ ownerId: REQUESTER_ID });
    mockFindByOwnerId.mockResolvedValue(ok(team));
    const membership = makeMembership({ userId: IDEA_OWNER_ID, status: 'removed' });
    mockFindMembershipsByTeamId.mockResolvedValue(ok([membership]));

    const result = await isTeamMember(IDEA_OWNER_ID, REQUESTER_ID);
    expect(result).toBe(false);
  });

  it('returns false when idea owner is in a different team', async () => {
    const team = makeTeam({ id: OTHER_TEAM_ID, ownerId: REQUESTER_ID });
    mockFindByOwnerId.mockResolvedValue(ok(team));
    // No membership for IDEA_OWNER_ID in OTHER_TEAM_ID
    mockFindMembershipsByTeamId.mockResolvedValue(ok([]));

    const result = await isTeamMember(IDEA_OWNER_ID, REQUESTER_ID);
    expect(result).toBe(false);
  });

  it('returns false when findMembershipsByTeamId fails', async () => {
    const team = makeTeam({ ownerId: REQUESTER_ID });
    mockFindByOwnerId.mockResolvedValue(ok(team));
    mockFindMembershipsByTeamId.mockResolvedValue(err(new TeamRepositoryError('DB error')));

    const result = await isTeamMember(IDEA_OWNER_ID, REQUESTER_ID);
    expect(result).toBe(false);
  });

  it('prefers findByMemberId team over findByOwnerId when both return a team', async () => {
    const memberTeam = makeTeam({ id: TEAM_ID, ownerId: 'some-owner' });
    const ownerTeam = makeTeam({ id: OTHER_TEAM_ID, ownerId: REQUESTER_ID });
    mockFindByMemberId.mockResolvedValue(ok(memberTeam));
    mockFindByOwnerId.mockResolvedValue(ok(ownerTeam));
    const membership = makeMembership({ userId: IDEA_OWNER_ID, status: 'active' });
    // Only TEAM_ID has the idea owner
    mockFindMembershipsByTeamId.mockResolvedValue(ok([membership]));

    const result = await isTeamMember(IDEA_OWNER_ID, REQUESTER_ID);
    expect(result).toBe(true);
    expect(mockFindMembershipsByTeamId).toHaveBeenCalledWith(TEAM_ID);
  });
});
