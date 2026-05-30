import { z } from 'zod';
import { container } from '@/lib/container';
import { resolveUserId } from '@/lib/api-auth';
import {
  DomainAllowlistAlreadyExistsError,
  DomainAllowlistInvalidError,
  DomainAllowlistPlanError,
} from '@pledgeoff/core';

const AddDomainSchema = z.object({ domain: z.string().min(4).max(253) });

function unauth(traceId: string) {
  return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
}

// GET /api/v1/teams/domain-allowlist
export async function GET(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauth(traceId);

  const teamResult = await container.teamRepo.findByOwnerId(userId);
  if (teamResult.isErr()) return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  const team = teamResult.value;
  if (!team) return Response.json({ error: { code: 'NO_TEAM' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });

  const listResult = await container.teamRepo.findDomainAllowlistsByTeamId(team.id);
  if (listResult.isErr()) return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });

  return Response.json({ data: listResult.value }, { headers: { 'X-Trace-Id': traceId } });
}

// POST /api/v1/teams/domain-allowlist
export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauth(traceId);

  const body = await req.json() as unknown;
  const parsed = AddDomainSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const teamResult = await container.teamRepo.findByOwnerId(userId);
  if (teamResult.isErr()) return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  const team = teamResult.value;
  if (!team) return Response.json({ error: { code: 'NO_TEAM' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });

  const result = await container.addDomainAllowlistUseCase.execute({
    teamId: team.id,
    domain: parsed.data.domain,
    requesterId: userId,
    traceId,
  });

  if (result.isErr()) {
    const e = result.error;
    if (e instanceof DomainAllowlistPlanError) return Response.json({ error: { code: 'PLAN_REQUIRED', message: e.message } }, { status: 403, headers: { 'X-Trace-Id': traceId } });
    if (e instanceof DomainAllowlistAlreadyExistsError) return Response.json({ error: { code: 'ALREADY_EXISTS', message: e.message } }, { status: 409, headers: { 'X-Trace-Id': traceId } });
    if (e instanceof DomainAllowlistInvalidError) return Response.json({ error: { code: 'INVALID_DOMAIN', message: e.message } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: result.value }, { status: 201, headers: { 'X-Trace-Id': traceId } });
}
