-- Possible-match details for admin review. The AI step can only insert pending suggestions.
-- Pending review means staff have not checked the suggestion. It does not establish ownership.
-- Rows saved before this migration keep empty detail lists and count as possible matches.

alter table public.report_matches
  add column ai_decision text not null default 'match',
  add column supporting_details text[] not null default '{}',
  add column contradictions text[] not null default '{}',
  add column missing_information text[] not null default '{}',
  add column status text not null default 'pending_review';

alter table public.report_matches
  add constraint report_matches_ai_decision_check
    check (ai_decision in ('match', 'insufficient_information')),
  add constraint report_matches_status_check
    check (status = 'pending_review'),
  add constraint report_matches_supporting_details_size
    check (cardinality(supporting_details) <= 5
      and char_length(array_to_string(supporting_details, '')) <= 1500),
  add constraint report_matches_contradictions_size
    check (cardinality(contradictions) <= 5
      and char_length(array_to_string(contradictions, '')) <= 1500),
  add constraint report_matches_missing_information_size
    check (cardinality(missing_information) <= 5
      and char_length(array_to_string(missing_information, '')) <= 1500);

revoke insert on table public.report_matches from service_role;

grant insert (
  lost_report_id,
  found_report_id,
  explanation,
  model,
  ai_decision,
  supporting_details,
  contradictions,
  missing_information
) on table public.report_matches to service_role;
