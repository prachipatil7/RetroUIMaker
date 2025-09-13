# Simplified UI Rendering System — Plan

## Goal
Recreate complex web UIs in a simplified, retro, accessible style. Users interact with a lightweight HTML frontend. Actions propagate to a backend browser session, which executes them and returns DOM diffs to update the simplified UI.

---

## Architecture

### Inputs
- URL + optional intent text

### Backend VM
- Playwright headless instance
- Captures DOM, CSS URLs, screenshot, cookies
- Persists session

### Simplifier
- DOM pruning + screenshot→HTML LLM
- Outputs **SimpleDOM** (minimal HTML + inline CSS + stable IDs + `<img>` passthrough)

### Event Layer
- Inject `data-sid` for interactives
- Supported events: `click`, `change`, `submit`, limited `scroll`
- Frontend posts `{sid, type, payload}` to backend

### Transport
- Frontend events batched into queue
- Server applies actions in Playwright
- On DOM mutation, compute DOM tree diff
- Emit **patch** to frontend

### Renderer
- Applies patch
- Re-hydrates listeners
- Lazy-loads images

---

## Specs

### SimpleDOM Format
- Allowed tags: `<div>`, `<span>`, `<p>`, `<button>`, `<input>`, `<select>`, `<ul>`, `<li>`, `<img>`, `<a>`, `<form>`, `<h1-6>`
- Attributes: `data-sid`, `role`, `aria-*`, `style`, `href`, `src`, `value`, `type`
- Inline minimal CSS only for layout
- Strip scripts/iframes
- Replace background images with `<img>`

### Pruning Rules
- Remove hidden, offscreen, ads, trackers
- Collapse widgets: 
  - Tabs → list + anchors
  - Carousels → first slide + “Next”
  - Infinite scroll → “Load more”
  - Modals → inline section

### Stable ID Mapping
- Prefer unique `id`
- Else CSS path with role/label heuristics
- Else Playwright locator by text/aria
- Persist mapping across refreshes with fuzzy matching

### Event Schema
```json
{
  "sid": "k123",
  "type": "click|change|submit",
  "ts": 1690000000,
  "payload": {
    "value": "text/select/checkbox",
    "form": {"sid->value": "..."}
  },
  "uid": "uuid-v4"
}
```

### Queue + Batching
- Per-session FIFO
- Dedupe by `uid`
- Coalesce multiple `change` on same `sid` within 500 ms
- Flush every 1–2 s or on submit

### Backend Execution
- Click: locator.click()
- Change: set value, then blur
- Submit: fill fields, then press Enter or click submit
- Navigation waits for network idle or DOM stability

### Long-Running Ops
- Assign `job_id` per batch
- Return `{job_id, status}`
- Poll or use WebSocket
- Status: `navigating`, `waiting-captcha`, `uploading`, `done`, `error`

### Diff + Patch
- DOM tree diff
- Patch format:
```json
[
  {"op":"text","sid":"k45","value":"Order placed"},
  {"op":"setAttr","sid":"k12","name":"disabled","value":true},
  {"op":"insertAfter","sid":"k10","html":"<div data-sid='k99'>…</div>"}
]
```
- Validate via HTML5 parser
- Rollback + full re-render on failure

### Caching
- Service Worker for images/CSS
- Cache-first with 1h TTL
- Inline critical CSS

---

## Errors + Recovery
- Patch failure → rollback + fresh snapshot
- Locator not found → fuzzy remap or re-simplify
- Navigation loop → cap redirects, prompt user

---

## LLM Usage
- Used for screenshot+DOM → SimpleDOM generation
- Constrained DSL: only whitelisted tags/attrs
- AST validation and sanitization
- Diff assist allowed, but authoritative diff is algorithmic

---

## Security (Hackathon-Level)
- Strip scripts and inline event handlers
- Serve with strict CSP
- Redact obvious secrets

---

## Demo Script (5 minutes)
1. Input URL/intent
2. Show first SimpleDOM render
3. Click button, change field, submit form
4. Show job status + patched UI
5. Trigger error → rollback refresh
6. Toggle AAA-style accessibility

---

## Open Questions
- Finalize SimpleDOM DSL subset
- Locator heuristic order
- Adaptive vs fixed batching cadence
- Diff granularity thresholds
- Image handling (direct vs proxy)
- Login/session management
- Accessibility target level
- Extension vs web app
- Multi-page browsing support

---

## Do Now
- Define SimpleDOM DSL
- Implement sid mapping + queue
- Playwright executor with job polling
- DOM-tree differ + JSON patch applier
- Service Worker caching
- Two demo sites: store checkout + gov form
