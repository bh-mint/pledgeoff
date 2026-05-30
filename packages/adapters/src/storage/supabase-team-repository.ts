import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  TeamRepositoryError,
  type Team,
  type TeamInviteLink,
  type TeamMembership,
  type TeamRole,
  type TeamMembershipStatus,
} from '@pledgeoff/core';
import type { ITeamRepository } from '@pledgeoff/core';

type TeamRow = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

type InviteLinkRow = {
  id: string;
  team_id: string;
  token: string;
  expires_at: string;
  revoked_at: string | null;
  created_by: string;
  created_at: string;
};

function rowToInviteLink(row: InviteLinkRow): TeamInviteLink {
  return {
    id: row.id,
    teamId: row.team_id,
    token: row.token,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

type MembershipRow = {
  id: string;
  team_id: string;
  user_id: string | null;
  invited_email: string;
  role: string;
  status: string;
  invite_token: string;
  invited_at: string;
  accepted_at: string | null;
  left_at: string | null;
  removed_by: string | null;
  removal_reason: string | null;
  created_at: string;
  updated_at: string;
};

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMembership(row: MembershipRow): TeamMembership {
  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    invitedEmail: row.invited_email,
    role: row.role as TeamRole,
    status: row.status as TeamMembershipStatus,
    inviteToken: row.invite_token,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    leftAt: row.left_at,
    removedBy: row.removed_by,
    removalReason: row.removal_reason as TeamMembership['removalReason'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseTeamRepository implements ITeamRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(teamId: string): Promise<Result<Team | null, TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('teams')
      .select()
      .eq('id', teamId)
      .maybeSingle<TeamRow>();
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(data ? rowToTeam(data) : null);
  }

  async findByOwnerId(ownerId: string): Promise<Result<Team | null, TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('teams')
      .select()
      .eq('owner_id', ownerId)
      .maybeSingle<TeamRow>();
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(data ? rowToTeam(data) : null);
  }

  async findByMemberId(userId: string): Promise<Result<Team | null, TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('team_memberships')
      .select('team_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle<{ team_id: string }>();
    if (error) return err(new TeamRepositoryError(error.message));
    if (!data) return ok(null);
    return this.findById(data.team_id);
  }

  async updateTeam(team: Team): Promise<Result<Team, TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('teams')
      .update({ name: team.name, updated_at: team.updatedAt })
      .eq('id', team.id)
      .select()
      .single<TeamRow>();
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(rowToTeam(data));
  }

  async saveTeam(team: Team): Promise<Result<Team, TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('teams')
      .insert({
        id: team.id,
        name: team.name,
        owner_id: team.ownerId,
        created_at: team.createdAt,
        updated_at: team.updatedAt,
      })
      .select()
      .single<TeamRow>();
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(rowToTeam(data));
  }

  async saveMembership(membership: TeamMembership): Promise<Result<TeamMembership, TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('team_memberships')
      .insert({
        id: membership.id,
        team_id: membership.teamId,
        user_id: membership.userId,
        invited_email: membership.invitedEmail,
        role: membership.role,
        status: membership.status,
        invite_token: membership.inviteToken,
        invited_at: membership.invitedAt,
        created_at: membership.createdAt,
        updated_at: membership.updatedAt,
      })
      .select()
      .single<MembershipRow>();
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(rowToMembership(data));
  }

  async updateMembership(membership: TeamMembership): Promise<Result<TeamMembership, TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('team_memberships')
      .update({
        user_id: membership.userId,
        status: membership.status,
        accepted_at: membership.acceptedAt,
        left_at: membership.leftAt,
        removed_by: membership.removedBy,
        removal_reason: membership.removalReason,
        updated_at: membership.updatedAt,
      })
      .eq('id', membership.id)
      .select()
      .single<MembershipRow>();
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(rowToMembership(data));
  }

  async findMembershipByToken(token: string): Promise<Result<TeamMembership | null, TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('team_memberships')
      .select()
      .eq('invite_token', token)
      .maybeSingle<MembershipRow>();
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(data ? rowToMembership(data) : null);
  }

  async findMembershipsByTeamId(teamId: string): Promise<Result<TeamMembership[], TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('team_memberships')
      .select()
      .eq('team_id', teamId)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: true });
    if (error) return err(new TeamRepositoryError(error.message));
    return ok((data as MembershipRow[]).map(rowToMembership));
  }

  async deleteMembership(membershipId: string): Promise<Result<void, TeamRepositoryError>> {
    const { error } = await this.client
      .from('team_memberships')
      .delete()
      .eq('id', membershipId);
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(undefined);
  }

  async countActiveMembers(teamId: string): Promise<Result<number, TeamRepositoryError>> {
    const { count, error } = await this.client
      .from('team_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'active');
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(count ?? 0);
  }

  async findInviteLinkByToken(token: string): Promise<Result<TeamInviteLink | null, TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('team_invite_links')
      .select()
      .eq('token', token)
      .maybeSingle<InviteLinkRow>();
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(data ? rowToInviteLink(data) : null);
  }

  async findInviteLinkByTeamId(teamId: string): Promise<Result<TeamInviteLink | null, TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('team_invite_links')
      .select()
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<InviteLinkRow>();
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(data ? rowToInviteLink(data) : null);
  }

  async saveInviteLink(link: TeamInviteLink): Promise<Result<TeamInviteLink, TeamRepositoryError>> {
    const { data, error } = await this.client
      .from('team_invite_links')
      .insert({
        id: link.id,
        team_id: link.teamId,
        token: link.token,
        expires_at: link.expiresAt,
        revoked_at: link.revokedAt,
        created_by: link.createdBy,
        created_at: link.createdAt,
      })
      .select()
      .single<InviteLinkRow>();
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(rowToInviteLink(data));
  }

  async revokeInviteLink(linkId: string, revokedAt: string): Promise<Result<void, TeamRepositoryError>> {
    const { error } = await this.client
      .from('team_invite_links')
      .update({ revoked_at: revokedAt })
      .eq('id', linkId);
    if (error) return err(new TeamRepositoryError(error.message));
    return ok(undefined);
  }
}
