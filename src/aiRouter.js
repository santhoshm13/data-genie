// AI Router implementation
// Supports fallback across multiple providers if rate limits (429) or timeouts occur.

const fetchWithTimeout = async (resource, options = {}) => {
  const { timeout = 15000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
};

// --- Provider Adapters ---

const callProxy = async (provider, endpoint, payload, extraHeaders = {}) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  const res = await fetchWithTimeout(`${backendUrl}/api/ai/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      endpoint,
      payload,
      extraHeaders
    })
  });

  if (!res.ok) throw res;

  const data = await res.json();
  
  if (provider === 'Gemini') {
    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    }
  } else {
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }
  }
  throw new Error(`No response from ${provider}`);
};




// --- Router Logic ---

const PROVIDERS = [
  {
    name: 'Gemini',
    call: async (sys, msgs, input) => {
      const historyContents = msgs.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      const apiContents = [...historyContents, { role: 'user', parts: [{ text: input || "Analyze the attached data." }] }];
      
      return callProxy(
        'Gemini',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          system_instruction: { parts: [{ text: sys }] },
          contents: apiContents
        }
      );
    }
  },
  {
    name: 'Groq',
    call: async (sys, msgs, input) => callProxy(
      'Groq',
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: sys },
          ...msgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: input || "Analyze the attached data." }
        ],
        temperature: 0.2
      }
    )
  },
  {
    name: 'OpenRouter',
    call: async (sys, msgs, input) => callProxy(
      'OpenRouter',
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: sys },
          ...msgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: input || "Analyze the attached data." }
        ],
        temperature: 0.2
      },
      {
        "HTTP-Referer": window.location.origin,
        "X-Title": "DataGenie AI Router"
      }
    )
  },
  {
    name: 'Cerebras',
    call: async (sys, msgs, input) => callProxy(
      'Cerebras',
      'https://api.cerebras.ai/v1/chat/completions',
      {
        model: 'llama3.1-8b',
        messages: [
          { role: 'system', content: sys },
          ...msgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: input || "Analyze the attached data." }
        ],
        temperature: 0.2
      }
    )
  },
  {
    name: 'SambaNova',
    call: async (sys, msgs, input) => callProxy(
      'SambaNova',
      'https://api.sambanova.ai/v1/chat/completions',
      {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [
          { role: 'system', content: sys },
          ...msgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: input || "Analyze the attached data." }
        ],
        temperature: 0.2
      }
    )
  },
  {
    name: 'HuggingFace',
    call: async (sys, msgs, input) => callProxy(
      'HuggingFace',
      'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct/v1/chat/completions',
      {
        model: 'meta-llama/Meta-Llama-3-8B-Instruct',
        messages: [
          { role: 'system', content: sys },
          ...msgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: input || "Analyze the attached data." }
        ],
        temperature: 0.2
      }
    )
  }
];

export const generateAIResponse = async (systemInstruction, messages, input) => {

  for (const provider of PROVIDERS) {
    try {
      console.log(`[AI Router] Attempting to generate response using ${provider.name}...`);
      const responseText = await provider.call(systemInstruction, messages, input);
      console.log(`[AI Router] Success with ${provider.name}`);
      return responseText;
    } catch (error) {
      console.warn(`[AI Router] ${provider.name} failed:`, error);

      let status = null;
      if (error instanceof Response) {
        status = error.status;
      } else if (error.name === 'AbortError') {
        status = 408; // Timeout
      }

      // 401 Unauthorized or 400 Bad Request usually mean permanent failure (bad key or bad payload)
      // We should only fallback on rate limits (429), timeouts, or server errors (5xx)
      if (status === 401 || status === 403 || status === 400) {
        console.error(`[AI Router] Permanent error with ${provider.name} (${status}). Skipping fallback.`);
        // Continue to try other configured providers in case only one key is broken
        continue;
      }

      // Temporary errors - safe to fallback
      if (status === 429 || status === 408 || (status >= 500 && status < 600)) {
        console.log(`[AI Router] Temporary error (${status}) encountered with ${provider.name}. Falling back to next provider...`);
        continue;
      }

      // If it's a fetch network error (e.g., DNS failure, CORS), also try to fallback
      if (error instanceof TypeError) {
        console.log(`[AI Router] Network error encountered with ${provider.name}. Falling back to next provider...`);
        continue;
      }
    }
  }

  // If we exhaust the entire list or no keys were available
  throw new Error("ALL_PROVIDERS_FAILED");
};


