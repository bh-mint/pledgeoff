import { z } from 'zod';

export const TeamRoleSchema = z.enum(['owner', 'member']);
export type TeamRole = z.infer<typeof TeamRoleSchema>;

export const TeamMembershipStatusSchema = z.enum(['pending', 'active']);
export type TeamMembershipStatus = z.infer<typeof TeamMembershipStatusSchema>;

export const TeamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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

export class TeamRepositoryError extends Error {
  readonly code = 'TEAM_REPOSITORY_ERROR';
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
    createdAt: now,
    updatedAt: now,
  };
}
