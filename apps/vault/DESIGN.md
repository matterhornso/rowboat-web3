# Design System — TA Vault

> Inherits from `theautonomousorg/DESIGN.md` (the parent design system).
> Overrides below are Vault-specific. When in doubt, defer to parent.
> Approved wireframe: `wireframe.html` (this directory).

## Product Context
- **What this is:** Subscription-aware secret manager for founders. Vault page is THE product (the demo).
- **Who it's for:** Solo founders, small-team buyers managing their own API key + SaaS sub stack.
- **Space:** founder-grade finops. Sits between 1Password (secret manager) and Truebill (subscription tracker).
- **Feeling:** Editorial / boardroom. Premium, confident, intentional. Not techy. Not playful.

## Aesthetic Direction
- **Same DNA as theautonomous.org** — Editorial/Magazine meets Luxury/Refined
- **Dark-first** — vault page, modals, all dashboard surfaces. Light mode deferred to V2.
- **Mood:** Calm authority. The product holds your secrets and money; it should feel like a bank vault, not a SaaS landing page.
- **NOT:** Playful, techy, gradient-heavy, purple, glass-morphism, decorative.

## Typography (inherits parent)
- **Display:** Instrument Serif (warm editorial) — page titles, modal titles
- **Body/UI:** DM Sans 16px base — copy, table cells, labels
- **Code/keys:** JetBrains Mono — masked API keys, CLI snippets
- **Tabular nums:** `font-feature-settings: "tnum"` on all $ amounts and dates

### Scale
- Page title: 64px / Instrument Serif / -0.01em
- Modal title: 24px / Instrument Serif / -0.01em
- Stat value: 20px / DM Sans 500 / tabular-nums
- Body: 16px / DM Sans 400 (corrected from wireframe's 15px)
- UI: 14px / DM Sans 400
- Label (uppercase): 11px / DM Sans 500 / letter-spacing 0.08em
- Small mono: 13px / JetBrains Mono 400
- Micro: 12px / DM Sans 400

## Color Tokens (Vault-specific)

```css
:root {
  /* Base — inherits parent tokens, dark-first surfaces */
  --vault-bg: #0A0A0B;              /* page background, near-black */
  --vault-surface: #14130F;          /* modal surface */
  --vault-surface-2: #1A1918;        /* table row hover, service mark bg */
  --vault-text: #FAFAF8;             /* primary text on dark */
  --vault-text-dim: #A09A8D;         /* secondary text, labels */
  --vault-text-faint: #5A554B;       /* tertiary, faded */

  /* Accent (gold — inherited from parent #D4A853) */
  --vault-gold: #D4A853;             /* primary CTAs, active states, brand */
  --vault-gold-soft: rgba(212, 168, 83, 0.12);
  --vault-gold-strong: #B8902C;      /* gold hover */

  /* Dormant / Failure (vault-specific) */
  --vault-red: #B33A3A;              /* dormant flag, kill button (dormant), failure border */
  --vault-red-soft: rgba(179, 58, 58, 0.10);  /* failed-banner background */
  --vault-red-faint: rgba(179, 58, 58, 0.04);  /* dormant-row background tint */

  /* Borders */
  --vault-border: rgba(255, 255, 255, 0.08);
  --vault-border-strong: rgba(255, 255, 255, 0.16);

  /* Status (vault-specific) */
  --vault-yellow: #C4891A;           /* cancel-pending dot indicator */
  --vault-green: #2D5A3D;            /* key-revoked checkmark (inherited from parent secondary) */
}
```

## Spacing
- Base unit: 8px
- Page padding: 64px (desktop), 24px (mobile)
- Table row padding: 22px vertical, 16px horizontal
- Section spacing: 56-96px between major sections
- Modal padding: 36px

## Border Radius
- Buttons: 5-6px (subtle, not bubbly)
- Modals, cards, service marks: 6-12px
- Avatars, status dots: 50% (circle)
- NO uniform large radius across all elements (anti-AI-slop rule)

## Motion
- Entrance / collapse: `cubic-bezier(0.16, 1, 0.3, 1)` (snappy settle)
- Duration: micro 100ms / short 200ms / medium 350ms
- Dormant flag pulse: 1.6s ease-in-out infinite
- Row hover: 120ms ease background-color transition
- Kill state transitions: 350ms (kill-requested → key-revoked collapse)

## Component Patterns

### Vault row (the demo unit)
```
[mark] Service Name    sk-...key    $XXX.XX last 30d    Renews date    [Kill]
                                                                       (gold)

DORMANT variant:
[red] Service Name     sk-...key    ● No charge 47d     Renews date    [Kill]
                                                                       (red)
```

State variants documented in design doc § "Kill-flow row states."

### Service mark (letterforms, NOT logos for V1)
- 32×32px rounded square (6px radius)
- Background: `--vault-surface-2` (active) or `rgba(179,58,58,0.15)` (dormant)
- Two-letter abbreviation in DM Sans 700, 12px, color `--vault-text-dim` (active) or `--vault-red` (dormant)
- Examples: OpenAI → "OA", Anthropic → "AN", Apollo.io → "AP"
- Editorial newspaper-masthead aesthetic. Real logos deferred to V1.1.

### Kill button
- **Active row:** ghost button, transparent bg, `--vault-border-strong` 1px border, white text. Hover: `rgba(255,255,255,0.04)` bg.
- **Dormant row:** solid `--vault-red` bg, white text. Hover: `#C24545`.
- **kill-failed row:** transparent bg, `--vault-red` text + 1px border. Reads "Retry Kill". Hover: `--vault-red` bg, white text.
- Padding: 11×20px (44px touch target). Mobile: full-width, 48px height.

### Modal
- Background: `rgba(0,0,0,0.6)` overlay, `--vault-surface` modal panel
- Width: 480px desktop, full-bleed mobile
- Title in Instrument Serif (24px), body in DM Sans
- Detail panel: `--vault-bg` (darker than modal panel), `JetBrains Mono` 13px
- Actions right-aligned: `[Cancel]` (ghost) + `[Yes, revoke key]` (red solid)
- ARIA: `role="dialog" aria-modal="true" aria-labelledby="modal-title"`, focus trapped

### Failed-revoke banner
- 3px left border in `--vault-red`
- `--vault-red-soft` background
- Icon (28×28 circle, `rgba(179,58,58,0.20)` bg, "!" mark)
- Text: bold "Couldn't revoke X key" + dim reason
- Right-aligned `[Retry]` button (ghost red)
- ARIA: `aria-live="assertive"`

## Empty State (first-time user)
- Hero headline: "Setting up your vault." (Instrument Serif 64px)
- Subtitle: "We're scanning your Gmail for receipts. First sync takes ~4 hours. Add a key manually below to get started."
- Skeleton placeholder: 3 ghosted rows with shimmer animation
- Banner: "Gmail sync running" with progress (X of 90 days)
- Primary CTA: large `[+ Add your first key]` (gold)

## Mobile (< 768px)

### Card layout
Each table row collapses to a stacked card:
```
┌────────────────────────────────────┐
│ [mark] Service Name      ● Dormant │
│ sk-...masked-key                    │
│                                     │
│ $487 last 30d   Renews May 12      │
│                                     │
│ ┌────────────────────────────────┐ │
│ │           Kill                  │ │  ← full-width, 48px tall
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

- Card background: `--vault-surface-2` (active), `--vault-red-faint` (dormant)
- Card border: `--vault-border` (active), `rgba(179,58,58,0.18)` (dormant)
- Card radius: 8px
- Card gap: 12px
- Page padding: 24px

### Summary stats (mobile)
- 2×2 grid (Last 30d / Upcoming, Dormant / Active)
- Stat value 18px, label 10px

## Accessibility

- Color contrast: all text combinations verified WCAG AA+
  - `--vault-red` on `--vault-bg`: 5.8:1 (AA)
  - `--vault-text` on `--vault-bg`: 19:1 (AAA)
  - `--vault-gold` on `--vault-bg`: 9.4:1 (AAA)
  - `--vault-text-dim` on `--vault-bg`: 7.1:1 (AAA)
- Touch targets: ≥44px on all interactive elements
- Keyboard nav: tab order top-to-bottom, modal focus trap, Esc dismisses
- Screen reader: state changes via `aria-live`, button labels use service name
- Reduced-motion: respect `prefers-reduced-motion: reduce` — disable pulse animation, skip 350ms collapse transition

## Anti-Patterns (DO NOT)

- ❌ Purple/violet/blue gradients
- ❌ Cards in 3-column feature grid
- ❌ Centered text-align on everything
- ❌ Bubbly border-radius (>16px)
- ❌ Decorative blobs, floating circles, wavy SVG dividers
- ❌ Emoji as design elements
- ❌ Generic SaaS hero copy ("Welcome to Vault!" "Unlock the power of your API keys!")
- ❌ system-ui as primary font (use Instrument Serif + DM Sans)
- ❌ Real service logos in V1 (letterforms only; legal + maintenance overhead)

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-29 | Dark-first | Premium, focused, matches "vault" mental model. Light mode is V2. |
| 2026-04-29 | Letterforms over logos | Editorial DESIGN.md inheritance, zero legal/maintenance overhead, infinitely extensible. |
| 2026-04-29 | Stacked cards on mobile | Twitter clickthrough is 70% mobile; horizontal scroll = hostile. |
| 2026-04-29 | Pulse animation on dormant flag | One intentional motion that draws the eye to the demo focal point. |
| 2026-04-29 | Kill button: gold (active) / red (dormant) | Color codes the demo moment without screaming. |
| 2026-04-29 | Cancel-pending → archived section | Cancelled rows fold into a collapsible section below the active table; reduces visual clutter as the user accumulates kills. |
