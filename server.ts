import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Please configure it in the Settings > Secrets panel.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Endpoint: Plan distinct coloring pages for a theme and child name
app.post('/api/plan-book', async (req, res) => {
  try {
    const {
      theme = 'space dinosaurs',
      childName = 'Little Explorer',
      userNotes = '',
      pageCount = 5,
      difficulty = 'standard',
    } = req.body;

    const validPageCount = Math.max(1, Math.min(12, Number(pageCount) || 5));
    const ai = getGenAI();

    let difficultyInstruction = '';
    if (difficulty === 'toddler') {
      difficultyInstruction = `CRITICAL DIFFICULTY REQUIREMENT: TODDLER (Ages 1-3) - "Simple thick lines for toddlers"
- Style: Ultra-simple, massive extra-thick chunky black outlines (very heavy stroke weight).
- Shapes: Giant, simple, highly recognizable shapes with huge open coloring areas.
- Clutter: Absolutely zero background clutter, zero tiny objects, zero intricate patterns, no crosshatching, no shading.
- Target: Extremely easy for toddlers to color with chunky crayons.
- Every scene's imagePrompt MUST start with: "Toddler coloring book page, simple thick lines for toddlers, ultra-bold heavy black outlines, giant open shapes for chunky crayons, zero clutter, minimal elements, pure white background, no shading, no thin lines..."`;
    } else if (difficulty === 'intricate') {
      difficultyInstruction = `CRITICAL DIFFICULTY REQUIREMENT: OLDER CHILDREN (Ages 8+) - "Intricate patterns for older children"
- Style: Intricate, detailed line art with complex decorative patterns, zentangle textures, and fine crisp outlines.
- Shapes: Elaborate compositions, rich geometric or floral fill patterns, ornate background scenes, decorative borders.
- Clutter: High detail density with lots of tiny distinct areas suitable for colored pencils or fine-tip markers.
- Every scene's imagePrompt MUST start with: "Intricate coloring book page for older children, intricate patterns for older children, detailed crisp black line art, decorative zentangles, ornate background scenery, pure white background, no shading, complex detailed coloring sections..."`;
    } else {
      difficultyInstruction = `CRITICAL DIFFICULTY REQUIREMENT: STANDARD / KIDS (Ages 4-7) - "Classic bold outlines"
- Style: Classic children's coloring book with clean, confident bold black outlines.
- Shapes: Clear, recognizable story scenes and characters, joyful expressions, balanced background elements, large open coloring regions.
- Every scene's imagePrompt MUST start with: "Children's coloring book page, bold crisp black outlines, pure white background, clear recognizable shapes, playful fun details, no shading, no gray fills, large coloring spaces for crayons and markers..."`;
    }

    const prompt = `You are an expert children's coloring book author and illustrator planner.
Create a personalized ${validPageCount}-page coloring book plan for a child named "${childName}" with the theme "${theme}".
Difficulty Level: ${difficulty.toUpperCase()}.
${difficultyInstruction}
${userNotes ? `Additional user instructions: ${userNotes}` : ''}

CRITICAL RULES:
1. Provide a catchy, joyful title (e.g. "${childName}'s ${theme} Adventure") and subtitle.
2. Provide a heartwarming dedication for ${childName}.
3. Create exactly ${validPageCount} distinct, sequential coloring book scenes that tell a mini adventure. Ensure each page depicts a clearly different, creative action or setting within the theme so the scenes are varied and exciting.
4. Each scene MUST have:
   - pageNumber (1 to ${validPageCount})
   - sceneTitle (short, playful title)
   - storyCaption (1-2 sentences of fun kid-friendly story text, rhyming or cheerful)
   - funFactOrTip (a creative suggestion for coloring, such as "Make the rocket fiery red!" or "Color the giant mushrooms glowing purple!", OR an entertaining kid-friendly fun fact about the theme, such as "Did you know T-Rex had tiny arms?" or "Did you know sea turtles can hold their breath underwater for hours?")
   - imagePrompt: Very detailed prompt engineered for black-and-white coloring book pages matching the difficulty level (${difficulty}). It MUST strictly follow the difficulty directive above and specify pure white background, no shading, no grayscale, no color fills.
5. Also provide a coverPrompt for the cover page illustration adhering to the ${difficulty} difficulty style.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bookTitle: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            dedication: { type: Type.STRING },
            coverPrompt: { type: Type.STRING },
            pages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pageNumber: { type: Type.INTEGER },
                  sceneTitle: { type: Type.STRING },
                  storyCaption: { type: Type.STRING },
                  funFactOrTip: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING },
                },
                required: ['pageNumber', 'sceneTitle', 'storyCaption', 'funFactOrTip', 'imagePrompt'],
              },
            },
          },
          required: ['bookTitle', 'subtitle', 'dedication', 'coverPrompt', 'pages'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, plan: parsed });
  } catch (error: any) {
    console.error('Error planning book:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate coloring book plan',
    });
  }
});

// Endpoint: Generate thick-line art image using gemini-3-pro-image-preview
app.post('/api/generate-image', async (req, res) => {
  try {
    const {
      prompt,
      imageSize = '1K', // "1K", "2K", or "4K"
      aspectRatio = '3:4', // 3:4 is standard portrait for printable pages
      difficulty = 'standard',
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGenAI();

    // Adjust prompt directives based on chosen difficulty
    let difficultyDirective = '';
    if (difficulty === 'toddler') {
      difficultyDirective = 'Style: Simple thick lines for toddlers. Ultra-bold massive chunky black outlines, giant open shapes for chunky crayons, minimal elements, zero clutter, zero fine lines, zero shading, pure clean white paper background.';
    } else if (difficulty === 'intricate') {
      difficultyDirective = 'Style: Intricate patterns for older children. Detailed fine black line art, complex decorative patterns, zentangle textures, ornate background scenery, intricate detailed coloring spaces for colored pencils, pure clean white paper background, zero shading or gray gradients.';
    } else {
      difficultyDirective = 'Style: Classic children\'s coloring book page. Crisp thick black ink outlines, clean lines, wide open coloring spaces, zero gray shading, zero halftone dots, pure clean white paper background.';
    }

    // Ensure the prompt enforces clean, printable black-and-white thick line art matching difficulty
    const enhancedPrompt = `${prompt}. ${difficultyDirective} Completely pure clean white paper background, absolutely zero gray shading, zero halftone dots, zero crosshatching, no grayscale, no color fills, high contrast black-and-white line drawing suitable for printing.`;

    const validSizes = ['1K', '2K', '4K'];
    const chosenSize = validSizes.includes(imageSize) ? imageSize : '1K';

    // Call gemini-3-pro-image-preview as required
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: (aspectRatio as any) || '3:4',
            imageSize: (chosenSize as any) || '1K',
          },
        },
      });
    } catch (primaryErr: any) {
      console.warn('gemini-3-pro-image-preview call encountered issue, attempting gemini-3.1-flash-image fallback:', primaryErr?.message);
      // Fallback to gemini-3.1-flash-image if pro image preview is not enabled or throttled
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: (aspectRatio as any) || '3:4',
            imageSize: (chosenSize as any) || '1K',
          },
        },
      });
    }

    // Extract image from parts
    const parts = response.candidates?.[0]?.content?.parts || [];
    let imageUrl = '';
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error('No image was returned by the Gemini image model.');
    }

    return res.json({
      success: true,
      imageUrl,
      resolution: chosenSize,
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate coloring page image',
    });
  }
});

// Endpoint: Multi-turn Chat with Gemini with role system instructions and model routing
app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages = [],
      model = 'gemini-3.5-flash',
      role = 'companion',
      context = {},
    } = req.body;

    const ai = getGenAI();

    // Select system instruction based on role
    let systemInstruction = `You are "ColorCraft Assistant", a friendly, enthusiastic, and highly creative children's book co-creator.
You help parents, educators, and children brainstorm coloring book themes, invent funny rhyming story captions, and craft imaginative black-and-white scene concepts.
Current context:
- Theme: ${context.theme || 'Not specified yet'}
- Child Name: ${context.childName || 'Little Artist'}

Guidelines:
- Keep your tone cheerful, warm, and inspiring.
- When suggesting coloring scenes, focus on clear, identifiable characters and thick-line art descriptions.
- If the user asks for a complete coloring book or a 5-page outline, provide a clear 5-step numbered list of scenes with short rhyming story lines!
- Format nicely with markdown bolding and bullet points.`;

    if (role === 'complex_storyteller') {
      systemInstruction += `\nYou are in Deep Story & Character Mastermind mode. Create rich, narrative-driven 5-part character arcs with engaging educational or whimsical morals suited for bedtime coloring.`;
    } else if (role === 'quick_sparks') {
      systemInstruction += `\nYou are in Quick Sparks mode. Give rapid, bulleted, punchy ideas and immediate creative suggestions without fluff.`;
    }

    // Model selection validation
    // gemini-3.1-pro-preview for complex tasks, gemini-3.5-flash for general, gemini-3.1-flash-lite for fast
    let selectedModel = 'gemini-3.5-flash';
    if (model === 'gemini-3.1-pro-preview' || role === 'complex_storyteller') {
      selectedModel = 'gemini-3.1-pro-preview';
    } else if (model === 'gemini-3.1-flash-lite' || role === 'quick_sparks') {
      selectedModel = 'gemini-3.1-flash-lite';
    } else if (model === 'gemini-3.5-flash') {
      selectedModel = 'gemini-3.5-flash';
    }

    // Convert multi-turn message history into contents array for Gemini
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }],
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({
      success: true,
      text: response.text || '',
      modelUsed: selectedModel,
    });
  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate chat response',
    });
  }
});

// Start server with Vite middleware in development or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Coloring Book Generator server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
