// The deficit matrix — the master admin's view of the gate at work.
//
// Pure aggregation: takes raw handbook responses and question-swap rows and
// computes, per root deficit, how often its questions are drawn, answered,
// and sent back. This is the ratio the whole architecture exists to read:
// which deficits a community's questions keep surfacing, and how the answers
// move toward the virtue poles. INTERNAL: rendered only for the master
// admin, never for members or regular admins.

import {
  ALL_DEFICITS,
  QUESTION_DEFICITS,
  THRESHOLD_DEFICITS,
  type AnyDeficitId,
  type RootDeficit,
} from "@meekmeet/core/questions";

export interface DeficitStats {
  deficit: RootDeficit;
  /** Questions authored from this deficit in the bank. */
  inBank: number;
  /** Times a question of this deficit was drawn into a member's handbook. */
  drawn: number;
  /** Drawn questions carrying a written answer. */
  answered: number;
  /** Drawn questions the member sent back for another (the swap log). */
  sentBack: number;
  /** answered / drawn, null when nothing has been drawn yet. */
  answerRate: number | null;
}

export interface HandbookResponseRow {
  responses: { question_id: string; answer?: string }[] | null;
}

export interface SwapRow {
  old_question_id: string;
}

const GATE_MAP: Record<string, AnyDeficitId> = {
  ...QUESTION_DEFICITS,
  ...THRESHOLD_DEFICITS,
};

export function buildDeficitMatrix(
  handbooks: HandbookResponseRow[],
  swaps: SwapRow[]
): DeficitStats[] {
  const inBank = new Map<AnyDeficitId, number>();
  const drawn = new Map<AnyDeficitId, number>();
  const answered = new Map<AnyDeficitId, number>();
  const sentBack = new Map<AnyDeficitId, number>();
  for (const d of ALL_DEFICITS) {
    inBank.set(d.id, 0);
    drawn.set(d.id, 0);
    answered.set(d.id, 0);
    sentBack.set(d.id, 0);
  }

  for (const deficit of Object.values(GATE_MAP)) {
    inBank.set(deficit, (inBank.get(deficit) ?? 0) + 1);
  }

  for (const row of handbooks) {
    for (const r of row.responses ?? []) {
      const deficit = GATE_MAP[r.question_id];
      if (!deficit) continue; // leader customs answer to the leader, not the gate
      drawn.set(deficit, (drawn.get(deficit) ?? 0) + 1);
      if (typeof r.answer === "string" && r.answer.trim().length > 0) {
        answered.set(deficit, (answered.get(deficit) ?? 0) + 1);
      }
    }
  }

  for (const swap of swaps) {
    const deficit = GATE_MAP[swap.old_question_id];
    if (!deficit) continue;
    sentBack.set(deficit, (sentBack.get(deficit) ?? 0) + 1);
  }

  return ALL_DEFICITS.map((deficit) => {
    const d = drawn.get(deficit.id) ?? 0;
    const a = answered.get(deficit.id) ?? 0;
    return {
      deficit,
      inBank: inBank.get(deficit.id) ?? 0,
      drawn: d,
      answered: a,
      sentBack: sentBack.get(deficit.id) ?? 0,
      answerRate: d > 0 ? a / d : null,
    };
  });
}
