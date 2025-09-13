/**
 * LLM Integration for Simplified UI Generation
 * 
 * This module handles the integration with LLM APIs to generate
 * simplified UI based on real website content using a two-stage approach:
 * 1. Filter important elements from full DOM
 * 2. Generate simplified HTML from filtered elements
 */

class LLMIntegration {
  constructor() {
    this.apiKey = null; // Will be set via configuration
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-5'; // Using gpt-5 with vision capabilities
    this.filterModel = 'gpt-5'; // Using GPT-4 Turbo for reasoning tasks
  }

  /**
   * Configure the LLM API
   * @param {string} apiKey - OpenAI API key
   * @param {string} model - Model to use (default: gpt-5)
   */
  configure(apiKey, model = 'gpt-5') {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Build structured JSON representation of DOM
   * @param {Document|Element} root - Root element to serialize
   * @returns {Object} Structured DOM JSON following Node schema
   */
  buildDomJson(root) {
    const element = root.documentElement || root;
    return this.serializeElement(element);
  }

  /**
   * Serialize a single element to Node schema
   * @param {Element} element - DOM element to serialize
   * @returns {Object} Node object following schema
   */
  serializeElement(element) {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    // Extract aria attributes
    const aria = {};
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('aria-')) {
        aria[attr.name] = attr.value;
      }
    });

    // Compute label
    const label = this.computeLabel(element);
    
    // Compute visibility
    const visible = this.isElementVisible(element, rect, computedStyle);
    
    // Compute robust selector
    const selector = this.computeRobustSelector(element);
    
    // Determine if interactive
    const isInteractive = this.isInteractive(element);
    
    // Determine if navigation candidate
    const isNavigationCandidate = this.isNavigationCandidate(element);
    
    // Serialize children (limit to prevent huge JSON)
    const children = [];
    const childElements = Array.from(element.children);
    const maxChildren = 200; // Prevent excessive children
    
    for (let i = 0; i < Math.min(childElements.length, maxChildren); i++) {
      const child = childElements[i];
      if (child.nodeType === Node.ELEMENT_NODE) {
        children.push(this.serializeElement(child));
      }
    }

    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: Array.from(element.classList),
      role: element.getAttribute('role') || null,
      name: element.getAttribute('name') || null,
      type: element.getAttribute('type') || null,
      aria: aria,
      label: label,
      text: this.getTextContent(element).substring(0, 200), // Truncate text
      href: element.href || null,
      value: element.value || null,
      visible: visible,
      bbox: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      selector: selector,
      isInteractive: isInteractive,
      isNavigationCandidate: isNavigationCandidate,
      children: children
    };
  }

  /**
   * Compute label for an element
   * @param {Element} element - DOM element
   * @returns {string|null} Computed label
   */
  computeLabel(element) {
    // Try aria-label first
    if (element.getAttribute('aria-label')) {
      return element.getAttribute('aria-label');
    }
    
    // Try associated label element
    if (element.id) {
      const labelElement = document.querySelector(`label[for="${element.id}"]`);
      if (labelElement) {
        return labelElement.textContent.trim();
      }
    }
    
    // Try placeholder
    if (element.placeholder) {
      return element.placeholder;
    }
    
    // Try title attribute
    if (element.title) {
      return element.title;
    }
    
    return null;
  }

  /**
   * Get text content of element (excluding children)
   * @param {Element} element - DOM element
   * @returns {string} Text content
   */
  getTextContent(element) {
    let text = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  /**
   * Check if element is visible
   * @param {Element} element - DOM element
   * @param {DOMRect} rect - Bounding rect
   * @param {CSSStyleDeclaration} style - Computed style
   * @returns {boolean} Is visible
   */
  isElementVisible(element, rect, style) {
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           style.opacity !== '0';
  }

  /**
   * Compute robust CSS selector for element
   * @param {Element} element - DOM element
   * @returns {string} Robust selector
   */
  computeRobustSelector(element) {
    // Prefer ID if available
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Build path with tag, classes, and position
    const path = [];
    let current = element;
    
    while (current && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();
      
      // Add classes if few and meaningful
      if (current.classList.length > 0 && current.classList.length <= 3) {
        const classes = Array.from(current.classList).filter(cls => 
          !cls.match(/^(ng-|react-|vue-|js-)/) // Filter out framework classes
        );
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      // Add role if present
      if (current.getAttribute('role')) {
        selector += `[role="${current.getAttribute('role')}"]`;
      }
      
      // Add nth-child if needed for uniqueness
      const siblings = Array.from(current.parentElement?.children || [])
        .filter(sibling => sibling.tagName === current.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  /**
   * Check if element is interactive
   * @param {Element} element - DOM element
   * @returns {boolean} Is interactive
   */
  isInteractive(element) {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'form'];
    const interactiveRoles = ['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio', 'menuitem'];
    
    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           interactiveRoles.includes(element.getAttribute('role')) ||
           element.onclick ||
           element.getAttribute('tabindex') !== null ||
           element.getAttribute('data-action') ||
           element.getAttribute('data-toggle');
  }

  /**
   * Check if element is navigation candidate
   * @param {Element} element - DOM element
   * @returns {boolean} Is navigation candidate
   */
  isNavigationCandidate(element) {
    const navTags = ['nav', 'header', 'footer'];
    const navRoles = ['navigation', 'banner', 'contentinfo', 'main', 'complementary'];
    const navClasses = ['nav', 'navigation', 'menu', 'breadcrumb', 'sidebar', 'header', 'footer'];
    
    // Check tag
    if (navTags.includes(element.tagName.toLowerCase())) {
      return true;
    }
    
    // Check role
    if (navRoles.includes(element.getAttribute('role'))) {
      return true;
    }
    
    // Check classes
    const classes = Array.from(element.classList);
    if (classes.some(cls => navClasses.some(navClass => cls.toLowerCase().includes(navClass)))) {
      return true;
    }
    
    // Check if contains navigation links
    const navLinks = element.querySelectorAll('a[href], button');
    if (navLinks.length > 2) {
      return true;
    }
    
    return false;
  }

  /**
   * Capture comprehensive website data for LLM analysis
   * @param {Document} dom - The DOM object to analyze
   * @returns {Promise<Object>} Website data including screenshot, DOM, and metadata
   */
  async captureWebsiteData(dom) {
    try {
      // Take a screenshot of the current page
      const screenshot = await this.captureScreenshot();
      
      // Extract DOM structure with interactive elements
      const domData = this.extractDOMStructure(dom);
      
      // Extract metadata
      const metadata = this.extractMetadata(dom);
      
      return {
        screenshot,
        dom: domData,
        metadata,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error capturing website data:', error);
      throw error;
    }
  }

  /**
   * Capture screenshot of the current page
   * @returns {Promise<string>} Base64 encoded screenshot
   */
  async captureScreenshot() {
    return new Promise((resolve, reject) => {
      // Use Chrome extension API to capture visible tab
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          // Convert data URL to base64
          const base64 = dataUrl.split(',')[1];
          resolve(base64);
        }
      });
    });
  }

  /**
   * Extract DOM structure focusing on interactive elements
   * @param {Document} dom - DOM object to analyze
   * @returns {Object} Structured DOM data
   */
  extractDOMStructure(dom) {
    const interactiveElements = [];
    const allElements = dom.querySelectorAll('button, a, input, select, textarea, form, [onclick], [role="button"]');
    
    allElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      
      // Generate stable ID for mapping
      const stableId = this.generateStableId(element, index);
      
      interactiveElements.push({
        id: stableId,
        tagName: element.tagName.toLowerCase(),
        text: element.textContent?.trim().substring(0, 100) || '',
        type: element.type || '',
        href: element.href || '',
        placeholder: element.placeholder || '',
        value: element.value || '',
        className: element.className || '',
        role: element.getAttribute('role') || '',
        ariaLabel: element.getAttribute('aria-label') || '',
        position: {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        visible: rect.width > 0 && rect.height > 0 && computedStyle.visibility !== 'hidden',
        interactive: this.isInteractive(element)
      });
    });

    return {
      title: dom.title || 'Untitled Page',
      url: window.location.href,
      interactiveElements,
      pageStructure: this.extractPageStructure(dom)
    };
  }

  /**
   * Generate stable ID for element mapping
   * @param {Element} element - DOM element
   * @param {number} index - Element index
   * @returns {string} Stable ID
   */
  generateStableId(element, index) {
    // Try to use existing ID first
    if (element.id) {
      return `sid-${element.id}`;
    }
    
    // Try to use data attributes
    if (element.dataset.id) {
      return `sid-${element.dataset.id}`;
    }
    
    // Generate based on position and content
    const text = element.textContent?.trim().substring(0, 20) || '';
    const tag = element.tagName.toLowerCase();
    const position = element.getBoundingClientRect();
    
    return `sid-${tag}-${index}-${text.replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Check if element is interactive
   * @param {Element} element - DOM element
   * @returns {boolean} Is interactive
   */
  isInteractive(element) {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'form'];
    const interactiveRoles = ['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio'];
    
    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           interactiveRoles.includes(element.getAttribute('role')) ||
           element.onclick ||
           element.getAttribute('tabindex') !== null;
  }

  /**
   * Extract page structure for context
   * @param {Document} dom - DOM object
   * @returns {Object} Page structure
   */
  extractPageStructure(dom) {
    const headings = Array.from(dom.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => ({ level: parseInt(h.tagName[1]), text: h.textContent.trim() }));
    
    const forms = Array.from(dom.querySelectorAll('form'))
      .map(form => ({
        action: form.action,
        method: form.method,
        fields: Array.from(form.querySelectorAll('input, select, textarea'))
          .map(field => ({
            type: field.type,
            name: field.name,
            placeholder: field.placeholder
          }))
      }));

    return { headings, forms };
  }

  /**
   * Extract metadata from the page
   * @param {Document} dom - DOM object
   * @returns {Object} Page metadata
   */
  extractMetadata(dom) {
    return {
      title: dom.title || 'Untitled Page',
      url: window.location.href,
      domain: window.location.hostname,
      description: dom.querySelector('meta[name="description"]')?.content || '',
      viewport: dom.querySelector('meta[name="viewport"]')?.content || '',
      charset: dom.querySelector('meta[charset]')?.charset || 'utf-8'
    };
  }

  /**
   * Stage 1: Filter important elements from DOM JSON
   * @param {Object} domJson - Full DOM JSON structure
   * @returns {Promise<Object>} Filtered DOM JSON with only important elements
   */
  async filterImportantElements(domJson) {
    if (!this.apiKey) {
      throw new Error('API key not configured. Call configure() first.');
    }

    // Check cache first
    const urlKey = this.getUrlKey();
    const cached = this.loadFilteredJson(urlKey);
    if (cached) {
      console.log('Using cached filtered DOM');
      return cached;
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.filterModel,
          messages: [
            {
              role: 'system',
              content: `You are an expert UI information architect. Your task is to filter a DOM Tree JSON to include only essential navigation and user input elements that are necessary for the primary user workflows on a webpage.

CRITICAL RULES:
1. Preserve the original hierarchy and structure of the DOM tree
2. Keep ALL original selector values - do not modify or invent new selectors
3. Remove unimportant elements entirely from the tree
4. Maintain parent-child relationships for context and grouping
5. Output ONLY valid JSON following the exact Node schema provided
6. Do not include any text outside the JSON response

IMPORTANT ELEMENTS TO KEEP:
- Global navigation (main nav, header menus, breadcrumbs)
- Primary call-to-action buttons and links
- Search bars and search functionality
- Login/sign-up forms and buttons
- Main content forms (contact, checkout, registration, etc.)
- Form inputs, selects, textareas, and submit buttons
- Pagination controls
- Tab navigation and filters
- Sort controls and important filters
- Main content areas and sections
- Sidebar navigation (if present)
- Footer navigation (if it contains important links)

ELEMENTS TO REMOVE:
- Advertisement blocks and promotional content
- Social media share buttons (unless primary)
- Cookie banners (unless they block user input)
- Decorative images and icons
- Unrelated recommendations and "you might also like" sections
- Comments sections (unless they're the main content)
- Footer copyright and legal text
- Analytics and tracking scripts
- Loading spinners and decorative elements
- Redundant or duplicate navigation elements

Remember: The goal is to create a clean, focused interface that preserves all essential user interactions while removing clutter.`
            },
            {
              role: 'user',
              content: `Please filter this DOM tree JSON to keep only the important navigation and user input elements:

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

Return the filtered DOM tree as JSON with the same schema, but with only the important elements preserved.`
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 80000
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const filteredJson = JSON.parse(data.choices[0].message.content);
      
      // Cache the result
      this.saveFilteredJson(urlKey, filteredJson);
      
      return filteredJson.filtered_dom_tree || filteredJson;
    } catch (error) {
      console.error('Error filtering important elements:', error);
      // Fallback to local filtering
      return this.localFilterImportantElements(domJson);
    }
  }

  /**
   * Stage 2: Generate HTML from filtered DOM JSON
   * @param {Object} filteredDomJson - Filtered DOM JSON structure
   * @returns {Promise<string>} Generated HTML
   */
  async generateHtmlFromFiltered(filteredDomJson) {
    if (!this.apiKey) {
      throw new Error('API key not configured. Call configure() first.');
    }

    const prompt = this.buildHtmlGenerationPrompt(filteredDomJson);
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a frontend architect specializing in creating clean, accessible, retro-styled interfaces. Your task is to convert a filtered DOM Tree JSON into minimal, accessible HTML using Windows 95/98 retro styling.

CRITICAL REQUIREMENTS:
1. Preserve the parent-child structure of the filtered DOM tree
2. For EVERY interactive element, add data-selector="<original selector>" attribute
3. For EVERY interactive element, add data-sid="<stable-id>" attribute (use a hash of the selector)
4. Use ONLY these allowed HTML tags: div, span, p, button, input, select, textarea, ul, li, a, form, h1, h2, h3, h4, h5, h6, img
5. Use ONLY the provided retro CSS classes - no inline styles except for data attributes
6. No scripts, no external resources, no inline event handlers
7. Output ONLY the body innerHTML (no <html>, <head>, or <body> tags)
8. Make the interface clean, accessible, and easy to navigate

RETRO CSS CLASSES AVAILABLE:
- .retro-window, .retro-window-header, .retro-window-content
- .retro-button, .retro-input, .retro-select, .retro-textarea
- .retro-panel, .retro-groupbox, .retro-toolbar
- .retro-title, .retro-subtitle, .retro-text
- .retro-form-row, .retro-form-label, .retro-form-input
- .retro-listbox, .retro-list-item
- .retro-table, .retro-dialog
- .retro-menubar, .retro-menu-item
- .retro-statusbar, .retro-progressbar

MAPPING RULES:
- Convert complex forms into simplified retro form layouts
- Group related elements using .retro-groupbox
- Use .retro-panel for content sections
- Convert navigation into .retro-menubar or .retro-listbox
- Use .retro-button for all clickable elements
- Use .retro-input, .retro-select, .retro-textarea for form controls
- Add semantic headings (h1-h6) to improve structure
- Preserve form functionality and input types`
            },
            {
              role: 'user',
              content: `Convert this filtered DOM tree into retro-styled HTML:

FILTERED_DOM_TREE = ${JSON.stringify(filteredDomJson, null, 2)}

Generate the body innerHTML only, using retro CSS classes and preserving all interactive element mappings.`
            }
          ],
          max_completion_tokens: 100000
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating HTML:', error);
      throw error;
    }
  }

  /**
   * Generate simplified UI using LLM (legacy method - now uses two-stage approach)
   * @param {Object} websiteData - Captured website data
   * @returns {Promise<string>} Generated HTML
   */
  async generateSimplifiedUI(websiteData) {
    if (!this.apiKey) {
      throw new Error('API key not configured. Call configure() first.');
    }

    const prompt = this.buildPrompt(websiteData);
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${websiteData.screenshot}`
                  }
                }
              ]
            }
          ],
          max_completion_tokens: 100000
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating simplified UI:', error);
      throw error;
    }
  }

  /**
   * Build the prompt for LLM
   * @param {Object} websiteData - Website data
   * @returns {string} Formatted prompt
   */
  buildPrompt(websiteData) {
    return `You are an expert UI designer specializing in creating simplified, accessible interfaces. 

TASK: Analyze the provided website screenshot and DOM data to create a simplified, retro-styled UI that maintains all functionality while being more accessible and easier to use.

REQUIREMENTS:
1. Generate clean HTML using the retro CSS classes provided
2. Include data-sid attributes for ALL interactive elements that map to the original elements
3. Preserve all functionality (forms, buttons, links, etc.)
4. Use a Windows 95/98 retro aesthetic
5. Make the interface more accessible and easier to navigate
6. Remove clutter and focus on essential functionality

WEBSITE DATA:
- Title: ${websiteData.metadata.title}
- URL: ${websiteData.metadata.url}
- Domain: ${websiteData.metadata.domain}

INTERACTIVE ELEMENTS FOUND:
${websiteData.dom.interactiveElements.map(el => 
  `- ${el.tagName} (${el.id}): "${el.text}" - Position: ${el.position.x},${el.position.y} - Type: ${el.type || 'N/A'}`
).join('\n')}

RETRO CSS CLASSES AVAILABLE:
- .retro-window, .retro-window-header, .retro-window-content
- .retro-button, .retro-input, .retro-select, .retro-textarea
- .retro-panel, .retro-groupbox, .retro-toolbar
- .retro-title, .retro-subtitle, .retro-text
- .retro-form-row, .retro-form-label, .retro-form-input
- .retro-listbox, .retro-list-item
- .retro-table, .retro-dialog

CRITICAL: Every interactive element MUST have a data-sid attribute that matches the original element's ID. This is essential for action mapping.

Generate a complete HTML page that represents a simplified, retro-styled version of this website.`;
  }

  /**
   * Build HTML generation prompt for filtered DOM
   * @param {Object} filteredDomJson - Filtered DOM JSON
   * @returns {string} Formatted prompt
   */
  buildHtmlGenerationPrompt(filteredDomJson) {
    return `Convert this filtered DOM tree into clean, functional HTML that shows only the essential elements users need:

FILTERED_DOM_TREE = ${JSON.stringify(filteredDomJson, null, 2)}

Generate clean HTML that:
1. Preserves all original functionality (forms, buttons, links)
2. Uses semantic HTML tags (form, input, button, nav, ul, li)
3. Keeps original attributes (id, name, type, href, action)
4. Focuses on CORE FUNCTIONALITY, not styling
5. Makes elements easily clickable and usable
6. Removes decorative elements and clutter

Examples:
- Google: Show search input + search button
- Amazon: Show main nav + search + category menu  
- E-commerce: Show search + filters + product grid
- News: Show main navigation + article headlines

Generate the body innerHTML only, focusing on what users actually need to use the website.`;
  }

  /**
   * Fallback method for when LLM is not available
   * @param {Object} websiteData - Website data
   * @returns {string} Fallback HTML
   */
  generateFallbackUI(websiteData) {
    const { metadata, dom } = websiteData;
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Simplified UI - ${metadata.title}</title>
    </head>
    <body class="retro-body">
      <div class="retro-window">
        <div class="retro-window-header">
          <span>Simplified UI - ${metadata.title}</span>
        </div>
        
        <div class="retro-window-content">
          <h1 class="retro-title">${metadata.title}</h1>
          <p class="retro-text">Simplified interface for: ${metadata.domain}</p>
          
          <div class="retro-panel">
            <h2 class="retro-subtitle">Interactive Elements</h2>
            ${dom.interactiveElements.map(el => `
              <div class="retro-form-row">
                <button class="retro-button" data-sid="${el.id}">
                  ${el.text || el.tagName} (${el.type || 'button'})
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Get URL key for caching
   * @returns {string} URL key for caching
   */
  getUrlKey() {
    const url = new URL(window.location.href);
    return `${url.origin}${url.pathname}`;
  }

  /**
   * Save filtered JSON to cache
   * @param {string} urlKey - URL key
   * @param {Object} filteredJson - Filtered DOM JSON
   */
  saveFilteredJson(urlKey, filteredJson) {
    try {
      const cacheData = {
        data: filteredJson,
        timestamp: Date.now(),
        url: urlKey
      };
      sessionStorage.setItem(`filtered_dom_${urlKey}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache filtered DOM:', error);
    }
  }

  /**
   * Load filtered JSON from cache
   * @param {string} urlKey - URL key
   * @returns {Object|null} Cached filtered JSON or null
   */
  loadFilteredJson(urlKey) {
    try {
      const cached = sessionStorage.getItem(`filtered_dom_${urlKey}`);
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      const maxAge = 30 * 60 * 1000; // 30 minutes
      
      if (Date.now() - cacheData.timestamp > maxAge) {
        sessionStorage.removeItem(`filtered_dom_${urlKey}`);
        return null;
      }
      
      return cacheData.data;
    } catch (error) {
      console.warn('Failed to load cached filtered DOM:', error);
      return null;
    }
  }

  /**
   * Local fallback filtering when LLM fails
   * @param {Object} domJson - Full DOM JSON
   * @returns {Object} Locally filtered DOM JSON
   */
  localFilterImportantElements(domJson) {
    console.log('Using local fallback filtering');
    
    const filterNode = (node) => {
      // Keep if interactive or navigation candidate
      if (node.isInteractive || node.isNavigationCandidate) {
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
      
      // Keep structural elements that might be needed
      const structuralTags = ['html', 'body', 'main', 'section', 'article', 'header', 'nav', 'footer'];
      if (structuralTags.includes(node.tag)) {
        return {
          ...node,
          children: node.children.map(filterNode).filter(Boolean)
        };
      }
      
      return null;
    };
    
    return filterNode(domJson);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMIntegration;
} else {
  window.LLMIntegration = LLMIntegration;
}
