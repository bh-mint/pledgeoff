import type { Result } from 'neverthrow';
import type { Team, TeamMembership, TeamRepositoryError } from '../domain/team';

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
}
