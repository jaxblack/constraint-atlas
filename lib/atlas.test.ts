import { describe, expect, it } from "vitest";
import { analysisSchema, buildAnalysis, explorerCases, needTypes } from "./atlas";

describe("Constraint Atlas domain", () => {
  it("provides one complete offline case for every need explorer", () => {
    expect(explorerCases).toHaveLength(5);
    expect(new Set(explorerCases.map((item) => item.need))).toEqual(new Set(needTypes));
    for (const item of explorerCases) {
      expect(item.questions.length).toBeGreaterThanOrEqual(3);
      expect(item.exampleAnswers).toHaveLength(item.questions.length);
      expect(item.constraints.length).toBeGreaterThan(0);
      expect(item.resources.length).toBeGreaterThan(0);
    }
  });

  it("builds an analysis accepted by the strict schema", () => {
    const sample = explorerCases[0];
    const result = buildAnalysis({
      title: sample.title,
      context: sample.context,
      need: sample.need,
      answers: sample.questions.map((question, index) => ({ questionId: question.id, question: question.label, answer: sample.exampleAnswers[index] })),
      outcome: sample.suggestedGoal.outcome,
      metric: sample.suggestedGoal.metric,
      deadline: "2027-01-30",
      firstStep: sample.suggestedGoal.firstStep,
      source: "case",
    });

    expect(analysisSchema.parse(result)).toEqual(result);
    expect(result.map.constraints.length).toBeGreaterThan(0);
    expect(result.map.actions[0]).toContain(sample.suggestedGoal.firstStep);
  });

  it("rejects unknown fields at every schema boundary", () => {
    const sample = buildAnalysis({
      title: "自定义目标",
      context: "希望改善当下局面",
      need: "自主掌控",
      answers: [{ questionId: "x", question: "问题", answer: "回答" }],
      outcome: "获得更多自主时间",
      metric: "每周两个专注时段",
      deadline: "2027-02-01",
      firstStep: "锁定下周第一个时段",
      source: "custom",
    });
    expect(() => analysisSchema.parse({ ...sample, unexpected: true })).toThrow();
    expect(() => analysisSchema.parse({ ...sample, goal: { ...sample.goal, unexpected: true } })).toThrow();
  });
});
