import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "./page";

beforeEach(() => localStorage.clear());

describe("Constraint Atlas", () => {
  it("starts directly in the five-category need explorer", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "约束地图" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /探索/ })).toHaveLength(5);
    expect(screen.getByRole("button", { name: "创建自定义目标" })).toBeInTheDocument();
  });

  it("completes an offline case and saves it to history", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "探索 安全稳定" }));
    expect(screen.getByRole("heading", { name: /稳定交付/ })).toBeInTheDocument();
    for (const textbox of screen.getAllByRole("textbox")) {
      if (!(textbox as HTMLInputElement).value) fireEvent.change(textbox, { target: { value: "可执行的回答" } });
    }
    fireEvent.click(screen.getByRole("button", { name: "生成约束地图" }));
    expect(screen.getByRole("heading", { name: "你的行动地图" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "保存到本地历史" }));
    fireEvent.click(screen.getByRole("button", { name: /历史记录/ }));
    expect(screen.getByText(/稳定交付/)).toBeInTheDocument();
    const history = screen.getByTestId("history-list");
    fireEvent.click(within(history).getByRole("button", { name: "删除" }));
    expect(screen.getByText("还没有保存的分析。" )).toBeInTheDocument();
  });

  it("supports a custom target through the goal builder", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "创建自定义目标" }));
    expect(screen.getByRole("heading", { name: "自定义目标" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("目标名称"), { target: { value: "腾出深度工作时间" } });
    expect(screen.getByText("把期待变成可验证的目标" )).toBeInTheDocument();
  });
});
