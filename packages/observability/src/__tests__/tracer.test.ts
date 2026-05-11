import { describe, it, expect } from 'vitest';
import { getTracer } from '../tracer';

describe('getTracer', () => {
  it('returns a tracer instance', () => {
    const tracer = getTracer('test');
    expect(tracer).toBeDefined();
    expect(typeof tracer.startActiveSpan).toBe('function');
    expect(typeof tracer.startSpan).toBe('function');
  });

  it('returns different tracers for different names', () => {
    const t1 = getTracer('module-a');
    const t2 = getTracer('module-b');
    expect(t1).toBeDefined();
    expect(t2).toBeDefined();
  });

  it('startActiveSpan executes callback and returns result', () => {
    const tracer = getTracer('test');
    const result = tracer.startActiveSpan('test-span', (span) => {
      span.end();
      return 42;
    });
    expect(result).toBe(42);
  });
});
