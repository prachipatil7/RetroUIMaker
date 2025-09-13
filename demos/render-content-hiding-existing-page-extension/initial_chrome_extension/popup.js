// Retro UI Maker Extension Popup Script

class PopupController {
  constructor() {
    this.currentMode = 'normal';
    this.init();
  }

  init() {
    this.attachEventListeners();
    this.loadCurrentState();
  }

  attachEventListeners() {
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
  }

  async setMode(mode) {
    this.setLoadingState(true);
    
    try {
      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'setMode',
        mode: mode
      });

      this.currentMode = mode;
      this.updateButtonStates();
      
      // Save state
      chrome.storage.local.set({ currentMode: mode });
      
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
  }


  async loadCurrentState() {
    try {
      // Get saved state
      const result = await chrome.storage.local.get(['currentMode']);
      if (result.currentMode) {
        this.currentMode = result.currentMode;
        this.updateButtonStates();
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
