import { Result, ok, err } from 'neverthrow';
import { createLogger } from '@pledgeoff/observability';
import type { IGitHubVelocityPort, GitHubVelocityInput } from '@pledgeoff/core';
import { GitHubVelocityError } from '@pledgeoff/core';
import type { VelocityMetrics } from '@pledgeoff/core';
import { detectBottlenecks } from '@pledgeoff/core';

const log = createLogger({ adapter: 'github-velocity' });

const GITHUB_API = 'https://api.github.com';
const LOOKBACK_DAYS = 90;
const MAX_REPOS = 5;
const TIMEOUT_MS = 15_000;

interface GitHubRepo {
  name: string;
  full_name: string;
  pushed_at: string;
}

interface GitHubPR {
  created_at: string;
  merged_at: string | null;
  state: string;
  pull_request?: { merged_at: string | null };
}

async function ghFetch(path: string, token: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function getTopRepos(orgOrUser: string, token: string, filter?: string[]): Promise<GitHubRepo[]> {
  if (filter && filter.length > 0) {
    const repos: GitHubRepo[] = [];
    for (const name of filter.slice(0, MAX_REPOS)) {
      const res = await ghFetch(`/repos/${orgOrUser}/${name}`, token);
      if (res.ok) repos.push(await res.json() as GitHubRepo);
    }
    return repos;
  }

  // Try org first, then user
  let res = await ghFetch(`/orgs/${orgOrUser}/repos?sort=pushed&per_page=${MAX_REPOS}`, token);
  if (!res.ok) {
    res = await ghFetch(`/users/${orgOrUser}/repos?sort=pushed&per_page=${MAX_REPOS}`, token);
  }
  if (!res.ok) return [];
  return (await res.json() as GitHubRepo[]).slice(0, MAX_REPOS);
}

async function getClosedPRs(fullName: string, token: string, since: Date): Promise<GitHubPR[]> {
  const res = await ghFetch(
    `/repos/${fullName}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
    token,
  );
  if (!res.ok) return [];
  const prs = await res.json() as GitHubPR[];
  return prs.filter((pr) => pr.merged_at && new Date(pr.merged_at) >= since);
}

async function getClosedIssuesCount(fullName: string, token: string, since: Date): Promise<number> {
  const res = await ghFetch(
    `/repos/${fullName}/issues?state=closed&since=${since.toISOString()}&per_page=100`,
    token,
  );
  if (!res.ok) return 0;
  const issues = await res.json() as unknown[];
  return issues.length;
}

export class GitHubVelocityAdapter implements IGitHubVelocityPort {
  async fetchVelocityMetrics(input: GitHubVelocityInput): Promise<Result<VelocityMetrics, GitHubVelocityError>> {
    const start = Date.now();
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    try {
      const repos = await getTopRepos(input.orgOrUser, input.token, input.repoFilter);

      if (repos.length === 0) {
        return err(new GitHubVelocityError(`No repositories found for ${input.orgOrUser}`, 404));
      }

      const prsByRepo = await Promise.all(repos.map((r) => getClosedPRs(r.full_name, input.token, since)));
      const issueCountByRepo = await Promise.all(repos.map((r) => getClosedIssuesCount(r.full_name, input.token, since)));

      const allPRs = prsByRepo.flat();
      const totalIssuesClosed = issueCountByRepo.reduce((a, b) => a + b, 0);

      const weeks = LOOKBACK_DAYS / 7;

      const prMergeRatePerWeek = allPRs.length / weeks;

      const cycleTimes = allPRs
        .filter((pr) => pr.merged_at)
        .map((pr) => (new Date(pr.merged_at!).getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60 * 24));

      const avgCycleTimeDays = cycleTimes.length > 0
        ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
        : 0;

      // Lead time approximation: commits often start before PR is opened; empirically ~60% of cycle time
      const avgLeadTimeDays = avgCycleTimeDays * 0.6;

      const issuesClosedPerWeek = totalIssuesClosed / weeks;

      const metricsWithoutBottlenecks = {
        prMergeRatePerWeek: Math.round(prMergeRatePerWeek * 100) / 100,
        avgCycleTimeDays: Math.round(avgCycleTimeDays * 10) / 10,
        avgLeadTimeDays: Math.round(avgLeadTimeDays * 10) / 10,
        issuesClosedPerWeek: Math.round(issuesClosedPerWeek * 10) / 10,
      };

      const topBottlenecks = detectBottlenecks(metricsWithoutBottlenecks);

      const metrics: VelocityMetrics = {
        ...metricsWithoutBottlenecks,
        topBottlenecks,
        snapshotAt: new Date().toISOString(),
      };

      log.info({
        traceId: input.traceId,
        target: 'github.com',
        operation: 'fetchVelocityMetrics',
        orgOrUser: input.orgOrUser,
        repoCount: repos.length,
        prCount: allPRs.length,
        durationMs: Date.now() - start,
        outcome: 'success',
      }, 'GitHub velocity metrics fetched');

      return ok(metrics);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isTimeout = msg.includes('abort') || msg.includes('timeout');

      log.error({
        traceId: input.traceId,
        target: 'github.com',
        operation: 'fetchVelocityMetrics',
        durationMs: Date.now() - start,
        outcome: 'error' as const,
        errorCode: isTimeout ? 'TIMEOUT' : 'NETWORK',
        errorMessage: msg,
      }, 'GitHub velocity fetch failed');

      return err(new GitHubVelocityError(isTimeout ? 'GitHub API timeout' : msg));
    }
  }
}
