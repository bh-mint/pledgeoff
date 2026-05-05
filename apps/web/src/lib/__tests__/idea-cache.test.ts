import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedIdea, setCachedIdea, invalidateCachedIdea } from '../idea-cache';
import type { Idea, Decision, Signal } from '@pledgeoff/core';

const idea: Idea = { id: 'i1', text: 'test idea', userId: 'u1', createdAt: '2026-01-01T00:00:00Z', status: 'pending' };
const decision: Decision = { id: 'd1', ideaId: 'i1', verdict: 'GO', confidence: 0.8, reasoning: 'good', signalIds: [], createdAt: '2026-01-01T00:00:10Z' };
const signals: Signal[] = [];

describe('idea-cache', () => {
  beforeEach(() => {
    invalidateCachedIdea('u1', 'i1');
    vi.useRealTimers();
  });

  it('returns undefined on miss', () => {
    expect(getCachedIdea('u1', 'i1')).toBeUndefined();
  });

  it('returns cached entry on hit', () => {
    setCachedIdea('u1', 'i1', idea, decision, signals);
    const hit = getCachedIdea('u1', 'i1');
    expect(hit?.decision?.verdict).toBe('GO');
  });

  it('isolates by userId — different user gets miss', () => {
    setCachedIdea('u1', 'i1', idea, decision, signals);
    expect(getCachedIdea('u2', 'i1')).toBeUndefined();
  });

  it('expires pending entries after 3s', () => {
    vi.useFakeTimers();
    setCachedIdea('u1', 'i1', idea, null, signals);
    vi.advanceTimersByTime(3001);
    expect(getCachedIdea('u1', 'i1')).toBeUndefined();
  });

  it('keeps ready entries alive after 3s', () => {
    vi.useFakeTimers();
    setCachedIdea('u1', 'i1', idea, decision, signals);
    vi.advanceTimersByTime(3001);
    expect(getCachedIdea('u1', 'i1')).toBeDefined();
  });

  it('invalidate removes entry', () => {
    setCachedIdea('u1', 'i1', idea, decision, signals);
    invalidateCachedIdea('u1', 'i1');
    expect(getCachedIdea('u1', 'i1')).toBeUndefined();
  });
});
