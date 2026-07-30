import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Only instantiate Prisma if the DATABASE_URL is set, to prevent crashing on boot without env vars
let prisma;
if (process.env.DATABASE_URL) {
  prisma = new PrismaClient();
}

let ai;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

app.use(cors());
// Increase payload limit to accommodate large CSV data sent as context
app.use(express.json({ limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    dbConnected: !!prisma, 
    aiConfigured: !!ai 
  });
});

// GET all chats
app.get('/api/chats', async (req, res) => {
  if (!prisma) return res.status(500).json({ error: 'Database not configured' });
  try {
    const chats = await prisma.chatSession.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET a specific chat with messages
app.get('/api/chats/:id', async (req, res) => {
  if (!prisma) return res.status(500).json({ error: 'Database not configured' });
  try {
    const chat = await prisma.chatSession.findUnique({
      where: { id: req.params.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE a new chat
app.post('/api/chats', async (req, res) => {
  if (!prisma) return res.status(500).json({ error: 'Database not configured' });
  try {
    const chat = await prisma.chatSession.create({
      data: { title: req.body.title || 'New Analysis' }
    });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a message to a chat
app.post('/api/chats/:id/messages', async (req, res) => {
  if (!prisma || !ai) return res.status(500).json({ error: 'Database or AI not configured' });
  
  const { content, fileContext } = req.body;
  const sessionId = req.params.id;

  try {
    // 1. Save user message to DB
    await prisma.chatMessage.create({
      data: { sessionId, role: 'user', content }
    });

    // 2. Fetch recent chat history to provide context to Gemini
    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10 // only take the last 10 messages for context window limit
    });

    // 3. Format history for Gemini
    // We append the fileContext (parsed CSV) into the prompt if provided.
    let systemPrompt = `You are a helpful data analysis assistant. You help users understand their datasets.
If the user explicitly asks for a specific chart type (Pie, Bar, Line), you MUST output the chart data strictly as JSON wrapped in a markdown code block EXACTLY like this:
\`\`\`chart-spec
{ "type": "bar", "title": "Chart Title", "xKey": "Category", "yKey": "Value", "data": [ { "Category": "A", "Value": 10 } ] }
\`\`\`
Do NOT output CSV if a chart is requested. Aggregate the data logically into a max of 15 items suitable for a chart. IMPORTANT: If the dataset uses abbreviations, acronyms, or short codes for categories (e.g., "C + I"), you MUST expand them into their full, descriptive names in the chart data so new users can understand the definitions.

For Multi-file Joins: When generating a transformation function (e.g. \`\`\`transform_dataset\`), if you see multiple datasets in the context, output a function that takes a \`datasets\` dictionary object. Example:
\`\`\`transform_dataset
(datasets) => {
  const users = datasets['users.csv'].fullData;
  const purchases = datasets['purchases.csv'].fullData;
  // join logic...
  return joinedArray;
}
\`\`\`
`;
    if (fileContext) {
      systemPrompt += `\n\nThe user has provided the following data as context for their question:\n\`\`\`json\n${JSON.stringify(fileContext).substring(0, 50000)}\n\`\`\``;
    }    // Format chat history for Gemini (excluding the most recent user message as we send it as the prompt)
    const contents = [];
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: "Understood. I will help analyze the provided data." }] });
    }

    for (let i = 0; i < history.length - 1; i++) {
      const msg = history[i];
      contents.push({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    // 4. Send request to Gemini
    // In @google/genai, we use `ai.models.generateContent`
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...contents,
        { role: 'user', parts: [{ text: content }] }
      ]
    });

    const aiMessage = response.text;

    // 5. Save AI response to DB
    const savedMessage = await prisma.chatMessage.create({
      data: { sessionId, role: 'ai', content: aiMessage }
    });

    res.json(savedMessage);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Proxy AI requests to keep API keys secure on the server
app.post('/api/ai/proxy', async (req, res) => {
  const { provider, endpoint, payload, extraHeaders } = req.body;
  
  if (!provider || !endpoint || !payload) {
    return res.status(400).json({ error: 'Missing provider, endpoint, or payload' });
  }

  try {
    let key = '';
    let fetchUrl = endpoint;
    const fetchHeaders = {
      'Content-Type': 'application/json',
      ...extraHeaders
    };

    switch (provider) {
      case 'Gemini':
        key = process.env.GEMINI_API_KEY;
        if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        fetchUrl = `${endpoint}?key=${key}`;
        break;
      case 'Groq':
        key = process.env.GROQ_API_KEY;
        if (!key) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
        fetchHeaders['Authorization'] = `Bearer ${key}`;
        break;
      case 'OpenRouter':
        key = process.env.OPENROUTER_API_KEY;
        if (!key) return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
        fetchHeaders['Authorization'] = `Bearer ${key}`;
        break;
      case 'Cerebras':
        key = process.env.CEREBRAS_API_KEY;
        if (!key) return res.status(500).json({ error: 'CEREBRAS_API_KEY not configured' });
        fetchHeaders['Authorization'] = `Bearer ${key}`;
        break;
      case 'SambaNova':
        key = process.env.SAMBANOVA_API_KEY;
        if (!key) return res.status(500).json({ error: 'SAMBANOVA_API_KEY not configured' });
        fetchHeaders['Authorization'] = `Bearer ${key}`;
        break;
      case 'HuggingFace':
        key = process.env.HF_API_KEY;
        if (!key) return res.status(500).json({ error: 'HF_API_KEY not configured' });
        fetchHeaders['Authorization'] = `Bearer ${key}`;
        break;
      default:
        return res.status(400).json({ error: 'Unknown provider' });
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const aiResponse = await fetch(fetchUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(id);

    // If the provider fails, we return the status code and text so the client can fallback
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return res.status(aiResponse.status).send(errorText);
    }

    const data = await aiResponse.json();
    res.json(data);
  } catch (err) {
    console.error(`[AI Proxy Error] ${provider}:`, err);
    // Determine if it was a timeout
    if (err.name === 'AbortError') {
      return res.status(408).json({ error: 'Request timeout' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
