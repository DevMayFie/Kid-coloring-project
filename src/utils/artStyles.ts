import { ArtStyle } from '../types';

export interface ArtStyleDefinition {
  id: ArtStyle;
  name: string;
  emoji: string;
  badge: string;
  tagline: string;
  description: string;
  promptDirective: string;
  bestFor: string;
}

export const ART_STYLES: ArtStyleDefinition[] = [
  {
    id: 'classic',
    name: 'Classic Storybook',
    emoji: '🎨',
    badge: 'Popular',
    tagline: 'Clean, confident bold outlines',
    description: 'Crisp black ink contours with balanced details, joyful character expressions, and wide open coloring spaces for crayons and markers.',
    promptDirective: 'Classic storybook coloring style: Crisp bold black ink outlines, clean lines, joyful expressive character design, balanced composition, wide open coloring areas, zero shading, zero grayscale.',
    bestFor: 'Crayons & Washable Markers',
  },
  {
    id: 'kawaii',
    name: 'Kawaii & Cute',
    emoji: '🌸',
    badge: 'Super Cute',
    tagline: 'Bubbly Japanese chibi style',
    description: 'Ultra-cute rounded shapes, giant sparkly eyes, sweet smiles, blushing cheeks, and charming minimalist character lines.',
    promptDirective: 'Kawaii cute Japanese chibi line art style: Ultra-cute bubbly rounded outlines, oversized joyful eyes, sweet smiling expressions, blushing cheek marks, adorable tiny accessories, clean minimalist ink outlines, zero shading.',
    bestFor: 'Pastels, Crayons & Gel Pens',
  },
  {
    id: 'storybook',
    name: 'Fairy Tale Whimsy',
    emoji: '📚',
    badge: 'Enchanted',
    tagline: 'Rich folkloric illustration',
    description: 'Charming fairy-tale storybook line art with whimsical flora, enchanted treehouses, gentle storybook textures, and cozy warmth.',
    promptDirective: 'Whimsical fairy tale storybook illustration line art style: Charming folklore character design, whimsical flora, enchanted woodland scenery, playful storybook details, clean crisp black outlines, zero shading.',
    bestFor: 'Fine Markers & Colored Pencils',
  },
  {
    id: 'comic',
    name: 'Comic Book Action',
    emoji: '💥',
    badge: 'High Energy',
    tagline: 'Dynamic superhero ink lines',
    description: 'Bold heroic silhouettes, energetic action lines, dramatic comic panel framing, and graphic pop-art coloring spaces.',
    promptDirective: 'Dynamic superhero comic book line art style: Bold graphic ink outlines, energetic action silhouettes, punchy pop-art coloring areas, confident ink brush contours, clean pure white background, zero shading or halftone dots.',
    bestFor: 'Bright Markers & Brush Pens',
  },
  {
    id: 'manga-chibi',
    name: 'Manga & Anime',
    emoji: '✨',
    badge: 'Anime Look',
    tagline: 'Expressive anime chibi lines',
    description: 'Crisp pen ink line art with cute anime proportions, large expressive animated eyes, playful hairstyles, and clean cel contours.',
    promptDirective: 'Manga anime chibi line art style: Oversized expressive anime eyes, cute chibi proportions, stylized hair silhouettes, crisp fine pen ink outlines, joyful anime character expressions, zero grayscale or tones.',
    bestFor: 'Colored Pencils & Fine Liners',
  },
  {
    id: 'geometric-mandala',
    name: 'Mandala & Patterns',
    emoji: '🌀',
    badge: 'Mindful',
    tagline: 'Symmetric decorative textures',
    description: 'Meditative geometric patterns, kaleidoscopic floral symmetry, ornate repeating motifs, and rich decorative textures.',
    promptDirective: 'Geometric mandala decorative line art style: Symmetrical floral mandala patterns, ornamental repeating geometric textures, kaleidoscopic decorative borders, crisp clean black lines, zero shading or gradients.',
    bestFor: 'Fine-Tip Colored Pencils',
  },
  {
    id: 'vintage-woodcut',
    name: 'Vintage Storybook',
    emoji: '🏰',
    badge: 'Timeless',
    tagline: 'Antique botanical engraving',
    description: 'Classic vintage children\'s book illustration inspired by 19th-century storybooks with elegant ink contours and timeless warmth.',
    promptDirective: 'Vintage classic children\'s book engraving line art style: Timeless fairy tale storybook ink outlines, classic botanical accents, elegant clean character outlines, zero gray fills, pure black-and-white ink drawing.',
    bestFor: 'Colored Pencils & Watercolor Pencils',
  },
  {
    id: 'retro-cartoon',
    name: 'Retro 1930s Cartoon',
    emoji: '📺',
    badge: 'Bouncy Fun',
    tagline: 'Rubber-hose classic animation',
    description: 'Bouncy vintage 1930s cartoon line art with rubber-hose noodle limbs, pie eyes, joyful musical poses, and iconic vintage humor.',
    promptDirective: '1930s vintage rubber-hose cartoon animation line art style: Bouncy noodle arms, pie-shaped cartoon eyes, playful gloves and shoes, energetic vintage animation contours, bold ink outlines, zero shading.',
    bestFor: 'Bold Crayons & Classic Markers',
  },
];

export function getArtStyleDefinition(id?: ArtStyle): ArtStyleDefinition {
  const found = ART_STYLES.find((s) => s.id === id);
  return found || ART_STYLES[0];
}
