import { type NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODELS } from "@/lib/anthropic";
import {
  showSystemPrompt,
  scriptGenUserPrompt,
  type ScriptGenInput,
} from "@/lib/prompts";
import type { ScriptTurn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const SCRIPT_TOOL: Anthropic.Tool = {
  name: "submit_script",
  description:
    "Submit the finished script for the episode. Call exactly once with all turns in order.",
  input_schema: {
    type: "object",
    properties: {
      workingTitle: {
        type: "string",
        description: "Punchy title, ideally a question, max 60 chars.",
      },
      turns: {
        type: "array",
        minItems: 20,
        items: {
          type: "object",
          properties: {
            speaker: { type: "string", enum: ["Ada", "Guest"] },
            beat: {
              type: "string",
              enum: ["cold-open", "tension", "pivot", "reveal", "hand-off"],
            },
            text: { type: "string", minLength: 1 },
          },
          required: ["speaker", "beat", "text"],
        },
      },
    },
    required: ["workingTitle", "turns"],
  },
};

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as ScriptGenInput;
    if (!input.idea || !input.guestName || !input.guestPersona) {
      return NextResponse.json(
        { error: "idea, guestName, guestPersona required" },
        { status: 400 },
      );
    }

    const result = await anthropic().messages.create({
      model: MODELS.scriptWriter,
      max_tokens: 6000,
      system: showSystemPrompt(),
      tools: [SCRIPT_TOOL],
      tool_choice: { type: "tool", name: "submit_script" },
      messages: [{ role: "user", content: scriptGenUserPrompt(input) }],
    });

    const toolUse = result.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { error: "model did not return tool use" },
        { status: 502 },
      );
    }

    const payload = toolUse.input as {
      workingTitle: string;
      turns: Array<Omit<ScriptTurn, "id">>;
    };

    const turns: ScriptTurn[] = payload.turns.map((t, i) => ({
      ...t,
      id: `t${i + 1}`,
    }));

    return NextResponse.json({
      workingTitle: payload.workingTitle,
      turns,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
