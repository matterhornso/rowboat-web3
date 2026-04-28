import { z } from "zod";

// ─── Entity types in the knowledge graph ─────────────────────────────────────

export const PersonEntity = z.object({
    type: z.literal("person"),
    name: z.string(),
    role: z.string().optional(),
    company: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).default([]),
});

export const CommitmentEntity = z.object({
    type: z.literal("commitment"),
    description: z.string(),
    owner: z.string().optional(),          // person name or "me"
    dueDate: z.string().optional(),        // ISO date string
    status: z.enum(["pending", "done", "cancelled"]).default("pending"),
    relatedPersonIds: z.array(z.string()).default([]),
});

export const EventEntity = z.object({
    type: z.literal("event"),
    title: z.string(),
    date: z.string().optional(),           // ISO date string
    attendeeNames: z.array(z.string()).default([]),
    location: z.string().optional(),
    outcome: z.string().optional(),
});

export const NoteEntity = z.object({
    type: z.literal("note"),
    content: z.string(),
    tags: z.array(z.string()).default([]),
});

// ─── Recording / Conversation ─────────────────────────────────────────────────

export const Recording = z.object({
    id: z.string(),
    userId: z.string(),                    // db user id
    title: z.string().optional(),
    transcript: z.string(),
    audioUrl: z.string().optional(),       // S3 URL
    durationSeconds: z.number().optional(),
    extractedEntities: z.array(z.discriminatedUnion("type", [
        PersonEntity,
        CommitmentEntity,
        EventEntity,
        NoteEntity,
    ])).default([]),
    processingStatus: z.enum(["pending", "transcribing", "extracting", "done", "error"]).default("pending"),
    processingError: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
});

// ─── Knowledge graph node (flattened entity with ownership) ──────────────────

export const MemoryNode = z.object({
    id: z.string(),
    userId: z.string(),
    recordingId: z.string().optional(),
    entity: z.discriminatedUnion("type", [
        PersonEntity,
        CommitmentEntity,
        EventEntity,
        NoteEntity,
    ]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
});

export type Recording = z.infer<typeof Recording>;
export type MemoryNode = z.infer<typeof MemoryNode>;
export type PersonEntity = z.infer<typeof PersonEntity>;
export type CommitmentEntity = z.infer<typeof CommitmentEntity>;
export type EventEntity = z.infer<typeof EventEntity>;
export type NoteEntity = z.infer<typeof NoteEntity>;
