import { describe, expect, it } from "vitest";
import { buildFallback } from "./analysis";
import { buildSocialSortingModel, rejectedStageForRank, socialFeatureAxes } from "./socialSortingModel";

describe("buildSocialSortingModel", () => {
  it("models repeated feature crossing, filtering, evaporation, and resource upflow", () => {
    const model = buildSocialSortingModel(buildFallback("我想进入新的社会环境，但现有资源和资格不足。"));

    expect(model.dimensions).toBe(socialFeatureAxes.length);
    expect(model.stages).toHaveLength(10);
    expect(model.crossCount).toBeGreaterThan(model.vectorCount * model.dimensions);
    expect(model.stages.every((stage, index) => index === 0 || stage.input === model.stages[index - 1].passed)).toBe(true);
    expect(model.stages.every((stage) => stage.passed < stage.input && stage.filtered > 0)).toBe(true);
    expect(model.stages.every((stage, index) => index === 0 || stage.cumulativeResource >= model.stages[index - 1].cumulativeResource)).toBe(true);
    expect(model.totalFiltered).toBe(model.vectorCount - model.finalSurvivors);
    expect(model.resourceUpflow).toBe(model.stages.at(-1)!.cumulativeResource);
      expect(model.feedbackCount).toBe(10);
      expect(model.stages.every((stage) => stage.feedbackAdjustment > 0)).toBe(true);
    expect(new Set(model.stages.map((stage) => stage.activeFeatures.join("/"))).size).toBe(10);
    expect(rejectedStageForRank(0, model)).toBeUndefined();
    expect(rejectedStageForRank(model.vectorCount - 1, model)).toBe(0);
  });

  it("preserves one filtering event for every stage under maximum pressure", () => {
    const analysis = buildFallback("我处在高压筛选环境中，需要理解每层过滤。 ");
    analysis.worldAssessments = analysis.worldAssessments.map((assessment) => ({
      ...assessment,
      relevance: 100,
      viscosity: 100,
      inertia: 0,
    }));

    const model = buildSocialSortingModel(analysis);

    expect(model.stages.every((stage) => stage.filtered >= 1)).toBe(true);
    expect(model.stages.at(-1)!.passed).toBe(1);
  });
});