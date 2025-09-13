class DOMToggleExtension {
  constructor() {
    this.currentMode = 'normal'; // 'normal', 'side-by-side', 'overlay'
    this.originalElements = [];
    this.originalPageHTML = '';
    this.originalIframe = null;
    this.generatedContentDiv = null;
    this.sideBySideButton = null;
    this.overlayButton = null;
    this.buttonContainer = null;
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
    this.createButtonContainer();
    this.createButtons();
    this.markOriginalContent();
    this.createSideBarContainer();
    this.createOriginalIframe();
    this.createGeneratedContentDiv();
    this.attachEventListeners();
  }

  createButtonContainer() {
    this.buttonContainer = document.createElement('div');
    this.buttonContainer.id = 'retro-extension-buttons';
    this.buttonContainer.className = 'retro-extension-buttons';
    
    // Insert at the very top of the body
    document.body.insertBefore(this.buttonContainer, document.body.firstChild);
  }

  createButtons() {
    // Side-by-side button
    this.sideBySideButton = document.createElement('button');
    this.sideBySideButton.id = 'side-by-side-btn';
    this.sideBySideButton.textContent = 'Side-by-Side';
    this.sideBySideButton.className = 'retro-mode-button';
    
    // Overlay button
    this.overlayButton = document.createElement('button');
    this.overlayButton.id = 'overlay-btn';
    this.overlayButton.textContent = 'Retro Overlay';
    this.overlayButton.className = 'retro-mode-button';
    
    // Reset button
    this.resetButton = document.createElement('button');
    this.resetButton.id = 'reset-btn';
    this.resetButton.textContent = 'Reset';
    this.resetButton.className = 'retro-mode-button reset-button';
    
    // Add buttons to container
    this.buttonContainer.appendChild(this.sideBySideButton);
    this.buttonContainer.appendChild(this.overlayButton);
    this.buttonContainer.appendChild(this.resetButton);
  }

  captureOriginalPageHTML() {
    // Capture the complete HTML of the original page before any modifications
    this.originalPageHTML = document.documentElement.outerHTML;
  }

  markOriginalContent() {
    // Mark all existing content for mode switching
    // Get all direct children of body (except our extension elements)
    this.originalElements = Array.from(document.body.children).filter(
      child => child.id !== 'retro-extension-buttons' && 
               child.id !== 'side-by-side-container' &&
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
    // Create iframe container for the original website
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
      z-index: 9997;
      border-right: 2px solid #333;
    `;
    
    // Set the iframe content to the captured original HTML
    this.originalIframe.srcdoc = this.originalPageHTML;
    
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

  attachEventListeners() {
    this.sideBySideButton.addEventListener('click', () => this.setSideBySideMode());
    this.overlayButton.addEventListener('click', () => this.setOverlayMode());
    this.resetButton.addEventListener('click', () => this.setNormalMode());
  }

  setSideBySideMode() {
    this.setNormalMode(); // Reset first
    this.currentMode = 'side-by-side';
    
    // Hide original content and show iframe
    this.originalElements.forEach(element => {
      element.classList.add('hidden-by-extension');
    });
    
    // Show original content iframe on the left
    this.originalIframe.classList.remove('hidden');
    
    // Show generated content on the right
    this.generatedContentDiv.classList.remove('hidden');
    this.generatedContentDiv.classList.add('side-by-side-mode');
    this.sideBarContainer.classList.remove('hidden');
    
    // Add side-by-side class to body for global styling
    document.body.classList.add('side-by-side-active');
    
    // Update button states
    this.updateButtonStates();
  }

  setOverlayMode() {
    this.setNormalMode(); // Reset first
    this.currentMode = 'overlay';
    
    // Hide original content, show generated content as full overlay
    this.originalElements.forEach(element => {
      element.classList.add('hidden-by-extension');
    });
    this.generatedContentDiv.classList.remove('hidden');
    this.generatedContentDiv.classList.add('overlay-mode');
    
    // Add overlay class to body for global styling
    document.body.classList.add('overlay-active');
    
    // Update button states
    this.updateButtonStates();
  }

  setNormalMode() {
    this.currentMode = 'normal';
    
    // Reset all original elements
    this.originalElements.forEach(element => {
      element.classList.remove('side-by-side-left', 'hidden-by-extension');
    });
    
    // Hide the original content iframe
    this.originalIframe.classList.add('hidden');
    
    // Hide generated content
    this.generatedContentDiv.classList.add('hidden');
    this.generatedContentDiv.classList.remove('side-by-side-mode', 'overlay-mode');
    this.sideBarContainer.classList.add('hidden');
    
    // Remove all body classes
    document.body.classList.remove('side-by-side-active', 'overlay-active');
    
    // Update button states
    this.updateButtonStates();
  }

  updateButtonStates() {
    // Reset all button states
    this.sideBySideButton.classList.remove('active');
    this.overlayButton.classList.remove('active');
    this.resetButton.classList.remove('active');
    
    // Set active state based on current mode
    switch (this.currentMode) {
      case 'side-by-side':
        this.sideBySideButton.classList.add('active');
        break;
      case 'overlay':
        this.overlayButton.classList.add('active');
        break;
      case 'normal':
        this.resetButton.classList.add('active');
        break;
    }
  }
}

// Initialize the extension when the script loads
const domToggleExtension = new DOMToggleExtension();
