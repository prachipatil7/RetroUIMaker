# DOM Toggle Chrome Extension

A clean and well-organized Chrome extension that allows users to toggle between the original webpage content and a custom "Hello World" overlay.

## Features

- **Toggle Button**: Fixed position button at the top of any webpage
- **DOM Manipulation**: Wraps original content in a container for easy show/hide functionality
- **Smooth Transitions**: CSS transitions for a polished user experience
- **Responsive Design**: Works on both desktop and mobile viewports
- **Clean Architecture**: Object-oriented JavaScript with clear separation of concerns

## How It Works

1. **Initialization**: The extension injects a content script that runs on all web pages
2. **Content Marking**: Original page elements are marked with CSS classes for show/hide control
3. **Toggle Creation**: A toggle button is added at the top of the page
4. **Overlay System**: A "Hello World" overlay is created but initially hidden
5. **State Management**: Clicking the toggle switches between original content and overlay
6. **CSP Compliance**: Avoids moving DOM elements to prevent Content Security Policy violations

## File Structure

```
jank_chrome_extension/
├── manifest.json     # Extension configuration
├── content.js        # Main logic and DOM manipulation
├── styles.css        # Styling for toggle button and overlay
└── README.md         # This documentation
```

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `jank_chrome_extension` folder
4. The extension will be active on all websites

## Usage

1. Visit any website
2. You'll see a green "Toggle View" button at the top of the page
3. Click to switch to the "Hello World" overlay
4. Click "Show Original" to return to the original content
5. The toggle state persists until page refresh

## Technical Details

### Architecture

- **DOMToggleExtension Class**: Main class that encapsulates all functionality
- **Event-Driven**: Uses DOM events for user interactions
- **State Management**: Tracks toggle state and manages visibility
- **CSS Classes**: Uses class-based show/hide for smooth transitions

### Key Methods

- `init()`: Initializes the extension and waits for DOM ready
- `setupExtension()`: Creates all UI elements and sets up event listeners
- `markOriginalContent()`: Marks original DOM elements with CSS classes for control
- `toggleView()`: Switches between original content and overlay

### Styling Approach

- Fixed positioning for toggle button to ensure always visible
- High z-index values to stay above page content
- CSS transitions for smooth show/hide animations
- Responsive design with media queries for mobile devices

## Browser Compatibility

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Other Chromium-based browsers
