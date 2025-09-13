// Simplified UI renderer for Page Replacer extension
// Renders a clean overlay with page content summary and controls

export function renderSimplified(shadowRoot, api) {
  const title = document.title || location.hostname;
  const h1 = document.querySelector('h1')?.textContent || title;
  const img = document.querySelector('img[src]')?.src;
  const desc = document.querySelector('meta[name="description"]')?.content || '';
  
  shadowRoot.innerHTML = `
    <style>
      :host { all: initial; }
      .app { 
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; 
        color: #111; 
        background: #fff; 
        height: 100vh; 
        display: flex; 
        flex-direction: column; 
      }
      .bar { 
        display: flex; 
        gap: 8px; 
        padding: 8px; 
        border-bottom: 1px solid #eee; 
        position: sticky; 
        top: 0; 
        background: #fafafa; 
        align-items: center;
      }
      .body { 
        padding: 16px; 
        overflow: auto; 
        flex: 1;
      }
      button {
        padding: 6px 12px;
        border: 1px solid #ccc;
        background: #fff;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      button:hover {
        background: #f5f5f5;
      }
      button:active {
        background: #e5e5e5;
      }
      h1 {
        margin: 0 0 16px 0;
        font-size: 24px;
        line-height: 1.2;
      }
      img { 
        max-width: 100%; 
        height: auto; 
        margin: 16px 0;
        border-radius: 4px;
      }
      p {
        margin: 8px 0;
        line-height: 1.5;
        color: #666;
      }
      .spacer {
        flex: 1;
      }
      .status {
        font-size: 12px;
        color: #888;
        margin-left: 8px;
      }
    </style>
    <div class="app">
      <div class="bar">
        <button id="btnOriginal">Show Original</button>
        <button id="btnSimplified">Replace Again</button>
        <button id="btnClose">Close</button>
        <div class="spacer"></div>
        <button id="btnAiSimplify">AI Simplify</button>
        <button id="btnAiSearch">AI Search</button>
        <button id="btnSettings">Settings</button>
        <button id="btnPick">Pick Target</button>
        <button id="btnProxy">Click Original</button>
        <div class="status" id="status">Ready</div>
      </div>
      <div class="body" id="mainContent">
        <h1>${escapeHTML(h1)}</h1>
        ${img ? `<img src="${img}" alt="Page image">` : ''}
        ${desc ? `<p>${escapeHTML(desc)}</p>` : ''}
        <p><strong>URL:</strong> ${escapeHTML(location.href)}</p>
        <p><strong>Domain:</strong> ${escapeHTML(location.hostname)}</p>
      </div>
      
      <!-- Settings Modal -->
      <div id="settingsModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; min-width: 300px;">
          <h3>AI Settings</h3>
          <div style="margin: 10px 0;">
            <label>Provider:</label>
            <select id="providerSelect" style="width: 100%; padding: 5px; margin: 5px 0;">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div style="margin: 10px 0;">
            <label>API Key:</label>
            <input type="password" id="apiKeyInput" placeholder="Enter your API key" style="width: 100%; padding: 5px; margin: 5px 0;">
          </div>
          <div style="margin: 10px 0; text-align: right;">
            <button id="saveSettings" style="margin-right: 10px;">Save</button>
            <button id="cancelSettings">Cancel</button>
          </div>
        </div>
      </div>
      
      <!-- AI Search Modal -->
      <div id="searchModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; min-width: 300px;">
          <h3>AI Search</h3>
          <div style="margin: 10px 0;">
            <input type="text" id="searchQuery" placeholder="Enter search query" style="width: 100%; padding: 8px; margin: 5px 0;">
          </div>
          <div style="margin: 10px 0; text-align: right;">
            <button id="performSearch" style="margin-right: 10px;">Search</button>
            <button id="cancelSearch">Cancel</button>
          </div>
        </div>
      </div>
    </div>`;
  
  // Wire up event handlers
  shadowRoot.getElementById('btnOriginal').onclick = () => {
    api.showOriginal();
    updateStatus('Showing original page');
  };
  
  shadowRoot.getElementById('btnSimplified').onclick = () => {
    api.showSimplified();
    updateStatus('Showing simplified view');
  };
  
  shadowRoot.getElementById('btnClose').onclick = () => {
    api.teardown();
    updateStatus('Extension closed');
  };
  
  shadowRoot.getElementById('btnPick').onclick = () => {
    updateStatus('Click any element to pick it...');
    api.enterPicker((selector) => {
      updateStatus(`Picked: ${selector}`);
    });
  };
  
  shadowRoot.getElementById('btnProxy').onclick = () => {
    const success = api.triggerProxyClick();
    updateStatus(success ? 'Clicked original element!' : 'No element picked yet');
  };
  
  // AI-powered handlers
  shadowRoot.getElementById('btnAiSimplify').onclick = async () => {
    updateStatus('AI is analyzing the page...');
    const result = await api.aiGenerateSimplified();
    if (result.success) {
      renderAiHtml(result.html);
      updateStatus('AI simplified view generated');
    } else {
      updateStatus(`AI failed: ${result.error}`);
    }
  };
  
  shadowRoot.getElementById('btnAiSearch').onclick = () => {
    shadowRoot.getElementById('searchModal').style.display = 'block';
  };
  
  shadowRoot.getElementById('btnSettings').onclick = async () => {
    // Load current settings
    try {
      const result = await chrome.storage.local.get(['apiKey', 'provider']);
      shadowRoot.getElementById('apiKeyInput').value = result.apiKey || '';
      shadowRoot.getElementById('providerSelect').value = result.provider || 'openai';
      shadowRoot.getElementById('settingsModal').style.display = 'block';
    } catch (err) {
      console.error('Failed to load settings:', err);
      shadowRoot.getElementById('apiKeyInput').value = '';
      shadowRoot.getElementById('providerSelect').value = 'openai';
      shadowRoot.getElementById('settingsModal').style.display = 'block';
    }
  };
  
  // Modal handlers
  shadowRoot.getElementById('saveSettings').onclick = async () => {
    const apiKey = shadowRoot.getElementById('apiKeyInput').value.trim();
    const provider = shadowRoot.getElementById('providerSelect').value;
    
    if (!apiKey) {
      updateStatus('Please enter an API key');
      return;
    }
    
    try {
      await chrome.storage.local.set({ apiKey, provider });
      shadowRoot.getElementById('settingsModal').style.display = 'none';
      updateStatus('Settings saved successfully');
      console.log('API key saved:', { provider, hasKey: !!apiKey });
    } catch (err) {
      console.error('Failed to save settings:', err);
      updateStatus('Failed to save settings');
    }
  };
  
  shadowRoot.getElementById('cancelSettings').onclick = () => {
    shadowRoot.getElementById('settingsModal').style.display = 'none';
  };
  
  shadowRoot.getElementById('performSearch').onclick = async () => {
    const query = shadowRoot.getElementById('searchQuery').value;
    if (!query.trim()) return;
    
    shadowRoot.getElementById('searchModal').style.display = 'none';
    updateStatus('AI is searching...');
    
    const result = await api.aiPickAndSearch(query);
    if (result.success) {
      updateStatus(`Search performed: ${result.action}`);
    } else {
      updateStatus(`Search failed: ${result.error}`);
    }
  };
  
  shadowRoot.getElementById('cancelSearch').onclick = () => {
    shadowRoot.getElementById('searchModal').style.display = 'none';
  };
  
  // Close modals on background click
  shadowRoot.getElementById('settingsModal').onclick = (e) => {
    if (e.target.id === 'settingsModal') {
      shadowRoot.getElementById('settingsModal').style.display = 'none';
    }
  };
  
  shadowRoot.getElementById('searchModal').onclick = (e) => {
    if (e.target.id === 'searchModal') {
      shadowRoot.getElementById('searchModal').style.display = 'none';
    }
  };
  
  function updateStatus(message) {
    const statusEl = shadowRoot.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }
  
  function renderAiHtml(html) {
    const mainContent = shadowRoot.getElementById('mainContent');
    if (!mainContent || !html) return;
    
    // Insert the AI-generated HTML directly
    mainContent.innerHTML = html;
    
    // Wire up event handlers for all interactive elements
    const interactiveElements = mainContent.querySelectorAll('[data-selector]');
    interactiveElements.forEach(element => {
      const selector = element.getAttribute('data-selector');
      const action = element.getAttribute('data-action');
      
      if (action === 'click') {
        element.onclick = (e) => {
          e.preventDefault();
          api.triggerProxy(selector, { type: 'click' });
        };
      } else if (action === 'search') {
        element.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const value = element.value;
            if (value) {
              api.triggerProxy(selector, { type: 'input', value: value });
            }
          }
        };
        element.onchange = (e) => {
          const value = element.value;
          if (value) {
            api.triggerProxy(selector, { type: 'input', value: value });
          }
        };
      }
    });
  }
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}
