import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { analysisSchema, analyzeRequestSchema, buildFallback, extractJson } from "../../analysis";

export const runtime = "nodejs";

const attempts = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const LIMIT = 8;

function callerKey(request: NextRequest): string {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const secret = process.env.RATE_LIMIT_SECRET ?? "constraint-atlas-local";
  return createHmac("sha256", secret).update(address).digest("hex");
}

function isLimited(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > LIMIT;
}

function systemPrompt(): string {
  return `你是“哲学大炮”的世界层级 Disable 归因器。你的任务不是用宏大理论安慰用户，而是把困局定位到固定世界结构中的具体层与子区域，找出什么条件把目标按钮置灰，并给出能验证归因的策略。
只返回一个 JSON 对象，不要 markdown。结构必须是：
{"title":"短标题","conclusion":"不超过180字","disablement":{"target":"用户目标","status":"hard_disabled|permission_required|temporarily_unavailable|mixed","topBlocker":"最高归因条件"},"scales":[{"id":"micro|meso|macro","diagnosis":"不超过80字","prediction":"不超过80字","nextStep":"不超过60字"}],"theoryAudit":{"function":"painkiller|legitimation|navigation|mixed","predictivePower":0,"explanation":"不超过80字","falsifier":"不超过80字"},"nodes":[{"id":"短英文id","kind":"need|fact|constraint|choice|action","layer":1,"facet":"固定facet id","contribution":0,"confidence":0,"disableState":"hard|capability|resource|permission|coordination|temporary|none","intervention":"accept|train|acquire|negotiate|reroute|wait|exit|experiment","label":"不超过16字","detail":"不超过60字"}],"edges":[{"source":"id","target":"id","relation":"不超过8字"}]}
不要输出 layers；服务端会注入固定五层目录。layer 坐标为：1 personal 个人五层需求；2 organization 组织与团体；3 norm 社会规范；4 state 国家制度；5 global 全球经济。
每个节点必须定位到所属 layer，并从该层以下五个 facet id 中选一个：
1 personal：personal.survival 生存；personal.safety 安全；personal.belonging 归属；personal.esteem 尊严；personal.growth 成长。
2 organization：organization.role 角色权责；organization.incentive 激励利益；organization.resource 组织资源；organization.coordination 协作流程；organization.governance 治理规则。
3 norm：norm.custom 习俗伦理；norm.reputation 声誉评价；norm.legitimacy 正当性；norm.network 关系网络；norm.narrative 公共叙事。
4 state：state.law 法律权利；state.citizenship 身份资格；state.administration 行政监管；state.fiscal 财政公共品；state.enforcement 执行能力。
5 global：global.capital 资本金融；global.trade 贸易市场；global.supply 供应链；global.technology 技术平台；global.geopolitics 地缘与生态。
每层都可包含 need/fact/constraint/choice/action，同一种 kind 也可跨层。只生成 7-9 个精炼节点并尽量覆盖五种 kind；没有证据的层不要虚构 causal node。
只给真正解释“为什么做不到”的 need/fact/constraint 节点 contribution，所有 contribution 近似合计100；choice/action 必须为0。confidence 表示该归因的证据可信度，不是贡献度。disableState 判断是硬边界、能力、资源、权限、协作还是暂时不可用；intervention 对应接受、训练、获取资源、谈判、绕路、等待、退出或实验。
scales 必须恰好包含 micro、meso、macro：微观处理眼前事实和48小时动作；中观判断是否为重复模式；宏观解释制度/环境/演化机制。宏观解释必须写可验证 prediction。theoryAudit 判断当前宏观解释主要是止痛、正当化还是导航，并给0-100预测力和明确 falsifier。
边表达真实因果方向，可以从外层结构指向内层处境，也可以由个人与组织行动向外反馈；不要为了视觉强行编造单向链。不要把“努力”默认成万能答案：明确哪些按钮只是暂时灰、哪些要升级权限、哪些当前身份永远不会有；最终指出应努力、绕路、等待、退出、改变自己还是换游戏。不要替代医疗、法律或财务专业意见。`;
}

export async function POST(request: NextRequest) {
  const key = callerKey(request);
  if (isLimited(key)) {
    return NextResponse.json({ error: "请求太频繁，请稍后再试。" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let parsed: ReturnType<typeof analyzeRequestSchema.safeParse>;
  try {
    parsed = analyzeRequestSchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "请用 8 到 2000 个字描述一个具体困局。" }, { status: 400 });
  }

  const { question } = parsed.data;
  const gatewayUrl = process.env.SKYPOOL_LLM_GATEWAY_URL;
  const gatewayKey = process.env.SKYPOOL_LLM_GATEWAY_KEY;
  if (!gatewayUrl || !gatewayKey) {
    return NextResponse.json({ analysis: buildFallback(question), source: "fallback" });
  }

  try {
    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${gatewayKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "system", content: systemPrompt() }, { role: "user", content: question }] }),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`gateway returned ${response.status}`);
    const completion = await response.json();
    const content = completion?.choices?.[0]?.message?.content;
    const analysis = analysisSchema.parse(extractJson(content));
    return NextResponse.json({ analysis, source: "model" });
  } catch (error) {
    console.error("analysis gateway unavailable", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ analysis: buildFallback(question), source: "fallback" });
  }
}