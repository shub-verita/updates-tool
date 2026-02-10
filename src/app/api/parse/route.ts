import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";

const SYSTEM_PROMPT = `You are helping parse a daily work update for the Verita team.

Team members: Kenneth, Shubham, Bhupendra, Saahith, Rishi, Rithika

Active projects: Coactive, Treeswift, Preference Model, AGI Inc, Figma, Conde Nast, Causal Labs, Ops

Parse the raw update into individual tasks. For each task extract:
- description: clean, concise version of what was done/doing
- project: which project this belongs to (use Ops for general/admin stuff)
- status: one of done, in_progress, todo, blocked
- mentioned_people: array of team member names mentioned
- due_date: ISO date string if mentioned, otherwise null

Status detection hints:
- done/finished/completed/sent → done
- working on/doing/in progress → in_progress
- need to/will/should/todo/meeting → todo
- blocked/waiting/stuck → blocked

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "tasks": [
    {
      "description": "...",
      "project": "...",
      "status": "...",
      "mentioned_people": [],
      "due_date": null
    }
  ]
}`;

interface ParsedTask {
  description: string;
  project: string;
  status: string;
  mentioned_people: string[];
  due_date: string | null;
}

interface ParseResponse {
  tasks: ParsedTask[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rawText } = body;

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json(
        { error: "rawText is required and must be a string" },
        { status: 400 }
      );
    }

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: rawText },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : null;

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI model" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let parsed: ParseResponse;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from the response if it contains extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: "Failed to parse AI response as JSON", raw: content },
          { status: 500 }
        );
      }
    }

    // Validate the response structure
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      return NextResponse.json(
        { error: "Invalid response structure", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Parse API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
