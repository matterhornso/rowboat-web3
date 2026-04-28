# Design System — Autonomous Memory

Inherits from TheAutonomous.org design system. All decisions below are locked.

## Product Context
- **What this is:** Persistent AI memory for executives — records meetings, extracts entities, builds a knowledge graph
- **Who it's for:** CEOs, COOs, VP Sales, founders at SMBs and enterprises
- **Space:** Executive intelligence, meeting intelligence (post-Limitless/Rewind gap)
- **Feeling:** Like a brilliant EA who remembers everything, wrapped in a premium boardroom product

## Aesthetic Direction
- **Same DNA as theautonomous.org** — Editorial/Magazine meets Luxury/Refined
- **Dark-first** — the recording/listening experience is dark mode. Memory browsing can be light.
- **Mood:** Confident, calm, trustworthy. A tool you open before a high-stakes meeting.
- **NOT:** Playful, techy, gradients, purple. This is premium executive tooling.

## Typography
- **Display:** Instrument Serif (`--font-instrument-serif`) — warmth, authority
- **Body/UI:** DM Sans (`--font-dm-sans`) — clean, modern, readable
- Load via `next/font/google` — already configured in layout.tsx

## Color
- **Primary:** #0A0A0B — near-black backgrounds
- **Accent (Gold):** #D4A853 — CTAs, active states, highlights. Used sparingly.
- **Secondary (Green):** #2D5A3D — success states, "memory saved" confirmations
- **Surface Light:** #FAFAF8 — warm off-white (light mode cards)
- **Surface Mid:** #F0EDE6 — warm cream (alternating sections)
- **Surface Dark:** #1A1918 — dark mode cards
- **Error:** #B33A3A
- **Warning:** #C4891A

## Recording UI
- **Background:** #0A0A0B
- **Recording indicator:** Pulsing #D4A853 dot
- **Waveform:** #D4A853 / 40% opacity
- **Timer:** DM Sans, tabular-nums, #FAFAF8

## Memory Cards
- **Background:** #1A1918 (dark) / #FAFAF8 (light)
- **Border:** 1px solid rgba(255,255,255,0.08) (dark) / #E2DED4 (light)
- **Entity type badge:** DM Sans 12px, uppercase, letter-spacing 0.08em

## Spacing
- **Base unit:** 8px — spacious density signals premium
- Scale: 4 / 8 / 16 / 24 / 32 / 48 / 64 / 96 / 128

## Border Radius
- Small: 6px | Medium: 12px | Large: 16px | XL: 24px | Full: 9999px

## Motion
- Entrance: cubic-bezier(0.16, 1, 0.3, 1) — snappy settle
- Duration: micro 100ms / short 200ms / medium 350ms
- Recording pulse: 1.5s ease-in-out infinite

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-23 | Dark-first UI | Recording experience is intimate/focused; dark reduces distraction |
| 2026-04-23 | Gold accent for recording indicator | Consistent with theautonomous.org, signals premium action |
| 2026-04-23 | Instrument Serif for headings | Boardroom-grade editorial feel vs. startup techy sans-serif |
| 2026-04-23 | No free tier | Executive product; free tier attracts wrong segment |
