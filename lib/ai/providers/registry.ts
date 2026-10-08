// ─── AI Provider Registry ──────────────────────────────────────────────────
// Abstraction layer so the chat route never depends on a specific provider.
// Swap providers by changing the active provider in one place.

import { GroqProvider } from './groq';
export type { ChatMessage, CompletionParams } from './groq';

export const aiProvider = new GroqProvider();
