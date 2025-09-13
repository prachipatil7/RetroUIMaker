class DOMToggleExtension {
  constructor() {
    this.currentMode = 'normal'; // 'normal', 'side-by-side', 'overlay'
    this.originalElements = [];
    this.originalPageHTML = '';
    this.originalIframe = null;
    this.generatedContentDiv = null;
    this.sideBarContainer = null;
    this.generatedHtml = this.getInitialHtml(); // Store initial HTML for patching
    this.currentIntent = 'I want to look through my past orders on amazon'; // Store current user intent with default
    this.init();
  }

  init() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupExtension());
    } else {
      this.setupExtension();
    }
  }

  getInitialHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Retro UI</title>
    <style>
    .body {
      margin: 0;
      padding: 0;
    }
            /* Retro CSS - Be deliberate about the styling
         Use a Nintendo/Tetris/Mario color palette:
         Use the retro-theme.css file for the retro css classes
         Main Component Classes
.retro-body
.retro-window
.retro-window-header
.retro-window-content
Form Elements
.retro-button
.retro-input
.retro-textarea
.retro-label
.retro-checkbox
.retro-radio
.retro-select
Layout Components
.retro-panel
.retro-groupbox
.retro-groupbox-title
.retro-listbox
.retro-list-item
.retro-table
.retro-toolbar
.retro-toolbar-button
.retro-toolbar-separator
.retro-statusbar
.retro-menubar
.retro-menu-item
.retro-progressbar
.retro-progressbar-fill
.retro-dialog
.retro-dialog-buttons
Typography
.retro-title
.retro-subtitle
.retro-text
Icons
.retro-icon
.retro-icon-large
Form Layout
.retro-form-row
.retro-form-label
.retro-form-input
Scrollbar Styling
.retro-scrollbar
.retro-scrollbar::-webkit-scrollbar
.retro-scrollbar::-webkit-scrollbar-track
.retro-scrollbar::-webkit-scrollbar-thumb
.retro-scrollbar::-webkit-scrollbar-corner
State Classes
.retro-disabled
.retro-selected
.retro-focused
Pseudo-classes and Modifiers
.retro-button:hover
.retro-button:active
.retro-button:disabled
.retro-input:focus
.retro-list-item:hover
.retro-list-item.selected
.retro-table th
.retro-table td
.retro-table tr:nth-child(even) td
.retro-toolbar-button:hover
.retro-toolbar-button:active
.retro-menu-item:hover
      */
  </style>
  
</head>
<body>
</body>
</html>`;
  }

  async setupExtension() {
    this.captureOriginalPageHTML();
    this.markOriginalContent();
    this.createSideBarContainer();
    this.createOriginalIframe();
    await this.createGeneratedContentDiv();
    this.setupMessageListener();
  }

  captureOriginalPageHTML() {
    // Capture the complete HTML of the original page before any modifications
    this.originalPageHTML = document.documentElement.outerHTML;
  }

  markOriginalContent() {
    // Mark all existing content for mode switching
    // Get all direct children of body (except our extension elements)
    this.originalElements = Array.from(document.body.children).filter(
      child => child.id !== 'side-by-side-container' &&
               child.id !== 'generated-content-overlay' &&
               child.id !== 'original-content-iframe'
    );
    
    // Add our class to each original element for styling control
    this.originalElements.forEach(element => {
      element.classList.add('original-content-element');
    });
  }

  createSideBarContainer() {
    this.sideBarContainer = document.createElement('div');
    this.sideBarContainer.id = 'side-by-side-container';
    this.sideBarContainer.className = 'side-by-side-container hidden';
    document.body.appendChild(this.sideBarContainer);
  }

  createOriginalIframe() {
    this.originalIframe = document.createElement('iframe');
    if (!this.originalIframe) {
      console.error('Failed to create iframe element');
      return;
    }
    
    this.originalIframe.id = 'original-content-iframe';
    this.originalIframe.className = 'original-content-iframe hidden';
    this.originalIframe.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 50vw;
      height: 100vh;
      border: none;
      z-index: 9998;
      border-right: 2px solid #333;
      box-shadow: 5px 0 15px rgba(0, 0, 0, 0.2);
    `;
    
    // Add error handling for iframe
    this.originalIframe.onload = function() {
      console.log('Original iframe loaded successfully');
    };
    
    this.originalIframe.onerror = function(error) {
      console.error('Original iframe failed to load:', error);
    };
    
    document.body.appendChild(this.originalIframe);
  }

  async createGeneratedContentDiv() {
    this.generatedContentDiv = document.createElement('div');
    this.generatedContentDiv.id = 'generated-content-overlay';
    this.generatedContentDiv.className = 'generated-content-overlay hidden';
    
    // Don't generate content here - only when mode buttons are clicked
    // Content will be generated when user clicks side-by-side or overlay buttons
    
    document.body.appendChild(this.generatedContentDiv);
  }

  setupMessageListener() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'setMode') {
        if (request.intent !== undefined) {
          this.currentIntent = request.intent;
        }
        this.setMode(request.mode);
        sendResponse({ success: true, mode: this.currentMode });
      } else if (request.action === 'getCurrentMode') {
        sendResponse({ mode: this.currentMode });
      } else if (request.action === 'setIntent') {
        this.setIntent(request.intent);
        sendResponse({ success: true, intent: this.currentIntent });
      } else if (request.action === 'regenerateContent') {
        this.generateContent();
        sendResponse({ success: true });
      }

      return true; // Indicates we will send a response asynchronously
    });

    // Listen for messages from generated content iframe
    window.addEventListener('message', (event) => {
      if (event.data.type === 'CLICK_ELEMENT') {
        this.clickElement(event.data.selector);
      } else if (event.data.type === 'CHANGE_ELEMENT') {
        this.changeElement(event.data.selector, event.data.value);
      }

      this.refreshContent();
      // this.generateContent();
    });
  }

  clickElement(selector) {
    try {
      if (this.originalIframe && 
          this.originalIframe.contentDocument && 
          typeof this.originalIframe.contentDocument.querySelector === 'function') {
        // Try to find and click the element in the original iframe
        const element = this.originalIframe.contentDocument.querySelector(selector);
        if (element) {
          console.log('Clicking element in original iframe:', selector);
          element.click();
        } else {
          console.warn('Element not found in original iframe:', selector);
          // Fallback: try to click in the main document
          const mainElement = document.querySelector(selector);
          if (mainElement) {
            console.log('Clicking element in main document:', selector);
            mainElement.click();
          } else {
            console.warn('Element not found in main document either:', selector);
          }
        }
      } else {
        console.warn('Original iframe not available, trying main document');
        // Fallback: try to click in the main document
        const mainElement = document.querySelector(selector);
        if (mainElement) {
          console.log('Clicking element in main document:', selector);
          mainElement.click();
        } else {
          console.warn('Element not found:', selector);
        }
      }
    } catch (error) {
      console.error('Error clicking element:', error);
    }
  }

  changeElement(selector, value) {
    try {
      if (this.originalIframe && 
          this.originalIframe.contentDocument && 
          typeof this.originalIframe.contentDocument.querySelector === 'function') {
        // Try to find and update the element in the original iframe
        const element = this.originalIframe.contentDocument.querySelector(selector);
        if (element) {
          console.log('Updating element in original iframe:', selector, 'with value:', value);
          element.value = value;
          // Trigger change event to notify other scripts
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          console.warn('Element not found in original iframe:', selector);
          // Fallback: try to update in the main document
          const mainElement = document.querySelector(selector);
          if (mainElement) {
            console.log('Updating element in main document:', selector, 'with value:', value);
            mainElement.value = value;
            mainElement.dispatchEvent(new Event('change', { bubbles: true }));
            mainElement.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            console.warn('Element not found in main document either:', selector);
          }
        }
      } else {
        console.warn('Original iframe not available, trying main document');
        // Fallback: try to update in the main document
        const mainElement = document.querySelector(selector);
        if (mainElement) {
          console.log('Updating element in main document:', selector, 'with value:', value);
          mainElement.value = value;
          mainElement.dispatchEvent(new Event('change', { bubbles: true }));
          mainElement.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          console.warn('Element not found:', selector);
        }
      }
    } catch (error) {
      console.error('Error updating element:', error);
    }
  }

  async setMode(mode) {
    console.log('🔄 setMode called with mode:', mode, 'current mode:', this.currentMode);
    
    // Prevent duplicate mode switches
    if (this.currentMode === mode) {
      console.log('⚠️ Already in mode:', mode, 'skipping duplicate call');
      return;
    }
    
    // Reset current state first
    this.setNormalMode();
    
    // Set new mode
    this.currentMode = mode;
    
    switch (mode) {
      case 'side-by-side':
        await this.setSideBySideMode();
        break;
      case 'overlay':
        await this.setOverlayMode();
        break;
      case 'normal':
      default:
        this.setNormalMode();
        break;
    }
  }

  async setSideBySideMode() {
    console.log('🔄 setSideBySideMode called');
    this.currentMode = 'side-by-side';
    
    // Generate content first
    await this.generateContent();
    
    // Hide original content and show in iframe
    this.originalElements.forEach(element => {
      element.classList.add('hidden-by-extension');
    });
    
    // Set original HTML in iframe
    this.originalIframe.srcdoc = this.originalPageHTML;
    this.originalIframe.classList.remove('hidden');
    
    // Show generated content on the right
    this.generatedContentDiv.classList.remove('hidden');
    this.generatedContentDiv.classList.add('side-by-side-mode');
    this.sideBarContainer.classList.remove('hidden');
    
    // Add side-by-side class to body for global styling
    document.body.classList.add('side-by-side-active');
  }

  async setOverlayMode() {
    console.log('🔄 setOverlayMode called');
    this.currentMode = 'overlay';
    
    // Generate content first
    await this.generateContent();
    
    // Hide original content completely
    this.originalElements.forEach(element => {
      element.classList.add('hidden-by-extension');
    });
    
    // Show generated content as full overlay
    this.generatedContentDiv.classList.remove('hidden');
    this.generatedContentDiv.classList.add('overlay-mode');
    
    // Add overlay class to body for global styling
    document.body.classList.add('overlay-active');
  }

  setNormalMode() {
    this.currentMode = 'normal';
    
    // Show all original elements
    this.originalElements.forEach(element => {
      element.classList.remove('hidden-by-extension');
    });
    
    // Hide extension content
    this.generatedContentDiv.classList.add('hidden');
    this.generatedContentDiv.classList.remove('side-by-side-mode', 'overlay-mode');
    this.sideBarContainer.classList.add('hidden');
    this.originalIframe.classList.add('hidden');
    
    // Remove all body classes
    document.body.classList.remove('side-by-side-active', 'overlay-active');
  }

  async generateContent() {
    console.log('🎯 generateContent called with intent:', this.currentIntent, 'mode:', this.currentMode);
    
    if (!this.generatedContentDiv) {
      console.warn('Generated content div not available');
      return;
    }

    try {
      // Get the original DOM object
      const originalDOM = window.HTMLGenerator.getOriginalDOM();
      
      // Generate new HTML using current intent (always against base template)
      this.generatedHtml = await window.HTMLGenerator.generatePageHTML(originalDOM, this.currentIntent, '');
      
      // Wrap it for side-by-side display
      const wrappedHTML = window.HTMLGenerator.wrapForSideBySide(this.generatedHtml);
      
      // Update the content
      this.generatedContentDiv.innerHTML = wrappedHTML;
      
      console.log('Content generated with intent:', this.currentIntent);
    } catch (error) {
      console.error('Error generating content:', error);
    }
  }

  /**
   * Set user intent for content generation
   * @param {string} intent - User intent
   */
  setIntent(intent) {
    this.currentIntent = intent || '';
    console.log('Intent set to:', this.currentIntent);
  }

  /**
   * Refresh the original iframe content with current page state
   */
  refreshContent() {
    console.log('Refreshing iframe to show updated state...');
    
    // Give the original action time to complete
    setTimeout(() => {
      try {
        // Check if iframe exists and is currently visible
        if (this.originalIframe && 
            typeof this.originalIframe.classList !== 'undefined' && 
            !this.originalIframe.classList.contains('hidden')) {
          // Force reload by adding a timestamp parameter
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('_refresh', Date.now().toString());
          
          // Ensure iframe is not null before setting src
          if (this.originalIframe) {
            this.originalIframe.src = currentUrl.toString();
            console.log('Successfully refreshed iframe to show updated state');
          } else {
            console.warn('Iframe became null during refresh');
          }
        } else {
          console.log('Iframe not visible or not available, no refresh needed');
        }
      } catch (error) {
        console.error('Error refreshing iframe:', error);
      }
    }, 500); // Wait 500ms for the original action to complete
  }
  /**
   * Regenerate content with current intent
   */
  async regenerateContent() {
    if (!this.generatedContentDiv) {
      console.warn('Generated content div not available');
      return;
    }

    try {
      // Get the original DOM object
      const originalDOM = window.HTMLGenerator.getOriginalDOM();
      
      // Generate new HTML using current intent (always against base template)
      this.generatedHtml = await window.HTMLGenerator.generatePageHTML(originalDOM, this.currentIntent, '');
      
      // Wrap it for side-by-side display
      const wrappedHTML = window.HTMLGenerator.wrapForSideBySide(this.generatedHtml);
      
      // Update the content
      this.generatedContentDiv.innerHTML = wrappedHTML;
      
      console.log('Content regenerated with intent:', this.currentIntent);
    } catch (error) {
      console.error('Error regenerating content:', error);
    }
  }
}

// Initialize the extension when the script loads
const domToggleExtension = new DOMToggleExtension();