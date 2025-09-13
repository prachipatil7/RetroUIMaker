/**
 * LLM Patch Module for Intent-Driven DOM Selection and HTML Patching
 * 
 * This module provides two-stage LLM processing:
 * 1. Select relevant DOM elements based on user intent
 * 2. Generate structured HTML patches against existing HTML
 */

class LLMPatch {
  constructor() {
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-5'; // Using 4.1 for both selection and patching
    this.apiKey = null;
    this.selectionCache = new Map();
  }

  /**
   * Load base template HTML with caching
   * @returns {Promise<string>} Base template HTML
   */
  async loadBaseTemplate() {
    if (window.__BASE_TEMPLATE_CACHE__) {
      return window.__BASE_TEMPLATE_CACHE__;
    }
    
    try {
      const url = chrome.runtime.getURL('templates/base_template.html');
      const response = await fetch(url);
      const template = await response.text();
      window.__BASE_TEMPLATE_CACHE__ = template;
      return template;
    } catch (error) {
      console.error('Failed to load base template:', error);
      // Fallback to minimal template
      const fallback = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lean View</title>
</head>
<body>
  <header id="app-header"></header>
  <main id="app-main"></main>
  <footer id="app-footer"></footer>
</body>
</html>`;
      window.__BASE_TEMPLATE_CACHE__ = fallback;
      return fallback;
    }
  }

  /**
   * Get API key from environment sources in priority order
   * @returns {Promise<string>} API key
   */
  async getApiKey() {
    if (this.apiKey) {
      return this.apiKey;
    }

    // Try process.env first (for bundled environments)
    if (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) {
      this.apiKey = process.env.OPENAI_API_KEY;
      return this.apiKey;
    }

    // Try window.ENV (from env.js)
    if (typeof window !== 'undefined' && window.ENV && window.ENV.OPENAI_API_KEY) {
      this.apiKey = window.ENV.OPENAI_API_KEY;
      return this.apiKey;
    }

    // Try chrome.storage.local
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const result = await chrome.storage.local.get(['openaiApiKey']);
        if (result.openaiApiKey) {
          this.apiKey = result.openaiApiKey;
          return this.apiKey;
        }
      } catch (error) {
        console.warn('Failed to get API key from chrome.storage.local:', error);
      }
    }

    throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY in env.js or chrome.storage.local.openaiApiKey');
  }

  /**
   * Make API request with retry logic, rate limiting handling, and caching
   * @param {string} apiKey - API key
   * @param {string} prompt - User prompt
   * @param {string} type - Request type ('selection' or 'patch')
   * @returns {Promise<Response>} API response (real or cached)
   */
  async makeApiRequest(apiKey, prompt, type) {
    // Generate cache key based on input parameters
    const cacheKey = this.generateCacheKey(apiKey, prompt, type);
    
    // Check cache first with exact prompt verification
    const cachedResponse = this.getCacheResponse(cacheKey, prompt, type);
    if (cachedResponse) {
      console.log('Using cached API response');
      // Return a mock Response object that matches the expected interface
      return {
        ok: true,
        status: 200,
        statusText: 'OK (Cached)',
        headers: new Headers(),
        json: async () => cachedResponse
      };
    }

    console.log('Making new API request (not cached)');
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const systemContent = type === 'selection' ? this.getSelectionSystemPrompt() : this.getPatchSystemPrompt();
        
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: systemContent
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: type === 'selection' ? 8000 : 8000, // Reduced to prevent TPM limits
            // temperature: type === 'selection' ? 0.1 : 0.2
          })
        });

        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter) * 30000 : baseDelay * Math.pow(2, attempt);
          
          console.warn(`Rate limited. Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
          await this.sleep(delay);
          continue;
        }

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        // Cache successful response
        try {
          // Clone the response to avoid consuming it
          const responseClone = response.clone();
          const responseData = await responseClone.json();
          this.storeCacheResponse(cacheKey, responseData, prompt, type);
        } catch (cacheError) {
          console.warn('Failed to cache response:', cacheError);
          // Continue with original response even if caching fails
        }

        return response;
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`API request failed (attempt ${attempt + 1}/${maxRetries}):`, error.message);
        console.warn(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a cache key for API requests
   * @param {string} apiKey - API key
   * @param {string} prompt - User prompt
   * @param {string} type - Request type ('selection' or 'patch')
   * @returns {string} Cache key
   */
  generateCacheKey(apiKey, prompt, type) {
    // Create a hash of the API key for privacy (only use first 8 chars)
    const apiKeyHash = apiKey.substring(0, 8);
    
    // Create a more robust hash of the prompt to minimize collisions
    // Using a combination of djb2 hash algorithm with additional entropy
    let promptHash = 5381; // djb2 initial value
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      promptHash = ((promptHash << 5) + promptHash) + char; // hash * 33 + char
    }
    
    // Add string length as additional entropy to reduce collision probability
    const lengthHash = prompt.length * 37; // multiply by prime
    const combinedHash = Math.abs(promptHash ^ lengthHash); // XOR for final hash
    
    return `llm_cache_${type}_${apiKeyHash}_${combinedHash}`;
  }

  /**
   * Store API response in localStorage cache
   * @param {string} cacheKey - Cache key
   * @param {Object} responseData - Response data to cache
   * @param {string} prompt - Full prompt text for exact matching
   * @param {string} type - Request type for filtering
   */
  storeCacheResponse(cacheKey, responseData, prompt, type) {
    try {
      const cacheEntry = {
        data: responseData,
        prompt: prompt,
        type: type,
        timestamp: Date.now(),
        version: '1.1'
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      console.log(`Cached API response with key: ${cacheKey}`);
    } catch (error) {
      console.warn('Failed to store cache response:', error);
    }
  }

  /**
   * Retrieve API response from localStorage cache with exact prompt verification
   * @param {string} cacheKey - Cache key (hash-based lookup)
   * @param {string} prompt - Full prompt text for exact matching
   * @param {string} type - Request type for additional verification
   * @returns {Object|null} Cached response data or null if not found/expired/mismatched
   */
  getCacheResponse(cacheKey, prompt, type) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        return null;
      }

      const cacheEntry = JSON.parse(cached);
      
      // Check if cache entry has expected structure
      if (!cacheEntry.data || !cacheEntry.timestamp || !cacheEntry.prompt) {
        console.warn(`Invalid cache entry structure for key: ${cacheKey}`);
        localStorage.removeItem(cacheKey);
        return null;
      }

      // Check if cache is older than 24 hours (86400000 ms)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - cacheEntry.timestamp > maxAge) {
        console.log(`Cache expired for key: ${cacheKey}`);
        localStorage.removeItem(cacheKey);
        return null;
      }

      // CRITICAL: Verify exact prompt text match to prevent hash collisions
      if (cacheEntry.prompt !== prompt) {
        console.log(`Hash collision detected for key: ${cacheKey}. Cached prompt differs from requested prompt.`);
        return null; // Hash collision - don't use this cache entry
      }

      // Additional verification: check type matches
      if (cacheEntry.type !== type) {
        console.warn(`Type mismatch for cache key: ${cacheKey}. Expected: ${type}, Found: ${cacheEntry.type}`);
        return null;
      }

      console.log(`Retrieved cached response with verified prompt match for key: ${cacheKey}`);
      return cacheEntry.data;
    } catch (error) {
      console.warn('Failed to retrieve cache response:', error);
      return null;
    }
  }

  /**
   * Clear all LLM cache entries from localStorage
   * Useful for debugging or clearing stale cache
   */
  clearCache() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('llm_cache_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} cache entries`);
      return keysToRemove.length;
    } catch (error) {
      console.warn('Failed to clear cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics including count and total size
   */
  getCacheStats() {
    try {
      let count = 0;
      let totalSize = 0;
      const entries = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('llm_cache_')) {
          const value = localStorage.getItem(key);
          if (value) {
            count++;
            totalSize += value.length;
            
            try {
              const entry = JSON.parse(value);
              entries.push({
                key,
                timestamp: entry.timestamp,
                age: Date.now() - entry.timestamp,
                size: value.length,
                type: entry.type || 'unknown',
                promptLength: entry.prompt ? entry.prompt.length : 0,
                version: entry.version || '1.0'
              });
            } catch (e) {
              // Invalid JSON, will be cleaned up on next access
            }
          }
        }
      }
      
      return {
        count,
        totalSize,
        totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
        entries: entries.sort((a, b) => b.timestamp - a.timestamp) // Most recent first
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return { count: 0, totalSize: 0, totalSizeKB: 0, entries: [] };
    }
  }

  /**
   * Get system prompt for selection requests
   * @returns {string} System prompt
   */
  getSelectionSystemPrompt() {
    return `You are an expert UI analyzer. Your task is to identify and extract ONLY the essential functional elements that users need for navigation and core website functionality.

CRITICAL RULES:
1. Preserve the original hierarchy and structure of the DOM tree
2. Keep ALL original selector values - do not modify or invent new selectors
3. Focus on CORE FUNCTIONALITY, not styling or decoration
4. Maintain parent-child relationships for context and grouping
5. Output ONLY valid JSON following the exact Node schema provided
6. Do not include any text outside the JSON response
7. Analyze if the user intent is relevant to this website's primary purpose
8. If intent is unrelated to the website, focus on general navigation and core functionality

INTENT RELEVANCE ANALYSIS:
- If the user intent appears unrelated to this website's primary purpose, ignore the specific intent
- If the intent is relevant to this website, use it to guide your selection
- When uncertain, prioritize general navigation and core functionality

ESSENTIAL ELEMENTS TO KEEP:
- Primary search inputs and search buttons (main search functionality)
- Main navigation menus and navigation links
- Login/signup forms and authentication buttons
- Primary call-to-action buttons
- Form inputs for core website functionality
- Key content areas that represent the main purpose of the site
- Navigation breadcrumbs and site structure elements
- Essential navigation elements for moving around the site

ELEMENTS TO REMOVE:
- Advertisements and promotional content
- Social media widgets and share buttons
- Footer copyright text and legal links
- Decorative images and icons
- Cookie banners and popups
- Sidebar recommendations
- Comments sections (unless core to the purpose)
- Loading spinners and decorative elements
- Analytics and tracking scripts

Remember: Extract only what users actually NEED for basic navigation and core website functionality, regardless of specific intent if it's unrelated to the site.`;
  }

  /**
   * Get system prompt for patch requests
   * @returns {string} System prompt
   */
  getPatchSystemPrompt() {
    return `You are an expert HTML generator. Your task is to create clean, functional HTML that shows ONLY the essential elements users need from a website.

CRITICAL RULES:
1. Output ONLY valid JSON following the exact patch schema
2. Use ONLY these allowed selectors: #app-main, #app-header, #app-footer, title, body
3. Create clean, minimal HTML with NO styling classes
4. Focus on FUNCTIONALITY, not appearance
5. Preserve original element attributes (id, name, type, etc.)
6. Make elements easily clickable and usable
7. Prefer appending/replacing content inside #app-main

PATCH SCHEMA:
{
  "version": "1.0",
  "operations": [
    {
      "op": "replace" | "append" | "prepend" | "remove" | "setAttribute" | "removeAttribute" | "replaceFullDocument",
      "selector": "CSS selector (for all ops except replaceFullDocument)",
      "html": "HTML content (for replace, append, prepend, replaceFullDocument)",
      "attribute": "attribute name (for setAttribute, removeAttribute)",
      "value": "attribute value (for setAttribute)"
    }
  ]
}

ALLOWED SELECTORS:
- #app-main (preferred for main content)
- #app-header (for navigation/header content)
- #app-footer (for footer content)
- title (for page title)
- body (for body attributes)

HTML GENERATION RULES:
- Use semantic HTML tags (form, input, button, nav, ul, li, etc.)
- Preserve original input types, names, and values
- Keep original href attributes for links
- Maintain form structure and action attributes
- Use simple, clean markup without CSS classes
- Focus on making elements functional, not pretty

EXAMPLES:
- Google: Append search input + search button to #app-main
- Amazon: Append main nav to #app-header, search + category menu to #app-main
- E-commerce: Append search + filters + product grid to #app-main
- News: Append main navigation to #app-header, article headlines to #app-main

Remember: Create functional HTML that lets users accomplish their goals, not decorative layouts.`;
  }

  /**
   * Select relevant DOM elements based on user intent
   * @param {Document} originalDOM - The original DOM object
   * @param {string} intent - User intent for filtering
   * @returns {Promise<Object>} Filtered DOM JSON and selected selectors
   */
  async selectRelevantDomElements(originalDOM, intent) {
    // Create cache key based on intent and page URL
    const url = originalDOM.location ? originalDOM.location.href : window.location.href;
    const cacheKey = `selection_${url}_${intent || 'default'}`;
    
    // Check cache first
    // if (this.selectionCache.has(cacheKey)) {
    //   console.log('📦 Using cached selection for:', cacheKey);
    //   return this.selectionCache.get(cacheKey);
    // }
    
    try {
      const apiKey = await this.getApiKey();
      
      // Use existing LLMIntegration to serialize DOM
      const llmIntegration = new window.LLMIntegration();
      const fullDomJson = llmIntegration.buildDomJson(originalDOM);
      
      // Pre-trim to reduce token usage - keep interactive and structural elements
      const preTrimmedElements = this.preTrimDom(fullDomJson);
      
      // Check if still too large for API
      const domString = JSON.stringify(preTrimmedElements, null, 2);
      // const estimatedTokens = Math.ceil(domString.length / 4);
      
      // if (estimatedTokens > 20000) {
      //   console.warn(`DOM still too large (${estimatedTokens} tokens), using local filtering only`);
      //   // Since preTrimDom now returns filtered elements directly, we can use them as-is
      //   console.log('Filtered elements type:', typeof preTrimmedElements, 'isArray:', Array.isArray(preTrimmedElements));
      //   console.log('Filtered elements:', preTrimmedElements);
      //   const result = {
      //     filteredDomJson: preTrimmedElements,
      //     selectedSelectors: this.extractSelectorsFromArray(preTrimmedElements)
      //   };
      //   this.selectionCache.set(cacheKey, result);
      //   console.log('💾 Cached selection for:', cacheKey);
      //   return result;
      // }
      
      const prompt = this.buildSelectionPrompt(preTrimmedElements, intent, url);
      
      const response = await this.makeApiRequest(apiKey, prompt, 'selection');
      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      console.log('Filtered elements:', result);
      
      // Handle both array format and object with filtered_dom_tree property
      const filteredElements = Array.isArray(result) ? result : (result.filtered_dom_tree || result);
      
      const selectionResult = {
        filteredDomJson: filteredElements,
        selectedSelectors: this.extractSelectorsFromArray(filteredElements)
      };
      this.selectionCache.set(cacheKey, selectionResult);
      console.log('💾 Cached selection for:', cacheKey);
      return selectionResult;
    } catch (error) {
      console.error('Error selecting relevant DOM elements:', error);
      // Fallback to local filtering
      const llmIntegration = new window.LLMIntegration();
      const fullDomJson = llmIntegration.buildDomJson(originalDOM);
      const preTrimmedElements = this.preTrimDom(fullDomJson);
      console.log('Filtered elements type:', typeof preTrimmedElements, 'isArray:', Array.isArray(preTrimmedElements));
      console.log('Filtered elements:', preTrimmedElements);
      const fallbackResult = {
        filteredDomJson: preTrimmedElements,
        selectedSelectors: this.extractSelectorsFromArray(preTrimmedElements)
      };
      this.selectionCache.set(cacheKey, fallbackResult);
      console.log('💾 Cached fallback selection for:', cacheKey);
      return fallbackResult;
    }
  }

  /**
   * Create HTML patch from selected DOM elements
   * @param {Object} params - Parameters object
   * @param {Object} params.selectedDom - Selected DOM JSON
   * @param {string} params.oldHtml - Existing HTML to patch
   * @param {string} params.intent - User intent
   * @returns {Promise<Object>} Structured patch object
   */
  async createHtmlPatchFromSelection({ selectedDom, oldHtml, intent }) {
    const apiKey = await this.getApiKey();
    
    // If no old HTML, generate base HTML from selection
    if (!oldHtml || oldHtml.trim() === '') {
      const baseHtml = await this.generateBaseHtmlFromSelection(selectedDom);
      return {
        version: '1.0',
        operations: [{
          op: 'replaceFullDocument',
          html: baseHtml
        }]
      };
    }

    const prompt = this.buildPatchPrompt(selectedDom, oldHtml, intent);
    
    try {
      const response = await this.makeApiRequest(apiKey, prompt, 'patch');
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error creating HTML patch:', error);
      // Fallback to simple replacement
      const baseHtml = await this.generateBaseHtmlFromSelection(selectedDom);
      return {
        version: '1.0',
        operations: [{
          op: 'replaceFullDocument',
          html: baseHtml
        }]
      };
    }
  }

  /**
   * Apply HTML patch to existing HTML
   * @param {string} oldHtml - Original HTML
   * @param {Object} patch - Patch object
   * @returns {string} Updated HTML
   */
  applyHtmlPatch(oldHtml, patch) {
    try {
      // Check for replaceFullDocument operation first
      for (const operation of patch.operations) {
        if (operation.op === 'replaceFullDocument' && operation.html) {
          return operation.html;
        }
      }
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(oldHtml, 'text/html');
      
      for (const operation of patch.operations) {
        this.applyOperation(doc, operation);
      }
      
      return doc.documentElement.outerHTML;
    } catch (error) {
      console.error('Error applying HTML patch:', error);
      return oldHtml; // Return original on error
    }
  }

  /**
   * Generate base HTML from selected DOM elements
   * @param {Object} selectedDom - Selected DOM JSON
   * @returns {Promise<string>} Complete HTML document
   */
  async generateBaseHtmlFromSelection(selectedDom) {
    try {
      const apiKey = await this.getApiKey();
      const llmIntegration = new window.LLMIntegration();
      llmIntegration.configure(apiKey);

      // First, filter the selectedDom to keep only important elements using LLMIntegration
      const filteredDom = await llmIntegration.filterImportantElements(selectedDom);
      
      const bodyInnerHTML = await llmIntegration.generateHtmlFromFiltered(filteredDom);
      
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated UI</title>
</head>
<body class="retro-body">
${bodyInnerHTML}
</body>
</html>`;
    } catch (error) {
      console.error('Error generating base HTML:', error);
      // Fallback to simple structure
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated UI</title>
  <script>
    function clickHandler() {
      const selector = "#a-autoid-2-announce";
      
      // Send message to parent window to click element in original iframe
      parent.postMessage({
        type: 'CLICK_ELEMENT',
        selector: selector
      }, '*');
    }
  </script>
</head>
<body class="retro-body">
  <div class="retro-window">
    <div class="retro-window-header">
      <span>Generated UI</span>
    </div>
    <div class="retro-window-content">
      <p class="retro-text">Content generated from selected elements</p>
      <button class="retro-button" onClick="clickHandler()">Test</button>
    </div>
  </div>
</body>
</html>`;
    }
  }

  /**
   * Pre-trim DOM to extract only functional elements (inputs, buttons, important text)
   * @param {Object} domJson - Full DOM JSON
   * @returns {Array} Array of filtered functional elements with only essential keys
   */
  preTrimDom(domJson) {
    const functionalElements = [];
    
    // Find the body element
    const bodyElement = this.findBodyElement(domJson);
    if (!bodyElement) {
      console.warn('No body element found');
      return [];
    }
    
    // Extract functional elements from body
    this.extractFunctionalElements(bodyElement, functionalElements);
    
    console.log(`Extracted ${functionalElements.length} functional elements`);
    
    // Filter each element to only include the specified keys
    const keysToKeep = ['tag', 'id', 'label', 'text', 'selector', 'isInteractive', 'isNavigationCandidate'];
    
    const filteredElements = functionalElements.map(element => {
      const filteredElement = {};
      keysToKeep.forEach(key => {
        if (element.hasOwnProperty(key)) {
          filteredElement[key] = element[key];
        }
      });
      return filteredElement;
    });
    
    console.log('preTrimDom returning:', Array.isArray(filteredElements) ? `array with ${filteredElements.length} elements` : typeof filteredElements);
    return filteredElements;
  }

  /**
   * Find the body element in the DOM tree
   * @param {Object} domJson - DOM JSON
   * @returns {Object|null} Body element or null
   */
  findBodyElement(domJson) {
    if (domJson.tag === 'body') {
      return domJson;
    }
    
    if (domJson.children) {
      for (const child of domJson.children) {
        const body = this.findBodyElement(child);
        if (body) return body;
      }
    }
    
    return null;
  }

  /**
   * Extract functional elements (inputs, buttons, important text) from a node
   * @param {Object} node - DOM node
   * @param {Array} functionalElements - Array to store functional elements
   */
  extractFunctionalElements(node, functionalElements) {
    if (!node || !node.children) return;
    
    for (const child of node.children) {
      // Check if this is a functional element
      if (this.isFunctionalElement(child)) {
        functionalElements.push({
          ...child,
          children: [] // Don't include children for functional elements
        });
      }
      
      // Recursively check children
      this.extractFunctionalElements(child, functionalElements);
    }
  }

  /**
   * Check if a node is a functional element
   * @param {Object} node - DOM node
   * @returns {boolean} True if functional
   */
  isFunctionalElement(node) {
    // Exclude non-functional elements first
    const excludeTags = ['style', 'script', 'meta', 'link', 'title', 'head', 'html', 'body'];
    if (excludeTags.includes(node.tag)) {
      return false;
    }
    
    // Input elements (always functional)
    if (node.tag === 'input' || node.tag === 'textarea' || node.tag === 'select') {
      return true;
    }
    
    // Button elements (always functional)
    if (node.tag === 'button') {
      return true;
    }
    
    // Links with href (functional)
    if (node.tag === 'a' && node.href && node.href !== '#') {
      return true;
    }
    
    // Form elements (functional)
    if (node.tag === 'form') {
      return true;
    }
    
    // Elements with specific roles that are functional
    if (node.role && ['button', 'link', 'search', 'navigation', 'combobox', 'textbox'].includes(node.role)) {
      return true;
    }
    
    // Important text elements (headings, labels, important text)
    if (this.isImportantText(node)) {
      return true;
    }
    
    // Navigation containers
    if (node.tag === 'nav' || node.role === 'navigation') {
      return true;
    }
    
    // Interactive spans/divs only if they have meaningful content
    if ((node.tag === 'span' || node.tag === 'div') && node.role === 'button' && node.text && node.text.trim().length > 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a node contains important text
   * @param {Object} node - DOM node
   * @returns {boolean} True if important text
   */
  isImportantText(node) {
    // Exclude style and script tags
    if (['style', 'script', 'meta', 'link'].includes(node.tag)) {
      return false;
    }
    
    // Headings (always important)
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tag)) {
      return true;
    }
    
    // Labels (always important)
    if (node.tag === 'label') {
      return true;
    }
    
    // Text with meaningful content
    if (node.text && node.text.trim().length > 2) {
      const text = node.text.trim();
      const textLower = text.toLowerCase();
      
      // Important keywords that indicate functional text
      const importantKeywords = [
        'search', 'login', 'sign in', 'sign up', 'register', 'menu', 'nav', 'navigation',
        'submit', 'buy', 'add to cart', 'cart', 'checkout', 'create', 'save', 'delete', 
        'edit', 'view', 'more', 'show', 'hide', 'filter', 'sort', 'browse', 'shop',
        'home', 'about', 'contact', 'help', 'support', 'account', 'profile', 'settings'
      ];
      
      // Check for important keywords
      if (importantKeywords.some(keyword => textLower.includes(keyword))) {
        return true;
      }
      
      // Check for button-like text (short, action-oriented)
      if (text.length <= 20 && /^(go|click|tap|press|enter|ok|yes|no|cancel|close|open|start|stop|play|pause)$/i.test(text)) {
        return true;
      }
      
      // Check for longer meaningful text (but not too long)
      if (text.length >= 5 && text.length <= 100 && !/^[0-9\s\-_.,!?]+$/.test(text)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Extract selectors from filtered DOM
   * @param {Object} filteredDom - Filtered DOM JSON
   * @returns {string[]} Array of selectors
   */
  extractSelectors(filteredDom) {
    const selectors = [];
    
    const traverse = (node) => {
      if (node.selector) {
        selectors.push(node.selector);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    
    traverse(filteredDom);
    return selectors;
  }

  /**
   * Extract selectors from array of filtered elements
   * @param {Array} elements - Array of filtered elements
   * @returns {string[]} Array of selectors
   */
  extractSelectorsFromArray(elements) {
    // Safety check to ensure elements is an array
    if (!Array.isArray(elements)) {
      console.warn('extractSelectorsFromArray received non-array:', typeof elements, elements);
      return [];
    }
    
    return elements
      .filter(element => element && element.selector)
      .map(element => element.selector);
  }

  /**
   * Clear the selection cache
   */
  clearSelectionCache() {
    this.selectionCache.clear();
    console.log('🗑️ Selection cache cleared');
  }

  /**
   * Build selection prompt
   * @param {Array} elements - Array of filtered elements
   * @param {string} intent - User intent
   * @param {string} url - The URL of the current webpage
   * @returns {string} Formatted prompt
   */
  buildSelectionPrompt(elements, intent, url = '') {
    // Estimate token count and truncate if needed
    const domString = JSON.stringify(elements, null, 2);
    const estimatedTokens = Math.ceil(domString.length / 4); // Rough estimation
    
    if (estimatedTokens > 15000) { // If too large, truncate further
      console.warn(`Elements too large (${estimatedTokens} tokens), truncating further`);
      const truncatedElements = elements.slice(0, Math.floor(elements.length * 0.7)); // Take 70% of elements
      return this.buildSelectionPrompt(truncatedElements, intent, url);
    }
    
    return `Extract ONLY the essential functional elements for navigation and core website functionality.

WEBSITE CONTEXT:
- Current URL: "${url}"
- This helps determine the website's primary purpose and functionality

INTENT ANALYSIS:
- User intent: "${intent}"
- If the intent appears unrelated to this website's primary purpose (e.g., "look at past Amazon orders" on Google.com), IGNORE the specific intent
- If the intent is relevant to this website, use it to guide selection
- When in doubt, focus on general navigation and core functionality

CORE FUNCTIONALITY TO EXTRACT:
- Search inputs and search buttons (primary search functionality)
- Main navigation menus and navigation links
- Login/signup forms and authentication buttons
- Primary call-to-action buttons
- Essential form inputs for core website functions
- Key content areas that represent the main purpose of the site
- Navigation breadcrumbs and site structure elements

REMOVE: ads, social widgets, decorative elements, footer text, cookie banners

ELEMENTS = ${domString}

Return a filtered array with only the essential elements users need for basic navigation and core website functionality. Each element should have: {tag, id, label, text, selector, isInteractive, isNavigationCandidate}. Do not create any new elements or modify the existing elements! Only return elements that exist in the original array. No hallucinations or creative liberties.`;
  }

  /**
   * Truncate DOM JSON to reduce token count
   * @param {Object} domJson - DOM JSON
   * @param {number} maxNodes - Maximum number of nodes
   * @returns {Object} Truncated DOM JSON
   */
  truncateDomJson(domJson, maxNodes) {
    let nodeCount = 0;
    
    const truncateNode = (node) => {
      if (nodeCount >= maxNodes) {
        return null;
      }
      
      nodeCount++;
      return {
        ...node,
        text: node.text ? node.text.substring(0, 20) : '',
        children: node.children.slice(0, 2).map(truncateNode).filter(Boolean)
      };
    };
    
    return truncateNode(domJson);
  }

  /**
   * Build patch prompt
   * @param {Object} selectedDom - Selected DOM JSON
   * @param {string} oldHtml - Existing HTML
   * @param {string} intent - User intent
   * @returns {string} Formatted prompt
   */
  buildPatchPrompt(selectedDom, oldHtml, intent) {
    const truncatedHtml = oldHtml.length > 80000 ? oldHtml.substring(0, 80000) + '...' : oldHtml;
    const selectedDomString = JSON.stringify(selectedDom, null, 1);
    
    // If still too large, truncate further
    if (selectedDomString.length > 80000) {
      const truncatedDom = this.truncateDomJson(selectedDom, 15);
      return this.buildPatchPrompt(truncatedDom, oldHtml, intent);
    }
    
    return `You need to create an HTML patch that modifies the existing HTML. The final HTML (obtained after applying your patch) must contain all elements in the selected DOM, and no other elements may be created (do not create any other text, buttons, or hallucinate new elements). Ensure that the elements in the SELECTED_DOM are exact, with no modifications to their attributes or content. If the elements in the SELECTED_DOM have handlers, they must be present in the HTML. The only additional elements you can create are divs for some basic grouping or organizing of the SELECTED_DOM elements.

Additionally, you may add the appropriate CSS classes to the SELECTED_DOM elements to make them have a consistent look. This is the only thing that can be modified for the SLECTED_DOM elements. These are the CSS classes that are available to you:
- retro-body: Main body styling with Windows 95/98 look
- retro-window: Window container with 3D border effect
- retro-window-header: Blue gradient header for windows
- retro-window-content: Content area of windows
- retro-button: Classic button styling with 3D effect
- retro-input: Input field with inset border
- retro-textarea: Textarea with inset border
- retro-label: Text labels
- retro-checkbox, retro-radio: Form controls
- retro-select: Dropdown select styling
- retro-panel: Panel container with border
- retro-groupbox: Group box with title
- retro-groupbox-title: Title for group boxes
- retro-listbox: List container
- retro-list-item: Individual list items
- retro-table: Table styling
- retro-toolbar: Toolbar container
- retro-toolbar-button: Toolbar buttons
- retro-statusbar: Status bar at bottom
- retro-menubar: Menu bar
- retro-menu-item: Menu items
- retro-progressbar: Progress bar container
- retro-progressbar-fill: Progress bar fill
- retro-title: Large title text
- retro-subtitle: Subtitle text
- retro-text: Regular text
- retro-icon: Small icons (16x16)
- retro-icon-large: Large icons (32x32)
- retro-form-row: Form row layout
- retro-form-label: Form labels
- retro-form-input: Form input containers
- retro-dialog: Dialog boxes
- retro-dialog-buttons: Dialog button containers
- retro-disabled: Disabled state
- retro-selected: Selected state
- retro-focused: Focused state

SELECTED_DOM = ${selectedDomString}

EXISTING_HTML = ${truncatedHtml}

Return JSON patch with operations: replace, append, prepend, remove, setAttribute, removeAttribute, replaceFullDocument.`;
  }

  /**
   * Apply a single operation to the document
   * @param {Document} doc - Document to modify
   * @param {Object} operation - Operation to apply
   */
  applyOperation(doc, operation) {
    try {
      switch (operation.op) {
        case 'replace':
          const replaceElement = doc.querySelector(operation.selector);
          if (replaceElement) {
            replaceElement.innerHTML = operation.html;
          } else {
            console.warn(`Element not found for replace: ${operation.selector}`);
          }
          break;
          
        case 'append':
          const appendElement = doc.querySelector(operation.selector);
          if (appendElement) {
            appendElement.insertAdjacentHTML('beforeend', operation.html);
          } else {
            console.warn(`Element not found for append: ${operation.selector}`);
          }
          break;
          
        case 'prepend':
          const prependElement = doc.querySelector(operation.selector);
          if (prependElement) {
            prependElement.insertAdjacentHTML('afterbegin', operation.html);
          } else {
            console.warn(`Element not found for prepend: ${operation.selector}`);
          }
          break;
          
        case 'remove':
          const removeElement = doc.querySelector(operation.selector);
          if (removeElement) {
            removeElement.remove();
          } else {
            console.warn(`Element not found for remove: ${operation.selector}`);
          }
          break;
          
        case 'setAttribute':
          const setAttrElement = doc.querySelector(operation.selector);
          if (setAttrElement) {
            setAttrElement.setAttribute(operation.attribute, operation.value);
          } else {
            console.warn(`Element not found for setAttribute: ${operation.selector}`);
          }
          break;
          
        case 'removeAttribute':
          const removeAttrElement = doc.querySelector(operation.selector);
          if (removeAttrElement) {
            removeAttrElement.removeAttribute(operation.attribute);
          } else {
            console.warn(`Element not found for removeAttribute: ${operation.selector}`);
          }
          break;
          
        case 'replaceFullDocument':
          // This is handled at a higher level
          break;
          
        default:
          console.warn(`Unknown operation: ${operation.op}`);
      }
    } catch (error) {
      console.error(`Error applying operation ${operation.op}:`, error);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMPatch;
} else {
  window.LLMPatch = new LLMPatch();
}