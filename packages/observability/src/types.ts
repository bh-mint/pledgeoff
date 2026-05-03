export type LogContext = {
  traceId: string;
  target?: string;
  operation?: string;
  latencyMs?: number;
  outcome?: 'success' | 'error';
  errorCode?: string;
  [key: string]: unknown;
};
