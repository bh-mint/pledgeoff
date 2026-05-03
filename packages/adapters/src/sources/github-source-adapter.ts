import { Result, ok, err } from 'neverthrow';
import type { Signal } from '@pledgeoff/core';
import type { ISourceAdapter } from '@pledgeoff/core';
import { SourceAdapterError } from '@pledgeoff/core';
import { createLogger } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'github' });

interface GitHubIssue {
  html_url: string;
  title: string;
  body: string | null;
  reactions: { '+1': number; '-1': number; total_count: number };
}

interface GitHubSearchResponse {
  items: GitHubIssue[];
}

function scoreSentiment(reactions: GitHubIssue['reactions']): Signal['sentiment'] {
  const positive = reactions['+1'];
  const negative = reactions['-1'];
  if (positive > negative + 2) return 'positive';
  if (negative > positive + 2) return 'negative';
  return 'neutral';
}

export class GitHubSourceAdapter implements ISourceAdapter {
  readonly sourceName = 'github';

  constructor(
    private readonly pat: string,
    private readonly timeoutMs = 10_000,
    private readonly maxRetries = 3,
  ) {}

  async fetch(ideaText: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>> {
    const query = encodeURIComponent(ideaText.slice(0, 100));
    const url = `https://api.github.com/search/issues?q=${query}&sort=reactions&per_page=10`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.pat}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (!response.ok) {
          if (attempt < this.maxRetries) continue;
          log.warn(
            { traceId, target: 'github', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${response.status}` },
            'GitHub search failed',
          );
          return err(new SourceAdapterError(`HTTP ${response.status}`, this.sourceName));
        }

        const json = (await response.json()) as GitHubSearchResponse;
        const signals: Signal[] = json.items.map((issue) => ({
          id: crypto.randomUUID(),
          ideaId,
          source: 'github' as const,
          url: issue.html_url,
          title: issue.title.slice(0, 500),
          summary: (issue.body ?? issue.title).slice(0, 2000),
          sentiment: scoreSentiment(issue.reactions),
          fetchedAt: new Date().toISOString(),
        }));

        log.info(
          { traceId, target: 'github', operation: 'search', latencyMs: Date.now() - start, outcome: 'success', signalCount: signals.length },
          'GitHub signals fetched',
        );
        return ok(signals);
      } catch (error) {
        if (attempt === this.maxRetries) {
          const message = error instanceof Error ? error.message : 'unknown error';
          log.error(
            { traceId, target: 'github', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'MAX_RETRIES' },
            `GitHub fetch failed: ${message}`,
          );
          return err(new SourceAdapterError(message, this.sourceName));
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    return err(new SourceAdapterError('max retries exceeded', this.sourceName));
  }
}
