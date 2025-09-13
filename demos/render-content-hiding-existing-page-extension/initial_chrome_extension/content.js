class DOMToggleExtension {
  constructor() {
    this.isToggled = false;
    this.originalElements = [];
    this.helloWorldDiv = null;
    this.toggleButton = null;
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
    this.createHelloWorldDiv();
    this.attachEventListeners();
  }

  createToggleButton() {
    this.toggleButton = document.createElement('button');
    this.toggleButton.id = 'dom-toggle-btn';
    this.toggleButton.textContent = 'Toggle View';
    this.toggleButton.className = 'dom-toggle-button';
    
    // Insert at the very top of the body
    document.body.insertBefore(this.toggleButton, document.body.firstChild);
  }

  markOriginalContent() {
    // Instead of moving elements, we'll mark all existing content for show/hide
    // Get all direct children of body (except our toggle button)
    this.originalElements = Array.from(document.body.children).filter(
      child => child.id !== 'dom-toggle-btn' && child.id !== 'hello-world-overlay'
    );
    
    // Add our class to each original element for styling control
    this.originalElements.forEach(element => {
      element.classList.add('original-content-element');
    });
  }

  createHelloWorldDiv() {
    this.helloWorldDiv = document.createElement('div');
    this.helloWorldDiv.id = 'hello-world-overlay';
    this.helloWorldDiv.className = 'hello-world-overlay hidden';
    
    // Get the original HTML content
    const originalHTML = window.HTMLGenerator.getOriginalHTML();
    
    // Generate the overlay HTML using the HTML generator
    const generatedHTML = window.HTMLGenerator.generateOverlayHTML(originalHTML);
    
    // Set the generated HTML as the content
    this.helloWorldDiv.innerHTML = generatedHTML;
    document.body.appendChild(this.helloWorldDiv);
  }

  attachEventListeners() {
    this.toggleButton.addEventListener('click', () => this.toggleView());
  }

  toggleView() {
    this.isToggled = !this.isToggled;
    
    if (this.isToggled) {
      // Hide original content, show hello world
      this.originalElements.forEach(element => {
        element.classList.add('hidden-by-extension');
      });
      this.helloWorldDiv.classList.remove('hidden');
      this.toggleButton.textContent = 'Show Original';
    } else {
      // Show original content, hide hello world
      this.originalElements.forEach(element => {
        element.classList.remove('hidden-by-extension');
      });
      this.helloWorldDiv.classList.add('hidden');
      this.toggleButton.textContent = 'Toggle View';
    }
  }
}

// Initialize the extension when the script loads
const domToggleExtension = new DOMToggleExtension();
