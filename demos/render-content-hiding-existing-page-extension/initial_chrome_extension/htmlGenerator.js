/**
 * HTML Generator for Chrome Extension
 * 
 * This module generates HTML content that will be displayed when the extension
 * is toggled on. Currently returns a static "Hello World" page, but is designed
 * to be easily replaced with LLM-generated content in the future.
 */

// createCopy function is available globally from create_copy.js loaded before this script
// Cache to prevent duplicate LLM calls
const contentCache = new Map();

/**
 * Clear the content cache
 */
function clearContentCache() {
  contentCache.clear();
  console.log('🗑️ Content cache cleared');
}

/**
 * Generates HTML content based on the original DOM using LLM-driven filtering and patching
 * 
 * @param {Document} originalDOM - The original DOM object of the page
 * @param {string} intent - The intent or purpose for the generated UI
 * @param {string} old_html - Previous HTML version for comparison/iteration
 * @returns {Promise<string>} Clean HTML content without layout constraints
 */
async function generatePageHTML(originalDOM, intent, old_html) {
  console.log('🔄 generatePageHTML called with intent:', intent, 'old_html length:', old_html?.length || 0);
  
  // Create cache key based on intent and page URL
  const cacheKey = `${window.location.href}_${intent || 'default'}`;
  
  // Check cache first
  if (contentCache.has(cacheKey)) {
    console.log('📦 Using cached content for:', cacheKey);
    return contentCache.get(cacheKey);
  }
  
  try {
    // Check if LLMPatch is available
    if (!window.LLMPatch) {
      console.warn('LLMPatch not available, falling back to static content');
      const fallbackContent = generateFallbackHTML(originalDOM, intent, old_html);
      contentCache.set(cacheKey, fallbackContent);
      return fallbackContent;
    }

    // Stage 1: Select relevant DOM elements based on intent
    const { filteredDomJson } = await window.LLMPatch.selectRelevantDomElements(originalDOM, intent || '');
    console.log('Filtered DOM JSON:', filteredDomJson);

    // Stage 1.5: Create copies of the filtered DOM elements
    // console.log('🔍 Checking createCopy availability:', {
    //   'typeof createCopy': typeof createCopy,
    //   'typeof window.createCopy': typeof window.createCopy,
    //   'createCopy in window': 'createCopy' in window
    // });
    const copiedElements = window.createCopy(filteredDomJson);
    console.log('Copied elements:', copiedElements);
    
    // Stage 2: Assemble copied elements into HTML with preserved event handlers
    let elementsHTML = '';
    
    // Convert each element to HTML string (without inline handlers to avoid CSP issues)
    copiedElements.forEach(element => {
      // Don't add inline onclick/onchange handlers - we'll add them via script instead
      elementsHTML += element.outerHTML + '\n';
    });
    
    // Create complete HTML structure
    const updatedHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generated UI - ${extractTitleFromDOM(originalDOM)}</title>
        <link rel="stylesheet" href="${chrome.runtime.getURL('retro-theme.css')}">
      </head>
      <body class="retro-body">
        <div class="retro-window">
          <div class="retro-window-header">
            <span>Generated UI - ${intent || 'Default'}</span>
          </div>
          <div class="retro-window-content retro-container">
            ${elementsHTML}
          </div>
        </div>
        <script>
          // Add event listeners after DOM is loaded (CSP-compliant)
          document.addEventListener('DOMContentLoaded', function() {
            // Add click listeners to interactive elements
            const clickableElements = document.querySelectorAll('[data-selector]');
            clickableElements.forEach(element => {
              const tagName = element.tagName.toLowerCase();
              const inputType = element.type;
              
              // Add click listeners for buttons, links, and submit/button inputs
              if (tagName === 'button' || tagName === 'a' || 
                  (tagName === 'input' && (inputType === 'button' || inputType === 'submit'))) {
                element.addEventListener('click', function(e) {
                  e.preventDefault();
                  const selector = this.getAttribute('data-selector');
                  parent.postMessage({
                    type: 'CLICK_ELEMENT',
                    selector: selector
                  }, '*');
                  console.log('CLICK_ELEMENT', selector);
                });
              }
              
              // Add change listeners for inputs and textareas
              if (tagName === 'input' || tagName === 'textarea') {
                element.addEventListener('change', function() {
                  const selector = this.getAttribute('data-selector');
                  parent.postMessage({
                    type: 'CHANGE_ELEMENT',
                    selector: selector,
                    value: this.value
                  }, '*');
                  console.log('CHANGE_ELEMENT', selector, this.value);
                });
              }
            });
          });
        </script>
      </body>
      </html>
    `;
    console.log('Assembled HTML:', updatedHtml);
    
    // Cache the result
    contentCache.set(cacheKey, updatedHtml);
    console.log('💾 Cached content for:', cacheKey);
    
    return updatedHtml;
  } catch (error) {
    console.error('Error in LLM pipeline, falling back to static content:', error);
    
    // Try to load base template as fallback
    try {
      const baseTemplate = await window.LLMPatch.loadBaseTemplate();
      contentCache.set(cacheKey, baseTemplate);
      return baseTemplate;
    } catch (templateError) {
      console.error('Failed to load base template:', templateError);
      const fallbackContent = generateFallbackHTML(originalDOM, intent, old_html);
      contentCache.set(cacheKey, fallbackContent);
      return fallbackContent;
    }
  }
}

/**
 * Generate fallback HTML when LLM pipeline fails
 * @param {Document} originalDOM - The original DOM object
 * @returns {string} Fallback HTML content
 */
function generateFallbackHTML(originalDOM, intent, old_html) {
  // Extract some basic info from the original DOM for context
  const originalTitle = extractTitleFromDOM(originalDOM);
  const originalDomain = window.location.hostname;


  console.log('old_html', old_html);
  console.log('intent', intent);
  
  return `
     `
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generated UI - ${originalTitle}</title>
      </head>
      <body>
        <div>
          <div>
            <span>Generated UI - ${originalTitle}</span>
          </div>
          <div>
            <div>
              Ready | ${new Date().toLocaleString()} | Generated from: ${originalDomain}
            </div>
            <p>LLM processing unavailable. Using fallback interface.</p>
          </div>
        </div>
      </body>
      </html>
    `;
}

/**
 * Wraps the generated HTML with layout constraints for side-by-side view
 * Injects the retro CSS into the generated HTML
 * 
 * @param {string} generatedHTML - Clean HTML from LLM or generatePageHTML
 * @returns {string} HTML wrapped with side-by-side layout styling
 */
function wrapForSideBySide(generatedHTML) {
  // Inject retro CSS into the HTML head
  const htmlWithCSS = generatedHTML.replace(
    '</head>',
    `</head>`
  );
  
  return `
    <div class="generated-content-wrapper" style="
      width: 100%;
      height: 100vh;
      overflow-y: auto;
      box-sizing: border-box;
    ">
      <iframe 
        style="
          width: 100%;
          height: 100%;
          border: none;
          background: #c0c0c0;
        "
        srcdoc="${htmlWithCSS.replace(/"/g, '&quot;')}"
      ></iframe>
    </div>
  `;
}


/**
 * Extracts the title from DOM object
 * 
 * @param {Document} dom - DOM object to extract title from
 * @returns {string} Extracted title or fallback text
 */
function extractTitleFromDOM(dom) {
  try {
    // Try to get title from DOM object
    const titleElement = dom.querySelector('title');
    if (titleElement && titleElement.textContent) {
      return titleElement.textContent.trim();
    }
    
    // Fallback: try to get current document title
    if (document.title) {
      return document.title;
    }
    
    return "Untitled Page";
  } catch (error) {
    return "Untitled Page";
  }
}

/**
 * Gets the original DOM object of the page
 * 
 * @returns {Document} The original DOM object
 */
function getOriginalDOM() {
  try {
    // Clone the document to avoid modifying the original
    return document.cloneNode(true);
  } catch (error) {
    console.warn('Could not clone original DOM:', error);
    // Fallback: return the actual document (be careful with modifications)
    return document;
  }
}

// Export functions for use in content script
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    generatePageHTML,
    wrapForSideBySide,
    extractTitleFromDOM,
    getOriginalDOM,
    clearContentCache
  };
} else {
  // Browser environment - attach to window
  window.HTMLGenerator = {
    generatePageHTML,
    wrapForSideBySide,
    extractTitleFromDOM,
    getOriginalDOM,
    clearContentCache
  };
}
