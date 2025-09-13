/**
 * Creates a copy of DOM elements with appropriate event handlers
 * @param {NodeList|Array} domElements - List of DOM elements to duplicate
 * @returns {Array} Array of duplicated DOM elements
 */
function createCopy(domElements) {
    const duplicatedElements = [];
    
    // Convert NodeList to Array if needed
    const elementsArray = domElements.elements;
    console.log('domElements', domElements);
    console.log('elementsArray', elementsArray);
    
    elementsArray.forEach(originalElement => {
        // Create a new element of the same type
        const newElement = document.createElement(originalElement.tag.toLowerCase());
        
        // Copy text content
        if (originalElement.textContent) {
            newElement.textContent = originalElement.textContent;
        }
        
        // Copy all attributes except "class"
        if (originalElement) {
            Object.keys(originalElement).forEach(attrName => {

                if (attrName !== 'class') {
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
    const tagName = originalElement.tag.toLowerCase();
    
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
