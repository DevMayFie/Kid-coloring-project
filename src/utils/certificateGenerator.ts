/**
 * Generates an ornate, kid-friendly "Coloring Master" Certificate of Completion
 * Renders as a crisp vector SVG data URL suitable for PDF export and web display.
 */

export interface CertificateData {
  childName: string;
  bookTitle: string;
  theme?: string;
  awardDate?: string;
  presenter?: string;
}

export function generateCertificateDataUrl(data: CertificateData): string {
  const child = data.childName.trim() || 'Young Artist';
  const title = data.bookTitle.trim() || 'Creative Coloring Adventure';
  const today = data.awardDate || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const presenter = data.presenter || 'Parent / Teacher';

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <!-- Gold Gradient -->
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F59E0B" />
        <stop offset="50%" stop-color="#FDE68A" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>

      <!-- Soft Parchment Gradient Background -->
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFDF7" />
        <stop offset="100%" stop-color="#FEF9EE" />
      </linearGradient>
    </defs>

    <!-- Certificate Base Paper -->
    <rect width="800" height="600" fill="url(#bgGrad)" />

    <!-- Outer Decorative Border -->
    <rect x="24" y="24" width="752" height="552" rx="16" fill="none" stroke="#D97706" stroke-width="4" />
    <rect x="34" y="34" width="732" height="532" rx="12" fill="none" stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="6,4" />
    <rect x="42" y="42" width="716" height="516" rx="8" fill="none" stroke="#1F2937" stroke-width="1" />

    <!-- Corner Rosettes -->
    <!-- Top-Left -->
    <circle cx="56" cy="56" r="14" fill="#FEF3C7" stroke="#D97706" stroke-width="3" />
    <text x="56" y="61" font-size="14" text-anchor="middle">⭐</text>
    <!-- Top-Right -->
    <circle cx="744" cy="56" r="14" fill="#FEF3C7" stroke="#D97706" stroke-width="3" />
    <text x="744" y="61" font-size="14" text-anchor="middle">⭐</text>
    <!-- Bottom-Left -->
    <circle cx="56" cy="544" r="14" fill="#FEF3C7" stroke="#D97706" stroke-width="3" />
    <text x="56" y="549" font-size="14" text-anchor="middle">⭐</text>
    <!-- Bottom-Right -->
    <circle cx="744" cy="544" r="14" fill="#FEF3C7" stroke="#D97706" stroke-width="3" />
    <text x="744" y="549" font-size="14" text-anchor="middle">⭐</text>

    <!-- Top Badge / Header Ribbon -->
    <g transform="translate(400, 115)">
      <!-- Golden Trophy / Crown Icon -->
      <circle cx="0" cy="-35" r="32" fill="url(#goldGrad)" stroke="#B45309" stroke-width="3" />
      <text x="0" y="-23" font-size="28" text-anchor="middle">🏆</text>

      <!-- Main Ribbon Banner -->
      <path d="M -230 10 L -210 -15 L 210 -15 L 230 10 L 210 35 L -210 35 Z" fill="#D97706" />
      <path d="M -210 8 L -195 -12 L 195 -12 L 210 8 L 195 28 L -195 28 Z" fill="#F59E0B" />
      <text x="0" y="16" font-family="Georgia, serif" font-weight="900" font-size="20" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">
        CERTIFICATE OF ACHIEVEMENT
      </text>
    </g>

    <!-- Subheading -->
    <text x="400" y="195" font-family="sans-serif" font-size="15" fill="#4B5563" text-anchor="middle" letter-spacing="2">
      THIS MASTERPIECE AWARD IS PROUDLY PRESENTED TO
    </text>

    <!-- Recipient Child Name -->
    <text x="400" y="260" font-family="Georgia, serif" font-weight="bold" font-size="44" fill="#1E293B" text-anchor="middle">
      ${child}
    </text>
    <!-- Name underline bar with star -->
    <line x1="180" y1="275" x2="620" y2="275" stroke="#D97706" stroke-width="3" stroke-linecap="round" />
    <circle cx="400" cy="275" r="7" fill="#F59E0B" stroke="#B45309" stroke-width="1.5" />

    <!-- Reason / Achievement Text -->
    <text x="400" y="320" font-family="sans-serif" font-size="16" fill="#374151" text-anchor="middle">
      for demonstrating extraordinary creativity, colorful imagination, and dedication
    </text>
    <text x="400" y="348" font-family="Georgia, serif" font-style="italic" font-size="20" font-weight="bold" fill="#B45309" text-anchor="middle">
      in completing the coloring adventure: "${title}"
    </text>

    <!-- Gold Seal of Excellence (Bottom Center-Left) -->
    <g transform="translate(180, 440)">
      <!-- Starburst Seal -->
      <circle cx="0" cy="0" r="42" fill="url(#goldGrad)" stroke="#B45309" stroke-width="3" />
      <circle cx="0" cy="0" r="35" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5" stroke-dasharray="3,2" />
      <text x="0" y="-8" font-family="sans-serif" font-weight="900" font-size="9" fill="#92400E" text-anchor="middle" letter-spacing="1">OFFICIAL</text>
      <text x="0" y="8" font-family="sans-serif" font-weight="900" font-size="12" fill="#B45309" text-anchor="middle">MASTER</text>
      <text x="0" y="22" font-family="sans-serif" font-weight="bold" font-size="9" fill="#92400E" text-anchor="middle">ARTIST</text>

      <!-- Seal Ribbons hanging below -->
      <polygon points="-12,38 -20,70 -5,62 0,72 10,40" fill="#DC2626" />
      <polygon points="12,38 20,70 5,62 0,72 -10,40" fill="#B91C1C" />
    </g>

    <!-- Signatures Section -->
    <!-- Date -->
    <g transform="translate(360, 470)">
      <line x1="0" y1="0" x2="160" y2="0" stroke="#4B5563" stroke-width="1.5" />
      <text x="80" y="-10" font-family="Georgia, serif" font-size="13" fill="#111827" text-anchor="middle">${today}</text>
      <text x="80" y="20" font-family="sans-serif" font-size="11" fill="#6B7280" text-anchor="middle" font-weight="bold">DATE AWARDED</text>
    </g>

    <!-- Presenter / Signature -->
    <g transform="translate(560, 470)">
      <line x1="0" y1="0" x2="170" y2="0" stroke="#4B5563" stroke-width="1.5" />
      <text x="85" y="-10" font-family="Georgia, serif" font-style="italic" font-size="14" fill="#1E40AF" text-anchor="middle">ColorCraft Academy</text>
      <text x="85" y="20" font-family="sans-serif" font-size="11" fill="#6B7280" text-anchor="middle" font-weight="bold">${presenter.toUpperCase()} SIGNATURE</text>
    </g>

    <!-- Cheerful encouragement bottom footer -->
    <text x="400" y="540" font-family="sans-serif" font-size="12" font-style="italic" fill="#9CA3AF" text-anchor="middle">
      Keep dreaming, exploring, and coloring the world with joy! 🎨✨
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
