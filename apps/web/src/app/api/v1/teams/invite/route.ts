import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { container } from '@/lib/container';
import { sendTeamInviteEmail } from '@pledgeoff/adapters';
import {
  TeamSeatLimitError,
  TeamMemberAlreadyExistsError,
  effectivePlan,
} from '@pledgeoff/core';

const InviteSchema = z.object({
  email: z.string().email(),
});

async function resolveUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await anonClient.auth.getUser(authHeader.slice(7));
  return data.user?.id ?? null;
}

// POST /api/v1/teams/invite
export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: { code: 'INVALID_JSON' } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  // Get owner's plan
  const subResult = await container.subscriptionRepo.findByUserId(userId);
  const sub = subResult.isOk() ? subResult.value : null;
  const ownerPlan = sub ? effectivePlan(sub) : 'free';

  // Get inviter email for the invite email
  const { data: userData } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ).auth.admin.getUserById(userId);
  const inviterEmail = userData?.user?.email ?? 'Your teammate';

  const result = await container.inviteTeamMemberUseCase.execute({
    ownerId: userId,
    ownerPlan,
    invitedEmail: parsed.data.email,
    traceId,
  });

  if (result.isErr()) {
    const error = result.error;
    if (error instanceof TeamSeatLimitError) {
      return Response.json({ error: { code: 'SEAT_LIMIT_REACHED', message: error.message } }, { status: 403, headers: { 'X-Trace-Id': traceId } });
    }
    if (error instanceof TeamMemberAlreadyExistsError) {
      return Response.json({ error: { code: 'ALREADY_MEMBER', message: error.message } }, { status: 409, headers: { 'X-Trace-Id': traceId } });
    }
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  const membership = result.value;

  // Send invite email (fire-and-forget — don't fail the request if email fails)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const teamResult = await container.teamRepo.findByOwnerId(userId);
    const teamName = teamResult.isOk() && teamResult.value ? teamResult.value.name : 'My Team';
    sendTeamInviteEmail(resendKey, {
      to: parsed.data.email,
      inviterEmail,
      teamName,
      inviteToken: membership.inviteToken,
      traceId,
    }).catch(() => undefined);
  }

  return Response.json({ data: { membership } }, { status: 201, headers: { 'X-Trace-Id': traceId } });
}
