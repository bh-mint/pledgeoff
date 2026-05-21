import { Result, ok, err } from 'neverthrow';
import type { ISubscriptionRepository } from '../ports/subscription-repository';
import { SubscriptionRepositoryError } from '../ports/subscription-repository';
import { effectivePlan, type Subscription } from '../domain/subscription';

export class TeamSeatsPlanError extends Error {
  readonly code = 'TEAM_SEATS_PLAN_ERROR';
  constructor() { super('Seat add-ons require an active Team subscription'); }
}

export class TeamSeatsQuantityError extends Error {
  readonly code = 'TEAM_SEATS_QUANTITY_ERROR';
  constructor() { super('Extra seats must be between 0 and 97 (max 100 total)'); }
}

export type UpdateTeamSeatsInput = {
  userId: string;
  /** Desired number of extra seats (0 = remove add-on) */
  extraSeats: number;
  traceId: string;
};

export type UpdateTeamSeatsError =
  | TeamSeatsPlanError
  | TeamSeatsQuantityError
  | SubscriptionRepositoryError;

export type UpdateTeamSeatsContext = {
  subscription: Subscription;
  /** Caller must execute the Stripe API call and then call commitSeats() */
  commitSeats(stripeItemId: string | null): Promise<Result<Subscription, SubscriptionRepositoryError>>;
};

/**
 * Validates business rules for seat changes and provides a commit callback.
 * The Stripe call itself happens in the API route (adapter concern).
 */
export class UpdateTeamSeatsUseCase {
  constructor(private readonly subscriptionRepo: ISubscriptionRepository) {}

  async execute(
    input: UpdateTeamSeatsInput,
  ): Promise<Result<UpdateTeamSeatsContext, UpdateTeamSeatsError>> {
    if (input.extraSeats < 0 || input.extraSeats > 97) {
      return err(new TeamSeatsQuantityError());
    }

    const subResult = await this.subscriptionRepo.findByUserId(input.userId);
    if (subResult.isErr()) return err(subResult.error);

    const sub = subResult.value;
    if (!sub || effectivePlan(sub) !== 'team') {
      return err(new TeamSeatsPlanError());
    }

    const commitSeats = async (stripeItemId: string | null) =>
      this.subscriptionRepo.updateExtraSeats({
        userId: input.userId,
        extraSeats: input.extraSeats,
        stripeExtraSeatItemId: stripeItemId,
      });

    return ok({ subscription: sub, commitSeats });
  }
}
