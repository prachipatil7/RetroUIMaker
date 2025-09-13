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
  <link rel="stylesheet" href="${chrome.runtime.getURL('retro-theme.css')}">
</head>
<body class="retro-body">
  <div class="retro-window">
    <div class="retro-titlebar">
      <span class="retro-titlebar-text">Retro Application</span>
    </div>
    
    <div class="retro-window-content">
      <h1 class="retro-title">Welcome to Retro UI</h1>
      
      <div class="retro-panel">
        <p class="retro-text">This is a simple retro-styled interface. Enter some text below:</p>
        
        <div class="retro-form-row">
          <label class="retro-label" for="sample-input">Input:</label>
          <input type="text" id="sample-input" class="retro-input" placeholder="Type something here...">
        </div>
        
        <div class="retro-form-row">
          <button class="retro-button">Submit</button>
          <button class="retro-button">Cancel</button>
        </div>
      </div>
    </div>
    
    <div class="retro-statusbar">
      <span>Ready</span>
    </div>
  </div>
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
      }

      this.refreshContent();
      // this.generateContent();
    });
  }

  clickElement(selector) {
    try {
      if (this.originalIframe && this.originalIframe.contentDocument) {
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
        // If the iframe is currently visible, reload it to show updates
        if (this.originalIframe && !this.originalIframe.classList.contains('hidden')) {
          // Force reload by adding a timestamp parameter
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('_refresh', Date.now().toString());
          this.originalIframe.src = currentUrl.toString();
          
          console.log('Successfully refreshed iframe to show updated state');
        } else {
          console.log('Iframe not visible, no refresh needed');
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