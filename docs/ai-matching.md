# AI matching (private stage)

Amanah flow: private AI matching, then hidden-detail ownership verification, then a final staff decision. This document covers only the first stage.

## What the AI does

The local `/admin` page can run Gemini over pairs of one lost report and one found report. Gemini reads only item name, description, and location. Report text is sent as data, never as instructions.

Gemini returns one decision per pair:

| Decision | Meaning | Saved? |
|---|---|---|
| `match` | At least one distinctive detail is stated in both reports and agrees, and nothing clearly conflicts. | Yes, as "AI: possible match" |
| `insufficient_information` | The reports might describe the same item, but the details are too common or too thin to say. | Yes, as "AI: not enough information" |
| `no_match` | Details stated in both reports clearly conflict. | No, counted in the run summary only |

Each saved suggestion also lists supporting details, contradictions, and missing information, plus an experimental AI similarity score.

## AI similarity score (experimental)

Gemini returns an integer from 0 to 100 with every comparison. It is a ranking aid that puts stronger suggestions first in `/admin`. It is not a probability, it does not verify ownership, and nothing is approved automatically from it.

Scoring guidance given to Gemini:

- Agreement on common category, colour, brand, or location is weak evidence and keeps the score low.
- Agreement on distinctive identifying details (a specific sticker, engraving, damage, model number, or named contents) is stronger evidence. Several independent distinctive agreements score higher than one.
- Missing details are unknown. They neither raise nor lower the score.
- Writing length does not raise the score.
- Clear contradictions keep the score low.

There is no formula, weighting, or threshold. The score is kept exactly as Gemini returned it and is stored separately from the decision and the review status. A `match` that the server downgrades to `insufficient_information` keeps its original score. The server rejects a response whose score is missing, not a whole number, or outside 0–100, and treats it as a failed comparison, not as `no_match`.

Suggestions saved before the score was added show "Not scored". They are not re-scored automatically.

Known limits: scores from a few fictional examples have not been calibrated, Gemini may give different scores for the same pair on different runs, and a lookalike with several common features can still get a middling score.

## Decision rules

1. A detail counts as agreement only when both reports state it and it agrees.
2. A detail stated in only one report is unknown. It is listed as missing information, not as agreement or contradiction.
3. Common item type, colour, brand, or location alone is not enough for `match` (for example, two black iPhones in the library).
4. Longer or more careful writing is not evidence.
5. Clear conflicts (different item types, colours, or brands) are listed as contradictions.

The server also checks Gemini's answer. A `match` with no supporting detail, or with any contradiction, is saved as `insufficient_information` instead.

## What a suggestion is not

Every suggestion is saved as "Pending review". That means staff have not checked it. It does not establish ownership, approve a match, or authorize a return. The database only lets the AI step insert pending suggestions.

## Which pairs a run checks

Every completed comparison (`match`, `insufficient_information`, or `no_match`) is recorded in the private `report_pair_checks` table, so it is never sent to Gemini again, even after a page refresh. Pairs that already have a saved suggestion also count as checked. Failed comparisons are not recorded and are retried on the next run.

Each run takes up to 4 pairs that have not been checked, newest pairs first, so pairs with new reports are picked up automatically. "Still unchecked" is the exact number of lost/found pairs not yet checked. A pair checked with one model is not re-checked when `GEMINI_MODEL` changes.

## Timing logs

The dev server logs one line per pair (Gemini duration, each HTTP attempt's duration and status, decision) and one line per run (database load, total Gemini time, total save time, counts). Report contents, IDs, and keys are never logged.

## Errors

Errors and unchecked pairs are never counted as `no_match`. A run stops at the first failure and keeps suggestions already saved. Quota errors (429) and timeouts are not retried. Temporary server errors (500, 502, 503, 504) get one retry after 2 seconds. Each request times out after 20 seconds, and no new comparison starts after 30 seconds of a run.

## Score migration application note

On 23 October 2026, `20261023180400_add_report_match_similarity_score.sql` was applied through the Amanah dashboard SQL Editor in one transaction because the agent database connector was unavailable. The score column, range constraint, and additive server insert permission were verified. Existing suggestions remain unscored.

Its version was later marked applied in remote migration history with `supabase migration repair` (see "Migration history reconciliation" below). The SQL was not run again.

## Pair-tracking migration application note

On 23 October 2026, `20261023184000_create_report_pair_checks.sql` was applied through the Amanah dashboard SQL Editor in one transaction. Server-role insert/read behavior, duplicate rejection, lost/found reference validation, invalid-decision rejection, and denied updates were verified in a rolled-back transaction. Public access remains blocked and RLS is enabled. No verification records were retained; the existing 20 reports and 5 suggestions were preserved.

Its version was later marked applied in remote migration history the same way. The SQL was not run again.

## Migration history reconciliation (23 October 2026)

Done with Supabase CLI 2.122.0 on the linked project, using `supabase migration repair` only. No migration SQL was re-run, and no data changed (20 reports, 5 suggestions, 12 pair checks before and after).

- `20261023180400` and `20261023184000` were marked applied after their schema effects were verified in the live database.
- Four earlier migrations had been recorded by the agent database connector under its own version numbers: `create_reports` 20261023163100, `staff_report_access` 20261023163954, `revert_staff_report_access` 20261023164314, and `grant_service_role_reports_select` 20261023170259. The SQL the connector applied for each was identical to the local file, and the local files are unchanged since they were committed. The connector versions were marked reverted and the local versions `20261023163002`, `20261023163936`, `20261023164308`, and `20261023170253` were marked applied.
- `supabase migration list --linked` now shows the same 8 versions locally and remotely, and `supabase db push --dry-run --linked` reports that the remote database is up to date.

Note: `service_role` keeps Supabase's default REFERENCES, TRIGGER, and TRUNCATE privileges on `reports`, because `create_reports` only revokes privileges from the public roles. This matches the migration files and is not a history discrepancy.

## Verified state (23 October 2026)

- Live schema: both migrations' effects are present. The score column accepts reads, rejects scores outside 0–100 (23514) and updates (42501). `report_pair_checks` rejects invalid decisions (23514), duplicate pairs (23505), extra columns, updates, and deletes (42501). The publishable key cannot read `report_matches`, `report_pair_checks`, or `reports`, or insert pair checks (42501).
- Live fictional run: two runs of 4 pairs each, the second after a page refresh, checked 8 different pairs with no repeats. Gemini took about 1.0–1.7 seconds per pair in a single HTTP attempt, a database insert about 300 ms, and the initial database load 0.5–1.1 seconds. Each run took about 7 seconds.
- Suggestions persisted without duplicates, scored suggestions show their score, and older ones show "Not scored".
- Production `/admin` and server-action requests to it return 404.
- Local and remote migration history agree (see "Migration history reconciliation").

## Known limitations

- Changing `GEMINI_MODEL` does not invalidate earlier checks. Pairs already checked with one model are not re-checked with another.
- `no_match` results from before pair tracking were not stored, so those pairs are checked once more.
- Similarity scores are uncalibrated and can vary between runs for the same pair.
- The server-side `match` downgrade only checks for supporting details and contradictions. Whether a supporting detail is truly distinctive depends on Gemini.
- Report text (item name, description, location) is sent to Google's Gemini API.
- The admin page loads every report and every recorded pair on each run. This is fine at the current size.
- The earlier slow runs (up to about 7 seconds per pair) happened before timing logs existed. Their cause is unconfirmed.
