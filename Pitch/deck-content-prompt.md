---
date: 2026-05-07
type: pitch-asset
tags: [pitch, deck, content, prompt]
---

# Pitch Deck Content Prompt

Use this prompt verbatim in Gamma, ChatGPT, Claude, or any deck AI tool to generate slide content that matches the existing Volant deck aesthetic.

---

## Visual Style Reference (tell the tool this first)

```
Design system:
- Background: #0d0d0d (near black, not pure black)
- Card/panel background: #111111 to #1a1a1a
- Text: #f0f0f0 (off-white, not pure white)
- Borders: 1px solid #2a2a2a (barely visible, structural only)
- No gradients. No drop shadows. No decorative color.
- Accent: none — monochrome throughout except functional status colors

Typography:
- Slide headline: Bold, 36–44pt, weight 700–800, left-aligned
- Section label (above headline): ALL CAPS, 9–10pt, letter-spacing 0.15em, color #888888
- Body / card text: Regular, 11–13pt, color #cccccc, line-height 1.6
- Card number labels: e.g. "01", "02" — small caps or numeric, 9pt, color #888888, positioned top-left of each card
- Footer (bottom strip): "VOLANT · B2B SaaS · Fleet Operations Platform · eVTOL Research Brief · UIUC 2026 · CONFIDENTIAL · FOR DISCUSSION PURPOSES ONLY · [slide#] / [total]"

Layout rules:
- Full-bleed dark background, no slide borders
- Content left-aligned with ~60–80px left margin
- Grid slides: 3 columns × 2 rows of equal-sized dark cards, ~8px gaps, no rounded corners
- Table slides: left column = "Samsara/Trucking" capability, right column = "Aviation Today" gap — expose the gap, don't close it
- Cover slide: headline top-left, 2-line body below, author names bottom-left, tagline above authors
- "Why now" slide: timeline or 2–3 bullets with dates, no graphics needed
```

---

## Voice Rules (apply to all copy)

- Lead with the problem or the frame, not the solution
- Researcher tone, not founder tone: "We're studying this" beats "We built this"
- Two sentences per point max — state it, justify it once
- Never say: "innovative", "cutting-edge", "excited to share", "we believe", "potentially"
- Numbers need context: "$25B Samsara for trucking" before any market size number
- Be explicit about what's unvalidated: "Hypothesis: $200–500/aircraft/month — not yet validated"
- Domain fluent: use Part 135, LAANC, FAA, deconfliction, eVTOL, UAS, UTM without explaining them

---

## Slides to Generate / Expand

### Slide 4 — Why Now
**Section label:** WHY NOW

**Headline:** The window to build this right is before commercial operations begin — not during.

**Content points:**
- Pre-commercial: Fleets small, manual ops work. But infrastructure decisions are being made right now.
- First commercial eVTOL slots: Archer 100% FAA acceptance at Midnight (2025). Joby targeting 2025–2026.
- Once operators are at scale, switching costs are locked in. The Samsara for aviation gets built in the next 18 months or it gets built by an OEM.
- Regulatory window: FAA Part 135 + LAANC automation = compliance tooling will be mandatory, not optional.

---

### Slide 5 — Our Approach / What We're Building
**Section label:** WHAT WE'RE BUILDING

**Headline:** A fleet ops layer that sits between the aircraft and the operator — not inside the OEM stack.

**Content:**
> We're building the software infrastructure that lets an operator run 30+ aircraft the way a logistics company runs 300 trucks. Real-time visibility, mission dispatch, maintenance tracking, compliance, analytics — in one operator-scoped platform.

**Three-column card row:**
- **01 START WITH DRONES NOW** — Commercial drone operators (Part 107 / Part 135) have the same ops complexity problem today. Ship there first, carry the product forward to eVTOL.
- **02 OPEN API ARCHITECTURE** — Platform connects to aircraft telemetry via open APIs. Not OEM-specific. Designed for a multi-manufacturer fleet from day one.
- **03 BUILT FOR COMPLIANCE** — FAA Part 135, LAANC, pilot certifications, maintenance logs. Not bolted on — schema-native from the start.

---

### Slide 6 — Business Model
**Section label:** BUSINESS MODEL

**Headline:** Per-aircraft SaaS. Scales with the fleet, not the headcount.

**Content:**
- **Pricing hypothesis (unvalidated):** $200–500 / aircraft / month
- **Comparable:** Samsara charges $360–600 / vehicle / year for trucking; aviation ops complexity justifies higher ASP
- **Land and expand:** Start with 5–10 drone tails at a single operator. Expand as fleet grows. Follow the same operator into eVTOL.
- **Gross margin target:** 80%+ (SaaS infrastructure cost; no hardware, no per-flight variable cost)
- **No freemium.** Operators buying this are buying compliance infrastructure, not a productivity tool. Price signals seriousness.

---

### Slide 7 — Market
**Section label:** MARKET SIZE

**Headline:** The trucking fleet management market is $25B. Aviation is pre-Samsara.

**Content (3-panel):**
- **TAM — $9.45B by 2033** — Global eVTOL fleet management software (MarketsandMarkets, 2023 est.). 31.2% CAGR.
- **SAM — ~$1.2B** — North American commercial drone + early eVTOL operators reachable by 2028 with SaaS model.
- **SOM — ~$50–80M ARR** — 1,000–2,000 aircraft tails at $200–500/mo across 30–50 operators. Achievable in 5 years post-launch.

*Caveat: All market sizing is analyst-estimate territory. The real signal is operator behavior, not TAM slides.*

---

### Slide 8 — Team
**Section label:** THE TEAM

**Headline:** Two UIUC aerospace engineers. Domain-first, not software-first.

**Content:**
- **Aarav Verma** — Aerospace Engineering, UIUC. [add your specific background here]. Focused on operator-side product and GTM.
- **Tharun [last name]** — [add background]. Focused on platform architecture and backend infrastructure.
- **Why us:** We understand the airspace, the FAA regulatory stack, and the operator workflows — not just the software. That domain gap is where bad fleet tools get built.
- **Advisory / validation (if applicable):** [operator contacts, UIUC aviation lab, any industry advisors]

---

### Slide 9 — Ask / Close
**Section label:** THE ASK

**Headline:** We're not pitching a finished product. We're finding the right people to build it with.

**Content:**
> The platform is in development. Slices 1–2 (fleet visibility + mission dispatch) are live. We're looking for operators willing to stress-test it against real fleet data — and investors who understand that the aviation software gap gets solved in the next 24 months.

**Three asks (card row):**
- **01 OPERATOR ACCESS** — 30-minute call with an ops or dispatch lead at a drone/eVTOL operator. We want to break our assumptions before we scale them.
- **02 INTRODUCTIONS** — Warm intros to Archer, Joby, Wisk, or Beta ops teams. We're not pitching — we're listening.
- **03 PRE-SEED CAPITAL** — Raising $[X]K to fund 12 months of product development and operator pilots. Thesis: get one operator to $10K ARR before raising a seed round.

---

## What to Keep Unchanged

- Footer format: `VOLANT · B2B SaaS · Fleet Operations Platform   eVTOL Research Brief · UIUC 2026   CONFIDENTIAL · FOR DISCUSSION PURPOSES ONLY   [slide] / [total]`
- All slides left-aligned
- No images, no stock photos — all text and geometric layout
- Monochrome except functional card borders
- Section labels always in ALL CAPS, small, gray, above the headline
