class DOMToggleExtension {
  constructor() {
    this.currentMode = 'normal'; // 'normal', 'side-by-side', 'overlay'
    this.defaultMode = 'normal'; // Default mode setting
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
    
    // Load and apply default mode
    await this.loadDefaultMode();
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
    
    // Get the original DOM object
    const originalDOM = window.HTMLGenerator.getOriginalDOM();
    
    // Generate clean HTML page using async LLM pipeline
    try {
      this.generatedHtml = await window.HTMLGenerator.generatePageHTML(originalDOM, this.currentIntent, this.generatedHtml);
    } catch (error) {
      console.error('Error generating HTML:', error);
      // Fallback to static content
      this.generatedHtml = window.HTMLGenerator.generateFallbackHTML(originalDOM, this.currentIntent, this.generatedHtml);
    }
    
    // Wrap it for side-by-side display
    const wrappedHTML = window.HTMLGenerator.wrapForSideBySide(this.generatedHtml);
    
    // Set the wrapped HTML as the content
    this.generatedContentDiv.innerHTML = wrappedHTML;
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
      } else if (request.action === 'setDefaultMode') {
        this.setDefaultMode(request.defaultMode);
        sendResponse({ success: true, defaultMode: this.defaultMode });
      } else if (request.action === 'setIntent') {
        this.setIntent(request.intent);
        sendResponse({ success: true, intent: this.currentIntent });
      } else if (request.action === 'regenerateContent') {
        this.regenerateContent();
        sendResponse({ success: true });
      }
      return true; // Indicates we will send a response asynchronously
    });

    // Listen for messages from iframe content (generated HTML)
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CLICK_ORIGINAL_BUTTON') {
        this.clickOriginalButton(event.data.buttonSelector);
      } else if (event.data && event.data.type === 'UPDATE_BUTTON_CONFIG') {
        this.updateButtonConfig(event.data.buttonSelector, event.data.buttonText);
      } else if (event.data && event.data.type === 'TEST_BUTTON_SELECTOR') {
        this.testButtonSelector(event.data.buttonSelector);
      }
    });
  }

  setMode(mode) {
    // Reset current state first
    this.setNormalMode();
    
    // Set new mode
    this.currentMode = mode;
    
    switch (mode) {
      case 'side-by-side':
        this.setSideBySideMode();
        break;
      case 'overlay':
        this.setOverlayMode();
        break;
      case 'normal':
      default:
        this.setNormalMode();
        break;
    }
  }

  setSideBySideMode() {
    this.currentMode = 'side-by-side';
    
    // Hide original content and show in iframe
    this.originalElements.forEach(element => {
      element.classList.add('hidden-by-extension');
    });
    
    // Use the current page URL instead of srcdoc to avoid CORS issues
    this.originalIframe.src = window.location.href;
    this.originalIframe.classList.remove('hidden');
    
    // Show generated content on the right
    this.generatedContentDiv.classList.remove('hidden');
    this.generatedContentDiv.classList.add('side-by-side-mode');
    this.sideBarContainer.classList.remove('hidden');
    
    // Add side-by-side class to body for global styling
    document.body.classList.add('side-by-side-active');
  }

  setOverlayMode() {
    this.currentMode = 'overlay';
    
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

  async loadDefaultMode() {
    try {
      const result = await chrome.storage.local.get(['defaultMode']);
      if (result.defaultMode) {
        this.defaultMode = result.defaultMode;
        
        // Apply default mode if it's not normal
        if (this.defaultMode !== 'normal') {
          this.setMode(this.defaultMode);
        }
      }
    } catch (error) {
      console.error('Error loading default mode:', error);
      // Fallback to normal mode if there's an error
      this.defaultMode = 'normal';
    }
  }

  setDefaultMode(mode) {
    this.defaultMode = mode;
    // Note: We don't automatically apply the default mode here
    // This is just for setting the preference
  }

  clickOriginalButton(buttonSelector) {
    try {
      // Find the original button on the current page
      let originalButton = document.querySelector(buttonSelector);
      
      if (!originalButton) {
        // If the exact selector doesn't work, try alternative selectors
        const fallbackSelectors = [
          'button[name="submit.addToCart"]',
          'button[id="a-autoid-2-announce"]',
          'button[aria-label="Add to cart"]',
          'button.a-button-text',
          '[data-action="add-to-cart"]',
          '.add-to-cart-button',
          '#add-to-cart'
        ];
        
        for (const selector of fallbackSelectors) {
          const fallbackButton = document.querySelector(selector);
          if (fallbackButton) {
            originalButton = fallbackButton;
            console.log('Found button using fallback selector:', selector);
            break;
          }
        }
      }
      
      if (originalButton) {
        // Multiple click simulation approaches for better compatibility
        this.simulateRealClick(originalButton);
        console.log('Successfully clicked original button:', originalButton);
      } else {
        console.warn('Could not find original button with any selector');
      }
    } catch (error) {
      console.error('Error clicking original button:', error);
    }
  }

  simulateRealClick(element) {
    // Ensure the element is visible and not disabled
    if (element.disabled) {
      console.warn('Button is disabled, cannot click');
      return;
    }

    // Scroll element into view if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait a moment for scroll to complete, then simulate click
    setTimeout(() => {
      try {
        // Use only the standard click method to avoid double-clicking
        // This is the most reliable and least likely to cause duplicates
        element.click();
        console.log('Clicked original button using standard click method');
        
        // After clicking, refresh the iframe to show updated state
        this.refreshOriginalIframe();
      } catch (error) {
        console.error('Error in simulateRealClick:', error);

      }
    }, 100);
  }

  /**
   * Refresh the iframe to show updated state after button click
   * This reloads the iframe to reflect changes made to the main page
   */
  refreshOriginalIframe() {
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
   * Updates the button configuration in HTMLGenerator
   * @param {string} buttonSelector - CSS selector for the button
   * @param {string} buttonText - Display text for the button
   */
  updateButtonConfig(buttonSelector, buttonText) {
    try {
      // Update the configuration in HTMLGenerator
      if (window.HTMLGenerator && window.HTMLGenerator.setButtonConfig) {
        window.HTMLGenerator.setButtonConfig(buttonSelector, buttonText);
        console.log('Button configuration updated:', { buttonSelector, buttonText });
        
        // Regenerate the content with new configuration
        this.regenerateContent();
      } else {
        console.error('HTMLGenerator not available');
      }
    } catch (error) {
      console.error('Error updating button config:', error);
    }
  }

  /**
   * Tests a button selector to see if it can find a button on the page
   * @param {string} buttonSelector - CSS selector to test
   */
  testButtonSelector(buttonSelector) {
    try {
      const testButton = document.querySelector(buttonSelector);
      
      if (testButton) {
        console.log('✓ Button selector found:', buttonSelector, testButton);
        
        // Highlight the button temporarily
        const originalStyle = testButton.style.cssText;
        testButton.style.cssText += 'border: 3px solid red !important; background-color: yellow !important;';
        
        setTimeout(() => {
          testButton.style.cssText = originalStyle;
        }, 2000);
        
        alert(`✓ Selector found! Button: ${testButton.textContent || testButton.innerHTML || 'No text'}`);
      } else {
        console.warn('✗ Button selector not found:', buttonSelector);
        alert(`✗ Selector not found: ${buttonSelector}`);
      }
    } catch (error) {
      console.error('Error testing button selector:', error);
      alert(`Error testing selector: ${error.message}`);
    }
  }

  /**
   * Regenerates the content with updated configuration
   */
  regenerateContent() {
    try {
      // Remove existing generated content
      if (this.generatedContentDiv) {
        this.generatedContentDiv.remove();
      }
      
      // Recreate with new configuration
      this.createGeneratedContentDiv();
      
      // If we're not in normal mode, show the updated content
      if (this.currentMode !== 'normal') {
        this.setMode(this.currentMode);
      }
      
      console.log('Content regenerated with new button configuration');
    } catch (error) {
      console.error('Error regenerating content:', error);
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