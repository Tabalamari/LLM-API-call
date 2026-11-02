const PRESETS = {
  slogan: {
    system: "You are a creative brand copywriter and marketer. Create concise, catchy, and memorable slogans for brands.",
    user: "Generate 3 catchy slogans for a cozy urban coffee shop named 'Warmth & Grain'."
  },
  summary: {
    system: "You are an expert analyst. Return exactly 3 concise bullet points summarizing the core takeaways.",
    user: "Large Language Models (LLMs) operate on Transformer architectures, processing text into small tokens. The API cost is determined by token count: input tokens (the prompt) and output tokens (the response) are billed at distinct rates per 1 million tokens."
  },
  code: {
    system: "You are a senior software engineer and mentor. Explain in simple terms what this line of code does and why it matters.",
    user: "const totalCost = (promptTokens * inputRate) + (completionTokens * outputRate);"
  },
  translator: {
    system: "You are a bilingual literary and technical translator. Translate naturally and idiomatically without robotic phrasing.",
    user: "Continuous learning and hands-on experimentation are the fastest path to mastering AI engineering."
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const envBadge = document.getElementById('env-status-badge');
  const envText = document.getElementById('env-status-text');
  const systemPromptEl = document.getElementById('system-prompt');
  const userPromptEl = document.getElementById('user-prompt');
  const systemCountEl = document.getElementById('system-prompt-count');
  const userCountEl = document.getElementById('user-prompt-count');
  const modelSelect = document.getElementById('model-select');
  const tempSlider = document.getElementById('temperature-input');
  const tempVal = document.getElementById('temp-val');
  const customKeyInput = document.getElementById('custom-api-key');
  const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
  const advancedSettings = document.getElementById('advanced-settings');
  const sendBtn = document.getElementById('send-btn');
  const btnSpinner = document.getElementById('btn-spinner');
  const btnIcon = document.getElementById('btn-send-icon');
  const btnText = document.getElementById('btn-text');

  // Result Elements
  const emptyState = document.getElementById('empty-state');
  const errorCard = document.getElementById('error-card');
  const errorTitle = document.getElementById('error-title');
  const errorMsg = document.getElementById('error-message');
  const errorHint = document.getElementById('error-action-hint');
  const resultsContainer = document.getElementById('results-container');
  const responseTimeBadge = document.getElementById('response-time-badge');
  const responseModelBadge = document.getElementById('response-model-badge');

  // Metrics
  const metricTotalCost = document.getElementById('metric-total-cost');
  const formulaDisplay = document.getElementById('formula-display');
  const statPromptTokens = document.getElementById('stat-prompt-tokens');
  const statPromptCost = document.getElementById('stat-prompt-cost');
  const statCompletionTokens = document.getElementById('stat-completion-tokens');
  const statCompletionCost = document.getElementById('stat-completion-cost');
  const statTotalTokens = document.getElementById('stat-total-tokens');
  const statSumCost = document.getElementById('stat-sum-cost');

  // Content
  const responseContentText = document.getElementById('response-content-text');
  const copyResponseBtn = document.getElementById('copy-response-btn');
  const sentEndpoint = document.getElementById('sent-endpoint');
  const sentSystemPreview = document.getElementById('sent-system-preview');
  const sentUserPreview = document.getElementById('sent-user-preview');
  const toggleJsonBtn = document.getElementById('toggle-json-btn');
  const rawJsonViewer = document.getElementById('raw-json-viewer');
  const jsonCodeBlock = document.getElementById('json-code-block');

  // Initialize Default Preset
  function applyPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;
    systemPromptEl.value = preset.system;
    userPromptEl.value = preset.user;
    updateCounts();
  }

  function updateCounts() {
    systemCountEl.textContent = `${systemPromptEl.value.length} characters`;
    userCountEl.textContent = `${userPromptEl.value.length} characters`;
  }

  systemPromptEl.addEventListener('input', updateCounts);
  userPromptEl.addEventListener('input', updateCounts);

  // Preset Buttons
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyPreset(chip.dataset.preset);
    });
  });

  // Settings Drawer Toggle
  toggleSettingsBtn.addEventListener('click', () => {
    const isCollapsed = advancedSettings.classList.toggle('collapsed');
    toggleSettingsBtn.setAttribute('aria-expanded', (!isCollapsed).toString());
  });

  // Temperature Slider
  tempSlider.addEventListener('input', () => {
    tempVal.textContent = tempSlider.value;
  });

  // Toggle JSON Viewer
  toggleJsonBtn.addEventListener('click', () => {
    const isCollapsed = rawJsonViewer.classList.toggle('collapsed');
    toggleJsonBtn.querySelector('span').textContent = isCollapsed ? 'Show JSON' : 'Hide JSON';
    toggleJsonBtn.setAttribute('aria-expanded', (!isCollapsed).toString());
  });

  // Copy Response
  copyResponseBtn.addEventListener('click', async () => {
    const text = responseContentText.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const span = copyResponseBtn.querySelector('span');
      const prevText = span.textContent;
      span.textContent = 'Copied! ✓';
      setTimeout(() => {
        span.textContent = prevText;
      }, 2000);
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  });

  // Check /api/config
  async function checkConfig() {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      if (data.hasEnvKey) {
        envBadge.className = 'badge badge-status';
        envBadge.innerHTML = `<span class="status-icon">✓</span> <span>Key in .env: ${data.maskedKey}</span>`;
      } else {
        envBadge.className = 'badge badge-status status-missing';
        envBadge.innerHTML = `<span class="status-icon">⚠️</span> <span>No key found in .env</span>`;
      }
    } catch (err) {
      envBadge.className = 'badge badge-status status-missing';
      envBadge.innerHTML = `<span class="status-icon">⚠️</span> <span>Configuration Error</span>`;
    }
  }

  const demoBtn = document.getElementById('demo-btn');

  // Unified Request Runner
  async function executeRequest({ isDemo = false } = {}) {
    const systemPrompt = systemPromptEl.value.trim();
    const userMessage = userPromptEl.value.trim();
    const model = modelSelect.value;
    const temperature = parseFloat(tempSlider.value);
    const customKey = customKeyInput.value.trim();

    if (!userMessage) {
      alert('Please enter a user message for the model.');
      userPromptEl.focus();
      return;
    }

    // Set UI Loading State
    sendBtn.disabled = true;
    if (demoBtn) demoBtn.disabled = true;
    btnSpinner.hidden = false;
    btnIcon.style.display = 'none';
    btnText.textContent = isDemo ? 'Simulating calculation...' : 'Calling LLM API...';

    emptyState.hidden = true;
    errorCard.hidden = true;
    resultsContainer.hidden = true;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemPrompt,
          userMessage,
          model,
          temperature,
          customKey,
          isDemo
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Display Error
        errorTitle.textContent = `Error ${data.status || response.status}: ${data.errorCode || 'API Error'}`;
        errorMsg.textContent = data.error || 'An unknown error occurred during the API call.';

        if (data.userFriendlyHint) {
          errorHint.hidden = false;
          errorHint.innerHTML = `
            <div>💡 <strong>Hint:</strong> ${data.userFriendlyHint}</div>
            <div style="margin-top: 10px;">
              <button id="inline-demo-btn" type="button" class="btn-subtle-sm" style="background: rgba(245, 158, 11, 0.2); color: #fef08a; border-color: rgba(245, 158, 11, 0.4);">
                ✨ Run in Demo Mode to view token counting and formula breakdown
              </button>
            </div>
          `;
          const inlineDemoBtn = document.getElementById('inline-demo-btn');
          if (inlineDemoBtn) {
            inlineDemoBtn.addEventListener('click', () => executeRequest({ isDemo: true }));
          }
        } else {
          errorHint.hidden = true;
        }

        errorCard.hidden = false;
        emptyState.hidden = true;
        resultsContainer.hidden = true;
        responseTimeBadge.hidden = true;
        responseModelBadge.hidden = true;
        return;
      }

      // Success Display
      responseTimeBadge.hidden = false;
      responseTimeBadge.textContent = `⚡ ${data.durationMs} ms`;

      responseModelBadge.hidden = false;
      responseModelBadge.textContent = data.modelUsed;

      // 1. Cost & Tokens
      metricTotalCost.textContent = data.cost.formatted.totalCostUSD;
      formulaDisplay.textContent = data.cost.formatted.formulaString;

      statPromptTokens.textContent = data.tokens.promptTokens.toLocaleString();
      statPromptCost.textContent = data.cost.formatted.inputCostUSD;

      statCompletionTokens.textContent = data.tokens.completionTokens.toLocaleString();
      statCompletionCost.textContent = data.cost.formatted.outputCostUSD;

      statTotalTokens.textContent = data.tokens.totalTokens.toLocaleString();
      statSumCost.textContent = data.cost.formatted.totalCostUSD;

      // 2. Response
      responseContentText.textContent = data.received.content || '(Empty response)';

      // 3. Sent Breakdown
      sentEndpoint.textContent = data.sent.endpoint;
      sentSystemPreview.textContent = data.sent.systemPrompt || '(No system prompt)';
      sentUserPreview.textContent = data.sent.userMessage;

      jsonCodeBlock.textContent = JSON.stringify(data, null, 2);

      resultsContainer.hidden = false;
    } catch (err) {
      errorTitle.textContent = 'Network Error';
      errorMsg.textContent = err.message || 'Could not connect to the backend server. Ensure "npm start" is running.';
      errorHint.hidden = true;
      errorCard.hidden = false;
    } finally {
      sendBtn.disabled = false;
      if (demoBtn) demoBtn.disabled = false;
      btnSpinner.hidden = true;
      btnIcon.style.display = 'block';
      btnText.textContent = 'Call LLM API';
    }
  }

  // Handle live API Call
  sendBtn.addEventListener('click', () => executeRequest({ isDemo: false }));

  // Handle Demo Simulation Call
  if (demoBtn) {
    demoBtn.addEventListener('click', () => executeRequest({ isDemo: true }));
  }

  // Start with default preset and config check
  applyPreset('slogan');
  checkConfig();
});
