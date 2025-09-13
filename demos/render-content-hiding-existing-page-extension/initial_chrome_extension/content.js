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
    this.urlSyncEnabled = false; // Track if URL sync is active
    this.urlCheckInterval = null; // Store interval ID for URL checking
    this.iframeUrlCheckInterval = null; // Store interval ID for iframe URL checking
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
      } else if (event.data.type === 'CHANGE_ELEMENT') {
        this.changeElement(event.data.selector, event.data.value);
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

  changeElement(selector, value) {
    try {
      if (this.originalIframe && this.originalIframe.contentDocument) {
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
    
    // Sync iframe URL with current page URL and set up URL synchronization
    this.syncIframeUrl();
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
    
    // Disable URL synchronization when iframe is hidden
    this.disableUrlSync();
    
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
   * Sync iframe URL with the main page URL
   */
  syncIframeUrl() {
    if (!this.originalIframe) {
      console.warn('Original iframe not available for URL sync');
      return;
    }

    try {
      // Set iframe src to current page URL
      this.originalIframe.src = window.location.href;
      console.log('🔗 Synced iframe URL to:', window.location.href);
      
      // Enable URL sync monitoring
      this.enableUrlSync();
      
      // Set up iframe load event to handle navigation within iframe
      this.originalIframe.onload = () => {
        console.log('🔄 Iframe loaded, setting up cross-frame communication');
        this.setupIframeNavigation();
      };
      
    } catch (error) {
      console.error('Error syncing iframe URL:', error);
    }
  }

  /**
   * Enable URL synchronization between main page and iframe
   */
  enableUrlSync() {
    if (this.urlSyncEnabled) {
      return; // Already enabled
    }

    this.urlSyncEnabled = true;
    console.log('🔗 Enabling URL synchronization');

    // Monitor URL changes in the main page
    let lastUrl = window.location.href;
    
    // Use both popstate (for back/forward) and periodic checking (for programmatic changes)
    window.addEventListener('popstate', () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.handleMainPageUrlChange();
      }
    });

    // Periodic check for URL changes (handles programmatic navigation)
    this.urlCheckInterval = setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.handleMainPageUrlChange();
      }
    }, 1000);
  }

  /**
   * Disable URL synchronization
   */
  disableUrlSync() {
    if (!this.urlSyncEnabled) {
      return;
    }

    this.urlSyncEnabled = false;
    console.log('🔗 Disabling URL synchronization');

    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
    }

    if (this.iframeUrlCheckInterval) {
      clearInterval(this.iframeUrlCheckInterval);
      this.iframeUrlCheckInterval = null;
    }
  }

  /**
   * Handle URL changes in the main page
   */
  handleMainPageUrlChange() {
    if (!this.originalIframe || this.originalIframe.classList.contains('hidden')) {
      return; // Iframe not visible, no sync needed
    }

    try {
      // Check if this URL change was initiated by iframe navigation
      const currentState = window.history.state;
      if (currentState && currentState.iframeNavigation) {
        console.log('🔄 URL change was initiated by iframe navigation, skipping sync');
        return;
      }

      console.log('🔄 Main page URL changed to:', window.location.href);
      console.log('🔄 Updating iframe URL to match');
      
      // Update iframe to new URL
      this.originalIframe.src = window.location.href;
      
      // Regenerate content for the new URL
      console.log('🎯 Triggering content regeneration for new URL');
      this.regenerateContentForUrlChange();
      
    } catch (error) {
      console.error('Error handling main page URL change:', error);
    }
  }

  /**
   * Set up navigation handling within the iframe
   */
  setupIframeNavigation() {
    let lastIframeUrl = null;

    // Set up iframe load event listener to track URL changes
    this.originalIframe.addEventListener('load', () => {
      try {
        // Get the current iframe URL
        const currentIframeUrl = this.originalIframe.contentWindow.location.href;
        
        // Only update if URL actually changed and it's different from main page
        if (currentIframeUrl !== lastIframeUrl && currentIframeUrl !== window.location.href) {
          console.log('🔄 Iframe navigated to:', currentIframeUrl);
          console.log('🔄 Updating main page URL to match iframe');
          
          // Update the main page URL to match iframe navigation
          this.updateMainPageUrl(currentIframeUrl);
          lastIframeUrl = currentIframeUrl;
        }
      } catch (error) {
        // Handle cross-origin restrictions gracefully
        console.log('Cannot access iframe URL due to cross-origin policy:', error.message);
        
        // For cross-origin iframes, we can still detect navigation via src changes
        const currentSrc = this.originalIframe.src;
        if (currentSrc !== lastIframeUrl && currentSrc !== window.location.href) {
          console.log('🔄 Iframe src changed to:', currentSrc);
          console.log('🔄 Updating main page URL to match iframe src');
          
          this.updateMainPageUrl(currentSrc);
          lastIframeUrl = currentSrc;
        }
      }
    });

    // Additional monitoring for same-origin iframes
    try {
      if (this.originalIframe.contentWindow) {
        // Monitor iframe URL changes more frequently for same-origin content
        this.iframeUrlCheckInterval = setInterval(() => {
          try {
            const currentIframeUrl = this.originalIframe.contentWindow.location.href;
            
            if (currentIframeUrl !== lastIframeUrl && currentIframeUrl !== window.location.href) {
              console.log('🔄 Iframe URL changed to:', currentIframeUrl);
              console.log('🔄 Updating main page URL to match iframe');
              
              this.updateMainPageUrl(currentIframeUrl);
              lastIframeUrl = currentIframeUrl;
            }
          } catch (e) {
            // Cross-origin access blocked - this is expected for external sites
            // We'll rely on the load event handler instead
          }
        }, 1000);
      }
    } catch (error) {
      console.log('Cannot set up same-origin iframe monitoring:', error.message);
    }
  }

  /**
   * Update the main page URL to match iframe navigation
   */
  updateMainPageUrl(newUrl) {
    try {
      // Temporarily disable our URL sync to prevent infinite loops
      const wasUrlSyncEnabled = this.urlSyncEnabled;
      this.urlSyncEnabled = false;
      
      // Update the browser address bar
      window.history.pushState({ iframeNavigation: true }, '', newUrl);
      
      console.log('✅ Updated main page URL to:', newUrl);
      
      // Regenerate content for the new URL
      console.log('🎯 Triggering content regeneration for iframe navigation');
      this.regenerateContentForUrlChange();
      
      // Re-enable URL sync after a short delay
      setTimeout(() => {
        this.urlSyncEnabled = wasUrlSyncEnabled;
      }, 100);
      
    } catch (error) {
      console.error('Error updating main page URL:', error);
    }
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

  /**
   * Regenerate content specifically for URL changes with proper timing
   */
  async regenerateContentForUrlChange() {
    // Only regenerate if we're in a mode that shows generated content
    if (this.currentMode === 'normal') {
      console.log('Not regenerating content - extension in normal mode');
      return;
    }

    if (!this.generatedContentDiv || this.generatedContentDiv.classList.contains('hidden')) {
      console.log('Not regenerating content - generated content not visible');
      return;
    }

    try {
      console.log('🎯 Regenerating content for URL change...');
      
      // Wait a moment for the page/iframe to load
      setTimeout(async () => {
        try {
          // Capture new page content
          this.captureOriginalPageHTML();
          
          // Get the updated DOM object
          const originalDOM = window.HTMLGenerator.getOriginalDOM();
          
          // Generate new HTML using current intent
          this.generatedHtml = await window.HTMLGenerator.generatePageHTML(originalDOM, this.currentIntent, '');
          
          // Wrap it for side-by-side display
          const wrappedHTML = window.HTMLGenerator.wrapForSideBySide(this.generatedHtml);
          
          // Update the content
          this.generatedContentDiv.innerHTML = wrappedHTML;
          
          console.log('✅ Content regenerated for new URL with intent:', this.currentIntent);
        } catch (error) {
          console.error('Error in delayed content regeneration:', error);
        }
      }, 1000); // Wait 1 second for page to load
      
    } catch (error) {
      console.error('Error setting up content regeneration for URL change:', error);
    }
  }
}

// Initialize the extension when the script loads
const domToggleExtension = new DOMToggleExtension();