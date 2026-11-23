# Local fixture mode

Fixture mode is a development-only way to run all of Amanah locally with
fictional data: public reporting, private tracking with ownership
verification, and the staff workspace at `/admin`.

## Guarantees

- **No Supabase.** `createAdminClient()` returns an in-memory fake before it
  reads any Supabase setting. The proxy skips the Supabase auth check. The
  server-side cookie client throws if anything calls it.
- **No Gemini.** `requestJson()` returns a local fake answer before usage
  limits, the API key, or any network call. The fake waits 0.6–1.2 s so
  loading states are visible.
- **Development only.** It turns on only when `NODE_ENV=development` **and**
  `AMANAH_FIXTURES=1`. A build, `next start`, or production deploy never
  uses it, even if the variable is set.
- **Resets on restart.** Data lives in server memory. Restarting the dev server
  reseeds it. Edits and hot reloads keep the current data.

`.env.local` can still hold real keys. Fixture mode ignores them. The Next.js
CLI can still check npm for updates; the app itself makes no outbound calls.

## Start

```sh
npm run dev:fixtures
```

This runs `AMANAH_FIXTURES=1 next dev -p 3100`. To run it next to another dev
server, give it its own build folder:

```sh
NEXT_DIST_DIR=.next-fixtures AMANAH_FIXTURES=1 npx next dev -p 3101
```

The server log prints `Fixtures: seeded fictional in-memory data…` the first
time data is used.

## Private tracking links

Open `http://localhost:3100/report/track#<credential>`. Each credential is
43 characters long and is clearly fake.

| State | Credential |
| --- | --- |
| (a) Just submitted; checks for about 2 s, then shows "not enough detail to tell" | `fixture-lost-a-checking-0000000000000000000` |
| (b) No possible match | `fixture-lost-b-no-match-0000000000000000000` |
| (c) Possible match; 2 ownership questions waiting | `fixture-lost-c-questions-000000000000000000` |
| (c2) Possible match; questions are prepared on the first visit | `fixture-lost-c2-new-match-00000000000000000` |
| (d) Answers sent; waiting for staff | `fixture-lost-d-answers-sent-000000000000000` |
| (e) Staff follow-up question waiting | `fixture-lost-e-followup-0000000000000000000` |
| (f) Approved | `fixture-lost-f-approved-0000000000000000000` |
| (g) Rejected (not verified) | `fixture-lost-g-rejected-0000000000000000000` |
| Found report: tracking is for lost reports, so this shows "link doesn't work" | `fixture-found-h-umbrella-000000000000000000` |

States change as you use them, like real data. For example, answering (c)
moves it to "answers received". Restart the server to reset everything.

Example answers for (c): **Hydro Flask** and **خدش على الغطاء** get "supports".
A different brand, such as **Stanley**, gets "conflicts". "لا أعرف" gets
"unclear". For (c2), answers in English that mention the **enamel falcon pin**
and the **university ID and bank card** get "supports".

## What `/admin` shows

There are 13 lost and 13 found reports over the last 14 days, in Arabic and
English. They include one very long description and one long item name.

- **Possible matches:** AI matches with scores from 63 to 88, two
  "not enough information" pairs, and one pair added by staff.
- **Potential candidates:** one pair marked for ownership review, one pair
  added by staff, and one dismissed pair. You can add another pair or review
  one. Adding a pair that already exists shows "already saved".
- **Ownership claims:** one claim in every stage:
  - questions not answered yet;
  - answered, with the AI result "supports";
  - "unclear", with a staff follow-up still waiting;
  - follow-up answered after approval and reset;
  - "conflicts" and rejected;
  - approved;
  - answers saved but the AI assessment is missing (**Retry AI assessment**);
  - no questions (staff review).
- **All reports:** every report, with lost and found filters.
- **Monitoring:** 24 matching runs over two weeks, both automatic and staff
  runs. Four failed: quota, timeout, usage limit, and API error. Some pairs are
  still unchecked, so **Check for matches** has work to do.

## How the fake Gemini decides

It compares item types, colours, brands, and distinctive words in Arabic and
English. It is not a model.

- Several shared distinctive words: **match**, scored 60–92.
- Some overlap: **not enough information**, scored 20–55.
- Different item type, colour, or brand: **no match**, scored 0–15.

Ownership questions ask about found-report words that the lost report does not
mention. The assessment returns "supports" when answers contain the expected
words, "conflicts" when they name a different colour or brand, and "unclear"
otherwise. Arabic and English words are not translated into each other, except
for a short list of item types, colours, and brands.

## Limits

- The fake client supports only the Supabase calls the app makes today. A new
  call may return an error until `src/utils/fixtures/fakeSupabase.ts` and
  `schema.ts` support it.
- Usage limits always allow requests, and Gemini never fails. To test
  rate-limit or failure screens, use real services or Monitoring's demo
  preview (`/admin?section=monitoring&demo=1`).
- The browser Supabase client (`src/utils/supabase/client.ts`) is not used by
  the app and has no fixture guard.

Code: `src/utils/fixtures/` (`mode.ts`, `fakeSupabase.ts`, `schema.ts`,
`selectParser.ts`, `fakeGemini.ts`, `seed.ts`, `store.ts`). Tests:
`tests/fixtures/fixtures.test.ts`.
