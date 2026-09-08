import { z } from "zod";

export const nodeKinds = ["need", "fact", "constraint", "choice", "action"] as const;
export const disableStates = ["hard", "capability", "resource", "permission", "coordination", "temporary", "none"] as const;
export const interventions = ["accept", "train", "acquire", "negotiate", "reroute", "wait", "exit", "experiment"] as const;
export const scaleIDs = ["micro", "meso", "macro"] as const;

const layerSchema = z.object({
  id: z.number().int().min(1).max(6),
  domain: z.enum(["physical", "capability", "resource", "institution", "social", "custom"]).optional(),
  label: z.string().min(1).max(40),
  description: z.string().min(1).max(160),
});

const disablementSchema = z.object({
  target: z.string().min(1).max(160),
  status: z.enum(["hard_disabled", "permission_required", "temporarily_unavailable", "mixed"]),
  topBlocker: z.string().min(1).max(160),
});

const scaleSchema = z.object({
  id: z.enum(scaleIDs),
  diagnosis: z.string().min(1).max(500),
  prediction: z.string().min(1).max(500),
  nextStep: z.string().min(1).max(300),
});

const theoryAuditSchema = z.object({
  function: z.enum(["painkiller", "legitimation", "navigation", "mixed"]),
  predictivePower: z.number().min(0).max(100),
  explanation: z.string().min(1).max(500),
  falsifier: z.string().min(1).max(500),
});

const rawAnalysisSchema = z.object({
  title: z.string().min(1).max(80),
  conclusion: z.string().min(1).max(1200),
  disablement: disablementSchema.optional(),
  scales: z.array(scaleSchema).length(3).optional(),
  theoryAudit: theoryAuditSchema.optional(),
  layers: z.array(layerSchema).min(2).max(6).optional(),
  nodes: z.array(z.object({
    id: z.string().min(1).max(40),
    kind: z.enum(nodeKinds),
    layer: z.number().int().min(1).max(6).optional(),
    contribution: z.number().min(0).max(100).optional(),
    confidence: z.number().min(0).max(100).optional(),
    disableState: z.enum(disableStates).optional(),
    intervention: z.enum(interventions).optional(),
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
  nodes: Array<Omit<RawAnalysis["nodes"][number], "layer" | "contribution" | "confidence" | "disableState" | "intervention"> & {
    layer: number;
    contribution: number;
    confidence: number;
    disableState: typeof disableStates[number];
    intervention: typeof interventions[number];
  }>;
};

type LayeredAnalysis = Omit<RawAnalysis, "layers" | "nodes"> & {
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

function deriveLayers(analysis: RawAnalysis): LayeredAnalysis {
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

function normalizedContributions(nodes: LayeredAnalysis["nodes"]): number[] {
  const eligible = nodes.map((node, index) => ({ node, index })).filter(({ node }) => node.kind !== "choice" && node.kind !== "action");
  const supplied = eligible.filter(({ node }) => (node.contribution ?? 0) > 0);
  let causal = supplied;
  if (causal.length === 0) causal = eligible.filter(({ node }) => node.kind === "constraint");
  if (causal.length === 0) causal = eligible.filter(({ node }) => node.kind === "fact" || node.kind === "need");

  const result = nodes.map(() => 0);
  if (causal.length === 0) return result;
  const weights = causal.map(({ node }) => supplied.length > 0 ? node.contribution! : 1);
  const total = weights.reduce((sum, value) => sum + value, 0);
  const exact = weights.map((value) => value / total * 100);
  const rounded = exact.map(Math.floor);
  let remainder = 100 - rounded.reduce((sum, value) => sum + value, 0);
  const order = exact.map((value, index) => ({ index, fraction: value - rounded[index] })).sort((left, right) => right.fraction - left.fraction);
  for (let index = 0; index < order.length && remainder > 0; index++, remainder--) rounded[order[index].index]++;
  causal.forEach(({ index }, causalIndex) => { result[index] = rounded[causalIndex]; });
  return result;
}

function defaultDisableState(layer: AnalysisLayer | undefined, kind: NodeKind): typeof disableStates[number] {
  if (kind === "choice" || kind === "action") return "none";
  switch (layer?.domain) {
    case "physical": return "hard";
    case "capability": return "capability";
    case "resource": return "resource";
    case "institution": return "permission";
    case "social": return "coordination";
    default: return kind === "constraint" ? "temporary" : "none";
  }
}

function defaultIntervention(kind: NodeKind, state: typeof disableStates[number]): typeof interventions[number] {
  if (kind === "action") return "experiment";
  if (kind === "choice") return "reroute";
  switch (state) {
    case "hard": return "accept";
    case "capability": return "train";
    case "resource": return "acquire";
    case "permission": return "negotiate";
    case "coordination": return "negotiate";
    case "temporary": return "wait";
    default: return "experiment";
  }
}

export function normalizeAnalysis(analysis: RawAnalysis): Analysis {
  const layerIDs = new Set(analysis.layers?.map((layer) => layer.id) ?? []);
  const hasExplicitLayers = layerIDs.size >= 2 && analysis.nodes.every((node) => node.layer !== undefined && layerIDs.has(node.layer));
  const layered: LayeredAnalysis = !hasExplicitLayers ? deriveLayers(analysis) : {
    ...analysis,
    layers: [...analysis.layers!].sort((left, right) => left.id - right.id),
    nodes: analysis.nodes.map((node) => ({ ...node, layer: node.layer! })),
  };
  const contributions = normalizedContributions(layered.nodes);
  const layers = new Map(layered.layers.map((layer) => [layer.id, layer]));
  return {
    ...layered,
    nodes: layered.nodes.map((node, index) => {
      const contribution = contributions[index];
      const disableState = contribution > 0 ? (node.disableState ?? defaultDisableState(layers.get(node.layer), node.kind)) : "none";
      return {
        ...node,
        contribution,
        confidence: Math.round(node.confidence ?? (contribution > 0 ? 65 : 80)),
        disableState,
        intervention: node.intervention ?? defaultIntervention(node.kind, disableState),
      };
    }),
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
  if (analysis.nodes.reduce((sum, node) => sum + node.contribution, 0) !== 100) {
    ctx.addIssue({ code: "custom", message: "causal contribution must total 100" });
  }
  for (const node of analysis.nodes) {
    if ((node.kind === "choice" || node.kind === "action") && node.contribution !== 0) {
      ctx.addIssue({ code: "custom", message: "choices and actions cannot carry causal contribution" });
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
    conclusion: "先别把所有做不到都翻译成“还不够努力”。分别检查物理边界、能力、资源、制度权限和他人协作，再决定是升级、获取资源、谈判、绕路还是退出。",
    disablement: { target: subject || "改变当前困局", status: "mixed", topBlocker: "资源与制度边界尚未被准确核实" },
    scales: [
      { id: "micro", diagnosis: "眼前事实和假设仍混在一起，暂时无法判断哪个按钮真的被禁用。", prediction: "若先核实一个关键事实，可选行动会明显收敛。", nextStep: "48 小时内验证一个最关键、最便宜的事实。" },
      { id: "meso", diagnosis: "需要判断这是一场偶发事件，还是在不同情境中反复出现的模式。", prediction: "若机制真实，相似条件下会重复出现相似阻塞。", nextStep: "回看最近三次相似经历，记录共同条件。" },
      { id: "macro", diagnosis: "宏观结构可能解释部分限制，但解释力不等于因果成立。", prediction: "有预测力的结构模型应能指出换身份、规则或环境后结果如何变化。", nextStep: "写下一个能推翻当前宏观解释的反例。" },
    ],
    theoryAudit: { function: "navigation", predictivePower: 45, explanation: "当前模型提供了调查方向，但证据不足，暂时只能作为导航假设。", falsifier: "若改变最高归因条件后结果没有改善，就应降低该解释的权重。" },
    layers: [
      { id: 1, domain: "physical", label: "物理与时间", description: "生命、时间和客观世界给出的硬边界" },
      { id: 2, domain: "capability", label: "能力与信息", description: "当前知识、技能、体力和信息差" },
      { id: 3, domain: "resource", label: "资源与工具", description: "金钱、时间、关系、算力和生产资料" },
      { id: 4, domain: "institution", label: "制度与权限", description: "法律、身份、组织规则和账号权限" },
      { id: 5, domain: "social", label: "社会协作", description: "他人意愿、博弈、信任和集体行动" },
    ],
    nodes: [
      { id: "physical", kind: "fact", layer: 1, contribution: 10, confidence: 55, disableState: "hard", intervention: "accept", label: "客观边界待核实", detail: "先确认是否存在真正不可逆的时间、健康或物理限制。" },
      { id: "capability", kind: "fact", layer: 2, contribution: 20, confidence: 55, disableState: "capability", intervention: "train", label: "能力差距待测量", detail: "把“我不行”改写成可以测试的知识或技能缺口。" },
      { id: "resource", kind: "constraint", layer: 3, contribution: 30, confidence: 65, disableState: "resource", intervention: "acquire", label: "资源不足", detail: "检查金钱、时间、关系和工具中哪个资源最先耗尽。" },
      { id: "institution", kind: "constraint", layer: 4, contribution: 20, confidence: 55, disableState: "permission", intervention: "reroute", label: "规则与权限", detail: "确认按钮是困难，还是当前身份在系统里真的没有权限。" },
      { id: "social", kind: "need", layer: 5, contribution: 20, confidence: 50, disableState: "coordination", intervention: "negotiate", label: "需要他人合作", detail: "很多目标不是个人努力问题，而是别人是否愿意共同完成。" },
      { id: "route", kind: "choice", layer: 4, contribution: 0, confidence: 70, disableState: "none", intervention: "reroute", label: "换账号或换系统", detail: "权限拿不到时，比较绕过接口、改变身份或重设目标。" },
      { id: "probe", kind: "action", layer: 5, contribution: 0, confidence: 80, disableState: "none", intervention: "experiment", label: "48 小时归因实验", detail: "验证最高权重条件；结果不变就降低它的归因份额。" },
    ],
    edges: [
      { source: "physical", target: "capability", relation: "限定上限" },
      { source: "capability", target: "resource", relation: "影响效率" },
      { source: "resource", target: "institution", relation: "影响权限" },
      { source: "institution", target: "route", relation: "迫使绕路" },
      { source: "institution", target: "social", relation: "塑造博弈" },
      { source: "route", target: "probe", relation: "需要验证" },
    ],
  };
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}