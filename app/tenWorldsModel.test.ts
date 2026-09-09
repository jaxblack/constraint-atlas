import { describe, expect, it } from "vitest";
import { buildFallback } from "./analysis";
import { buildTenWorldsModel } from "./tenWorldsModel";

describe("buildTenWorldsModel", () => {
  it("maps every social world into one ordered filter membrane", () => {
    const model = buildTenWorldsModel(buildFallback("我想换城市，但不知道会遇到什么制度门槛。"));

    expect(model.layers).toHaveLength(10);
    expect(model.layers.map((layer) => layer.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(model.layers.every((layer, index) => index === 0 || layer.y > model.layers[index - 1].y)).toBe(true);
    expect(model.layers.every((layer) => layer.constraints.length >= 3)).toBe(true);
    expect(model.layers[0].radius).toBeGreaterThan(model.layers.at(-1)!.radius);
    expect(new Set(model.layers.map((layer) => layer.instrument.geometry)).size).toBe(10);
    expect(model.layers.map((layer) => layer.instrument.title)).toEqual([
      "生存筛盘", "公共水脉", "熟人结网", "单轴配给器", "市场齿轮",
      "制度门机", "资产密室", "跨境星盘", "私域资本笼", "全球浑天仪",
    ]);
    expect(model.layers[0].viscosity).toBeGreaterThan(model.layers.at(-1)!.viscosity);
    expect(model.layers[0].inertia).toBeLessThan(model.layers.at(-1)!.inertia);
  });

  it("uses the current world and then world order to break relevance ties", () => {
    const analysis = buildFallback("我需要定位当前环境。");
    analysis.worldAssessments = analysis.worldAssessments.map((assessment) => ({
      ...assessment,
      relevance: assessment.world <= 3 ? 60 : assessment.relevance,
      relation: assessment.world === 3 ? "current" : assessment.relation,
    }));

    expect(buildTenWorldsModel(analysis).primaryWorldID).toBe(3);
  });
});