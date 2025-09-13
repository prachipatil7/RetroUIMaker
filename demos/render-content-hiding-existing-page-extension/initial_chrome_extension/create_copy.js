/**
 * Creates a copy of DOM elements with appropriate event handlers
 * @param {NodeList|Array} domElements - List of DOM elements to duplicate
 * @returns {Array} Array of duplicated DOM elements
 */
function createCopy(domElements) {
    const duplicatedElements = [];
    
    // Convert NodeList to Array if needed
    // Collect all array values from domElements into a single flat array
    let elementsArray = [];
    for (const key in domElements) {
        if (Array.isArray(domElements[key])) {
            elementsArray = elementsArray.concat(domElements[key]);
        }
    }
    console.log('domElements', domElements);
    console.log('elementsArray', elementsArray);
    
    elementsArray.forEach(originalElement => {
        const tagName = originalElement.tag.toLowerCase();
        const inputType = originalElement.type;
        
        // Determine if this should be rendered as a button
        const shouldRenderAsButton = tagName === 'a' || 
                                   tagName === 'button' || 
                                   (tagName === 'input' && (inputType === 'button' || inputType === 'submit'));
        
        // Create a new element - render clickable elements as buttons
        const newElement = shouldRenderAsButton ? 
                          document.createElement('button') : 
                          document.createElement(tagName);
        
        // Copy text content
        if (originalElement.textContent) {
            newElement.textContent = originalElement.textContent;
        }
        
        // For input elements rendered as buttons, use value as text if no textContent
        if (shouldRenderAsButton && tagName === 'input' && originalElement.value && !originalElement.textContent) {
            newElement.textContent = originalElement.value;
        }
        
        if (originalElement) {
            Object.keys(originalElement).forEach(attrName => {
                // Skip selector and input-specific attributes when rendering as button
                if (attrName !== 'selector' && 
                    !(shouldRenderAsButton && ['type', 'value'].includes(attrName))) {
                    newElement[attrName] = originalElement[attrName];
                }
            });
        }
        
        // Add appropriate event handlers based on element type and existing handlers
        addEventHandlers(originalElement, newElement);

        console.log('newElement', newElement);
        
        duplicatedElements.push(newElement);
    });
    console.log('duplicatedElements', duplicatedElements);
    return duplicatedElements;
}

/**
 * Adds appropriate event handlers to the new element based on the original element
 * @param {Element} originalElement - The original DOM element
 * @param {Element} newElement - The new DOM element to add handlers to
 */
function addEventHandlers(originalElement, newElement) {
    const originalTagName = originalElement.tag.toLowerCase();
    const newTagName = newElement.tagName.toLowerCase();
    const inputType = originalElement.type;
    
    // Get selector from original element (assuming it has a selector property)
    const selector = originalElement.selector || '';
    
    // Store selector as data attribute for use in HTML onclick handlers
    newElement.setAttribute('data-selector', selector);
    
    // Add handlers based on what the new element is and what the original was
    if (newTagName === 'button') {
        // All elements rendered as buttons get click handlers
        newElement.onclick = function() {
            // Send message to parent window to click element in original iframe
            parent.postMessage({
                type: 'CLICK_ELEMENT',
                selector: selector
            }, '*');
            console.log('CLICK_ELEMENT', selector);
        };
    } else if (originalTagName === 'input' || originalTagName === 'textarea') {
        // Form inputs that are NOT rendered as buttons get change handlers
        newElement.onchange = function() {
            // Send message to parent window to change element in original iframe
            parent.postMessage({
                type: 'CHANGE_ELEMENT',
                selector: selector
            }, '*');
            console.log('CHANGE_ELEMENT', selector);
        };
    }
}

// Export the function for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createCopy, addEventHandlers };
} else {
    // Browser environment - attach to window for Chrome extension
    console.log('🔧 create_copy.js: Attaching functions to window');
    window.createCopy = createCopy;
    window.addEventHandlers = addEventHandlers;
    console.log('🔧 create_copy.js: Functions attached - createCopy:', typeof window.createCopy);
}
