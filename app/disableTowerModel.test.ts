import { describe, expect, it } from "vitest";
import { buildFallback } from "./analysis";
import { buildDisableTower } from "./disableTowerModel";

describe("buildDisableTower", () => {
  it("maps all attribution into stacked ceilings and layer nodes", () => {
    const model = buildDisableTower(buildFallback("为什么这个按钮对我不可用？"));

    expect(model.totalContribution).toBe(100);
    expect(model.layers).toHaveLength(5);
    expect(model.layers.map((layer) => layer.share)).toEqual([10, 20, 30, 20, 20]);
    expect(model.layers.every((layer, index) => index === 0 || layer.y > model.layers[index - 1].y)).toBe(true);
    expect(model.layers.find((layer) => layer.label === "物理与时间")?.ceilingStrength).toBe(1);
    expect(model.layers.find((layer) => layer.label === "资源与工具")?.ceilingStrength).toBeCloseTo(.72);
    expect(model.layers.flatMap((layer) => layer.nodes).some((node) => node.kind === "action" && node.contribution === 0)).toBe(true);
  });
});