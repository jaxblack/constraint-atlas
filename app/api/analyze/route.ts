import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { analysisSchema, analyzeRequestSchema, buildFallback, extractJson } from "../../analysis";
import { socialWorlds } from "../../socialWorlds";

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
  const worlds = socialWorlds.map((world) => `${world.id} ${world.label}（文章原型：${world.prototype}）：${world.constraints.map((constraint) => `${constraint.id}=${constraint.label}[${constraint.hardness}]`).join("、")}`).join("\n");
  return `你是“哲学大炮”的十重社会世界归因器。模型来自《十重世》：十重世是空间结构，社会雷诺数是动力学结构。你的任务是把同一个人的当前问题逐层投影到十种社会环境，说明努力在哪一层被黏性耗散、已有资源在哪一层形成惯性、向目标移动要穿过哪些过滤膜和硬约束。
十重世描述环境，不评价人的高低贵贱。不要把阶层差异自然化，不要从语气、职业或消费偏好擅自推断用户的当前阶层；信息不足时使用 relation=unverified，并明确需要什么证据。
只返回一个 JSON 对象，不要 markdown。结构必须是：
{"title":"短标题","conclusion":"不超过160字","disablement":{"target":"用户目标","status":"hard_disabled|permission_required|temporarily_unavailable|mixed","topBlocker":"最高归因条件"},"worldAssessments":[{"world":1,"relation":"current|upstream|barrier|alternative|remote|unverified","relevance":0,"viscosity":0,"inertia":0,"bindingConstraintIDs":["本层约束ID"],"diagnosis":"不超过55字","evidenceNeeded":"不超过45字"}],"nodes":[{"id":"短英文id","kind":"need|fact|constraint|choice|action","layer":1,"facet":"固定facet id","contribution":0,"confidence":0,"disableState":"hard|capability|resource|permission|coordination|temporary|none","intervention":"accept|train|acquire|negotiate|reroute|wait|exit|experiment","label":"不超过14字","detail":"不超过45字"}],"edges":[{"source":"id","target":"id","relation":"不超过8字"}]}
worldAssessments 必须恰好包含 world=1..10，每重一次且顺序固定。最多一重可以 relation=current；信息足够时选最贴近用户当前生活环境的一重，其他背景层标 upstream。字段含义：current 当前所处环境；upstream 上游结构；barrier 必须穿越的过滤膜；alternative 可换入的环境；remote 暂无直接作用；unverified 信息不足。relevance 是该重对当前问题的作用强度；viscosity 是努力被环境耗散的程度；inertia 是已有资产、信用、技能、身份和关系产生复利的程度。bindingConstraintIDs 只能从该重目录选择，每重最多2条；relevance<25、remote、unverified 或没有个案证据时必须为空，不能虚构法律适用性。
十重世及合法硬约束目录：
${worlds}

硬约束必须区分：absolute=身体时间等不可协商边界；statutory=法律法规和资格；gate=圈层、许可和组织准入；priced=可用资本跨越的价格门槛；structural=信息、产业、网络和路径依赖。政策法规只作为待核验的制度入口，不能声称某条法律必然适用，除非用户给出了法域、主体身份和事实。

nodes/layers 是辅助的五类约束坐标，不是十重社会阶层。不要输出 layers；服务端会注入。layer 坐标为：1 personal 个人需求；2 organization 组织机制；3 norm 社会规范；4 state 国家制度；5 global 全球系统。
每个节点必须定位到所属 layer，并从该层以下五个 facet id 中选一个：
1 personal：personal.survival 生存；personal.safety 安全；personal.belonging 归属；personal.esteem 尊严；personal.growth 成长。
2 organization：organization.role 角色权责；organization.incentive 激励利益；organization.resource 组织资源；organization.coordination 协作流程；organization.governance 治理规则。
3 norm：norm.custom 习俗伦理；norm.reputation 声誉评价；norm.legitimacy 正当性；norm.network 关系网络；norm.narrative 公共叙事。
4 state：state.law 法律权利；state.citizenship 身份资格；state.administration 行政监管；state.fiscal 财政公共品；state.enforcement 执行能力。
5 global：global.capital 资本金融；global.trade 贸易市场；global.supply 供应链；global.technology 技术平台；global.geopolitics 地缘与生态。
只生成 5-7 个精炼 nodes 并尽量覆盖 need/fact/constraint/choice/action；没有证据的节点不要虚构。
只给真正解释“为什么做不到”的 need/fact/constraint 节点 contribution，所有 contribution 近似合计100；choice/action 必须为0。confidence 表示该归因的证据可信度，不是贡献度。disableState 判断是硬边界、能力、资源、权限、协作还是暂时不可用；intervention 对应接受、训练、获取资源、谈判、绕路、等待、退出或实验。
边表达真实因果方向，可以从外层结构指向内层处境，也可以由个人与组织行动向外反馈；不要为了视觉强行编造单向链。不要把“努力”默认成万能答案：明确哪些按钮只是暂时灰、哪些要升级权限、哪些在已核实的当前条件下不可用；身份、法域或事实不足时标记待核验并给出核验路径。最终指出应努力、绕路、等待、退出、改变自己还是换游戏。不要替代医疗、法律或财务专业意见。`;
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