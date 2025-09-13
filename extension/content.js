// Content script for Page Replacer extension
// Handles mounting overlay, toggling views, and event proxy functionality

const STATE = {
  mounted: false,
  showing: false,
  host: null,
  shadow: null,
  hideStyle: null,
  pickedSelector: null
};

let observer = null;
let pickerActive = false;

// Renderer will be dynamically imported when mounting to satisfy CSP

function ensureHideStyle() {
  if (STATE.hideStyle?.isConnected) return STATE.hideStyle;
  const style = document.createElement('style');
  style.id = '__replacer_hide_style__';
  style.textContent = 'html[data-replacer-active="true"] body > :not(#__replacer_host__){display:none !important;}';
  document.documentElement.appendChild(style);
  STATE.hideStyle = style;
  return style;
}

async function mountOverlay() {
  if (STATE.mounted) return;
  
  const host = document.createElement('div');
  host.id = '__replacer_host__';
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647'
  });
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
  
  const shadow = host.attachShadow({ mode: 'open' });
  // Append host under body so the hide rule (body > :not(#__replacer_host__)) applies correctly
  (document.body || document.documentElement).appendChild(host);
  ensureHideStyle();
  // Activate hiding via attribute gate
  document.documentElement.setAttribute('data-replacer-active', 'true');
  
  // Build API for renderer
  const api = buildApi();
  
  // Dynamically import renderer via extension URL to avoid CSP issues
  try {
    const url = chrome.runtime.getURL('renderer/simplified.js');
    console.log('Attempting to import renderer from:', url);
    const { renderSimplified } = await import(url);
    console.log('Renderer imported successfully');
    renderSimplified(shadow, api);
  } catch (err) {
    // Render minimal non-interactive UI on import failure (no inline event handlers)
    console.error('Failed to import renderer:', err);
    shadow.innerHTML = '<div style="padding:20px;font-family:system-ui;color:red;">Failed to load renderer. Check console for details.</div>';
  }
  
  STATE.mounted = true;
  STATE.showing = true;
  STATE.host = host;
  STATE.shadow = shadow;
  startObserver();
}

function showOriginal() {
  if (!STATE.mounted) return;
  // Pause observer during toggle to avoid churn
  stopObserver();
  STATE.showing = false;
  // Deactivate hiding via attribute gate
  document.documentElement.removeAttribute('data-replacer-active');
  // Hide overlay host
  STATE.host.style.display = 'none';
  startObserver();
}

function showSimplified() {
  const doShow = async () => {
    if (!STATE.mounted) await mountOverlay();
    stopObserver();
    ensureHideStyle();
    STATE.host.style.display = '';
    document.documentElement.setAttribute('data-replacer-active', 'true');
    STATE.showing = true;
    startObserver();
  };
  // Fire and forget
  void doShow();
}

function teardown() {
  stopObserver();
  STATE.host?.remove();
  // Leave style node in place; it is gated by attribute
  document.documentElement.removeAttribute('data-replacer-active');
  Object.assign(STATE, {
    mounted: false,
    showing: false,
    host: null,
    shadow: null,
    pickedSelector: null
  });
}

function buildApi() {
  return {
    showOriginal,
    showSimplified,
    teardown,
    enterPicker,
    exitPicker,
    triggerProxyClick,
    aiPickAndSearch,
    aiGenerateSimplified,
    collectDomCandidates,
    triggerProxy
  };
}

// Picker functionality
function enterPicker(onPicked) {
  pickerActive = true;
  const onClick = (e) => {
    if (!pickerActive) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    STATE.pickedSelector = computeSelector(el);
    pickerActive = false;
    document.removeEventListener('click', onClick, true);
    onPicked?.(STATE.pickedSelector);
  };
  document.addEventListener('click', onClick, true);
}

function exitPicker() {
  pickerActive = false;
}

function triggerProxyClick() {
  if (!STATE.pickedSelector) return false;
  const el = document.querySelector(STATE.pickedSelector);
  if (!el) return false;
  el.dispatchEvent(new MouseEvent('click', { 
    bubbles: true, 
    cancelable: true, 
    view: window 
  }));
  return true;
}

// Simple CSS selector computation
function computeSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const parts = [];
  while (el && el.nodeType === 1 && parts.length < 5) {
    const name = el.tagName.toLowerCase();
    const nth = Array.from(el.parentNode?.children || []).indexOf(el) + 1;
    parts.unshift(`${name}:nth-child(${nth})`);
    el = el.parentElement;
  }
  return parts.join(' > ');
}

// MutationObserver to keep host and style attached
function startObserver() {
  if (observer) return;
  observer = new MutationObserver(() => {
    if (STATE.mounted && !document.getElementById('__replacer_host__')) {
      (document.body || document.documentElement).appendChild(STATE.host);
    }
    if (!STATE.hideStyle || !STATE.hideStyle.isConnected) {
      ensureHideStyle();
    }
  });
  observer.observe(document.documentElement, { 
    childList: true, 
    subtree: true 
  });
}

function stopObserver() {
  observer?.disconnect();
  observer = null;
}

// Message handler for toolbar clicks
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== 'REPLACER_ACTION') return;
  if (msg.action === 'toggle') {
    return STATE.showing ? showOriginal() : showSimplified();
  }
});

// DOM summarization utilities
function collectDomCandidates(limit = 60) {
  const candidates = [];
  const selectors = [
    'input[type="text"], input[type="search"], input[type="email"], input[type="password"]',
    'button, input[type="button"], input[type="submit"]',
    'a[href], a[role="button"]',
    '[role="button"], [role="link"], [role="textbox"]',
    'textarea, select'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      if (candidates.length >= limit) break;
      
      const candidate = {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        type: el.type || null,
        name: el.name || null,
        role: el.getAttribute('role') || null,
        text: el.textContent?.trim().substring(0, 50) || null,
        placeholder: el.placeholder || null,
        ariaLabel: el.getAttribute('aria-label') || null,
        classes: el.className || null,
        selector: computeSelector(el)
      };
      
      // Skip if too similar to existing candidates
      if (!candidates.some(c => c.selector === candidate.selector)) {
        candidates.push(candidate);
      }
    }
  }
  
  return candidates.slice(0, limit);
}

// LLM bridge functions
async function requestLlMPick(task) {
  const candidates = collectDomCandidates(30);
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'LLM_PICK',
      task,
      candidates
    }, (response) => {
      resolve(response || { error: 'No response from background' });
    });
  });
}

async function requestLlMSimplify(pageMeta, sections) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'LLM_SIMPLIFY',
      pageMeta,
      sections
    }, (response) => {
      resolve(response || { error: 'No response from background' });
    });
  });
}

// AI-powered functions
async function aiPickAndSearch(query) {
  try {
    const task = {
      goal: 'perform_search',
      query: query,
      inputs: ['search input', 'search button']
    };
    
    const result = await requestLlMPick(task);
    if (result.error) {
      console.error('AI Pick failed:', result.error);
      return { success: false, error: result.error };
    }
    
    // Try to find input first, then button
    const inputSelector = result.selector;
    const inputEl = document.querySelector(inputSelector);
    
    if (inputEl && (inputEl.tagName === 'INPUT' || inputEl.tagName === 'TEXTAREA')) {
      // Fill input and trigger search
      inputEl.value = query;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      inputEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      
      // Look for submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Search")',
        'button:contains("Go")',
        '[role="button"]:contains("Search")'
      ];
      
      for (const sel of submitSelectors) {
        const btn = document.querySelector(sel);
        if (btn) {
          btn.click();
          break;
        }
      }
      
      return { success: true, action: 'filled_input' };
    } else {
      // Try clicking the element directly
      const el = document.querySelector(inputSelector);
      if (el) {
        el.click();
        return { success: true, action: 'clicked_element' };
      }
    }
    
    return { success: false, error: 'Could not find or interact with element' };
  } catch (err) {
    console.error('AI Pick and Search error:', err);
    return { success: false, error: err.message };
  }
}

async function aiGenerateSimplified() {
  try {
    const pageMeta = {
      title: document.title,
      url: location.href,
      hostname: location.hostname,
      description: document.querySelector('meta[name="description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || ''
    };
    
    // Extract comprehensive page sections
    const sections = [];
    
    // Get main headings
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const h of headings) {
      if (sections.length >= 8) break;
      const text = h.textContent?.trim();
      if (text && text.length > 5) {
        sections.push({
          heading: h.tagName.toLowerCase(),
          text: text,
          type: 'heading'
        });
      }
    }
    
    // Get important buttons and forms
    const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]');
    for (const btn of buttons) {
      if (sections.length >= 12) break;
      const text = btn.textContent?.trim() || btn.value || btn.getAttribute('aria-label') || '';
      if (text && text.length > 2 && text.length < 50) {
        sections.push({
          heading: 'button',
          text: text,
          type: 'action',
          selector: computeSelector(btn)
        });
      }
    }
    
    // Get important links
    const links = document.querySelectorAll('a[href]');
    for (const link of links) {
      if (sections.length >= 15) break;
      const text = link.textContent?.trim();
      if (text && text.length > 3 && text.length < 100) {
        sections.push({
          heading: 'link',
          text: text,
          type: 'navigation',
          href: link.href,
          selector: computeSelector(link)
        });
      }
    }
    
    // Get form inputs
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], textarea');
    for (const input of inputs) {
      if (sections.length >= 18) break;
      const placeholder = input.placeholder || input.name || input.id || '';
      if (placeholder) {
        sections.push({
          heading: 'input',
          text: placeholder,
          type: 'form',
          selector: computeSelector(input)
        });
      }
    }
    
    console.log('Sending to LLM:', { pageMeta, sections });
    const result = await requestLlMSimplify(pageMeta, sections);
    console.log('LLM response:', result);
    
    if (result.error) {
      console.error('AI Simplify failed:', result.error);
      return { success: false, error: result.error };
    }
    
    return { success: true, html: result.html };
  } catch (err) {
    console.error('AI Generate Simplified error:', err);
    return { success: false, error: err.message };
  }
}

// Enhanced proxy function
function triggerProxy(selector, options = {}) {
  const { type = 'click', value } = options;
  const el = document.querySelector(selector);
  if (!el) return false;
  
  if (type === 'click') {
    el.dispatchEvent(new MouseEvent('click', { 
      bubbles: true, 
      cancelable: true, 
      view: window 
    }));
  } else if (type === 'input' && value !== undefined) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  return true;
}

// Option+R (Mac) / Alt+R keyboard shortcut
document.addEventListener('keydown', (e) => {
  if ((e.altKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) {
    e.preventDefault();
    // Toggle locally to avoid messaging race
    return STATE.showing ? showOriginal() : showSimplified();
  }
}, true);
