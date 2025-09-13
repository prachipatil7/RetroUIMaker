/**
 * Creates a copy of DOM elements with appropriate event handlers
 * @param {NodeList|Array} domElements - List of DOM elements to duplicate
 * @returns {Array} Array of duplicated DOM elements
 */
function createCopy(domElements) {
    const duplicatedElements = [];
    
    // Convert NodeList to Array if needed
    const elementsArray = Array.from(domElements);
    
    elementsArray.forEach(originalElement => {
        // Create a new element of the same type
        const newElement = document.createElement(originalElement.tagName.toLowerCase());
        
        // Copy only text content (no attributes)
        if (originalElement.textContent) {
            newElement.textContent = originalElement.textContent;
        }
        
        // Add appropriate event handlers based on element type and existing handlers
        addEventHandlers(originalElement, newElement);
        
        duplicatedElements.push(newElement);
    });
    
    return duplicatedElements;
}

/**
 * Adds appropriate event handlers to the new element based on the original element
 * @param {Element} originalElement - The original DOM element
 * @param {Element} newElement - The new DOM element to add handlers to
 */
function addEventHandlers(originalElement, newElement) {
    const tagName = originalElement.tagName.toLowerCase();
    
    // Check if original element has any event handlers
    const hasOnClick = originalElement.onclick !== null || originalElement.hasAttribute('onclick');
    const hasOnChange = originalElement.onchange !== null || originalElement.hasAttribute('onchange');
    
    // Get selector from original element (assuming it has a selector property)
    const selector = originalElement.selector || '';
    
    // Add handlers based on element type
    if (tagName === 'button') {
        // Buttons must have onclick handler
        newElement.onclick = function() {
            // Send message to parent window to click element in original iframe
            parent.postMessage({
                type: 'CLICK_ELEMENT',
                selector: selector
            }, '*');
        };
    } else if (tagName === 'input') {
        // Inputs must have onchange handler
        newElement.onchange = function() {
            // Send message to parent window to change element in original iframe
            parent.postMessage({
                type: 'CHANGE_ELEMENT',
                selector: selector
            }, '*');
        };
    } else {
        // For other elements, copy existing handlers
        if (hasOnClick) {
            newElement.onclick = function() {
                // Send message to parent window to click element in original iframe
                parent.postMessage({
                    type: 'CLICK_ELEMENT',
                    selector: selector
                }, '*');
            };
        }
        
        if (hasOnChange) {
            newElement.onchange = function() {
                // Send message to parent window to change element in original iframe
                parent.postMessage({
                    type: 'CHANGE_ELEMENT',
                    selector: selector
                }, '*');
            };
        }
    }
}

// Export the function for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createCopy, addEventHandlers };
}
