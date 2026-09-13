export type ImageResolution = '1K' | '2K' | '4K';

export type AspectRatio = '3:4' | '1:1' | '4:3';

export type ColoringDifficulty = 'toddler' | 'standard' | 'intricate';

export type ActivityMode = 'standard' | 'color-by-numbers' | 'dot-to-dot';

export type BookLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja';

export interface NumberLegendItem {
  number: number;
  colorName: string;
  hex: string;
}

export type ChatModel =
  | 'gemini-3.1-pro-preview'
  | 'gemini-3.5-flash'
  | 'gemini-3.1-flash-lite';

export interface ColoringPage {
  id: string;
  pageNumber: number;
  title: string;
  storyCaption: string;
  secondaryCaption?: string;
  secondaryLanguage?: BookLanguage;
  funFactOrTip?: string;
  prompt: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  errorMessage?: string;
  resolution?: ImageResolution;
  activityMode?: ActivityMode;
  numberLegend?: NumberLegendItem[];
}

export interface StickerSheet {
  id: string;
  title: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  prompt?: string;
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
  language?: BookLanguage;
  secondaryLanguage?: BookLanguage;
  difficulty?: ColoringDifficulty;
  resolution: ImageResolution;
  aspectRatio: AspectRatio;
  pageCount: number;
  coverImageUrl?: string;
  pages: ColoringPage[];
  stickerSheet?: StickerSheet;
}

export interface ColoringBook {
  id: string;
  theme: string;
  childName: string;
  difficulty?: ColoringDifficulty;
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
