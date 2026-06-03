import { hasPlanToolAccess, requiredPlanForTool, type ToolKey } from '@pledgeoff/core';
import { getUserPlan } from './getUserPlan';

export type PlanToolGateResult =
  | { allowed: true }
  | { allowed: false; requiredPlan: string };

export async function checkPlanToolGate(userId: string, tool: ToolKey): Promise<PlanToolGateResult> {
  const plan = await getUserPlan(userId);
  if (hasPlanToolAccess(plan, tool)) return { allowed: true };
  return { allowed: false, requiredPlan: requiredPlanForTool(tool) };
}
