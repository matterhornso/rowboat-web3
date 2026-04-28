import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/memory?type=person&q=john&limit=20
export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const q = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

    const memoryNodes = db.collection("memory_nodes");

    const filter: Record<string, unknown> = { userId };
    if (type) filter["entity.type"] = type;
    if (q) {
        filter["$or"] = [
            { "entity.name": { $regex: q, $options: "i" } },
            { "entity.description": { $regex: q, $options: "i" } },
            { "entity.content": { $regex: q, $options: "i" } },
            { "entity.title": { $regex: q, $options: "i" } },
        ];
    }

    const docs = await memoryNodes
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

    return NextResponse.json(
        docs.map((d) => ({ ...d, id: d._id.toString(), _id: undefined }))
    );
}

// POST /api/memory — manually add a memory node
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entity } = body;

    if (!entity?.type) {
        return NextResponse.json({ error: "entity.type is required" }, { status: 400 });
    }

    const memoryNodes = db.collection("memory_nodes");
    const _id = new ObjectId();
    await memoryNodes.insertOne({
        _id,
        userId,
        recordingId: null,
        entity,
        createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ id: _id.toString() }, { status: 201 });
}

// DELETE /api/memory?id=xxx
export async function DELETE(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const memoryNodes = db.collection("memory_nodes");
    const result = await memoryNodes.deleteOne({ _id: new ObjectId(id), userId });

    if (result.deletedCount === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
}
