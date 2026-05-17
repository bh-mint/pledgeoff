import { z } from 'zod';
import { container } from '@/lib/container';
import { resolveUserId } from '@/lib/api-auth';
import { logger } from '@pledgeoff/observability';

const ReactionBodySchema = z.object({
  reaction: z.enum(['agree', 'disagree']).nullable(),
});

function unauthorizedResponse(traceId: string) {
  return Response.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id: ideaId } = await params;

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauthorizedResponse(traceId);

  // Validate that the idea exists and that the reacting user shares a team with the idea owner
  const ideaResult = await container._repos.ideaRepo.findById(ideaId);
  if (ideaResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
  const idea = ideaResult.value;
  if (!idea) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  // Check that reacting user is in a team
  const userTeamResult = await container._repos.teamRepo.findByMemberId(userId);
  if (userTeamResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
  const userTeam = userTeamResult.value;
  if (!userTeam) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'You must be in a team to react' } },
      { status: 403, headers: { 'X-Trace-Id': traceId } },
    );
  }

  // Check that the idea author is in the same team
  const authorTeamResult = await container._repos.teamRepo.findByMemberId(idea.userId);
  const authorIsInTeam =
    (authorTeamResult.isOk() && authorTeamResult.value?.id === userTeam.id) ||
    idea.userId === userTeam.ownerId ||
    userId === userTeam.ownerId;

  if (!authorIsInTeam) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ReactionBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.reactToIdeaUseCase.execute({
    userId,
    ideaId,
    reaction: parsed.data.reaction,
  });

  if (result.isErr()) {
    logger.error({ traceId, userId, ideaId, error: String(result.error), outcome: 'error' as const }, 'reactions PUT: use case failed');
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  // Return updated counts
  const reactionsResult = await container._repos.ideaReactionRepo.findByIdeaIds([ideaId]);
  const reactions = reactionsResult.isOk() ? reactionsResult.value : [];
  const agree = reactions.filter((r) => r.reaction === 'agree').length;
  const disagree = reactions.filter((r) => r.reaction === 'disagree').length;
  const myReaction = reactions.find((r) => r.userId === userId)?.reaction ?? null;

  return Response.json(
    { data: { agree, disagree, myReaction } },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { id: ideaId } = await params;

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauthorizedResponse(traceId);

  const reactionsResult = await container._repos.ideaReactionRepo.findByIdeaIds([ideaId]);
  if (reactionsResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  const reactions = reactionsResult.value;
  const agree = reactions.filter((r) => r.reaction === 'agree').length;
  const disagree = reactions.filter((r) => r.reaction === 'disagree').length;
  const myReaction = reactions.find((r) => r.userId === userId)?.reaction ?? null;

  return Response.json({ data: { agree, disagree, myReaction } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
