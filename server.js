import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// Pricing table per 1M tokens (USD)
export const MODEL_PRICING = {
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'openai',
    inputPerMillion: 0.15,
    outputPerMillion: 0.60,
    description: 'Fast, highly cost-effective model (recommended)'
  },
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai',
    inputPerMillion: 2.50,
    outputPerMillion: 10.00,
    description: 'Flagship omni model with high intelligence'
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    inputPerMillion: 0.50,
    outputPerMillion: 1.50,
    description: 'Legacy compact model'
  },
  'meta-llama/llama-3.2-3b-instruct:free': {
    name: 'Llama 3.2 3B Instruct (Free)',
    provider: 'openrouter',
    inputPerMillion: 0.00,
    outputPerMillion: 0.00,
    description: 'OpenRouter Free Model (no billing required)'
  }
};

function getEffectiveKey(clientKey = '') {
  if (clientKey && typeof clientKey === 'string' && clientKey.trim()) {
    return clientKey.trim();
  }
  return (process.env.OPENAI_API_KEY || process.env.API_KEY || process.env.OPENROUTER_API_KEY || '').trim();
}

function maskKey(key) {
  if (!key) return null;
  if (key.length <= 12) return '***';
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

function calculateCost(model, promptTokens, completionTokens) {
  const pricing = MODEL_PRICING[model] || {
    inputPerMillion: 0.15,
    outputPerMillion: 0.60
  };

  const inputRate = pricing.inputPerMillion / 1_000_000;
  const outputRate = pricing.outputPerMillion / 1_000_000;

  const inputCost = promptTokens * inputRate;
  const outputCost = completionTokens * outputRate;
  const totalCost = inputCost + outputCost;

  return {
    pricing,
    rates: {
      inputRatePerToken: inputRate,
      outputRatePerToken: outputRate,
      inputRatePerMillion: pricing.inputPerMillion,
      outputRatePerMillion: pricing.outputPerMillion
    },
    inputCost,
    outputCost,
    totalCost,
    formatted: {
      inputCostUSD: `$${inputCost.toFixed(6)}`,
      outputCostUSD: `$${outputCost.toFixed(6)}`,
      totalCostUSD: `$${totalCost.toFixed(6)}`,
      formulaString: `(${promptTokens} × $${pricing.inputPerMillion}/1M) + (${completionTokens} × $${pricing.outputPerMillion}/1M) = $${totalCost.toFixed(6)}`
    }
  };
}

async function handleChatRequest(req, res) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  let parsed;
  try {
    parsed = JSON.parse(body || '{}');
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid JSON body' }));
  }

  const {
    systemPrompt = 'You are a helpful assistant.',
    userMessage = 'Hello!',
    model = 'gpt-4o-mini',
    customKey = '',
    temperature = 0.7,
    isDemo = false
  } = parsed;

  const apiKey = getEffectiveKey(customKey);

  // If user requested demo simulation mode
  if (isDemo) {
    const startTime = Date.now();
    await new Promise(r => setTimeout(r, 600)); // realistic latency
    const durationMs = Date.now() - startTime;

    let demoContent = '';
    if (systemPrompt.toLowerCase().includes("coffee") || userMessage.toLowerCase().includes("coffee")) {
      demoContent = "Here are 3 catchy slogans for your coffee shop:\n1. 'Warmth & Grain — your daily comfort in every cup.'\n2. 'Where every sip feels like home.'\n3. 'Awaken your morning with real passion.'";
    } else if (systemPrompt.toLowerCase().includes("summary") || userMessage.toLowerCase().includes("summary")) {
      demoContent = "Key takeaways:\n• LLMs split input and output text into smaller chunks called tokens.\n• Pricing is billed separately for input and output tokens per 1 million.\n• GPT-4o Mini is one of the most cost-effective and fast models for everyday tasks.";
    } else {
      demoContent = `Hello! The model successfully processed your prompt.\nSystem role: "${systemPrompt}"\nUser query: "${userMessage}"\nThis simulated response demonstrates token counting and cost calculation.`;
    }

    const promptTokens = Math.max(12, Math.ceil((systemPrompt.length + userMessage.length) / 3.5));
    const completionTokens = Math.max(25, Math.ceil(demoContent.length / 3.5));
    const totalTokens = promptTokens + completionTokens;

    const costAnalysis = calculateCost(model, promptTokens, completionTokens);

    const result = {
      success: true,
      isDemo: true,
      timestamp: new Date().toISOString(),
      durationMs,
      modelUsed: `${model} (Demo Simulation)`,
      sent: {
        endpoint: 'https://api.openai.com/v1/chat/completions (Simulated)',
        systemPrompt,
        userMessage,
        payload: {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature
        }
      },
      received: {
        id: `demo-chatcmpl-${Date.now()}`,
        content: demoContent,
        finishReason: 'stop'
      },
      tokens: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      cost: costAnalysis,
      rawResponse: {
        id: `demo-chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: demoContent },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens
        }
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  if (!apiKey) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'API key is missing',
      details: 'Please define OPENAI_API_KEY in .env or enter it in the UI.'
    }));
  }

  const isOpenRouter = apiKey.startsWith('sk-or-') || model.includes('/');
  const endpoint = isOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const requestPayload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature
  };

  const startTime = Date.now();

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    if (isOpenRouter) {
      headers['HTTP-Referer'] = 'http://localhost:3000';
      headers['X-Title'] = 'LLM API Call Demo';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload)
    });

    const durationMs = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      const status = response.status;
      const errorMsg = data?.error?.message || response.statusText || 'Unknown error occurred';
      const errorCode = data?.error?.code || 'api_error';

      let userFriendlyHint = '';
      if (status === 429 && (errorCode === 'credit_balance_exhausted' || errorMsg.includes('credits') || errorMsg.includes('quota'))) {
        userFriendlyHint = 'Your OpenAI account has insufficient credits (billing setup is required at https://platform.openai.com/settings/organization/billing). You can also test with a free model.';
      } else if (status === 401) {
        userFriendlyHint = 'Invalid API key. Please check the OPENAI_API_KEY in your .env file.';
      }

      res.writeHead(status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: false,
        status,
        error: errorMsg,
        errorCode,
        userFriendlyHint,
        durationMs,
        sent: {
          endpoint,
          payload: requestPayload
        },
        rawResponse: data
      }));
    }

    const usage = data.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    };

    const costAnalysis = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);
    const assistantMessage = data.choices?.[0]?.message?.content || '';

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      modelUsed: data.model || model,
      sent: {
        endpoint,
        systemPrompt,
        userMessage,
        payload: requestPayload
      },
      received: {
        id: data.id,
        content: assistantMessage,
        finishReason: data.choices?.[0]?.finish_reason || 'stop',
        rawChoice: data.choices?.[0]
      },
      tokens: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      cost: costAnalysis,
      rawResponse: data
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  } catch (error) {
    const durationMs = Date.now() - startTime;
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: false,
      error: error.message || 'Internal Server Error',
      durationMs
    }));
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API Routes
  if (req.method === 'GET' && pathname === '/api/config') {
    const effectiveKey = getEffectiveKey();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      hasEnvKey: Boolean(effectiveKey),
      maskedKey: maskKey(effectiveKey),
      defaultModel: 'gpt-4o-mini',
      models: MODEL_PRICING
    }));
  }

  if (req.method === 'POST' && pathname === '/api/chat') {
    return handleChatRequest(req, res);
  }

  // Serve static files from public/
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
