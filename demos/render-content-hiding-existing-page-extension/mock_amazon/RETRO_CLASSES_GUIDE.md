# Retro UI CSS Classes Guide

## For LLM Prompting: How to Create Windows 95/98 Style Interfaces

When prompting the LLM to generate retro-style HTML, use these CSS classes to achieve an authentic classic Windows look.

---

## 🖼️ Layout & Structure

### Body & Main Container
```html
<body class="retro-body">
  <!-- All content goes here -->
</body>
```

### Windows
```html
<div class="retro-window">
  <div class="retro-window-header">
    <span>Window Title</span>
    <div>
      <button class="retro-button">_</button>
      <button class="retro-button">□</button>
      <button class="retro-button">×</button>
    </div>
  </div>
  <div class="retro-window-content">
    <!-- Window content -->
  </div>
</div>
```

### Panels & Groupboxes
```html
<div class="retro-panel">
  <!-- Panel content -->
</div>

<div class="retro-groupbox">
  <div class="retro-groupbox-title">Group Title</div>
  <!-- Group content -->
</div>
```

---

## 🎛️ Form Controls

### Buttons
```html
<button class="retro-button">OK</button>
<button class="retro-button retro-disabled" disabled>Disabled</button>
```

### Input Fields
```html
<input type="text" class="retro-input" placeholder="Enter text">
<textarea class="retro-textarea">Multi-line text</textarea>
```

### Checkboxes & Radio Buttons
```html
<input type="checkbox" class="retro-checkbox" id="check1">
<label for="check1" class="retro-label">Checkbox option</label>

<input type="radio" class="retro-radio" name="group" id="radio1">
<label for="radio1" class="retro-label">Radio option</label>
```

### Dropdowns
```html
<select class="retro-select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Form Layout
```html
<div class="retro-form-row">
  <label class="retro-form-label retro-label">Label:</label>
  <input type="text" class="retro-input retro-form-input">
</div>
```

---

## 🧩 Interface Elements

### Menu Bar
```html
<div class="retro-menubar">
  <span class="retro-menu-item">File</span>
  <span class="retro-menu-item">Edit</span>
  <span class="retro-menu-item">View</span>
  <span class="retro-menu-item">Help</span>
</div>
```

### Toolbar
```html
<div class="retro-toolbar">
  <div class="retro-toolbar-button">📁</div>
  <div class="retro-toolbar-button">💾</div>
  <div class="retro-toolbar-separator"></div>
  <div class="retro-toolbar-button">✂️</div>
</div>
```

### Status Bar
```html
<div class="retro-statusbar">
  Ready | Status information here
</div>
```

### Progress Bar
```html
<div class="retro-progressbar">
  <div class="retro-progressbar-fill" style="width: 60%;"></div>
</div>
```

---

## 📝 Typography

### Headings & Text
```html
<h1 class="retro-title">Main Title</h1>
<h2 class="retro-subtitle">Subtitle</h2>
<p class="retro-text">Regular text content</p>
<label class="retro-label">Form label</label>
```

---

## 📋 Lists & Tables

### List Box
```html
<div class="retro-listbox retro-scrollbar" style="height: 100px;">
  <div class="retro-list-item">Item 1</div>
  <div class="retro-list-item selected">Selected Item</div>
  <div class="retro-list-item">Item 3</div>
</div>
```

### Tables
```html
<table class="retro-table">
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
  </tbody>
</table>
```

---

## 💬 Dialogs

### Dialog Box
```html
<div class="retro-dialog">
  <div class="retro-window-header">
    <span>Dialog Title</span>
  </div>
  <div class="retro-window-content">
    <p class="retro-text">Dialog message content</p>
    <div class="retro-dialog-buttons">
      <button class="retro-button">OK</button>
      <button class="retro-button">Cancel</button>
    </div>
  </div>
</div>
```

---

## 🎨 Utility Classes

### States
```html
<element class="retro-disabled">Disabled state</element>
<element class="retro-selected">Selected state</element>
<element class="retro-focused">Focused state</element>
```

### Scrollbars
```html
<div class="retro-scrollbar" style="height: 200px; overflow-y: auto;">
  <!-- Scrollable content -->
</div>
```

### Icons
```html
<span class="retro-icon">📁</span>
<span class="retro-icon-large">💾</span>
```

---

## 🤖 LLM Prompting Guidelines

### Sample Prompt Structure:
```
Create a retro Windows 95 style interface for [purpose] using the following guidelines:

1. Use "retro-body" class for the body
2. Create windows with "retro-window" structure
3. Use appropriate form controls:
   - Buttons: "retro-button"
   - Inputs: "retro-input"
   - Labels: "retro-label"
4. Include a menu bar with "retro-menubar"
5. Add a toolbar with "retro-toolbar"
6. Use "retro-groupbox" for organized sections
7. Include a status bar at the bottom

Generate clean HTML without inline styles - only use the provided CSS classes.
```

### Common Interface Patterns:

#### Application Window
```html
<div class="retro-window">
  <div class="retro-window-header">
    <span>Application Name</span>
    <div>
      <button class="retro-button">_</button>
      <button class="retro-button">□</button>
      <button class="retro-button">×</button>
    </div>
  </div>
  <div class="retro-window-content">
    <div class="retro-menubar">...</div>
    <div class="retro-toolbar">...</div>
    <!-- Main content -->
    <div class="retro-statusbar">Ready</div>
  </div>
</div>
```

#### Settings Dialog
```html
<div class="retro-groupbox">
  <div class="retro-groupbox-title">Settings</div>
  <div class="retro-form-row">
    <label class="retro-form-label retro-label">Option:</label>
    <select class="retro-select retro-form-input">...</select>
  </div>
  <div class="retro-form-row">
    <input type="checkbox" class="retro-checkbox" id="enable">
    <label for="enable" class="retro-label">Enable feature</label>
  </div>
</div>
```

#### Data Entry Form
```html
<div class="retro-panel">
  <h2 class="retro-subtitle">User Information</h2>
  <div class="retro-form-row">
    <label class="retro-form-label retro-label">Name:</label>
    <input type="text" class="retro-input retro-form-input">
  </div>
  <div class="retro-form-row">
    <label class="retro-form-label retro-label">Email:</label>
    <input type="email" class="retro-input retro-form-input">
  </div>
  <div class="retro-form-row">
    <button class="retro-button">Save</button>
    <button class="retro-button">Cancel</button>
  </div>
</div>
```

---

## 📌 Important Notes for LLM

1. **No Inline Styles**: Never use `style=""` attributes - only CSS classes
2. **Classic Colors**: The theme uses classic Windows gray (#c0c0c0) background
3. **Button Text**: Use simple text, avoid modern icons in critical buttons
4. **Form Layout**: Use `retro-form-row` for consistent form spacing
5. **Window Structure**: Always include proper window headers and content divs
6. **Status Information**: Include status bars for application-like interfaces
7. **Authentic Feel**: Think Windows 95/98 - simple, functional, boxy design

This CSS framework will make any HTML look like a genuine retro Windows application!
