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
  return `你是 Constraint Atlas，一位冷静、非诊断性的决策分析师。把用户的困局拆成一张严格分层的因果地图。
只返回一个 JSON 对象，不要 markdown。结构必须是：
{"title":"短标题","conclusion":"一段不超过350字的可执行结论","layers":[{"id":1,"label":"层名","description":"这一层在因果链中的作用"}],"nodes":[{"id":"唯一英文id","kind":"need|fact|constraint|choice|action","layer":1,"label":"短标签","detail":"解释"}],"edges":[{"source":"节点id","target":"节点id","relation":"关系"}]}
生成 3-6 个 layers、6-12 个 nodes。layer 1 是最底层原因、规则或需要，数字越大越接近可改变机制、选择、行动和反馈。层级必须按因果深度划分，绝对不要按 kind 分类：同一层可以同时出现 fact、need、constraint、choice、action；同一种 kind 也可以出现在不同层。每层 1-4 个节点，层名要具体描述该问题中的结构（不要只叫“第一层”）。边的 source 应位于同层或更低层，优先连接相邻层，避免跨越多层和回头边。至少包含 need、fact、constraint、choice、action。区分事实和猜测；约束要区分不可改变的底层边界、制度/关系形成的中层约束、可调整的上层限制；行动要说明它改变哪一层或产生什么反馈。优先给可逆、低成本、48 小时内能开始的行动。不要替代医疗、法律或财务专业意见。`;
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