/**
 * Creates a copy of DOM elements with appropriate event handlers
 * @param {NodeList|Array} domElements - List of DOM elements to duplicate
 * @returns {Array} Array of duplicated DOM elements
 */
function createCopy(domElements) {
    const duplicatedElements = [];
    
    // Handle different input formats
    let elementsArray = [];
    
    if (Array.isArray(domElements)) {
        // Direct array of elements
        elementsArray = domElements;
        console.log('createCopy: Received direct array with', elementsArray.length, 'elements');
    } else if (domElements && typeof domElements === 'object') {
        // Object with array properties (legacy format)
        for (const key in domElements) {
            if (Array.isArray(domElements[key])) {
                elementsArray = elementsArray.concat(domElements[key]);
            }
        }
        console.log('createCopy: Extracted from object, found', elementsArray.length, 'elements');
    } else {
        console.warn('createCopy: Invalid input format:', typeof domElements, domElements);
        return [];
    }
    
    console.log('domElements input:', domElements);
    console.log('elementsArray processed:', elementsArray);
    
    elementsArray.forEach(originalElement => {
        const tagName = originalElement.tag?.toLowerCase();
        const inputType = originalElement.type;
        
        if (!tagName) {
            console.warn('createCopy: Element missing tag property:', originalElement);
            return;
        }
        
        // Convert input buttons, submit buttons, and links to button elements
        // Also convert elements with role="button"
        const shouldRenderAsButton = tagName === 'button' || 
                                   tagName === 'a' || 
                                   (tagName === 'input' && (inputType === 'button' || inputType === 'submit')) ||
                                   (originalElement.role === 'button');
        
        console.log('Button conversion check:', {
            tagName,
            inputType,
            originalElementType: originalElement.type,
            originalElementRole: originalElement.role,
            shouldRenderAsButton,
            isInputButton: tagName === 'input' && (inputType === 'button' || inputType === 'submit'),
            hasButtonRole: originalElement.role === 'button'
        });
        
        // Create a new element - render clickable elements as buttons
        const newElement = shouldRenderAsButton ? 
                          document.createElement('button') : 
                          document.createElement(tagName);
        
        // Get appropriate text content based on element type
        let textContent = originalElement.text || originalElement.textContent;
        
        console.log('Processing element:', {
            tag: tagName,
            originalText: originalElement.text,
            originalTextContent: originalElement.textContent,
            originalValue: originalElement.value,
            originalLabel: originalElement.label,
            finalTextContent: textContent,
            shouldRenderAsButton: shouldRenderAsButton
        });
        
        // For input elements, use value as primary text source
        if (tagName === 'input' && originalElement.value) {
            textContent = originalElement.value;
            console.log('Updated textContent for input:', textContent);
        }
        
        // Special handling for inputs with role="button" that are being converted
        if (shouldRenderAsButton && tagName === 'input' && originalElement.role === 'button') {
            if (!textContent) {
                textContent = originalElement.value || originalElement.title || originalElement.alt;
                console.log('Using input button fallback text:', textContent);
            }
        }
        
        // For links that are being converted to buttons, try multiple text sources
        if (shouldRenderAsButton && tagName === 'a') {
            // Try different properties to get text content
            if (!textContent) {
                textContent = originalElement.innerText || 
                            originalElement.innerHTML || 
                            originalElement.title || 
                            originalElement.alt ||
                            originalElement.name;
                console.log('Using fallback text for link:', textContent);
            }
            
            // Clean up HTML tags if innerHTML was used
            if (textContent && textContent.includes('<')) {
                textContent = textContent.replace(/<[^>]*>/g, '').trim();
                console.log('Cleaned HTML from text:', textContent);
            }
            
            if (originalElement.href) {
                newElement.setAttribute('title', `Link: ${originalElement.href}`);
                newElement.setAttribute('data-original-href', originalElement.href);
            }
        }
        
        // If we still don't have text content, try the label as fallback
        if (!textContent && originalElement.label) {
            textContent = originalElement.label;
            console.log('Using label as text content:', textContent);
        }
        
        // Clean and set the text content
        if (textContent) {
            // Trim whitespace and normalize
            textContent = textContent.trim();
            if (textContent) {
                newElement.textContent = textContent;
                console.log('Set button text to:', textContent);
            } else {
                // Text was all whitespace
                newElement.textContent = shouldRenderAsButton ? '[Button]' : '[Element]';
                console.log('Used fallback text for empty content');
            }
        } else {
            // No text content found at all
            if (shouldRenderAsButton) {
                newElement.textContent = tagName === 'a' ? '[Link]' : '[Button]';
                console.log('Used fallback text for missing content:', newElement.textContent);
            }
            console.warn('No text content found for element:', originalElement);
        }
        
        // Copy relevant attributes from filtered element
        if (originalElement.id) {
            newElement.id = originalElement.id;
        }
        
        if (originalElement.label) {
            newElement.setAttribute('aria-label', originalElement.label);
        }
        
        // For form elements that are NOT converted to buttons, preserve important attributes
        if (tagName === 'input' && !shouldRenderAsButton) {
            if (originalElement.type) {
                newElement.type = originalElement.type;
            }
            if (originalElement.value) {
                newElement.value = originalElement.value;
            }
            if (originalElement.placeholder) {
                newElement.placeholder = originalElement.placeholder;
            }
            if (originalElement.name) {
                newElement.name = originalElement.name;
            }
        }
        
        // Add button styling class for converted elements
        if (shouldRenderAsButton) {
            newElement.classList.add('retro-button');
            // Store original element type for reference
            newElement.setAttribute('data-original-type', tagName);
            if (tagName === 'input') {
                newElement.setAttribute('data-original-input-type', inputType);
            }
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
    
    // Get the full selector from original element
    const fullSelector = originalElement.selector || '';
    
    // Store the full selector as a property on the element (not as HTML attribute)
    newElement._fullSelector = fullSelector;
    
    // Create a shortened selector for display purposes only
    let displaySelector = fullSelector;
    if (fullSelector.length > 100) {
        const parts = fullSelector.split(' > ');
        const lastPart = parts[parts.length - 1];
        displaySelector = lastPart || fullSelector.substring(0, 100) + '...';
        console.log('Using shortened display selector:', displaySelector);
    }
    
    // Store the shortened selector in data-selector for display
    newElement.setAttribute('data-selector', displaySelector);
    
    // Create a unique ID to map back to full selector after HTML conversion
    const elementId = 'elem-' + Math.random().toString(36).substr(2, 9);
    newElement.setAttribute('data-elem-id', elementId);
    
    // Store mapping in a global registry that survives HTML conversion
    if (!window.selectorRegistry) {
        window.selectorRegistry = new Map();
    }
    window.selectorRegistry.set(elementId, fullSelector);
    console.log('Stored in registry:', elementId, '->', fullSelector);
    
    // Add handlers based on what the element type is
    if (newTagName === 'button' || newTagName === 'a') {
        // Buttons and links get click handlers
        newElement.onclick = function() {
            // Get full selector from registry using element ID
            const elementId = this.getAttribute('data-elem-id');
            console.log('Element ID:', elementId);
            console.log('Registry exists:', !!window.selectorRegistry);
            console.log('Registry contents:', window.selectorRegistry);
            
            const registrySelector = window.selectorRegistry && window.selectorRegistry.get(elementId);
            const functionalSelector = registrySelector || this._fullSelector || this.getAttribute('data-selector');
            
            console.log('Registry selector:', registrySelector);
            console.log('Final functional selector:', functionalSelector);
            console.log('About to send CLICK_ELEMENT with selector:', JSON.stringify(functionalSelector));
            console.log('Selector length:', functionalSelector?.length);
            parent.postMessage({
                type: 'CLICK_ELEMENT',
                selector: functionalSelector
            }, '*');
            console.log('CLICK_ELEMENT sent');
        };
    } else if (newTagName === 'input' || newTagName === 'textarea') {
        // Form inputs get change handlers
        newElement.onchange = function() {
            // Get full selector from registry using element ID
            const elementId = this.getAttribute('data-elem-id');
            const functionalSelector = (window.selectorRegistry && window.selectorRegistry.get(elementId)) || 
                                     this._fullSelector || 
                                     this.getAttribute('data-selector');
            parent.postMessage({
                type: 'CHANGE_ELEMENT',
                selector: functionalSelector,
                value: this.value
            }, '*');
            console.log('CHANGE_ELEMENT', functionalSelector, this.value);
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
