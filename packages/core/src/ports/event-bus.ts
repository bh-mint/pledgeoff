import { Result } from 'neverthrow';

export interface DomainEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly occurredAt: string;
  readonly traceId: string;
  readonly payload: TPayload;
}

export class EventBusError extends Error {
  readonly code = 'EVENT_BUS_ERROR' as const;
}

export interface IEventBus {
  publish<TPayload>(eventType: string, event: DomainEvent<TPayload>): Promise<Result<void, EventBusError>>;
  subscribe<TPayload>(
    eventType: string,
    handler: (event: DomainEvent<TPayload>) => Promise<void>,
  ): void;
}
