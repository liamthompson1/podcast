import { type NextRequest, NextResponse } from "next/server";
import { anthropic, MODELS } from "@/lib/anthropic";
import { showSystemPrompt } from "@/lib/prompts";
import type { ScriptTurn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface EditChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface EditRequest {
  script: ScriptTurn[];
  userMessage: string;
  history: EditChatMessage[];
  guestName: string;
}

import type Anthropic from "@anthropic-ai/sdk";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "replace_turn",
    description:
      "Replace the full text of a single existing turn. Use for rewrites of one beat.",
    input_schema: {
      type: "object",
      properties: {
        turnId: { type: "string" },
        newText: { type: "string" },
      },
      required: ["turnId", "newText"],
    },
  },
  {
    name: "insert_turn",
    description:
      "Insert a new turn after the given turnId. Use to add a beat the user wants.",
    input_schema: {
      type: "object",
      properties: {
        afterTurnId: { type: "string" },
        speaker: { type: "string", enum: ["Ada", "Guest"] },
        beat: {
          type: "string",
          enum: ["cold-open", "tension", "pivot", "reveal", "hand-off"],
        },
        text: { type: "string" },
      },
      required: ["afterTurnId", "speaker", "beat", "text"],
    },
  },
  {
    name: "delete_turn",
    description: "Remove a turn entirely.",
    input_schema: {
      type: "object",
      properties: { turnId: { type: "string" } },
      required: ["turnId"],
    },
  },
  {
    name: "replace_all",
    description:
      "Replace the entire script. Only use when the user asks for a wholesale rewrite.",
    input_schema: {
      type: "object",
      properties: {
        turns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              speaker: { type: "string", enum: ["Ada", "Guest"] },
              beat: {
                type: "string",
                enum: ["cold-open", "tension", "pivot", "reveal", "hand-off"],
              },
              text: { type: "string" },
            },
            required: ["speaker", "beat", "text"],
          },
        },
      },
      required: ["turns"],
    },
  },
];

function applyTools(
  script: ScriptTurn[],
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>,
): { script: ScriptTurn[]; results: string[] } {
  let next = [...script];
  const results: string[] = [];

  for (const call of toolCalls) {
    if (call.name === "replace_turn") {
      const id = String(call.input.turnId);
      const newText = String(call.input.newText);
      const idx = next.findIndex((t) => t.id === id);
      if (idx === -1) {
        results.push(`replace_turn: turn ${id} not found`);
        continue;
      }
      next[idx] = { ...next[idx], text: newText };
      results.push(`replace_turn: ${id} updated (${newText.length} chars)`);
    } else if (call.name === "insert_turn") {
      const after = String(call.input.afterTurnId);
      const idx = next.findIndex((t) => t.id === after);
      if (idx === -1) {
        results.push(`insert_turn: after ${after} not found`);
        continue;
      }
      const newTurn: ScriptTurn = {
        id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        speaker: call.input.speaker as ScriptTurn["speaker"],
        beat: call.input.beat as ScriptTurn["beat"],
        text: String(call.input.text),
      };
      next = [...next.slice(0, idx + 1), newTurn, ...next.slice(idx + 1)];
      results.push(`insert_turn: added after ${after} as ${newTurn.id}`);
    } else if (call.name === "delete_turn") {
      const id = String(call.input.turnId);
      const before = next.length;
      next = next.filter((t) => t.id !== id);
      results.push(
        next.length < before
          ? `delete_turn: ${id} removed`
          : `delete_turn: ${id} not found`,
      );
    } else if (call.name === "replace_all") {
      const turns = call.input.turns as Array<Omit<ScriptTurn, "id">>;
      next = turns.map((t, i) => ({ ...t, id: `r${Date.now().toString(36)}${i}` }));
      results.push(`replace_all: rewrote with ${next.length} turns`);
    }
  }

  return { script: next, results };
}

function scriptToMarkdown(script: ScriptTurn[], guestName: string): string {
  return script
    .map(
      (t) =>
        `[${t.id} | ${t.beat}] ${t.speaker === "Ada" ? "Ada" : guestName}: ${t.text}`,
    )
    .join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EditRequest;
    const { script, userMessage, history, guestName } = body;

    const editorSystem = `${showSystemPrompt()}

You are now in EDITOR mode. The user has a draft script and wants you to refine it.

The current script is shown below. Each turn has an id like t1, t2 — you must reference these exact ids when calling tools.

When the user asks for a change, do these things in order:
1. Briefly acknowledge what you're going to do (1 sentence).
2. Make the edits via the provided tools.
3. After tool calls, give a one-sentence summary of what you changed.

Prefer surgical edits. Use replace_all only when the user asks for a full rewrite.

CURRENT SCRIPT (guest is ${guestName}):

${scriptToMarkdown(script, guestName)}`;

    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: userMessage },
    ];

    const result = await anthropic().messages.create({
      model: MODELS.editorAgent,
      max_tokens: 6000,
      system: editorSystem,
      tools: TOOLS,
      messages,
    });

    const toolCalls = result.content
      .filter((b) => b.type === "tool_use")
      .map((b) => ({
        name: (b as { name: string }).name,
        input: (b as { input: Record<string, unknown> }).input,
      }));

    const textBlocks = result.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");

    const { script: nextScript, results: applyLog } = applyTools(
      script,
      toolCalls,
    );

    return NextResponse.json({
      assistantMessage: textBlocks || "Done.",
      script: nextScript,
      changes: applyLog,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
