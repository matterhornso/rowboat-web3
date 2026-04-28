# Autonomous Memory

## Project
Persistent AI memory for executives, CEOs, and sales teams. Record meetings, conversations, and commitments — the AI builds a searchable knowledge graph of every person, deal, and decision. Never forget context again.

**URL:** memory.theautonomous.org
**Part of:** The Autonomous Org ecosystem
**Auth:** Clerk (shared instance with theautonomous.org)

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

## Tech Stack
- **Framework:** Next.js 15 App Router
- **Auth:** Clerk (`@clerk/nextjs`) — NEVER use Auth0
- **DB:** MongoDB (knowledge graph) + Redis (queues/cache)
- **AI:** Anthropic Claude (entity extraction, synthesis) via `@ai-sdk/anthropic`
- **Voice:** Deepgram (transcription)
- **Storage:** AWS S3 (audio files)
- **Payments:** Stripe
- **Deploy:** Railway

## Key Domain Concepts
- **Recording:** Audio file uploaded → Deepgram transcription → entity extraction → MongoDB write
- **Entity types:** Person, Conversation, Commitment, Event, Note
- **Knowledge graph:** Entities cross-referenced by ID in MongoDB
- **Pre-meeting brief:** Query knowledge graph → Claude synthesis → structured brief
- **Voice pipeline target:** <5s from upload to entities stored

## Architecture
```
app/
  api/
    voice/          ← NEW: audio upload + transcription
    memory/         ← NEW: knowledge graph CRUD
    brief/          ← NEW: pre-meeting brief generation
  (memory)/         ← NEW: memory UI pages
  projects/         ← rowboat agent builder (keep)
```

## Environment Variables
See `.env.example` for the full list.
Required for voice pipeline: `DEEPGRAM_API_KEY`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
Required for AI: `ANTHROPIC_API_KEY`
Required for auth: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

## Pricing
- Early Access: $99/mo
- Executive: $299/mo
- No free tier
