import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ownerView, type VerificationRecord } from "@/utils/ownership/service";
import { isLocalAdminEnabled } from "@/utils/supabase/admin";
import {
  buildCandidateQueues,
  compareForStaff,
  isPotentialCandidate,
  manualCandidateInsert,
  staffReviewGate,
  type CandidateReport,
  type StoredPairResult,
} from "@/utils/matching/candidates";

// Local fixtures only. No Gemini calls and no database calls.

const walletLost: CandidateReport = {
  item_name: "Green wallet",
  description: "Green Bottega wallet, lost near the library.",
  location: "Library",
};

const walletFound: CandidateReport = {
  item_name: "Wallet",
  description: "Green Bottega leather wallet. A student card was inside.",
  location: "Library entrance",
};

const walletStored: StoredPairResult = {
  ai_decision: "insufficient_information",
  ai_similarity_score: 18,
  supporting_details: ["Both are green Bottega wallets"],
  contradictions: [],
  missing_information: ["The found report mentions a student card the owner did not describe"],
  model: "gemini-3.5-flash-lite",
};

const bottleLost: CandidateReport = {
  item_name: "Blue water bottle",
  description: "Blue water bottle with a plain lid.",
  location: "Cafeteria",
};

const scarfFound: CandidateReport = {
  item_name: "Blue scarf",
  description: "Blue scarf found on a chair.",
  location: "Cafeteria",
};

const colorOnlyStored: StoredPairResult = {
  ai_decision: "insufficient_information",
  ai_similarity_score: 55,
  supporting_details: ["Both mention green"],
  contradictions: [],
  missing_information: [],
  model: "gemini-3.5-flash-lite",
};

function walletMatch(overrides: Partial<StoredPairResult> = {}) {
  return {
    id: "wallet-pair",
    lost_report_id: "lost-wallet",
    found_report_id: "found-wallet",
    explanation: "Not enough specific detail to confirm.",
    created_at: "2026-11-01T08:00:00.000Z",
    lost: walletLost,
    found: walletFound,
    ...walletStored,
    ...overrides,
  };
}

describe("potential candidates", () => {
  it("uses a stored wallet type when the report titles only say Bottega", () => {
    const lost: CandidateReport = {
      item_name: "Green Bottega",
      description: "Green Bottega, lost near the library.",
      location: "Library",
    };
    const found: CandidateReport = {
      item_name: "Green Bottega",
      description: "Green Bottega leather. A student card was inside.",
      location: "Library entrance",
    };

    assert.equal(isPotentialCandidate(lost, found, walletStored), true);
    assert.equal(isPotentialCandidate(bottleLost, scarfFound, colorOnlyStored), false);
  });

  it("keeps the stored green Bottega wallet pair reviewable at a low score", () => {
    const comparison = compareForStaff(walletLost, walletFound, walletStored);

    assert.equal(isPotentialCandidate(walletLost, walletFound, walletStored), true);
    assert.equal(walletStored.ai_similarity_score, 18);
    assert.ok(comparison.overlap.some((line) => /bottega/i.test(line)));
    assert.ok(comparison.overlap.some((line) => /wallet/i.test(line)));
    assert.ok(comparison.unknown.some((line) => /card/i.test(line)));
    assert.equal(
      comparison.differences.some((line) => /card/i.test(line)),
      false,
    );
  });

  it("does not treat a finder-only contents detail as a reason to drop the wallet", () => {
    const withContents = {
      ...walletStored,
      missing_information: ["Student card was inside the found wallet"],
      ai_similarity_score: 0,
    };

    assert.equal(isPotentialCandidate(walletLost, walletFound, withContents), true);
  });

  it("rejects different item types that only share a color", () => {
    assert.equal(isPotentialCandidate(bottleLost, scarfFound, colorOnlyStored), false);

    const redBackpack: CandidateReport = {
      item_name: "Red backpack",
      description: "Red backpack with a laptop sleeve.",
      location: "Cafeteria",
    };
    const greenWallet: CandidateReport = {
      item_name: "Green wallet",
      description: "Green leather wallet.",
      location: "Cafeteria",
    };
    assert.equal(isPotentialCandidate(redBackpack, greenWallet, colorOnlyStored), false);
  });

  it("rejects two wallets that share no color and no specific clue", () => {
    const lost: CandidateReport = {
      item_name: "Wallet",
      description: "I lost my wallet yesterday.",
      location: "Campus",
    };
    const found: CandidateReport = {
      item_name: "Wallet",
      description: "A wallet was found today.",
      location: "Building",
    };
    assert.equal(
      isPotentialCandidate(lost, found, { ...walletStored, supporting_details: [], missing_information: [] }),
      false,
    );
  });

  it("leaves a dismissed wallet out of the open queue and does not change the saved AI decision", () => {
    const match = walletMatch();
    const openQueue = buildCandidateQueues([match], []);
    assert.equal(openQueue.open.length, 1);
    assert.equal(openQueue.open[0]?.score, 18);
    assert.equal(openQueue.open[0]?.comparison.plausible, true);

    const afterDismiss = buildCandidateQueues(
      [match],
      [
        {
          lost_report_id: "lost-wallet",
          found_report_id: "found-wallet",
          action: "ownership_review",
          note: null,
          created_at: "2026-11-01T09:00:00.000Z",
        },
        {
          lost_report_id: "lost-wallet",
          found_report_id: "found-wallet",
          action: "dismissed",
          note: "Different stitching",
          created_at: "2026-11-01T10:00:00.000Z",
        },
      ],
    );

    assert.equal(afterDismiss.open.length, 0);
    assert.equal(afterDismiss.dismissed.length, 1);
    assert.equal(afterDismiss.dismissed[0]?.review?.action, "dismissed");
    assert.equal(match.ai_decision, "insufficient_information");
  });

  it("keeps a staff-marked wallet in the open queue without calling it a confirmed match", () => {
    const queues = buildCandidateQueues(
      [walletMatch()],
      [
        {
          lost_report_id: "lost-wallet",
          found_report_id: "found-wallet",
          action: "ownership_review",
          note: "Worth asking the owner",
          created_at: "2026-11-01T09:00:00.000Z",
        },
      ],
    );

    assert.equal(queues.open.length, 1);
    assert.equal(queues.open[0]?.review?.action, "ownership_review");
    assert.equal(queues.open[0]?.comparison.plausible, true);
    assert.notEqual(queues.open[0]?.model, "staff");
  });

  it("does not put an obvious non-match or an AI match into the candidate queue", () => {
    const queues = buildCandidateQueues(
      [
        {
          ...walletMatch({ ai_decision: "match", ai_similarity_score: 90 }),
          id: "ai-match",
        },
        {
          id: "color-only",
          lost_report_id: "lost-bottle",
          found_report_id: "found-scarf",
          explanation: "Only the color overlaps.",
          created_at: "2026-11-01T07:00:00.000Z",
          lost: bottleLost,
          found: scarfFound,
          ...colorOnlyStored,
        },
      ],
      [],
    );

    assert.deepEqual(queues.open, []);
    assert.deepEqual(queues.dismissed, []);
  });
});

describe("staff-only access", () => {
  it("closes candidate review outside development", () => {
    assert.notEqual(process.env.NODE_ENV, "development");
    assert.equal(isLocalAdminEnabled(), false);
    assert.deepEqual(staffReviewGate(false), { ok: false, message: "Not available." });
    assert.deepEqual(staffReviewGate(isLocalAdminEnabled()), {
      ok: false,
      message: "Not available.",
    });
    assert.deepEqual(staffReviewGate(true), { ok: true });
  });
});

describe("owner privacy", () => {
  it("does not include the found wallet or the staff comparison in the owner view", () => {
    const comparison = compareForStaff(walletLost, walletFound, walletStored);
    const staffText = JSON.stringify({
      lost: walletLost,
      found: walletFound,
      comparison,
    });
    assert.ok(staffText.includes(walletFound.description));

    const record: VerificationRecord = {
      id: "verification-1",
      lostReportId: "lost-wallet",
      reportMatchId: "wallet-pair",
      questions: ["What color is your wallet?"],
      expectedDetails: [walletFound.description, "student card was inside"],
      answers: [],
      assessment: { assessment: "supports", explanation: "The private answers agree." },
      latestDecision: null,
      followup: null,
    };

    const ownerText = JSON.stringify(ownerView(record));
    for (const secret of [
      walletFound.description,
      walletFound.item_name,
      "Bottega",
      "student card",
      "Shared detail",
      "The private answers agree",
      "supports",
      "wallet-pair",
    ]) {
      assert.equal(ownerText.includes(secret), false, `owner view leaked: ${secret}`);
    }
    assert.equal(ownerText.includes("What color is your wallet?"), true);
  });
});

describe("manual candidates", () => {
  it("saves a staff pair as not enough information and not a confirmed match", () => {
    const inserted = manualCandidateInsert(walletLost, walletFound, "Check the library wallets");

    assert.equal(inserted.model, "staff");
    assert.equal(inserted.ai_decision, "insufficient_information");
    assert.equal(inserted.explanation, "Check the library wallets");
    assert.equal("ai_similarity_score" in inserted, false);
    assert.ok(inserted.supporting_details.some((line) => /bottega/i.test(line)));
  });
});
