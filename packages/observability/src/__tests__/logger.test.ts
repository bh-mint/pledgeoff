import { describe, it, expect } from 'vitest';
import { createLogger } from '../logger';

describe('createLogger', () => {
  it('returns an object with info, warn, error, debug methods', () => {
    const log = createLogger({ service: 'test' });
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.debug).toBe('function');
  });

  it('does not throw when logging with full LogContext', () => {
    const log = createLogger();
    expect(() =>
      log.info(
        { traceId: 'abc-123', target: 'reddit', operation: 'fetch', latencyMs: 42, outcome: 'success' },
        'signals fetched',
      ),
    ).not.toThrow();
  });

  it('does not throw when logging an error context', () => {
    const log = createLogger({ adapter: 'groq' });
    expect(() =>
      log.error(
        { traceId: 'xyz-999', target: 'groq', outcome: 'error', errorCode: 'LLM_TIMEOUT' },
        'LLM request failed',
      ),
    ).not.toThrow();
  });
});
