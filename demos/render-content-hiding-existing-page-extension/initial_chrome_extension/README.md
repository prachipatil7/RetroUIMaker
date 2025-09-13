# DOM Toggle Chrome Extension

A clean and well-organized Chrome extension that allows users to view the original webpage alongside a custom retro-styled interface with proper iframe-based sizing.

## Features

- **Multiple View Modes**: Side-by-side, overlay, and normal viewing modes
- **Iframe-Based Original Content**: Original website displayed in iframe for precise sizing control
- **Side-by-Side View**: Original content and generated content displayed simultaneously
- **Smooth Transitions**: CSS transitions for a polished user experience
- **Responsive Design**: Works on both desktop and mobile viewports with adaptive layouts
- **Clean Architecture**: Object-oriented JavaScript with clear separation of concerns

## How It Works

1. **Initialization**: The extension injects a content script that runs on all web pages
2. **Content Capture**: Original page HTML is captured before any modifications
3. **Iframe Creation**: Original content is displayed in an iframe for precise sizing
4. **Mode Buttons**: Three buttons are added for different viewing modes
5. **Side-by-Side View**: Original content (iframe) on left, generated content on right
6. **State Management**: Mode switching with smooth transitions and responsive layouts
7. **CSP Compliance**: Iframe-based approach avoids direct DOM manipulation issues

## File Structure

```
initial_chrome_extension/
├── manifest.json     # Extension configuration
├── htmlGenerator.js  # HTML generation logic (ready for LLM integration)
├── content.js        # Main DOM manipulation and extension logic
├── styles.css        # Styling for toggle button and overlay
└── README.md         # This documentation
```

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `initial_chrome_extension` folder
4. The extension will be active on all websites

## Usage

1. Visit any website
2. You'll see three buttons at the top of the page: "Side-by-Side", "Retro Overlay", and "Reset"
3. **Side-by-Side**: Shows original website in iframe on left, generated retro content on right
4. **Retro Overlay**: Shows only the generated retro content in full screen
5. **Reset**: Returns to normal website view
6. The view mode persists until page refresh or mode change

## Technical Details

### Architecture

- **DOMToggleExtension Class**: Main class that encapsulates all functionality
- **Event-Driven**: Uses DOM events for user interactions
- **State Management**: Tracks toggle state and manages visibility
- **CSS Classes**: Uses class-based show/hide for smooth transitions

### Key Methods

**Content Script (content.js):**
- `init()`: Initializes the extension and waits for DOM ready
- `setupExtension()`: Creates all UI elements and sets up event listeners
- `captureOriginalPageHTML()`: Captures complete HTML before modifications
- `createOriginalIframe()`: Creates iframe container for original content
- `markOriginalContent()`: Marks original DOM elements with CSS classes for control
- `setSideBySideMode()`: Displays original content in iframe alongside generated content
- `setOverlayMode()`: Shows only generated content in full screen
- `setNormalMode()`: Returns to original website view

**HTML Generator (htmlGenerator.js):**
- `generateOverlayHTML(originalHTML)`: Generates complete HTML with inline CSS based on original content
- `extractTitle(html)`: Extracts page title for context
- `getOriginalHTML()`: Retrieves the original page HTML

### Styling Approach

- Fixed positioning for toggle button to ensure always visible
- High z-index values to stay above page content
- CSS transitions for smooth show/hide animations
- Responsive design with media queries for mobile devices

## LLM Integration Ready

The extension is designed for easy LLM integration:

### Current Implementation
- `htmlGenerator.js` contains a `generateOverlayHTML()` function that takes the original page HTML as input
- Returns complete HTML with inline CSS styling
- Currently generates a static "Hello World" page with page context

### Future LLM Integration
To integrate with an LLM:
1. Replace the content of `generateOverlayHTML()` function in `htmlGenerator.js`
2. Send the `originalHTML` parameter to your LLM API
3. Return the LLM-generated HTML response
4. The extension will automatically display the generated content

### Example LLM Integration:
```javascript
async function generateOverlayHTML(originalHTML) {
  const response = await fetch('your-llm-api-endpoint', {
    method: 'POST',
    body: JSON.stringify({
      original_html: originalHTML,
      task: 'generate_improved_page'
    })
  });
  
  const result = await response.json();
  return result.generated_html;
}
```

## Browser Compatibility

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Other Chromium-based browsers
