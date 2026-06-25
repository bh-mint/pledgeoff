alter table public.feature_analyses add constraint feature_analyses_idea_id_unique unique (idea_id);
alter table public.battlecards add constraint battlecards_idea_id_unique unique (idea_id);
