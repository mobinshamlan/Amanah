# AI matching (private stage)

Amanah flow: private AI matching, then hidden-detail ownership verification, then a final staff decision. This document covers only the first stage. Ownership verification and staff decisions are in `ownership-verification.md`.

## What the AI does

Gemini compares pairs of one lost report and one found report. New reports are checked automatically after they are saved (see "Automatic matching"), and the local `/admin` page can still run matching by hand. Gemini reads only item name, description, and location. Report text is sent as data, never as instructions.

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

1. A detail counts as agreement only when both reports state it and it agrees. Supporting details may list only those grounded agreements.
2. A detail stated in only one report is unknown. It is listed as missing information. Absence is never a contradiction, and missing details must not block `match` when the match rule is met.
3. Common item type, colour, brand, or location alone is not enough for `match`. Location is weak and never decides alone.
4. Longer or more careful writing is not evidence.
5. Decide `match` only when the item types are compatible and at least one specific shared detail agrees, with no explicit contradictions. Extra details in only one report stay under missing information and must not block `match`.
6. Decide `no_match` only when both reports explicitly state conflicting details (for example incompatible item types, colours, or brands).
7. If those match conditions are already met, do not fall back to `insufficient_information` only because one report is thinner.

The server also checks Gemini's answer. A `match` with no supporting detail, or with any contradiction, is saved as `insufficient_information` instead. The similarity score remains a ranking aid only.

## What a suggestion is not

Every suggestion is saved as "Pending review". That means staff have not checked it. It does not establish ownership, approve a match, or authorize a return. The database only lets the AI step insert pending suggestions.

## Which pairs a run checks

Every completed comparison (`match`, `insufficient_information`, or `no_match`) is recorded in the private `report_pair_checks` table, so it is never sent to Gemini again, even after a page refresh. Pairs that already have a saved suggestion also count as checked. Failed comparisons are not recorded and are retried on the next run.

Each run takes up to 4 pairs that have not been checked, newest pairs first, so pairs with new reports are picked up automatically. "Still unchecked" is the exact number of lost/found pairs not yet checked. A pair checked with one model is not re-checked when `GEMINI_MODEL` changes.

## Timing logs

The dev server logs one line per pair (Gemini duration, each HTTP attempt's duration and status, decision) and one line per run (database load, total Gemini time, total save time, counts). Report contents, IDs, and keys are never logged.

## Monitoring (local admin)

`/admin?section=monitoring` is a dashboard for local staff inside the development-only admin workspace. It is never shown on public or tracking pages. It shows aggregate counts and timestamps only, never report names, descriptions, locations, IDs, credentials, keys, questions, or answers, and it never calls Gemini ("Gemini key: Configured" means the key is present).

**Demo data (development only):** open `/admin?section=monitoring&demo=1`, or set `AMANAH_MONITORING_DEMO=1` in `.env.local` and restart the dev server. The panel shows a **DEMO DATA** banner and a synthetic 14-day school lost-and-found snapshot (`src/utils/monitoring/demo.ts`) built through `buildMonitoringSnapshot`. It never reads or writes Supabase and never calls Gemini. Turn it off with `?demo=0` (overrides the env flag) or by removing the env and the query.

- **Health summary:** whether matching is configured and what happened on the latest recorded check. It separates "nothing to compare yet" (no lost/found pair), "no checks have run yet" (no comparison and no recorded check, ever), and "no checks recorded since run history began" (comparisons exist from before `matching_runs` existed). Monitoring has no run button; start a manual check with **Check for matches** on Possible matches.
- **Staff-reviewed match rate:** approved ÷ (approved + rejected) over claims with a current staff decision, with the counts and the percentage, and the same figures by AI similarity band (85–100, 70–84, below 70, using the score of the suggestion each claim was made for). Pending claims, claims reset to pending and unscored claims are excluded from the bands; "No reviewed claims yet" shows instead of 0%, and fewer than 10 decisions is flagged as a small sample. It is derived from existing scores and decisions with no extra storage or Gemini call, and is a staff-decision signal, not verified ground-truth accuracy. Bands group scores; they are not calibrated confidence levels.
- **Metric cards:** pairs not checked yet (with checked/total), check problems in the last 14 days (failed and stopped-early recorded checks, with the check count), possible matches to review (suggestions with no current staff decision), and claims awaiting decision (with assessment retries).
- **Reports per day** (lost/found, from `reports.created_at`) and **comparison results per day** (possible match / not enough information / no match, from `report_pair_checks.checked_at`), for the last 14 days in the server's time zone. Each chart states its sample size; fewer than 3 active days is described as too few to read a trend. Failed comparisons are not stored per pair, so they appear only in Recent checks, never as no match. Each chart has a legend, hover/focus tooltips, and a table view.
- **Recent checks:** the newest 10 recorded checks, with a 14-day summary of completed, failed, and stopped-early checks and their failure kinds. An automatic check covers only the new report's pairs, so its "left unchecked" counts those pairs alone.
- **Ownership claims:** awaiting decision, assessment retry, waiting for owner answers, staff review without questions, and current approved/rejected counts. These are decision counts, not a measure of AI accuracy.

Run history is stored in `matching_runs` (`20261024222909_create_matching_runs.sql`): one aggregate row per bounded batch (`source` admin or auto, finish time, duration, request count, checked / matched / uncertain / no-match / failed / already-saved counts, unchecked pairs left, failure kind, `stopped_for_time`, model). A run that could not load its data is recorded with failure `load` and an unknown unchecked count. RLS is enabled with no public grants; the server role can only read and insert those columns. Recording is best-effort: if the insert fails, matching continues and only the error code is logged. The dashboard loads the newest 200 recorded checks and says so when the 14-day figures may be incomplete.

## Errors

Errors and unchecked pairs are never counted as `no_match`. A run stops at the first failure and keeps suggestions already saved. Quota errors (429) and timeouts are not retried. Temporary server errors (500, 502, 503, 504) get one retry after 2 seconds. Each request times out after 20 seconds, and no new comparison starts after 30 seconds of a run.

## Automatic matching (local development MVP)

When someone submits a report, the server saves it first and confirms "Report saved." Then the report page checks only the pairs that involve the new report: a lost report against existing found reports, and a found report against existing lost reports. It uses the same comparison, score checks, pair tracking, and timing logs as `/admin` (`src/utils/matching/serverMatching.ts`).

How it runs:

1. `submitReport` creates the report ID on the server and inserts the report with the public, insert-only key. With the server key it then stores a submission credential in `report_submissions`. The credential is 32 random bytes; only its SHA-256 hash is stored. The browser receives the credential once.
2. The page calls `continueMatching(credential)` repeatedly. Each call is awaited and sends at most one Gemini request, which compares the new report with up to 10 unchecked opposite-type reports. Larger inventories take several calls, one after another, never in parallel. Nothing keeps running after a request finishes.
3. A 90-second lease (`processing_until`) stops two calls from processing the same report at once. A second call while the lease is held does no work and asks the page to wait 2 seconds.
4. Progress is the `report_pair_checks` table, so a refresh or retry only continues with unchecked pairs. A found report's page keeps the credential in `sessionStorage`, resumes after a refresh, and removes it once checking is complete. A lost report's page moves to its private tracking link instead (see "Lost-report tracking link"). A page stops after 40 calls.

The batch request (`compareReportWithCandidates`) uses the same decision rules, score guidance, and server checks as a single comparison. It also tells Gemini to judge each candidate on its own. Candidates are sent with temporary labels (`C1`, `C2`, …), never database IDs. The server accepts the answer only when every label appears exactly once and every result is valid. A missing, repeated, or unknown label, or any invalid result, rejects the whole batch. Nothing from it is recorded, so all its pairs are retried. The batch request times out after 30 seconds and has the same retry rules. `/admin` still sends one request per pair.

Rate limits: a 429 is not retried at once. The page shows that checking is paused, waits 60 seconds, and asks again, at most twice. After that it shows that checking did not finish and offers Try again. Refreshing the page asks again immediately.

What the browser receives: only a phase (`checking`, `complete`, `failed`, `rate_limited`, `unavailable`) and, for lost reports, an outcome (`possible_match`, `uncertain`, `no_match`). No found-item details, scores, explanations, IDs, or counts. Found reporters receive no outcome at all. A report ID alone, an unknown or malformed credential, or a credential used on the page for the other report type gets `{ ok: false }`.

Messages for lost reporters:

| Situation | Message |
|---|---|
| Checking | Report saved. Checking for possible matches… |
| A `match` suggestion exists | We found a possible match. Ownership verification is the next step. |
| Every pair checked, nothing saved | No possible match yet. Your report is saved. |
| Every pair checked, only `insufficient_information` | Your report is saved. We could not tell from the details whether a found item matches, so staff may review it. |
| Rate limit, waiting | Your report is saved. Checking is paused because the matching service is busy and will continue in about a minute if this page stays open. This is not a "no match" result. |
| Rate limit, stopped | Your report is saved, but checking for possible matches did not finish because the matching service is busy. This is not a "no match" result. You can try again in a few minutes. |
| Gemini or save error | Your report is saved, but checking for possible matches did not finish. This is not a "no match" result. You can try again. |

`no_match` is shown only when every relevant pair has a recorded check. Failures, the 40-call cap, and a lost credential each have their own message.

Closing the browser tab: processing stops after the current batch. For a found report, `sessionStorage` is cleared, so that tab cannot resume. A lost report resumes whenever its tracking link is opened again. The unchecked pairs stay unchecked, never "no match". They are covered later when an opposite-type report is submitted (its check includes this report), or by Run matching on `/admin`. A background worker (for example a scheduled job) would remove this limit, but it is new infrastructure and was not added for this MVP.

`report_submissions` (`20261023185900_create_report_submissions.sql`) has RLS enabled and no public access. The server role can read rows, insert only `report_id` and `token_hash`, and update only `processing_until`. It cannot rewrite a hash or delete a row. Migration history has 9 matching versions locally and remotely.

### Lost-report tracking link

After a lost report is saved, the page moves to `/report/track#<credential>`. The tracking link reuses the submission credential: it is random, only its hash is stored, and it sits in the URL fragment, which browsers do not send to the server or in Referer headers. No schema or permission change was needed. The page is excluded from search indexing.

Opening the link calls `continueMatching` for that credential. It returns only the public status, so it shows one of four states: saved/checking, possible match, no possible match yet (including "could not tell from the details"), or matching needs attention (failed, busy, unavailable, or not finished). It never shows the found report, its description, or the lost report's own text. Each visit recomputes the status from `report_matches`, so a possible match created later by a found report appears on the next visit without resubmitting. Each visit also continues any unchecked pairs for this lost report, with the same limits as above.

Anyone who has the link can see that report's progress. A lost credential cannot be revoked or rotated yet. If the credential could not be created when the report was saved, no tracking link is shown and the page says so.

Found reporters get a confirmation with drop-off guidance and no matching information. The guidance (`FOUND_DROP_OFF_GUIDANCE` in `src/app/report/SubmissionConfirmation.tsx`) tells the finder to drop the item off with the organization's lost-and-found staff. No staff email or phone is configured yet; `STAFF_CONTACT_NOTE` in the same file is where a contact link goes.

### Verified (23 October 2026, fictional reports, before batching)

- Found first, then lost: the matching lost report showed "We found a possible match" without Run matching. A refresh during checking resumed. The in-flight batch kept the lease, the resumed call waited, and no pair was checked twice.
- Lost first, then found: the found report created a private `match` suggestion (score 95). The finder saw only "Report saved. Thank you for reporting this item." The lost reporter's page later showed the possible match.
- Lost report with no matching found report: completed as "could not tell from the details" rather than "No possible match yet", because four existing found reports have very short descriptions (28–33 characters) that Gemini marked `insufficient_information`. The no-match message mapping was verified with controlled tests only.
- Invalid Gemini key (production build, port 3002): the report was saved once, the page showed "did not finish… This is not a "no match" result" after submit, Try again, and refresh, no pair was recorded, and the lease was released.
- Free-tier rate limit: after about 26 back-to-back comparisons Gemini returned 429. The page showed the "did not finish" message and those pairs stayed unchecked.
- Captured server-action responses contained only `ok`, a phase, an optional lost-report outcome, and the submitter's own credential. The publishable key is denied all access to `report_submissions`.

### Automatic matching limitations

- Processing depends on the submitter's open tab or, for a lost report, on its tracking link being opened (see above).
- Every new report costs one Gemini request per 10 opposite-type reports, rounded up (2 for 13 reports; it was 13 before batching). A batch answer uses about as many output tokens as the separate answers did, so token use does not drop much. Nothing limits how many reports a visitor can submit.
- Batching was verified with controlled tests only. Whether Gemini judges a pair the same way inside a batch as on its own has not been measured with live calls.
- One invalid result rejects the whole batch, so a repeatedly malformed answer blocks those 10 candidates until a later attempt succeeds.
- "Could not tell from the details" tells a lost reporter that at least one found report could not be ruled out. Vague existing reports make this the usual result.
- An `/admin` run and an automatic run at the same moment can both send the same pair to Gemini. The database keeps only one row.

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
