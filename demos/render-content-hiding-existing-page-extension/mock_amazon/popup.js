// Retro UI Maker Extension Popup Script

class PopupController {
  constructor() {
    this.currentMode = 'normal';
    this.currentIntent = 'I want to look through my past orders on amazon';
    this.intentInput = null;
    this.init();
  }

  init() {
    this.attachEventListeners();
    this.loadCurrentState();
  }

  attachEventListeners() {
    // Intent input listener
    this.intentInput = document.getElementById('intent-input');
    this.intentInput.addEventListener('input', () => {
      this.updateIntent();
    });

    // Button event listeners
    document.getElementById('reset-btn').addEventListener('click', () => {
      this.setMode('normal');
    });

    document.getElementById('side-by-side-btn').addEventListener('click', () => {
      this.setMode('side-by-side');
    });

    document.getElementById('overlay-btn').addEventListener('click', () => {
      this.setMode('overlay');
    });

    document.getElementById('regenerate-btn').addEventListener('click', () => {
      this.regenerateContent();
    });
  }

  async setMode(mode) {
    this.setLoadingState(true);
    
    try {
      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'setMode',
        mode: mode,
        intent: this.currentIntent
      });

      this.currentMode = mode;
      this.updateButtonStates();
      
      // Save state
      chrome.storage.local.set({ 
        currentMode: mode,
        currentIntent: this.currentIntent 
      });
      
    } catch (error) {
      console.error('Error setting mode:', error);
      
      // Reset to normal mode on error
      setTimeout(() => {
        this.setMode('normal');
      }, 2000);
    } finally {
      this.setLoadingState(false);
    }
  }

  updateButtonStates() {
    // Remove active class from all buttons
    document.querySelectorAll('.control-button').forEach(btn => {
      btn.classList.remove('active');
    });

    // Add active class to current mode button
    let activeButtonId;
    switch (this.currentMode) {
      case 'normal':
        activeButtonId = 'reset-btn';
        break;
      case 'side-by-side':
        activeButtonId = 'side-by-side-btn';
        break;
      case 'overlay':
        activeButtonId = 'overlay-btn';
        break;
    }

    if (activeButtonId) {
      document.getElementById(activeButtonId).classList.add('active');
    }
  }

  updateIntent() {
    this.currentIntent = this.intentInput.value;
    
    // Save intent immediately when changed
    chrome.storage.local.set({ 
      currentIntent: this.currentIntent 
    });
    
  }

  async regenerateContent() {
    this.setLoadingState(true);
    
    try {
      // Update intent first if it has changed
      this.updateIntent();
      
      // Send message to content script to regenerate content
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'regenerateContent'
      });
      
      console.log('Content regeneration requested');
      
    } catch (error) {
      console.error('Error regenerating content:', error);
    } finally {
      this.setLoadingState(false);
    }
  }


  setLoadingState(loading) {
    document.querySelectorAll('.control-button').forEach(btn => {
      if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
      } else {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    });
    
    // Also disable intent input during loading
    if (this.intentInput) {
      this.intentInput.disabled = loading;
    }
  }


  async loadCurrentState() {
    try {
      // Get saved state
      const result = await chrome.storage.local.get(['currentMode', 'currentIntent']);
      
      if (result.currentMode) {
        this.currentMode = result.currentMode;
        this.updateButtonStates();
      }
      
      if (result.currentIntent) {
        this.currentIntent = result.currentIntent;
        this.intentInput.value = this.currentIntent;
      } else {
        // Set default intent if none saved
        this.intentInput.value = this.currentIntent;
      }

      // Get current state from content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getCurrentMode'
      });

      if (response && response.mode) {
        this.currentMode = response.mode;
        this.updateButtonStates();
      }

    } catch (error) {
      console.log('Could not load current state:', error);
      // This is normal if content script hasn't loaded yet
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Handle popup visibility changes
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Popup became visible, refresh state
    const controller = new PopupController();
  }
});
