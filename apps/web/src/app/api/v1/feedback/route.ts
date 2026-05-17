import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { container } from "@/lib/container";
import { logger } from "@pledgeoff/observability";
import { resolveUserId } from '@/lib/api-auth';

const FeedbackSchema = z.object({
  ideaId: z.string().uuid(),
  decisionId: z.string().uuid(),
  vote: z.enum(["thumbs_up", "thumbs_down"]),
  comment: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED" } },
      { status: 401, headers: { "X-Trace-Id": traceId } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON" } },
      { status: 400, headers: { "X-Trace-Id": traceId } }
    );
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", details: parsed.error.flatten() } },
      { status: 400, headers: { "X-Trace-Id": traceId } }
    );
  }

  const result = await container.recordFeedbackUseCase.execute({
    ideaId: parsed.data.ideaId,
    decisionId: parsed.data.decisionId,
    userId,
    vote: parsed.data.vote,
    comment: parsed.data.comment,
    traceId,
  });

  if (result.isErr()) {
    return NextResponse.json(
      { error: { code: "INTERNAL" } },
      { status: 500, headers: { "X-Trace-Id": traceId } }
    );
  }

  logger.info(
    { traceId, userId, action: 'submit_feedback', resourceId: parsed.data.ideaId, vote: parsed.data.vote, hasComment: !!parsed.data.comment, outcome: 'success' },
    'Feedback recorded',
  );

  void container.auditLog.log({
    userId,
    action: 'feedback_recorded',
    resourceType: 'decision',
    resourceId: parsed.data.decisionId,
    metadata: { vote: parsed.data.vote, ideaId: parsed.data.ideaId },
    traceId,
  });

  return NextResponse.json(
    { data: result.value },
    { status: 201, headers: { "X-Trace-Id": traceId } }
  );
}
