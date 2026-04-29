import { Result, ok } from 'neverthrow';
import type { DomainEvent, EventBusError, IEventBus } from '@pledgeoff/core';

type Handler<TPayload> = (event: DomainEvent<TPayload>) => Promise<void>;

export class InMemoryEventBus implements IEventBus {
  private readonly handlers = new Map<string, Handler<unknown>[]>();

  publish<TPayload>(
    eventType: string,
    event: DomainEvent<TPayload>,
  ): Promise<Result<void, EventBusError>> {
    const subscribers = this.handlers.get(eventType) ?? [];
    const calls = subscribers.map((h) => h(event as DomainEvent<unknown>));
    // Fire-and-forget for in-process delivery; errors are swallowed here
    // (P3 Postgres bus adds durability and retry)
    Promise.allSettled(calls).catch(() => undefined);
    return Promise.resolve(ok(undefined));
  }

  subscribe<TPayload>(
    eventType: string,
    handler: (event: DomainEvent<TPayload>) => Promise<void>,
  ): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler as Handler<unknown>]);
  }
}
