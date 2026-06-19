import { describe, it, expect } from 'vitest';
import { ok } from 'neverthrow';
import { AddDomainAllowlistUseCase } from '../add-domain-allowlist';
import { RemoveDomainAllowlistUseCase } from '../remove-domain-allowlist';
import { AutoJoinByDomainUseCase } from '../auto-join-by-domain';
import type { ITeamRepository } from '../../ports/team-repository';
import type { ISubscriptionRepository } from '../../ports/subscription-repository';
import {
  DomainAllowlistAlreadyExistsError,
  DomainAllowlistInvalidError,
  DomainAllowlistNotFoundError,
  DomainAllowlistPlanError,
  type Team,
  type TeamDomainAllowlist,
} from '../../domain/team';
import type { Subscription } from '../../domain/subscription';

function makeTeam(): Team {
  return {
    id: 'team-1', name: 'Acme', ownerId: 'owner-1',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeEntry(domain = 'acme.com'): TeamDomainAllowlist {
  return { id: 'entry-1', teamId: 'team-1', domain, createdBy: 'owner-1', createdAt: '2026-01-01T00:00:00.000Z' };
}

function makeSub(plan: Subscription['plan'] = 'enterprise'): Subscription {
  return {
    id: 'sub-1', userId: 'owner-1', plan, status: 'active',
    stripeCustomerId: null, stripeSubscriptionId: null, currentPeriodEnd: null,
    extraSeats: 0, stripeExtraSeatItemId: null, pastDueSince: null,
    ottoIncludedUsed: 0, ottoIncludedResetAt: null, ottoPurchased: 0, verificationsPurchased: 0,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function mockTeamRepo(overrides?: Partial<ITeamRepository>): ITeamRepository {
  return {
    findById: async () => ok(makeTeam()),
    findByOwnerId: async () => ok(null),
    findByMemberId: async () => ok(null),
    saveTeam: async (t) => ok(t),
    updateTeam: async (t) => ok(t),
    saveMembership: async (m) => ok(m),
    updateMembership: async (m) => ok(m),
    updateMembershipRole: async (id, role, updatedAt) => ok({ id, role, updatedAt } as never),
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

function mockSubRepo(plan: Subscription['plan'] = 'enterprise'): ISubscriptionRepository {
  return {
    findByUserId: async () => ok(makeSub(plan)),
    findByStripeCustomerId: async () => ok(null),
    findByStripeSubscriptionId: async () => ok(null),
    findPastDueForRetry: async () => ok([]),
    upsert: async (i) => ok({ ...makeSub(), ...i } as never),
    updatePlan: async (i) => ok({ ...makeSub(), ...i } as never),
    updateExtraSeats: async (i) => ok({ ...makeSub(), ...i } as never),
    setPastDueSince: async () => ok(undefined),
    downgradeToFree: async () => ok(undefined),
    deductOttoQuestion: async () => ok(undefined),
    deductVerification: async () => ok(undefined),
    addOttoPurchasedQuestions: async () => ok(undefined),
    addVerificationsPurchased: async () => ok(undefined),
    resetOttoIncludedUsed: async () => ok(undefined),
    resetAllOttoIncludedUsed: async () => ok(undefined),
  };
}

const baseInput = { teamId: 'team-1', domain: 'acme.com', requesterId: 'owner-1', traceId: 't1' };

describe('AddDomainAllowlistUseCase', () => {
  it('adds a valid domain for an Enterprise team', async () => {
    const uc = new AddDomainAllowlistUseCase(mockTeamRepo(), mockSubRepo());
    const result = await uc.execute(baseInput);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.domain).toBe('acme.com');
  });

  it('normalizes domain (strips @ prefix, lowercases)', async () => {
    const uc = new AddDomainAllowlistUseCase(mockTeamRepo(), mockSubRepo());
    const result = await uc.execute({ ...baseInput, domain: '@ACME.COM' });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.domain).toBe('acme.com');
  });

  it('rejects an invalid domain', async () => {
    const uc = new AddDomainAllowlistUseCase(mockTeamRepo(), mockSubRepo());
    const result = await uc.execute({ ...baseInput, domain: 'not_a_domain' });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(DomainAllowlistInvalidError);
  });

  it('rejects a non-Enterprise team', async () => {
    const uc = new AddDomainAllowlistUseCase(mockTeamRepo(), mockSubRepo('team'));
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(DomainAllowlistPlanError);
  });

  it('rejects a duplicate domain', async () => {
    const repo = mockTeamRepo({ findDomainAllowlistsByTeamId: async () => ok([makeEntry()]) });
    const uc = new AddDomainAllowlistUseCase(repo, mockSubRepo());
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(DomainAllowlistAlreadyExistsError);
  });
});

describe('RemoveDomainAllowlistUseCase', () => {
  it('removes an existing domain', async () => {
    const repo = mockTeamRepo({ findDomainAllowlistsByTeamId: async () => ok([makeEntry()]) });
    const uc = new RemoveDomainAllowlistUseCase(repo, mockSubRepo());
    const result = await uc.execute(baseInput);
    expect(result.isOk()).toBe(true);
  });

  it('returns error if domain not in list', async () => {
    const uc = new RemoveDomainAllowlistUseCase(mockTeamRepo(), mockSubRepo());
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(DomainAllowlistNotFoundError);
  });

  it('rejects a non-Enterprise team', async () => {
    const repo = mockTeamRepo({ findDomainAllowlistsByTeamId: async () => ok([makeEntry()]) });
    const uc = new RemoveDomainAllowlistUseCase(repo, mockSubRepo('team'));
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(DomainAllowlistPlanError);
  });
});

describe('AutoJoinByDomainUseCase', () => {
  const joinInput = { userId: 'user-new', email: 'alice@acme.com', traceId: 't1' };

  it('auto-joins when domain matches a team', async () => {
    const repo = mockTeamRepo({ findTeamByEmailDomain: async () => ok(makeTeam()) });
    const uc = new AutoJoinByDomainUseCase(repo);
    const result = await uc.execute(joinInput);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.joined).toBe(true);
      if (result.value.joined) expect(result.value.teamId).toBe('team-1');
    }
  });

  it('skips if no team matches the domain', async () => {
    const uc = new AutoJoinByDomainUseCase(mockTeamRepo());
    const result = await uc.execute(joinInput);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.joined).toBe(false);
  });

  it('skips if user is already a team member', async () => {
    const repo = mockTeamRepo({
      findByMemberId: async () => ok(makeTeam()),
      findTeamByEmailDomain: async () => ok(makeTeam()),
    });
    const uc = new AutoJoinByDomainUseCase(repo);
    const result = await uc.execute(joinInput);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.joined).toBe(false);
  });

  it('skips if user owns a team', async () => {
    const repo = mockTeamRepo({
      findByOwnerId: async () => ok(makeTeam()),
      findTeamByEmailDomain: async () => ok(makeTeam()),
    });
    const uc = new AutoJoinByDomainUseCase(repo);
    const result = await uc.execute(joinInput);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.joined).toBe(false);
  });
});
