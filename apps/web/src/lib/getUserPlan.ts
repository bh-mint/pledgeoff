import { effectivePlan, type Plan } from "@pledgeoff/core";
import { logger } from "@pledgeoff/observability";
import { container } from "./container";

export type { Plan } from "@pledgeoff/core";

export async function getUserPlan(userId: string): Promise<Plan> {
  const result = await container._repos.subscriptionRepo.findByUserId(userId);

  if (result.isErr()) {
    logger.error(
      { traceId: "getUserPlan", userId, error: String(result.error), outcome: "error" as const },
      "getUserPlan: subscriptionRepo failed"
    );
    throw new Error(`Plan resolution failed for user ${userId}`);
  }

  return result.value ? effectivePlan(result.value) : "free";
}
