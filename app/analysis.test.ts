import { describe, expect, it } from "vitest";
import { analysisSchema } from "./analysis";

describe("analysisSchema", () => {
  it("accepts a detailed model conclusion without dropping the map", () => {
    const result = analysisSchema.safeParse({
      title: "产品资源取舍",
      conclusion: "先验证影响最大且可逆的一条路径。".repeat(35),
      nodes: [
        { id: "need", kind: "need", label: "形成共识", detail: "团队需要清晰优先级。" },
        { id: "constraint", kind: "constraint", label: "人力有限", detail: "只有两名工程师。" },
        { id: "action", kind: "action", label: "一周验证", detail: "用真实用户反馈排序。" },
      ],
      edges: [
        { source: "need", target: "constraint", relation: "受限于" },
        { source: "constraint", target: "action", relation: "转化为" },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts mixed node kinds across explicit causal layers", () => {
    const result = analysisSchema.safeParse({
      title: "分层制度地图",
      conclusion: "从底层规则逐层推导到行动。",
      layers: [
        { id: 1, label: "底层边界", description: "短期无法绕开的规则" },
        { id: 2, label: "制度约束", description: "由底层边界形成的机制" },
        { id: 3, label: "行动空间", description: "仍可选择和验证的路径" },
      ],
      nodes: [
        { id: "law", kind: "fact", layer: 1, label: "物理规则", detail: "资源总量有限。" },
        { id: "need", kind: "need", layer: 1, label: "安全需要", detail: "同层存在不同类型。" },
        { id: "institution", kind: "constraint", layer: 2, label: "社会制度", detail: "制度放大部分边界。" },
        { id: "choice", kind: "choice", layer: 3, label: "可逆试验", detail: "保留调整空间。" },
        { id: "action", kind: "action", layer: 3, label: "本周行动", detail: "同层包含选择和行动。" },
      ],
      edges: [
        { source: "law", target: "institution", relation: "塑造" },
        { source: "need", target: "institution", relation: "被协调" },
        { source: "institution", target: "choice", relation: "限制" },
        { source: "choice", target: "action", relation: "落实" },
      ],
    });

    expect(result.success).toBe(true);
  });
});