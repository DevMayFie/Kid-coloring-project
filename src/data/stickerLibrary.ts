export interface DigitalSticker {
  id: string;
  name: string;
  theme: 'space' | 'dinosaurs' | 'fantasy' | 'ocean' | 'animals' | 'party';
  themeLabel: string;
  emoji: string;
  svgDataUri: string;
}

export interface StickerThemeCategory {
  id: 'all' | 'space' | 'dinosaurs' | 'fantasy' | 'ocean' | 'animals' | 'party';
  label: string;
  icon: string;
}

export const STICKER_CATEGORIES: StickerThemeCategory[] = [
  { id: 'all', label: 'All Stickers', icon: '🎨' },
  { id: 'space', label: 'Space & Sci-Fi', icon: '🚀' },
  { id: 'dinosaurs', label: 'Dinosaurs', icon: '🦖' },
  { id: 'fantasy', label: 'Magic & Fantasy', icon: '🦄' },
  { id: 'ocean', label: 'Ocean & Sea', icon: '🌊' },
  { id: 'animals', label: 'Cute Animals', icon: '🦁' },
  { id: 'party', label: 'Party & Sweets', icon: '🧁' },
];

/**
 * Creates a die-cut sticker SVG data URI with a white outline and soft drop shadow.
 */
function makeStickerSvg(emoji: string, bgColor: string, borderColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <filter id="sticker-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.25"/>
      </filter>
    </defs>
    <!-- White die-cut outline circle -->
    <circle cx="60" cy="60" r="54" fill="#ffffff" filter="url(#sticker-shadow)"/>
    <!-- Outer border -->
    <circle cx="60" cy="60" r="49" fill="${bgColor}" stroke="${borderColor}" stroke-width="4"/>
    <!-- Inner dashed badge ring -->
    <circle cx="60" cy="60" r="43" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="6,4" opacity="0.8"/>
    <!-- Sticker Emoji Icon -->
    <text x="60" y="72" font-size="44" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DIGITAL_STICKER_LIBRARY: DigitalSticker[] = [
  // Space & Sci-Fi
  {
    id: 'space_rocket',
    name: 'Blastoff Rocket',
    theme: 'space',
    themeLabel: 'Space & Sci-Fi',
    emoji: '🚀',
    svgDataUri: makeStickerSvg('🚀', '#38bdf8', '#0284c7'),
  },
  {
    id: 'space_ufo',
    name: 'Flying Saucer UFO',
    theme: 'space',
    themeLabel: 'Space & Sci-Fi',
    emoji: '🛸',
    svgDataUri: makeStickerSvg('🛸', '#a855f7', '#7e22ce'),
  },
  {
    id: 'space_saturn',
    name: 'Ringed Planet',
    theme: 'space',
    themeLabel: 'Space & Sci-Fi',
    emoji: '🪐',
    svgDataUri: makeStickerSvg('🪐', '#f59e0b', '#d97706'),
  },
  {
    id: 'space_alien',
    name: 'Friendly Alien Pal',
    theme: 'space',
    themeLabel: 'Space & Sci-Fi',
    emoji: '👽',
    svgDataUri: makeStickerSvg('👽', '#4ade80', '#16a34a'),
  },
  {
    id: 'space_astronaut',
    name: 'Space Explorer',
    theme: 'space',
    themeLabel: 'Space & Sci-Fi',
    emoji: '👨‍🚀',
    svgDataUri: makeStickerSvg('👨‍🚀', '#60a5fa', '#2563eb'),
  },
  {
    id: 'space_star',
    name: 'Cosmic Gold Star',
    theme: 'space',
    themeLabel: 'Space & Sci-Fi',
    emoji: '⭐',
    svgDataUri: makeStickerSvg('⭐', '#facc15', '#ca8a04'),
  },
  {
    id: 'space_comet',
    name: 'Shooting Comet',
    theme: 'space',
    themeLabel: 'Space & Sci-Fi',
    emoji: '☄️',
    svgDataUri: makeStickerSvg('☄️', '#fb7185', '#e11d48'),
  },
  {
    id: 'space_satellite',
    name: 'Orbiting Satellite',
    theme: 'space',
    themeLabel: 'Space & Sci-Fi',
    emoji: '🛰️',
    svgDataUri: makeStickerSvg('🛰️', '#94a3b8', '#475569'),
  },

  // Dinosaurs & Prehistoric
  {
    id: 'dino_trex',
    name: 'Mighty T-Rex',
    theme: 'dinosaurs',
    themeLabel: 'Dinosaurs',
    emoji: '🦖',
    svgDataUri: makeStickerSvg('🦖', '#22c55e', '#15803d'),
  },
  {
    id: 'dino_bronto',
    name: 'Gentle Brontosaurus',
    theme: 'dinosaurs',
    themeLabel: 'Dinosaurs',
    emoji: '🦕',
    svgDataUri: makeStickerSvg('🦕', '#06b6d4', '#0891b2'),
  },
  {
    id: 'dino_egg',
    name: 'Hatching Dino Egg',
    theme: 'dinosaurs',
    themeLabel: 'Dinosaurs',
    emoji: '🥚',
    svgDataUri: makeStickerSvg('🥚', '#fde047', '#eab308'),
  },
  {
    id: 'dino_volcano',
    name: 'Sparking Volcano',
    theme: 'dinosaurs',
    themeLabel: 'Dinosaurs',
    emoji: '🌋',
    svgDataUri: makeStickerSvg('🌋', '#f97316', '#c2410c'),
  },
  {
    id: 'dino_footprint',
    name: 'Giant Dino Track',
    theme: 'dinosaurs',
    themeLabel: 'Dinosaurs',
    emoji: '🐾',
    svgDataUri: makeStickerSvg('🐾', '#78716c', '#44403c'),
  },
  {
    id: 'dino_palm',
    name: 'Prehistoric Jungle Palm',
    theme: 'dinosaurs',
    themeLabel: 'Dinosaurs',
    emoji: '🌴',
    svgDataUri: makeStickerSvg('🌴', '#84cc16', '#4d7c0f'),
  },

  // Fantasy & Magic
  {
    id: 'fantasy_unicorn',
    name: 'Rainbow Unicorn',
    theme: 'fantasy',
    themeLabel: 'Magic & Fantasy',
    emoji: '🦄',
    svgDataUri: makeStickerSvg('🦄', '#f472b6', '#db2777'),
  },
  {
    id: 'fantasy_wand',
    name: 'Sparkle Magic Wand',
    theme: 'fantasy',
    themeLabel: 'Magic & Fantasy',
    emoji: '🪄',
    svgDataUri: makeStickerSvg('🪄', '#c084fc', '#9333ea'),
  },
  {
    id: 'fantasy_crown',
    name: 'Royal Gold Crown',
    theme: 'fantasy',
    themeLabel: 'Magic & Fantasy',
    emoji: '👑',
    svgDataUri: makeStickerSvg('👑', '#facc15', '#b45309'),
  },
  {
    id: 'fantasy_rainbow',
    name: 'Magical Rainbow',
    theme: 'fantasy',
    themeLabel: 'Magic & Fantasy',
    emoji: '🌈',
    svgDataUri: makeStickerSvg('🌈', '#38bdf8', '#0284c7'),
  },
  {
    id: 'fantasy_fairy',
    name: 'Fairy Wings',
    theme: 'fantasy',
    themeLabel: 'Magic & Fantasy',
    emoji: '🧚',
    svgDataUri: makeStickerSvg('🧚', '#e879f9', '#c026d3'),
  },
  {
    id: 'fantasy_castle',
    name: 'Enchanted Castle',
    theme: 'fantasy',
    themeLabel: 'Magic & Fantasy',
    emoji: '🏰',
    svgDataUri: makeStickerSvg('🏰', '#818cf8', '#4338ca'),
  },
  {
    id: 'fantasy_crystal',
    name: 'Glowing Crystal Gem',
    theme: 'fantasy',
    themeLabel: 'Magic & Fantasy',
    emoji: '💎',
    svgDataUri: makeStickerSvg('💎', '#22d3ee', '#0e7490'),
  },

  // Ocean & Sea
  {
    id: 'ocean_octopus',
    name: 'Playful Octopus',
    theme: 'ocean',
    themeLabel: 'Ocean & Sea',
    emoji: '🐙',
    svgDataUri: makeStickerSvg('🐙', '#fb7185', '#be123c'),
  },
  {
    id: 'ocean_dolphin',
    name: 'Smiling Dolphin',
    theme: 'ocean',
    themeLabel: 'Ocean & Sea',
    emoji: '🐬',
    svgDataUri: makeStickerSvg('🐬', '#38bdf8', '#0369a1'),
  },
  {
    id: 'ocean_turtle',
    name: 'Baby Sea Turtle',
    theme: 'ocean',
    themeLabel: 'Ocean & Sea',
    emoji: '🐢',
    svgDataUri: makeStickerSvg('🐢', '#4ade80', '#15803d'),
  },
  {
    id: 'ocean_starfish',
    name: 'Coral Starfish',
    theme: 'ocean',
    themeLabel: 'Ocean & Sea',
    emoji: '⭐',
    svgDataUri: makeStickerSvg('⭐', '#f97316', '#c2410c'),
  },
  {
    id: 'ocean_sub',
    name: 'Yellow Submarine',
    theme: 'ocean',
    themeLabel: 'Ocean & Sea',
    emoji: '🚢',
    svgDataUri: makeStickerSvg('🚢', '#facc15', '#ca8a04'),
  },
  {
    id: 'ocean_jelly',
    name: 'Glowing Jellyfish',
    theme: 'ocean',
    themeLabel: 'Ocean & Sea',
    emoji: '🪼',
    svgDataUri: makeStickerSvg('🪼', '#c084fc', '#7e22ce'),
  },
  {
    id: 'ocean_shell',
    name: 'Seashell Treasure',
    theme: 'ocean',
    themeLabel: 'Ocean & Sea',
    emoji: '🐚',
    svgDataUri: makeStickerSvg('🐚', '#fde047', '#d97706'),
  },

  // Animals & Safari
  {
    id: 'animal_lion',
    name: 'Brave Little Lion',
    theme: 'animals',
    themeLabel: 'Cute Animals',
    emoji: '🦁',
    svgDataUri: makeStickerSvg('🦁', '#f59e0b', '#b45309'),
  },
  {
    id: 'animal_monkey',
    name: 'Cheeky Monkey',
    theme: 'animals',
    themeLabel: 'Cute Animals',
    emoji: '🐒',
    svgDataUri: makeStickerSvg('🐒', '#d97706', '#92400e'),
  },
  {
    id: 'animal_panda',
    name: 'Bamboo Panda',
    theme: 'animals',
    themeLabel: 'Cute Animals',
    emoji: '🐼',
    svgDataUri: makeStickerSvg('🐼', '#94a3b8', '#334155'),
  },
  {
    id: 'animal_puppy',
    name: 'Happy Puppy',
    theme: 'animals',
    themeLabel: 'Cute Animals',
    emoji: '🐶',
    svgDataUri: makeStickerSvg('🐶', '#fde047', '#ca8a04'),
  },
  {
    id: 'animal_bear',
    name: 'Teddy Bear',
    theme: 'animals',
    themeLabel: 'Cute Animals',
    emoji: '🐻',
    svgDataUri: makeStickerSvg('🐻', '#b45309', '#78350f'),
  },
  {
    id: 'animal_elephant',
    name: 'Playful Elephant',
    theme: 'animals',
    themeLabel: 'Cute Animals',
    emoji: '🐘',
    svgDataUri: makeStickerSvg('🐘', '#93c5fd', '#1d4ed8'),
  },
  {
    id: 'animal_koala',
    name: 'Cuddly Koala',
    theme: 'animals',
    themeLabel: 'Cute Animals',
    emoji: '🐨',
    svgDataUri: makeStickerSvg('🐨', '#cbd5e1', '#475569'),
  },

  // Party & Sweets
  {
    id: 'party_cupcake',
    name: 'Sprinkle Cupcake',
    theme: 'party',
    themeLabel: 'Party & Sweets',
    emoji: '🧁',
    svgDataUri: makeStickerSvg('🧁', '#f472b6', '#be185d'),
  },
  {
    id: 'party_balloon',
    name: 'Celebration Balloon',
    theme: 'party',
    themeLabel: 'Party & Sweets',
    emoji: '🎈',
    svgDataUri: makeStickerSvg('🎈', '#ef4444', '#b91c1c'),
  },
  {
    id: 'party_icecream',
    name: 'Swirl Ice Cream',
    theme: 'party',
    themeLabel: 'Party & Sweets',
    emoji: '🍦',
    svgDataUri: makeStickerSvg('🍦', '#fde047', '#eab308'),
  },
  {
    id: 'party_lollipop',
    name: 'Candy Lollipop',
    theme: 'party',
    themeLabel: 'Party & Sweets',
    emoji: '🍭',
    svgDataUri: makeStickerSvg('🍭', '#fb7185', '#e11d48'),
  },
  {
    id: 'party_popper',
    name: 'Confetti Popper',
    theme: 'party',
    themeLabel: 'Party & Sweets',
    emoji: '🎉',
    svgDataUri: makeStickerSvg('🎉', '#38bdf8', '#0284c7'),
  },
  {
    id: 'party_cookie',
    name: 'Choco Chip Cookie',
    theme: 'party',
    themeLabel: 'Party & Sweets',
    emoji: '🍪',
    svgDataUri: makeStickerSvg('🍪', '#d97706', '#78350f'),
  },
];
