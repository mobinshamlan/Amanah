import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSelect } from "@/utils/fixtures/selectParser";
import { createEmptyDb, createFakeSupabase } from "@/utils/fixtures/fakeSupabase";
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
import { createSupabaseOwnershipStore } from "@/utils/ownership/supabaseStore";
import { ownerView } from "@/utils/ownership/service";
import {
  hashSubmissionCredential,
  isSubmissionCredential,
} from "@/utils/matching/submissionCredential";
import { buildCandidateQueues, type StoredMatch } from "@/utils/matching/candidates";

type Client = Parameters<typeof createSupabaseOwnershipStore>[0];

describe("fixture mode switch", () => {
  it("is on only in development with AMANAH_FIXTURES=1", () => {
    assert.equal(isFixtureMode({ NODE_ENV: "development", AMANAH_FIXTURES: "1" }), true);
    assert.equal(isFixtureMode({ NODE_ENV: "production", AMANAH_FIXTURES: "1" }), false);
    assert.equal(isFixtureMode({ NODE_ENV: "test", AMANAH_FIXTURES: "1" }), false);
    assert.equal(isFixtureMode({ NODE_ENV: "development" }), false);
    assert.equal(isFixtureMode({ NODE_ENV: "development", AMANAH_FIXTURES: "true" }), false);
  });
});

describe("select parser", () => {
  it("reads columns, aliases, hints, and nested embeds across lines", () => {
    const nodes = parseSelect(`
      id, alias:lost_report_id,
      lost:reports!report_matches_lost_report_fkey(item_name, description),
      answers:ownership_answers(question_number, nested:other(a, b))
    `);
    assert.deepEqual(nodes, [
      { kind: "column", name: "id", alias: "id" },
      { kind: "column", name: "lost_report_id", alias: "alias" },
      {
        kind: "embed",
        alias: "lost",
        table: "reports",
        hint: "report_matches_lost_report_fkey",
        children: [
          { kind: "column", name: "item_name", alias: "item_name" },
          { kind: "column", name: "description", alias: "description" },
        ],
      },
      {
        kind: "embed",
        alias: "answers",
        table: "ownership_answers",
        hint: null,
        children: [
          { kind: "column", name: "question_number", alias: "question_number" },
          {
            kind: "embed",
            alias: "nested",
            table: "other",
            hint: null,
            children: [
              { kind: "column", name: "a", alias: "a" },
              { kind: "column", name: "b", alias: "b" },
            ],
          },
        ],
      },
    ]);
  });

  it("rejects unbalanced parentheses", () => {
    assert.throws(() => parseSelect("a:reports(id"));
  });
});

describe("fake Supabase client", () => {
  it("embeds to-one rows as objects and to-many rows as arrays", async () => {
    const supabase = createFakeSupabase(seedFixtureDb(new Date("2026-11-20T12:00:00Z")));
    const { data, error } = await supabase
      .from("ownership_verifications")
      .select(
        `id, answers:ownership_answers(question_number, answer),
         assessment:ownership_assessments(assessment),
         decisions:ownership_decisions(id, decision, previous_decision_id)`,
      )
      .eq("lost_report_id", "00000000-0000-4000-8000-000000001008")
      .maybeSingle();
    assert.equal(error, null);
    const row = data as {
      answers: unknown[];
      assessment: { assessment: string } | null;
      decisions: { decision: string; previous_decision_id: string | null }[];
    };
    assert.equal(row.answers.length, 1);
    assert.deepEqual(row.assessment, { assessment: "unclear" });
    assert.deepEqual(
      row.decisions.map((entry) => entry.decision).sort(),
      ["approved", "pending_review"],
    );

    const match = await supabase
      .from("report_matches")
      .select(
        "id, lost:reports!report_matches_lost_report_fkey(report_type), found:reports!report_matches_found_report_fkey(report_type)",
      )
      .limit(1)
      .maybeSingle();
    assert.deepEqual(
      [(match.data as { lost: { report_type: string } }).lost.report_type,
        (match.data as { found: { report_type: string } }).found.report_type],
      ["lost", "found"],
    );
  });

  it("enforces unique keys, including NULLs-equal keys", async () => {
    const db = createEmptyDb();
    const supabase = createFakeSupabase(db);
    db.tables.ownership_verifications.push({ id: "v1" });
    const first = await supabase
      .from("ownership_decisions")
      .insert({ verification_id: "v1", decision: "approved" });
    assert.equal(first.error, null);
    const second = await supabase
      .from("ownership_decisions")
      .insert({ verification_id: "v1", decision: "rejected" });
    assert.equal(second.error?.code, "23505");
    const missing = await supabase.from("not_a_table").select("id");
    assert.equal(missing.error?.code, "PGRST205");
    const badColumn = await supabase.from("reports").select("nope");
    assert.equal(badColumn.error?.code, "42703");
  });

  it("claims a lease only once with update + or + select", async () => {
    const db = createEmptyDb();
    db.tables.report_submissions.push({ report_id: "r1", token_hash: "x", processing_until: null });
    const supabase = createFakeSupabase(db);
    const claim = () =>
      supabase
        .from("report_submissions")
        .update({ processing_until: new Date(Date.now() + 60_000).toISOString() })
        .eq("report_id", "r1")
        .or(`processing_until.is.null,processing_until.lt.${new Date().toISOString()}`)
        .select("report_id");
    assert.equal(((await claim()).data as unknown[]).length, 1);
    assert.equal(((await claim()).data as unknown[]).length, 0);
  });

  it("orders with nullsFirst, counts, and filters with not ilike", async () => {
    const db = createEmptyDb();
    db.tables.report_matches.push(
      { id: "a", ai_similarity_score: null, created_at: "2026-01-01T00:00:00.000Z", model: "m" },
      { id: "b", ai_similarity_score: 50, created_at: "2026-01-02T00:00:00.000Z", model: "x-demo" },
      { id: "c", ai_similarity_score: 80, created_at: "2026-01-03T00:00:00.000Z", model: "m" },
    );
    const supabase = createFakeSupabase(db);
    const ordered = await supabase
      .from("report_matches")
      .select("id")
      .order("ai_similarity_score", { ascending: false, nullsFirst: false });
    assert.deepEqual((ordered.data as { id: string }[]).map((row) => row.id), ["c", "b", "a"]);
    const counted = await supabase
      .from("report_matches")
      .select("id", { count: "exact", head: true })
      .not("model", "ilike", "%demo%");
    assert.equal(counted.count, 2);
    assert.equal(counted.data, null);
  });
});

describe("seeded tracking states", () => {
  it("uses valid credentials and gives each documented owner state", async () => {
    const store = createSupabaseOwnershipStore(
      createFakeSupabase(seedFixtureDb()) as unknown as Client,
    );
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
    const supabase = createFakeSupabase(seedFixtureDb());
    const matches = await supabase.from("report_matches").select(`
      id, lost_report_id, found_report_id, explanation, model, created_at, ai_decision,
      supporting_details, contradictions, missing_information, ai_similarity_score,
      lost:reports!report_matches_lost_report_fkey(item_name, description, location),
      found:reports!report_matches_found_report_fkey(item_name, description, location)
    `);
    const reviews = await supabase
      .from("report_candidate_reviews")
      .select("lost_report_id, found_report_id, action, note, created_at");
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
