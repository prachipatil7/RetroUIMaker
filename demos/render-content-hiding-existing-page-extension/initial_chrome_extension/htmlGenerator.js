/**
 * HTML Generator for Chrome Extension
 * 
 * This module generates HTML content that will be displayed when the extension
 * is toggled on. Currently returns a static "Hello World" page, but is designed
 * to be easily replaced with LLM-generated content in the future.
 */

/**
 * Generates HTML content based on the original DOM
 * This function will be replaced with LLM-generated content
 * 
 * @param {Document} originalDOM - The original DOM object of the page
 * @param {string} intent - The intent or purpose for the generated UI
 * @param {string} old_html - Previous HTML version for comparison/iteration
 * @returns {string} Clean HTML content without layout constraints
 */
function generatePageHTML(originalDOM, intent, old_html) {
  // For now, we'll create a static hello world page
  // Later this can be replaced with LLM-generated content based on originalDOM
  
  // Extract some basic info from the original DOM for context
  const originalTitle = extractTitleFromDOM(originalDOM);
  const originalDomain = window.location.hostname;
  
  // LLM will generate clean HTML using retro classes - no inline styles
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
          <span>Generated Retro UI - ${originalTitle}</span>
          <div>
            <button class="retro-button" style="font-size: 10px; padding: 0 4px;">_</button>
            <button class="retro-button" style="font-size: 10px; padding: 0 4px;">□</button>
            <button class="retro-button" style="font-size: 10px; padding: 0 4px;">×</button>
          </div>
        </div>
        
        <div class="retro-window-content">
          <div class="retro-menubar">
            <span class="retro-menu-item">File</span>
            <span class="retro-menu-item">Edit</span>
            <span class="retro-menu-item">View</span>
            <span class="retro-menu-item">Help</span>
          </div>
          
          <div class="retro-toolbar">
            <div class="retro-toolbar-button">📁</div>
            <div class="retro-toolbar-button">💾</div>
            <div class="retro-toolbar-separator"></div>
            <div class="retro-toolbar-button">✂️</div>
            <div class="retro-toolbar-button">📋</div>
            <div class="retro-toolbar-button">📄</div>
          </div>
          
          <h1 class="retro-title">Original Page Analysis</h1>
          
          <div class="retro-groupbox">
            <div class="retro-groupbox-title">Page Information</div>
            <div class="retro-form-row">
              <label class="retro-form-label retro-label">Domain:</label>
              <input type="text" class="retro-input retro-form-input" value="${originalDomain}" readonly>
            </div>
            <div class="retro-form-row">
              <label class="retro-form-label retro-label">Title:</label>
              <input type="text" class="retro-input retro-form-input" value="${originalTitle}" readonly>
            </div>
          </div>
          
          <div class="retro-panel">
            <h2 class="retro-subtitle">Generated Content</h2>
            <p class="retro-text">
              This is a retro-styled interface generated from the original webpage content.
              The LLM will create similar interfaces using the retro CSS classes.
            </p>
            
            <div class="retro-form-row">
              <button class="retro-button">Regenerate</button>
              <button class="retro-button">Export</button>
              <button class="retro-button retro-disabled" disabled>Advanced</button>
            </div>
          </div>
          
          <div class="retro-groupbox">
            <div class="retro-groupbox-title">Sample Controls</div>
            <div class="retro-form-row">
              <input type="checkbox" class="retro-checkbox" id="sample1">
              <label for="sample1" class="retro-label">Enable retro mode</label>
            </div>
            <div class="retro-form-row">
              <input type="radio" class="retro-radio" name="style" id="win95">
              <label for="win95" class="retro-label">Windows 95</label>
              <input type="radio" class="retro-radio" name="style" id="win98" checked>
              <label for="win98" class="retro-label">Windows 98</label>
            </div>
            <div class="retro-form-row">
              <label class="retro-form-label retro-label">Theme:</label>
              <select class="retro-select retro-form-input">
                <option>Classic Gray</option>
                <option>High Contrast</option>
                <option>Desert</option>
              </select>
            </div>
          </div>
          
          <div class="retro-progressbar">
            <div class="retro-progressbar-fill" style="width: 75%;"></div>
          </div>
          <p class="retro-text" style="margin-top: 4px;">Processing: 75% complete</p>
        </div>
      </div>
      
      <div class="retro-statusbar">
        Ready | ${new Date().toLocaleString()} | Generated from: ${originalDomain}
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
