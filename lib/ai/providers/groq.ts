// ─── Groq Provider ─────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionParams {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

export class GroqProvider {
  name = 'groq';

  private getKey(): string {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY is not configured');
    return key;
  }

  // ── Streaming response ────────────────────────────────────────────────
  async streamCompletion(params: CompletionParams): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model ?? DEFAULT_MODEL,
        messages: params.messages,
        max_tokens: params.maxTokens ?? 1024,
        temperature: params.temperature ?? 0.4,
        stream: true,
      }),
    });

    if (!response.ok) {
      // Try fallback model on rate limit
      if (response.status === 429) {
        return this.streamCompletionWithModel(params, FALLBACK_MODEL);
      }
      const err = await response.text();
      throw new Error(`Groq API error ${response.status}: ${err}`);
    }

    return this.parseSSEStream(response.body!);
  }

  private async streamCompletionWithModel(
    params: CompletionParams,
    model: string
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        max_tokens: params.maxTokens ?? 1024,
        temperature: params.temperature ?? 0.4,
        stream: true,
      }),
    });
    if (!response.ok) throw new Error(`Groq fallback error ${response.status}`);
    return this.parseSSEStream(response.body!);
  }

  // ── Non-streaming completion ──────────────────────────────────────────
  async complete(params: CompletionParams): Promise<string> {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model ?? DEFAULT_MODEL,
        messages: params.messages,
        max_tokens: params.maxTokens ?? 2048,
        temperature: params.temperature ?? 0.3,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content ?? '';
  }

  // ── Parse Groq SSE stream → clean text stream ─────────────────────────
  // Groq returns: data: {"choices":[{"delta":{"content":"token"}}]}
  // We emit: just the raw text tokens for the client
  private parseSSEStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    return new ReadableStream({
      async start(controller) {
        const reader = upstream.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') { controller.close(); return; }
              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content;
                if (token) controller.enqueue(encoder.encode(token));
              } catch {}
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });
  }
}
