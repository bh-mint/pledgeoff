import { effectivePlan } from "@pledgeoff/core";
import { logger } from "@pledgeoff/observability";
import { container } from "./container";

export type Plan = "free" | "pro" | "pro_plus";

export async function getUserPlan(userId: string): Promise<Plan> {
  const result = await container._repos.subscriptionRepo.findByUserId(userId);

  if (result.isErr()) {
    logger.error(
      { traceId: "getUserPlan", userId, error: String(result.error), outcome: "error" as const },
      "getUserPlan: subscriptionRepo failed — defaulting to free"
    );
    return "free";
  }

  return (result.value ? effectivePlan(result.value) : "free") as Plan;
}
