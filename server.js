const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 6767;

// MegaLLM API Configuration
const MEGALLM_API_KEY = process.env.MEGALLM_API_KEY || '';
const MEGALLM_MODEL = process.env.MEGALLM_MODEL || 'claude-opus-4-5-20251101';
const MEGALLM_API_URL = process.env.MEGALLM_API_URL || 'https://api.anthropic.com/v1/messages';

// Validate API key on startup
if (!MEGALLM_API_KEY) {
  console.warn('⚠️  Warning: MEGALLM_API_KEY environment variable is not set.');
  console.warn('   Set it using: export MEGALLM_API_KEY=your-api-key');
}

// Rate limiting - limit API requests to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Helper function to call MegaLLM API (supports OpenAI-compatible and Anthropic formats)
async function callMegaLLM(messages, maxTokens = 8000) {
  if (!MEGALLM_API_KEY) {
    throw new Error('API key not configured. Set MEGALLM_API_KEY environment variable.');
  }
  
  try {
    // Detect API type based on URL - check that anthropic.com is the host
    const apiUrl = new URL(MEGALLM_API_URL);
    const isAnthropicFormat = apiUrl.hostname === 'api.anthropic.com';
    
    let requestBody, headers;
    
    if (isAnthropicFormat) {
      // Anthropic API format
      const systemMsg = messages.find(m => m.role === 'system');
      const userMsgs = messages.filter(m => m.role !== 'system');
      
      requestBody = {
        model: MEGALLM_MODEL,
        max_tokens: maxTokens,
        system: systemMsg?.content || '',
        messages: userMsgs.map(m => ({
          role: m.role,
          content: m.content
        }))
      };
      
      headers = {
        'x-api-key': MEGALLM_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      };
    } else {
      // OpenAI-compatible format (for MegaLLM and similar services)
      requestBody = {
        model: MEGALLM_MODEL,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.7
      };
      
      headers = {
        'Authorization': `Bearer ${MEGALLM_API_KEY}`,
        'Content-Type': 'application/json'
      };
    }
    
    const response = await axios.post(
      MEGALLM_API_URL,
      requestBody,
      {
        headers: headers,
        timeout: 120000
      }
    );
    
    // Handle different response formats
    if (isAnthropicFormat) {
      return response.data.content[0].text;
    } else {
      return response.data.choices[0].message.content;
    }
  } catch (error) {
    console.error('MegaLLM API Error:', error.response?.data || error.message);
    throw new Error(`API Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Generate presentation structure
async function generatePresentationStructure(topic) {
  const systemPrompt = `You are an expert presentation designer. Your task is to create a detailed, professional slideshow structure.

You MUST respond with ONLY valid JSON, no markdown, no explanations. The JSON structure should be:
{
  "title": "Main presentation title",
  "subtitle": "A compelling subtitle",
  "slides": [
    {
      "type": "title|content|comparison|chart|quote|image|conclusion",
      "title": "Slide title",
      "content": ["Bullet point 1", "Bullet point 2"],
      "notes": "Speaker notes",
      "chartData": { "type": "bar|line|pie|doughnut", "labels": [], "values": [], "label": "Dataset name" },
      "imageSearch": "search query for relevant image",
      "quote": { "text": "Quote text", "author": "Author name" },
      "leftColumn": { "title": "", "content": [] },
      "rightColumn": { "title": "", "content": [] }
    }
  ],
  "theme": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "backgroundColor": "#hex",
    "textColor": "#hex"
  }
}

Guidelines:
- Create 8-15 slides depending on topic complexity
- Use varied slide types to keep it engaging
- Include at least 2 charts with realistic data when relevant
- Add image search queries for visual slides
- Use professional, modern color schemes
- Include speaker notes for each slide
- Make content concise but informative`;

  const userPrompt = `Create a comprehensive, professional presentation about: "${topic}"

Make it visually engaging with charts, images, and varied layouts. Include realistic data for any charts. Make it presentation-ready.`;

  const response = await callMegaLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], 8000);

  // Parse JSON from response
  let jsonStr = response.trim();
  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  
  return JSON.parse(jsonStr.trim());
}

// Enhance presentation with AI-generated insights
async function enhancePresentation(presentation) {
  const systemPrompt = `You are enhancing a presentation. Review the content and add:
1. More detailed speaker notes
2. Transition suggestions between slides
3. Key takeaways for conclusion

Respond with ONLY valid JSON in this exact format:
{
  "enhancedSlides": [
    {
      "slideIndex": 0,
      "enhancedNotes": "Detailed speaker notes",
      "transition": "Suggested transition to next slide"
    }
  ],
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
}`;

  try {
    const response = await callMegaLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Enhance this presentation: ${JSON.stringify(presentation.slides.slice(0, 5))}` }
    ], 4000);

    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);

    const enhancements = JSON.parse(jsonStr.trim());
    
    // Apply enhancements
    enhancements.enhancedSlides.forEach(e => {
      if (presentation.slides[e.slideIndex]) {
        presentation.slides[e.slideIndex].enhancedNotes = e.enhancedNotes;
        presentation.slides[e.slideIndex].transition = e.transition;
      }
    });

    // Add key takeaways to conclusion slide
    if (enhancements.keyTakeaways) {
      presentation.keyTakeaways = enhancements.keyTakeaways;
    }

    return presentation;
  } catch (error) {
    console.log('Enhancement skipped:', error.message);
    return presentation;
  }
}

// API endpoint to generate presentation
app.post('/api/generate', apiLimiter, async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a topic' });
    }

    console.log(`Generating presentation for: ${topic}`);
    
    // Generate presentation structure
    const presentation = await generatePresentationStructure(topic);
    
    // Enhance with AI
    const enhancedPresentation = await enhancePresentation(presentation);
    
    // Add metadata
    enhancedPresentation.id = uuidv4();
    enhancedPresentation.createdAt = new Date().toISOString();
    enhancedPresentation.topic = topic;

    res.json(enhancedPresentation);
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate presentation' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: MEGALLM_MODEL });
});

// Serve main page (rate limited to prevent abuse)
const staticLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute for static files
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/', staticLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎨 AI Slideshow Generator running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Using model: ${MEGALLM_MODEL}`);
});
