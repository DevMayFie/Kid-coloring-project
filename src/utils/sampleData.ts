import { ColoringBook, ChatRole } from '../types';

// Clean SVG black & white thick line art generator for starter previews and reliable offline rendering
export function createSampleLineArtSvg(sceneType: string, label: string): string {
  let innerArt = '';

  switch (sceneType) {
    case 'space_dino_1':
      innerArt = `
        <!-- Planet with crater -->
        <circle cx="280" cy="110" r="45" fill="white" stroke="black" stroke-width="8" />
        <circle cx="265" cy="95" r="10" fill="white" stroke="black" stroke-width="6" />
        <circle cx="295" cy="120" r="14" fill="white" stroke="black" stroke-width="6" />
        
        <!-- Stars -->
        <polygon points="70,60 76,75 92,75 79,84 84,100 70,90 56,100 61,84 48,75 64,75" fill="white" stroke="black" stroke-width="6" />
        <polygon points="320,240 324,252 337,252 327,260 330,272 320,265 310,272 313,260 303,252 316,252" fill="white" stroke="black" stroke-width="6" />
        
        <!-- Friendly Dino in Astronaut Suit -->
        <!-- Helmet Bubble -->
        <circle cx="190" cy="170" r="85" fill="white" stroke="black" stroke-width="10" />
        <!-- Reflection gleam -->
        <path d="M 230 120 A 70 70 0 0 1 255 170" fill="none" stroke="black" stroke-width="8" stroke-linecap="round" />
        
        <!-- Dino Head inside helmet -->
        <path d="M 150 190 Q 140 140 180 130 Q 230 120 230 160 Q 230 190 190 200 Z" fill="white" stroke="black" stroke-width="8" />
        <circle cx="170" cy="155" r="8" fill="black" />
        <path d="M 190 175 Q 210 180 220 165" fill="none" stroke="black" stroke-width="7" stroke-linecap="round" />
        <!-- Cute teeth -->
        <polygon points="195,178 200,186 205,178" fill="white" stroke="black" stroke-width="5" />
        
        <!-- Spacesuit Body -->
        <path d="M 130 250 C 120 280 130 350 190 350 C 250 350 260 280 250 250 Z" fill="white" stroke="black" stroke-width="10" />
        <!-- Suit Collar -->
        <rect x="140" y="240" width="100" height="24" rx="10" fill="white" stroke="black" stroke-width="8" />
        
        <!-- Chest Control Badge -->
        <rect x="170" y="275" width="40" height="30" rx="6" fill="white" stroke="black" stroke-width="6" />
        <circle cx="180" cy="290" r="5" fill="white" stroke="black" stroke-width="5" />
        <circle cx="200" cy="290" r="5" fill="white" stroke="black" stroke-width="5" />
        
        <!-- Cute Little Dino Arms -->
        <path d="M 135 270 Q 100 280 110 300 Q 125 305 138 290" fill="white" stroke="black" stroke-width="8" />
        <path d="M 245 270 Q 280 280 270 300 Q 255 305 242 290" fill="white" stroke="black" stroke-width="8" />
        
        <!-- Boots -->
        <rect x="145" y="345" width="35" height="35" rx="10" fill="white" stroke="black" stroke-width="8" />
        <rect x="200" y="345" width="35" height="35" rx="10" fill="white" stroke="black" stroke-width="8" />
        
        <!-- Cute Tail with Dino spikes -->
        <path d="M 130 320 Q 70 330 60 300 Q 85 290 125 300" fill="white" stroke="black" stroke-width="8" />
        <polygon points="80,295 90,280 100,295" fill="white" stroke="black" stroke-width="6" />
        <polygon points="105,296 115,282 125,296" fill="white" stroke="black" stroke-width="6" />
      `;
      break;

    case 'space_dino_2':
      innerArt = `
        <!-- Moon Surface with craters -->
        <path d="M 10 330 Q 190 310 370 340 L 370 390 L 10 390 Z" fill="white" stroke="black" stroke-width="9" />
        <ellipse cx="90" cy="350" rx="35" ry="12" fill="white" stroke="black" stroke-width="6" />
        <ellipse cx="270" cy="355" rx="45" ry="15" fill="white" stroke="black" stroke-width="6" />
        
        <!-- Triceratops Moon Rover -->
        <!-- Rover Body -->
        <rect x="100" y="220" width="180" height="75" rx="20" fill="white" stroke="black" stroke-width="10" />
        <rect x="130" y="180" width="120" height="50" rx="15" fill="white" stroke="black" stroke-width="8" />
        <!-- Big Rover Wheels -->
        <circle cx="115" cy="300" r="32" fill="white" stroke="black" stroke-width="9" />
        <circle cx="115" cy="300" r="14" fill="white" stroke="black" stroke-width="6" />
        <circle cx="265" cy="300" r="32" fill="white" stroke="black" stroke-width="9" />
        <circle cx="265" cy="300" r="14" fill="white" stroke="black" stroke-width="6" />
        
        <!-- Triceratops driver -->
        <path d="M 160 170 C 140 140 170 120 200 130 C 230 120 260 140 240 170 Z" fill="white" stroke="black" stroke-width="8" />
        <!-- Horns -->
        <polygon points="160,130 150,105 170,125" fill="white" stroke="black" stroke-width="6" />
        <polygon points="240,130 250,105 230,125" fill="white" stroke="black" stroke-width="6" />
        <polygon points="195,145 200,125 205,145" fill="white" stroke="black" stroke-width="6" />
        <circle cx="185" cy="150" r="6" fill="black" />
        <circle cx="215" cy="150" r="6" fill="black" />
        
        <!-- Flag on rover -->
        <line x1="260" y1="180" x2="260" y2="100" stroke="black" stroke-width="7" stroke-linecap="round" />
        <polygon points="260,105 310,120 260,135" fill="white" stroke="black" stroke-width="6" />
        
        <!-- Stars -->
        <polygon points="60,90 65,102 78,102 68,110 72,122 60,114 48,122 52,110 42,102 55,102" fill="white" stroke="black" stroke-width="6" />
        <polygon points="320,60 325,72 338,72 328,80 332,92 320,84 308,92 312,80 302,72 315,72" fill="white" stroke="black" stroke-width="6" />
      `;
      break;

    case 'space_dino_3':
      innerArt = `
        <!-- Pterodactyl soaring in Asteroid Belt -->
        <!-- Wings -->
        <path d="M 190 200 Q 110 130 40 140 Q 100 230 160 220" fill="white" stroke="black" stroke-width="9" stroke-linejoin="round" />
        <path d="M 190 200 Q 270 130 340 140 Q 280 230 220 220" fill="white" stroke="black" stroke-width="9" stroke-linejoin="round" />
        
        <!-- Pterodactyl Body & Beak -->
        <ellipse cx="190" cy="215" rx="25" ry="40" fill="white" stroke="black" stroke-width="8" />
        <!-- Head and crest -->
        <path d="M 180 170 Q 150 140 140 110 Q 190 140 210 170 Z" fill="white" stroke="black" stroke-width="8" />
        <!-- Cute Aviator Goggles -->
        <rect x="175" y="160" width="30" height="20" rx="8" fill="white" stroke="black" stroke-width="6" />
        <circle cx="185" cy="170" r="5" fill="black" />
        
        <!-- Space Asteroids -->
        <polygon points="60,60 90,45 110,75 80,100 50,85" fill="white" stroke="black" stroke-width="7" />
        <circle cx="75" cy="70" r="6" fill="white" stroke="black" stroke-width="5" />
        
        <polygon points="270,70 310,50 335,85 315,115 280,105" fill="white" stroke="black" stroke-width="7" />
        <circle cx="305" cy="80" r="7" fill="white" stroke="black" stroke-width="5" />
        
        <polygon points="150,310 190,290 220,320 180,350 140,335" fill="white" stroke="black" stroke-width="7" />
        
        <!-- Saturn-like ring planet -->
        <circle cx="70" cy="280" r="28" fill="white" stroke="black" stroke-width="7" />
        <ellipse cx="70" cy="280" rx="45" ry="12" fill="none" stroke="black" stroke-width="6" />
      `;
      break;

    case 'space_dino_4':
      innerArt = `
        <!-- Friendly Brontosaurus at Space Station Cafe -->
        <!-- Space Station Dome -->
        <path d="M 40 350 A 150 150 0 0 1 340 350 Z" fill="white" stroke="black" stroke-width="9" />
        <line x1="20" y1="350" x2="360" y2="350" stroke="black" stroke-width="9" />
        
        <!-- Brontosaurus with long neck sipping alien milkshake -->
        <!-- Body -->
        <path d="M 80 350 Q 90 270 170 270 Q 230 270 250 350 Z" fill="white" stroke="black" stroke-width="8" />
        <!-- Long neck -->
        <path d="M 180 270 Q 240 180 230 110 Q 200 90 190 120 Q 190 190 160 270" fill="white" stroke="black" stroke-width="8" />
        <!-- Head -->
        <ellipse cx="225" cy="100" rx="22" ry="15" fill="white" stroke="black" stroke-width="7" />
        <circle cx="230" cy="96" r="4.5" fill="black" />
        <path d="M 235 106 Q 225 112 215 106" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" />
        
        <!-- Giant Space Juice Cup with curly straw -->
        <rect x="255" y="110" width="30" height="45" rx="6" fill="white" stroke="black" stroke-width="6" />
        <!-- Straw curving into mouth -->
        <path d="M 270 110 L 270 80 Q 270 65 240 85 L 235 102" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" />
        
        <!-- Stars in sky -->
        <circle cx="310" cy="90" r="8" fill="white" stroke="black" stroke-width="5" />
        <polygon points="90,110 94,120 106,120 97,126 100,136 90,130 80,136 83,126 74,120 86,120" fill="white" stroke="black" stroke-width="5" />
      `;
      break;

    case 'space_dino_5':
    default:
      innerArt = `
        <!-- Stegosaurus Planting a Space Flag with Star Trophy -->
        <!-- Big Stego Body -->
        <path d="M 90 310 C 90 200 270 200 290 310 Z" fill="white" stroke="black" stroke-width="9" />
        <!-- Stegosaurus Back Plates (diamonds) -->
        <polygon points="120,225 135,175 150,225" fill="white" stroke="black" stroke-width="7" />
        <polygon points="160,205 180,150 200,205" fill="white" stroke="black" stroke-width="7" />
        <polygon points="210,210 230,165 245,210" fill="white" stroke="black" stroke-width="7" />
        <polygon points="255,230 270,190 280,230" fill="white" stroke="black" stroke-width="7" />
        
        <!-- Head -->
        <path d="M 85 270 C 50 270 50 310 90 310 Z" fill="white" stroke="black" stroke-width="8" />
        <circle cx="70" cy="285" r="5" fill="black" />
        <path d="M 65 298 Q 75 305 85 298" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" />
        
        <!-- Legs -->
        <rect x="110" y="305" width="30" height="35" rx="8" fill="white" stroke="black" stroke-width="8" />
        <rect x="230" y="305" width="30" height="35" rx="8" fill="white" stroke="black" stroke-width="8" />
        
        <!-- Tail with Spikes -->
        <path d="M 285 280 Q 340 290 360 270" fill="none" stroke="black" stroke-width="9" stroke-linecap="round" />
        <polygon points="340,270 345,250 355,270" fill="white" stroke="black" stroke-width="6" />
        <polygon points="350,285 365,270 355,295" fill="white" stroke="black" stroke-width="6" />
        
        <!-- Celebration Banner & Trophy Star -->
        <line x1="180" y1="200" x2="180" y2="70" stroke="black" stroke-width="7" stroke-linecap="round" />
        <polygon points="180,75 235,95 180,115" fill="white" stroke="black" stroke-width="6" />
        
        <!-- Giant smiling celebration star -->
        <polygon points="290,90 296,108 316,108 300,119 306,137 290,126 274,137 280,119 264,108 284,108" fill="white" stroke="black" stroke-width="6" />
        <circle cx="286" cy="115" r="3" fill="black" />
        <circle cx="294" cy="115" r="3" fill="black" />
        <path d="M 287 122 Q 290 125 293 122" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" />
        
        <!-- Ground / Moon hill -->
        <path d="M 20 340 Q 180 320 360 340" fill="none" stroke="black" stroke-width="8" stroke-linecap="round" />
      `;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 420" width="100%" height="100%">
    <rect width="380" height="420" fill="#ffffff" />
    <!-- Outer margin guideline for print -->
    <rect x="8" y="8" width="364" height="404" fill="none" stroke="#222222" stroke-width="5" rx="10" />
    ${innerArt}
    <!-- Caption label inside SVG for clarity -->
    <text x="190" y="402" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="12" fill="#555555">${label}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Printable Sticker Sheet SVG generator with dashed cut lines and themed badges
export function createSampleStickersSvg(theme: string, childName: string): string {
  const safeName = (childName || 'Artist').toUpperCase();
  const safeTheme = (theme || 'Theme').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 500" width="100%" height="100%">
    <rect width="380" height="500" fill="#ffffff" />
    <!-- Outer Printable Guideline -->
    <rect x="8" y="8" width="364" height="484" fill="none" stroke="#222222" stroke-width="4" rx="12" />
    
    <!-- Header Banner -->
    <rect x="25" y="18" width="330" height="44" rx="8" fill="#ffffff" stroke="#000000" stroke-width="3" />
    <text x="190" y="38" text-anchor="middle" font-family="'Fredoka', sans-serif" font-weight="900" font-size="14" fill="#111827">✂️ PRINTABLE CUT-OUT STICKERS ✂️</text>
    <text x="190" y="52" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="9" fill="#6b7280">Cut along dashed lines &amp; stick onto your colored pages!</text>

    <!-- STICKER 1: Star Artist Badge (Top Left) -->
    <g transform="translate(25, 75)">
      <!-- Dashed cutting line -->
      <rect x="0" y="0" width="155" height="120" rx="18" fill="#ffffff" stroke="#333333" stroke-width="2.5" stroke-dasharray="6,4" />
      <text x="8" y="14" font-size="10">✂️</text>
      <!-- Medal Inner -->
      <circle cx="77" cy="52" r="32" fill="#ffffff" stroke="#000000" stroke-width="5" />
      <circle cx="77" cy="52" r="26" fill="#ffffff" stroke="#000000" stroke-width="2" stroke-dasharray="3,3" />
      <polygon points="77,32 82,45 96,45 85,53 89,66 77,58 65,66 69,53 58,45 72,45" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <!-- Ribbon Tails -->
      <path d="M 58 78 L 50 102 L 68 95 L 75 84 Z" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <path d="M 96 78 L 104 102 L 86 95 L 79 84 Z" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <rect x="35" y="96" width="85" height="18" rx="4" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <text x="77" y="109" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="9" fill="#111111">STAR ARTIST</text>
    </g>

    <!-- STICKER 2: Child Name Trophy (Top Right) -->
    <g transform="translate(200, 75)">
      <rect x="0" y="0" width="155" height="120" rx="18" fill="#ffffff" stroke="#333333" stroke-width="2.5" stroke-dasharray="6,4" />
      <text x="8" y="14" font-size="10">✂️</text>
      <!-- Trophy Cup -->
      <path d="M 55 35 L 100 35 L 94 65 Q 77 80 61 65 Z" fill="#ffffff" stroke="#000000" stroke-width="4" />
      <path d="M 55 40 Q 40 40 42 55 Q 44 65 58 62" fill="none" stroke="#000000" stroke-width="3.5" />
      <path d="M 100 40 Q 115 40 113 55 Q 111 65 97 62" fill="none" stroke="#000000" stroke-width="3.5" />
      <line x1="77" y1="75" x2="77" y2="88" stroke="#000000" stroke-width="6" />
      <rect x="52" y="88" width="51" height="16" rx="4" fill="#ffffff" stroke="#000000" stroke-width="3.5" />
      <text x="77" y="100" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="8" fill="#111111">${safeName}'S CUP</text>
      <circle cx="77" cy="50" r="7" fill="#ffffff" stroke="#000000" stroke-width="2.5" />
    </g>

    <!-- STICKER 3: Theme Mascot / Dino (Middle Left) -->
    <g transform="translate(25, 210)">
      <rect x="0" y="0" width="155" height="125" rx="18" fill="#ffffff" stroke="#333333" stroke-width="2.5" stroke-dasharray="6,4" />
      <text x="8" y="14" font-size="10">✂️</text>
      <!-- Cute Dinosaur / Mascot Waving -->
      <circle cx="77" cy="50" r="28" fill="#ffffff" stroke="#000000" stroke-width="4" />
      <circle cx="68" cy="46" r="3.5" fill="#000000" />
      <circle cx="86" cy="46" r="3.5" fill="#000000" />
      <path d="M 72 56 Q 77 62 82 56" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round" />
      <!-- Astronaut Helmet / Crown -->
      <path d="M 52 48 Q 50 20 77 20 Q 104 20 102 48" fill="none" stroke="#000000" stroke-width="3" />
      <!-- Cute waving hand -->
      <path d="M 46 62 Q 35 50 42 42 Q 50 45 52 56" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <!-- Ribbon Label -->
      <rect x="22" y="96" width="111" height="20" rx="5" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <text x="77" y="110" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="8.5" fill="#111111">EXPLORER BADGE</text>
    </g>

    <!-- STICKER 4: Super Rocket / Fast Star (Middle Right) -->
    <g transform="translate(200, 210)">
      <rect x="0" y="0" width="155" height="125" rx="18" fill="#ffffff" stroke="#333333" stroke-width="2.5" stroke-dasharray="6,4" />
      <text x="8" y="14" font-size="10">✂️</text>
      <!-- Rocket Body -->
      <path d="M 77 25 Q 95 50 90 75 L 64 75 Q 59 50 77 25 Z" fill="#ffffff" stroke="#000000" stroke-width="4" />
      <circle cx="77" cy="48" r="8" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <!-- Fins -->
      <polygon points="62,65 48,80 64,75" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <polygon points="92,65 106,80 90,75" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <!-- Fire flame -->
      <path d="M 68 76 Q 77 94 77 86 Q 82 92 86 76" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <rect x="25" y="96" width="105" height="20" rx="5" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <text x="77" y="110" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="8.5" fill="#111111">BLAST OFF!</text>
    </g>

    <!-- STICKER 5: 100% Awesome Sun (Bottom Left) -->
    <g transform="translate(25, 350)">
      <rect x="0" y="0" width="155" height="125" rx="18" fill="#ffffff" stroke="#333333" stroke-width="2.5" stroke-dasharray="6,4" />
      <text x="8" y="14" font-size="10">✂️</text>
      <!-- Sun Rays -->
      <g stroke="#000000" stroke-width="3" stroke-linecap="round">
        <line x1="77" y1="18" x2="77" y2="26" />
        <line x1="77" y1="78" x2="77" y2="86" />
        <line x1="43" y1="52" x2="51" y2="52" />
        <line x1="103" y1="52" x2="111" y2="52" />
        <line x1="53" y1="28" x2="59" y2="34" />
        <line x1="95" y1="70" x2="101" y2="76" />
        <line x1="53" y1="76" x2="59" y2="70" />
        <line x1="95" y1="34" x2="101" y2="28" />
      </g>
      <!-- Smiling Center -->
      <circle cx="77" cy="52" r="22" fill="#ffffff" stroke="#000000" stroke-width="4" />
      <!-- Sunglasses / Smile -->
      <ellipse cx="70" cy="50" rx="4" ry="5" fill="#000000" />
      <ellipse cx="84" cy="50" rx="4" ry="5" fill="#000000" />
      <path d="M 68 59 Q 77 66 86 59" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" />
      <rect x="25" y="96" width="105" height="20" rx="5" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <text x="77" y="110" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="8.5" fill="#111111">100% AWESOME</text>
    </g>

    <!-- STICKER 6: Super Crown (Bottom Right) -->
    <g transform="translate(200, 350)">
      <rect x="0" y="0" width="155" height="125" rx="18" fill="#ffffff" stroke="#333333" stroke-width="2.5" stroke-dasharray="6,4" />
      <text x="8" y="14" font-size="10">✂️</text>
      <!-- Big Sparkly Crown -->
      <path d="M 45 68 L 52 35 L 68 50 L 77 30 L 86 50 L 102 35 L 109 68 Z" fill="#ffffff" stroke="#000000" stroke-width="4" />
      <!-- Crown Jewels -->
      <circle cx="52" cy="35" r="4" fill="#ffffff" stroke="#000000" stroke-width="2.5" />
      <circle cx="77" cy="30" r="4" fill="#ffffff" stroke="#000000" stroke-width="2.5" />
      <circle cx="102" cy="35" r="4" fill="#ffffff" stroke="#000000" stroke-width="2.5" />
      <circle cx="77" cy="55" r="6" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <rect x="20" y="96" width="115" height="20" rx="5" fill="#ffffff" stroke="#000000" stroke-width="3" />
      <text x="77" y="110" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="8.5" fill="#111111">COLORING CHAMPION</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_COLORING_BOOK: ColoringBook = {
  id: 'starter-space-dinos',
  theme: 'Space Dinosaurs',
  childName: 'Leo',
  difficulty: 'standard',
  title: "Leo's Space Dinosaur Adventure",
  subtitle: 'A Galactic Coloring Mission Across the Stars',
  dedication: 'Specially created for Leo • Grab your crayons and explore!',
  resolution: '2K',
  aspectRatio: '3:4',
  coverImageUrl: createSampleLineArtSvg('space_dino_1', "LEO'S COVER"),
  coverStatus: 'completed',
  coverPrompt: "Cover page art of a happy cartoon dinosaur astronaut floating among cute stars and planets",
  createdAt: Date.now(),
  stickerSheet: {
    id: 'stickers-starter',
    title: "Leo's Space Dinosaur Printable Stickers",
    imageUrl: createSampleStickersSvg('Space Dinosaurs', 'Leo'),
    status: 'completed',
    prompt: "Printable sticker sheet with cute space dinosaur vector outline stickers and dashed cut lines",
  },
  pages: [
    {
      id: 'p1',
      pageNumber: 1,
      title: 'T-Rex Floating in Orbit',
      storyCaption: 'Rex floats gently past planet Earth in his shiny bubble astronaut suit!',
      funFactOrTip: 'Did you know T-Rex had tiny arms? Try coloring Rex\'s space suit bright fiery red or neon green!',
      prompt: "Children's coloring book page, bold thick black outlines, pure white background, cute T-Rex astronaut floating in space with stars",
      imageUrl: createSampleLineArtSvg('space_dino_1', 'PAGE 1: T-REX IN ORBIT'),
      status: 'completed',
      resolution: '2K',
    },
    {
      id: 'p2',
      pageNumber: 2,
      title: 'Triceratops on the Moon Rover',
      storyCaption: 'Zooming over moon craters with big bouncy rover tires!',
      funFactOrTip: 'Make the moon rover wheels fiery red and color the moon craters glowing silver!',
      prompt: "Children's coloring book page, bold thick black outlines, pure white background, Triceratops driving lunar rover on moon craters",
      imageUrl: createSampleLineArtSvg('space_dino_2', 'PAGE 2: MOON ROVER'),
      status: 'completed',
      resolution: '2K',
    },
    {
      id: 'p3',
      pageNumber: 3,
      title: 'Pterodactyl Soaring Asteroids',
      storyCaption: 'Soaring through space with aviator goggles dodging sparkly asteroids!',
      funFactOrTip: 'Did you know pterosaurs had wings made of skin like bats? Color the flying asteroids sparkly gold!',
      prompt: "Children's coloring book page, bold thick black outlines, pure white background, Pterodactyl flying through asteroid belt with goggles",
      imageUrl: createSampleLineArtSvg('space_dino_3', 'PAGE 3: ASTEROID BELT'),
      status: 'completed',
      resolution: '2K',
    },
    {
      id: 'p4',
      pageNumber: 4,
      title: 'Brontosaurus at Space Station',
      storyCaption: 'Sipping a cosmic fruit milkshake with an extra long curly straw!',
      funFactOrTip: 'Color the cosmic fruit milkshake with strawberry pink stripes and rainbow sparkles!',
      prompt: "Children's coloring book page, bold thick black outlines, pure white background, gentle Brontosaurus drinking space milkshake at space cafe",
      imageUrl: createSampleLineArtSvg('space_dino_4', 'PAGE 4: SPACE CAFE'),
      status: 'completed',
      resolution: '2K',
    },
    {
      id: 'p5',
      pageNumber: 5,
      title: 'Stegosaurus Mission Success',
      storyCaption: 'Mission accomplished! Planting the flag and celebrating with shiny stars!',
      funFactOrTip: 'Did you know the plates on a Stegosaurus back were as big as couch cushions? Make the victory stars sunny yellow!',
      prompt: "Children's coloring book page, bold thick black outlines, pure white background, Stegosaurus planting explorer flag with victory stars",
      imageUrl: createSampleLineArtSvg('space_dino_5', 'PAGE 5: MISSION ACCOMPLISHED'),
      status: 'completed',
      resolution: '2K',
    },
  ],
};

export const POPULAR_THEMES = [
  {
    theme: 'Jungle Animals',
    emoji: '🦁',
    desc: 'Lions, monkeys swinging in vines, friendly elephants, and toucans',
  },
  {
    theme: 'Magical Unicorns',
    emoji: '🦄',
    desc: 'Rainbow horned unicorns, enchanted castles, sparkly clouds, and fairy glens',
  },
  {
    theme: 'Fast Cars',
    emoji: '🏎️',
    desc: 'Speedy racing cars, turbo tracks, checkered flags, and monster trucks',
  },
  {
    theme: 'Under the Sea',
    emoji: '🐠',
    desc: 'Playful dolphins, colorful clownfish, hidden sunken treasure, and coral reefs',
  },
  {
    theme: 'Friendly Monsters',
    emoji: '👾',
    desc: 'Fluffy friendly monsters having tea parties, silly polka-dot smiles, and games',
  },
  {
    theme: 'Space Dinosaurs',
    emoji: '🚀',
    desc: 'Astronaut T-Rexes, rocket rovers, and planetary explorer dinos',
  },
];

export const CHAT_ROLES: ChatRole[] = [
  {
    id: 'companion',
    name: 'Creative Companion',
    description: 'General brainstorming, theme ideas, and cheerful advice.',
    systemInstruction:
      'You are a friendly, imaginative children coloring book assistant. Help parents and kids brainstorm fun themes and 5-page coloring storylines.',
    recommendedModel: 'gemini-3.5-flash',
  },
  {
    id: 'complex_storyteller',
    name: 'Story & Scene Mastermind',
    description: 'Complex 5-chapter story arcs, educational morals, and rich scene layouts.',
    systemInstruction:
      'You are an expert children author. Design cohesive, emotionally rewarding 5-part adventures with rhyming captions and precise line-art scene prompts.',
    recommendedModel: 'gemini-3.1-pro-preview',
  },
  {
    id: 'quick_sparks',
    name: 'Quick Idea Sparks',
    description: 'Rapid, instant theme suggestions and catchy page titles.',
    systemInstruction:
      'Give rapid, high-energy 1-liner ideas and quick scene lists with zero delay.',
    recommendedModel: 'gemini-3.1-flash-lite',
  },
];
