-- Experimental AI similarity score (0-100) for ranking pending suggestions.
-- It is not a probability, does not change the AI decision or review status, and does not verify ownership.
-- Rows saved before this migration keep a null score and are shown as "Not scored".

alter table public.report_matches
  add column ai_similarity_score smallint;

alter table public.report_matches
  add constraint report_matches_ai_similarity_score_range
    check (ai_similarity_score between 0 and 100);

grant insert (ai_similarity_score) on table public.report_matches to service_role;
