# Guided Mode Strategy (Progressive Repo Tour)

## Goal
Build a guided, story-driven mode that progressively reveals the entire repository so the user is confidently led through the real code and its flows. The app is the narrator; the user learns only what the story reveals.

## Core Philosophy
- The app is the authority; navigation is guided, not freeform.
- Every reveal answers: "What does this line do for the flow?"
- The pacing alternates between explain → demonstrate → confirm.
- The narrative is specific to the repo: file paths, routes, templates, DB calls, and real symbols.

## Narrative Spine (Macro-Flow)
- Act 1: Entry points (routes/CLI/jobs/consumers).
- Act 2: Orchestration (controllers/services that coordinate flow).
- Act 3: Core logic (business rules, validation, transformation).
- Act 4: IO (DB, external APIs, files, queues).
- Act 5: Supporting cast (utils, config, templates, tests).

## Progressive Reveal Strategy
- Flow-first reveal: show only the next lines that advance the current flow.
- Expandable context: user can open a small context window (previous/next 5–10 lines).
- Controlled zoom: graph nodes remain, but labels/edges appear only when introduced.
- Locked navigation: restrict jumping; movement is via "Next beat" or narrator links.

## Line-Level Storytelling
- Each step binds to one line or a tight block.
- One-sentence narration: "This line chooses the user from the session."
- Immediate effect: highlight the next line that consumes the output.
- Micro-checkpoint: "What object do we have now?" (click to reveal).
- Slow Mode: 1–3 lines per step with a short narration.

## Flow Embedding (Truth Implant)
- Canonical flow traced end-to-end (no detours unless introduced).
- Echoing: repeat a short thread summary at each step.
- Chapter recaps: after each file, show a 2-sentence recap and "what you now know" list.

## Guided Exercises (Reinforcement)
- Click-to-reveal checks instead of typing.
- Examples:
  - "Which line sets the session cookie?"
  - "What happens if this condition fails?"

## Full-Repo Coverage Plan
- Phase 1: Main request flows (routes + handlers + service/data calls).
- Phase 2: Background flows (CLI, jobs, tasks).
- Phase 3: Cross-cutting infrastructure (auth, config, error handling).
- Phase 4: Tests and fixtures (proofs of logic).

## Gating Mechanics
- Reveal locks: next file unlocks after the current flow completes.
- Knowledge gates: quick recap prompt before unlocking next chapter.
- Scene tokens: user earns "flow tokens" to progress.

## UI Elements That Enforce the Story
- Narrator timeline with a fixed "you are here" pin.
- Story-only canvas: hide nodes not in the current arc.
- Reader as book: only one paragraph of code visible; page-turn motion.
- Memory sidebar: persistent "story so far" list (max 5 bullets).

## Context Everywhere (Add-on)
- Breadcrumb stack: "`/login` → `routes.py:42` → `auth.py:88` → `models.py:211`" with clickable jumps.
- Context cards per step:
  - Where this line came from (caller line).
  - Where it goes next (callee line).
  - Why it matters (one sentence anchored to flow).
- Explanatory context for every reveal:
  - What concept just appeared (e.g., session, ORM, blueprint, request lifecycle).
  - Why the concept exists in this app (not in general).
  - What the user should remember after this step.
- Inline cross-links: narrator text includes clickable `file.py:line` refs.
- "Why now?" and "Where next?" cues on every beat.
- Context halo: ghost-reveal the two most relevant external lines with links.
- Call-graph micro-map: tiny graph showing direct edges with file:line anchors.
- Flow ledger: running list of resolved facts with source links.
- Glossary tethering: one-line definitions with a clickable source line.
- Context-first narration: do not introduce a concept without a line reference.
- Self-healing context: show "you are here" range and provide jump-to-definition links.

## Explanatory Context Pattern (Narrator Templates)
- Concept: one sentence naming the idea and its role in this app.
- Why it exists here: one sentence tied to the current route/flow.
- What to remember: one sentence that the user should retain.
- Example templates:
  - "Concept: The session stores the logged-in user for this app."
  - "Why here: This route checks it before rendering the dashboard."
  - "Remember: If the session is missing, we redirect to `/login`."
  - "Concept: The ORM query builds the user object."
  - "Why here: This handler needs the user to decide the next view."
  - "Remember: The query output becomes `current_user` downstream."

## LLM Usage (Tour Support)
- LLM calls are allowed wherever needed to enrich the guided tour, including:
  - Explanatory context generation.
  - Cross-file linking suggestions.
  - Story beat summaries and recaps.
  - Glossary entries grounded in current code.
- Outputs must remain grounded in the provided code context and include line/file anchors.

## Implementation Skeleton
- Guided Mode flag switches the UI into narrator-driven control.
- Fix a primary arc (route/entry) and build a line-indexed step list.
- Render only current step + micro-context, lock UI navigation, and advance via narrator.
- Always attach "where you came from" and "where you go next" links.

## Success Criteria
- User can explain the primary flow using only the story steps shown.
- Each narration step references a concrete line or symbol in the repo.
- The canvas/TOC never show content the narrator has not introduced.
