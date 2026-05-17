import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { UpdateTeamNameUseCase } from '../update-team-name';
import type { ITeamRepository } from '../../ports/team-repository';
import {
  TeamRepositoryError,
  type Team,
} from '../../domain/team';

function makeTeam(override?: Partial<Team>): Team {
  return {
    id: 'team-1', name: 'My Team', ownerId: 'owner-1',
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
    findMembershipByToken: async () => ok(null),
    findMembershipsByTeamId: async () => ok([]),
    deleteMembership: async () => ok(undefined),
    countActiveMembers: async () => ok(0),
    ...overrides,
  };
}

describe('UpdateTeamNameUseCase', () => {
  const baseInput = { ownerId: 'owner-1', name: 'New Name', traceId: 'trace-1' };

  it('updates team name and returns updated team', async () => {
    const team = makeTeam();
    const captured = { t: null as Team | null };
    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      updateTeam: async (t) => { captured.t = t; return ok(t); },
    });

    const useCase = new UpdateTeamNameUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(captured.t?.name).toBe('New Name');
    expect(captured.t?.id).toBe('team-1');
    expect(captured.t?.updatedAt).not.toBe(team.updatedAt);
  });

  it('trims whitespace from the name', async () => {
    const team = makeTeam();
    const captured = { t: null as Team | null };
    const repo = mockRepo({
      findByOwnerId: async () => ok(team),
      updateTeam: async (t) => { captured.t = t; return ok(t); },
    });

    const useCase = new UpdateTeamNameUseCase(repo);
    await useCase.execute({ ...baseInput, name: '  Trimmed  ' });

    expect(captured.t?.name).toBe('Trimmed');
  });

  it('rejects empty name', async () => {
    const repo = mockRepo({ findByOwnerId: async () => ok(makeTeam()) });
    const useCase = new UpdateTeamNameUseCase(repo);
    const result = await useCase.execute({ ...baseInput, name: '   ' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamRepositoryError);
  });

  it('rejects name longer than 100 characters', async () => {
    const repo = mockRepo({ findByOwnerId: async () => ok(makeTeam()) });
    const useCase = new UpdateTeamNameUseCase(repo);
    const result = await useCase.execute({ ...baseInput, name: 'a'.repeat(101) });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamRepositoryError);
  });

  it('creates team with given name when owner has no team yet', async () => {
    const captured = { t: null as Team | null };
    const repo = mockRepo({
      findByOwnerId: async () => ok(null),
      saveTeam: async (t) => { captured.t = t; return ok(t); },
    });

    const useCase = new UpdateTeamNameUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(captured.t?.name).toBe('New Name');
    expect(captured.t?.ownerId).toBe('owner-1');
  });

  it('propagates repository error from findByOwnerId', async () => {
    const repoError = new TeamRepositoryError('DB error');
    const repo = mockRepo({ findByOwnerId: async () => err(repoError) });
    const useCase = new UpdateTeamNameUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamRepositoryError);
  });

  it('propagates repository error from updateTeam', async () => {
    const repoError = new TeamRepositoryError('DB write error');
    const repo = mockRepo({
      findByOwnerId: async () => ok(makeTeam()),
      updateTeam: async () => err(repoError),
    });
    const useCase = new UpdateTeamNameUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamRepositoryError);
  });
});
