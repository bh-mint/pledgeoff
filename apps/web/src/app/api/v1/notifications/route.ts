import { resolveUserId } from '@/lib/api-auth';
import { container } from '@/lib/container';

// GET /api/v1/notifications — list recent notifications + unread count
export async function GET(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const [listResult, countResult] = await Promise.all([
    container.notificationRepo.findByUserId(userId, 20),
    container.notificationRepo.countUnread(userId),
  ]);

  if (listResult.isErr() || countResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json(
    { data: { notifications: listResult.value, unreadCount: countResult.value } },
    { headers: { 'X-Trace-Id': traceId } },
  );
}

// POST /api/v1/notifications/read-all — mark all as read
export async function POST(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.notificationRepo.markAllRead(userId, new Date().toISOString());
  if (result.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return new Response(null, { status: 204, headers: { 'X-Trace-Id': traceId } });
}
