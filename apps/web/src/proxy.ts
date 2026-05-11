import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest): NextResponse {
  const traceId = request.headers.get('x-trace-id') ?? crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set('x-trace-id', traceId);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
