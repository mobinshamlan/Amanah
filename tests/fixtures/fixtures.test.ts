import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createLocalDb, seedRows, type LocalDb } from "@/utils/db/local";
import {
  claimMatchingLease,
  countDemoRuns,
  findFirstRunAt,
  findMatchReports,
  findTopMatch,
  findVerification,
  insertDecision,
  insertMatch,
  listCandidateReviews,
  listMatchesWithReports,
  listRecentRuns,
  releaseMatchingLease,
} from "@/utils/db/queries";
import { FIXTURE_CREDENTIALS, seedFixtureDb } from "@/utils/fixtures/seed";
import { fakeGeminiResponse } from "@/utils/fixtures/fakeGemini";
import { isFixtureMode } from "@/utils/fixtures/mode";
import {
  candidateLabels,
  parseBatchComparisonResult,
  parseComparisonResult,
} from "@/utils/gemini/compareReports";
import {
  parseOwnershipAssessment,
  parseOwnershipQuestions,
} from "@/utils/gemini/ownershipVerification";
import { createSqlOwnershipStore } from "@/utils/ownership/sqlStore";
import { ownerView } from "@/utils/ownership/service";
import {
  hashSubmissionCredential,
  isSubmissionCredential,
} from "@/utils/matching/submissionCredential";
import { buildCandidateQueues, type StoredMatch } from "@/utils/matching/candidates";

// Fixture data in a local Postgres (PGlite) with the real schema from
// db/migrations, queried through the same functions production uses.

describe("fixture mode switch", () => {
  it("is on only in development with AMANAH_FIXTURES=1", () => {
    assert.equal(isFixtureMode({ NODE_ENV: "development", AMANAH_FIXTURES: "1" }), true);
    assert.equal(isFixtureMode({ NODE_ENV: "production", AMANAH_FIXTURES: "1" }), false);
    assert.equal(isFixtureMode({ NODE_ENV: "test", AMANAH_FIXTURES: "1" }), false);
    assert.equal(isFixtureMode({ NODE_ENV: "development" }), false);
    assert.equal(isFixtureMode({ NODE_ENV: "development", AMANAH_FIXTURES: "true" }), false);
  });
});

describe("fixture database", () => {
  let db: LocalDb;
  before(async () => {
    db = await createLocalDb();
    // Seeding goes through every table's constraints and foreign keys.
    await seedRows(db, seedFixtureDb(new Date("2026-11-20T12:00:00Z")).tables);
  });
  after(() => db.close());

  it("embeds answers, the assessment and the decision log with a verification", async () => {
    const { data, error } = await findVerification(db, "lost_report_id", "00000000-0000-4000-8000-000000001008");
    assert.equal(error, null);
    assert.ok(data);
    assert.equal(data.answers.length, 1);
    assert.deepEqual(data.assessment?.assessment, "unclear");
    assert.deepEqual(data.decisions.map((entry) => entry.decision).sort(), ["approved", "pending_review"]);
    // Embedded and top-level timestamps use the same ISO form.
    assert.match(data.decisions[0].created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?\+00:00$/);

    const matches = await listMatchesWithReports(db);
    assert.equal(matches.error, null);
    const first = matches.data![0];
    assert.match(first.created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?\+00:00$/);
    const pair = await findMatchReports(db, first.id);
    assert.ok(pair.data?.lost?.item_name && pair.data.found?.item_name);
  });

  it("orders the top match by score (unscored last), then newest", async () => {
    const lost = "00000000-0000-4000-8000-000000001099";
    const found = ["00000000-0000-4000-8000-000000002091", "00000000-0000-4000-8000-000000002092", "00000000-0000-4000-8000-000000002093"];
    await seedRows(db, {
      reports: [
        { id: lost, report_type: "lost", item_name: "Order test", description: "d", location: "l" },
        ...found.map((id) => ({ id, report_type: "found", item_name: "Order test", description: "d", location: "l" })),
      ],
    });
    const insert = (foundId: string, score: number | null) =>
      insertMatch(db, {
        lost_report_id: lost,
        found_report_id: foundId,
        explanation: "e",
        model: "m",
        ai_decision: "match",
        supporting_details: ["s"],
        contradictions: [],
        missing_information: [],
        ai_similarity_score: score,
      });
    await insert(found[0], null);
    await insert(found[1], 50);
    await insert(found[2], 80);
    const top = await findTopMatch(db, lost);
    const best = (await db.query<{ id: string }>(
      "select id from report_matches where found_report_id = $1",
      [found[2]],
    ))[0];
    assert.equal(top.data?.id, best.id);
  });

  it("reports unique, missing-table and bad-column errors with their Postgres codes", async () => {
    const [{ id: verificationId }] = await db.query<{ id: string }>(
      `select id from ownership_verifications v
       where not exists (select 1 from ownership_decisions d where d.verification_id = v.id)
       limit 1`,
    );
    const first = await insertDecision(db, {
      verification_id: verificationId,
      decision: "approved",
      note: null,
      previous_decision_id: null,
      previous_decision: null,
    });
    assert.equal(first.error, null);
    // A second first entry would branch the log: the NULLS NOT DISTINCT key stops it.
    const second = await insertDecision(db, {
      verification_id: verificationId,
      decision: "rejected",
      note: null,
      previous_decision_id: null,
      previous_decision: null,
    });
    assert.equal(second.error?.code, "23505");
    await assert.rejects(db.query("select id from not_a_table"), { code: "42P01" });
    await assert.rejects(db.query("select nope from reports"), { code: "42703" });
  });

  it("claims a matching lease only once until it is released", async () => {
    const reportId = "00000000-0000-4000-8000-000000001001";
    const claim = () =>
      claimMatchingLease(db, reportId, new Date(Date.now() + 60_000).toISOString(), new Date().toISOString());
    assert.equal((await claim()).data?.length, 1);
    assert.equal((await claim()).data?.length, 0);
    await releaseMatchingLease(db, reportId);
    assert.equal((await claim()).data?.length, 1);
    await releaseMatchingLease(db, reportId);
  });

  it("counts runs with demo runs kept apart", async () => {
    await seedRows(db, {
      matching_runs: [
        { source: "admin", duration_ms: 1, requests: 0, checked: 0, matched: 0, uncertain: 0, no_match: 0, failed: 0, already_saved: 0, model: "x-demo-fixture", finished_at: "2020-01-01T00:00:00Z" },
      ],
    });
    const runs = await listRecentRuns(db, 5);
    assert.equal(runs.data?.rows.length, 5);
    assert.ok(runs.data!.rows.every((row) => !row.model.includes("demo")));
    assert.ok(runs.data!.rows[0].finished_at >= runs.data!.rows[4].finished_at);
    assert.equal(runs.data!.total, 24);
    assert.equal((await countDemoRuns(db)).data, 1);
    assert.notEqual((await findFirstRunAt(db)).data, "2020-01-01T00:00:00+00:00");
  });
});

describe("seeded tracking states", () => {
  let db: LocalDb;
  before(async () => {
    db = await createLocalDb();
    await seedRows(db, seedFixtureDb().tables);
  });
  after(() => db.close());

  it("uses valid credentials and gives each documented owner state", async () => {
    const store = createSqlOwnershipStore(db);
    const expected: Record<string, string | null> = {
      questions: "question",
      answersSent: "answers_received",
      followup: "followup",
      approved: "decided",
      rejected: "decided",
      noMatch: null,
      newMatch: null,
      checking: null,
    };
    for (const [name, state] of Object.entries(expected)) {
      const credential = FIXTURE_CREDENTIALS[name as keyof typeof FIXTURE_CREDENTIALS];
      assert.ok(isSubmissionCredential(credential), name);
      const submission = await store.findSubmissionReport(hashSubmissionCredential(credential));
      assert.equal(submission?.reportType, "lost", name);
      const record = await store.findVerificationByLostReport(submission!.reportId);
      assert.equal(record ? ownerView(record).state : null, state, name);
    }
    const found = await store.findSubmissionReport(
      hashSubmissionCredential(FIXTURE_CREDENTIALS.found),
    );
    assert.equal(found?.reportType, "found");
  });

  it("surfaces potential candidates, including the staff-added pair", async () => {
    const matches = await listMatchesWithReports(db);
    const reviews = await listCandidateReviews(db);
    const queues = buildCandidateQueues(
      matches.data as StoredMatch[],
      reviews.data as Parameters<typeof buildCandidateQueues>[1],
    );
    assert.equal(queues.open.length, 2);
    assert.equal(queues.dismissed.length, 1);
  });
});

describe("fake Gemini", () => {
  const lost = {
    item_name: "مطارة ماء زرقاء عليها ملصق",
    description: "مطارة ماء معدنية زرقاء عليها ملصق، تركتها على الطاولة بعد المحاضرة.",
    location: "المكتبة المركزية",
  };
  const sameBottle = {
    item_name: "مطارة زرقاء",
    description: "مطارة معدنية زرقاء ماركة Hydro Flask، عليها ملصق ناسا، وخدش على الغطاء.",
    location: "المكتبة المركزية",
  };
  const backpack = {
    item_name: "Black backpack",
    description: "Plain black Adidas backpack.",
    location: "Gate 1",
  };
  const otherBottle = {
    item_name: "Blue bottle",
    description: "A blue bottle.",
    location: "Gym",
  };

  it("returns batch results that pass the app's validator", () => {
    const labels = candidateLabels(3);
    const schema = {
      properties: {
        results: { items: { properties: { candidate: { enum: labels } } } },
      },
    };
    const input = [
      "Compare",
      JSON.stringify({
        new_report: { report_type: "lost", ...lost },
        candidates: [sameBottle, backpack, otherBottle].map((report, index) => ({
          label: labels[index],
          report_type: "found",
          ...report,
        })),
      }),
    ].join("\n");
    const results = parseBatchComparisonResult(fakeGeminiResponse(input, schema), labels);
    assert.equal(results[0].decision, "match");
    assert.ok(results[0].similarityScore >= 60 && results[0].similarityScore <= 92);
    assert.equal(results[1].decision, "no_match");
    assert.ok(results[1].contradictions.length > 0);
    assert.equal(results[2].decision, "insufficient_information");
  });

  it("returns a single comparison that passes the validator", () => {
    const input = ["Compare", JSON.stringify({ lost_report: lost, found_report: sameBottle })].join("\n");
    const result = parseComparisonResult(
      fakeGeminiResponse(input, { properties: { decision: {} } }),
    );
    assert.equal(result.decision, "match");
  });

  it("asks questions the validator keeps, and assesses answers", () => {
    const input = ["Prepare", JSON.stringify({ lost_report: lost, found_report: sameBottle })].join("\n");
    const toInput = (report: typeof lost) => ({
      itemName: report.item_name,
      description: report.description,
      location: report.location,
    });
    const parsed = parseOwnershipQuestions(
      fakeGeminiResponse(input, { properties: { questions: {} } }),
      toInput(lost),
      toInput(sameBottle),
    );
    assert.equal(parsed.dropped.length, 0);
    assert.equal(parsed.questions.length, 2);

    const assess = (answers: string[]) =>
      parseOwnershipAssessment(
        fakeGeminiResponse(
          [
            "Assess",
            JSON.stringify({
              questions: parsed.questions.map((item, index) => ({
                number: index + 1,
                question: item.question,
                expected_detail: item.expectedDetail,
                owner_answer: answers[index],
              })),
            }),
          ].join("\n"),
          { properties: { assessment: {} } },
        ),
      ).assessment;
    const keywordAnswers = parsed.questions.map((item) => `فيها ${item.expectedDetail}`);
    assert.equal(assess(keywordAnswers), "supports");
    assert.equal(assess(["لا أعرف", "لا أعرف"]), "unclear");
  });
});
