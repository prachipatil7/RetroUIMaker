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
    this.model = 'gpt-4.1'; // Using 4.1 for both selection and patching
    this.apiKey = null;
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
   * Make API request with retry logic and rate limiting handling
   * @param {string} apiKey - API key
   * @param {string} prompt - User prompt
   * @param {string} type - Request type ('selection' or 'patch')
   * @returns {Promise<Response>} API response
   */
  async makeApiRequest(apiKey, prompt, type) {
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
            max_tokens: type === 'selection' ? 8000 : 8000, // Reduced to prevent TPM limits
            temperature: type === 'selection' ? 0.1 : 0.2
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
   * Get system prompt for selection requests
   * @returns {string} System prompt
   */
  getSelectionSystemPrompt() {
    return `You are an expert UI analyzer. Your task is to identify and extract ONLY the essential functional elements that users need to accomplish their goals on a website.

CRITICAL RULES:
1. Preserve the original hierarchy and structure of the DOM tree
2. Keep ALL original selector values - do not modify or invent new selectors
3. Focus on CORE FUNCTIONALITY, not styling or decoration
4. Maintain parent-child relationships for context and grouping
5. Output ONLY valid JSON following the exact Node schema provided
6. Do not include any text outside the JSON response

ESSENTIAL ELEMENTS TO KEEP:
- Primary search inputs and search buttons
- Main navigation menus and links
- Login/signup forms and buttons
- Primary call-to-action buttons
- Form inputs for core functionality (checkout, contact, etc.)
- Content areas that directly serve the user's purpose
- Essential navigation breadcrumbs

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

Remember: Extract only what users actually NEED to use the website's core functionality.`;
  }

  /**
   * Get system prompt for patch requests
   * @returns {string} System prompt
   */
  getPatchSystemPrompt() {
    return `You are an expert HTML generator. Your task is to create clean, functional HTML that shows ONLY the essential elements users need from a website.

CRITICAL RULES:
1. Output ONLY valid JSON following the exact patch schema
2. Use CSS selectors that exist in the target HTML
3. Create clean, minimal HTML with NO styling classes
4. Focus on FUNCTIONALITY, not appearance
5. Preserve original element attributes (id, name, type, etc.)
6. Make elements easily clickable and usable

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

HTML GENERATION RULES:
- Use semantic HTML tags (form, input, button, nav, ul, li, etc.)
- Preserve original input types, names, and values
- Keep original href attributes for links
- Maintain form structure and action attributes
- Use simple, clean markup without CSS classes
- Focus on making elements functional, not pretty

EXAMPLES:
- Google: Show search input + search button
- Amazon: Show main nav + search + category menu
- E-commerce: Show search + filters + product grid
- News: Show main navigation + article headlines

Remember: Create functional HTML that lets users accomplish their goals, not decorative layouts.`;
  }

  /**
   * Select relevant DOM elements based on user intent
   * @param {Document} originalDOM - The original DOM object
   * @param {string} intent - User intent for filtering
   * @returns {Promise<Object>} Filtered DOM JSON and selected selectors
   */
  async selectRelevantDomElements(originalDOM, intent) {
    try {
      const apiKey = await this.getApiKey();
      
      // Use existing LLMIntegration to serialize DOM
      const llmIntegration = new window.LLMIntegration();
      const fullDomJson = llmIntegration.buildDomJson(originalDOM);
      
      // Pre-trim to reduce token usage - keep interactive and structural elements
      const preTrimmedDom = this.preTrimDom(fullDomJson);
      
      // Check if still too large for API
      const domString = JSON.stringify(preTrimmedDom, null, 2);
      const estimatedTokens = Math.ceil(domString.length / 4);
      
      if (estimatedTokens > 20000) {
        console.warn(`DOM still too large (${estimatedTokens} tokens), using local filtering only`);
        const llmIntegration = new window.LLMIntegration();
        const filtered = llmIntegration.localFilterImportantElements(preTrimmedDom);
        console.log('Filtered DOM JSON:', filtered);
        return {
          filteredDomJson: filtered,
          selectedSelectors: this.extractSelectors(filtered)
        };
      }
      
      const prompt = this.buildSelectionPrompt(preTrimmedDom, intent);
      
      const response = await this.makeApiRequest(apiKey, prompt, 'selection');
      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      console.log('Filtered DOM JSON:', result);
      return {
        filteredDomJson: result.filtered_dom_tree || result,
        selectedSelectors: this.extractSelectors(result.filtered_dom_tree || result)
      };
    } catch (error) {
      console.error('Error selecting relevant DOM elements:', error);
      // Fallback to local filtering
      const llmIntegration = new window.LLMIntegration();
      const fullDomJson = llmIntegration.buildDomJson(originalDOM);
      const preTrimmedDom = this.preTrimDom(fullDomJson);
      const filtered = llmIntegration.localFilterImportantElements(preTrimmedDom);
      console.log('Filtered DOM JSON:', filtered);
      return {
        filteredDomJson: filtered,
        selectedSelectors: this.extractSelectors(filtered)
      };
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
      
      const bodyInnerHTML = await llmIntegration.generateHtmlFromFiltered(selectedDom);
      
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
</head>
<body class="retro-body">
  <div class="retro-window">
    <div class="retro-window-header">
      <span>Generated UI</span>
    </div>
    <div class="retro-window-content">
      <p class="retro-text">Content generated from selected elements</p>
    </div>
  </div>
</body>
</html>`;
    }
  }

  /**
   * Pre-trim DOM to extract only functional elements (inputs, buttons, important text)
   * @param {Object} domJson - Full DOM JSON
   * @returns {Object} Pre-trimmed DOM JSON with only functional elements
   */
  preTrimDom(domJson) {
    const functionalElements = [];
    
    // Find the body element
    const bodyElement = this.findBodyElement(domJson);
    if (!bodyElement) {
      console.warn('No body element found');
      return domJson;
    }
    
    // Extract functional elements from body
    this.extractFunctionalElements(bodyElement, functionalElements);
    
    console.log(`Extracted ${functionalElements.length} functional elements:`, functionalElements);
    
    // Create a minimal DOM structure with just the functional elements
    return {
      tag: 'html',
      children: [{
        tag: 'body',
        children: functionalElements
      }]
    };
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
   * Build selection prompt
   * @param {Object} domJson - DOM JSON
   * @param {string} intent - User intent
   * @returns {string} Formatted prompt
   */
  buildSelectionPrompt(domJson, intent) {
    // Estimate token count and truncate if needed
    const domString = JSON.stringify(domJson, null, 2);
    const estimatedTokens = Math.ceil(domString.length / 4); // Rough estimation
    
    if (estimatedTokens > 15000) { // If too large, truncate further
      console.warn(`DOM too large (${estimatedTokens} tokens), truncating further`);
      const truncatedDom = this.truncateDomJson(domJson, 30); // Further reduce nodes
      return this.buildSelectionPrompt(truncatedDom, intent);
    }
    
    return `Extract ONLY the essential functional elements for user intent: "${intent}"

Focus on CORE FUNCTIONALITY:
- Search inputs and buttons
- Main navigation menus
- Login/signup forms
- Primary call-to-action buttons
- Essential form inputs
- Key content areas

Remove: ads, social widgets, decorative elements, footer text, cookie banners

Schema: {tag, id, classes[], role, name, type, aria{}, label, text, href, value, visible, bbox{x,y,w,h}, selector, isInteractive, isNavigationCandidate, children[]}

DOM_TREE = ${domString}

Return filtered JSON with only the essential elements users need to accomplish their goals.`;
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
    const truncatedHtml = oldHtml.length > 2000 ? oldHtml.substring(0, 2000) + '...' : oldHtml;
    const selectedDomString = JSON.stringify(selectedDom, null, 1);
    
    // If still too large, truncate further
    if (selectedDomString.length > 5000) {
      const truncatedDom = this.truncateDomJson(selectedDom, 15);
      return this.buildPatchPrompt(truncatedDom, oldHtml, intent);
    }
    
    return `Create HTML patch for intent: "${intent}"

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
