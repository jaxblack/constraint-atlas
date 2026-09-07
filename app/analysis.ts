import { z } from "zod";

export const nodeKinds = ["need", "fact", "constraint", "choice", "action"] as const;

export const analysisSchema = z.object({
  title: z.string().min(1).max(80),
  conclusion: z.string().min(1).max(1200),
  nodes: z.array(z.object({
    id: z.string().min(1).max(40),
    kind: z.enum(nodeKinds),
    label: z.string().min(1).max(100),
    detail: z.string().min(1).max(300),
  })).min(3).max(12),
  edges: z.array(z.object({
    source: z.string().min(1).max(40),
    target: z.string().min(1).max(40),
    relation: z.string().min(1).max(30),
  })).min(2).max(20),
}).superRefine((analysis, ctx) => {
  const ids = new Set(analysis.nodes.map((node) => node.id));
  for (const edge of analysis.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      ctx.addIssue({ code: "custom", message: "edge references an unknown node" });
    }
  }
});

export const analyzeRequestSchema = z.object({
  question: z.string().trim().min(8).max(2000),
});

export type Analysis = z.infer<typeof analysisSchema>;

export function buildFallback(question: string): Analysis {
  const subject = question.replace(/[？?。.!！]+$/u, "").slice(0, 34);
  return {
    title: subject || "当前困局",
    conclusion: "先不要把选择压成一次豪赌。分开核实事实与假设，再做一个成本可控、可逆的小实验。",
    nodes: [
      { id: "need", kind: "need", label: "真正想保护的东西", detail: "写下你希望得到的改变，以及最不愿失去的部分。" },
      { id: "fact", kind: "fact", label: "已知事实", detail: "只保留能被观察或验证的信息，暂时拿掉猜测。" },
      { id: "constraint", kind: "constraint", label: "当前硬约束", detail: "时间、现金、承诺和健康等短期内不能忽略的边界。" },
      { id: "choice", kind: "choice", label: "可逆的小选择", detail: "找一个不会锁死后路、但能带来新信息的实验。" },
      { id: "action", kind: "action", label: "48 小时行动", detail: "约一个关键对话，或完成一次最小真实测试并记录结果。" },
    ],
    edges: [
      { source: "need", target: "fact", relation: "需要核实" },
      { source: "fact", target: "constraint", relation: "界定" },
      { source: "constraint", target: "choice", relation: "缩小范围" },
      { source: "choice", target: "action", relation: "落实为" },
    ],
  };
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}