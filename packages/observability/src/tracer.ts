import { trace, type Tracer } from '@opentelemetry/api';

export function getTracer(name: string): Tracer {
  return trace.getTracer(name, '0.1.0');
}
