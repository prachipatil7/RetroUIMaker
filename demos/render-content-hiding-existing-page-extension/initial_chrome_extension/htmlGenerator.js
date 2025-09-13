/**
 * HTML Generator for Chrome Extension
 * 
 * This module generates HTML content that will be displayed when the extension
 * is toggled on. Currently returns a static "Hello World" page, but is designed
 * to be easily replaced with LLM-generated content in the future.
 */

/**
 * Generates HTML content based on the original DOM
 * 
 * @param {string} originalHTML - The original HTML content of the page
 * @returns {string} Complete HTML string with inline CSS
 */
function generateOverlayHTML(originalHTML) {
  // For now, we'll create a static hello world page
  // Later this can be replaced with LLM-generated content based on originalHTML
  
  // Extract some basic info from the original HTML for context
  const originalTitle = extractTitle(originalHTML);
  const originalDomain = window.location.hostname;
  
  return `
    <div style="
      min-height: 100vh;
      width: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 15px;
      box-sizing: border-box;
      overflow-y: auto;
    ">
      <div style="
        text-align: center;
        color: white;
        background-color: rgba(255, 255, 255, 0.1);
        padding: 30px 20px;
        border-radius: 15px;
        backdrop-filter: blur(15px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        max-width: 100%;
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.2);
        margin-top: 60px;
      ">
        <h1 style="
          font-size: 2.5rem;
          margin: 0 0 20px 0;
          font-weight: 700;
          text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
          background: linear-gradient(45deg, #ffffff, #f0f0f0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        ">
          Generated UI
        </h1>
        
        <div style="
          background-color: rgba(255, 255, 255, 0.1);
          padding: 25px;
          border-radius: 12px;
          margin: 30px 0;
          border-left: 4px solid rgba(255, 255, 255, 0.3);
        ">
          <h3 style="
            font-size: 1.4rem;
            margin: 0 0 15px 0;
            color: #f0f0f0;
            font-weight: 600;
          ">
            Original Page Context
          </h3>
          <p style="
            font-size: 1.1rem;
            line-height: 1.6;
            margin: 10px 0;
            color: #e0e0e0;
          ">
            <strong>Domain:</strong> ${originalDomain}
          </p>
          <p style="
            font-size: 1.1rem;
            line-height: 1.6;
            margin: 10px 0;
            color: #e0e0e0;
          ">
            <strong>Original Title:</strong> ${originalTitle}
          </p>
        </div>
        
        <p style="
          font-size: 1.2rem;
          line-height: 1.7;
          margin: 20px 0;
          color: #f5f5f5;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
        ">
          This is the generated UI displayed side-by-side with the original content.
        </p>
        
        <p style="
          font-size: 1rem;
          line-height: 1.5;
          margin: 15px 0;
          color: #e0e0e0;
          font-style: italic;
        ">
          Compare the original (left) with the generated content (right).
        </p>
        
        <div style="
          margin-top: 40px;
          padding: 20px;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          border: 1px dashed rgba(255, 255, 255, 0.2);
        ">
          <p style="
            font-size: 0.95rem;
            color: #cccccc;
            margin: 0;
            line-height: 1.5;
          ">
            🚀 <strong>Future Enhancement:</strong> This static content will be replaced with AI-generated HTML based on the original page content.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Extracts the title from HTML content
 * 
 * @param {string} html - HTML content to extract title from
 * @returns {string} Extracted title or fallback text
 */
function extractTitle(html) {
  try {
    // Try to extract title from the original HTML
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
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
 * Gets the original HTML content of the page
 * 
 * @returns {string} The original HTML content
 */
function getOriginalHTML() {
  try {
    // Return the full document HTML
    return document.documentElement.outerHTML;
  } catch (error) {
    console.warn('Could not extract original HTML:', error);
    return document.body.innerHTML || "";
  }
}

// Export functions for use in content script
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    generateOverlayHTML,
    extractTitle,
    getOriginalHTML
  };
} else {
  // Browser environment - attach to window
  window.HTMLGenerator = {
    generateOverlayHTML,
    extractTitle,
    getOriginalHTML
  };
}
