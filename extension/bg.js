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
    const key = 'your-api-key';
    
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
          max_tokens: 200
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
          model: 'claude-3-haiku-20240307',
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

function buildSimplifyPrompt(pageMeta, sections) {
  return `You are an expert UI designer creating a simplified, clean version of this webpage. Generate clean, minimal HTML that captures the essential content and functionality.

PAGE CONTEXT:
- Title: ${pageMeta.title}
- URL: ${pageMeta.url}
- Domain: ${pageMeta.hostname}
- Description: ${pageMeta.description}

PAGE ELEMENTS:
${sections.map(s => `- ${s.heading.toUpperCase()}: ${s.text.substring(0, 100)} ${s.selector ? `(selector: ${s.selector})` : ''}`).join('\n')}

TASK: Generate clean HTML for a simplified page view. Include:
1. Main headline/title
2. Key content and descriptions
3. Interactive elements (buttons, forms, search)
4. Important links
5. Clean, modern styling

REQUIREMENTS:
- Use semantic HTML5 elements
- Include inline CSS for styling (modern, clean design)
- For interactive elements, add data-selector attributes with the original selectors
- Use data-action="click" for buttons and links
- Use data-action="search" for search inputs
- Make it responsive and accessible
- Keep it concise but comprehensive
- Use modern CSS (flexbox, grid, etc.)

Return ONLY the HTML (no markdown, no code blocks):
<div class="simplified-page">
  <header class="page-header">
    <h1>Page Title</h1>
    <p class="description">Brief description</p>
  </header>
  
  <main class="page-content">
    <section class="search-section">
      <input type="text" data-selector="input[name=q]" data-action="search" placeholder="Search..." class="search-input">
      <button data-selector="button[type=submit]" data-action="click" class="search-btn">Search</button>
    </section>
    
    <section class="content-section">
      <h2>Main Content</h2>
      <p>Key information here...</p>
    </section>
    
    <section class="actions-section">
      <button data-selector="button.primary" data-action="click" class="btn-primary">Primary Action</button>
      <a href="#" data-selector="a.learn-more" data-action="click" class="btn-link">Learn More</a>
    </section>
  </main>
</div>

<style>
.simplified-page { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
.page-header { text-align: center; margin-bottom: 30px; }
.page-header h1 { color: #333; margin-bottom: 10px; }
.description { color: #666; font-size: 16px; }
.search-section { display: flex; gap: 10px; margin-bottom: 30px; }
.search-input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; }
.search-btn, .btn-primary { padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; }
.btn-link { color: #007bff; text-decoration: none; padding: 12px 24px; border: 1px solid #007bff; border-radius: 6px; display: inline-block; }
.content-section { margin-bottom: 30px; }
.content-section h2 { color: #333; margin-bottom: 15px; }
.content-section p { color: #666; line-height: 1.6; }
.actions-section { display: flex; gap: 15px; flex-wrap: wrap; }
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
