import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export const MODELS = {
  scriptWriter: "claude-sonnet-4-6",
  editorAgent: "claude-sonnet-4-6",
  metadata: "claude-haiku-4-5-20251001",
} as const;
