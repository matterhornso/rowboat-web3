import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { DeepgramClient } from "@deepgram/sdk";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY ?? "" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

const s3 = new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
});

const ENTITY_EXTRACTION_PROMPT = `You are an expert executive assistant. Extract structured entities from this meeting transcript.

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

export async function POST(request: NextRequest) {
    try {
        // Auth check
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const audioFile = formData.get("audio") as File | null;
        const title = formData.get("title") as string | undefined;

        if (!audioFile) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        const recordingId = new ObjectId();
        const now = new Date().toISOString();

        // Insert recording as pending
        const recordings = db.collection("recordings");
        await recordings.insertOne({
            _id: recordingId,
            userId,
            title: title ?? `Recording ${new Date().toLocaleDateString()}`,
            transcript: "",
            processingStatus: "transcribing",
            extractedEntities: [],
            createdAt: now,
        });

        // Upload to S3 (non-blocking — fire and forget the URL update)
        let audioUrl: string | undefined;
        if (process.env.AWS_S3_BUCKET) {
            const s3Key = `recordings/${userId}/${recordingId.toString()}.webm`;
            await s3.send(new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: s3Key,
                Body: audioBuffer,
                ContentType: audioFile.type || "audio/webm",
            }));
            audioUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com/${s3Key}`;
        }

        // Transcribe with Deepgram (v5 SDK: listen.v1.media.transcribeFile)
        let transcript = "";
        let durationSeconds: number | undefined;
        try {
            const dgResult = await deepgram.listen.v1.media.transcribeFile(
                audioBuffer,
                {
                    model: "nova-3",
                    smart_format: true,
                    punctuate: true,
                    diarize: true,
                    language: "en",
                }
            );
            // MediaTranscribeResponse is a union; the sync response has .results
            const syncResult = dgResult as { results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> }; metadata?: { duration?: number } };
            transcript = syncResult?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
            durationSeconds = syncResult?.metadata?.duration;
        } catch (dgErr) {
            const message = dgErr instanceof Error ? dgErr.message : "Transcription failed";
            await recordings.updateOne(
                { _id: recordingId },
                { $set: { processingStatus: "error", processingError: message, updatedAt: new Date().toISOString() } }
            );
            return NextResponse.json({ error: "Transcription failed", detail: message }, { status: 500 });
        }

        // Update with transcript, move to extracting
        await recordings.updateOne(
            { _id: recordingId },
            { $set: { transcript, durationSeconds, audioUrl, processingStatus: "extracting", updatedAt: new Date().toISOString() } }
        );

        // Extract entities with Claude Haiku (fast + cheap)
        const claudeResponse = await anthropic.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 2048,
            messages: [
                {
                    role: "user",
                    content: ENTITY_EXTRACTION_PROMPT + transcript,
                },
            ],
        });

        const rawJson = (claudeResponse.content[0] as { type: string; text: string }).text ?? "{}";

        let extracted = { people: [], commitments: [], events: [], notes: [] };
        try {
            extracted = JSON.parse(rawJson);
        } catch {
            console.warn("Entity extraction JSON parse failed, using empty entities");
        }

        // Build flattened entity array for the recording
        const extractedEntities = [
            ...((extracted.people ?? []).map((p: object) => ({ type: "person", ...p }))),
            ...((extracted.commitments ?? []).map((c: object) => ({ type: "commitment", ...c }))),
            ...((extracted.events ?? []).map((e: object) => ({ type: "event", ...e }))),
            ...((extracted.notes ?? []).map((n: object) => ({ type: "note", ...n }))),
        ];

        // Write memory nodes to knowledge graph
        const memoryNodes = db.collection("memory_nodes");
        if (extractedEntities.length > 0) {
            await memoryNodes.insertMany(
                extractedEntities.map((entity) => ({
                    _id: new ObjectId(),
                    userId,
                    recordingId: recordingId.toString(),
                    entity,
                    createdAt: new Date().toISOString(),
                }))
            );
        }

        // Mark recording done
        await recordings.updateOne(
            { _id: recordingId },
            { $set: { extractedEntities, processingStatus: "done", updatedAt: new Date().toISOString() } }
        );

        return NextResponse.json({
            recordingId: recordingId.toString(),
            transcript,
            durationSeconds,
            extractedEntities,
            entityCount: extractedEntities.length,
        });
    } catch (err) {
        console.error("Voice pipeline error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recordings = db.collection("recordings");
    const docs = await recordings
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

    return NextResponse.json(
        docs.map((d) => ({ ...d, id: d._id.toString(), _id: undefined }))
    );
}
