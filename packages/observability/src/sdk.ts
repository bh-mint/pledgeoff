import { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace } from '@opentelemetry/api';

let initialized = false;

export function initSdk(): void {
  if (initialized) return;
  initialized = true;

  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
  });
  trace.setGlobalTracerProvider(provider);
}
