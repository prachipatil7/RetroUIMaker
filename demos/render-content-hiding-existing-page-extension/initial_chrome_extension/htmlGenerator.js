/**
 * HTML Generator for Chrome Extension
 * 
 * This module generates HTML content that will be displayed when the extension
 * is toggled on. Currently returns a static "Hello World" page, but is designed
 * to be easily replaced with LLM-generated content in the future.
 */

/**
 * Generates HTML content based on the original DOM using LLM-driven filtering and patching
 * 
 * @param {Document} originalDOM - The original DOM object of the page
 * @param {string} intent - The intent or purpose for the generated UI
 * @param {string} old_html - Previous HTML version for comparison/iteration
 * @returns {Promise<string>} Clean HTML content without layout constraints
 */
async function generatePageHTML(originalDOM, intent, old_html) {
  try {
    // Check if LLMPatch is available
    if (!window.LLMPatch) {
      console.warn('LLMPatch not available, falling back to static content');
      return generateFallbackHTML(originalDOM);
    }

    // Stage 1: Select relevant DOM elements based on intent
    const { filteredDomJson } = await window.LLMPatch.selectRelevantDomElements(originalDOM, intent || '');
    console.log('Filtered DOM JSON:', filteredDomJson);
    // Stage 2: Create and apply HTML patch
    const patch = await window.LLMPatch.createHtmlPatchFromSelection({ 
      selectedDom: filteredDomJson, 
      oldHtml: old_html || '', 
      intent: intent || '' 
    });
    
    console.log('Patch:', patch);
    // Apply the patch to get updated HTML
    const updatedHtml = window.LLMPatch.applyHtmlPatch(old_html || '', patch);
    console.log('Updated HTML:', updatedHtml);
    return updatedHtml;
  } catch (error) {
    console.error('Error in LLM pipeline, falling back to static content:', error);
    
    // If we have old_html, try to return it as-is to maintain state
    if (old_html && old_html.trim() !== '') {
      console.log('Returning existing HTML due to LLM error');
      return old_html;
    }
    
    return generateFallbackHTML(originalDOM);
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
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Generated UI - ${originalTitle}</title>
    </head>
    <body class="retro-body">
      <div class="retro-window">
        <div class="retro-window-header">
          <span>Generated UI - ${originalTitle}</span>
        </div>
        <div class="retro-window-content">
          <div class="retro-statusbar">
            Ready | ${new Date().toLocaleString()} | Generated from: ${originalDomain}
          </div>
          <p class="retro-text">LLM processing unavailable. Using fallback interface.</p>
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
    `<link rel="stylesheet" href="${chrome.runtime.getURL('retro-theme.css')}"></head>`
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
    getOriginalDOM
  };
} else {
  // Browser environment - attach to window
  window.HTMLGenerator = {
    generatePageHTML,
    wrapForSideBySide,
    extractTitleFromDOM,
    getOriginalDOM
  };
}
