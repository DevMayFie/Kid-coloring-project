export type ImageResolution = '1K' | '2K' | '4K';

export type AspectRatio = '3:4' | '1:1' | '4:3';

export type ColoringDifficulty = 'toddler' | 'standard' | 'intricate';

export type ActivityMode = 'standard' | 'color-by-numbers' | 'dot-to-dot' | 'maze';

export type ArtStyle =
  | 'classic'
  | 'kawaii'
  | 'storybook'
  | 'comic'
  | 'manga-chibi'
  | 'geometric-mandala'
  | 'vintage-woodcut'
  | 'retro-cartoon';

export type BookLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja';

export type PrintLayoutMode = 'standard' | 'booklet';

export type PageBorderStyle =
  | 'none'
  | 'classic-double'
  | 'stars-sparkles'
  | 'scalloped-dots'
  | 'jungle-vines'
  | 'space-constellation'
  | 'hearts-ribbons'
  | 'zigzag-fun';

export interface PlacedSticker {
  id: string;
  stickerId: string;
  emoji: string;
  label: string;
  svgDataUri?: string;
  x: number; // percentage 0-100 across canvas width
  y: number; // percentage 0-100 across canvas height
  scale: number; // 0.5 to 2.5
  rotation: number; // degrees -180 to 180
}

export interface NumberLegendItem {
  number: number;
  colorName: string;
  hex: string;
}

export type ChatModel =
  | 'gemini-3.8-flash'
  | 'gemini-3.5-flash'
  | 'gemini-3.1-pro-preview'
  | 'gemini-3.1-flash-lite';

export interface DotNode {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  num: number;
}

export interface ColoringPage {
  id: string;
  pageNumber: number;
  title: string;
  storyCaption: string;
  secondaryCaption?: string;
  secondaryLanguage?: BookLanguage;
  funFactOrTip?: string;
  artStyle?: ArtStyle;
  prompt: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  errorMessage?: string;
  resolution?: ImageResolution;
  activityMode?: ActivityMode;
  numberLegend?: NumberLegendItem[];
  borderStyle?: PageBorderStyle;
  placedStickers?: PlacedSticker[];
  coloredImageUrl?: string;
  voiceAudioUrl?: string;
  voiceAudioDuration?: number;
  dotToDotPoints?: DotNode[];
  isHeroPage?: boolean;
  heroPhotoUrl?: string;
  isDrawYourEndingPage?: boolean;
}

export interface StickerSheet {
  id: string;
  title: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  prompt?: string;
}

export interface BrandIntegration {
  enabled: boolean;
  organizationName: string;
  websiteUrl: string;
  tagline?: string;
  logoUrl?: string;
  logoPreset?: 'crayon-mascot' | 'school-crest' | 'art-palette' | 'star-rocket' | 'party-balloon' | 'custom';
  showOnCover: boolean;
  showOnPageFooter: boolean;
  showWebsiteQrCode: boolean;
}

export interface FavoriteBook {
  id: string;
  savedAt: number;
  theme: string;
  childName: string;
  title: string;
  subtitle: string;
  dedication: string;
  dedicationAuthor?: string;
  activityMode?: ActivityMode;
  artStyle?: ArtStyle;
  language?: BookLanguage;
  secondaryLanguage?: BookLanguage;
  difficulty?: ColoringDifficulty;
  resolution: ImageResolution;
  aspectRatio: AspectRatio;
  pageCount: number;
  coverImageUrl?: string;
  pages: ColoringPage[];
  stickerSheet?: StickerSheet;
  defaultBorderStyle?: PageBorderStyle;
  includeCertificate?: boolean;
  certificateDetails?: {
    recipientName: string;
    awardDate: string;
    presenter?: string;
  };
  includeQrCode?: boolean;
  includeDrawYourEnding?: boolean;
  includeCrayonSwatches?: boolean;
  printLayout?: PrintLayoutMode;
  heroPhotoUrl?: string;
  heroSubjectType?: 'child' | 'pet' | 'toy' | 'custom';
  brandIntegration?: BrandIntegration;
}

export interface ColoringBook {
  id: string;
  theme: string;
  childName: string;
  difficulty?: ColoringDifficulty;
  artStyle?: ArtStyle;
  activityMode?: ActivityMode;
  language?: BookLanguage;
  secondaryLanguage?: BookLanguage;
  title: string;
  subtitle: string;
  dedication: string;
  dedicationAuthor?: string;
  resolution: ImageResolution;
  aspectRatio: AspectRatio;
  coverImageUrl?: string;
  coverStatus: 'pending' | 'generating' | 'completed' | 'error';
  coverPrompt?: string;
  pages: ColoringPage[];
  stickerSheet?: StickerSheet;
  defaultBorderStyle?: PageBorderStyle;
  includeCertificate?: boolean;
  certificateDetails?: {
    recipientName: string;
    awardDate: string;
    presenter?: string;
  };
  includeQrCode?: boolean;
  includeDrawYourEnding?: boolean;
  includeCrayonSwatches?: boolean;
  printLayout?: PrintLayoutMode;
  heroPhotoUrl?: string;
  heroSubjectType?: 'child' | 'pet' | 'toy' | 'custom';
  brandIntegration?: BrandIntegration;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  modelUsed?: string;
  suggestedPlan?: {
    theme: string;
    childName?: string;
    pages: Array<{
      title: string;
      caption: string;
      prompt: string;
    }>;
  };
}

export interface ChatRole {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  recommendedModel: ChatModel;
}
