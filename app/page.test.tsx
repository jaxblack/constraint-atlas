import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

describe("Home", () => {
  afterEach(() => {
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
            nodes: [
              { id: "need", kind: "need", label: "需要更多自主感", detail: "这是核心需求。" },
              { id: "constraint", kind: "constraint", label: "现金流只能支撑三个月", detail: "这是硬约束。" },
              { id: "action", kind: "action", label: "周末完成一次真实项目", detail: "这是下一步。" },
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
    expect(screen.getByText("现金流只能支撑三个月")).toBeInTheDocument();
    expect(screen.getByText("周末完成一次真实项目")).toBeInTheDocument();
  });
});
