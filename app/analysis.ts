import { z } from "zod";

export const nodeKinds = ["need", "fact", "constraint", "choice", "action"] as const;
export const disableStates = ["hard", "capability", "resource", "permission", "coordination", "temporary", "none"] as const;
export const interventions = ["accept", "train", "acquire", "negotiate", "reroute", "wait", "exit", "experiment"] as const;
export const scaleIDs = ["micro", "meso", "macro"] as const;
export const worldDomains = ["personal", "organization", "norm", "state", "global"] as const;

const layerSchema = z.object({
  id: z.number().int().min(1).max(6),
  domain: z.enum([...worldDomains, "physical", "capability", "resource", "institution", "social", "custom"]).optional(),
  label: z.string().min(1).max(40),
  description: z.string().min(1).max(160),
});

const facetSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(40),
  description: z.string().min(1).max(120),
});

const fixedLayerSchema = z.object({
  id: z.number().int().min(1).max(5),
  domain: z.enum(worldDomains),
  label: z.string().min(1).max(40),
  description: z.string().min(1).max(160),
  facets: z.array(facetSchema).length(5),
});

export type AnalysisFacet = z.infer<typeof facetSchema>;
export type AnalysisLayer = z.infer<typeof fixedLayerSchema>;

export const fixedWorldLayers: AnalysisLayer[] = fixedLayerSchema.array().parse([
  { id: 1, domain: "personal", label: "个人五层需求", description: "从生存到创造，目标首先要通过人的身体、心理与身份系统", facets: [
    { id: "personal.survival", label: "生存", description: "健康、睡眠、体力与基本生活" },
    { id: "personal.safety", label: "安全", description: "稳定、可控、边界与风险承受" },
    { id: "personal.belonging", label: "归属", description: "亲密关系、群体接纳与连接" },
    { id: "personal.esteem", label: "尊严", description: "认可、地位、自我效能与自主" },
    { id: "personal.growth", label: "成长", description: "意义、创造、学习与自我实现" },
  ] },
  { id: 2, domain: "organization", label: "组织与团体", description: "家庭、团队与公司通过角色、资源和协作机制放大或限制个人", facets: [
    { id: "organization.role", label: "角色权责", description: "谁负责、谁批准、谁承担后果" },
    { id: "organization.incentive", label: "激励利益", description: "收益、成本、绩效与内部博弈" },
    { id: "organization.resource", label: "组织资源", description: "预算、人力、时间、关系与工具" },
    { id: "organization.coordination", label: "协作流程", description: "沟通、依赖、节奏与集体行动" },
    { id: "organization.governance", label: "治理规则", description: "决策机制、流程、权限与问责" },
  ] },
  { id: 3, domain: "norm", label: "社会规范", description: "文化、声誉与公共叙事决定什么被认为正常、体面或可接受", facets: [
    { id: "norm.custom", label: "习俗伦理", description: "默认做法、道德边界与代际期待" },
    { id: "norm.reputation", label: "声誉评价", description: "名望、羞耻、标签与社会奖惩" },
    { id: "norm.legitimacy", label: "正当性", description: "行动是否被群体承认与允许" },
    { id: "norm.network", label: "关系网络", description: "圈层、信任、传播与非正式权力" },
    { id: "norm.narrative", label: "公共叙事", description: "媒体话语、身份故事与集体想象" },
  ] },
  { id: 4, domain: "state", label: "国家制度", description: "法律、行政与公共资源定义正式权利、义务和可执行边界", facets: [
    { id: "state.law", label: "法律权利", description: "法律许可、义务、合同与产权" },
    { id: "state.citizenship", label: "身份资格", description: "国籍、户籍、签证、牌照与福利资格" },
    { id: "state.administration", label: "行政监管", description: "审批、合规、行业规则与官僚流程" },
    { id: "state.fiscal", label: "财政公共品", description: "税收、补贴、教育、医疗与基础设施" },
    { id: "state.enforcement", label: "执行能力", description: "司法、执法、申诉与制度可信度" },
  ] },
  { id: 5, domain: "global", label: "全球经济", description: "跨国资本、贸易、技术和地缘关系塑造本地系统的外部上限", facets: [
    { id: "global.capital", label: "资本金融", description: "利率、融资、汇率与风险定价" },
    { id: "global.trade", label: "贸易市场", description: "跨境需求、价格、关税与市场准入" },
    { id: "global.supply", label: "供应链", description: "能源、原料、物流与生产网络" },
    { id: "global.technology", label: "技术平台", description: "技术范式、平台规则、算力与知识扩散" },
    { id: "global.geopolitics", label: "地缘与生态", description: "国际关系、安全冲突、气候与系统风险" },
  ] },
]);

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
    facet: z.string().min(1).max(40).optional(),
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

export type Analysis = Omit<RawAnalysis, "layers" | "nodes"> & {
  layers: AnalysisLayer[];
  nodes: Array<Omit<RawAnalysis["nodes"][number], "layer" | "facet" | "contribution" | "confidence" | "disableState" | "intervention"> & {
    layer: number;
    facet: string;
    contribution: number;
    confidence: number;
    disableState: typeof disableStates[number];
    intervention: typeof interventions[number];
  }>;
};

type LayeredAnalysis = Omit<RawAnalysis, "layers" | "nodes"> & {
  layers: Array<z.infer<typeof layerSchema>>;
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
    case "personal": return kind === "need" ? "temporary" : "capability";
    case "organization": return "resource";
    case "norm": return "coordination";
    case "state": return "permission";
    case "global": return "resource";
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
  const hasFixedCoordinates = !analysis.layers && analysis.nodes.every((node) => node.layer !== undefined && node.layer >= 1 && node.layer <= 5);
  const layerIDs = new Set(analysis.layers?.map((layer) => layer.id) ?? []);
  const hasExplicitLayers = layerIDs.size >= 2 && analysis.nodes.every((node) => node.layer !== undefined && layerIDs.has(node.layer));
  const layered: LayeredAnalysis = hasFixedCoordinates ? {
    ...analysis,
    layers: fixedWorldLayers,
    nodes: analysis.nodes.map((node) => ({ ...node, layer: node.layer! })),
  } : !hasExplicitLayers ? deriveLayers(analysis) : {
    ...analysis,
    layers: [...analysis.layers!].sort((left, right) => left.id - right.id),
    nodes: analysis.nodes.map((node) => ({ ...node, layer: node.layer! })),
  };
  const legacyDomainMap: Record<string, number> = { physical: 1, capability: 1, resource: 2, social: 3, institution: 4, custom: 5 };
  const suppliedLayerIndex = new Map(layered.layers.map((layer, index) => [layer.id, index]));
  const worldDomainID = new Map(fixedWorldLayers.map((layer) => [layer.domain, layer.id]));
  const remappedNodes = layered.nodes.map((node) => {
    const suppliedLayer = layered.layers.find((layer) => layer.id === node.layer);
    const mappedDomain = suppliedLayer?.domain ? worldDomainID.get(suppliedLayer.domain as typeof worldDomains[number]) ?? legacyDomainMap[suppliedLayer.domain] : undefined;
    const index = suppliedLayerIndex.get(node.layer) ?? 0;
    const spreadLayer = layered.layers.length <= 1 ? 1 : Math.round(index * 4 / (layered.layers.length - 1)) + 1;
    return { ...node, layer: mappedDomain ?? inferWorldLayer(node.label, node.detail, spreadLayer) };
  });
  const contributions = normalizedContributions(remappedNodes);
  const layers = new Map(fixedWorldLayers.map((layer) => [layer.id, layer]));
  return {
    ...layered,
    layers: fixedWorldLayers.map((layer) => ({ ...layer, facets: layer.facets.map((facet) => ({ ...facet })) })),
    nodes: remappedNodes.map((node, index) => {
      const contribution = contributions[index];
      const layer = layers.get(node.layer)!;
      const disableState = contribution > 0 ? (node.disableState ?? defaultDisableState(layer, node.kind)) : "none";
      const facet = layer.facets.some((item) => item.id === node.facet) ? node.facet! : inferFacet(layer, node.label, node.detail);
      return {
        ...node,
        facet,
        contribution,
        confidence: Math.round(node.confidence ?? (contribution > 0 ? 65 : 80)),
        disableState,
        intervention: node.intervention ?? defaultIntervention(node.kind, disableState),
      };
    }),
  };
}

function inferWorldLayer(label: string, detail: string, fallback: number): number {
  const text = `${label} ${detail}`.toLowerCase();
  const layerKeywords: Array<[number, string[]]> = [
    [5, ["全球", "国际", "跨境", "汇率", "关税", "供应链", "地缘", "气候", "平台"]],
    [4, ["国家", "法律", "政策", "行政", "监管", "审批", "签证", "户籍", "税收", "司法"]],
    [3, ["社会", "文化", "习俗", "舆论", "声誉", "体面", "正当", "代际", "圈层"]],
    [2, ["组织", "团队", "公司", "预算", "人力", "流程", "绩效", "协作", "共识", "权限"]],
    [1, ["个人", "健康", "安全", "关系", "归属", "尊严", "自主", "成长", "意义", "现金流"]],
  ];
  return layerKeywords.find(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))?.[0] ?? fallback;
}

function inferFacet(layer: AnalysisLayer, label: string, detail: string): string {
  const text = `${label} ${detail}`.toLowerCase();
  const keywords: Record<string, string[]> = {
    "personal.survival": ["健康", "睡眠", "体力", "生存", "疾病"],
    "personal.safety": ["安全", "稳定", "风险", "现金流", "焦虑"],
    "personal.belonging": ["关系", "归属", "亲密", "孤独", "家庭"],
    "personal.esteem": ["认可", "尊严", "地位", "自主", "自信"],
    "personal.growth": ["成长", "意义", "创造", "学习", "实现"],
    "organization.role": ["角色", "职责", "负责", "批准", "老板"],
    "organization.incentive": ["激励", "利益", "绩效", "回报", "成本"],
    "organization.resource": ["预算", "人力", "资源", "时间", "工具"],
    "organization.coordination": ["协作", "沟通", "依赖", "团队", "共识"],
    "organization.governance": ["流程", "治理", "决策", "问责", "权限"],
    "norm.custom": ["习俗", "伦理", "传统", "代际", "道德"],
    "norm.reputation": ["声誉", "评价", "体面", "标签", "羞耻"],
    "norm.legitimacy": ["正当", "允许", "认同", "合法性", "接受"],
    "norm.network": ["圈层", "人脉", "信任", "网络", "传播"],
    "norm.narrative": ["叙事", "舆论", "媒体", "身份故事", "话语"],
    "state.law": ["法律", "合同", "产权", "权利", "义务"],
    "state.citizenship": ["国籍", "户籍", "签证", "牌照", "资格"],
    "state.administration": ["审批", "监管", "合规", "行政", "政策"],
    "state.fiscal": ["税", "补贴", "教育", "医疗", "基础设施"],
    "state.enforcement": ["司法", "执法", "申诉", "执行", "仲裁"],
    "global.capital": ["资本", "融资", "利率", "汇率", "金融"],
    "global.trade": ["贸易", "关税", "跨境", "市场准入", "出口"],
    "global.supply": ["供应链", "物流", "能源", "原料", "制造"],
    "global.technology": ["技术", "平台", "算力", "ai", "知识"],
    "global.geopolitics": ["地缘", "国际", "气候", "战争", "制裁"],
  };
  const match = layer.facets.find((facet) => keywords[facet.id]?.some((keyword) => text.includes(keyword)));
  return match?.id ?? layer.facets[Math.min(2, layer.facets.length - 1)].id;
}

export function facetLabel(facetID: string): string {
  return fixedWorldLayers.flatMap((layer) => layer.facets).find((facet) => facet.id === facetID)?.label ?? facetID;
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
    conclusion: "先别把所有做不到都翻译成“还不够努力”。把问题放进个人需求、组织机制、社会规范、国家制度和全球经济五层坐标，先验证最高权重的具体机制，再决定努力、谈判、绕路、等待还是换系统。",
    disablement: { target: subject || "改变当前困局", status: "mixed", topBlocker: "组织资源与外部制度边界尚未被准确核实" },
    scales: [
      { id: "micro", diagnosis: "眼前事实和假设仍混在一起，暂时无法判断哪个按钮真的被禁用。", prediction: "若先核实一个关键事实，可选行动会明显收敛。", nextStep: "48 小时内验证一个最关键、最便宜的事实。" },
      { id: "meso", diagnosis: "需要判断这是一场偶发事件，还是在不同情境中反复出现的模式。", prediction: "若机制真实，相似条件下会重复出现相似阻塞。", nextStep: "回看最近三次相似经历，记录共同条件。" },
      { id: "macro", diagnosis: "宏观结构可能解释部分限制，但解释力不等于因果成立。", prediction: "有预测力的结构模型应能指出换身份、规则或环境后结果如何变化。", nextStep: "写下一个能推翻当前宏观解释的反例。" },
    ],
    theoryAudit: { function: "navigation", predictivePower: 45, explanation: "当前模型提供了调查方向，但证据不足，暂时只能作为导航假设。", falsifier: "若改变最高归因条件后结果没有改善，就应降低该解释的权重。" },
    layers: fixedWorldLayers,
    nodes: [
      { id: "personal", kind: "need", layer: 1, facet: "personal.safety", contribution: 18, confidence: 58, disableState: "temporary", intervention: "experiment", label: "个人安全边界", detail: "先确认健康、稳定、现金流与风险承受中哪个需求不可牺牲。" },
      { id: "organization", kind: "constraint", layer: 2, facet: "organization.resource", contribution: 28, confidence: 65, disableState: "resource", intervention: "acquire", label: "组织资源不足", detail: "检查预算、人力、时间和工具中哪个资源最先耗尽。" },
      { id: "norm", kind: "constraint", layer: 3, facet: "norm.legitimacy", contribution: 14, confidence: 48, disableState: "coordination", intervention: "negotiate", label: "正当性与期待", detail: "判断阻力来自真实利益，还是群体对什么才算合理的默认期待。" },
      { id: "state", kind: "constraint", layer: 4, facet: "state.administration", contribution: 18, confidence: 52, disableState: "permission", intervention: "reroute", label: "正式规则与资格", detail: "确认是否存在审批、合规、身份或法律上的真实禁用。" },
      { id: "global", kind: "fact", layer: 5, facet: "global.capital", contribution: 22, confidence: 46, disableState: "resource", intervention: "wait", label: "外部市场条件", detail: "利率、资本、平台和跨境市场可能改变本地选择的成本上限。" },
      { id: "route", kind: "choice", layer: 4, facet: "state.administration", contribution: 0, confidence: 70, disableState: "none", intervention: "reroute", label: "换身份或换系统", detail: "权限拿不到时，比较绕过接口、改变组织位置或重设目标。" },
      { id: "probe", kind: "action", layer: 2, facet: "organization.governance", contribution: 0, confidence: 80, disableState: "none", intervention: "experiment", label: "48 小时归因实验", detail: "验证最高权重机制；结果不变就降低它的归因份额。" },
    ],
    edges: [
      { source: "personal", target: "organization", relation: "进入集体" },
      { source: "organization", target: "norm", relation: "形成惯例" },
      { source: "norm", target: "state", relation: "获得正式化" },
      { source: "state", target: "global", relation: "连接外部" },
      { source: "state", target: "route", relation: "迫使绕路" },
      { source: "route", target: "probe", relation: "需要验证" },
    ],
  };
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}