import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  subtitle?: string;
  compactOnMobile?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  subtitle,
  compactOnMobile = true,
}) => {
  const sizeDimensions = {
    xs: { icon: 'w-6 h-6', text: 'text-xs', sub: 'text-[9px]' },
    sm: { icon: 'w-8 h-8', text: 'text-sm', sub: 'text-[10px]' },
    md: { icon: 'w-10 h-10', text: 'text-base', sub: 'text-[11px]' },
    lg: { icon: 'w-14 h-14', text: 'text-xl', sub: 'text-xs' },
    xl: { icon: 'w-20 h-20', text: 'text-2xl', sub: 'text-sm' },
  };

  const dim = sizeDimensions[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon SVG */}
      <div className={`${dim.icon} shrink-0 relative flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Rounded playful background */}
          <rect x="5" y="5" width="90" height="90" rx="26" fill="url(#bgGrad)" stroke="#F59E0B" strokeWidth="3" />

          {/* Sparkles in background */}
          <path d="M 22 25 L 24 18 L 26 25 L 33 27 L 26 29 L 24 36 L 22 29 L 15 27 Z" fill="#FBBF24" />
          <path d="M 76 72 L 77.5 67 L 79 72 L 84 73.5 L 79 75 L 77.5 80 L 76 75 L 71 73.5 Z" fill="#FBBF24" />
          <circle cx="78" cy="22" r="3.5" fill="#F43F5E" />
          <circle cx="20" cy="74" r="3" fill="#3B82F6" />

          {/* Open Storybook Pages */}
          <path
            d="M 20 68 C 35 63 45 68 50 72 C 55 68 65 63 80 68 L 80 82 C 65 77 55 81 50 85 C 45 81 35 77 20 82 Z"
            fill="#FFFFFF"
            stroke="#1E293B"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path d="M 50 72 L 50 85" stroke="#1E293B" strokeWidth="3" />

          {/* Friendly Crayon Character */}
          <g transform="translate(10, 0)">
            {/* Crayon Body */}
            <rect x="30" y="24" width="20" height="38" rx="4" fill="#F97316" stroke="#1E293B" strokeWidth="3.5" />
            {/* Crayon Label Band */}
            <rect x="30" y="36" width="20" height="14" fill="#FEF3C7" stroke="#1E293B" strokeWidth="2.5" />
            <ellipse cx="40" cy="43" rx="7" ry="4" fill="#F59E0B" opacity="0.6" />

            {/* Crayon Tip (Triangle) */}
            <polygon points="30,24 40,8 50,24" fill="#EA580C" stroke="#1E293B" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M 37 13 L 43 13" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />

            {/* Crayon Face */}
            <circle cx="36" cy="30" r="2.2" fill="#1E293B" />
            <circle cx="44" cy="30" r="2.2" fill="#1E293B" />
            {/* Catchlights */}
            <circle cx="35.3" cy="29.3" r="0.8" fill="#FFFFFF" />
            <circle cx="43.3" cy="29.3" r="0.8" fill="#FFFFFF" />
            {/* Smiling mouth */}
            <path d="M 37 33 Q 40 37 43 33" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
            {/* Rosy cheeks */}
            <circle cx="33" cy="32" r="1.8" fill="#F43F5E" opacity="0.5" />
            <circle cx="47" cy="32" r="1.8" fill="#F43F5E" opacity="0.5" />
          </g>

          {/* Magic Wand / Pencil in Hand */}
          <line x1="64" y1="28" x2="74" y2="18" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
          <polygon points="74,18 78,14 77,21" fill="#FBBF24" stroke="#1E293B" strokeWidth="1.5" />

          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="50%" stopColor="#FEF3C7" />
              <stop offset="100%" stopColor="#FDE68A" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col leading-tight shrink-0">
          <span
            className={`font-black tracking-tight text-gray-900 ${dim.text} flex items-center gap-1 whitespace-nowrap`}
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            <span>ColorCraft</span>
            <span className="text-amber-600">Kids</span>
          </span>
          {subtitle ? (
            <span className={`text-gray-500 font-medium ${dim.sub} ${compactOnMobile ? 'hidden sm:block' : ''}`}>{subtitle}</span>
          ) : (
            <span className={`text-amber-800/80 font-medium ${dim.sub} ${compactOnMobile ? 'hidden sm:block' : ''}`}>Coloring Studio</span>
          )}
        </div>
      )}
    </div>
  );
};

// Preset vector logos for schools, camps, party sponsors & organizations
export function getPresetLogoSvg(preset: string): string {
  switch (preset) {
    case 'school-crest':
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="44" fill="#EFF6FF" stroke="#2563EB" stroke-width="4"/>
        <path d="M 22 55 Q 35 45 50 52 Q 65 45 78 55 L 78 72 Q 65 65 50 70 Q 35 65 22 72 Z" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="3"/>
        <path d="M 50 52 L 50 70" stroke="#1E3A8A" stroke-width="2.5"/>
        <polygon points="50,22 68,32 50,42 32,32" fill="#3B82F6" stroke="#1E3A8A" stroke-width="2.5"/>
        <rect x="47" y="42" width="6" height="10" fill="#1E3A8A"/>
        <circle cx="50" cy="53" r="3" fill="#FBBF24"/>
        <path d="M 18 36 Q 24 50 20 64" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M 82 36 Q 76 50 80 64" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`;

    case 'art-palette':
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M 50 14 C 28 14 14 28 14 50 C 14 72 32 86 52 86 C 60 86 64 80 64 74 C 64 69 68 66 74 66 C 82 66 86 60 86 50 C 86 28 72 14 50 14 Z" fill="#FEF3C7" stroke="#D97706" stroke-width="4"/>
        <circle cx="70" cy="48" r="7" fill="#EFF6FF" stroke="#D97706" stroke-width="2.5"/>
        <circle cx="32" cy="34" r="6" fill="#EF4444"/>
        <circle cx="48" cy="26" r="6" fill="#F59E0B"/>
        <circle cx="66" cy="30" r="6" fill="#10B981"/>
        <circle cx="30" cy="52" r="6" fill="#3B82F6"/>
        <circle cx="38" cy="68" r="6" fill="#8B5CF6"/>
      </svg>`;

    case 'star-rocket':
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="44" fill="#F5F3FF" stroke="#7C3AED" stroke-width="4"/>
        <path d="M 50 18 Q 66 38 62 60 L 38 60 Q 34 38 50 18 Z" fill="#FFFFFF" stroke="#6D28D9" stroke-width="3"/>
        <circle cx="50" cy="38" r="7" fill="#DDD6FE" stroke="#6D28D9" stroke-width="2.5"/>
        <polygon points="38,50 25,66 40,62" fill="#A78BFA" stroke="#6D28D9" stroke-width="2.5"/>
        <polygon points="62,50 75,66 60,62" fill="#A78BFA" stroke="#6D28D9" stroke-width="2.5"/>
        <path d="M 44 60 Q 50 78 50 70 Q 54 78 56 60" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>
        <circle cx="28" cy="28" r="2.5" fill="#FBBF24"/>
        <circle cx="72" cy="32" r="3" fill="#FBBF24"/>
      </svg>`;

    case 'party-balloon':
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="44" fill="#FFF1F2" stroke="#E11D48" stroke-width="4"/>
        <ellipse cx="40" cy="40" rx="16" ry="20" fill="#F43F5E" stroke="#9F1239" stroke-width="2.5"/>
        <ellipse cx="60" cy="44" rx="15" ry="19" fill="#FB7185" stroke="#9F1239" stroke-width="2.5"/>
        <path d="M 40 60 Q 44 72 38 82" fill="none" stroke="#9F1239" stroke-width="2" stroke-linecap="round"/>
        <path d="M 60 63 Q 56 74 62 82" fill="none" stroke="#9F1239" stroke-width="2" stroke-linecap="round"/>
        <polygon points="26,24 28,30 34,26" fill="#FBBF24"/>
        <polygon points="72,22 75,28 80,24" fill="#38BDF8"/>
      </svg>`;

    case 'crayon-mascot':
    default:
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="44" fill="#FEF3C7" stroke="#D97706" stroke-width="4"/>
        <rect x="38" y="34" width="24" height="42" rx="4" fill="#F97316" stroke="#1E293B" stroke-width="3"/>
        <rect x="38" y="46" width="24" height="15" fill="#FEF3C7" stroke="#1E293B" stroke-width="2"/>
        <polygon points="38,34 50,18 62,34" fill="#EA580C" stroke="#1E293B" stroke-width="3"/>
        <circle cx="45" cy="41" r="2.2" fill="#1E293B"/>
        <circle cx="55" cy="41" r="2.2" fill="#1E293B"/>
        <path d="M 46 44 Q 50 48 54 44" fill="none" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
  }
}

export function getPresetLogoDataUrl(preset: string): string {
  const svg = getPresetLogoSvg(preset);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
