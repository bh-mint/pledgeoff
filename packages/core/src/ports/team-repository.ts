import type { Result } from 'neverthrow';
import type { Team, TeamInviteLink, TeamMembership, TeamRepositoryError } from '../domain/team';

export interface ITeamRepository {
  findById(teamId: string): Promise<Result<Team | null, TeamRepositoryError>>;
  findByOwnerId(ownerId: string): Promise<Result<Team | null, TeamRepositoryError>>;
  findByMemberId(userId: string): Promise<Result<Team | null, TeamRepositoryError>>;
  saveTeam(team: Team): Promise<Result<Team, TeamRepositoryError>>;
  saveMembership(membership: TeamMembership): Promise<Result<TeamMembership, TeamRepositoryError>>;
  updateMembership(membership: TeamMembership): Promise<Result<TeamMembership, TeamRepositoryError>>;
  findMembershipByToken(token: string): Promise<Result<TeamMembership | null, TeamRepositoryError>>;
  findMembershipsByTeamId(teamId: string): Promise<Result<TeamMembership[], TeamRepositoryError>>;
  updateTeam(team: Team): Promise<Result<Team, TeamRepositoryError>>;
  deleteMembership(membershipId: string): Promise<Result<void, TeamRepositoryError>>;
  countActiveMembers(teamId: string): Promise<Result<number, TeamRepositoryError>>;
  // Invite links
  findInviteLinkByToken(token: string): Promise<Result<TeamInviteLink | null, TeamRepositoryError>>;
  findInviteLinkByTeamId(teamId: string): Promise<Result<TeamInviteLink | null, TeamRepositoryError>>;
  saveInviteLink(link: TeamInviteLink): Promise<Result<TeamInviteLink, TeamRepositoryError>>;
  revokeInviteLink(linkId: string, revokedAt: string): Promise<Result<void, TeamRepositoryError>>;
}
