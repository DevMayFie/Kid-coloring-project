import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  createThematicCoverSvg,
  buildThematicCoverAiPrompt,
  detectThemeCategory,
} from './src/utils/coverIllustrationGenerator';

dotenv.config();

const app = express();
const PORT = 3000;

// Respect Cloud Run / reverse-proxy X-Forwarded-For headers
app.set('trust proxy', 1);

app.use(express.json({ limit: '8mb' }));

// Per-IP rate limiter for heavy image generation (protecting Gemini Pro & Flash image quota)
const imageRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Limit each IP to 30 image requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Image generation rate limit reached. Please wait a few minutes before requesting more pages.',
  },
});

// Per-IP rate limiter for chat interactions (preventing proxy abuse)
const chatRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 40, // Limit each IP to 40 chat messages per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Chat message rate limit reached. Please wait a few minutes before sending more messages.',
  },
});

// Per-IP rate limiter for book storyboard planning
const planRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 25, // Limit each IP to 25 book plans per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Book planning rate limit reached. Please wait a few minutes before creating a new book.',
  },
});

function isSafetyOrBadRequestError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  const status = err?.status || err?.statusCode || 0;
  return (
    status === 400 ||
    msg.includes('safety') ||
    msg.includes('blocked') ||
    msg.includes('harmful') ||
    msg.includes('prohibited') ||
    msg.includes('violate') ||
    msg.includes('invalid argument') ||
    msg.includes('content policy')
  );
}

function sanitizeSafeString(str: any, maxLen = 100): string {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim().slice(0, maxLen);
}

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

// Project source export endpoint (creates a clean zip excluding node_modules and .git)
app.get('/api/download-project', (req, res) => {
  try {
    const zipPath = path.join('/tmp', 'project-source.zip');
    const pyScript = `
import zipfile, os
base_dir = '/app/applet'
zip_path = '/tmp/project-source.zip'
exclude_dirs = {'node_modules', '.git', 'dist', 'build', '.cache'}
exclude_files = {'.env', 'project-source.zip'}
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            if f in exclude_files:
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir)
            zipf.write(full_path, rel_path)
`;
    execSync(`python3 -c "${pyScript.replace(/"/g, '\\"')}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="coloring-book-studio-latest.zip"');
    const fileStream = fs.createReadStream(zipPath);
    fileStream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate project archive', details: err?.message });
  }
});

// Handler for both /api/plan-book and /api/generate-plan
const handlePlanBook: express.RequestHandler = async (req, res) => {
  try {
    const theme = sanitizeSafeString(req.body?.theme, 100) || 'space dinosaurs';
    const childName = sanitizeSafeString(req.body?.childName, 40) || 'Little Explorer';
    const customTitle = sanitizeSafeString(req.body?.customTitle, 100);
    const dedicationAuthor = sanitizeSafeString(req.body?.dedicationAuthor, 60);
    const userNotes = sanitizeSafeString(req.body?.userNotes, 250);
    const pageCount = req.body?.pageCount;
    const difficulty = req.body?.difficulty || 'standard';
    const activityMode = req.body?.activityMode || 'standard';
    const secondaryLanguage = sanitizeSafeString(req.body?.secondaryLanguage, 15);

    const validPageCount = Math.max(1, Math.min(12, Number(pageCount) || 5));
    const explicitTitle = typeof customTitle === 'string' ? customTitle.trim() : '';
    const cleanAuthor = typeof dedicationAuthor === 'string' ? dedicationAuthor.trim() : '';
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

    let activityInstruction = '';
    if (activityMode === 'color-by-numbers') {
      activityInstruction = `CRITICAL ACTIVITY MODE: COLOR-BY-NUMBERS
- For every page, design a distinct 4 to 6 color numbered palette legend (e.g., 1: Sky Blue, 2: Sun Yellow, 3: Grass Green, 4: Fire Red, etc.).
- In each scene's imagePrompt, explicitly specify: "Color by numbers coloring book page, numbered compartments with clear numbers (1, 2, 3, 4) in distinct coloring regions, bold crisp line art, pure white background, no shading, no gray fills..."
- Provide numberLegend for each page containing array of items with { number, colorName, hex }.`;
    } else if (activityMode === 'dot-to-dot') {
      activityInstruction = `CRITICAL ACTIVITY MODE: CONNECT-THE-DOTS (DOT-TO-DOT)
- In each scene's imagePrompt, explicitly specify: "Connect the dots puzzle coloring book page, sequential numbered dots 1 through 25 outlining the main character or object with clear dot circles and adjacent numbers, thick black lines for the rest of the scene, pure white background, no shading, kid-friendly activity puzzle..."`;
    }

    let languageInstruction = '';
    if (secondaryLanguage && secondaryLanguage !== 'en') {
      languageInstruction = `CRITICAL BILINGUAL STORY REQUIREMENT:
- The user requested bilingual captions in language code "${secondaryLanguage}" (e.g., Spanish, French, German, Japanese, Italian, etc.).
- For every page, in addition to the English storyCaption, provide "secondaryCaption" containing a beautiful, accurate, kid-friendly translation of the story caption in the requested language "${secondaryLanguage}".
- Also provide "secondaryTitle" for the book in "${secondaryLanguage}".`;
    }

    const prompt = `You are an expert children's coloring book author and illustrator planner.
Create a personalized ${validPageCount}-page coloring book plan for a child named "${childName}" with the theme "${theme}".
Difficulty Level: ${difficulty.toUpperCase()}.
Activity Mode: ${activityMode.toUpperCase()}.
${cleanAuthor ? `Book dedicated by: "${cleanAuthor}".` : ''}
${difficultyInstruction}
${activityInstruction}
${languageInstruction}
${userNotes ? `Additional user instructions: ${userNotes}` : ''}

CRITICAL RULES:
1. ${explicitTitle ? `PREFERRED BOOK TITLE OVERRIDE: The user has explicitly chosen the book title: "${explicitTitle}". You MUST use "${explicitTitle}" as the bookTitle.` : `Provide a catchy, joyful title (e.g. "${childName}'s ${theme} Adventure") and subtitle.`}
2. Provide a heartwarming dedication for ${childName}${cleanAuthor ? ` from ${cleanAuthor}` : ''}.
3. Create exactly ${validPageCount} distinct, sequential coloring book scenes that tell a mini adventure. Ensure each page depicts a clearly different, creative action or setting within the theme so the scenes are varied and exciting.
4. Each scene MUST have:
   - pageNumber (1 to ${validPageCount})
   - sceneTitle (short, playful title)
   - storyCaption (1-2 sentences of fun kid-friendly story text, rhyming or cheerful)
   - funFactOrTip (a creative suggestion for coloring, such as "Make the rocket fiery red!" or an entertaining kid-friendly fun fact)
   - imagePrompt: Very detailed prompt engineered for black-and-white coloring book pages matching the difficulty level (${difficulty}) and activity mode (${activityMode}). It MUST strictly follow the directives above and specify pure white background, no shading, no grayscale, no color fills.
5. Provide 'coverPrompt': Specifically design a simple, charming thematic children's coloring book COVER illustration based on the theme "${theme}" to accompany the child's name "${childName}". It must feature a delightful, simple central thematic character or mascot (for example, if space dinosaurs: a cute cartoon dinosaur in a bubble astronaut helmet floating in space beside a Saturn-ringed planet and smiling stars; for unicorns: a happy unicorn with a spiral horn, rainbow, and star sparkles). It MUST specify pure white background, thick bold black outlines, zero shading, no grayscale, no textures, and an open celebratory composition with framing space or a decorative banner ribbon for "${childName}".`;

    const schemaConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bookTitle: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          dedication: { type: Type.STRING },
          secondaryTitle: { type: Type.STRING },
          coverPrompt: { type: Type.STRING },
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pageNumber: { type: Type.INTEGER },
                sceneTitle: { type: Type.STRING },
                storyCaption: { type: Type.STRING },
                secondaryCaption: { type: Type.STRING },
                funFactOrTip: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
                numberLegend: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      number: { type: Type.INTEGER },
                      colorName: { type: Type.STRING },
                      hex: { type: Type.STRING },
                    },
                    required: ['number', 'colorName', 'hex'],
                  },
                },
              },
              required: ['pageNumber', 'sceneTitle', 'storyCaption', 'funFactOrTip', 'imagePrompt'],
            },
          },
        },
        required: ['bookTitle', 'subtitle', 'dedication', 'coverPrompt', 'pages'],
      },
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: schemaConfig,
      });
    } catch (primaryErr: any) {
      if (isSafetyOrBadRequestError(primaryErr)) {
        return res.status(400).json({
          success: false,
          error: 'This theme was flagged by content safety filters. Please try another kid-friendly theme.',
        });
      }
      console.warn('gemini-3.8-flash planning high demand / error, attempting fallback to gemini-3.1-flash-lite:', primaryErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: schemaConfig,
      });
    }

    const parsed = JSON.parse(response.text || '{}');
    if (explicitTitle) {
      parsed.bookTitle = explicitTitle;
    }
    // Return both formats so legacy or direct callers receive expected structure
    return res.json({
      success: true,
      plan: parsed,
      pages: parsed.pages || [],
      bookTitle: parsed.bookTitle,
      subtitle: parsed.subtitle,
      coverPrompt: parsed.coverPrompt,
    });
  } catch (error: any) {
    console.error('Error planning book:', error);
    const safeError = isSafetyOrBadRequestError(error)
      ? 'Theme was flagged by content safety filters. Please choose another fun topic.'
      : 'Failed to create coloring book outline. Please try again.';
    return res.status(500).json({
      success: false,
      error: safeError,
    });
  }
};

app.post('/api/plan-book', planRateLimiter, handlePlanBook);
app.post('/api/generate-plan', planRateLimiter, handlePlanBook);

// Endpoint: AI-powered creative trending theme inspiration based on child's name
app.post('/api/inspire-themes', async (req, res) => {
  try {
    const { childName = '' } = req.body;
    const cleanName = typeof childName === 'string' ? childName.trim() : '';
    const ai = getGenAI();

    const prompt = `You are an imaginative children's book author and coloring book designer.
Generate a list of exactly 3 creative, trending, fun, and age-appropriate coloring book themes${
      cleanName ? ` inspired specifically for the child named "${cleanName}"` : ' for an adventurous child'
    }.

Guidelines:
1. Provide exactly 3 distinct, highly engaging, trending themes that modern kids love (e.g. whimsical animal bakeries, zero-gravity space pups, enchanted dinosaur treehouses, underwater submarine coral quests, robot safari sanctuary, fairy garden inventors, etc.).
2. For each theme provide:
   - theme: A concise, punchy theme title suitable for a coloring book prompt (e.g., "Galactic Space Pups", "Underwater Coral Castle", "Dino Treehouse Bakery").
   - suggestedTitle: A catchy, joyful coloring book title tailored with the child's name${
     cleanName ? ` (incorporating "${cleanName}")` : ''
   } (e.g., "${cleanName || 'Explorer'}'s Galactic Space Pups Adventure").
   - description: A vibrant, 1-2 sentence description explaining what the child will color in this theme.
   - emoji: 1 or 2 fun emojis representing this theme.
   - tag: A short trending badge or category (e.g., "Trending Now", "Space & Sci-Fi", "Whimsical Animals", "Ocean Quest").
   - sampleScenes: An array of 3 brief bullet points of coloring scenes they would color.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  theme: { type: Type.STRING },
                  suggestedTitle: { type: Type.STRING },
                  description: { type: Type.STRING },
                  emoji: { type: Type.STRING },
                  tag: { type: Type.STRING },
                  sampleScenes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['theme', 'suggestedTitle', 'description', 'emoji', 'tag'],
              },
            },
          },
          required: ['themes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, themes: parsed.themes || [] });
  } catch (error: any) {
    console.error('Error generating inspiration themes:', error);
    const fallbackName =
      typeof req.body?.childName === 'string' && req.body.childName.trim()
        ? req.body.childName.trim()
        : 'Explorer';

    const fallbackThemes = [
      {
        theme: 'Galactic Puppy Space Rescue',
        suggestedTitle: `${fallbackName}'s Galactic Space Pups Adventure`,
        description:
          'Brave astronaut puppies in bubble helmets zooming through asteroid belts and discovering cheese-crater moons!',
        emoji: '🚀🐶',
        tag: 'Trending Now',
        sampleScenes: [
          'Puppy captain piloting a starship',
          'Floating in zero-gravity with star bones',
          'Landing on a rainbow comet playground',
        ],
      },
      {
        theme: 'Enchanted Forest Treehouse Bakery',
        suggestedTitle: `${fallbackName}'s Woodland Bakery Mystery`,
        description:
          'Friendly woodland creatures baking giant berry pies and honey cakes inside a magical hollowed oak tree!',
        emoji: '🧁🐿️',
        tag: 'Whimsical & Cozy',
        sampleScenes: [
          'Squirrel chef measuring acorns and flour',
          'Bear delivering warm blackberry tarts',
          'Hedgehog tea party under fairy lights',
        ],
      },
      {
        theme: 'Submarine Coral Reef Safari',
        suggestedTitle: `${fallbackName}'s Deep Sea Coral Quest`,
        description:
          'A cheerful yellow submarine exploring glowing neon coral reefs, friendly dolphins, and sunken treasure chests!',
        emoji: '🌊🐠',
        tag: 'Ocean Adventure',
        sampleScenes: [
          'Playful octopus wearing a captain hat',
          'Dolphins racing beside the submarine',
          'Glowing jellyfish night garden',
        ],
      },
    ];

    return res.json({
      success: true,
      themes: fallbackThemes,
      isFallback: true,
      errorNotice: error.message,
    });
  }
});

// Endpoint: Generate thick-line art image using gemini-3-pro-image-preview with safety guardrails
app.post('/api/generate-image', imageRateLimiter, async (req, res) => {
  try {
    const rawPrompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim().slice(0, 700) : '';
    const {
      imageSize = '1K', // "1K", "2K", or "4K"
      aspectRatio = '3:4', // 3:4 is standard portrait for printable pages
      difficulty = 'standard',
      activityMode = 'standard',
      modelPreference = 'auto', // 'fast' (gemini-3.1-flash-image) | 'pro' (gemini-3-pro-image)
    } = req.body;

    if (!rawPrompt) {
      return res.status(400).json({ success: false, error: 'A valid coloring prompt is required.' });
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

    let activityDirective = '';
    if (activityMode === 'color-by-numbers') {
      activityDirective = 'Activity style: Color by numbers coloring book with clearly partitioned sections containing tiny clean numbers (1, 2, 3, 4, 5) for kids to color according to the palette legend.';
    } else if (activityMode === 'dot-to-dot') {
      activityDirective = 'Activity style: Connect the dots puzzle with sequential numbered dots (1 through 25) outlining the main subject for kids to connect with a line and then color.';
    }

    // Ensure the prompt enforces clean, printable black-and-white thick line art matching difficulty
    const enhancedPrompt = `${rawPrompt}. ${difficultyDirective} ${activityDirective} Completely pure clean white paper background, absolutely zero gray shading, zero halftone dots, zero crosshatching, no grayscale, no color fills, high contrast black-and-white line drawing suitable for printing.`;

    const validSizes = ['1K', '2K', '4K'];
    const chosenSize = validSizes.includes(imageSize) ? imageSize : '1K';

    // Model selection: if fast requested or 1K default without 4K, can use flash for speed & unit economics
    const primaryModel = modelPreference === 'fast' ? 'gemini-3.1-flash-image' : 'gemini-3-pro-image';

    let response;
    try {
      response = await ai.models.generateContent({
        model: primaryModel,
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
      // If prompt violated content policy or safety filters, DO NOT retry on secondary model!
      if (isSafetyOrBadRequestError(primaryErr)) {
        console.warn('Image prompt flagged by safety filter, aborting retry:', primaryErr?.message);
        return res.status(400).json({
          success: false,
          error: 'This scene was flagged by content safety filters. Please try a different kid-friendly idea.',
          isSafetyBlocked: true,
        });
      }

      console.warn(`${primaryModel} call encountered issue, attempting secondary fallback:`, primaryErr?.message);
      // Only fallback on transient network/overload errors
      const fallbackModel = primaryModel === 'gemini-3-pro-image' ? 'gemini-3.1-flash-image' : 'gemini-3-pro-image';
      response = await ai.models.generateContent({
        model: fallbackModel,
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
    const safeErrorMsg = isSafetyOrBadRequestError(error)
      ? 'This scene was flagged by content safety filters. Please try a different kid-friendly idea.'
      : 'Drawing generation is temporarily unavailable. Please try again.';
    return res.status(500).json({
      success: false,
      error: safeErrorMsg,
    });
  }
});

// Endpoint: Generate specialized thematic cover illustration accompanying child's name
app.post('/api/generate-cover', imageRateLimiter, async (req, res) => {
  try {
    const rawTheme = sanitizeSafeString(req.body?.theme, 100) || 'space dinosaurs';
    const rawChildName = sanitizeSafeString(req.body?.childName, 40) || 'Explorer';
    const {
      prompt,
      imageSize = '1K',
      aspectRatio = '3:4',
      difficulty = 'standard',
      styleVariant = 'mascot',
      forceVector = false,
    } = req.body;

    const validSizes = ['1K', '2K', '4K'];
    const chosenSize = validSizes.includes(imageSize) ? imageSize : '1K';

    // If user requested vector illustration or no AI key
    if (forceVector || !process.env.GEMINI_API_KEY) {
      const vectorSvg = createThematicCoverSvg(rawTheme, rawChildName, difficulty, styleVariant);
      return res.json({
        success: true,
        imageUrl: vectorSvg,
        resolution: chosenSize,
        isVectorIllustration: true,
      });
    }

    const enhancedPrompt = prompt ? sanitizeSafeString(prompt, 700) : buildThematicCoverAiPrompt(rawTheme, rawChildName, difficulty);
    let imageUrl = '';

    try {
      const ai = getGenAI();
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3-pro-image',
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
        if (isSafetyOrBadRequestError(primaryErr)) {
          console.warn('Cover prompt flagged by safety filter, using instant vector art');
          const vectorSvg = createThematicCoverSvg(rawTheme, rawChildName, difficulty, styleVariant);
          return res.json({
            success: true,
            imageUrl: vectorSvg,
            resolution: chosenSize,
            isVectorIllustration: true,
          });
        }
        console.warn('gemini-3-pro-image cover failed, trying gemini-3.1-flash-image fallback:', primaryErr?.message);
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

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (apiErr: any) {
      console.warn('AI cover generation failed, generating instant thematic vector illustration:', apiErr?.message);
    }

    if (imageUrl) {
      return res.json({
        success: true,
        imageUrl,
        resolution: chosenSize,
        isAiGenerated: true,
      });
    }

    // High quality instant thematic vector illustration fallback
    const vectorSvg = createThematicCoverSvg(rawTheme, rawChildName, difficulty, styleVariant);
    return res.json({
      success: true,
      imageUrl: vectorSvg,
      resolution: chosenSize,
      isVectorIllustration: true,
    });
  } catch (error: any) {
    console.error('Error in /api/generate-cover:', error);
    const vectorSvg = createThematicCoverSvg(
      sanitizeSafeString(req.body?.theme, 100) || 'space dinosaurs',
      sanitizeSafeString(req.body?.childName, 40) || 'Explorer'
    );
    return res.json({
      success: true,
      imageUrl: vectorSvg,
      isVectorIllustration: true,
    });
  }
});

// Endpoint: Convert child or pet photo into personalized coloring book line-art with strict size caps
app.post('/api/photo-to-line-art', imageRateLimiter, async (req, res) => {
  try {
    const {
      photoBase64,
      subjectType = 'child', // 'child' | 'pet' | 'toy' | 'custom'
      difficulty = 'standard',
    } = req.body;

    const childName = sanitizeSafeString(req.body?.childName, 40) || 'Hero';
    const theme = sanitizeSafeString(req.body?.theme, 60) || 'adventure';
    const sceneSetting = sanitizeSafeString(req.body?.sceneSetting, 150) || 'exploring a whimsical wonderland';

    if (!photoBase64 || typeof photoBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'Photo data is required' });
    }

    // Strict payload cap: base64 string must not exceed 5MB
    if (photoBase64.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Photo is too large. Please use a compressed photo under 4MB.',
      });
    }

    const ai = getGenAI();

    // Clean base64 string
    const match = photoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const base64Data = match ? match[2] : photoBase64;

    let subjectPrompt = `Turn the ${subjectType} from this reference photo into the beloved starring hero named "${childName}" in a children's coloring book scene set in: ${sceneSetting} (${theme} theme).`;
    if (subjectType === 'pet') {
      subjectPrompt = `Turn the adorable pet from this reference photo into a playful cartoon animal hero starring in: ${sceneSetting} (${theme} theme). Keep their distinct fur pattern, ears, expression, and personality markings recognizable.`;
    } else if (subjectType === 'toy') {
      subjectPrompt = `Turn the toy / companion from this reference photo into a magical living character starring in: ${sceneSetting} (${theme} theme).`;
    }

    const promptText = `${subjectPrompt}
Style directives:
- Ultra-clean, bold black outlines suitable for a children's coloring book.
- Completely pure white background.
- Absolutely zero gray shading, zero halftone dots, zero crosshatching, zero colors.
- Distinct open spaces for children to color with crayons or markers.
- Joyful, friendly, expressive character design.
- ${difficulty === 'toddler' ? 'Simple thick lines for toddlers with giant shapes.' : difficulty === 'intricate' ? 'Intricate decorative patterns and details for older kids.' : 'Classic crisp children\'s coloring book page.'}`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3-pro-image',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: promptText },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: '3:4',
            imageSize: '1K',
          },
        },
      });
    } catch (primaryErr: any) {
      if (isSafetyOrBadRequestError(primaryErr)) {
        return res.status(400).json({
          success: false,
          error: 'This photo or prompt could not be processed due to safety guidelines. Please try a different photo.',
        });
      }
      console.warn('Pro image preview failed for photo-to-art, trying flash image fallback:', primaryErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: promptText },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: '3:4',
            imageSize: '1K',
          },
        },
      });
    }

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
      throw new Error('No image line art was returned by the AI model.');
    }

    return res.json({
      success: true,
      imageUrl,
      caption: `Starring ${childName} on a magical ${theme} adventure!`,
    });
  } catch (error: any) {
    console.error('Error in photo-to-line-art:', error);
    const safeError = isSafetyOrBadRequestError(error)
      ? 'Photo could not be converted due to safety policy. Please try a different photo.'
      : 'Failed to convert photo to line art. You can use the local outline filter!';
    return res.status(500).json({
      success: false,
      error: safeError,
    });
  }
});

// Endpoint: Multi-turn Chat with Gemini with strict role restrictions and abuse prevention
app.post('/api/chat', chatRateLimiter, async (req, res) => {
  try {
    const {
      messages = [],
      model = 'gemini-3.8-flash',
      role = 'companion',
      context = {},
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages list is required' });
    }

    const safeTheme = sanitizeSafeString(context?.theme, 80);
    const safeChildName = sanitizeSafeString(context?.childName, 40);

    const ai = getGenAI();

    // Select system instruction strictly bounded to coloring book creativity
    let systemInstruction = `You are "ColorCraft Assistant", a friendly, enthusiastic, and kid-appropriate coloring book co-creator.
You strictly assist parents, educators, and children in brainstorming coloring book themes, writing short rhyming story lines, and creating scene ideas.
Current context:
- Theme: ${safeTheme || 'Not specified'}
- Child Name: ${safeChildName || 'Little Artist'}

STRICT DOMAIN BOUNDARIES:
- You ONLY discuss children's coloring books, line art ideas, children's bedtime stories, and kid creativity.
- Do NOT write general programming code, solve math equations, discuss politics, or serve as a general assistant.
- If asked about non-coloring topics, reply: "I'm your ColorCraft buddy! Let's focus on creating fun coloring pages and adventure stories together! What fun scene would you like to draw next?"
- Keep all advice safe, family-friendly, cheerful, and brief.`;

    if (role === 'complex_storyteller') {
      systemInstruction += `\nFocus on crafting imaginative, sequential 5-part story scenes with gentle lessons for children.`;
    } else if (role === 'quick_sparks') {
      systemInstruction += `\nFocus on rapid, punchy bulleted ideas for coloring themes and props.`;
    }

    let selectedModel = 'gemini-3.8-flash';
    if (model === 'gemini-3.1-pro-preview' || role === 'complex_storyteller') {
      selectedModel = 'gemini-3.1-pro-preview';
    } else if (model === 'gemini-3.1-flash-lite' || role === 'quick_sparks') {
      selectedModel = 'gemini-3.1-flash-lite';
    }

    // Limit conversation depth (max 10 recent messages) and max text per message (max 500 chars)
    const contents = messages.slice(-10).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: sanitizeSafeString(m.content || '', 500) }],
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 800,
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
      error: 'Chat assistant is temporarily busy. Please try again in a moment.',
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
