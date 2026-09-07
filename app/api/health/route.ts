import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, gateway_configured: Boolean(process.env.SKYPOOL_LLM_GATEWAY_URL && process.env.SKYPOOL_LLM_GATEWAY_KEY) });
}