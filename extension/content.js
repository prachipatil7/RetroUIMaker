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
      keywords: document.querySelector('meta[name="keywords"]')?.content || '',
      viewport: document.querySelector('meta[name="viewport"]')?.content || '',
      ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
      ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
      ogImage: document.querySelector('meta[property="og:image"]')?.content || ''
    };
    
    // Extract comprehensive DOM data
    const domData = {
      headings: [],
      buttons: [],
      links: [],
      inputs: [],
      images: [],
      navigation: [],
      forms: [],
      content: []
    };
    
    // Get all headings with context
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const h of headings) {
      const text = h.textContent?.trim();
      if (text && text.length > 2) {
        domData.headings.push({
          tag: h.tagName.toLowerCase(),
          text: text,
          selector: computeSelector(h),
          level: parseInt(h.tagName.charAt(1)),
          parent: h.parentElement?.tagName?.toLowerCase() || 'body'
        });
      }
    }
    
    // Get all interactive buttons and elements
    const interactiveElements = document.querySelectorAll(`
      button, 
      input[type="submit"], 
      input[type="button"], 
      input[type="reset"],
      [role="button"], 
      [role="menuitem"],
      [role="tab"],
      [role="option"],
      [onclick],
      [data-action],
      [data-toggle],
      [data-target]
    `);
    
    for (const el of interactiveElements) {
      const text = el.textContent?.trim() || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '';
      if (text && text.length > 1 && text.length < 100) {
        domData.buttons.push({
          tag: el.tagName.toLowerCase(),
          text: text,
          type: el.type || 'button',
          selector: computeSelector(el),
          role: el.getAttribute('role') || null,
          classes: el.className || '',
          id: el.id || null
        });
      }
    }
    
    // Get all links with context
    const links = document.querySelectorAll('a[href]');
    for (const link of links) {
      const text = link.textContent?.trim();
      if (text && text.length > 1 && text.length < 200) {
        domData.links.push({
          text: text,
          href: link.href,
          selector: computeSelector(link),
          classes: link.className || '',
          id: link.id || null,
          target: link.target || null,
          isExternal: !link.href.startsWith(location.origin)
        });
      }
    }
    
    // Get all form inputs
    const inputs = document.querySelectorAll(`
      input[type="text"], 
      input[type="search"], 
      input[type="email"], 
      input[type="password"],
      input[type="url"],
      input[type="tel"],
      input[type="number"],
      textarea, 
      select
    `);
    
    for (const input of inputs) {
      const placeholder = input.placeholder || input.name || input.id || input.getAttribute('aria-label') || '';
      if (placeholder || input.type === 'search') {
        domData.inputs.push({
          tag: input.tagName.toLowerCase(),
          type: input.type || 'text',
          placeholder: placeholder,
          name: input.name || null,
          id: input.id || null,
          selector: computeSelector(input),
          required: input.required || false,
          classes: input.className || ''
        });
      }
    }
    
    // Get important images
    const images = document.querySelectorAll('img[src]');
    for (const img of images) {
      if (domData.images.length >= 10) break;
      const src = img.src;
      const alt = img.alt || '';
      const title = img.title || '';
      if (src && !src.includes('data:') && !src.includes('pixel')) {
        domData.images.push({
          src: src,
          alt: alt,
          title: title,
          selector: computeSelector(img),
          width: img.naturalWidth || 0,
          height: img.naturalHeight || 0
        });
      }
    }
    
    // Get navigation elements
    const navElements = document.querySelectorAll(`
      nav, 
      [role="navigation"], 
      [role="menu"], 
      [role="menubar"],
      .nav, .navbar, .navigation, .menu, .menubar,
      header nav, footer nav
    `);
    
    for (const nav of navElements) {
      const links = nav.querySelectorAll('a');
      const navLinks = Array.from(links).map(link => ({
        text: link.textContent?.trim(),
        href: link.href,
        selector: computeSelector(link)
      })).filter(link => link.text && link.text.length > 0);
      
      if (navLinks.length > 0) {
        domData.navigation.push({
          selector: computeSelector(nav),
          links: navLinks,
          classes: nav.className || '',
          id: nav.id || null
        });
      }
    }
    
    // Get forms
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const inputs = form.querySelectorAll('input, textarea, select');
      const formInputs = Array.from(inputs).map(input => ({
        type: input.type || input.tagName.toLowerCase(),
        name: input.name || input.id || '',
        placeholder: input.placeholder || '',
        selector: computeSelector(input)
      }));
      
      if (formInputs.length > 0) {
        domData.forms.push({
          selector: computeSelector(form),
          action: form.action || '',
          method: form.method || 'get',
          inputs: formInputs,
          classes: form.className || '',
          id: form.id || null
        });
      }
    }
    
    // Get main content areas
    const contentAreas = document.querySelectorAll(`
      main, 
      [role="main"], 
      article, 
      section, 
      .content, 
      .main-content,
      .post, .entry, .article
    `);
    
    for (const area of contentAreas) {
      const text = area.textContent?.trim();
      if (text && text.length > 50) {
        domData.content.push({
          tag: area.tagName.toLowerCase(),
          text: text.substring(0, 500),
          selector: computeSelector(area),
          classes: area.className || '',
          id: area.id || null
        });
      }
    }
    
    console.log('Sending comprehensive DOM data to LLM:', { pageMeta, domData });
    const result = await requestLlMSimplify(pageMeta, domData);
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
