import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export const MODELS = {
  scriptWriter: "claude-opus-4-7",
  editorAgent: "claude-opus-4-7",
  metadata: "claude-sonnet-4-6",
} as const;
