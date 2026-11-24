# Amanah: product truth

What Amanah is, who it is for, and the promises every screen must keep. This file holds facts about the product, not visual decisions; those live in `docs/design-guidelines.md`. Technical detail is in `docs/ai-matching.md` and `docs/ownership-verification.md`.

## One sentence

**أمانة | AMANAH** is a privacy-first lost-and-found service for one organisation (a campus, a venue, an office). People report what they lost or found; the service compares reports privately; staff decide every claim.

*Amanah* (أمانة) is something entrusted to you, to keep safe and to return. «كل مفقود أمانة»: every lost item is an amanah.

## Who uses it

| Person | Comes to | Leaves with |
| --- | --- | --- |
| **Someone who lost an item** (public, Arabic first) | `/report/lost` | A saved report and a private tracking link (`/report/track#…`). Later: a possible-match notice, a few questions to answer, and a staff decision. |
| **Someone who found an item** (public) | `/report/found` | Confirmation that the report is saved and where to hand the item in. Nothing about matches, ever. |
| **Lost-and-found staff** (local only) | `/admin` | Possible matches to review, ownership claims to approve or reject, the list of reports, and monitoring. |

Default language is Arabic (`DEFAULT_LOCALE = "ar"`); English is one switch away and keeps the same address. Routes never carry the language, so private links stay the same in both.

## The flow

1. **Report.** The visitor describes the item (name, description, location). The report is saved privately. Nothing is published, listed or searchable.
2. **Private comparison.** The server compares the new report with reports of the other kind through Gemini (`src/utils/gemini/`). Gemini sees only item name, description and location, as data, never as instructions. Each pair gets `match`, `insufficient_information` or `no_match`, plus an experimental 0–100 similarity score that only orders suggestions.
3. **Possible match.** A `match` is saved as a *pending* suggestion for staff. The lost reporter's tracking page says only "possible match"; the found reporter is told nothing.
4. **Ownership questions.** The owner answers up to two open questions about details that appear only in the found report. Questions never contain the answer. The owner never sees the found report, the expected answers, the score or the AI's assessment.
5. **Staff decision.** Staff approve the claim for ownership follow-up, reject it, or reset it to pending. Approval does not return the item by itself; the hand-over happens with staff in person.

## Promises the interface must keep

- **No public gallery.** Found-item details are never shown on any public or browsable page. A lost reporter never sees a list of found items.
- **Only your own report.** A tracking link shows one report's progress, nothing else. The link is a random credential in the URL fragment; only its hash is stored. Anyone with the link can see that progress, and it cannot yet be revoked.
- **Staff decide ownership.** An AI suggestion, a score, or an assessment is never shown as confirmed ownership. "Approved" means staff will continue the hand-over, not that the item is returned.
- **AI is a helper, not the authority.** Name it as a suggestion or a ranking aid. Never present a score as a probability or a confidence level. Never invent certainty: "no match" is only shown when every pair was actually checked; failures say "did not finish", never "no match".
- **Say only what happens.** No invented notifications, timelines, hand-in locations, SMS, email or guarantees. The hand-in contact point is still to be supplied by the organisation.
- **Monitoring shows counts and times only.** Never report text, IDs, questions, answers, credentials or keys. Demo data is labelled and kept out of real figures.

## Limits that shape the screens

- **Gemini use is capped.** Comparisons are batched (one request per 10 candidates), rate limits pause checking for about a minute, and a tracking page stops after 40 calls. Usage caps live in `src/utils/limits/usageBuckets.ts`. Screens must have an honest "checking paused" and "did not finish, try again" state.
- **Checking depends on an open page.** Matching continues while the submitter's tab, or the lost report's tracking link, is open. Closing it leaves pairs unchecked, never "no match".
- **One verification per lost report.** A later, better suggestion does not get new questions for the owner; staff see it under other suggestions.
- **Answers cannot be edited** once saved.
- **`/admin` is local-only.** It has no sign-in and runs only in development; `src/proxy.ts` returns 404 for it and its actions in production. Staff identity is not recorded with decisions.
- **The live site is a test version.** With `AMANAH_SANDBOX=1`, sample found reports give visitors a real possible match, ready answers send in one tap, visitors may play the staff role on their own claim (labelled as simulated), a busy Gemini falls back to a local comparison that says it used no AI, and reports are deleted after 3 days. Screens say "test version" wherever this applies.
- **Development fixtures.** `src/utils/fixtures/` seeds local demo reports, suggestions and claims; demo records are marked ("DEMO" item names, `demo-fixture` model values) and excluded from monitoring figures. See `docs/local-fixtures.md`.

## Words we use

| Say | Not |
| --- | --- |
| possible match · احتمال تطابق | match found · confirmed |
| staff review · مراجعة الموظف | verified · approved automatically |
| private link · رابطك الخاص | account · login |
| did not finish · ما اكتمل الفحص | no match (when unchecked) |
| ownership follow-up · متابعة الاستلام | item returned |

Arabic copy is short, natural Saudi Arabic (ضيّعت شي، لقيت شي، تابع بلاغي). English is equally direct. Neither language promises more than the system does.
