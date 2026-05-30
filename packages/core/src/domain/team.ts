import { z } from 'zod';

export const TeamRoleSchema = z.enum(['owner', 'member']);
export type TeamRole = z.infer<typeof TeamRoleSchema>;

export const TeamMembershipStatusSchema = z.enum(['pending', 'active', 'removed', 'left']);
export type TeamMembershipStatus = z.infer<typeof TeamMembershipStatusSchema>;

export const RemovalReasonSchema = z.enum(['left', 'removed_by_owner']);
export type RemovalReason = z.infer<typeof RemovalReasonSchema>;

export const TeamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type Team = z.infer<typeof TeamSchema>;

export const TeamMembershipSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  invitedEmail: z.string().email(),
  role: TeamRoleSchema,
  status: TeamMembershipStatusSchema,
  inviteToken: z.string().uuid(),
  invitedAt: z.string().datetime({ offset: true }),
  acceptedAt: z.string().datetime({ offset: true }).nullable(),
  leftAt: z.string().datetime({ offset: true }).nullable(),
  removedBy: z.string().uuid().nullable(),
  removalReason: RemovalReasonSchema.nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type TeamMembership = z.infer<typeof TeamMembershipSchema>;

export class TeamSeatLimitError extends Error {
  readonly code = 'TEAM_SEAT_LIMIT_REACHED';
  constructor(public readonly limit: number) {
    super(`Team seat limit reached (${limit})`);
  }
}

export class TeamMemberAlreadyExistsError extends Error {
  readonly code = 'TEAM_MEMBER_ALREADY_EXISTS';
  constructor(public readonly email: string) {
    super(`${email} is already a team member or has a pending invite`);
  }
}

export class TeamInviteNotFoundError extends Error {
  readonly code = 'TEAM_INVITE_NOT_FOUND';
}

export class TeamNotFoundError extends Error {
  readonly code = 'TEAM_NOT_FOUND';
}

export class TeamForbiddenError extends Error {
  readonly code = 'TEAM_FORBIDDEN';
}

export class UserAlreadyInTeamError extends Error {
  readonly code = 'USER_ALREADY_IN_TEAM';
  constructor() {
    super('User is already a member of another team');
  }
}

export class LeaveTeamNotMemberError extends Error {
  readonly code = 'LEAVE_TEAM_NOT_MEMBER';
  constructor() {
    super('User is not an active member of any team');
  }
}

export class TeamRepositoryError extends Error {
  readonly code = 'TEAM_REPOSITORY_ERROR';
}

export const TeamInviteLinkSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.string().datetime({ offset: true }),
  revokedAt: z.string().datetime({ offset: true }).nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
});
export type TeamInviteLink = z.infer<typeof TeamInviteLinkSchema>;

export class TeamInviteLinkNotFoundError extends Error {
  readonly code = 'TEAM_INVITE_LINK_NOT_FOUND';
}
export class TeamInviteLinkExpiredError extends Error {
  readonly code = 'TEAM_INVITE_LINK_EXPIRED';
}
export class TeamInviteLinkRevokedError extends Error {
  readonly code = 'TEAM_INVITE_LINK_REVOKED';
}

export function createInviteLink(input: { teamId: string; createdBy: string }): TeamInviteLink {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    id: crypto.randomUUID(),
    teamId: input.teamId,
    token: crypto.randomUUID(),
    expiresAt: expiresAt.toISOString(),
    revokedAt: null,
    createdBy: input.createdBy,
    createdAt: now.toISOString(),
  };
}

export function createTeam(input: { ownerId: string; name: string }): Team {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    ownerId: input.ownerId,
    createdAt: now,
    updatedAt: now,
  };
}

export function createPendingMembership(input: {
  teamId: string;
  invitedEmail: string;
}): TeamMembership {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    teamId: input.teamId,
    userId: null,
    invitedEmail: input.invitedEmail.toLowerCase().trim(),
    role: 'member',
    status: 'pending',
    inviteToken: crypto.randomUUID(),
    invitedAt: now,
    acceptedAt: null,
    leftAt: null,
    removedBy: null,
    removalReason: null,
    createdAt: now,
    updatedAt: now,
  };
}
