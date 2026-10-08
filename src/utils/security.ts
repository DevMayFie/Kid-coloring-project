/**
 * Security and Sanitization Utilities
 * - HTML escaping for print windows and safe DOM interpolation
 * - Input length capping and string sanitization
 * - Child-friendly content moderation helpers
 */

/**
 * Escapes characters that could lead to HTML injection in document.write / innerHTML
 */
export function escapeHtml(unsafe: string = ''): string {
  if (!unsafe || typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapes characters for strict XML/SVG text nodes and attributes to prevent SVG injection
 */
export function escapeXml(unsafe: string = ''): string {
  if (!unsafe || typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Strips dangerous HTML tags and control characters, enforces length limits
 */
export function sanitizeInput(str: string = '', maxLength = 100): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Strip control characters
    .trim()
    .slice(0, maxLength);
}

/**
 * Basic blocklist of inappropriate keywords for children's coloring books
 */
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

/**
 * Prompt injection patterns to neutralize in AI prompts
 */
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s*prompt/i,
  /you\s+are\s+now\s+(an\s+unfiltered|a\s+different)/i,
  /reveal\s+(the\s+)?(api\s+key|secret|token)/i,
  /bypass\s+all\s+(filters|guardrails)/i,
  /override\s+system/i,
];

/**
 * Check if a theme or prompt contains inappropriate content for a children's app
 */
export function validateKidContent(text: string): { valid: boolean; reason?: string } {
  if (!text || typeof text !== 'string') {
    return { valid: true };
  }

  const lower = text.toLowerCase();
  for (const word of INAPPROPRIATE_WORDS) {
    // Check whole word boundary
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      return {
        valid: false,
        reason: `Please choose a kid-friendly topic (avoid words like "${word}").`,
      };
    }
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        valid: false,
        reason: 'Input contains disallowed system instructions or prompt injection attempts.',
      };
    }
  }

  return { valid: true };
}

/**
 * Neutralizes potential prompt injection markers and control characters
 */
export function sanitizePromptText(text: string = '', maxLen = 300): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[`"'\\{}[\]<>]/g, ' ') // Neutralize brackets, quotes, and backticks
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Strip control characters
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
    .slice(0, maxLen);
}
