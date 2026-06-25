import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { InterviewGuide, InterviewQuestion } from '@pledgeoff/core';
import { InterviewGuideRepositoryError, type IInterviewGuideRepository } from '@pledgeoff/core';

type InterviewGuideRow = {
  id: string;
  idea_id: string;
  user_id: string;
  target_segment: string;
  questions: InterviewQuestion[];
  hypotheses: string[];
  red_flags: string[];
  created_at: string;
};

function rowToGuide(row: InterviewGuideRow): InterviewGuide {
  return {
    id: row.id,
    ideaId: row.idea_id,
    userId: row.user_id,
    targetSegment: row.target_segment,
    questions: row.questions,
    hypotheses: row.hypotheses,
    redFlags: row.red_flags,
    createdAt: row.created_at,
  };
}

export class SupabaseInterviewGuideRepository implements IInterviewGuideRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(guide: InterviewGuide): Promise<Result<InterviewGuide, InterviewGuideRepositoryError>> {
    const { data, error } = await this.client
      .from('interview_guides')
      .upsert(
        {
          id: guide.id,
          idea_id: guide.ideaId,
          user_id: guide.userId,
          target_segment: guide.targetSegment,
          questions: guide.questions,
          hypotheses: guide.hypotheses,
          red_flags: guide.redFlags,
          created_at: guide.createdAt,
        },
        { onConflict: 'idea_id' },
      )
      .select()
      .single<InterviewGuideRow>();

    if (error) return err(new InterviewGuideRepositoryError(error.message));
    return ok(rowToGuide(data));
  }

  async findByIdeaId(ideaId: string): Promise<Result<InterviewGuide | null, InterviewGuideRepositoryError>> {
    const { data, error } = await this.client
      .from('interview_guides')
      .select()
      .eq('idea_id', ideaId)
      .maybeSingle<InterviewGuideRow>();

    if (error) return err(new InterviewGuideRepositoryError(error.message));
    return ok(data ? rowToGuide(data) : null);
  }
}
