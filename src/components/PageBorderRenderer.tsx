import React from 'react';
import { PageBorderStyle } from '../types';

export interface BorderStyleOption {
  id: PageBorderStyle;
  name: string;
  icon: string;
  description: string;
  tag: string;
}

export const BORDER_STYLES: BorderStyleOption[] = [
  {
    id: 'classic-double',
    name: 'Classic Storybook',
    icon: '🖼️',
    description: 'Crisp double outline with elegant corner squares and traditional storybook frame',
    tag: 'Classic',
  },
  {
    id: 'stars-sparkles',
    name: 'Stars & Sparkles',
    icon: '✨',
    description: 'Whimsical 5-pointed stars and twinkling sparkle clusters decorating every border',
    tag: 'Magical',
  },
  {
    id: 'scalloped-dots',
    name: 'Scalloped Dots',
    icon: '🫧',
    description: 'Playful wavy scalloped curves and joyful bubbly dots loved by toddlers and kids',
    tag: 'Playful',
  },
  {
    id: 'jungle-vines',
    name: 'Jungle Vines & Leaves',
    icon: '🌿',
    description: 'Whimsical leafy vines winding around the page, perfect for animals and nature',
    tag: 'Nature',
  },
  {
    id: 'space-constellation',
    name: 'Cosmic Constellations',
    icon: '🚀',
    description: 'Futuristic geometric celestial nodes, orbiting rings, and cosmic corner bursts',
    tag: 'Cosmic',
  },
  {
    id: 'hearts-ribbons',
    name: 'Hearts & Ribbons',
    icon: '💖',
    description: 'Sweet delicate corner hearts and cheerful connected ribbon loops',
    tag: 'Sweet',
  },
  {
    id: 'zigzag-fun',
    name: 'Zigzag Chevron',
    icon: '⚡',
    description: 'Bold geometric zig-zag chevrons giving a vibrant, action-packed comic feel',
    tag: 'Energetic',
  },
  {
    id: 'none',
    name: 'Minimal / Clean Margin',
    icon: '⬜',
    description: 'Subtle clean margin without extra ornamental corner artwork',
    tag: 'Minimal',
  },
];

interface PageBorderRendererProps {
  borderStyle?: PageBorderStyle;
  className?: string;
}

/**
 * High-contrast SVG vector border overlay that renders over or around
 * any coloring page illustration in crisp black-and-white ink.
 */
export const PageBorderRenderer: React.FC<PageBorderRendererProps> = ({
  borderStyle = 'classic-double',
  className = '',
}) => {
  if (borderStyle === 'none') {
    return (
      <svg
        viewBox="0 0 400 533"
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="6" y="6" width="388" height="521" stroke="#262626" strokeWidth="1.5" rx="4" />
      </svg>
    );
  }

  if (borderStyle === 'classic-double') {
    return (
      <svg
        viewBox="0 0 400 533"
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer heavy line */}
        <rect x="8" y="8" width="384" height="517" stroke="#171717" strokeWidth="3" rx="6" />
        {/* Inner fine line */}
        <rect x="15" y="15" width="370" height="503" stroke="#262626" strokeWidth="1.2" rx="3" />
        {/* Corner Square Accents */}
        <rect x="11" y="11" width="8" height="8" fill="#171717" />
        <rect x="381" y="11" width="8" height="8" fill="#171717" />
        <rect x="11" y="514" width="8" height="8" fill="#171717" />
        <rect x="381" y="514" width="8" height="8" fill="#171717" />
        {/* Corner Cross Motifs */}
        <path d="M 24 15 L 24 25 M 15 24 L 25 24" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
        <path d="M 376 15 L 376 25 M 385 24 L 375 24" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
        <path d="M 24 518 L 24 508 M 15 509 L 25 509" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
        <path d="M 376 518 L 376 508 M 385 509 L 375 509" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (borderStyle === 'stars-sparkles') {
    return (
      <svg
        viewBox="0 0 400 533"
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main boundary with rounded soft corners */}
        <rect x="10" y="10" width="380" height="513" stroke="#171717" strokeWidth="2.5" rx="10" />
        <rect x="16" y="16" width="368" height="501" stroke="#404040" strokeWidth="1" strokeDasharray="6 4" rx="6" />

        {/* Top-Left Corner Star */}
        <g transform="translate(10, 10)">
          <path d="M 12 0 L 15 8 L 24 12 L 15 16 L 12 24 L 9 16 L 0 12 L 9 8 Z" fill="#171717" />
          <circle cx="28" cy="12" r="2" fill="#171717" />
          <circle cx="12" cy="28" r="2" fill="#171717" />
        </g>

        {/* Top-Right Corner Star */}
        <g transform="translate(366, 10)">
          <path d="M 12 0 L 15 8 L 24 12 L 15 16 L 12 24 L 9 16 L 0 12 L 9 8 Z" fill="#171717" />
          <circle cx="-4" cy="12" r="2" fill="#171717" />
          <circle cx="12" cy="28" r="2" fill="#171717" />
        </g>

        {/* Bottom-Left Corner Star */}
        <g transform="translate(10, 499)">
          <path d="M 12 0 L 15 8 L 24 12 L 15 16 L 12 24 L 9 16 L 0 12 L 9 8 Z" fill="#171717" />
          <circle cx="28" cy="12" r="2" fill="#171717" />
          <circle cx="12" cy="-4" r="2" fill="#171717" />
        </g>

        {/* Bottom-Right Corner Star */}
        <g transform="translate(366, 499)">
          <path d="M 12 0 L 15 8 L 24 12 L 15 16 L 12 24 L 9 16 L 0 12 L 9 8 Z" fill="#171717" />
          <circle cx="-4" cy="12" r="2" fill="#171717" />
          <circle cx="12" cy="-4" r="2" fill="#171717" />
        </g>

        {/* Perimeter Star Accents */}
        <g fill="#171717">
          {/* Top Center Stars */}
          <path d="M 200 4 L 202 8 L 206 10 L 202 12 L 200 16 L 198 12 L 194 10 L 198 8 Z" />
          <path d="M 120 7 L 121 9 L 123 10 L 121 11 L 120 13 L 119 11 L 117 10 L 119 9 Z" />
          <path d="M 280 7 L 281 9 L 283 10 L 281 11 L 280 13 L 279 11 L 277 10 L 279 9 Z" />

          {/* Bottom Center Stars */}
          <path d="M 200 517 L 202 521 L 206 523 L 202 525 L 200 529 L 198 525 L 194 523 L 198 521 Z" />
          <path d="M 120 520 L 121 522 L 123 523 L 121 524 L 120 526 L 119 524 L 117 523 L 119 522 Z" />
          <path d="M 280 520 L 281 522 L 283 523 L 281 524 L 280 526 L 279 524 L 277 523 L 279 522 Z" />

          {/* Left / Right Midpoint Stars */}
          <path d="M 10 266 L 12 268 L 14 270 L 12 272 L 10 274 L 8 272 L 6 270 L 8 268 Z" />
          <path d="M 390 266 L 392 268 L 394 270 L 392 272 L 390 274 L 388 272 L 386 270 L 388 268 Z" />
        </g>
      </svg>
    );
  }

  if (borderStyle === 'scalloped-dots') {
    return (
      <svg
        viewBox="0 0 400 533"
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Double Scalloped Track */}
        <rect x="8" y="8" width="384" height="517" stroke="#171717" strokeWidth="2.5" rx="12" />
        <rect x="14" y="14" width="372" height="505" stroke="#525252" strokeWidth="1" rx="8" />

        {/* Decorative corner loops */}
        <circle cx="22" cy="22" r="6" stroke="#171717" strokeWidth="2" fill="white" />
        <circle cx="22" cy="22" r="2.5" fill="#171717" />
        <circle cx="378" cy="22" r="6" stroke="#171717" strokeWidth="2" fill="white" />
        <circle cx="378" cy="22" r="2.5" fill="#171717" />
        <circle cx="22" cy="511" r="6" stroke="#171717" strokeWidth="2" fill="white" />
        <circle cx="22" cy="511" r="2.5" fill="#171717" />
        <circle cx="378" cy="511" r="6" stroke="#171717" strokeWidth="2" fill="white" />
        <circle cx="378" cy="511" r="2.5" fill="#171717" />

        {/* Scalloped dot nodes along edges */}
        <g fill="#171717">
          {/* Top row */}
          {[60, 100, 140, 180, 220, 260, 300, 340].map((x) => (
            <circle key={`top-${x}`} cx={x} cy={11} r={2.5} />
          ))}
          {/* Bottom row */}
          {[60, 100, 140, 180, 220, 260, 300, 340].map((x) => (
            <circle key={`bot-${x}`} cx={x} cy={522} r={2.5} />
          ))}
          {/* Left col */}
          {[60, 110, 160, 210, 260, 310, 360, 410, 460].map((y) => (
            <circle key={`left-${y}`} cx={11} cy={y} r={2.5} />
          ))}
          {/* Right col */}
          {[60, 110, 160, 210, 260, 310, 360, 410, 460].map((y) => (
            <circle key={`right-${y}`} cx={389} cy={y} r={2.5} />
          ))}
        </g>
      </svg>
    );
  }

  if (borderStyle === 'jungle-vines') {
    return (
      <svg
        viewBox="0 0 400 533"
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Organic Vine boundary */}
        <rect x="9" y="9" width="382" height="515" stroke="#171717" strokeWidth="2.5" rx="8" />

        {/* Top-Left Vine Flourish */}
        <g stroke="#171717" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M 9 35 C 18 25, 25 18, 35 9" />
          <path d="M 22 22 Q 30 14, 38 18 Q 32 26, 22 22 Z" fill="#262626" />
          <path d="M 18 32 Q 22 42, 14 46 Q 10 38, 18 32 Z" fill="#262626" />
        </g>

        {/* Top-Right Vine Flourish */}
        <g stroke="#171717" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M 391 35 C 382 25, 375 18, 365 9" />
          <path d="M 378 22 Q 370 14, 362 18 Q 368 26, 378 22 Z" fill="#262626" />
          <path d="M 382 32 Q 378 42, 386 46 Q 390 38, 382 32 Z" fill="#262626" />
        </g>

        {/* Bottom-Left Vine Flourish */}
        <g stroke="#171717" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M 9 498 C 18 508, 25 515, 35 524" />
          <path d="M 22 511 Q 30 519, 38 515 Q 32 507, 22 511 Z" fill="#262626" />
          <path d="M 18 501 Q 22 491, 14 487 Q 10 495, 18 501 Z" fill="#262626" />
        </g>

        {/* Bottom-Right Vine Flourish */}
        <g stroke="#171717" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M 391 498 C 382 508, 375 515, 365 524" />
          <path d="M 378 511 Q 370 519, 362 515 Q 368 507, 378 511 Z" fill="#262626" />
          <path d="M 382 501 Q 378 491, 386 487 Q 390 495, 382 501 Z" fill="#262626" />
        </g>

        {/* Vine leaf accents along edges */}
        <g fill="#262626">
          <path d="M 196 9 Q 200 4, 206 7 Q 202 14, 196 9 Z" />
          <path d="M 204 9 Q 200 14, 194 11 Q 198 4, 204 9 Z" />
          <path d="M 196 524 Q 200 529, 206 526 Q 202 519, 196 524 Z" />
          <path d="M 9 263 Q 4 266, 7 272 Q 14 268, 9 263 Z" />
          <path d="M 391 263 Q 396 266, 393 272 Q 386 268, 391 263 Z" />
        </g>
      </svg>
    );
  }

  if (borderStyle === 'space-constellation') {
    return (
      <svg
        viewBox="0 0 400 533"
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cosmic Orbit Frame */}
        <rect x="10" y="10" width="380" height="513" stroke="#171717" strokeWidth="2.5" rx="6" />
        <rect x="16" y="16" width="368" height="501" stroke="#404040" strokeWidth="1" strokeDasharray="4 6" rx="4" />

        {/* Planet & Orbital Rings in Corners */}
        <g stroke="#171717" strokeWidth="1.8" fill="white">
          {/* Top Left Orbit */}
          <circle cx="20" cy="20" r="8" />
          <ellipse cx="20" cy="20" rx="14" ry="5" transform="rotate(-30 20 20)" fill="none" strokeWidth="1.2" />
          <circle cx="20" cy="20" r="2.5" fill="#171717" />

          {/* Top Right Orbit */}
          <circle cx="380" cy="20" r="8" />
          <ellipse cx="380" cy="20" rx="14" ry="5" transform="rotate(30 380 20)" fill="none" strokeWidth="1.2" />
          <circle cx="380" cy="20" r="2.5" fill="#171717" />

          {/* Bottom Left Orbit */}
          <circle cx="20" cy="513" r="8" />
          <ellipse cx="20" cy="513" rx="14" ry="5" transform="rotate(30 20 513)" fill="none" strokeWidth="1.2" />
          <circle cx="20" cy="513" r="2.5" fill="#171717" />

          {/* Bottom Right Orbit */}
          <circle cx="380" cy="513" r="8" />
          <ellipse cx="380" cy="513" rx="14" ry="5" transform="rotate(-30 380 513)" fill="none" strokeWidth="1.2" />
          <circle cx="380" cy="513" r="2.5" fill="#171717" />
        </g>

        {/* Constellation lines & stars */}
        <g stroke="#171717" strokeWidth="1.2" fill="#171717">
          <circle cx="200" cy="10" r="3.5" />
          <circle cx="10" cy="266" r="3.5" />
          <circle cx="390" cy="266" r="3.5" />
          <circle cx="200" cy="523" r="3.5" />
        </g>
      </svg>
    );
  }

  if (borderStyle === 'hearts-ribbons') {
    return (
      <svg
        viewBox="0 0 400 533"
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="9" y="9" width="382" height="515" stroke="#171717" strokeWidth="2.5" rx="10" />
        <rect x="15" y="15" width="370" height="503" stroke="#525252" strokeWidth="1" strokeDasharray="5 3" rx="7" />

        {/* Corner Hearts */}
        <g fill="#171717">
          {/* Top Left */}
          <path d="M 20 18 C 16 12, 10 16, 14 22 L 20 28 L 26 22 C 30 16, 24 12, 20 18 Z" />
          {/* Top Right */}
          <path d="M 380 18 C 376 12, 370 16, 374 22 L 380 28 L 386 22 C 390 16, 384 12, 380 18 Z" />
          {/* Bottom Left */}
          <path d="M 20 508 C 16 502, 10 506, 14 512 L 20 518 L 26 512 C 30 506, 24 502, 20 508 Z" />
          {/* Bottom Right */}
          <path d="M 380 508 C 376 502, 370 506, 374 512 L 380 518 L 386 512 C 390 506, 384 502, 380 508 Z" />

          {/* Center Edge Hearts */}
          <path d="M 200 6 C 197 2, 192 5, 195 9 L 200 14 L 205 9 C 208 5, 203 2, 200 6 Z" />
          <path d="M 200 520 C 197 516, 192 519, 195 523 L 200 528 L 205 523 C 208 519, 203 516, 200 520 Z" />
          <path d="M 6 266 C 2 263, 5 258, 9 261 L 14 266 L 9 271 C 5 274, 2 269, 6 266 Z" />
          <path d="M 394 266 C 398 263, 395 258, 391 261 L 386 266 L 391 271 C 395 274, 398 269, 394 266 Z" />
        </g>
      </svg>
    );
  }

  if (borderStyle === 'zigzag-fun') {
    return (
      <svg
        viewBox="0 0 400 533"
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="8" y="8" width="384" height="517" stroke="#171717" strokeWidth="2" rx="4" />
        <rect x="16" y="16" width="368" height="501" stroke="#171717" strokeWidth="1.5" rx="3" />

        {/* Zigzag pattern in border margin */}
        {/* Top Zigzags */}
        <path
          d="M 20 12 L 35 8 L 50 12 L 65 8 L 80 12 L 95 8 L 110 12 L 125 8 L 140 12 L 155 8 L 170 12 L 185 8 L 200 12 L 215 8 L 230 12 L 245 8 L 260 12 L 275 8 L 290 12 L 305 8 L 320 12 L 335 8 L 350 12 L 365 8 L 380 12"
          stroke="#171717"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bottom Zigzags */}
        <path
          d="M 20 521 L 35 525 L 50 521 L 65 525 L 80 521 L 95 525 L 110 521 L 125 525 L 140 521 L 155 525 L 170 521 L 185 525 L 200 521 L 215 525 L 230 521 L 245 525 L 260 521 L 275 525 L 290 521 L 305 525 L 320 521 L 335 525 L 350 521 L 365 525 L 380 521"
          stroke="#171717"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Corner Bold Chevrons */}
        <path d="M 12 28 L 22 28 L 22 18" stroke="#171717" strokeWidth="2.5" fill="none" />
        <path d="M 388 28 L 378 28 L 378 18" stroke="#171717" strokeWidth="2.5" fill="none" />
        <path d="M 12 505 L 22 505 L 22 515" stroke="#171717" strokeWidth="2.5" fill="none" />
        <path d="M 388 505 L 378 505 L 378 515" stroke="#171717" strokeWidth="2.5" fill="none" />
      </svg>
    );
  }

  return null;
};
