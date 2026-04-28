import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/app/lib/mongodb";
import { FirefliesClient, transcriptToText } from "@/app/lib/fireflies";
import { writeRecordingAndEntities } from "@/app/lib/entity-extraction";

// POST /api/fireflies/import
// Body: { limit?: number, skip?: number, fromDate?: string, toDate?: string }
// Pulls transcripts from Fireflies, skips ones already imported, pushes each
// through the entity extraction pipeline, returns counts + first few previews.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look up user's Fireflies API key
  const users = db.collection("users");
  const user = await users.findOne(
    { clerkId: userId },
    { projection: { "integrations.fireflies": 1 } }
  );
  const apiKey = user?.integrations?.fireflies?.apiKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Fireflies not connected. Connect it first at /api/fireflies/connect." },
      { status: 400 }
    );
  }

  let body: {
    limit?: number;
    skip?: number;
    fromDate?: string;
    toDate?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const limit = Math.min(body.limit ?? 25, 50);

  const client = new FirefliesClient(apiKey);

  let transcripts;
  try {
    transcripts = await client.listTranscripts({
      limit,
      skip: body.skip ?? 0,
      fromDate: body.fromDate,
      toDate: body.toDate,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch Fireflies transcripts", detail: message },
      { status: 502 }
    );
  }

  // Skip already-imported transcripts
  const recordings = db.collection("recordings");
  const existingRefs = await recordings
    .find(
      { userId, source: "fireflies", sourceRef: { $in: transcripts.map((t) => t.id) } },
      { projection: { sourceRef: 1 } }
    )
    .toArray();
  const existingIds = new Set(existingRefs.map((r) => r.sourceRef));

  const results: Array<{
    firefliesId: string;
    title: string;
    recordingId?: string;
    entityCount?: number;
    status: "imported" | "skipped" | "error";
    error?: string;
  }> = [];

  let imported = 0;
  let skipped = 0;
  let errored = 0;

  for (const t of transcripts) {
    if (existingIds.has(t.id)) {
      skipped += 1;
      results.push({ firefliesId: t.id, title: t.title, status: "skipped" });
      continue;
    }

    const transcriptText = transcriptToText(t.sentences ?? []);
    if (!transcriptText.trim()) {
      skipped += 1;
      results.push({
        firefliesId: t.id,
        title: t.title,
        status: "skipped",
        error: "empty transcript",
      });
      continue;
    }

    try {
      const result = await writeRecordingAndEntities({
        userId,
        title: t.title || `Fireflies meeting ${t.date}`,
        transcript: transcriptText,
        source: "fireflies",
        sourceRef: t.id,
        durationSeconds: t.duration,
        recordedAt: t.date,
      });
      imported += 1;
      results.push({
        firefliesId: t.id,
        title: t.title,
        recordingId: result.recordingId,
        entityCount: result.entityCount,
        status: "imported",
      });
    } catch (err) {
      errored += 1;
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({
        firefliesId: t.id,
        title: t.title,
        status: "error",
        error: message,
      });
    }
  }

  return NextResponse.json({
    total: transcripts.length,
    imported,
    skipped,
    errored,
    results,
  });
}

// GET /api/fireflies/import?limit=10
// Preview transcripts without importing. Useful for the UI to show
// "here's what we'll import" before the user confirms.
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = db.collection("users");
  const user = await users.findOne(
    { clerkId: userId },
    { projection: { "integrations.fireflies": 1 } }
  );
  const apiKey = user?.integrations?.fireflies?.apiKey;
  if (!apiKey) {
    return NextResponse.json({ error: "Fireflies not connected" }, { status: 400 });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    Number.parseInt(url.searchParams.get("limit") ?? "10", 10),
    50
  );

  const client = new FirefliesClient(apiKey);

  try {
    const transcripts = await client.listTranscripts({ limit });

    // Mark which have already been imported
    const recordings = db.collection("recordings");
    const existing = await recordings
      .find(
        {
          userId,
          source: "fireflies",
          sourceRef: { $in: transcripts.map((t) => t.id) },
        },
        { projection: { sourceRef: 1 } }
      )
      .toArray();
    const existingIds = new Set(existing.map((r) => r.sourceRef));

    return NextResponse.json({
      transcripts: transcripts.map((t) => ({
        id: t.id,
        title: t.title,
        date: t.date,
        duration: t.duration,
        sentenceCount: t.sentences?.length ?? 0,
        imported: existingIds.has(t.id),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to preview Fireflies transcripts", detail: message },
      { status: 502 }
    );
  }
}
