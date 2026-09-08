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
            layers: [
              { id: 1, label: "底层诉求", description: "真正需要保护的东西" },
              { id: 2, label: "现实边界", description: "短期不可忽略的限制" },
              { id: 3, label: "行动空间", description: "可逆的下一步" },
            ],
            nodes: [
              { id: "need", kind: "need", layer: 1, label: "需要更多自主感", detail: "这是核心需求。" },
              { id: "constraint", kind: "constraint", layer: 2, label: "现金流只能支撑三个月", detail: "这是硬约束。" },
              { id: "action", kind: "action", layer: 3, label: "周末完成一次真实项目", detail: "这是下一步。" },
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

    render(<Home />);

    fireEvent.change(screen.getByRole("textbox", { name: "把你卡住的问题写下来" }), {
      target: { value: "我想转行，但担心收入不稳定，应该现在辞职吗？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始拆解" }));

    expect(await screen.findByText("先用低成本实验验证新方向，而不是立刻辞职。")).toBeInTheDocument();
    expect(screen.getAllByText("01 · 底层诉求")).toHaveLength(2);
    expect(screen.getAllByText("02 · 现实边界")).toHaveLength(2);
    expect(screen.getAllByText("03 · 行动空间")).toHaveLength(2);
    expect(screen.getByText("现金流只能支撑三个月")).toBeInTheDocument();
    expect(screen.getByText("周末完成一次真实项目")).toBeInTheDocument();
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

    expect(await screen.findByText("先验证影响最大且可逆的一条路径。")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/constraint-atlas/api/analyze",
      expect.objectContaining({
        body: expect.stringContaining("两名工程师"),
      }),
    );
  });
});
