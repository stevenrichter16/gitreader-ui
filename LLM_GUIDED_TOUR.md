# LLM Guided Tour Mode - Schemas, Prompts, Templates, and Plan

This document defines a fully LLM-integrated guided tour for a loaded repo, built on top of the current story arcs, graph, and narrator UI. Static analysis is the baseline; the LLM enriches narration and adapts to user choices.

## Goals

- Provide an engaging, story-like walkthrough of primary code flows.
- Teach architecture and logic using short, focused explanations.
- Support branching ("side quests") without losing the main path.
- Operate with caching and fallbacks so the tour always works.

## Core Data Model

### TourMode
```
"story" | "teacher" | "expert"
```

### TourState
```json
{
  "repo_id": "string",
  "ref": "string|null",
  "subdir": "string|null",
  "arc_id": "string",
  "mode": "story",
  "step_index": 0,
  "last_node_id": "symbol:module.func",
  "visited_node_ids": ["symbol:module.func"],
  "branch_stack": ["arc:branch-1"],
  "context_window": [
    {
      "node_id": "symbol:module.func",
      "summary": "short explanation"
    }
  ]
}
```

### TourStep (LLM output)
```json
{
  "step_index": 0,
  "node_id": "symbol:module.func",
  "title": "Chapter title or scene name",
  "hook": "1-2 sentences",
  "explanation": ["2-3 short bullets"],
  "why_it_matters": "1 sentence",
  "next_click": "Click <symbol> to continue.",
  "pitfall": "Optional caution",
  "confidence": "high|medium|low",
  "related_nodes": [
    {"node_id": "symbol:module.other", "label": "side quest"}
  ]
}
```

### TourArcContext (static input to LLM)
```json
{
  "arc": {
    "id": "arc:...",
    "title": "GET /login",
    "thread": "main|branch",
    "scene_count": 4,
    "related_ids": ["arc:..."]
  },
  "route": {
    "path": "/login",
    "methods": ["GET", "POST"],
    "handler_id": "symbol:app.routes.login",
    "file_path": "app/routes.py",
    "line": 25
  },
  "scenes": [
    {
      "id": "symbol:app.routes.login",
      "name": "login",
      "kind": "function",
      "file_path": "app/routes.py",
      "line": 25,
      "role": "entry",
      "confidence": "high"
    }
  ],
  "calls": {
    "internal": ["validate_user", "create_session"],
    "external": ["flask.redirect"]
  }
}
```

### TourNodeContext (per-step input to LLM)
```json
{
  "node": {
    "id": "symbol:app.routes.login",
    "kind": "function",
    "name": "login",
    "signature": "def login():",
    "docstring": "Handle login form submission.",
    "location": "app/routes.py:25-63"
  },
  "snippet": "short code snippet (8-20 lines)",
  "graph": {
    "incoming": ["calls <- app.routes.index (function)"],
    "outgoing": ["calls -> validate_user (function)"]
  }
}
```

## API Endpoints

### POST /gitreader/api/tour/start

Request:
```json
{
  "mode": "story",
  "arc_id": "arc:...", 
  "resume": false
}
```

Response:
```json
{
  "state": { "TourState": "..." },
  "step": { "TourStep": "..." }
}
```

### POST /gitreader/api/tour/step

Request:
```json
{
  "state": { "TourState": "..." },
  "action": "next|prev|jump|branch",
  "target_node_id": "symbol:...|null",
  "target_arc_id": "arc:...|null"
}
```

Response:
```json
{
  "state": { "TourState": "..." },
  "step": { "TourStep": "..." }
}
```

### POST /gitreader/api/tour/branch

Request:
```json
{
  "state": { "TourState": "..." },
  "branch_arc_id": "arc:branch-1"
}
```

Response: same as `/tour/step`

## LLM Prompts

### System Prompt (shared)
```
You are the GitReader Tour Guide. Respond with JSON only.
You must be accurate, concise, and grounded in the provided context.
Do not invent files, symbols, or behavior.
Tone depends on mode: story (vivid), teacher (simple), expert (precise).
```

### User Prompt: Tour Step
```
Mode: {mode}
Arc: {arc.title}
Step index: {step_index}
Route: {route.methods} {route.path}

Arc context:
{arc_context_json}

Node context:
{node_context_json}

Recent context (last 2-3 steps):
{context_window_json}

Return JSON with keys:
title, hook, explanation (array of 2-3), why_it_matters,
next_click, pitfall (optional), confidence, related_nodes (array).
```

### User Prompt: Chapter Summary
```
Mode: {mode}
Arc: {arc.title}
Scenes: {scene_list}
Calls: {internal/external}

Write a 4-6 sentence chapter overview that explains the flow.
Return JSON with keys: title, summary, key_concepts (array).
```

## UI Templates

### Narrator Panel (step)
```
<p class="eyebrow">Tour: {mode}</p>
<h3>{title}</h3>
<p>{hook}</p>
<ul>
  <li>{explanation[0]}</li>
  <li>{explanation[1]}</li>
</ul>
<p><strong>Why it matters:</strong> {why_it_matters}</p>
<p><strong>Next:</strong> {next_click}</p>
<p class="muted">{pitfall}</p>
<div class="arc-jump-list">
  {related_nodes -> buttons}
</div>
```

### Narrator Panel (chapter)
```
<p class="eyebrow">Chapter</p>
<h3>{title}</h3>
<p>{summary}</p>
<ul>
  <li>{key_concepts[0]}</li>
  <li>{key_concepts[1]}</li>
</ul>
```

## Caching Strategy

- Cache by: repo_id + ref + subdir + arc_id + step_index + mode + prompt_version.
- TTL is optional; invalidate on repo content_signature change.
- If cache miss or LLM failure, fall back to static summary.

## Plan (Steps)

1. **API foundation (Phase A)**
   - Add `/tour/start` endpoint to select arc + initialize `TourState`.
   - Add `/tour/step` endpoint to advance/branch from `TourState`.
   - Return `TourStep` JSON using arc + node context.
2. **UI MVP (Phase A)**
   - Add "Start Tour" button and mode selector (story/teacher/expert).
   - Add "Next", "Prev", and "Branch" buttons in narrator panel.
   - Wire narrator panel to render `TourStep` output.
3. **Caching + fallback (Phase A)**
   - Cache per repo/ref/arc/step/mode/prompt_version.
   - Fallback to static summaries on cache miss or LLM error.
4. **Interactive branching (Phase B)**
   - Implement side‑quest selection from `related_nodes`.
   - Track branch stack in `TourState`.
5. **Context window (Phase B)**
   - Maintain last 2–3 steps in `context_window`.
   - Pass context window into prompts for continuity.
6. **Mode expansion (Phase B)**
   - Add teacher/expert prompt variants.
   - Expose mode toggle in UI and persist in `TourState`.
7. **Chapter summaries (Phase C)**
   - Add `/tour/chapter` or reuse `/tour/step` with a summary action.
   - Render chapter summaries in narrator panel.
8. **Micro‑quizzes (Phase C)**
   - Generate 2–3 questions per chapter.
   - Add quick checks before advancing to the next chapter.
9. **Tour map (Phase C)**
   - Visualize arc progress on the canvas.
   - Show completed steps and current position.

## Safety and Quality Rules

- Never invent symbols, files, or behavior.
- If context is thin, say so and suggest the next click.
- Keep outputs short; prefer bullets to paragraphs.

## Prompt Versioning

- Store prompt version with cached output.
- Bump version when templates or schema change.
