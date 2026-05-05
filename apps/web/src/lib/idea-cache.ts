import type { Decision } from '@pledgeoff/core';
import type { Signal } from '@pledgeoff/core';
import type { Idea } from '@pledgeoff/core';

// TTL: decisions are immutable once ready; pending state changes every ~9s
const READY_TTL_MS = 5 * 60 * 1_000; // 5 min
const PENDING_TTL_MS = 3_000;         // 3s — just under poll interval

type Entry = {
  idea: Idea;
  decision: Decision | null;
  signals: Signal[];
  expiresAt: number;
};

const store = new Map<string, Entry>();

export function getCachedIdea(userId: string, ideaId: string): Omit<Entry, 'expiresAt'> | undefined {
  const entry = store.get(`${userId}:${ideaId}`);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(`${userId}:${ideaId}`);
    return undefined;
  }
  return { idea: entry.idea, decision: entry.decision, signals: entry.signals };
}

export function setCachedIdea(
  userId: string,
  ideaId: string,
  idea: Idea,
  decision: Decision | null,
  signals: Signal[],
): void {
  const ttl = decision ? READY_TTL_MS : PENDING_TTL_MS;
  store.set(`${userId}:${ideaId}`, { idea, decision, signals, expiresAt: Date.now() + ttl });
}

export function invalidateCachedIdea(userId: string, ideaId: string): void {
  store.delete(`${userId}:${ideaId}`);
}
