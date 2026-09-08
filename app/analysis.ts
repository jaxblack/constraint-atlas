import { z } from "zod";

export const nodeKinds = ["need", "fact", "constraint", "choice", "action"] as const;

const layerSchema = z.object({
  id: z.number().int().min(1).max(6),
  label: z.string().min(1).max(40),
  description: z.string().min(1).max(160),
});

const rawAnalysisSchema = z.object({
  title: z.string().min(1).max(80),
  conclusion: z.string().min(1).max(1200),
  layers: z.array(layerSchema).min(2).max(6).optional(),
  nodes: z.array(z.object({
    id: z.string().min(1).max(40),
    kind: z.enum(nodeKinds),
    layer: z.number().int().min(1).max(6).optional(),
    label: z.string().min(1).max(100),
    detail: z.string().min(1).max(300),
  })).min(3).max(12),
  edges: z.array(z.object({
    source: z.string().min(1).max(40),
    target: z.string().min(1).max(40),
    relation: z.string().min(1).max(30),
  })).min(2).max(20),
});

type RawAnalysis = z.infer<typeof rawAnalysisSchema>;
type NodeKind = typeof nodeKinds[number];

export type AnalysisLayer = z.infer<typeof layerSchema>;
export type Analysis = Omit<RawAnalysis, "layers" | "nodes"> & {
  layers: AnalysisLayer[];
  nodes: Array<Omit<RawAnalysis["nodes"][number], "layer"> & { layer: number }>;
};

const derivedLayerCopy = [
  ["根基层", "最底层的事实、需要与不可绕过的条件"],
  ["结构层", "由底层条件形成的关系与约束"],
  ["机制层", "推动问题持续运转的中间机制"],
  ["决策层", "可以权衡、改变或试验的空间"],
  ["行动层", "能够执行并产生新信息的动作"],
  ["反馈层", "行动之后需要观察的结果与反馈"],
] as const;

const fallbackKindLayer: Record<NodeKind, number> = {
  need: 1,
  fact: 1,
  constraint: 2,
  choice: 3,
  action: 4,
};

function deriveLayers(analysis: RawAnalysis): Analysis {
  const ids = new Set(analysis.nodes.map((node) => node.id));
  const indegree = new Map(analysis.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(analysis.nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of analysis.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) continue;
    outgoing.get(edge.source)?.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const depth = new Map(analysis.nodes.map((node) => [node.id, 1]));
  const queue = analysis.nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const visited = new Set<string>();
  while (queue.length > 0) {
    const source = queue.shift()!;
    visited.add(source);
    for (const target of outgoing.get(source) ?? []) {
      depth.set(target, Math.min(6, Math.max(depth.get(target) ?? 1, (depth.get(source) ?? 1) + 1)));
      indegree.set(target, (indegree.get(target) ?? 1) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    }
  }

  const rawLevels = analysis.nodes.map((node) => visited.has(node.id) ? (depth.get(node.id) ?? 1) : fallbackKindLayer[node.kind]);
  const usedLevels = [...new Set(rawLevels)].sort((left, right) => left - right);
  const compactLevel = new Map(usedLevels.map((level, index) => [level, index + 1]));
  const nodes = analysis.nodes.map((node, index) => ({ ...node, layer: compactLevel.get(rawLevels[index]) ?? 1 }));
  const layerIDs = [...new Set(nodes.map((node) => node.layer))].sort((left, right) => left - right);
  const layers = layerIDs.map((id) => ({ id, label: derivedLayerCopy[id - 1][0], description: derivedLayerCopy[id - 1][1] }));
  return { ...analysis, layers, nodes };
}

export function normalizeAnalysis(analysis: RawAnalysis): Analysis {
  const layerIDs = new Set(analysis.layers?.map((layer) => layer.id) ?? []);
  const hasExplicitLayers = layerIDs.size >= 2 && analysis.nodes.every((node) => node.layer !== undefined && layerIDs.has(node.layer));
  if (!hasExplicitLayers) return deriveLayers(analysis);
  return {
    ...analysis,
    layers: [...analysis.layers!].sort((left, right) => left.id - right.id),
    nodes: analysis.nodes.map((node) => ({ ...node, layer: node.layer! })),
  };
}

export const analysisSchema = rawAnalysisSchema.transform(normalizeAnalysis).superRefine((analysis, ctx) => {
  const ids = new Set(analysis.nodes.map((node) => node.id));
  if (ids.size !== analysis.nodes.length) {
    ctx.addIssue({ code: "custom", message: "node ids must be unique" });
  }
  const layerIDs = new Set(analysis.layers.map((layer) => layer.id));
  if (layerIDs.size !== analysis.layers.length) {
    ctx.addIssue({ code: "custom", message: "layer ids must be unique" });
  }
  for (const edge of analysis.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      ctx.addIssue({ code: "custom", message: "edge references an unknown node" });
    }
  }
});

export const analyzeRequestSchema = z.object({
  question: z.string().trim().min(8).max(2000),
});

export function buildFallback(question: string): Analysis {
  const subject = question.replace(/[？?。.!！]+$/u, "").slice(0, 34);
  return {
    title: subject || "当前困局",
    conclusion: "先不要把选择压成一次豪赌。分开核实事实与假设，再做一个成本可控、可逆的小实验。",
    layers: [
      { id: 1, label: "根本诉求", description: "真正想保护、获得或避免失去的东西" },
      { id: 2, label: "事实基础", description: "已经发生并且能够核实的信息" },
      { id: 3, label: "边界约束", description: "短期内不能忽略的资源与规则" },
      { id: 4, label: "选择空间", description: "仍然可逆、可比较、可试验的路径" },
      { id: 5, label: "行动反馈", description: "用行动换取新证据，再回看上层判断" },
    ],
    nodes: [
      { id: "need", kind: "need", layer: 1, label: "真正想保护的东西", detail: "写下你希望得到的改变，以及最不愿失去的部分。" },
      { id: "fact", kind: "fact", layer: 2, label: "已知事实", detail: "只保留能被观察或验证的信息，暂时拿掉猜测。" },
      { id: "constraint", kind: "constraint", layer: 3, label: "当前硬约束", detail: "时间、现金、承诺和健康等短期内不能忽略的边界。" },
      { id: "choice", kind: "choice", layer: 4, label: "可逆的小选择", detail: "找一个不会锁死后路、但能带来新信息的实验。" },
      { id: "action", kind: "action", layer: 5, label: "48 小时行动", detail: "约一个关键对话，或完成一次最小真实测试并记录结果。" },
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