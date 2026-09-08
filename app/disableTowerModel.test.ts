import { describe, expect, it } from "vitest";
import { buildFallback } from "./analysis";
import { buildDisableTower } from "./disableTowerModel";

describe("buildDisableTower", () => {
  it("maps all attribution into stacked ceilings and layer nodes", () => {
    const model = buildDisableTower(buildFallback("为什么这个按钮对我不可用？"));

    expect(model.totalContribution).toBe(100);
    expect(model.layers).toHaveLength(5);
    expect(model.layers.map((layer) => layer.label)).toEqual(["个人五层需求", "组织与团体", "社会规范", "国家制度", "全球经济"]);
    expect(model.layers.map((layer) => layer.share)).toEqual([18, 28, 14, 18, 22]);
    expect(model.layers.every((layer) => layer.facets.length === 5)).toBe(true);
    expect(model.layers.every((layer, index) => index === 0 || layer.y > model.layers[index - 1].y)).toBe(true);
    expect(model.layers.find((layer) => layer.label === "组织与团体")?.facets.find((facet) => facet.id === "organization.resource")?.share).toBe(28);
    expect(model.layers.find((layer) => layer.label === "国家制度")?.ceilingStrength).toBeCloseTo(.88);
    expect(model.layers.flatMap((layer) => layer.nodes).find((node) => node.id === "global")?.facetLabel).toBe("资本金融");
    expect(model.layers.flatMap((layer) => layer.nodes).some((node) => node.kind === "action" && node.contribution === 0)).toBe(true);
  });
});