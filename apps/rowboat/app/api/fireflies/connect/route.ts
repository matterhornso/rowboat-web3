import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/app/lib/mongodb";
import { FirefliesClient } from "@/app/lib/fireflies";

// POST /api/fireflies/connect
// Body: { apiKey: string }
// Validates the key against Fireflies user query, then stores it on the user doc.
// Stored as-is in MongoDB for now; encrypt at rest via Mongo Atlas CSFLE when
// you turn on production storage. Never returned in GET responses.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "apiKey is required" },
      { status: 400 }
    );
  }

  try {
    const client = new FirefliesClient(apiKey);
    const user = await client.getCurrentUser();

    const users = db.collection("users");
    await users.updateOne(
      { clerkId: userId },
      {
        $set: {
          "integrations.fireflies": {
            apiKey,
            connectedAt: new Date().toISOString(),
            firefliesEmail: user.email,
            firefliesUserId: user.user_id,
          },
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      connected: true,
      email: user.email,
      name: user.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to validate Fireflies API key", detail: message },
      { status: 400 }
    );
  }
}

// GET /api/fireflies/connect
// Returns connection status (never the key itself)
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = db.collection("users");
  const user = await users.findOne(
    { clerkId: userId },
    { projection: { "integrations.fireflies": 1 } }
  );

  const fireflies = user?.integrations?.fireflies;
  if (!fireflies) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    email: fireflies.firefliesEmail,
    connectedAt: fireflies.connectedAt,
  });
}

// DELETE /api/fireflies/connect — disconnect
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = db.collection("users");
  await users.updateOne(
    { clerkId: userId },
    { $unset: { "integrations.fireflies": "" } }
  );

  return NextResponse.json({ disconnected: true });
}
