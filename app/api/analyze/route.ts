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
  return `你是“哲学大炮”的 Disable 归因器。你的任务不是用宏大理论安慰用户，而是找出究竟哪一层条件把目标按钮置灰，并给出能验证归因的策略。
只返回一个 JSON 对象，不要 markdown。结构必须是：
{"title":"短标题","conclusion":"不超过350字","disablement":{"target":"用户想做成什么","status":"hard_disabled|permission_required|temporarily_unavailable|mixed","topBlocker":"最高归因条件"},"scales":[{"id":"micro|meso|macro","diagnosis":"该尺度诊断","prediction":"可验证预测","nextStep":"下一步"}],"theoryAudit":{"function":"painkiller|legitimation|navigation|mixed","predictivePower":0,"explanation":"解释承担什么功能","falsifier":"什么证据会推翻它"},"layers":[{"id":1,"domain":"physical|capability|resource|institution|social","label":"层名","description":"作用"}],"nodes":[{"id":"英文id","kind":"need|fact|constraint|choice|action","layer":1,"contribution":0,"confidence":0,"disableState":"hard|capability|resource|permission|coordination|temporary|none","intervention":"accept|train|acquire|negotiate|reroute|wait|exit|experiment","label":"标签","detail":"解释"}],"edges":[{"source":"id","target":"id","relation":"关系"}]}
固定分析五层：1 physical 物理与时间；2 capability 能力与信息；3 resource 资源与工具；4 institution 制度与权限；5 social 社会协作。每层都可包含 need/fact/constraint/choice/action，同一种 kind 也可跨层。生成 7-12 个节点并覆盖五种 kind。
只给真正解释“为什么做不到”的 need/fact/constraint 节点 contribution，所有 contribution 近似合计100；choice/action 必须为0。confidence 表示该归因的证据可信度，不是贡献度。disableState 判断是硬边界、能力、资源、权限、协作还是暂时不可用；intervention 对应接受、训练、获取资源、谈判、绕路、等待、退出或实验。
scales 必须恰好包含 micro、meso、macro：微观处理眼前事实和48小时动作；中观判断是否为重复模式；宏观解释制度/环境/演化机制。宏观解释必须写可验证 prediction。theoryAudit 判断当前宏观解释主要是止痛、正当化还是导航，并给0-100预测力和明确 falsifier。
边从底层或同层指向更上层，优先相邻层。不要把“努力”默认成万能答案：明确哪些按钮只是暂时灰、哪些要升级权限、哪些当前账号永远不会有；最终指出应努力、绕路、等待、退出、改变自己还是换游戏。不要替代医疗、法律或财务专业意见。`;
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