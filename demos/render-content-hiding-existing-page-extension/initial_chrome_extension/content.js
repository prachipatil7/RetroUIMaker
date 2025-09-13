class DOMToggleExtension {
  constructor() {
    this.isToggled = false;
    this.originalElements = [];
    this.generatedContentDiv = null;
    this.toggleButton = null;
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
    this.createToggleButton();
    this.markOriginalContent();
    this.createSideBarContainer();
    this.createGeneratedContentDiv();
    this.attachEventListeners();
  }

  createToggleButton() {
    this.toggleButton = document.createElement('button');
    this.toggleButton.id = 'dom-toggle-btn';
    this.toggleButton.textContent = 'Show Side-by-Side';
    this.toggleButton.className = 'dom-toggle-button';
    
    // Insert at the very top of the body
    document.body.insertBefore(this.toggleButton, document.body.firstChild);
  }

  markOriginalContent() {
    // Mark all existing content for side-by-side layout
    // Get all direct children of body (except our extension elements)
    this.originalElements = Array.from(document.body.children).filter(
      child => child.id !== 'dom-toggle-btn' && 
               child.id !== 'side-by-side-container' &&
               child.id !== 'generated-content-overlay'
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

  createGeneratedContentDiv() {
    this.generatedContentDiv = document.createElement('div');
    this.generatedContentDiv.id = 'generated-content-overlay';
    this.generatedContentDiv.className = 'generated-content-overlay hidden';
    
    // Get the original HTML content
    const originalHTML = window.HTMLGenerator.getOriginalHTML();
    
    // Generate clean HTML page (what LLM would generate)
    const cleanGeneratedHTML = window.HTMLGenerator.generatePageHTML(originalHTML);
    
    // Wrap it for side-by-side display
    const wrappedHTML = window.HTMLGenerator.wrapForSideBySide(cleanGeneratedHTML);
    
    // Set the wrapped HTML as the content
    this.generatedContentDiv.innerHTML = wrappedHTML;
    document.body.appendChild(this.generatedContentDiv);
  }

  attachEventListeners() {
    this.toggleButton.addEventListener('click', () => this.toggleView());
  }

  toggleView() {
    this.isToggled = !this.isToggled;
    
    if (this.isToggled) {
      // Activate side-by-side view
      this.originalElements.forEach(element => {
        element.classList.add('side-by-side-left');
      });
      this.generatedContentDiv.classList.remove('hidden');
      this.sideBarContainer.classList.remove('hidden');
      this.toggleButton.textContent = 'Hide Side-by-Side';
      
      // Add side-by-side class to body for global styling
      document.body.classList.add('side-by-side-active');
    } else {
      // Deactivate side-by-side view
      this.originalElements.forEach(element => {
        element.classList.remove('side-by-side-left');
      });
      this.generatedContentDiv.classList.add('hidden');
      this.sideBarContainer.classList.add('hidden');
      this.toggleButton.textContent = 'Show Side-by-Side';
      
      // Remove side-by-side class from body
      document.body.classList.remove('side-by-side-active');
    }
  }
}

// Initialize the extension when the script loads
const domToggleExtension = new DOMToggleExtension();
