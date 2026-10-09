import crypto from 'crypto';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
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

// Security: Disable X-Powered-By header to prevent fingerprinting
app.disable('x-powered-by');

// Security: Comprehensive HTTP Security Headers configured for AI Studio iFrame preview
const isProduction = process.env.NODE_ENV === 'production';
const contentSecurityPolicy = isProduction
  ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' data: blob:; connect-src 'self' https:; frame-ancestors 'self' https://*.google.com https://*.run.app;"
  : "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' data: blob:; connect-src 'self' https:; frame-ancestors *;";

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Allow camera & microphone requested in metadata.json for avatar photo capture and audio chimes
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  res.setHeader('Content-Security-Policy', contentSecurityPolicy);
  next();
});

// Respect Cloud Run / reverse-proxy X-Forwarded-For headers
app.set('trust proxy', 1);

// Security: Split JSON body limits - narrow 512kb for standard routes, larger 6mb strictly for photo upload
const standardJsonParser = express.json({ limit: '512kb' });
const photoJsonParser = express.json({ limit: '6mb' });

app.use((req, res, next) => {
  if (req.path === '/api/photo-to-line-art') {
    return photoJsonParser(req, res, next);
  }
  return standardJsonParser(req, res, next);
});

// Security: Global JSON error handler catching invalid JSON bodies and size limit violations
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload. Please provide valid JSON formatted data.',
    });
  }
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      success: false,
      error: 'Payload size exceeds allowable limit.',
    });
  }
  next(err);
});

// -------------------------------------------------------------
// CRYPTOGRAPHIC SERVER-SIDE PARENTAL CONSENT VERIFICATION
// -------------------------------------------------------------
if (isProduction && !process.env.CONSENT_SECRET) {
  throw new Error('FATAL: CONSENT_SECRET environment variable is required in production.');
}
const CONSENT_SECRET = process.env.CONSENT_SECRET || crypto.randomBytes(32).toString('hex');

function createConsentToken(data: {
  guardianRole: string;
  childName?: string;
  sessionId?: string;
}): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 hours validity
  const payload = JSON.stringify({
    role: data.guardianRole,
    childName: (data.childName || '').trim().toLowerCase(),
    sessionId: (data.sessionId || '').trim(),
    issuedAt: Date.now(),
    expiresAt,
  });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', CONSENT_SECRET).update(b64Payload).digest('base64url');
  return {
    token: `${b64Payload}.${signature}`,
    expiresAt,
  };
}

function verifyConsentToken(token: string | undefined): { valid: boolean; payload?: any; reason?: string } {
  if (!token || typeof token !== 'string') {
    return {
      valid: false,
      reason: 'Server-side verified parental consent is required under COPPA/GDPR-K before processing child photos.',
    };
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Invalid parental consent verification token format.' };
  }
  const [b64Payload, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', CONSENT_SECRET).update(b64Payload).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'Forged or invalid parental consent signature.' };
  }
  try {
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return { valid: false, reason: 'Parental consent token has expired. Please reconfirm parental consent.' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'Corrupt parental consent payload.' };
  }
}

// Helper: Standardized rate limiter factory with refined IETF headers and secure response masking
function createRateLimiter(options: { windowMinutes: number; max: number; message: string }) {
  return rateLimit({
    windowMs: options.windowMinutes * 60 * 1000,
    max: options.max,
    standardHeaders: 'draft-7', // Sends standard RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset headers
    legacyHeaders: false, // Suppresses deprecated X-RateLimit-* headers
    statusCode: 429,
    message: {
      success: false,
      error: options.message,
    },
    handler: (_req, res, _next, optionsUsed) => {
      res.status(optionsUsed.statusCode).json(optionsUsed.message);
    },
  });
}

// Per-IP rate limiters
const imageRateLimiter = createRateLimiter({
  windowMinutes: 10,
  max: 30,
  message: 'Image generation rate limit reached. Please wait a few minutes before requesting more pages.',
});

const chatRateLimiter = createRateLimiter({
  windowMinutes: 10,
  max: 40,
  message: 'Chat message rate limit reached. Please wait a few minutes before sending more messages.',
});

const planRateLimiter = createRateLimiter({
  windowMinutes: 10,
  max: 25,
  message: 'Book planning rate limit reached. Please wait a few minutes before creating a new book.',
});

const inspirationRateLimiter = createRateLimiter({
  windowMinutes: 10,
  max: 30,
  message: 'Theme inspiration rate limit reached. Please wait a moment before requesting more themes.',
});

const downloadRateLimiter = createRateLimiter({
  windowMinutes: 10,
  max: 10,
  message: 'Project download limit reached. Please wait a few minutes before downloading another archive.',
});

const consentRateLimiter = createRateLimiter({
  windowMinutes: 10,
  max: 30,
  message: 'Parental consent verification limit reached. Please wait a few minutes before submitting verification again.',
});

// -------------------------------------------------------------
// ANONYMOUS SESSION & USER QUOTA SYSTEM (GEMINI ENDPOINTS)
// -------------------------------------------------------------
interface SessionQuotaConfig {
  windowMinutes: number;
  maxRequests: number;
  endpointName: string;
}

const sessionQuotaStore = new Map<string, { count: number; resetAt: number }>();

// Periodic garbage collection for expired session quota records
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of sessionQuotaStore.entries()) {
    if (record.resetAt <= now) {
      sessionQuotaStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Reliable extraction of anonymous session identifier across headers, body, query, and IP.
 */
function getAnonymousSessionId(req: express.Request): string {
  const rawSession =
    (req.headers['x-session-id'] as string) ||
    (req.body && req.body.sessionId) ||
    (req.query && (req.query.sessionId as string)) ||
    req.ip ||
    'unknown-session';
  return sanitizeSafeString(rawSession, 120) || 'unknown-session';
}

function createSessionQuotaMiddleware(config: SessionQuotaConfig): express.RequestHandler {
  return (req, res, next) => {
    const cleanSession = getAnonymousSessionId(req);
    const bucketKey = `${config.endpointName}:${cleanSession}`;
    const now = Date.now();
    const windowMs = config.windowMinutes * 60 * 1000;

    let record = sessionQuotaStore.get(bucketKey);
    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + windowMs };
      sessionQuotaStore.set(bucketKey, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-Session-Quota-Limit', config.maxRequests.toString());
    res.setHeader('X-Session-Quota-Remaining', Math.max(0, config.maxRequests - record.count).toString());
    res.setHeader('X-Session-Quota-Reset', Math.ceil(record.resetAt / 1000).toString());

    if (record.count > config.maxRequests) {
      const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
      return res.status(429).json({
        success: false,
        error: `Anonymous session quota reached for ${config.endpointName}. Please wait ${waitSeconds}s before requesting again.`,
      });
    }

    next();
  };
}

// Session Quota limiters for all Gemini API endpoints
const imageSessionQuota = createSessionQuotaMiddleware({
  windowMinutes: 10,
  maxRequests: 30,
  endpointName: 'Image Generation',
});

const coverSessionQuota = createSessionQuotaMiddleware({
  windowMinutes: 10,
  maxRequests: 20,
  endpointName: 'Cover Generation',
});

const planSessionQuota = createSessionQuotaMiddleware({
  windowMinutes: 10,
  maxRequests: 25,
  endpointName: 'Book Planning',
});

const chatSessionQuota = createSessionQuotaMiddleware({
  windowMinutes: 10,
  maxRequests: 40,
  endpointName: 'Chat Assistant',
});

const inspirationSessionQuota = createSessionQuotaMiddleware({
  windowMinutes: 10,
  maxRequests: 30,
  endpointName: 'Theme Inspiration',
});

const photoToArtSessionQuota = createSessionQuotaMiddleware({
  windowMinutes: 10,
  maxRequests: 15,
  endpointName: 'Photo-to-Art Conversion',
});

// -------------------------------------------------------------
// SERVER-CONTROLLED CHAT CONVERSATION HISTORY STORE
// -------------------------------------------------------------
interface ServerChatTurn {
  role: 'user' | 'model';
  parts: [{ text: string }];
  timestamp: number;
}

const serverChatHistories = new Map<string, ServerChatTurn[]>();

// Periodic cleanup of idle chat sessions (idle > 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, history] of serverChatHistories.entries()) {
    if (!history.length || history[history.length - 1].timestamp < oneHourAgo) {
      serverChatHistories.delete(id);
    }
  }
}, 10 * 60 * 1000);

// Inappropriate words blocklist for children's application moderation
const INAPPROPRIATE_WORDS = [
  'nsfw',
  'porn',
  'nude',
  'naked',
  'gore',
  'blood',
  'slaughter',
  'weapon',
  'gun',
  'knife',
  'kill',
  'murder',
  'suicide',
  'drugs',
  'cocaine',
  'heroin',
  'meth',
  'alcohol',
  'beer',
  'wine',
  'gambling',
  'casino',
  'sex',
  'erotic',
  'curse',
  'fuck',
  'shit',
  'bitch',
  'asshole',
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions|directives|prompts|rules)/i,
  /disregard\s+(all\s+)?(previous|prior|above|system)\s+(instructions|directives|prompts|rules)/i,
  /system\s*prompt/i,
  /you\s+are\s+now\s+(an?\s+)?(unfiltered|different|evil|unrestricted|jailbroken)/i,
  /reveal\s+(the\s+)?(api\s*key|secret|token|system\s+instruction|prompt)/i,
  /bypass\s+all\s+(filters|guardrails|safety)/i,
  /override\s+(system|safety|guardrails)/i,
  /\b(dan|jailbreak|developer\s+mode)\b/i,
  /\bdo\s+anything\s+now\b/i,
  /\bpretend\s+you\s+have\s+no\s+rules\b/i,
];

function validateKidContentServer(text: string): { valid: boolean; reason?: string } {
  if (!text || typeof text !== 'string') return { valid: true };
  const lower = text.toLowerCase();
  for (const word of INAPPROPRIATE_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      return { valid: false, reason: `Kid-safety filter triggered: prohibited term "${word}".` };
    }
  }
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(lower)) {
      return { valid: false, reason: 'Input contains prohibited system instructions or prompt injection attempts.' };
    }
  }
  return { valid: true };
}

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
  return str
    .replace(/<[^>]*>?/gm, '')
    .replace(/[`"'{}[\]]/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim()
    .slice(0, maxLen);
}

// -------------------------------------------------------------
// ZOD SCHEMAS FOR STRICT API INPUT VALIDATION & INJECTION PREVENTION
// -------------------------------------------------------------

/**
 * Reusable text validator with strict type checking, sanitization,
 * length bounds, and proactive kid-safety & prompt injection filtering.
 */
function createSafeTextSchema(options: {
  fieldName: string;
  min?: number;
  max: number;
  required?: boolean;
}) {
  const base = z.string().trim();

  let sized = options.min && options.min > 0
    ? base.min(options.min, `${options.fieldName} must be at least ${options.min} character(s)`)
    : base;

  sized = sized.max(options.max, `${options.fieldName} cannot exceed ${options.max} characters`);

  return sized
    .transform((val) => sanitizeSafeString(val, options.max))
    .superRefine((val, ctx) => {
      if (!val) {
        if (options.required) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${options.fieldName} cannot be empty or contain only invalid characters`,
          });
        }
        return;
      }
      const check = validateKidContentServer(val);
      if (!check.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: check.reason || `Prohibited or unsafe content detected in ${options.fieldName}`,
        });
      }
    });
}

const PlanBookSchema = z
  .object({
    theme: createSafeTextSchema({ fieldName: 'theme', min: 1, max: 120, required: true }).default('space dinosaurs'),
    childName: createSafeTextSchema({ fieldName: 'childName', min: 0, max: 50 }).default('Little Explorer'),
    customTitle: createSafeTextSchema({ fieldName: 'customTitle', min: 0, max: 120 }).optional().nullable(),
    dedicationAuthor: createSafeTextSchema({ fieldName: 'dedicationAuthor', min: 0, max: 60 }).optional().nullable(),
    userNotes: createSafeTextSchema({ fieldName: 'userNotes', min: 0, max: 300 }).optional().nullable(),
    pageCount: z
      .union([z.number(), z.string()])
      .transform((val) => {
        const num = Number(val);
        return isNaN(num) ? 5 : Math.max(1, Math.min(12, Math.round(num)));
      })
      .default(5),
    difficulty: z.enum(['toddler', 'standard', 'intricate']).default('standard'),
    activityMode: z.enum(['standard', 'color-by-numbers', 'dot-to-dot']).default('standard'),
    artStyle: z.enum(['classic', 'kawaii', 'storybook', 'comic', 'manga-chibi', 'geometric-mandala', 'vintage-woodcut', 'retro-cartoon']).default('classic'),
    secondaryLanguage: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja']).optional().nullable(),
  })
  .strip();

const InspireThemesSchema = z
  .object({
    childName: createSafeTextSchema({ fieldName: 'childName', min: 0, max: 50 }).optional().default(''),
  })
  .strip();

const GenerateImageSchema = z
  .object({
    prompt: createSafeTextSchema({ fieldName: 'prompt', min: 1, max: 700, required: true }),
    imageSize: z.enum(['1K', '2K', '4K']).default('1K'),
    aspectRatio: z.enum(['1:1', '3:4', '4:3', '16:9', '9:16']).default('3:4'),
    difficulty: z.enum(['toddler', 'standard', 'intricate']).default('standard'),
    activityMode: z.enum(['standard', 'color-by-numbers', 'dot-to-dot']).default('standard'),
    artStyle: z.enum(['classic', 'kawaii', 'storybook', 'comic', 'manga-chibi', 'geometric-mandala', 'vintage-woodcut', 'retro-cartoon']).default('classic'),
    modelPreference: z.enum(['auto', 'fast', 'pro']).default('auto'),
  })
  .strip();

const GenerateCoverSchema = z
  .object({
    theme: createSafeTextSchema({ fieldName: 'theme', min: 0, max: 120 }).default('space dinosaurs'),
    childName: createSafeTextSchema({ fieldName: 'childName', min: 0, max: 50 }).default('Explorer'),
    prompt: createSafeTextSchema({ fieldName: 'prompt', min: 0, max: 700 }).optional().nullable(),
    imageSize: z.enum(['1K', '2K', '4K']).default('1K'),
    aspectRatio: z.enum(['1:1', '3:4', '4:3', '16:9', '9:16']).default('3:4'),
    difficulty: z.enum(['toddler', 'standard', 'intricate']).default('standard'),
    styleVariant: z.enum(['mascot', 'emblem', 'adventure']).default('mascot'),
    artStyle: z.enum(['classic', 'kawaii', 'storybook', 'comic', 'manga-chibi', 'geometric-mandala', 'vintage-woodcut', 'retro-cartoon']).optional().default('classic'),
    forceVector: z.boolean().default(false),
  })
  .strip();

const PhotoToLineArtSchema = z
  .object({
    photoBase64: z
      .string()
      .min(1, 'Photo data is required')
      .max(5 * 1024 * 1024, 'Photo payload exceeds maximum allowable size (5MB)')
      .superRefine((val, ctx) => {
        const match = val.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!match) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid photo format. Base64 data URL required (e.g. data:image/png;base64,...)',
          });
          return;
        }
        const mime = match[1].toLowerCase();
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Unsupported image type. Only JPG, PNG, and WebP are allowed.',
          });
        }
      }),
    subjectType: z.enum(['child', 'pet', 'toy', 'custom']).default('child'),
    difficulty: z.enum(['toddler', 'standard', 'intricate']).default('standard'),
    artStyle: z.enum(['classic', 'kawaii', 'storybook', 'comic', 'manga-chibi', 'geometric-mandala', 'vintage-woodcut', 'retro-cartoon']).optional().default('classic'),
    childName: createSafeTextSchema({ fieldName: 'childName', min: 1, max: 50, required: true }).default('Hero'),
    theme: createSafeTextSchema({ fieldName: 'theme', min: 0, max: 80 }).default('adventure'),
    sceneSetting: createSafeTextSchema({ fieldName: 'sceneSetting', min: 0, max: 200 }).default(
      'exploring a whimsical wonderland'
    ),
    parentConsentToken: z.string().optional(),
    sessionId: z.string().trim().max(120).optional(),
  })
  .strip();

const ChatSchema = z
  .object({
    message: createSafeTextSchema({ fieldName: 'message content', min: 1, max: 600 }).optional(),
    chatSessionId: z.string().trim().max(100).optional(),
    sessionId: z.string().trim().max(120).optional(),
    clearSession: z.boolean().optional(),
    // Client-supplied turns are strictly restricted to role: 'user' to prevent model turn injection
    messages: z
      .array(
        z.object({
          role: z.literal('user'),
          content: createSafeTextSchema({ fieldName: 'message content', min: 1, max: 600, required: true }),
        })
      )
      .max(20)
      .optional(),
    model: z
      .enum(['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'])
      .transform((m) => (m === 'gemini-3.5-flash' ? 'gemini-3.8-flash' : m))
      .default('gemini-3.8-flash'),
    role: z.enum(['companion', 'complex_storyteller', 'quick_sparks']).default('companion'),
    context: z
      .object({
        theme: createSafeTextSchema({ fieldName: 'context theme', min: 0, max: 100 }).optional().nullable(),
        childName: createSafeTextSchema({ fieldName: 'context childName', min: 0, max: 50 }).optional().nullable(),
      })
      .optional()
      .nullable()
      .default({}),
  })
  .refine((data) => Boolean(data.message || (data.messages && data.messages.length > 0)), {
    message: 'Either message or user-role messages array is required.',
  })
  .strip();

const VerifyParentalConsentSchema = z
  .object({
    guardianRole: z.enum(['parent', 'guardian', 'educator']).default('parent'),
    childName: createSafeTextSchema({ fieldName: 'childName', min: 1, max: 50, required: true }),
    sessionId: z.string().trim().max(120).optional(),
    coppaConfirmed: z.boolean().refine((val) => val === true, {
      message: 'COPPA confirmation is required to issue a parental consent verification token.',
    }),
  })
  .strip();

type ValidationResult<T> =
  | { success: true; data: T; error?: undefined; issues?: undefined }
  | { success: false; data?: undefined; error: string; issues: { field: string; message: string }[] };

function validateWithZod<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      field: i.path.join('.') || 'body',
      message: i.message,
    }));
    const firstMessage = issues[0]?.message || 'Invalid input data';
    return {
      success: false,
      error: `Input validation failed: ${firstMessage}`,
      issues,
    };
  }
  return { success: true, data: result.data };
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

// Health check endpoint - safe, never exposes raw keys
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Project source export endpoint with rate limiting, caching, and clean filtering
// Protected or disabled in production to prevent arbitrary source code downloads
app.get('/api/download-project', downloadRateLimiter, (req, res) => {
  // SECURITY: Unconditionally reject passing admin keys via URL query parameters (CWE-598)
  // to prevent leakage in server access logs, browser history, referrers, and proxy logs
  if (req.query.adminKey || req.query['admin-key'] || req.query.key || req.query.admin_key || req.query.token) {
    return res.status(400).json({
      success: false,
      error: 'Admin authentication key must not be passed in URL query parameters. Please use the X-Admin-Key or Authorization header.',
    });
  }

  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers['authorization'];
    const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const adminKey = (req.headers['x-admin-key'] as string) || bearerKey;

    if (!process.env.ADMIN_KEY || !adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        success: false,
        error: 'Project source archive download is disabled in production environments.',
      });
    }
  }

  try {
    const zipPath = path.join('/tmp', 'project-source.zip');
    let shouldRegenerate = true;

    // Cache check: if zip was generated within the last 60 seconds, reuse it
    try {
      if (fs.existsSync(zipPath)) {
        const stats = fs.statSync(zipPath);
        const ageMs = Date.now() - stats.mtimeMs;
        if (ageMs < 60 * 1000 && stats.size > 1000) {
          shouldRegenerate = false;
        }
      }
    } catch {}

    if (shouldRegenerate) {
      const pyScript = `
import zipfile, os
base_dir = os.path.abspath(os.getcwd())
zip_path = '/tmp/project-source.zip'
exclude_dirs = {'node_modules', '.git', 'dist', 'build', '.cache'}
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            if f.endswith('.zip') or f.startswith('.env'):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir)
            zipf.write(full_path, rel_path)
`;
      execSync(`python3 -c "${pyScript.replace(/"/g, '\\"')}"`);
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="coloring-book-studio-latest.zip"');
    const fileStream = fs.createReadStream(zipPath);
    fileStream.pipe(res);
  } catch (err: any) {
    console.error('Failed to generate project archive:', err?.message);
    res.status(500).json({ error: 'Failed to generate project archive' });
  }
});

// Handler for both /api/plan-book and /api/generate-plan
const handlePlanBook: express.RequestHandler = async (req, res) => {
  try {
    const validationResult = validateWithZod(PlanBookSchema, req.body);
    if (!validationResult.success) {
      return res.status(400).json({ success: false, error: validationResult.error, issues: validationResult.issues });
    }

    const {
      theme: rawTheme,
      childName: rawChildName,
      customTitle: rawCustomTitle,
      dedicationAuthor: rawDedicationAuthor,
      userNotes: rawUserNotes,
      pageCount: validPageCount,
      difficulty,
      activityMode,
      secondaryLanguage: rawSecondaryLanguage,
      artStyle = 'classic',
    } = validationResult.data;

    const theme = sanitizeSafeString(rawTheme, 100) || 'space dinosaurs';
    const childName = sanitizeSafeString(rawChildName, 40) || 'Little Explorer';
    const customTitle = rawCustomTitle ? sanitizeSafeString(rawCustomTitle, 100) : '';
    const dedicationAuthor = rawDedicationAuthor ? sanitizeSafeString(rawDedicationAuthor, 60) : '';
    const userNotes = rawUserNotes ? sanitizeSafeString(rawUserNotes, 250) : '';
    const secondaryLanguage = rawSecondaryLanguage ? sanitizeSafeString(rawSecondaryLanguage, 15) : '';

    // Validate inputs for kid-safety and prompt injection
    const themeCheck = validateKidContentServer(theme);
    if (!themeCheck.valid) {
      return res.status(400).json({ success: false, error: themeCheck.reason });
    }
    const nameCheck = validateKidContentServer(childName);
    if (!nameCheck.valid) {
      return res.status(400).json({ success: false, error: nameCheck.reason });
    }
    if (customTitle) {
      const titleCheck = validateKidContentServer(customTitle);
      if (!titleCheck.valid) {
        return res.status(400).json({ success: false, error: titleCheck.reason });
      }
    }
    if (userNotes) {
      const notesCheck = validateKidContentServer(userNotes);
      if (!notesCheck.valid) {
        return res.status(400).json({ success: false, error: notesCheck.reason });
      }
    }

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

    let artStyleInstruction = '';
    if (artStyle === 'kawaii') {
      artStyleInstruction = `CRITICAL ART STYLE REQUIREMENT: KAWAII & CUTE
- Style: Ultra-cute Japanese chibi aesthetic with bubbly rounded contours, oversized sparkly joyful eyes, sweet smiling expressions, blushing cheek marks, and clean minimalist outlines.
- In each scene's imagePrompt, specify: "Kawaii cute Japanese chibi line art style, ultra-cute bubbly rounded outlines, oversized joyful eyes, sweet smiling expressions, clean minimalist ink outlines..."`;
    } else if (artStyle === 'storybook') {
      artStyleInstruction = `CRITICAL ART STYLE REQUIREMENT: FAIRY TALE WHIMSY
- Style: Whimsical folklore storybook illustration with charming flora, cozy enchanted scenery, and gentle storybook textures.
- In each scene's imagePrompt, specify: "Whimsical fairy tale storybook illustration line art style, charming folklore character design, whimsical flora, enchanted scenery, clean crisp black outlines..."`;
    } else if (artStyle === 'comic') {
      artStyleInstruction = `CRITICAL ART STYLE REQUIREMENT: COMIC BOOK ACTION
- Style: Dynamic superhero comic ink lines, action silhouettes, dramatic heroic poses, and punchy pop-art coloring areas.
- In each scene's imagePrompt, specify: "Dynamic superhero comic book line art style, bold graphic ink outlines, energetic action silhouettes, punchy pop-art coloring areas, confident ink contours..."`;
    } else if (artStyle === 'manga-chibi') {
      artStyleInstruction = `CRITICAL ART STYLE REQUIREMENT: MANGA & ANIME
- Style: Stylized anime chibi line art with oversized expressive eyes, cute anime proportions, and crisp clean ink pen lines.
- In each scene's imagePrompt, specify: "Manga anime chibi line art style, oversized expressive anime eyes, cute chibi proportions, stylized hair silhouettes, crisp clean pen ink outlines..."`;
    } else if (artStyle === 'geometric-mandala') {
      artStyleInstruction = `CRITICAL ART STYLE REQUIREMENT: MANDALA & PATTERNS
- Style: Meditative geometric mandala patterns, kaleidoscopic symmetries, and detailed ornamental texture fills.
- In each scene's imagePrompt, specify: "Geometric mandala decorative line art style, symmetrical floral mandala patterns, ornamental geometric textures, crisp clean black lines..."`;
    } else if (artStyle === 'vintage-woodcut') {
      artStyleInstruction = `CRITICAL ART STYLE REQUIREMENT: VINTAGE STORYBOOK
- Style: Timeless classic fairy-tale engraving look with elegant ink contours and classic botanical accents.
- In each scene's imagePrompt, specify: "Vintage classic children's book engraving line art style, timeless fairy tale storybook ink outlines, classic botanical accents, elegant clean character outlines..."`;
    } else if (artStyle === 'retro-cartoon') {
      artStyleInstruction = `CRITICAL ART STYLE REQUIREMENT: RETRO 1930s CARTOON
- Style: Bouncy 1930s rubber-hose animation line art with noodle limbs, pie eyes, and vintage cartoon spirit.
- In each scene's imagePrompt, specify: "1930s vintage rubber-hose cartoon animation line art style, bouncy noodle arms, pie-shaped cartoon eyes, playful vintage animation contours, bold ink outlines..."`;
    } else {
      artStyleInstruction = `CRITICAL ART STYLE REQUIREMENT: CLASSIC STORYBOOK
- Style: Classic children's coloring book with clean, confident bold black outlines and joyful balanced storytelling.
- In each scene's imagePrompt, specify: "Classic children's coloring book page, crisp bold black outlines, clear joyful character expressions, wide open coloring spaces..."`;
    }

    const prompt = `You are an expert children's coloring book author and illustrator planner.
Create a personalized ${validPageCount}-page coloring book plan for a child named "${childName}" with the theme "${theme}".
Difficulty Level: ${difficulty.toUpperCase()}.
Activity Mode: ${activityMode.toUpperCase()}.
Artistic Style: ${artStyle.toUpperCase()}.
${cleanAuthor ? `Book dedicated by: "${cleanAuthor}".` : ''}
${difficultyInstruction}
${activityInstruction}
${artStyleInstruction}
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
      artStyle,
    });
  } catch (error: any) {
    console.error('Error planning book:', error);
    const isSafety = isSafetyOrBadRequestError(error);
    const safeError = isSafety
      ? 'Theme was flagged by content safety filters. Please choose another fun topic.'
      : 'Failed to create coloring book outline. Please try again.';
    return res.status(isSafety ? 400 : 500).json({
      success: false,
      error: safeError,
      isSafetyBlocked: isSafety,
    });
  }
};

app.post('/api/plan-book', planRateLimiter, planSessionQuota, handlePlanBook);
app.post('/api/generate-plan', planRateLimiter, planSessionQuota, handlePlanBook);

// Endpoint: AI-powered creative trending theme inspiration based on child's name
app.post('/api/inspire-themes', inspirationRateLimiter, inspirationSessionQuota, async (req, res) => {
  try {
    const validationResult = validateWithZod(InspireThemesSchema, req.body);
    if (!validationResult.success) {
      return res.status(400).json({ success: false, error: validationResult.error, issues: validationResult.issues });
    }

    const cleanName = sanitizeSafeString(validationResult.data.childName || '', 40);

    if (cleanName) {
      const nameCheck = validateKidContentServer(cleanName);
      if (!nameCheck.valid) {
        return res.status(400).json({ success: false, error: nameCheck.reason });
      }
    }
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
    });
  }
});

// Endpoint: Generate thick-line art image using gemini-3-pro-image-preview with safety guardrails
app.post('/api/generate-image', imageRateLimiter, imageSessionQuota, async (req, res) => {
  try {
    const parsed = validateWithZod(GenerateImageSchema, req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error, issues: parsed.issues });
    }

    const {
      prompt: rawPrompt,
      imageSize,
      aspectRatio,
      difficulty,
      activityMode,
      artStyle = 'classic',
      modelPreference,
    } = parsed.data;

    const promptCheck = validateKidContentServer(rawPrompt);
    if (!promptCheck.valid) {
      return res.status(400).json({ success: false, error: promptCheck.reason });
    }

    const ai = getGenAI();

    // Adjust prompt directives based on chosen art style
    let artStyleDirective = '';
    if (artStyle === 'kawaii') {
      artStyleDirective = 'Style: Ultra-cute Japanese Kawaii chibi line art with big joyful eyes, rounded bubbly outlines, adorable smiles, blushing cheeks, and charming playful minimalism.';
    } else if (artStyle === 'storybook') {
      artStyleDirective = 'Style: Whimsical fairy-tale storybook illustration line art with charming expressive characters, magical flora, and warm cheerful outlines.';
    } else if (artStyle === 'comic') {
      artStyleDirective = 'Style: Dynamic superhero comic book line art with bold action ink lines, energetic silhouettes, and punchy pop-art coloring spaces.';
    } else if (artStyle === 'manga-chibi') {
      artStyleDirective = 'Style: Manga chibi anime line art with oversized expressive eyes, miniature cute bodies, stylized hair, and clean pen ink outlines.';
    } else if (artStyle === 'geometric-mandala') {
      artStyleDirective = 'Style: Geometric mandala decorative line art with kaleidoscopic symmetry, floral mandala patterns, and meditative repeating line motifs.';
    } else if (artStyle === 'vintage-woodcut') {
      artStyleDirective = 'Style: Vintage storybook woodcut engraving style with classic storybook hatching, traditional fairy tale ink outlines, and antique botanical charm.';
    } else if (artStyle === 'retro-cartoon') {
      artStyleDirective = 'Style: 1930s rubber-hose retro cartoon animation line art with noodle limbs, pie eyes, bouncy retro energy, and bold classic cartoon ink contours.';
    } else {
      artStyleDirective = 'Style: Classic children\'s coloring book page with clean, confident bold black outlines.';
    }

    // Adjust prompt directives based on chosen difficulty
    let difficultyDirective = '';
    if (difficulty === 'toddler') {
      difficultyDirective = 'Detail density: Simple thick lines for toddlers. Ultra-bold massive chunky black outlines, giant open shapes for chunky crayons, minimal elements, zero clutter, zero fine lines, zero shading, pure clean white paper background.';
    } else if (difficulty === 'intricate') {
      difficultyDirective = 'Detail density: Intricate patterns for older children. Detailed fine black line art, complex decorative patterns, zentangle textures, ornate background scenery, intricate detailed coloring spaces for colored pencils, pure clean white paper background, zero shading or gray gradients.';
    } else {
      difficultyDirective = 'Detail density: Classic children\'s coloring book page. Crisp thick black ink outlines, clean lines, wide open coloring spaces, zero gray shading, zero halftone dots, pure clean white paper background.';
    }

    let activityDirective = '';
    if (activityMode === 'color-by-numbers') {
      activityDirective = 'Activity style: Color by numbers coloring book with clearly partitioned sections containing tiny clean numbers (1, 2, 3, 4, 5) for kids to color according to the palette legend.';
    } else if (activityMode === 'dot-to-dot') {
      activityDirective = 'Activity style: Connect the dots puzzle with sequential numbered dots (1 through 25) outlining the main subject for kids to connect with a line and then color.';
    }

    // Ensure the prompt enforces clean, printable black-and-white thick line art matching difficulty and style
    const enhancedPrompt = `${rawPrompt}. ${artStyleDirective} ${difficultyDirective} ${activityDirective} Completely pure clean white paper background, absolutely zero gray shading, zero halftone dots, zero crosshatching, no grayscale, no color fills, high contrast black-and-white line drawing suitable for printing.`;

    const validSizes = ['1K', '2K', '4K'];
    const chosenSize = validSizes.includes(imageSize) ? imageSize : '1K';

    // Model selection: if fast requested or 1K default without 4K, can use flash for speed & unit economics
    const primaryModel = modelPreference === 'fast' ? 'gemini-3.1-flash-lite-image' : 'gemini-3-pro-image';

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
      const fallbackModel = primaryModel === 'gemini-3-pro-image' ? 'gemini-3.1-flash-lite-image' : 'gemini-3-pro-image';
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
    const isSafety = isSafetyOrBadRequestError(error);
    const safeErrorMsg = isSafety
      ? 'This scene was flagged by content safety filters. Please try a different kid-friendly idea.'
      : 'Drawing generation is temporarily unavailable. Please try again.';
    return res.status(isSafety ? 400 : 500).json({
      success: false,
      error: safeErrorMsg,
      isSafetyBlocked: isSafety,
    });
  }
});

// Endpoint: Generate specialized thematic cover illustration accompanying child's name
app.post('/api/generate-cover', imageRateLimiter, coverSessionQuota, async (req, res) => {
  try {
    const parsed = validateWithZod(GenerateCoverSchema, req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error, issues: parsed.issues });
    }

    const {
      theme: inputTheme,
      childName: inputChildName,
      prompt,
      imageSize: chosenSize,
      aspectRatio,
      difficulty,
      styleVariant,
      artStyle = 'classic',
      forceVector,
    } = parsed.data;

    const rawTheme = sanitizeSafeString(inputTheme, 100) || 'space dinosaurs';
    const rawChildName = sanitizeSafeString(inputChildName, 40) || 'Explorer';

    const themeCheck = validateKidContentServer(rawTheme);
    if (!themeCheck.valid) return res.status(400).json({ success: false, error: themeCheck.reason });
    const nameCheck = validateKidContentServer(rawChildName);
    if (!nameCheck.valid) return res.status(400).json({ success: false, error: nameCheck.reason });
    if (prompt) {
      const promptCheck = validateKidContentServer(prompt);
      if (!promptCheck.valid) return res.status(400).json({ success: false, error: promptCheck.reason });
    }

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

    const enhancedPrompt = prompt ? sanitizeSafeString(prompt, 700) : buildThematicCoverAiPrompt(rawTheme, rawChildName, difficulty, artStyle);
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
        console.warn('gemini-3-pro-image cover failed, trying gemini-3.1-flash-lite-image fallback:', primaryErr?.message);
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
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

// Endpoint: Issue cryptographically signed parental consent verification token (COPPA / GDPR-K)
app.post('/api/verify-parental-consent', consentRateLimiter, (req, res) => {
  try {
    const validationResult = validateWithZod(VerifyParentalConsentSchema, req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error,
        issues: validationResult.issues,
      });
    }

    const { guardianRole, childName, sessionId } = validationResult.data;
    const cleanChildName = sanitizeSafeString(childName || '', 40);
    const clientSessionId = (req.headers['x-session-id'] as string) || sessionId || '';
    const { token, expiresAt } = createConsentToken({
      guardianRole,
      childName: cleanChildName,
      sessionId: clientSessionId,
    });
    return res.json({
      success: true,
      consentToken: token,
      expiresAt,
    });
  } catch (error: any) {
    console.error('Failed to issue parental consent token:', error);
    return res.status(500).json({ success: false, error: 'Could not issue parental consent token.' });
  }
});

// Endpoint: Convert child or pet photo into personalized coloring book line-art with strict size caps
app.post('/api/photo-to-line-art', imageRateLimiter, photoToArtSessionQuota, async (req, res) => {
  try {
    const parsed = validateWithZod(PhotoToLineArtSchema, req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error, issues: parsed.issues });
    }

    // Cryptographic server-side parental consent enforcement (COPPA)
    const consentHeader = req.headers['x-parental-consent-token'] as string | undefined;
    const rawConsentToken = parsed.data.parentConsentToken || consentHeader;
    const consentCheck = verifyConsentToken(rawConsentToken);
    if (!consentCheck.valid) {
      return res.status(403).json({
        success: false,
        error: consentCheck.reason,
        isConsentRequired: true,
      });
    }

    const {
      photoBase64,
      subjectType,
      difficulty,
      artStyle = 'classic',
      childName: rawChildName,
      theme: rawTheme,
      sceneSetting: rawSceneSetting,
      sessionId: reqBodySession,
    } = parsed.data;

    const childName = sanitizeSafeString(rawChildName, 40) || 'Hero';
    const theme = sanitizeSafeString(rawTheme, 60) || 'adventure';
    const sceneSetting = sanitizeSafeString(rawSceneSetting, 150) || 'exploring a whimsical wonderland';

    // Verify cryptographic child name binding:
    // Strictly require that the token's child binding matches the target child name.
    // Disallow empty-binding bypass and disallow 'hero' wildcard bypass.
    const tokenChild = (consentCheck.payload?.childName || '').trim().toLowerCase();
    const currentChild = childName.trim().toLowerCase();
    if (!tokenChild || !currentChild || tokenChild !== currentChild) {
      return res.status(403).json({
        success: false,
        error: `Parental consent token was issued for "${consentCheck.payload?.childName || 'unspecified'}" and cannot be used for "${childName}". Please confirm parental consent for this child.`,
        isConsentRequired: true,
      });
    }

    // Verify cryptographic browser session binding
    const currentSession = (req.headers['x-session-id'] as string) || reqBodySession;
    const tokenSession = consentCheck.payload?.sessionId;
    if (tokenSession && currentSession && tokenSession !== currentSession) {
      return res.status(403).json({
        success: false,
        error: 'Parental consent verification token was issued to a different session. Please confirm consent again.',
        isConsentRequired: true,
      });
    }

    // Validate text inputs for safety
    const nameCheck = validateKidContentServer(childName);
    if (!nameCheck.valid) return res.status(400).json({ success: false, error: nameCheck.reason });
    const themeCheck = validateKidContentServer(theme);
    if (!themeCheck.valid) return res.status(400).json({ success: false, error: themeCheck.reason });
    const sceneCheck = validateKidContentServer(sceneSetting);
    if (!sceneCheck.valid) return res.status(400).json({ success: false, error: sceneCheck.reason });

    // Validate MIME type strictly against supported image types
    const match = photoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Invalid photo format. Base64 data URL required.' });
    }
    const mimeType = match[1].toLowerCase();
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported image type. Please provide a JPG, PNG, or WebP photo.',
      });
    }
    const base64Data = match[2];

    const ai = getGenAI();

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
- ${artStyle === 'kawaii' ? 'Kawaii Japanese cute style with bubbly rounded outlines and big sweet eyes.' : artStyle === 'comic' ? 'Dynamic comic book action ink style with heroic silhouettes.' : artStyle === 'manga-chibi' ? 'Manga chibi anime style with cute proportions and expressive eyes.' : artStyle === 'geometric-mandala' ? 'Geometric mandala pattern style with ornamental motifs.' : artStyle === 'vintage-woodcut' ? 'Vintage fairy-tale engraving style with antique storybook ink outlines.' : artStyle === 'retro-cartoon' ? '1930s rubber-hose cartoon animation style with bouncy noodle arms and pie eyes.' : 'Classic storybook coloring page style with clean bold outlines.'}
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
        model: 'gemini-3.1-flash-lite-image',
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
    const isSafety = isSafetyOrBadRequestError(error);
    const safeError = isSafety
      ? 'Photo could not be converted due to safety policy. Please try a different photo.'
      : 'Failed to convert photo to line art. You can use the local outline filter!';
    return res.status(isSafety ? 400 : 500).json({
      success: false,
      error: safeError,
      isSafetyBlocked: isSafety,
    });
  }
});

// Endpoint: Multi-turn Chat with Gemini with server-controlled history and user turns only
app.post('/api/chat', chatRateLimiter, chatSessionQuota, async (req, res) => {
  try {
    const parsed = validateWithZod(ChatSchema, req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error, issues: parsed.issues });
    }

    const {
      message,
      chatSessionId,
      clearSession,
      messages,
      model = 'gemini-3.8-flash',
      role = 'companion',
      context = {},
    } = parsed.data;

    // Compound session key: strictly binds anonymousSessionId + chatSessionId.
    // This prevents separate clients from choosing or guessing the same chatSessionId
    // and sharing the same server-side conversation state.
    const anonSessionId = getAnonymousSessionId(req);
    const cleanChatSessionId = sanitizeSafeString(chatSessionId, 100) || 'default-chat';
    const sessionKey = `${anonSessionId}:${cleanChatSessionId}`;

    if (clearSession) {
      serverChatHistories.delete(sessionKey);
      return res.json({
        success: true,
        cleared: true,
        message: 'Chat history cleared for this session.',
      });
    }

    // Retrieve or initialize server-controlled conversation history
    let serverHistory = serverChatHistories.get(sessionKey) || [];

    // Extract the new user message (from message string or latest user message)
    const rawUserTurn =
      message ||
      (messages && messages.length > 0 ? messages[messages.length - 1].content : '');

    const cleanUserContent = sanitizeSafeString(rawUserTurn, 500);
    if (!cleanUserContent) {
      return res.status(400).json({ success: false, error: 'User message content is required.' });
    }

    // Server-side kid-safe validation
    const kidCheck = validateKidContentServer(cleanUserContent);
    if (!kidCheck.valid) {
      return res.status(400).json({ success: false, error: kidCheck.reason });
    }

    const safeTheme = sanitizeSafeString(context?.theme, 80);
    const safeChildName = sanitizeSafeString(context?.childName, 40);

    // Chat context validation: Kid-safety & prompt injection defense
    if (safeTheme) {
      const themeKidCheck = validateKidContentServer(safeTheme);
      if (!themeKidCheck.valid) {
        return res.status(400).json({ success: false, error: themeKidCheck.reason });
      }
    }

    if (safeChildName) {
      const nameKidCheck = validateKidContentServer(safeChildName);
      if (!nameKidCheck.valid) {
        return res.status(400).json({ success: false, error: nameKidCheck.reason });
      }
    }

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

    // Respect explicitly requested model; fall back to role defaults only when model was not specified
    let selectedModel = model || 'gemini-3.8-flash';
    if (!parsed.data.model) {
      if (role === 'complex_storyteller') {
        selectedModel = 'gemini-3.1-pro-preview';
      } else if (role === 'quick_sparks') {
        selectedModel = 'gemini-3.1-flash-lite';
      }
    }

    // Append ONLY the validated user turn to server-controlled history
    serverHistory.push({
      role: 'user',
      parts: [{ text: cleanUserContent }],
      timestamp: Date.now(),
    });

    // Bound conversation depth to last 10 turns (5 full user-model rounds)
    if (serverHistory.length > 10) {
      serverHistory = serverHistory.slice(-10);
    }

    const contents = serverHistory.map((m) => ({
      role: m.role,
      parts: m.parts,
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 800,
      },
    });

    const replyText = response.text || '';

    // Append genuine server-generated model response to server-controlled history
    serverHistory.push({
      role: 'model',
      parts: [{ text: replyText }],
      timestamp: Date.now(),
    });

    // Ensure map size is bounded to prevent unbounded memory growth
    if (serverChatHistories.size > 2000 && !serverChatHistories.has(sessionKey)) {
      const oldestKey = serverChatHistories.keys().next().value;
      if (oldestKey) serverChatHistories.delete(oldestKey);
    }
    serverChatHistories.set(sessionKey, serverHistory);

    return res.json({
      success: true,
      text: replyText,
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

// Endpoint: Clear server-controlled chat history for this anonymous session + chat session
app.post('/api/chat/clear', (req, res) => {
  const anonSessionId = getAnonymousSessionId(req);
  const cleanChatSessionId = sanitizeSafeString(
    (req.body?.chatSessionId as string) || (req.query?.chatSessionId as string),
    100
  ) || 'default-chat';
  const sessionKey = `${anonSessionId}:${cleanChatSessionId}`;
  serverChatHistories.delete(sessionKey);
  return res.json({ success: true, cleared: true, sessionKey });
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
