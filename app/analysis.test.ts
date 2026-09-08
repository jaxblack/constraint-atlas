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
    if (result.success) {
      expect(result.data.layers.map((layer) => layer.label)).toEqual(["个人五层需求", "组织与团体", "社会规范", "国家制度", "全球经济"]);
      expect(result.data.layers.every((layer) => layer.facets.length === 5)).toBe(true);
      expect(result.data.nodes.every((node) => node.facet.includes("."))).toBe(true);
    }
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

  it("normalizes causal attribution to 100 without blaming choices or actions", () => {
    const result = analysisSchema.parse({
      title: "为什么按钮是灰的",
      conclusion: "主要阻塞来自制度权限和资源。",
      layers: [
        { id: 1, label: "物理与时间", description: "不可绕过的底层边界" },
        { id: 2, label: "制度与权限", description: "账号在系统中的许可" },
        { id: 3, label: "选择与行动", description: "仍可调整的策略" },
      ],
      nodes: [
        { id: "time", kind: "fact", layer: 1, contribution: 10, label: "时间窗口", detail: "一天只有二十四小时。" },
        { id: "permission", kind: "constraint", layer: 2, contribution: 50, label: "缺少权限", detail: "当前身份不能批准。" },
        { id: "money", kind: "constraint", layer: 2, contribution: 20, label: "预算不足", detail: "当前预算无法覆盖。" },
        { id: "route", kind: "choice", layer: 3, contribution: 80, label: "换账号", detail: "选择不是阻塞原因。" },
        { id: "ask", kind: "action", layer: 3, contribution: 90, label: "申请权限", detail: "行动不是阻塞原因。" },
      ],
      edges: [
        { source: "time", target: "permission", relation: "限制" },
        { source: "permission", target: "route", relation: "迫使" },
        { source: "money", target: "ask", relation: "需要" },
      ],
    });

    expect(result.nodes.reduce((sum, node) => sum + node.contribution, 0)).toBe(100);
    expect(result.layers).toHaveLength(5);
    expect(result.nodes.find((node) => node.id === "money")?.facet).toBe("organization.resource");
    expect(result.nodes.find((node) => node.id === "route")?.contribution).toBe(0);
    expect(result.nodes.find((node) => node.id === "ask")?.contribution).toBe(0);
  });

  it("accepts compact model output without repeating the fixed world catalog", () => {
    const result = analysisSchema.parse({
      title: "组织资源取舍",
      conclusion: "先验证组织资源约束。",
      nodes: [
        { id: "need", kind: "need", layer: 1, facet: "personal.growth", contribution: 25, label: "成长需要", detail: "需要创造空间。" },
        { id: "people", kind: "constraint", layer: 2, facet: "organization.resource", contribution: 75, label: "人力不足", detail: "只有两名工程师。" },
        { id: "probe", kind: "action", layer: 2, facet: "organization.governance", label: "一周实验", detail: "只验证一条产品线。" },
      ],
      edges: [
        { source: "need", target: "people", relation: "受限于" },
        { source: "people", target: "probe", relation: "需要验证" },
      ],
    });

    expect(result.layers).toHaveLength(5);
    expect(result.nodes.find((node) => node.id === "people")?.layer).toBe(2);
    expect(result.nodes.find((node) => node.id === "people")?.facet).toBe("organization.resource");
  });
});