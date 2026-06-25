import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';

function normalizeEndpoint(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const ideaIdx = segments.indexOf('ideas');
  if (ideaIdx === -1) return segments[segments.length - 1] ?? pathname;

  const afterIdeas = segments.slice(ideaIdx + 1);
  if (afterIdeas.length === 0) return 'ideas';
  if (afterIdeas.length === 1) {
    const seg = afterIdeas[0] ?? '';
    return /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(seg) ? 'idea' : seg;
  }
  return afterIdeas[afterIdeas.length - 1] ?? 'idea';
}

async function hashIp(ip: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const salt = `${today}:${process.env.CRON_SECRET ?? 'pledgeoff-salt'}`;
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(`${ip}:${salt}`));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashApiKey(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(plaintext));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function withApiKeyLogging<C extends unknown[]>(
  handler: (req: Request, ...ctx: C) => Promise<Response>,
): (req: Request, ...ctx: C) => Promise<Response> {
  return async (req: Request, ...ctx: C): Promise<Response> => {
    const start = Date.now();
    const apiKeyHeader = req.headers.get('x-api-key');

    if (!apiKeyHeader?.startsWith('po_live_')) {
      return handler(req, ...ctx);
    }

    const keyHash = await hashApiKey(apiKeyHeader);
    const keyResult = await container.apiKeyRepo.findByHash(keyHash);
    const apiKey = keyResult.isOk() ? keyResult.value : null;

    const response = await handler(req, ...ctx);

    if (apiKey) {
      const traceId = response.headers.get('X-Trace-Id') ?? crypto.randomUUID();
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      const ipHash = await hashIp(ip);
      const endpoint = normalizeEndpoint(new URL(req.url).pathname);
      const latencyMs = Date.now() - start;

      void container.apiRequestLog.log({
        apiKeyId: apiKey.id,
        userId: apiKey.userId,
        endpoint,
        method: req.method,
        statusCode: response.status,
        latencyMs,
        ipHash,
        traceId,
      });

      if (response.status >= 500) {
        logger.error(
          { traceId, userId: apiKey.userId, endpoint, statusCode: response.status, latencyMs },
          'api-key-request-5xx',
        );
      }
    }

    return response;
  };
}
