# plan.md — Chrome MV3 “Page Replacer” Extension

## Goal

Render a simplified UI on any webpage by hiding the page’s original DOM and mounting an overlay that displays alternate content. Keep the original DOM available for optional interaction proxying and restoration.

## Scope

* MV3 Chrome extension with one content script.
* Replace entire page view. Start with same-tab overlay.
* Minimal UI: toolbar + simplified renderer container.
* Toggle between simplified and original views.
* Optional: event proxy from simplified controls to hidden original nodes.

## Non‑goals (MVP)

* Cross-origin iframe rewriting.
* Full bidirectional state sync for all frameworks.
* Robust login automation.

## Constraints

* MV3 service worker background. No persistent background page.
* Site CSP cannot block extension content scripts, but can block inline page scripts. Use Shadow DOM to avoid CSS collisions.
* Z-index conflicts must be avoided. Use topmost fixed overlay.
* Performance budget: end-to-end swap ≤ 300 ms after content script runs.

## User stories

* As a user, I click a toolbar button to enter “replace mode”. The page hides and the simplified UI appears.
* As a user, I can toggle back to the original page without reload.
* As a developer, I can inject a custom simplified layout per domain in the future.

## Architecture

```
manifest.json (MV3)
background/service worker (bg.js)
content script (content.js)
assets/
  styles.css (optional insertCSS)
  icon set
renderer/
  simplified.js (logic to build simplified view)
  surrogate-components/* (optional future)
```

### Data flow

1. Content script injects a host container and ShadowRoot.
2. Add CSS to hide original DOM (except the host).
3. Render simplified UI inside ShadowRoot.
4. Optional: map simplified controls → original elements; dispatch events.
5. Toggle restores/hides original.

## Detailed design

### 1) Host and Shadow DOM

* Create `<div id="__replacer_host__">` appended to `document.documentElement`.
* Attach `shadowRoot` with isolated CSS.
* Style host: `position: fixed; inset: 0; z-index: 2147483647;`.

### 2) Hiding the original DOM

* Strategy A (overlay + CSS):

  * Inject style: `body > :not(#__replacer_host__) { display: none !important; }`.
  * Add `aria-hidden="true"` on `<body>` for AT.
* Strategy B (wrap root variant):

  * Create wrapper `<div data-wrapper>` and move `body` children inside a child container, set `hidden`.
  * Keep a `<template data-snapshot>` for a DOM snapshot if needed.
* Choose A for MVP simplicity. Keep B code-path behind a flag for later experiments.

### 3) Simplified renderer

* Initial content: title, placeholder text, and a few demo controls.
* API: `renderSimplified({ shadowRoot, pageMeta })`.
* Inputs: page title, URL, first image, key headings (optional extraction).
* For demo: extract first `<h1>`, first `img[src]`, and meta description.

### 4) Toolbar controls

* Buttons: \[Show Original] \[Replace Again] \[Close].
* Keyboard: `Alt+R` toggles overlay (use Commands API later).
* Telemetry hooks (no-op for MVP).

### 5) SPA resistance

* MutationObserver on documentElement to:

  * Ensure host and hide-style remain attached.
  * Re-append if removed by SPA reflows.

### 6) Event proxy (optional MVP+)

* For a focused element mapping demo:

  * Provide a picker mode. User selects an element. Store CSS locator.
  * Surrogate control triggers `.click()` / value set + `input`/`change` on hidden element.
* Fallback: read-only simplified UI.

### 7) Accessibility

* When overlay active, set `aria-hidden="true"` on body and remove from the host to avoid silencing the replacement.
* Provide roles and labels in simplified UI.

### 8) Iframes

* Cross-origin iframes cannot be read/modified. Visually covered by overlay. Document this limitation in README and UI tooltip.

### 9) Error handling

* If ShadowRoot creation fails, abort and log.
* If style injection fails, display a minimal warning bar.

## File layout

```
/extension
  manifest.json
  bg.js
  content.js
  renderer/
    simplified.js
  assets/
    icon16.png
    icon48.png
    icon128.png
    styles.css (optional)
```

## manifest.json (initial)

```json
{
  "manifest_version": 3,
  "name": "Page Replacer",
  "version": "0.1.0",
  "permissions": ["scripting", "activeTab"],
  "background": { "service_worker": "bg.js" },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {"16":"assets/icon16.png","48":"assets/icon48.png","128":"assets/icon128.png"}
}
```

## content.js (core steps)

* Detect if already mounted.
* Create host + shadowRoot.
* Inject hide-style.
* Call renderer.
* Add toggle button handlers.
* Start MutationObserver.

## renderer/simplified.js (MVP extraction)

* Collect `document.title`, first `<h1>`, first image, meta description.
* Build a minimal layout.
* No external network calls.

## Build and run

1. `chrome://extensions` → Developer mode → Load unpacked → select `/extension`.
2. Open any site. Verify overlay appears after `document_idle`.
3. Toggle original/simplified.

## Test plan

### Functional

* Toggle visibility works on:

  * Static site (MDN docs page).
  * SPA (React app like `react.dev`).
  * News site with ads.
* Overlay remains on top during scroll and route changes.
* MutationObserver reattaches host and style if removed.

### Performance

* Mount time under 300 ms on typical pages.
* Memory growth bounded: host DOM < 100 nodes.

### Accessibility

* When overlay active, host is focusable and logical tab order exists.
* When overlay inactive, focus returns to the original page.

### Security/CSP

* Works on pages with strict CSP (no inline script). Content script executes and Shadow DOM styles apply.

## Risks and mitigations

* **Z-index conflicts** → use max int z-index, fixed positioning, host appended to `documentElement`.
* **Site CSS bleeding** → Shadow DOM with `all: initial` in root styles.
* **SPA removing our nodes** → MutationObserver and reattach logic.
* **Heavy background scripts still running** → acceptable for MVP. Document as limitation.

## Milestones

* **M0 (0.5 day)**: Scaffolding. manifest, icons, bg.js, content.js stub.
* **M1 (0.5 day)**: Host + ShadowRoot + hide-style + hello world UI.
* **M2 (0.5 day)**: Renderer that extracts title, h1, first image.
* **M3 (0.5 day)**: Toggle controls + MutationObserver.
* **M4 (0.5 day)**: Basic picker and proxy click for 1 element (optional).
* **M5 (0.5 day)**: QA on 5 sites, bug fixes, README.

## Acceptance criteria (MVP)

* On any page, content script mounts an overlay that covers the viewport and hides original DOM.
* Simplified UI renders a layout with page title and a content summary.
* User can toggle between simplified and original views without reload.
* Overlay persists across SPA route changes for at least two navigations.

## Future work

* Per-domain simplification rules.
* React-based surrogate UI inside Shadow DOM.
* Event replay for forms and buttons using a locator map.
* Whitelist/blacklist domains and hotkeys via Options page.
* Persist wrapped/hidden state per domain in storage.

## Pseudocode snippets

**Mount logic**

```js
if (window.__REPLACER_MOUNTED__) return; window.__REPLACER_MOUNTED__ = true;
const host = document.createElement('div'); host.id='__replacer_host__';
Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'2147483647'});
const shadow = host.attachShadow({mode:'open'});
document.documentElement.appendChild(host);
const style = document.createElement('style');
style.textContent = 'body > :not(#__replacer_host__){display:none !important;}';
document.documentElement.appendChild(style);
renderSimplified(shadow);
new MutationObserver(() => {
  if(!document.getElementById('__replacer_host__')) document.documentElement.appendChild(host);
  if(!style.isConnected) document.documentElement.appendChild(style);
}).observe(document.documentElement,{childList:true,subtree:true});
```

**Renderer skeleton**

```js
export function renderSimplified(shadow){
  const h1 = document.querySelector('h1')?.textContent || document.title;
  const img = document.querySelector('img')?.src;
  shadow.innerHTML = `
    <style>:host{all:initial;font-family:system-ui} .app{padding:16px}</style>
    <div class="app">
      <div class="bar"><button id="toggle">Show Original</button></div>
      <h1>${escapeHTML(h1)}</h1>
      ${img?`<img src="${img}" style="max-width:100%">`:''}
      <p>${escapeHTML(document.querySelector('meta[name="description"]')?.content||'')}</p>
    </div>`;
  shadow.getElementById('toggle').onclick=()=>{/* toggle logic injected by content.js */};
}
```

## Manual QA checklist

* [ ] Overlay covers full viewport on desktop and mobile.
* [ ] No horizontal scrollbars introduced by host.
* [ ] Original page resumes correctly after toggle.
* [ ] Works on at least: wikipedia.org, react.dev, mdn.dev, a news site, a SaaS dashboard (login-free).

## Demo flow

1. Navigate to a busy page.
2. Trigger extension (content script runs automatically for MVP).
3. Show simplified view with title and hero image.
4. Toggle to original and back.
5. Optional: pick a button, click surrogate, verify original button clicked while hidden.

## Notes

* Keep code size small for hackathon speed.
* Prefer vanilla JS for MVP. Framework can be added inside Shadow DOM later.
