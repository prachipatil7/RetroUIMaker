/**
 * HTML Generator for Chrome Extension
 * 
 * This module generates HTML content that will be displayed when the extension
 * is toggled on. Currently returns a static "Hello World" page, but is designed
 * to be easily replaced with LLM-generated content in the future.
 */

// Mock step counter for cycling through different mock versions
const MOCK_AMAZON_PURCHASE_INTENT = "I want to buy a pink backpack for children";
let mockStep = 1;

/**
 * Get current mock step
 */
function getCurrentMockStep() {
  return mockStep;
}

/**
 * Increment mock step (for cycling through different mocks)
 */
function incrementMockStep() {
  mockStep++;
  console.log('Mock step incremented to:', mockStep);
  return mockStep;
}

/**
 * Reset mock step to 1
 */
function resetMockStep() {
  mockStep = 1;
  console.log('Mock step reset to:', mockStep);
  return mockStep;
}

/**
 * Load mock HTML file based on current step
 * @param {number} step - The mock step number
 * @returns {Promise<string>} The HTML content from the mock file
 */
async function loadMockHTML(intent, step = mockStep) {
  try {
    const mockFileName = intent === MOCK_AMAZON_PURCHASE_INTENT ? `mock_amazon_purchase${step}.html` : `mock_amazon${step}.html`;
    const mockUrl = chrome.runtime.getURL(`mocks/${mockFileName}`);
    console.log(`🎭 Loading mock file: ${mockFileName}`);
    
    const response = await fetch(mockUrl);
    if (!response.ok) {
      throw new Error(`Failed to load ${mockFileName}: ${response.status}`);
    }
    
    const htmlContent = await response.text();
    console.log(`✅ Successfully loaded ${mockFileName}`);
    return htmlContent;
  } catch (error) {
    console.error(`❌ Error loading mock file for step ${step}:`, error);
    // Fallback to step 1 if current step fails
    if (step !== 1) {
      console.log('🔄 Falling back to mock_amazon1.html');
      return loadMockHTML(1);
    }
    throw error;
  }
}

/**
 * Generates HTML content by loading appropriate mock file
 * 
 * @param {Document} originalDOM - The original DOM object of the page
 * @param {string} intent - The intent or purpose for the generated UI
 * @param {string} old_html - Previous HTML version for comparison/iteration
 * @returns {Promise<string>} Clean HTML content from mock file
 */
async function generatePageHTML(originalDOM, intent, old_html) {
  console.log('generatePageHTML called with intent:', intent, 'mock step:', mockStep);
  
  try {
    // Load the appropriate mock HTML file
    const mockHTML = await loadMockHTML(intent, mockStep);
    
    return mockHTML;
  } catch (error) {
    console.error('Error loading mock HTML, falling back to static content:', error);
    return generateFallbackHTML(originalDOM, intent, old_html);
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
    getOriginalDOM,
    loadMockHTML,
    getCurrentMockStep,
    incrementMockStep,
    resetMockStep
  };
} else {
  // Browser environment - attach to window
  window.HTMLGenerator = {
    generatePageHTML,
    wrapForSideBySide,
    extractTitleFromDOM,
    getOriginalDOM,
    loadMockHTML,
    getCurrentMockStep,
    incrementMockStep,
    resetMockStep
  };
}
