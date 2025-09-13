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
    this.model = 'gpt-4o'; // Using GPT-4o for both selection and patching
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
            max_tokens: type === 'selection' ? 10000 : 10000,
            temperature: type === 'selection' ? 0.1 : 0.2
          })
        });

        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);
          
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
    return `You are an expert UI information architect. Your task is to filter a DOM Tree JSON to include only elements relevant to the user's intent.

CRITICAL RULES:
1. Preserve the original hierarchy and structure of the DOM tree
2. Keep ALL original selector values - do not modify or invent new selectors
3. Remove elements that are not relevant to the user's intent
4. Maintain parent-child relationships for context and grouping
5. Output ONLY valid JSON following the exact Node schema provided
6. Do not include any text outside the JSON response

INTENT-BASED FILTERING:
- Focus on elements that directly serve the user's stated intent
- Keep navigation elements that help achieve the intent
- Keep form elements and interactive controls relevant to the intent
- Keep content sections that support the intent
- Remove decorative elements, ads, and unrelated content

Remember: The goal is to create a focused interface that preserves all essential elements for the user's specific intent.`;
  }

  /**
   * Get system prompt for patch requests
   * @returns {string} System prompt
   */
  getPatchSystemPrompt() {
    return `You are an expert HTML patching system. Your task is to create minimal, structured patches to transform existing HTML based on selected DOM elements and user intent.

CRITICAL RULES:
1. Output ONLY valid JSON following the exact patch schema
2. Use CSS selectors that exist in the target HTML
3. Make minimal changes - only what's necessary
4. Preserve existing structure when possible
5. Use retro CSS classes for new elements
6. Ensure patches are idempotent

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

RETRO CSS CLASSES AVAILABLE:
- .retro-window, .retro-window-header, .retro-window-content
- .retro-button, .retro-input, .retro-select, .retro-textarea
- .retro-panel, .retro-groupbox, .retro-toolbar
- .retro-title, .retro-subtitle, .retro-text
- .retro-form-row, .retro-form-label, .retro-form-input
- .retro-listbox, .retro-list-item
- .retro-table, .retro-dialog
- .retro-menubar, .retro-menu-item
- .retro-statusbar, .retro-progressbar`;
  }

  /**
   * Select relevant DOM elements based on user intent
   * @param {Document} originalDOM - The original DOM object
   * @param {string} intent - User intent for filtering
   * @returns {Promise<Object>} Filtered DOM JSON and selected selectors
   */
  async selectRelevantDomElements(originalDOM, intent) {
    const apiKey = await this.getApiKey();
    
    // Use existing LLMIntegration to serialize DOM
    const llmIntegration = new window.LLMIntegration();
    const fullDomJson = llmIntegration.buildDomJson(originalDOM);
    
    // Pre-trim to reduce token usage - keep interactive and structural elements
    const preTrimmedDom = this.preTrimDom(fullDomJson);
    
    const prompt = this.buildSelectionPrompt(preTrimmedDom, intent);
    
    try {
      const response = await this.makeApiRequest(apiKey, prompt, 'selection');
      
      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      
      return {
        filteredDomJson: result.filtered_dom_tree || result,
        selectedSelectors: this.extractSelectors(result.filtered_dom_tree || result)
      };
    } catch (error) {
      console.error('Error selecting relevant DOM elements:', error);
      // Fallback to local filtering
      const llmIntegration = new window.LLMIntegration();
      const filtered = llmIntegration.localFilterImportantElements(preTrimmedDom);
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
   * Pre-trim DOM to reduce token usage
   * @param {Object} domJson - Full DOM JSON
   * @returns {Object} Pre-trimmed DOM JSON
   */
  preTrimDom(domJson) {
    const filterNode = (node) => {
      // Keep if interactive, navigation candidate, or structural
      if (node.isInteractive || node.isNavigationCandidate) {
        return {
          ...node,
          children: node.children.map(filterNode).filter(Boolean)
        };
      }
      
      // Keep structural elements
      const structuralTags = ['html', 'body', 'main', 'section', 'article', 'header', 'nav', 'footer', 'form'];
      if (structuralTags.includes(node.tag)) {
        return {
          ...node,
          children: node.children.map(filterNode).filter(Boolean)
        };
      }
      
      // Keep if has important children
      const filteredChildren = node.children.map(filterNode).filter(Boolean);
      if (filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      
      return null;
    };
    
    return filterNode(domJson);
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
    return `Please filter this DOM tree JSON to keep only elements relevant to the user's intent: "${intent}"

DOM_TREE_SCHEMA:
{
  "tag": "string (lowercase tag name)",
  "id": "string | null",
  "classes": "string[]",
  "role": "string | null",
  "name": "string | null",
  "type": "string | null",
  "aria": "object (aria-* attributes)",
  "label": "string | null",
  "text": "string (truncated to 200 chars)",
  "href": "string | null",
  "value": "string | null",
  "visible": "boolean",
  "bbox": {"x": "number", "y": "number", "width": "number", "height": "number"},
  "selector": "string (robust CSS selector)",
  "isInteractive": "boolean",
  "isNavigationCandidate": "boolean",
  "children": "Node[] (recursive)"
}

DOM_TREE = ${JSON.stringify(domJson, null, 2)}

Return the filtered DOM tree as JSON with the same schema, but with only the elements relevant to the intent preserved.`;
  }

  /**
   * Build patch prompt
   * @param {Object} selectedDom - Selected DOM JSON
   * @param {string} oldHtml - Existing HTML
   * @param {string} intent - User intent
   * @returns {string} Formatted prompt
   */
  buildPatchPrompt(selectedDom, oldHtml, intent) {
    const truncatedHtml = oldHtml.length > 5000 ? oldHtml.substring(0, 5000) + '...' : oldHtml;
    
    return `Create a minimal HTML patch to transform the existing HTML based on the selected DOM elements and user intent: "${intent}"

SELECTED_DOM_ELEMENTS = ${JSON.stringify(selectedDom, null, 2)}

EXISTING_HTML = ${truncatedHtml}

Generate a patch that:
1. Uses the selected DOM elements to enhance the existing HTML
2. Applies retro styling classes
3. Maintains the user's intent
4. Makes minimal changes to the existing structure

Return the patch as JSON following the schema provided.`;
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
