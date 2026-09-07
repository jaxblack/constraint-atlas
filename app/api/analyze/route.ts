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
  return `你是 Constraint Atlas，一位冷静、非诊断性的决策分析师。把用户的困局拆成因果地图。
只返回一个 JSON 对象，不要 markdown。结构必须是：
{"title":"短标题","conclusion":"一段不超过350字的可执行结论","nodes":[{"id":"唯一英文id","kind":"need|fact|constraint|choice|action","label":"短标签","detail":"解释"}],"edges":[{"source":"节点id","target":"节点id","relation":"关系"}]}
生成 5-9 个节点，至少包含 need、constraint、choice、action。区分事实和猜测；优先给可逆、低成本、48 小时内能开始的行动。不要替代医疗、法律或财务专业意见。`;
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