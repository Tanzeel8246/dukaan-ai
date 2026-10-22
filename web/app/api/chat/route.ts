/**
 * Dukaan AI — server-side chat route (Gemini).
 *
 * POST /api/chat  { messages: [{role, content}…], context?: string }
 *   → { text } on success
 *   → 503 { error: "llm_not_configured" } when no API key is set
 *   → 502 { error: "llm_failed" } when the provider call fails
 *
 * The client (lib/ai-engine/llm-adapter.ts) falls back to the on-device
 * intent engine on any non-200, so this route is a pure upgrade path.
 *
 * Key: GEMINI_API_KEY (preferred) or LLM_API_KEY — server env ONLY, never
 * NEXT_PUBLIC_*. This route requires a Node runtime (Vercel); it is
 * excluded from the static demo build (see tools/build-static.mjs).
 */

import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are Dukaan AI, the assistant inside a smart kiryana/retail shop app used by Pakistani shopkeepers.
Reply in the SAME language and script the user used: Urdu script for Urdu, English for English, Roman Urdu if the user writes Roman Urdu.
Ground every fact about stock, prices, sales and forecasts in the SHOP DATA SUMMARY provided below — never invent products, prices or quantities. If the summary does not contain the answer, say so honestly and suggest what the shopkeeper can check in the app.
Use PKR for money. Be brief, practical and friendly — short paragraphs, no long lectures. You may suggest reorders or actions when the data supports them.`;

interface IncomingMessage {
  role?: unknown;
  content?: unknown;
}

function sanitizeMessages(raw: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of raw.slice(-20) as IncomingMessage[]) {
    const content = typeof m?.content === "string" ? m.content.slice(0, 4000) : "";
    if (!content.trim()) continue;
    out.push({ role: m.role === "assistant" ? "assistant" : "user", content });
  }
  return out;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "llm_not_configured" }, { status: 503 });
  }

  let body: { messages?: unknown; context?: unknown };
  try {
    body = (await req.json()) as { messages?: unknown; context?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const messages = sanitizeMessages(body.messages);
  if (messages.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const context =
    typeof body.context === "string" ? body.context.slice(0, 6000) : "";

  const systemText = context
    ? `${SYSTEM_PROMPT}\n\nSHOP DATA SUMMARY (the shopkeeper's own live data):\n${context}`
    : SYSTEM_PROMPT;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "llm_failed" }, { status: 502 });
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) {
      return NextResponse.json({ error: "llm_failed" }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "llm_failed" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
