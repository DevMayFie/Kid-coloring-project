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

  return { valid: true };
}
