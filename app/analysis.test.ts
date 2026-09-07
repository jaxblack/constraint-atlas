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
});