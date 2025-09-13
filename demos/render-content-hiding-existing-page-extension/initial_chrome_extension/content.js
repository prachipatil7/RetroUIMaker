class DOMToggleExtension {
  constructor() {
    this.currentMode = 'normal'; // 'normal', 'side-by-side', 'overlay'
    this.originalElements = [];
    this.originalPageHTML = '';
    this.originalIframe = null;
    this.generatedContentDiv = null;
    this.sideBarContainer = null;
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

  setupExtension() {
    this.captureOriginalPageHTML();
    this.markOriginalContent();
    this.createSideBarContainer();
    this.createOriginalIframe();
    this.createGeneratedContentDiv();
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

  createGeneratedContentDiv() {
    this.generatedContentDiv = document.createElement('div');
    this.generatedContentDiv.id = 'generated-content-overlay';
    this.generatedContentDiv.className = 'generated-content-overlay hidden';
    
    // Get the original DOM object
    const originalDOM = window.HTMLGenerator.getOriginalDOM();
    
    // Generate clean HTML page (what LLM would generate)
    const cleanGeneratedHTML = window.HTMLGenerator.generatePageHTML(originalDOM);
    
    // Wrap it for side-by-side display
    const wrappedHTML = window.HTMLGenerator.wrapForSideBySide(cleanGeneratedHTML);
    
    // Set the wrapped HTML as the content
    this.generatedContentDiv.innerHTML = wrappedHTML;
    document.body.appendChild(this.generatedContentDiv);
  }

  setupMessageListener() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'setMode') {
        this.setMode(request.mode);
        sendResponse({ success: true, mode: this.currentMode });
      } else if (request.action === 'getCurrentMode') {
        sendResponse({ mode: this.currentMode });
      }
      return true; // Indicates we will send a response asynchronously
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
}

// Initialize the extension when the script loads
const domToggleExtension = new DOMToggleExtension();