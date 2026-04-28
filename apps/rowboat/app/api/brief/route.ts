/**
 * Pre-meeting brief generator
 * POST /api/brief
 * Body: { personName?: string, topic?: string, meetingContext?: string }
 *
 * Queries the knowledge graph for relevant entities, then uses Claude Sonnet
 * to synthesize a structured pre-meeting brief.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/app/lib/mongodb";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

const BRIEF_SYSTEM_PROMPT = `You are a brilliant executive assistant preparing a concise pre-meeting brief.
You have access to the executive's private memory — past conversations, commitments, and notes about people.

Write a structured brief that covers:
1. **Who you're meeting** — role, company, relationship history
2. **Open commitments** — what was promised (by either party), status
3. **Key context** — deals in flight, last conversation summary, important background
4. **Suggested talking points** — 2-3 specific items to raise based on history
5. **Watch-outs** — anything sensitive or unresolved

Be concise, direct, and specific. Name real details from the memory. Skip anything generic.
If memory is sparse, say so — don't invent.`;

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { personName, topic, meetingContext } = body;

    if (!personName && !topic) {
        return NextResponse.json({ error: "personName or topic is required" }, { status: 400 });
    }

    const memoryNodes = db.collection("memory_nodes");

    // Build a search filter to pull relevant memory
    const searchTerms = [personName, topic].filter(Boolean);
    const regexOr = searchTerms.flatMap((term) => [
        { "entity.name": { $regex: term, $options: "i" } },
        { "entity.description": { $regex: term, $options: "i" } },
        { "entity.content": { $regex: term, $options: "i" } },
        { "entity.company": { $regex: term, $options: "i" } },
        { "entity.title": { $regex: term, $options: "i" } },
        { "entity.attendeeNames": { $regex: term, $options: "i" } },
    ]);

    const relevantNodes = await memoryNodes
        .find({ userId, ...(regexOr.length > 0 ? { $or: regexOr } : {}) })
        .sort({ createdAt: -1 })
        .limit(80)
        .toArray();

    // Serialize memory for the prompt
    const memoryText = relevantNodes.length > 0
        ? relevantNodes
            .map((n) => JSON.stringify(n.entity))
            .join("\n")
        : "No relevant memory found for this person or topic.";

    const userPrompt = [
        personName && `Meeting with: ${personName}`,
        topic && `Topic: ${topic}`,
        meetingContext && `Context: ${meetingContext}`,
        "",
        "Relevant memory:",
        memoryText,
    ].filter((l) => l !== undefined).join("\n");

    const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: BRIEF_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
    });

    const brief = (response.content[0] as { type: string; text: string }).text ?? "";

    return NextResponse.json({
        brief,
        memoryNodesUsed: relevantNodes.length,
        personName,
        topic,
    });
}
