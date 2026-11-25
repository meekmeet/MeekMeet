import { describe, it, expect } from "vitest";
import {
  ROOT_DEFICITS,
  SOCIETAL_DEFICITS,
  ALL_DEFICITS,
  QUESTION_DEFICITS,
  THRESHOLD_DEFICITS,
  getDeficitById,
  getDeficitForQuestion,
  deficitDistribution,
  thresholdDeficitDistribution,
  type DeficitId,
} from "./deficits";
import { CIRCLE_TOPICS, allTopicQuestionIds } from "./circle-topics";
import { THRESHOLD_TOPIC, allThresholdQuestionIds } from "./threshold";

describe("the deficit taxonomy", () => {
  it("has exactly seven personal root deficits with unique ids", () => {
    expect(ROOT_DEFICITS).toHaveLength(7);
    const ids = ROOT_DEFICITS.map((d) => d.id);
    expect(new Set(ids).size).toBe(7);
    for (const d of ROOT_DEFICITS) expect(d.kind).toBe("personal");
  });

  it("gives every deficit an essence and all six tradition parallels", () => {
    for (const d of ROOT_DEFICITS) {
      expect(d.essence.length).toBeGreaterThan(60);
      for (const key of ["buddhism", "islam", "judaism", "hinduism", "sikhism", "classical"] as const) {
        expect(d.parallels[key].length).toBeGreaterThan(8);
      }
    }
  });

  it("gives every deficit a virtue pole with its own parallels", () => {
    for (const d of ROOT_DEFICITS) {
      expect(d.virtue.name.length).toBeGreaterThan(3);
      expect(d.virtue.essence.length).toBeGreaterThan(40);
      for (const key of ["buddhism", "islam", "judaism", "hinduism", "sikhism", "classical"] as const) {
        expect(d.virtue.parallels[key].length).toBeGreaterThan(8);
      }
    }
  });

  it("names distinct virtue poles — no two deficits heal into the same virtue", () => {
    const names = ROOT_DEFICITS.map((d) => d.virtue.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("looks up deficits by id", () => {
    expect(getDeficitById("acedia" as never)).toBeNull();
    expect(getDeficitById("sloth")?.name).toBe("Acedia");
    expect(getDeficitById("pride")?.virtue.name).toBe("Humility");
  });
});

describe("the gate — every question is authored from a deficit", () => {
  it("covers every question in the bank, with no orphans", () => {
    const bankIds = new Set(allTopicQuestionIds());
    const gateIds = new Set(Object.keys(QUESTION_DEFICITS));
    // No question without a deficit.
    for (const id of bankIds) expect(gateIds.has(id), `missing gate entry: ${id}`).toBe(true);
    // No gate entry without a question.
    for (const id of gateIds) expect(bankIds.has(id), `orphan gate entry: ${id}`).toBe(true);
  });

  it("maps only to real deficit ids", () => {
    for (const [qid, deficit] of Object.entries(QUESTION_DEFICITS)) {
      expect(getDeficitById(deficit), `${qid} → unknown deficit ${deficit}`).not.toBeNull();
    }
  });

  it("is mathematically balanced: exactly 12 questions per deficit", () => {
    const counts = deficitDistribution();
    for (const d of ROOT_DEFICITS) {
      expect(counts[d.id], `deficit ${d.id} count`).toBe(12);
    }
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(84);
  });

  it("touches all seven deficits in every day-topic", () => {
    for (const topic of CIRCLE_TOPICS) {
      const present = new Set(
        topic.questions.map((q) => QUESTION_DEFICITS[q.id] as DeficitId)
      );
      expect(present.size, `${topic.id} touches ${present.size} deficits`).toBe(7);
    }
  });

  it("keeps each topic's internal distribution within the rotating 2/2/2/2/2/1/1 pattern", () => {
    for (const topic of CIRCLE_TOPICS) {
      const counts = new Map<DeficitId, number>();
      for (const q of topic.questions) {
        const d = QUESTION_DEFICITS[q.id];
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
      const values = [...counts.values()].sort((a, b) => b - a);
      expect(values, topic.id).toEqual([2, 2, 2, 2, 2, 1, 1]);
    }
  });

  it("resolves a question to its full deficit record", () => {
    const deficit = getDeficitForQuestion("hom-1");
    expect(deficit?.id).toBe("sloth");
    expect(deficit?.virtue.name).toContain("Diligence");
  });

  it("returns null for questions outside the gated bank (leader customs)", () => {
    expect(getDeficitForQuestion("custom-1")).toBeNull();
    expect(getDeficitForQuestion("anything-else")).toBeNull();
  });
});

describe("the societal family — the threshold gate", () => {
  it("has exactly five societal deficits with unique ids and the societal kind", () => {
    expect(SOCIETAL_DEFICITS).toHaveLength(5);
    const ids = SOCIETAL_DEFICITS.map((d) => d.id);
    expect(new Set(ids).size).toBe(5);
    for (const d of SOCIETAL_DEFICITS) expect(d.kind).toBe("societal");
  });

  it("names the five the vision requires", () => {
    const byId = Object.fromEntries(SOCIETAL_DEFICITS.map((d) => [d.id, d]));
    expect(byId.stagnation.virtue.name).toBe("Momentum");
    expect(byId.fragmentation.virtue.name).toBe("Cohesion");
    expect(byId.helplessness.virtue.name).toBe("Agency");
    expect(byId.short_sightedness.virtue.name).toBe("Foresight");
    expect(byId.gatekeeping.virtue.name).toBe("Open Access");
  });

  it("gives every societal deficit the full interfaith spine", () => {
    for (const d of SOCIETAL_DEFICITS) {
      expect(d.essence.length).toBeGreaterThan(60);
      for (const key of ["buddhism", "islam", "judaism", "hinduism", "sikhism", "classical"] as const) {
        expect(d.parallels[key].length).toBeGreaterThan(8);
        expect(d.virtue.parallels[key].length).toBeGreaterThan(8);
      }
    }
  });

  it("ALL_DEFICITS unites both families without id collisions", () => {
    expect(ALL_DEFICITS).toHaveLength(12);
    const ids = ALL_DEFICITS.map((d) => d.id);
    expect(new Set(ids).size).toBe(12);
  });

  it("the threshold bank: twenty questions, none fixed to a weekday", () => {
    expect(THRESHOLD_TOPIC.dayOfWeek).toBe(-1);
    expect(THRESHOLD_TOPIC.questions).toHaveLength(20);
    // It is not one of the seven day topics.
    expect(CIRCLE_TOPICS.some((t) => t.id === THRESHOLD_TOPIC.id)).toBe(false);
    for (const q of THRESHOLD_TOPIC.questions) {
      expect(q.text.endsWith("?")).toBe(true);
    }
  });

  it("the threshold gate covers every threshold question, with no orphans", () => {
    const bankIds = new Set(allThresholdQuestionIds());
    const gateIds = new Set(Object.keys(THRESHOLD_DEFICITS));
    for (const id of bankIds) expect(gateIds.has(id), `missing: ${id}`).toBe(true);
    for (const id of gateIds) expect(bankIds.has(id), `orphan: ${id}`).toBe(true);
  });

  it("is mathematically balanced: exactly 4 questions per societal deficit", () => {
    const counts = thresholdDeficitDistribution();
    for (const d of SOCIETAL_DEFICITS) {
      expect(counts[d.id], d.id).toBe(4);
    }
  });

  it("only maps to societal deficit ids", () => {
    const societal = new Set(SOCIETAL_DEFICITS.map((d) => d.id));
    for (const [qid, deficit] of Object.entries(THRESHOLD_DEFICITS)) {
      expect(societal.has(deficit), `${qid} → ${deficit}`).toBe(true);
    }
  });

  it("resolves threshold questions through the same gate function", () => {
    const deficit = getDeficitForQuestion("thr-1");
    expect(deficit?.id).toBe("stagnation");
    expect(deficit?.kind).toBe("societal");
    expect(deficit?.virtue.name).toBe("Momentum");
  });
});
