import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

export const ENTITY_EXTRACTION_PROMPT = `You are an expert executive assistant. Extract structured entities from this meeting transcript.

Return a JSON object with this exact shape:
{
  "people": [{ "name": string, "role"?: string, "company"?: string, "email"?: string, "notes"?: string }],
  "commitments": [{ "description": string, "owner"?: string, "dueDate"?: string, "status": "pending" }],
  "events": [{ "title": string, "date"?: string, "attendeeNames": string[], "location"?: string, "outcome"?: string }],
  "notes": [{ "content": string, "tags": string[] }]
}

Rules:
- Only include entities that are clearly mentioned
- dueDate should be ISO date string (YYYY-MM-DD) if determinable
- For commitments, owner is "me" if the speaker committed to do something, or the person's name otherwise
- Keep notes concise — key decisions, numbers, strategic insights
- Return valid JSON only, no markdown

Transcript:
`;

export interface ExtractedEntities {
  people: Array<Record<string, unknown>>;
  commitments: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  notes: Array<Record<string, unknown>>;
}

export async function extractEntitiesFromTranscript(
  transcript: string
): Promise<{
  extracted: ExtractedEntities;
  flatEntities: Array<{ type: string } & Record<string, unknown>>;
}> {
  const claudeResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    messages: [
      { role: "user", content: ENTITY_EXTRACTION_PROMPT + transcript },
    ],
  });

  const rawJson =
    (claudeResponse.content[0] as { type: string; text: string }).text ?? "{}";

  let extracted: ExtractedEntities = {
    people: [],
    commitments: [],
    events: [],
    notes: [],
  };

  try {
    extracted = JSON.parse(rawJson);
  } catch {
    console.warn(
      "[entity-extraction] JSON parse failed, returning empty entities"
    );
  }

  const flatEntities = [
    ...(extracted.people ?? []).map((p) => ({ type: "person", ...p })),
    ...(extracted.commitments ?? []).map((c) => ({
      type: "commitment",
      ...c,
    })),
    ...(extracted.events ?? []).map((e) => ({ type: "event", ...e })),
    ...(extracted.notes ?? []).map((n) => ({ type: "note", ...n })),
  ];

  return { extracted, flatEntities };
}

export async function writeRecordingAndEntities(params: {
  userId: string;
  title: string;
  transcript: string;
  source: "voice" | "fireflies" | "otter" | "granola" | "upload";
  sourceRef?: string;
  durationSeconds?: number;
  audioUrl?: string;
  recordedAt?: string;
}): Promise<{
  recordingId: string;
  entityCount: number;
  entities: Array<{ type: string } & Record<string, unknown>>;
}> {
  const { flatEntities } = await extractEntitiesFromTranscript(
    params.transcript
  );

  const recordingId = new ObjectId();
  const now = new Date().toISOString();

  const recordings = db.collection("recordings");
  await recordings.insertOne({
    _id: recordingId,
    userId: params.userId,
    title: params.title,
    transcript: params.transcript,
    source: params.source,
    sourceRef: params.sourceRef,
    durationSeconds: params.durationSeconds,
    audioUrl: params.audioUrl,
    recordedAt: params.recordedAt ?? now,
    extractedEntities: flatEntities,
    processingStatus: "done",
    createdAt: now,
    updatedAt: now,
  });

  if (flatEntities.length > 0) {
    const memoryNodes = db.collection("memory_nodes");
    await memoryNodes.insertMany(
      flatEntities.map((entity) => ({
        _id: new ObjectId(),
        userId: params.userId,
        recordingId: recordingId.toString(),
        entity,
        createdAt: now,
      }))
    );
  }

  return {
    recordingId: recordingId.toString(),
    entityCount: flatEntities.length,
    entities: flatEntities,
  };
}
