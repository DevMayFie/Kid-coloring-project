// Dynamic Thematic Cover Illustration Generator for Children's Coloring Books
// Generates crisp, printable black-and-white thick-line vector art customized to the theme and child's name

export interface ThematicCoverOptions {
  theme: string;
  childName: string;
  difficulty?: 'toddler' | 'standard' | 'intricate';
  styleVariant?: 'mascot' | 'emblem' | 'adventure';
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Detect the thematic category from any user-provided theme string
 */
export function detectThemeCategory(themeStr: string): string {
  const t = (themeStr || '').toLowerCase();

  // Space Dinosaur combinations
  if ((t.includes('space') || t.includes('galaxy') || t.includes('orbit') || t.includes('astro')) &&
      (t.includes('dino') || t.includes('rex') || t.includes('jurassic') || t.includes('fossil'))) {
    return 'space_dino';
  }

  // Dinosaurs
  if (t.includes('dino') || t.includes('rex') || t.includes('jurassic') || t.includes('triceratops') || t.includes('brontosaurus')) {
    return 'dinosaur';
  }

  // Space & Astronomy
  if (t.includes('space') || t.includes('astronaut') || t.includes('galaxy') || t.includes('planet') || t.includes('rocket') || t.includes('alien') || t.includes('cosmos')) {
    return 'space';
  }

  // Unicorn & Magic
  if (t.includes('unicorn') || t.includes('pegasus') || t.includes('magic') || t.includes('rainbow') || t.includes('glitter')) {
    return 'unicorn';
  }

  // Ocean & Sea
  if (t.includes('ocean') || t.includes('sea') || t.includes('underwater') || t.includes('fish') || t.includes('shark') || t.includes('whale') || t.includes('dolphin') || t.includes('mermaid') || t.includes('coral') || t.includes('turtle')) {
    return 'ocean';
  }

  // Puppies & Dogs & Pets
  if (t.includes('puppy') || t.includes('dog') || t.includes('pup') || t.includes('pet') || t.includes('kitten') || t.includes('cat') || t.includes('paw')) {
    return 'puppy';
  }

  // Jungle & Safari Animals
  if (t.includes('jungle') || t.includes('safari') || t.includes('lion') || t.includes('tiger') || t.includes('elephant') || t.includes('monkey') || t.includes('zoo') || t.includes('wild')) {
    return 'jungle';
  }

  // Race Cars & Vehicles
  if (t.includes('car') || t.includes('race') || t.includes('racing') || t.includes('truck') || t.includes('train') || t.includes('vehicle') || t.includes('speed') || t.includes('monster truck')) {
    return 'cars';
  }

  // Fairy Tale & Princess & Castle
  if (t.includes('fairy') || t.includes('castle') || t.includes('princess') || t.includes('prince') || t.includes('knight') || t.includes('kingdom') || t.includes('dragon')) {
    return 'fairytale';
  }

  // Friendly Monsters
  if (t.includes('monster') || t.includes('monsters') || t.includes('spooky') || t.includes('creature')) {
    return 'monster';
  }

  // Robots & Inventions
  if (t.includes('robot') || t.includes('invent') || t.includes('science') || t.includes('machine') || t.includes('tech')) {
    return 'robot';
  }

  // Farm Animals
  if (t.includes('farm') || t.includes('barn') || t.includes('cow') || t.includes('horse') || t.includes('pig') || t.includes('sheep') || t.includes('tractor')) {
    return 'farm';
  }

  // Superheroes
  if (t.includes('hero') || t.includes('superhero') || t.includes('cape') || t.includes('justice') || t.includes('power')) {
    return 'superhero';
  }

  return 'generic';
}

/**
 * Returns a human-friendly description of the thematic illustration
 */
export function getThematicCoverDescription(theme: string, childName: string): string {
  const cat = detectThemeCategory(theme);
  const name = childName.trim() || 'Little Artist';

  switch (cat) {
    case 'space_dino':
      return `Charming cartoon dinosaur wearing a bubble space helmet floating among Saturn rings, rockets, and smiling stars with ${name}'s celebratory banner.`;
    case 'dinosaur':
      return `Friendly, smiling T-Rex with a party hat and a baby dinosaur hatching from a spotted egg among jungle ferns for ${name}.`;
    case 'space':
      return `Cheerful cartoon astronaut kid waving in zero-gravity next to a moon rocket, orbiting planet, and twinkling stars for ${name}.`;
    case 'unicorn':
      return `Majestic smiling unicorn with a curly mane and spiral horn standing on a starry cloud with a rainbow arch for ${name}.`;
    case 'ocean':
      return `Joyful baby whale spouting a heart water fountain alongside a friendly sea turtle, starfish, and coral bubbles for ${name}.`;
    case 'puppy':
      return `Playful superhero puppy in a mask and flying cape surrounded by stars, paw prints, and trophy bones for ${name}.`;
    case 'jungle':
      return `Happy lion cub wearing a safari explorer hat surrounded by tropical palm leaves, vines, and butterflies for ${name}.`;
    case 'cars':
      return `Sleek cartoon race car with racing number 1, waving checkered flags, and a winner's star trophy for ${name}.`;
    case 'fairytale':
      return `Whimsical fairy tale castle with tower flags, magic sparkle trails, and a royal crown emblem for ${name}.`;
    case 'monster':
      return `Adorable, smiling fuzzy monster with antennae waving hello with balloons and celebration confetti for ${name}.`;
    case 'robot':
      return `Friendly retro cartoon robot with a lightbulb antenna, mechanical dials, and waving wrench for ${name}.`;
    case 'farm':
      return `Happy smiling farm animal in front of a rustic wooden fence, red barn silhouette, and sunny sunflowers for ${name}.`;
    case 'superhero':
      return `Brave cartoon superhero soaring over fluffy clouds with a fluttering cape and power stars for ${name}.`;
    default:
      return `Celebratory hero emblem with a smiling mascot star, garland bunting, and personalized banner for ${name}'s ${theme}.`;
  }
}

/**
 * Builds the optimal prompt for Gemini image models when generating a children's coloring book cover
 */
export function buildThematicCoverAiPrompt(
  theme: string,
  childName: string,
  difficulty: 'toddler' | 'standard' | 'intricate' = 'standard'
): string {
  const cleanName = childName.trim() || 'the child';
  const cleanTheme = theme.trim() || 'Adventures';

  let diffClause = '';
  if (difficulty === 'toddler') {
    diffClause = 'Toddler coloring book style: Simple thick lines for toddlers, ultra-bold heavy black ink outlines, giant open shapes for chunky crayons, zero clutter, minimal elements, pure white paper background, absolutely zero shading, no thin lines.';
  } else if (difficulty === 'intricate') {
    diffClause = 'Older children coloring book style: Intricate patterns for older children, detailed crisp black line art, decorative zentangle textures, ornate background scenery, pure white paper background, zero shading or grayscale.';
  } else {
    diffClause = 'Classic children\'s coloring book style: Bold crisp black outlines, clear joyful shapes, playful details, wide open spaces for crayons, pure white paper background, zero shading, zero grayscale, high contrast black-and-white.';
  }

  return `Children's coloring book front cover page illustration, theme: "${cleanTheme}".
Specifically engineered as a simple, charming thematic centerpiece illustration to accompany the child's name "${cleanName}".
Composition: A clean, iconic central thematic character or mascot directly representing "${cleanTheme}" (for example, if space dinosaurs: a cute happy cartoon dinosaur floating in a bubble space helmet next to a smiling planet and twinkling stars).
Includes a decorative celebratory ribbon banner or open framing area for "${cleanName}'s ${cleanTheme}".
${diffClause}
Strict coloring book requirements: High-contrast pure black outlines on completely clean white paper background, 100% white fills, zero gray gradients, zero halftone screen dots, zero crosshatching shading. Perfect for children to color with crayons or markers.`;
}

/**
 * Creates a complete, scalable vector SVG coloring book cover illustration
 */
export function createThematicCoverSvg(
  theme: string,
  childName: string,
  difficulty: 'toddler' | 'standard' | 'intricate' = 'standard',
  styleVariant: 'mascot' | 'emblem' | 'adventure' = 'mascot'
): string {
  const category = detectThemeCategory(theme);
  const safeName = (childName || 'ARTIST').trim().toUpperCase();
  const safeTheme = (theme || 'COLORING BOOK').trim().toUpperCase();

  // Adjust line weights based on difficulty
  const mainStroke = difficulty === 'toddler' ? 9 : difficulty === 'intricate' ? 4.5 : 6.5;
  const detailStroke = difficulty === 'toddler' ? 6 : difficulty === 'intricate' ? 3.5 : 4.5;
  const borderStroke = difficulty === 'toddler' ? 10 : difficulty === 'intricate' ? 5 : 7;

  // Render thematic inner artwork based on detected category
  let illustrationArt = '';

  switch (category) {
    case 'space_dino':
      illustrationArt = `
        <!-- SPACE DINOSAURS THEMATIC COVER ILLUSTRATION -->
        <!-- Saturn-like Ring Planet (Top Right) -->
        <g id="saturn-planet">
          <circle cx="280" cy="115" r="38" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
          <!-- Planet Craters -->
          <circle cx="265" cy="100" r="8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="295" cy="125" r="11" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <!-- Planetary Rings -->
          <ellipse cx="280" cy="115" rx="60" ry="16" fill="none" stroke="#000000" stroke-width="${mainStroke}" transform="rotate(-15 280 115)" />
        </g>

        <!-- Crescent Smiling Moon (Top Left) -->
        <g id="crescent-moon">
          <path d="M 95 70 A 35 35 0 0 0 100 135 A 40 40 0 1 1 95 70 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
          <!-- Moon sleepy smiling eye & cheek -->
          <circle cx="90" cy="98" r="4" fill="#000000" />
          <path d="M 88 108 Q 94 114 100 108" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        </g>

        <!-- Mini Retro Space Rocket (Bottom Left) -->
        <g id="space-rocket" transform="translate(45, 230) rotate(-25)">
          <path d="M 20 0 Q 35 25 35 60 L 5 60 Q 5 25 20 0 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
          <!-- Rocket Fins -->
          <path d="M 5 45 L -8 65 L 5 60 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <path d="M 35 45 L 48 65 L 35 60 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <!-- Porthole Window -->
          <circle cx="20" cy="35" r="9" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="20" cy="35" r="4" fill="#ffffff" stroke="#000000" stroke-width="2.5" />
          <!-- Rocket Flame -->
          <polygon points="10,60 15,75 20,62 25,75 30,60" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        </g>

        <!-- Central Character: Happy Cartoon Dinosaur Astronaut -->
        <!-- Helmet Bubble Behind Body -->
        <circle cx="190" cy="180" r="76" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke + 1}" />
        <!-- Helmet Glare / Reflection Highlights -->
        <path d="M 230 135 A 60 60 0 0 1 252 178" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <circle cx="225" cy="128" r="3.5" fill="#000000" />

        <!-- Dinosaur Head Inside Helmet -->
        <path d="M 150 195 Q 140 150 178 140 Q 225 132 230 170 Q 230 198 190 206 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Big Friendly Eye -->
        <circle cx="174" cy="162" r="10" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="176" cy="162" r="5" fill="#000000" />
        <circle cx="178" cy="160" r="1.5" fill="#ffffff" />
        <!-- Cute Smile and Dino Teeth -->
        <path d="M 188 185 Q 212 192 222 176" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <polygon points="194,188 198,196 203,188" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <polygon points="204,188 208,196 213,188" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />

        <!-- Suit Collar Ring -->
        <rect x="145" y="244" width="90" height="20" rx="8" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Spacesuit Body -->
        <path d="M 135 258 C 125 285 135 345 190 345 C 245 345 255 285 245 258 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Chest Control Badge with Stars -->
        <rect x="172" y="278" width="36" height="26" rx="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="182" cy="291" r="4" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <circle cx="198" cy="291" r="4" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />

        <!-- Cute Dino Arms (One waving, one holding flag) -->
        <!-- Left Arm waving -->
        <path d="M 138 274 Q 105 260 102 240 Q 115 232 128 250" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" stroke-linejoin="round" />
        <!-- Right Arm holding star wand -->
        <path d="M 242 274 Q 272 265 268 285 Q 256 292 242 284" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" stroke-linejoin="round" />
        <!-- Star Wand in Hand -->
        <line x1="268" y1="285" x2="288" y2="245" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <polygon points="288,235 292,243 301,243 294,248 297,256 288,251 279,256 282,248 275,243 284,243" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Cute Dino Tail with Spikes -->
        <path d="M 135 320 Q 75 330 65 300 Q 90 290 130 300" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <polygon points="85,296 95,282 105,296" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <polygon points="110,298 120,284 130,298" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Boots -->
        <rect x="150" y="340" width="32" height="28" rx="8" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <rect x="198" y="340" width="32" height="28" rx="8" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Surrounding Twinkling Stars -->
        <polygon points="50,150 54,160 65,160 56,166 60,176 50,170 40,176 44,166 35,160 46,160" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <polygon points="325,190 328,198 337,198 330,203 333,211 325,206 317,211 320,203 313,198 322,198" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <polygon points="140,80 143,87 151,87 145,91 147,98 140,94 133,98 135,91 129,87 137,87" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <polygon points="230,70 233,77 241,77 235,81 237,88 230,84 223,88 225,81 219,77 227,77" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
      `;
      break;

    case 'dinosaur':
      illustrationArt = `
        <!-- PREHISTORIC DINOSAUR THEMATIC COVER -->
        <!-- Prehistoric Palm Trees (Left & Right) -->
        <path d="M 45 320 Q 55 200 70 140" fill="none" stroke="#000000" stroke-width="${mainStroke}" stroke-linecap="round" />
        <!-- Palm Fronds -->
        <path d="M 70 140 Q 20 120 15 145" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <path d="M 70 140 Q 50 90 35 110" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <path d="M 70 140 Q 90 90 105 110" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <path d="M 70 140 Q 120 120 125 145" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />

        <!-- Prehistoric Volcano in distance (Right) -->
        <polygon points="280,320 315,220 335,220 370,320" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <!-- Puffy Smoke Cloud -->
        <path d="M 325 215 C 315 190 345 180 340 160 C 355 150 370 170 365 190 C 375 205 355 220 325 215 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Big Friendly T-Rex Character -->
        <!-- Tail -->
        <path d="M 130 270 Q 70 280 50 250 Q 80 230 140 240" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Back and Body -->
        <path d="M 125 250 C 115 180 200 160 215 220 C 230 270 205 330 150 330 C 130 330 120 300 125 250 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Back Plates / Spikes -->
        <polygon points="140,175 148,155 156,175" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <polygon points="165,170 175,148 185,170" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <polygon points="192,175 202,156 210,178" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- T-Rex Head and Snout -->
        <path d="M 195 200 C 190 140 240 125 270 140 C 290 150 295 180 270 195 C 250 205 225 205 195 200 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Jaw & Mouth -->
        <path d="M 230 195 Q 260 200 270 185" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <!-- Tiny Cartoon Teeth -->
        <polygon points="240,188 244,196 248,188" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <polygon points="252,188 256,196 260,188" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <!-- Big Friendly Eye -->
        <circle cx="230" cy="155" r="10" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="232" cy="155" r="5" fill="#000000" />
        <circle cx="234" cy="153" r="1.5" fill="#ffffff" />
        <!-- Party Hat on T-Rex! -->
        <polygon points="205,140 220,95 235,140" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="220" cy="92" r="5" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <line x1="209" y1="125" x2="231" y2="125" stroke="#000000" stroke-width="${detailStroke - 1}" />

        <!-- Cute Little T-Rex Arms -->
        <path d="M 215 225 Q 240 230 235 245 Q 225 248 215 238" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Legs & Big Dinosaur Feet -->
        <path d="M 140 310 L 135 345 L 170 345 L 165 310 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <path d="M 180 300 L 180 345 L 215 345 L 205 300 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Baby Dinosaur Hatching from Spotted Egg (Right) -->
        <g transform="translate(260, 260)">
          <!-- Egg Bottom -->
          <path d="M 10 50 C 10 90 70 90 70 50 L 55 45 L 45 55 L 35 45 L 25 55 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <!-- Baby Dino Head peeking -->
          <path d="M 25 45 Q 40 20 55 45 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="35" cy="36" r="3" fill="#000000" />
          <circle cx="45" cy="36" r="3" fill="#000000" />
          <!-- Egg Spots -->
          <circle cx="25" cy="65" r="5" fill="#ffffff" stroke="#000000" stroke-width="2.5" />
          <circle cx="50" cy="68" r="6" fill="#ffffff" stroke="#000000" stroke-width="2.5" />
        </g>
      `;
      break;

    case 'space':
      illustrationArt = `
        <!-- SPACE & ASTRONAUT THEMATIC COVER -->
        <!-- Center Floating Kid Astronaut -->
        <!-- Helmet -->
        <circle cx="190" cy="165" r="70" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke + 1}" />
        <!-- Face Visor -->
        <ellipse cx="190" cy="165" rx="52" ry="46" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Happy smiling child inside helmet -->
        <circle cx="172" cy="155" r="6" fill="#000000" />
        <circle cx="208" cy="155" r="6" fill="#000000" />
        <path d="M 178 175 Q 190 190 202 175" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <!-- Cheeks -->
        <ellipse cx="166" cy="168" rx="5" ry="3" fill="#ffffff" stroke="#000000" stroke-width="2" />
        <ellipse cx="214" cy="168" rx="5" ry="3" fill="#ffffff" stroke="#000000" stroke-width="2" />

        <!-- Spacesuit Body -->
        <rect x="150" y="240" width="80" height="75" rx="18" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Suit Collar -->
        <rect x="155" y="230" width="70" height="15" rx="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <!-- Mission Star Patch -->
        <polygon points="190,260 193,267 201,267 195,272 197,279 190,275 183,279 185,272 179,267 187,267" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />

        <!-- Arms waving in zero gravity -->
        <path d="M 150 255 Q 110 240 100 205 Q 115 195 130 220" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" stroke-linejoin="round" />
        <path d="M 230 255 Q 270 240 280 205 Q 265 195 250 220" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" stroke-linejoin="round" />

        <!-- Floating Boots -->
        <rect x="155" y="315" width="30" height="35" rx="8" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <rect x="195" y="315" width="30" height="35" rx="8" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Giant Orbiting Moon Rocket (Right) -->
        <g transform="translate(275, 70) rotate(35)">
          <path d="M 25 0 Q 40 25 40 65 L 10 65 Q 10 25 25 0 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
          <polygon points="10,50 -2,70 10,65" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <polygon points="40,50 52,70 40,65" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="25" cy="35" r="9" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        </g>

        <!-- Planet with Craters (Left) -->
        <circle cx="65" cy="110" r="35" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <circle cx="55" cy="98" r="8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="75" cy="120" r="10" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Shooting Star -->
        <polygon points="80,260 83,266 90,266 85,270 87,276 80,272 73,276 75,270 70,266 77,266" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <line x1="88" y1="272" x2="115" y2="290" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" stroke-dasharray="3,4" />
      `;
      break;

    case 'unicorn':
      illustrationArt = `
        <!-- MAGICAL UNICORNS THEMATIC COVER -->
        <!-- Giant Rainbow Arch in background -->
        <path d="M 50 280 A 140 140 0 0 1 330 280" fill="none" stroke="#000000" stroke-width="${mainStroke}" />
        <path d="M 70 280 A 120 120 0 0 1 310 280" fill="none" stroke="#000000" stroke-width="${detailStroke}" />
        <path d="M 90 280 A 100 100 0 0 1 290 280" fill="none" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Puffy Clouds at rainbow base -->
        <g transform="translate(30, 240)">
          <path d="M 10 35 C 0 35 0 15 15 15 C 20 0 45 0 50 15 C 65 10 75 30 65 40 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        </g>
        <g transform="translate(270, 240)">
          <path d="M 10 35 C 0 35 0 15 15 15 C 20 0 45 0 50 15 C 65 10 75 30 65 40 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        </g>

        <!-- Majestic Smiling Unicorn Character -->
        <!-- Unicorn Body -->
        <path d="M 130 250 C 120 220 170 200 220 215 C 245 225 255 260 250 300 C 230 330 150 330 130 250 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Neck and Head -->
        <path d="M 155 220 C 145 160 180 120 220 135 C 245 145 260 175 235 195 C 215 210 195 220 175 225 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Cute Unicorn Muzzle -->
        <ellipse cx="245" cy="180" rx="18" ry="14" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="245" cy="178" r="2.5" fill="#000000" />
        <path d="M 238 185 Q 245 190 252 185" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />

        <!-- Happy Eyelash Eye -->
        <path d="M 210 162 Q 220 155 228 165" fill="none" stroke="#000000" stroke-width="${detailStroke + 1}" stroke-linecap="round" />
        <line x1="228" y1="162" x2="234" y2="158" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <line x1="226" y1="166" x2="232" y2="166" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />

        <!-- Cute Ears -->
        <path d="M 185 130 Q 195 105 205 125 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <path d="M 198 128 Q 208 108 215 126 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Twisted Magic Spiral Horn -->
        <polygon points="215,125 240,65 230,128" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Horn Spirals -->
        <line x1="220" y1="110" x2="233" y2="100" stroke="#000000" stroke-width="${detailStroke}" />
        <line x1="225" y1="95" x2="236" y2="85" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Curly Flowing Mane -->
        <path d="M 180 135 C 160 145 155 175 168 185 C 150 195 150 220 165 230 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Legs & Golden Hooves -->
        <rect x="145" y="300" width="22" height="48" rx="6" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <line x1="145" y1="334" x2="167" y2="334" stroke="#000000" stroke-width="${detailStroke}" />
        <rect x="220" y="300" width="22" height="48" rx="6" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <line x1="220" y1="334" x2="242" y2="334" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Floating Magic Wand with Sparkles (Top Left) -->
        <g transform="translate(65, 80) rotate(-35)">
          <line x1="10" y1="50" x2="10" y2="10" stroke="#000000" stroke-width="${mainStroke}" stroke-linecap="round" />
          <polygon points="10,0 14,8 23,8 16,13 18,21 10,16 2,21 4,13 -3,8 6,8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        </g>

        <!-- Floating Sparkle Stars -->
        <polygon points="290,110 293,118 302,118 295,123 298,131 290,126 282,131 285,123 278,118 287,118" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <polygon points="120,95 122,101 129,101 123,105 125,111 120,107 115,111 117,105 111,101 118,101" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
      `;
      break;

    case 'ocean':
      illustrationArt = `
        <!-- UNDERWATER & OCEAN THEMATIC COVER -->
        <!-- Cheerful Baby Whale (Center) -->
        <!-- Whale Body -->
        <path d="M 80 200 C 90 140 220 130 270 180 C 290 200 280 240 240 250 C 180 265 110 250 80 200 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Whale Fluke / Tail -->
        <path d="M 85 205 Q 40 180 35 150 Q 60 170 85 190 Q 60 210 35 230 Q 40 200 85 205" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Whale Belly Lines -->
        <path d="M 120 230 Q 180 250 240 235" fill="none" stroke="#000000" stroke-width="${detailStroke}" />
        <path d="M 130 240 Q 180 258 230 245" fill="none" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Cute Eye & Cheerful Smile -->
        <circle cx="230" cy="180" r="8" fill="#000000" />
        <circle cx="232" cy="178" r="2.5" fill="#ffffff" />
        <path d="M 240 195 Q 255 205 265 192" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />

        <!-- Flipper -->
        <path d="M 180 220 Q 170 250 190 260 Q 205 255 200 225" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Blowhole Spout with Heart Fountain -->
        <path d="M 175 142 L 175 105 Q 160 85 150 95" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <path d="M 175 105 Q 190 85 200 95" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <!-- Heart at top of water fountain -->
        <path d="M 175 80 C 175 70 162 65 162 76 C 162 85 175 92 175 95 C 175 92 188 85 188 76 C 188 65 175 70 175 80 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Friendly Sea Turtle (Bottom Left) -->
        <g transform="translate(60, 270)">
          <!-- Shell -->
          <ellipse cx="40" cy="30" rx="30" ry="20" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
          <!-- Shell Hexagon Pattern -->
          <polygon points="40,20 48,25 48,35 40,40 32,35 32,25" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
          <!-- Head -->
          <ellipse cx="72" cy="28" rx="12" ry="9" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="74" cy="26" r="2.5" fill="#000000" />
          <!-- Flippers -->
          <path d="M 50 15 Q 65 5 60 -5" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
          <path d="M 50 45 Q 65 55 60 65" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        </g>

        <!-- Smiling Starfish (Bottom Right) -->
        <g transform="translate(275, 270)">
          <polygon points="30,5 37,22 55,22 41,33 46,50 30,39 14,50 19,33 5,22 23,22" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
          <circle cx="26" cy="24" r="2.5" fill="#000000" />
          <circle cx="34" cy="24" r="2.5" fill="#000000" />
          <path d="M 27 30 Q 30 33 33 30" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" />
        </g>

        <!-- Floating Bubbles -->
        <circle cx="280" cy="110" r="14" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="284" cy="106" r="3" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
        <circle cx="260" cy="80" r="9" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="95" cy="120" r="11" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="115" cy="90" r="7" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
      `;
      break;

    case 'puppy':
      illustrationArt = `
        <!-- SUPERHERO PUPPY THEMATIC COVER -->
        <!-- Central Puppy Character with Superhero Cape -->
        <!-- Flying Cape behind body -->
        <path d="M 155 230 Q 110 260 90 320 Q 140 300 170 290" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <path d="M 225 230 Q 270 260 290 320 Q 240 300 210 290" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Puppy Head -->
        <circle cx="190" cy="170" r="62" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Floppy Ears -->
        <path d="M 135 150 Q 95 160 110 220 Q 140 210 145 170" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <path d="M 245 150 Q 285 160 270 220 Q 240 210 235 170" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Hero Domino Mask -->
        <path d="M 140 160 Q 165 145 190 160 Q 215 145 240 160 Q 235 185 210 180 Q 190 170 170 180 Q 145 185 140 160 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <!-- Big Friendly Eyes inside mask -->
        <circle cx="165" cy="165" r="9" fill="#000000" />
        <circle cx="167" cy="163" r="3" fill="#ffffff" />
        <circle cx="215" cy="165" r="9" fill="#000000" />
        <circle cx="217" cy="163" r="3" fill="#ffffff" />

        <!-- Cute Nose & Cheerful Dog Mouth with Tongue -->
        <ellipse cx="190" cy="190" rx="10" ry="7" fill="#000000" />
        <path d="M 180 198 Q 190 208 200 198" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <!-- Tongue sticking out -->
        <path d="M 185 204 Q 190 218 195 204 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />

        <!-- Collar with Star Medal -->
        <rect x="155" y="224" width="70" height="14" rx="5" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="190" cy="245" r="12" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <polygon points="190,238 192,243 197,243 193,246 195,251 190,248 185,251 187,246 183,243 188,243" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />

        <!-- Puppy Body and Paws Up -->
        <path d="M 150 238 C 140 270 145 330 190 330 C 235 330 240 270 230 238 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Front Paws cheering -->
        <ellipse cx="140" cy="265" rx="15" ry="12" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <ellipse cx="240" cy="265" rx="15" ry="12" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Paw Prints & Bones floating around -->
        <!-- Bone (Top Left) -->
        <g transform="translate(60, 95) rotate(-20)">
          <rect x="15" y="10" width="30" height="10" rx="3" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="15" cy="8" r="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="15" cy="22" r="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="45" cy="8" r="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="45" cy="22" r="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        </g>

        <!-- Big Paw Print (Top Right) -->
        <g transform="translate(280, 85)">
          <ellipse cx="25" cy="30" rx="15" ry="12" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="12" cy="12" r="5" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="25" cy="8" r="5.5" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="38" cy="12" r="5" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        </g>
      `;
      break;

    case 'jungle':
      illustrationArt = `
        <!-- JUNGLE SAFARI THEMATIC COVER -->
        <!-- Tropical Monstera Palm Leaves Frame -->
        <g id="jungle-leaves-left">
          <path d="M 20 180 Q 70 120 110 140 Q 60 210 20 180 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
          <line x1="20" y1="180" x2="105" y2="140" stroke="#000000" stroke-width="${detailStroke}" />
        </g>
        <g id="jungle-leaves-right">
          <path d="M 360 180 Q 310 120 270 140 Q 320 210 360 180 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
          <line x1="360" y1="180" x2="275" y2="140" stroke="#000000" stroke-width="${detailStroke}" />
        </g>

        <!-- Central Smiling Baby Lion with Safari Hat -->
        <!-- Fluffy Round Mane -->
        <circle cx="190" cy="190" r="75" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" stroke-dasharray="14,6" />

        <!-- Lion Face -->
        <circle cx="190" cy="190" r="54" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Round Ears -->
        <circle cx="145" cy="140" r="16" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="235" cy="140" r="16" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Explorer Safari Pith Helmet -->
        <ellipse cx="190" cy="142" rx="46" ry="14" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <path d="M 160 142 C 160 110 220 110 220 142 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <circle cx="190" cy="110" r="4" fill="#000000" />

        <!-- Big Friendly Eyes -->
        <circle cx="170" cy="185" r="9" fill="#000000" />
        <circle cx="172" cy="183" r="3" fill="#ffffff" />
        <circle cx="210" cy="185" r="9" fill="#000000" />
        <circle cx="212" cy="183" r="3" fill="#ffffff" />

        <!-- Lion Nose & Whiskers -->
        <polygon points="184,198 196,198 190,206" fill="#000000" />
        <path d="M 182 206 Q 190 216 198 206" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <line x1="155" y1="202" x2="135" y2="200" stroke="#000000" stroke-width="${detailStroke - 1}" stroke-linecap="round" />
        <line x1="155" y1="208" x2="135" y2="212" stroke="#000000" stroke-width="${detailStroke - 1}" stroke-linecap="round" />
        <line x1="225" y1="202" x2="245" y2="200" stroke="#000000" stroke-width="${detailStroke - 1}" stroke-linecap="round" />
        <line x1="225" y1="208" x2="245" y2="212" stroke="#000000" stroke-width="${detailStroke - 1}" stroke-linecap="round" />

        <!-- Lion Body & Paws -->
        <path d="M 148 245 C 140 280 145 330 190 330 C 235 330 240 280 232 245 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Paws -->
        <rect x="150" y="315" width="35" height="28" rx="8" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <rect x="195" y="315" width="35" height="28" rx="8" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Butterfly fluttering (Top Left) -->
        <g transform="translate(60, 85)">
          <ellipse cx="25" cy="20" rx="4" ry="12" fill="#000000" />
          <path d="M 25 15 Q 45 0 45 20 Q 35 25 25 20 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <path d="M 25 15 Q 5 0 5 20 Q 15 25 25 20 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        </g>
      `;
      break;

    case 'cars':
      illustrationArt = `
        <!-- SPEED RACERS THEMATIC COVER -->
        <!-- Racing Finish Checkered Flags (Top Left & Top Right) -->
        <g transform="translate(50, 80) rotate(-20)">
          <line x1="10" y1="60" x2="10" y2="0" stroke="#000000" stroke-width="${mainStroke}" stroke-linecap="round" />
          <rect x="10" y="0" width="40" height="28" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <rect x="10" y="0" width="20" height="14" fill="#000000" />
          <rect x="30" y="14" width="20" height="14" fill="#000000" />
        </g>
        <g transform="translate(290, 80) rotate(20)">
          <line x1="50" y1="60" x2="50" y2="0" stroke="#000000" stroke-width="${mainStroke}" stroke-linecap="round" />
          <rect x="10" y="0" width="40" height="28" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <rect x="10" y="14" width="20" height="14" fill="#000000" />
          <rect x="30" y="0" width="20" height="14" fill="#000000" />
        </g>

        <!-- Big Winner Champion Trophy (Top Center) -->
        <g transform="translate(160, 60)">
          <path d="M 15 10 L 45 10 L 40 40 Q 30 55 20 40 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <!-- Handles -->
          <path d="M 15 15 Q 0 15 5 30 Q 10 40 20 35" fill="none" stroke="#000000" stroke-width="${detailStroke - 1}" />
          <path d="M 45 15 Q 60 15 55 30 Q 50 40 40 35" fill="none" stroke="#000000" stroke-width="${detailStroke - 1}" />
          <!-- Base -->
          <line x1="30" y1="50" x2="30" y2="60" stroke="#000000" stroke-width="${detailStroke}" />
          <rect x="18" y="60" width="24" height="10" rx="2" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <polygon points="30,20 33,26 40,26 35,30 37,36 30,32 23,36 25,30 20,26 27,26" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
        </g>

        <!-- Cartoon Race Car (Center) -->
        <!-- Cockpit & Windshield -->
        <path d="M 130 200 Q 190 145 250 200 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <ellipse cx="190" cy="180" rx="35" ry="18" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <!-- Happy Pilot Mascot Helmet -->
        <circle cx="190" cy="176" r="12" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <line x1="182" y1="174" x2="198" y2="174" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Car Sleek Body -->
        <path d="M 60 250 C 70 200 130 195 250 195 C 290 195 320 220 330 250 L 330 270 L 60 270 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Spoiler / Rear Wing -->
        <rect x="50" y="195" width="20" height="40" rx="4" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <rect x="42" y="190" width="36" height="12" rx="3" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Racing Number "1" on Car Side -->
        <circle cx="190" cy="235" r="22" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <text x="190" y="244" text-anchor="middle" font-family="'Fredoka', sans-serif" font-weight="900" font-size="24" fill="#000000">1</text>

        <!-- Wheels with Hubcaps -->
        <circle cx="110" cy="270" r="32" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <circle cx="110" cy="270" r="14" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="280" cy="270" r="32" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <circle cx="280" cy="270" r="14" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Speed Wind Lines -->
        <line x1="40" y1="280" x2="340" y2="280" stroke="#000000" stroke-width="${mainStroke}" stroke-linecap="round" />
        <line x1="20" y1="295" x2="80" y2="295" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <line x1="300" y1="295" x2="360" y2="295" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
      `;
      break;

    case 'fairytale':
      illustrationArt = `
        <!-- FAIRY TALE KINGDOM THEMATIC COVER -->
        <!-- Fairytale Castle with Turrets -->
        <!-- Center Main Tower -->
        <rect x="155" y="150" width="70" height="150" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Conical Roof -->
        <polygon points="150,150 190,80 230,150" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Flag at top -->
        <line x1="190" y1="80" x2="190" y2="55" stroke="#000000" stroke-width="${detailStroke}" />
        <polygon points="190,55 215,65 190,75" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Left Tower -->
        <rect x="90" y="180" width="55" height="120" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <polygon points="85,180 117,125 150,180" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <line x1="117" y1="125" x2="117" y2="105" stroke="#000000" stroke-width="${detailStroke}" />
        <polygon points="117,105 137,113 117,121" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Right Tower -->
        <rect x="235" y="180" width="55" height="120" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <polygon points="230,180 262,125 295,180" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <line x1="262" y1="125" x2="262" y2="105" stroke="#000000" stroke-width="${detailStroke}" />
        <polygon points="262,105 282,113 262,121" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Arched Castle Gate Door -->
        <path d="M 172 300 L 172 245 C 172 230 208 230 208 245 L 208 300 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <circle cx="184" cy="270" r="3" fill="#000000" />
        <circle cx="196" cy="270" r="3" fill="#000000" />

        <!-- Tower Windows -->
        <path d="M 180 180 L 180 165 C 180 155 200 155 200 165 L 200 180 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <path d="M 110 215 L 110 200 C 110 192 125 192 125 200 L 125 215 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <path d="M 255 215 L 255 200 C 255 192 270 192 270 200 L 270 215 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Royal Crown (Top Left) -->
        <g transform="translate(45, 80)">
          <path d="M 10 35 L 5 15 L 20 25 L 30 10 L 40 25 L 55 15 L 50 35 Z" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <circle cx="5" cy="15" r="3" fill="#000000" />
          <circle cx="30" cy="10" r="3" fill="#000000" />
          <circle cx="55" cy="15" r="3" fill="#000000" />
        </g>

        <!-- Fairy Magic Wand (Top Right) -->
        <g transform="translate(305, 75) rotate(30)">
          <line x1="15" y1="45" x2="15" y2="15" stroke="#000000" stroke-width="${mainStroke}" />
          <polygon points="15,0 19,10 30,10 21,16 25,26 15,20 5,26 9,16 0,10 11,10" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        </g>
      `;
      break;

    case 'monster':
      illustrationArt = `
        <!-- FRIENDLY MONSTER THEMATIC COVER -->
        <!-- Central Round Fluffy Friendly Monster -->
        <!-- Monster Fur Body -->
        <circle cx="190" cy="205" r="82" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" stroke-dasharray="16,8" />

        <!-- Monster Cute Horns or Antennae -->
        <path d="M 145 135 Q 130 95 115 105 Q 135 125 150 142" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <circle cx="115" cy="105" r="8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <path d="M 235 135 Q 250 95 265 105 Q 245 125 230 142" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <circle cx="265" cy="105" r="8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Big Googly Eyes -->
        <circle cx="160" cy="180" r="20" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <circle cx="162" cy="180" r="9" fill="#000000" />
        <circle cx="165" cy="177" r="3" fill="#ffffff" />
        <circle cx="220" cy="180" r="20" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <circle cx="218" cy="180" r="9" fill="#000000" />
        <circle cx="220" cy="177" r="3" fill="#ffffff" />

        <!-- Big Toothy Grin -->
        <path d="M 155 220 Q 190 255 225 220 Z" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Cute Little Teeth -->
        <polygon points="170,220 176,232 182,220" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <polygon points="198,220 204,232 210,220" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Polka Dots on Belly -->
        <circle cx="165" cy="255" r="8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="215" cy="255" r="8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="190" cy="270" r="10" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Monster Arms Waving -->
        <path d="M 115 210 Q 75 190 70 160 Q 90 155 110 185" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <path d="M 265 210 Q 305 190 310 160 Q 290 155 270 185" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Chubby Monster Feet -->
        <ellipse cx="150" cy="305" rx="26" ry="18" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <ellipse cx="230" cy="305" rx="26" ry="18" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Floating Balloons (Top Left) -->
        <g transform="translate(60, 65)">
          <ellipse cx="25" cy="30" rx="18" ry="24" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
          <polygon points="22,54 28,54 25,60" fill="#000000" />
          <path d="M 25 60 Q 20 85 30 110" fill="none" stroke="#000000" stroke-width="${detailStroke - 1}" stroke-dasharray="3,3" />
        </g>
      `;
      break;

    case 'robot':
      illustrationArt = `
        <!-- ROBOT WORKSHOP THEMATIC COVER -->
        <!-- Retro Friendly Robot Character -->
        <!-- Antenna with glowing bulb -->
        <line x1="190" y1="125" x2="190" y2="85" stroke="#000000" stroke-width="${mainStroke}" />
        <circle cx="190" cy="78" r="12" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Square Robot Head -->
        <rect x="140" y="125" width="100" height="80" rx="14" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <!-- Head Bolts / Ears -->
        <rect x="125" y="150" width="15" height="30" rx="4" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <rect x="240" y="150" width="15" height="30" rx="4" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Lightbulb Eyes -->
        <circle cx="168" cy="160" r="14" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="168" cy="160" r="6" fill="#000000" />
        <circle cx="212" cy="160" r="14" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="212" cy="160" r="6" fill="#000000" />

        <!-- Digital Grille Smile -->
        <rect x="162" y="185" width="56" height="12" rx="4" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <line x1="176" y1="185" x2="176" y2="197" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <line x1="190" y1="185" x2="190" y2="197" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <line x1="204" y1="185" x2="204" y2="197" stroke="#000000" stroke-width="${detailStroke - 1}" />

        <!-- Robot Chest / Body -->
        <rect x="135" y="215" width="110" height="95" rx="16" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Meter / Dials on Chest -->
        <rect x="155" y="232" width="70" height="35" rx="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <path d="M 165 258 A 25 25 0 0 1 215 258" fill="none" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <line x1="190" y1="258" x2="205" y2="242" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <circle cx="170" cy="285" r="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <circle cx="190" cy="285" r="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <circle cx="210" cy="285" r="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />

        <!-- Accordion Arms & Claw Hands -->
        <path d="M 135 240 L 95 240 L 95 210" fill="none" stroke="#000000" stroke-width="${mainStroke}" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M 85 200 C 80 200 80 220 95 220 C 110 220 110 200 105 200" fill="none" stroke="#000000" stroke-width="${detailStroke}" />

        <path d="M 245 240 L 285 240 L 285 210" fill="none" stroke="#000000" stroke-width="${mainStroke}" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M 275 200 C 270 200 270 220 285 220 C 300 220 300 200 295 200" fill="none" stroke="#000000" stroke-width="${detailStroke}" />

        <!-- Robot Treads / Feet -->
        <rect x="145" y="310" width="35" height="30" rx="8" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />
        <rect x="200" y="310" width="35" height="30" rx="8" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Cogwheels / Gears in background -->
        <g transform="translate(65, 85)">
          <circle cx="25" cy="25" r="20" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" stroke-dasharray="6,4" />
          <circle cx="25" cy="25" r="8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        </g>
        <g transform="translate(285, 85)">
          <circle cx="25" cy="25" r="20" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" stroke-dasharray="6,4" />
          <circle cx="25" cy="25" r="8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        </g>
      `;
      break;

    case 'generic':
    default:
      illustrationArt = `
        <!-- UNIVERSAL CELEBRATORY THEMATIC COVER MASCOT -->
        <!-- Cheerful Golden Star Character Mascot -->
        <polygon points="190,75 215,145 285,145 230,190 250,260 190,220 130,260 150,190 95,145 165,145" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

        <!-- Mascot Big Smiling Eyes -->
        <circle cx="170" cy="170" r="10" fill="#000000" />
        <circle cx="173" cy="167" r="3.5" fill="#ffffff" />
        <circle cx="210" cy="170" r="10" fill="#000000" />
        <circle cx="213" cy="167" r="3.5" fill="#ffffff" />

        <!-- Big Cheerful Smile -->
        <path d="M 172 192 Q 190 215 208 192" fill="none" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <!-- Rosy Cheeks -->
        <circle cx="158" cy="186" r="6" fill="#ffffff" stroke="#000000" stroke-width="2" />
        <circle cx="222" cy="186" r="6" fill="#ffffff" stroke="#000000" stroke-width="2" />

        <!-- Mascot Artist Hat / Beret -->
        <ellipse cx="190" cy="105" rx="35" ry="15" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="190" cy="90" r="5" fill="#000000" />

        <!-- Holding Paintbrush in Left Hand -->
        <line x1="120" y1="180" x2="80" y2="140" stroke="#000000" stroke-width="${detailStroke}" stroke-linecap="round" />
        <polygon points="80,140 70,130 85,135" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />

        <!-- Holding Color Palette in Right Hand -->
        <ellipse cx="265" cy="170" rx="22" ry="16" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="255" cy="165" r="3" fill="#000000" />
        <circle cx="268" cy="162" r="3" fill="#000000" />
        <circle cx="275" cy="172" r="3" fill="#000000" />

        <!-- Celebration Confetti & Twinkling Sparkles -->
        <polygon points="65,95 68,102 76,102 70,107 72,114 65,110 58,114 60,107 54,102 62,102" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <polygon points="315,95 318,102 326,102 320,107 322,114 315,110 308,114 310,107 304,102 312,102" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
        <circle cx="70" cy="240" r="8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
        <circle cx="310" cy="240" r="8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
      `;
      break;
  }

  // Construct complete, pristine, printable SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 500" width="100%" height="100%">
    <!-- Clean white paper background -->
    <rect width="380" height="500" fill="#ffffff" />

    <!-- Outer Printable Double-Line Border -->
    <rect x="10" y="10" width="360" height="480" fill="none" stroke="#000000" stroke-width="${borderStroke}" rx="16" />
    <rect x="18" y="18" width="344" height="464" fill="none" stroke="#000000" stroke-width="${detailStroke - 1}" rx="10" />

    <!-- Corner Decorative Rosettes -->
    <circle cx="28" cy="28" r="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
    <circle cx="352" cy="28" r="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
    <circle cx="28" cy="472" r="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
    <circle cx="352" cy="472" r="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

    <!-- TOP TITLE HEADER: CHILD'S NAME & PERSONALIZED TITLE -->
    <g id="cover-header-group">
      <!-- Child's Name Headline Banner -->
      <rect x="35" y="28" width="310" height="38" rx="8" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
      <text x="190" y="53" text-anchor="middle" font-family="'Fredoka', 'Comic Sans MS', sans-serif" font-weight="900" font-size="19" fill="#000000" letter-spacing="1">
        ★ ${escapeXml(safeName)}'S COVER ★
      </text>
    </g>

    <!-- THEMATIC ARTWORK CENTERPIECE -->
    <g id="thematic-illustration-center">
      ${illustrationArt}
    </g>

    <!-- BOTTOM THEMATIC BANNER & COLORING INVITATION -->
    <g id="cover-footer-banner">
      <!-- Decorative Ribbon Ends -->
      <polygon points="25,385 45,372 45,420 25,407" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />
      <polygon points="355,385 335,372 335,420 355,407" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke}" />

      <!-- Main Thematic Banner Ribbon -->
      <rect x="40" y="370" width="300" height="46" rx="10" fill="#ffffff" stroke="#000000" stroke-width="${mainStroke}" />

      <!-- Hollow outline font for theme so child can color the title letters! -->
      <text x="190" y="400" text-anchor="middle" font-family="'Fredoka', 'Comic Sans MS', sans-serif" font-weight="900" font-size="16" fill="#000000" letter-spacing="0.5">
        ${escapeXml(safeTheme)}
      </text>

      <!-- Bottom Subtitle / Prompt for child -->
      <rect x="60" y="426" width="260" height="24" rx="6" fill="#ffffff" stroke="#000000" stroke-width="${detailStroke - 1}" />
      <text x="190" y="442" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="10.5" fill="#333333">
        ✏️ COLOR YOUR OWN FRONT COVER! 🎨
      </text>

      <!-- Bottom Artist Signature Line -->
      <text x="190" y="468" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="9" fill="#666666">
        Custom Illustrated Edition for ${escapeXml(safeName)}
      </text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
