import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

describe("Home", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("turns a stuck question into an actionable constraint map", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          analysis: {
            title: "是否现在转行",
            conclusion: "先用低成本实验验证新方向，而不是立刻辞职。",
            disablement: { target: "在收入不断的前提下转行", status: "mixed", topBlocker: "现金流约束" },
            scales: [
              { id: "micro", diagnosis: "现金流不足以支持裸辞。", prediction: "直接裸辞会快速增加决策压力。", nextStep: "计算六个月安全垫。" },
              { id: "meso", diagnosis: "成长停滞已经重复出现。", prediction: "不改变工作内容会继续消耗自主感。", nextStep: "验证三个外部岗位。" },
              { id: "macro", diagnosis: "劳动市场用持续收入约束职业切换。", prediction: "有稀缺技能时转换成本下降。", nextStep: "用作品验证稀缺性。" },
            ],
            theoryAudit: { function: "navigation", predictivePower: 72, explanation: "它能推出可验证的求职策略。", falsifier: "若外部岗位验证仍无改善，则模型不足。" },
            worldAssessments: [
              { world: 5, relation: "barrier", relevance: 70, viscosity: 78, inertia: 22, bindingConstraintIDs: ["w5-labor"], diagnosis: "高竞争城市的劳动力市场压低转行议价权。", evidenceNeeded: "核验目标岗位候选数量与真实薪资。" },
            ],
            layers: [
              { id: 1, domain: "personal", label: "个人五层需求", description: "个人需要" },
              { id: 2, domain: "organization", label: "组织与团体", description: "组织机制" },
              { id: 3, domain: "norm", label: "社会规范", description: "社会期待" },
              { id: 4, domain: "state", label: "国家制度", description: "正式制度" },
              { id: 5, domain: "global", label: "全球经济", description: "外部系统" },
            ],
            nodes: [
              { id: "need", kind: "need", layer: 1, facet: "personal.growth", contribution: 30, confidence: 80, disableState: "temporary", intervention: "experiment", label: "需要更多自主感", detail: "这是核心需求。" },
              { id: "constraint", kind: "constraint", layer: 2, facet: "organization.resource", contribution: 70, confidence: 95, disableState: "resource", intervention: "acquire", label: "现金流只能支撑三个月", detail: "这是硬约束。" },
              { id: "action", kind: "action", layer: 2, facet: "organization.governance", contribution: 0, confidence: 90, disableState: "none", intervention: "experiment", label: "周末完成一次真实项目", detail: "这是下一步。" },
            ],
            edges: [
              { source: "need", target: "constraint", relation: "受限于" },
              { source: "constraint", target: "action", relation: "转化为" },
            ],
          },
          source: "model",
        }),
      }),
    );

    const { container } = render(<Home />);

    fireEvent.change(screen.getByRole("textbox", { name: "把你卡住的问题写下来" }), {
      target: { value: "我想转行，但担心收入不稳定，应该现在辞职吗？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始拆解" }));

    expect(await screen.findByText("先用低成本实验验证新方向，而不是立刻辞职。")).toBeInTheDocument();
    expect(screen.getAllByText("01 · 个人五层需求")).toHaveLength(3);
    expect(screen.getAllByText("02 · 组织与团体")).toHaveLength(3);
    expect(screen.getAllByText("05 · 全球经济")).toHaveLength(3);
    expect(screen.getAllByText("现金流只能支撑三个月")).toHaveLength(2);
    expect(screen.getByText("周末完成一次真实项目")).toBeInTheDocument();
    expect(screen.getByText("受限于")).toBeInTheDocument();
    expect(screen.getByText("转化为")).toBeInTheDocument();
    expect(container.querySelectorAll(".causal-connector")).toHaveLength(2);
    expect(screen.getByText("100% Disable 归因")).toBeInTheDocument();
    expect(screen.getAllByText("70%").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "微观模式" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "中观模式" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "宏观模式" })).toBeInTheDocument();
    expect(screen.getByText("导航模型")).toBeInTheDocument();
    expect(screen.getByLabelText("十重社会世界过滤膜")).toBeInTheDocument();
    expect(screen.getByText("社会如何计算并分流你")).toBeInTheDocument();
    expect(screen.getByText("SOCIAL SORTING NETWORK · 十重世")).toBeInTheDocument();
    expect(screen.getByLabelText("社会筛选算法概览")).toHaveTextContent("人物向量");
    expect(screen.getByText("SELECTION KERNEL")).toBeInTheDocument();
    expect(screen.getByText("累计 feature 评估")).toBeInTheDocument();
    expect(screen.getByText("概念模拟，非人口统计或个体预测")).toBeInTheDocument();
    expect(screen.getAllByText("市场齿轮").length).toBeGreaterThan(0);
    expect(await screen.findByText("3D 场景不可用")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /理论原文/ })).toHaveAttribute("href", "https://bestcoder.cn/%E5%8D%81%E9%87%8D%E4%B8%96");
    expect(screen.getAllByText("高竞争城市市场").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("高竞争城市的劳动力市场压低转行议价权。")).toBeInTheDocument();
    expect(screen.getAllByText("劳动力竞争")).toHaveLength(2);
    expect(screen.getByText("当前绑定")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /就业与社会保障政策/ })).toHaveAttribute("href", "https://www.mohrss.gov.cn/xxgk2020/fdzdgknr/zcfg/");
    const detailsSummary = screen.getByText("展开五类约束与二维因果图");
    const details = detailsSummary.closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(detailsSummary);
    expect(details).toHaveAttribute("open");
    fireEvent.click(screen.getByRole("tab", { name: "宏观模式" }));
    expect(screen.getByText("劳动市场用持续收入约束职业切换。")).toBeInTheDocument();
  });

  it("runs a built-in test case with one click", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        analysis: {
          title: "产品资源取舍",
          conclusion: "先验证影响最大且可逆的一条路径。",
          layers: [
            { id: 1, label: "目标层", description: "需要达成的结果" },
            { id: 2, label: "约束层", description: "限制行动的条件" },
            { id: 3, label: "实验层", description: "用行动获得证据" },
          ],
          nodes: [
            { id: "need", kind: "need", layer: 1, label: "形成共识", detail: "团队需要清晰优先级。" },
            { id: "constraint", kind: "constraint", layer: 2, label: "只有两名工程师", detail: "并行能力有限。" },
            { id: "action", kind: "action", layer: 3, label: "做一周验证", detail: "用真实用户反馈排序。" },
          ],
          edges: [
            { source: "need", target: "constraint", relation: "受限于" },
            { source: "constraint", target: "action", relation: "转化为" },
          ],
        },
        source: "model",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);

    expect(screen.getAllByRole("button", { name: /运行案例：/ })).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "运行案例：资源有限时先做哪条产品线" }));

    expect((await screen.findAllByText("先验证影响最大且可逆的一条路径。")).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/constraint-atlas/api/analyze",
      expect.objectContaining({
        body: expect.stringContaining("两名工程师"),
      }),
    );
  });
});
