# Ownership verification

Amanah flow: private AI matching (see `ai-matching.md`), then ownership verification, then a final staff decision. This document covers the last two stages.

## What happens

1. A lost report gets at least one AI `match` suggestion.
2. When the owner opens their private tracking link and checking has finished, the server picks the **highest-ranked** `match` suggestion for that lost report (highest AI similarity first, unscored last, then newest). This is the same order as `/admin`. The score only orders suggestions; there is no threshold.
3. Gemini reads the lost and found reports and chooses up to two specific details that are stated in the found report and absent from the lost report. It writes one open-ended question for each.
4. The owner answers one question at a time on the tracking page. Answers cannot be changed after they are saved.
5. After the last answer, Gemini assesses the answers as `supports`, `unclear`, or `conflicts`, with a short explanation for staff.
6. Staff review the claim on the local `/admin` page and save a decision: **Approve for ownership follow-up** or **Reject this claim**. Staff can **Reset to pending review** at any time and decide again.

Questions are prepared once per lost report and stay tied to the suggestion they were made for. If a higher-ranked suggestion appears later, staff see it under "Other suggestions for this lost report"; the owner is not asked new questions.

## What the owner can and cannot see

The tracking page receives only one of these states:

| State | Owner sees |
|---|---|
| Question | "Question N of M" and the question text |
| No useful private details | "Staff review needed". No question is invented. |
| All answers saved | "Answers received". Staff will review. |
| Staff decided | Approved: staff will continue ownership follow-up, contact lost-and-found staff. Rejected: staff could not confirm this match. |
| Decision reset to pending review | The state before the decision again (the next question, or "Answers received", or "Staff review needed"). The owner is not told that a decision was reset. |
| Failure | An honest retry message. Never "no match". |

The owner never receives the found report, its description, the expected answers, the similarity score, or the AI assessment.

## Question safety checks

Gemini returns, for each question, the found-report detail and the `answer_keywords` that would reveal it, copied from the found report. The server drops a question when:

- the question contains the detail or any answer keyword (it would reveal the answer),
- any keyword is not in the found report (an invented detail), or
- any keyword already appears in the lost report (a detail the owner already gave).

Matching ignores case, Arabic diacritics, and tatweel. These checks are conservative and can drop a good question; if every question is dropped, the owner sees "Staff review needed". A malformed Gemini answer is rejected as a whole and nothing is saved.

## Authorization and data

- Question and answer actions are authorized only by the lost report's private submission credential (the tracking link). A report ID alone, a malformed or unknown credential, or a found report's credential is refused.
- Answers are saved only for the next unanswered question.
- Migration `20261024150432_ownership_verification.sql` adds four private tables: `ownership_verifications` (questions and private expected details), `ownership_answers`, `ownership_assessments`, and `ownership_decisions` (an append-only decision log). RLS is enabled and there are no public grants. The server role can only read and insert specific columns; nothing can be updated or deleted through it.
- A composite foreign key makes sure a verification can only point at a `match` suggestion for the same lost report. The migration adds the matching unique constraint `(id, lost_report_id, ai_decision)` on `report_matches`; `id` is already unique, so existing rows are unaffected.
- Logs contain only states, counts, and error kinds, never report text, questions, or answers.

## Failures

| Failure | Result |
|---|---|
| Question generation fails (timeout, invalid answer) | Owner sees a retry message. Nothing is saved. |
| Gemini rate limit | Owner sees "service is busy, try again in a few minutes". |
| Gemini key missing or migration not applied | Owner sees "not available right now; staff can still review". `/admin` says the migration is not applied. |
| Saving an answer fails | The typed answer stays in the box with a retry message. Earlier answers are kept. |
| Assessment fails | Answers stay saved, the owner sees "Answers received", and `/admin` offers **Retry AI assessment**. |

None of these change the report, its suggestions, or show "no match".

## Staff decisions

- Decisions are an append-only log in `ownership_decisions`. Each entry is `approved`, `rejected`, or `pending_review` (a reset), with an optional note and its time. The current decision is the newest entry; no entry or a reset means pending review.
- A decision can only be made while the claim is pending review, and only an approved or rejected claim can be reset. The server checks this, and the database enforces it too: each entry records the entry before it (`previous_decision_id` and `previous_decision`), a composite foreign key ties those to a real earlier entry of the same claim, and a check constraint allows only pending → approved/rejected → pending.
- `unique nulls not distinct (verification_id, previous_decision_id)` keeps the log a single chain. If two staff tabs act on the same claim at once, the second action is not saved and staff see "Another staff action was saved first".
- Nothing in the log is updated or deleted. `/admin` shows every decision and reset under **Decision history**, oldest first. Resetting never changes the owner's answers or the AI assessment.
- The decision log is private: RLS is enabled, there are no public grants, and the owner only ever sees the current approved or rejected state.
- Approval means staff may proceed with ownership follow-up. It does not return the item automatically and does not change the suggestion's "Pending review" status.
- The AI assessment never approves or rejects anything.

## Tests

`npm test` runs controlled tests with a fake Gemini request and an in-memory store (`tests/ownership/`). They cover question creation and safety checks, answer assessment, authorization, one-question-at-a-time answers, staff decisions, and failure handling. No live Gemini calls and no database records.

## Limitations

- Processing still depends on the owner opening their tracking link.
- One verification per lost report. A later, better suggestion does not get its own questions.
- The approved message points the owner to "your organization's lost-and-found staff". The real contact point and hand-over process still need to be supplied by the organization.
- Staff identity is not recorded with decisions or resets (the local admin has no sign-in).
- Gemini judges which details are "useful"; the server checks only that questions do not reveal keywords and that keywords come from the found report.
