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
 * @returns {string} Clean HTML content without layout constraints
 */
function generatePageHTML(originalDOM) {
  // For now, we'll create a static hello world page
  // Later this can be replaced with LLM-generated content based on originalDOM
  
  // Extract some basic info from the original DOM for context
  const originalTitle = extractTitleFromDOM(originalDOM);
  const originalDomain = window.location.hostname;
  
  // Detect all links on the current page
  const pageLinks = detectPageLinks();
  const linksListHTML = generateRetroLinksList(pageLinks);
  
  // Detect all inputs on the current page
  const pageInputs = detectPageInputs();
  const inputsListHTML = generateRetroInputsSection(pageInputs);
  
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
          
          ${linksListHTML}
          
          ${inputsListHTML}
          
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
      
      <script>
        // Handle link clicks with proper navigation
        document.addEventListener('DOMContentLoaded', function() {
          const linksContainer = document.querySelector('.retro-links-container');
          if (linksContainer) {
            linksContainer.addEventListener('click', function(event) {
              const linkItem = event.target.closest('.retro-link-item');
              if (linkItem) {
                event.preventDefault();
                
                const href = linkItem.getAttribute('data-href');
                const target = linkItem.getAttribute('data-target');
                const linkType = linkItem.getAttribute('data-link-type');
                
                if (href) {
                  try {
                    // Handle different types of links based on linkType
                    switch (linkType) {
                      case 'mailto':
                      case 'tel':
                        // For mailto and tel links, trigger system default handler
                        if (window.parent && window.parent !== window) {
                          window.parent.postMessage({
                            type: 'openLink',
                            href: href,
                            target: '_self',
                            linkType: linkType
                          }, '*');
                        } else {
                          window.location.href = href;
                        }
                        break;
                        
                      case 'external':
                        // For external links, always open in new tab/window
                        if (window.parent && window.parent !== window) {
                          window.parent.postMessage({
                            type: 'openLink',
                            href: href,
                            target: '_blank',
                            linkType: linkType
                          }, '*');
                        } else {
                          window.open(href, '_blank');
                        }
                        break;
                        
                      case 'anchor':
                        // For anchor links, scroll to the section in the parent page
                        if (window.parent && window.parent !== window) {
                          window.parent.postMessage({
                            type: 'openLink',
                            href: href,
                            target: '_self',
                            linkType: linkType
                          }, '*');
                        } else {
                          window.location.href = href;
                        }
                        break;
                        
                      case 'internal':
                      default:
                        // For internal links, navigate in the parent window
                        const finalTarget = target === '_blank' ? '_blank' : '_self';
                        if (window.parent && window.parent !== window) {
                          window.parent.postMessage({
                            type: 'openLink',
                            href: href,
                            target: finalTarget,
                            linkType: linkType
                          }, '*');
                        } else {
                          if (finalTarget === '_blank') {
                            window.open(href, '_blank');
                          } else {
                            window.location.href = href;
                          }
                        }
                        break;
                    }
                  } catch (error) {
                    console.warn('Could not navigate to link:', href, error);
                    // Fallback: try to open in new window
                    if (window.parent && window.parent !== window) {
                      window.parent.postMessage({
                        type: 'openLink',
                        href: href,
                        target: '_blank',
                        linkType: linkType
                      }, '*');
                    } else {
                      window.open(href, '_blank');
                    }
                  }
                }
              }
            });
          }
        });
        
        // Handle input interactions and sync with original page
        const inputsContainer = document.querySelector('.retro-inputs-container');
        if (inputsContainer) {
          // Handle text input changes
          inputsContainer.addEventListener('input', function(event) {
            const inputItem = event.target.closest('.retro-input-item');
            if (inputItem && inputItem.getAttribute('data-input-type') === 'text') {
              const originalName = inputItem.getAttribute('data-original-name');
              const originalId = inputItem.getAttribute('data-original-id');
              const newValue = inputItem.value;
              
              // Send message to parent to sync the original input
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                  type: 'syncInput',
                  inputName: originalName,
                  inputId: originalId,
                  value: newValue,
                  action: 'updateValue'
                }, '*');
              }
            }
          });
          
          // Handle submit button clicks
          inputsContainer.addEventListener('click', function(event) {
            const inputItem = event.target.closest('.retro-input-item');
            if (inputItem && inputItem.getAttribute('data-input-type') === 'submit') {
              const originalName = inputItem.getAttribute('data-original-name');
              const originalId = inputItem.getAttribute('data-original-id');
              
              // Send message to parent to trigger the original submit button
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                  type: 'syncInput',
                  inputName: originalName,
                  inputId: originalId,
                  action: 'click'
                }, '*');
              }
            }
          });
        }
      </script>
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
 * Detects all <a> tags on the current page and extracts their information
 * 
 * @returns {Array} Array of link objects with href, text, title, and target
 */
function detectPageLinks() {
  try {
    const links = [];
    const anchorElements = document.querySelectorAll('a[href]');
    
    anchorElements.forEach((link, index) => {
      const href = link.href;
      const text = link.textContent.trim() || href;
      const title = link.title || '';
      const target = link.target || '';
      
      // Skip empty links or javascript: links
      if (href && !href.startsWith('javascript:')) {
        // Determine link type
        let linkType = 'internal';
        let isExternal = false;
        
        if (href.startsWith('mailto:')) {
          linkType = 'mailto';
        } else if (href.startsWith('tel:')) {
          linkType = 'tel';
        } else if (href.startsWith('http://') || href.startsWith('https://')) {
          isExternal = !href.startsWith(window.location.origin);
          linkType = isExternal ? 'external' : 'internal';
        } else if (href.startsWith('#')) {
          linkType = 'anchor';
        } else if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
          linkType = 'internal';
        }
        
        links.push({
          index: index + 1,
          href: href,
          text: text,
          title: title,
          target: target,
          linkType: linkType,
          isExternal: isExternal
        });
      }
    });
    
    return links;
  } catch (error) {
    console.warn('Could not detect page links:', error);
    return [];
  }
}

/**
 * Generates HTML for a retro-styled list of links
 * 
 * @param {Array} links - Array of link objects from detectPageLinks
 * @returns {string} HTML string for the retro link list
 */
function generateRetroLinksList(links) {
  if (!links || links.length === 0) {
    return `
      <div class="retro-groupbox">
        <div class="retro-groupbox-title">Page Links</div>
        <p class="retro-text">No links detected on this page.</p>
      </div>
    `;
  }
  
  const linkItems = links.map(link => {
    // Choose icon based on link type
    let icon = '';
    switch (link.linkType) {
      case 'external':
        icon = ' 🌐';
        break;
      case 'mailto':
        icon = ' ✉️';
        break;
      case 'tel':
        icon = ' 📞';
        break;
      case 'anchor':
        icon = ' #️⃣';
        break;
      case 'internal':
        icon = ' 📄';
        break;
      default:
        icon = '';
    }
    
    const targetInfo = link.target === '_blank' ? ' (opens in new window)' : '';
    const titleInfo = link.title ? ` - ${link.title}` : '';
    const typeInfo = ` [${link.linkType}]`;
    
    // Escape quotes and handle different link types
    const escapedHref = link.href.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedTarget = (link.target || (link.linkType === 'external' ? '_blank' : '_self')).replace(/'/g, "\\'");
    
    return `
      <div class="retro-list-item" style="display: flex; align-items: center; padding: 4px; border-bottom: 1px solid #e0e0e0;">
        <span style="min-width: 30px; color: #808080; font-size: 10px;">${link.index}.</span>
        <div style="flex: 1;">
          <div class="retro-link-item" 
               data-href="${escapedHref}" 
               data-target="${escapedTarget}"
               data-link-type="${link.linkType}"
               style="font-weight: bold; color: #0000ff; cursor: pointer; text-decoration: underline;" 
               title="Click to open: ${link.href}">
            ${link.text}${icon}
          </div>
          <div style="font-size: 10px; color: #808080; margin-top: 2px;">
            ${link.href}${typeInfo}${targetInfo}${titleInfo}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="retro-groupbox">
      <div class="retro-groupbox-title">Page Links (${links.length} found)</div>
      <div class="retro-listbox retro-links-container" style="max-height: 300px; overflow-y: auto;">
        ${linkItems}
      </div>
    </div>
  `;
}

/**
 * Detects input elements (text and submit) on the current page
 * 
 * @returns {Array} Array of input objects with type, value, attributes, and element reference
 */
function detectPageInputs() {
  try {
    const inputs = [];
    const inputElements = document.querySelectorAll('input[type="text"], input[type="submit"]');
    
    inputElements.forEach((input, index) => {
      const inputType = input.type;
      const value = input.value || '';
      const placeholder = input.placeholder || '';
      const name = input.name || '';
      const id = input.id || '';
      const disabled = input.disabled;
      const required = input.required;
      
      // Create unique identifier for syncing
      const uniqueId = `retro-input-${index}`;
      
      inputs.push({
        index: index + 1,
        uniqueId: uniqueId,
        type: inputType,
        value: value,
        placeholder: placeholder,
        name: name,
        id: id,
        disabled: disabled,
        required: required,
        originalElement: input // Store reference to original element
      });
    });
    
    return inputs;
  } catch (error) {
    console.warn('Could not detect page inputs:', error);
    return [];
  }
}

/**
 * Generates HTML for a retro-styled list of inputs
 * 
 * @param {Array} inputs - Array of input objects from detectPageInputs
 * @returns {string} HTML string for the retro inputs section
 */
function generateRetroInputsSection(inputs) {
  if (!inputs || inputs.length === 0) {
    return `
      <div class="retro-groupbox">
        <div class="retro-groupbox-title">Page Inputs</div>
        <p class="retro-text">No text inputs or submit buttons detected on this page.</p>
      </div>
    `;
  }
  
  const inputItems = inputs.map(input => {
    const icon = input.type === 'submit' ? ' 🔘' : ' 📝';
    const requiredIndicator = input.required ? ' *' : '';
    const disabledClass = input.disabled ? ' retro-disabled' : '';
    const disabledAttr = input.disabled ? ' disabled' : '';
    
    if (input.type === 'submit') {
      return `
        <div class="retro-form-row" style="padding: 4px; border-bottom: 1px solid #e0e0e0;">
          <span style="min-width: 30px; color: #808080; font-size: 10px;">${input.index}.</span>
          <div style="flex: 1;">
            <button class="retro-button retro-input-item${disabledClass}" 
                    data-input-id="${input.uniqueId}"
                    data-input-type="${input.type}"
                    data-original-name="${input.name}"
                    data-original-id="${input.id}"
                    ${disabledAttr}>
              ${input.value || 'Submit'}${icon}
            </button>
            <div style="font-size: 10px; color: #808080; margin-top: 2px;">
              Submit Button${input.name ? ` (name: ${input.name})` : ''}${input.id ? ` (id: ${input.id})` : ''}${requiredIndicator}
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="retro-form-row" style="padding: 4px; border-bottom: 1px solid #e0e0e0;">
          <span style="min-width: 30px; color: #808080; font-size: 10px;">${input.index}.</span>
          <div style="flex: 1;">
            <label class="retro-label" style="font-weight: bold;">${input.name || input.id || `Input ${input.index}`}${icon}${requiredIndicator}</label>
            <input type="text" 
                   class="retro-input retro-input-item${disabledClass}" 
                   data-input-id="${input.uniqueId}"
                   data-input-type="${input.type}"
                   data-original-name="${input.name}"
                   data-original-id="${input.id}"
                   value="${input.value}"
                   placeholder="${input.placeholder}"
                   ${disabledAttr}>
            <div style="font-size: 10px; color: #808080; margin-top: 2px;">
              Text Input${input.name ? ` (name: ${input.name})` : ''}${input.id ? ` (id: ${input.id})` : ''}${input.placeholder ? ` - ${input.placeholder}` : ''}
            </div>
          </div>
        </div>
      `;
    }
  }).join('');
  
  return `
    <div class="retro-groupbox">
      <div class="retro-groupbox-title">Page Inputs (${inputs.length} found)</div>
      <div class="retro-inputs-container" style="max-height: 250px; overflow-y: auto;">
        ${inputItems}
      </div>
    </div>
  `;
}

/**
 * Gets the original HTML content of the page
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
    getOriginalDOM,
    detectPageLinks,
    generateRetroLinksList,
    detectPageInputs,
    generateRetroInputsSection
  };
}
