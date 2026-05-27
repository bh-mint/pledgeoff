import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getUserPlan } from '@/server/billing/getUserPlan';
import { PLAN_LIMITS, ottoAvailableQuestions } from '@pledgeoff/core';
import type { Subscription } from '@pledgeoff/core';
import OttoChatClient from './OttoChatClient';

type Props = {
  userId: string;
  ideaId: string;
  ideaText: string;
  verdict: string;
  reasoning: string;
  score: number;
};

export default async function OttoChat({ userId, ideaId, ideaText, verdict, reasoning, score }: Props) {
  const supabase = createSupabaseServiceClient();

  const [subRow, convRow] = await Promise.all([
    supabase.from('subscriptions').select().eq('user_id', userId).maybeSingle(),
    supabase.from('otto_conversations').select().eq('user_id', userId).eq('idea_id', ideaId).maybeSingle(),
  ]);

  const plan = await getUserPlan(userId);

  if (plan === 'free') {
    return (
      <div className="mt-10 border rounded-xl px-6 py-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="mono text-[10px] uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--t3)' }}>
          Ask Otto · AI Co-Founder
        </div>
        <p className="text-[14px] mb-5 leading-relaxed" style={{ color: 'var(--t2)' }}>
          Ask Otto anything about your idea — strategy, competition, what to build first.
          Available on Founder and above.
        </p>
        <a
          href="/settings?tab=billing"
          className="inline-block px-5 py-2.5 rounded-lg text-[13px] font-medium mono"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          Upgrade to Founder →
        </a>
      </div>
    );
  }

  const sub = subRow.data as Subscription | null;
  const balance = sub
    ? ottoAvailableQuestions(sub)
    : { included: 0, purchased: 0, total: 0 };
  const includedLimit = PLAN_LIMITS[plan]?.ottoQuestionsPerMonth ?? 0;

  const messages = (convRow.data?.messages ?? []) as Array<{ role: 'user' | 'assistant'; content: string; createdAt: string }>;

  return (
    <OttoChatClient
      ideaId={ideaId}
      ideaText={ideaText}
      verdict={verdict}
      reasoning={reasoning}
      score={score}
      initialBalance={{ ...balance, includedLimit, plan }}
      initialMessages={messages}
    />
  );
}
