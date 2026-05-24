import { NextRequest } from 'next/server';

const BASE = process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic';
const KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const DEFAULT_MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'deepseek-v4-pro';

async function callAI(system: string, messages: { role: string; content: string }[], model: string): Promise<string> {
  const r = await fetch(`${BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 4096,
      system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  if (!r.ok) throw new Error(`AI API error: ${r.status}`);
  const d = await r.json();
  return d.content?.map((c: { type: string; text?: string }) => c.text || '').join('') || '';
}

export async function POST(req: NextRequest) {
  let body: { messages?: { role: string; content: string }[]; model?: string; systemPrompt?: string; stream?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { messages = [], model = DEFAULT_MODEL, systemPrompt = '', stream = true } = body;

  if (!stream) {
    try {
      const result = await callAI(systemPrompt, messages, model);
      return new Response(JSON.stringify({ content: result }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const encoder = new TextEncoder();
  const s = new ReadableStream({
    async start(controller) {
      try {
        const fullText = await callAI(systemPrompt, messages, model);
        const chunkSize = 5;
        for (let i = 0; i < fullText.length; i += chunkSize) {
          const chunk = fullText.slice(i, i + chunkSize);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          await new Promise(r => setTimeout(r, 20));
        }
      } catch (e: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`));
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      controller.close();
    },
  });

  return new Response(s, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
