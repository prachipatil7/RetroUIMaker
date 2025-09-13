// Service worker for Page Replacer extension
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "REPLACER_ACTION", action: "toggle" });
});

// LLM API handlers
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'LLM_PICK') {
    handleLlMPick(msg, sendResponse);
    return true; // async response
  }
  if (msg.type === 'LLM_SIMPLIFY') {
    handleLlMSimplify(msg, sendResponse);
    return true; // async response
  }
});

async function handleLlMPick(msg, sendResponse) {
  try {
    const { provider, task, candidates } = msg;
    const actualProvider = provider || 'openai';
    const key = 'YOUR_OPENAI_API_KEY_HERE';
    
    if (!key) {
      sendResponse({ error: 'No API key configured' });
      return;
    }

    const prompt = buildPickPrompt(task, candidates);
    let result;
    
    if (actualProvider === 'openai') {
      result = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-5',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 20000
        })
      }).then(r => r.json());
      
      if (result.error) {
        sendResponse({ error: result.error.message });
        return;
      }
      
      const content = result.choices?.[0]?.message?.content;
      const parsed = parsePickResponse(content);
      sendResponse(parsed);
    } else if (actualProvider === 'anthropic') {
      result = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3.7-sonnet-20250219',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        })
      }).then(r => r.json());
      
      if (result.error) {
        sendResponse({ error: result.error.message });
        return;
      }
      
      const content = result.content?.[0]?.text;
      const parsed = parsePickResponse(content);
      sendResponse(parsed);
    } else {
      sendResponse({ error: 'Unsupported provider' });
    }
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

async function handleLlMSimplify(msg, sendResponse) {
  try {
    const { provider, pageMeta, sections } = msg;
    const actualProvider = provider || 'openai';
    const key = 'YOUR_OPENAI_API_KEY_HERE';
    
    if (!key) {
      sendResponse({ error: 'No API key configured' });
      return;
    }

    const prompt = buildSimplifyPrompt(pageMeta, sections);
    console.log('Simplify prompt:', prompt);
    let result;
    
    if (actualProvider === 'openai') {
      console.log('Making OpenAI API call...');
      result = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500
        })
      }).then(r => r.json());
      
      console.log('OpenAI response:', result);
      
      if (result.error) {
        console.error('OpenAI error:', result.error);
        sendResponse({ error: result.error.message });
        return;
      }
      
      const content = result.choices?.[0]?.message?.content;
      console.log('OpenAI content:', content);
      const parsed = parseSimplifyResponse(content);
      console.log('Parsed response:', parsed);
      sendResponse(parsed);
    } else if (actualProvider === 'anthropic') {
      result = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        })
      }).then(r => r.json());
      
      if (result.error) {
        sendResponse({ error: result.error.message });
        return;
      }
      
      const content = result.content?.[0]?.text;
      const parsed = parseSimplifyResponse(content);
      sendResponse(parsed);
    } else {
      sendResponse({ error: 'Unsupported provider' });
    }
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

function buildPickPrompt(task, candidates) {
  return `You are given a list of DOM candidates. Choose the best selector(s) to ${task.goal || 'interact with the element'}.

Candidates:
${candidates.map((c, i) => `${i + 1}. ${c.tag}${c.id ? '#' + c.id : ''}${c.type ? '[' + c.type + ']' : ''} - "${c.text || c.placeholder || c.ariaLabel || ''}" (${c.selector})`).join('\n')}

Return JSON only:
{ "selector": "best_selector", "confidence": 0.8, "why": "brief explanation" }`;
}

function buildSimplifyPrompt(pageMeta, domData) {
  return `You are an expert UI designer creating a simplified, clean version of this webpage. Analyze the comprehensive DOM data and generate clean, minimal HTML that captures the essential content and functionality.

PAGE CONTEXT:
- Title: ${pageMeta.title}
- URL: ${pageMeta.url}
- Domain: ${pageMeta.hostname}
- Description: ${pageMeta.description}
- OG Title: ${pageMeta.ogTitle}
- OG Description: ${pageMeta.ogDescription}
- OG Image: ${pageMeta.ogImage}

COMPREHENSIVE DOM DATA:

HEADINGS (${domData.headings.length}):
${domData.headings.map(h => `- ${h.tag.toUpperCase()} (Level ${h.level}): "${h.text}" (${h.selector})`).join('\n')}

BUTTONS & INTERACTIVE ELEMENTS (${domData.buttons.length}):
${domData.buttons.map(b => `- ${b.tag.toUpperCase()}${b.type ? `[${b.type}]` : ''}: "${b.text}" (${b.selector}) ${b.role ? `[role=${b.role}]` : ''}`).join('\n')}

LINKS (${domData.links.length}):
${domData.links.slice(0, 20).map(l => `- "${l.text}" → ${l.href} (${l.selector}) ${l.isExternal ? '[EXTERNAL]' : ''}`).join('\n')}

FORM INPUTS (${domData.inputs.length}):
${domData.inputs.map(i => `- ${i.tag.toUpperCase()}[${i.type}]: "${i.placeholder}" (${i.selector}) ${i.required ? '[REQUIRED]' : ''}`).join('\n')}

IMAGES (${domData.images.length}):
${domData.images.map(img => `- "${img.alt || img.title || 'Image'}" → ${img.src} (${img.selector})`).join('\n')}

NAVIGATION (${domData.navigation.length}):
${domData.navigation.map(nav => `- Navigation: ${nav.links.map(l => `"${l.text}"`).join(', ')} (${nav.selector})`).join('\n')}

FORMS (${domData.forms.length}):
${domData.forms.map(f => `- Form [${f.method}]: ${f.inputs.map(i => i.type).join(', ')} (${f.selector})`).join('\n')}

CONTENT AREAS (${domData.content.length}):
${domData.content.map(c => `- ${c.tag.toUpperCase()}: "${c.text.substring(0, 100)}..." (${c.selector})`).join('\n')}

TASK: Generate clean, comprehensive HTML for a simplified page view. Create a complete interface that includes:

1. **Header Section**: Main title, description, key branding
2. **Search/Input Section**: All search inputs, forms, and primary actions
3. **Navigation Section**: Main navigation links and menus
4. **Content Section**: Key headings, text content, and images
5. **Action Section**: Important buttons, links, and interactive elements
6. **Footer Section**: Additional links and information

REQUIREMENTS:
- Use semantic HTML5 elements (header, main, section, nav, article, aside, footer)
- Include comprehensive inline CSS for modern, responsive design
- For ALL interactive elements, add data-selector attributes with the original selectors
- Use data-action="click" for buttons and links
- Use data-action="search" for search inputs
- Use data-action="input" for form inputs
- Make it fully responsive and accessible
- Include proper ARIA labels and roles
- Use modern CSS (flexbox, grid, CSS variables)
- Ensure all important functionality is preserved
- Create a clean, professional layout that works on any device

Return ONLY the complete HTML (no markdown, no code blocks):
<div class="simplified-page">
  <!-- Complete HTML structure here -->
</div>

<style>
/* Complete CSS here */
</style>`;
}

function parsePickResponse(content) {
  try {
    const json = JSON.parse(content);
    return {
      selector: json.selector,
      confidence: json.confidence || 0.5,
      rationale: json.why || 'LLM selected'
    };
  } catch (err) {
    return { error: 'Failed to parse LLM response', raw: content };
  }
}

function parseSimplifyResponse(content) {
  try {
    console.log('Received HTML content:', content);
    
    // Clean up the content - remove any markdown code blocks if present
    let html = content.trim();
    if (html.startsWith('```html')) {
      html = html.replace(/^```html\s*/, '').replace(/\s*```$/, '');
    } else if (html.startsWith('```')) {
      html = html.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    console.log('Cleaned HTML:', html);
    return { html: html };
  } catch (err) {
    console.error('HTML parse error:', err);
    console.error('Raw content that failed to parse:', content);
    return { error: 'Failed to parse LLM response', raw: content };
  }
}
