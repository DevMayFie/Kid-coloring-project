import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Printer,
  RefreshCw,
  Edit3,
  ZoomIn,
  Check,
  AlertCircle,
  Sparkles,
  BookMarked,
  Eye,
  Paintbrush,
  Volume2,
  VolumeX,
  Star,
  Bookmark,
  Scissors,
  Heart,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  LayoutGrid,
  Camera,
  Award,
  QrCode,
  Building2,
  Globe,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { ColoringBook, ColoringPage, ImageResolution, FavoriteBook, ActivityMode, BookLanguage, NumberLegendItem, PageBorderStyle, PlacedSticker } from '../types';
import { DigitalColoringModal } from './DigitalColoringModal';
import { PageColorTesterCanvas } from './PageColorTesterCanvas';
import { FavoritesModal } from './FavoritesModal';
import { FlipBookReader } from './FlipBookReader';
import { FilmStripNav } from './FilmStripNav';
import { PageBorderRenderer } from './PageBorderRenderer';
import { BorderSelectorModal } from './BorderSelectorModal';
import { getArtStyleDefinition } from '../utils/artStyles';
import { PersonalizedHeroModal } from './PersonalizedHeroModal';
import { CertificateModal } from './CertificateModal';
import { VoiceRecorderWidget } from './VoiceRecorderWidget';
import { getFavorites, saveFavorite, removeFavorite, isFavorite } from '../utils/favoritesStorage';
import { playChimeSound, speakStory, stopSpeaking } from '../utils/kidAudio';
import { getThematicCoverDescription, detectThemeCategory } from '../utils/coverIllustrationGenerator';
import confetti from 'canvas-confetti';

interface ColoringBookViewProps {
  book: ColoringBook;
  onRegeneratePage: (pageId: string, customPrompt?: string, resolution?: ImageResolution) => Promise<void>;
  onRegenerateCover: (forceVector?: boolean) => Promise<void>;
  onRegenerateStickers?: () => Promise<void>;
  onEditPage: (page: ColoringPage) => void;
  onPrintSinglePage: (page: ColoringPage) => void;
  onPrintStickerSheet?: () => void;
  onLoadFavorite?: (favorite: FavoriteBook) => void;
  onDownloadPdf?: () => void;
  onOpenPrintPreview?: () => void;
  onOpenBatchRegenerate?: () => void;
  onOpenPageReorder?: () => void;
  onUpdatePageBorder?: (pageId: string, borderStyle: PageBorderStyle) => void;
  onUpdateAllBorders?: (borderStyle: PageBorderStyle) => void;
  onSavePageArtwork?: (pageId: string, coloredDataUrl: string, stickers: PlacedSticker[], borderStyle?: PageBorderStyle) => void;
  onSaveVoiceAudio?: (pageId: string, audioUrl: string, duration: number) => void;
  onAddHeroPage?: (heroData: { imageUrl: string; title: string; caption: string; asCover?: boolean }) => void;
  onToggleQrCode?: (enabled: boolean) => void;
  onUpdateCertificate?: (details: { recipientName: string; awardDate: string; presenter?: string }) => void;
  isPreparingPdf?: boolean;
  pdfProgress?: number;
  isPdfBtnTooltipVisible?: boolean;
  setIsPdfBtnTooltipVisible?: (visible: boolean) => void;
  isBookGenerationFinished?: boolean;
  isGeneratingBook?: boolean;
  onOpenBrandModal?: () => void;
  onOpenWebsiteModal?: () => void;
  onOpenActivitiesModal?: () => void;
}

export const ColoringBookView: React.FC<ColoringBookViewProps> = ({
  book,
  onRegeneratePage,
  onRegenerateCover,
  onRegenerateStickers,
  onEditPage,
  onPrintSinglePage,
  onPrintStickerSheet,
  onLoadFavorite,
  onDownloadPdf,
  onOpenPrintPreview,
  onOpenBatchRegenerate,
  onOpenPageReorder,
  onUpdatePageBorder,
  onUpdateAllBorders,
  onSavePageArtwork,
  onSaveVoiceAudio,
  onAddHeroPage,
  onToggleQrCode,
  onUpdateCertificate,
  isPreparingPdf,
  pdfProgress,
  isPdfBtnTooltipVisible,
  setIsPdfBtnTooltipVisible,
  isBookGenerationFinished,
  isGeneratingBook,
  onOpenBrandModal,
  onOpenWebsiteModal,
  onOpenActivitiesModal,
}) => {
  const [selectedPreviewImg, setSelectedPreviewImg] = useState<{ url: string; title: string } | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Record<string, boolean>>({});
  const [isRegeneratingStickers, setIsRegeneratingStickers] = useState(false);
  const [speakingPageId, setSpeakingPageId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteBook[]>(() => getFavorites());
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [isSavedFavorite, setIsSavedFavorite] = useState(() => isFavorite(book.id, book.theme, book.childName));
  const [viewMode, setViewMode] = useState<'grid' | 'flip'>('grid');
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [flipDirection, setFlipDirection] = useState<number>(1);

  // Compile sequential slide entries for fast page-flip navigation
  const navSlides = useMemo<
    { id: string; label: string; title: string; index: number; type: 'cover' | 'page' | 'stickers' }[]
  >(() => {
    const list: { id: string; label: string; title: string; index: number; type: 'cover' | 'page' | 'stickers' }[] = [];
    if (book.coverImageUrl || book.coverStatus) {
      list.push({
        id: 'nav-cover',
        label: '📕 Cover',
        title: `${book.childName}'s Custom Cover`,
        index: 0,
        type: 'cover',
      });
    }
    book.pages.forEach((p, idx) => {
      const slideIdx = (book.coverImageUrl || book.coverStatus ? 1 : 0) + idx;
      list.push({
        id: `nav-${p.id}`,
        label: `Page ${p.pageNumber}`,
        title: p.title,
        index: slideIdx,
        type: 'page',
      });
    });
    if (book.stickerSheet?.imageUrl || book.stickerSheet?.status) {
      const stickerSlideIdx = (book.coverImageUrl || book.coverStatus ? 1 : 0) + book.pages.length;
      list.push({
        id: 'nav-stickers',
        label: '✂️ Stickers',
        title: book.stickerSheet.title || `${book.childName}'s Printable Stickers`,
        index: stickerSlideIdx,
        type: 'stickers',
      });
    }
    return list;
  }, [book.coverImageUrl, book.coverStatus, book.childName, book.pages, book.stickerSheet]);

  const safeActiveIndex = Math.max(0, Math.min(activePageIndex, Math.max(0, navSlides.length - 1)));
  const currentNavSlide = navSlides[safeActiveIndex] || navSlides[0];

  // Navigate between coloring pages with subtle flip-book transition
  const handleNavigatePage = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= navSlides.length) return;
    const direction = newIndex >= activePageIndex ? 1 : -1;
    setFlipDirection(direction);
    setActivePageIndex(newIndex);
    if (viewMode !== 'flip') {
      setViewMode('flip');
    }
    playChimeSound('pageflip');
    // Scroll to the book container smoothly
    const bookContainer = document.getElementById('coloring-book-viewer');
    if (bookContainer) {
      bookContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // New Feature Modals state
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);

  const [activeColoringPage, setActiveColoringPage] = useState<{
    pageId?: string;
    title: string;
    pageNumber?: number;
    imageUrl: string;
    storyCaption?: string;
    secondaryCaption?: string;
    secondaryLanguage?: BookLanguage;
    numberLegend?: NumberLegendItem[];
    activityMode?: ActivityMode;
    funFactOrTip?: string;
    slideIndex?: number;
    borderStyle?: PageBorderStyle;
    placedStickers?: PlacedSticker[];
    voiceAudioUrl?: string;
  } | null>(null);

  // Page Border modal state
  const [isBorderModalOpen, setIsBorderModalOpen] = useState(false);
  const [borderModalTargetPage, setBorderModalTargetPage] = useState<ColoringPage | null>(null);

  // Sync favorites state on book change or storage update
  useEffect(() => {
    setIsSavedFavorite(isFavorite(book.id, book.theme, book.childName));
    const handleUpdate = () => {
      setFavorites(getFavorites());
      setIsSavedFavorite(isFavorite(book.id, book.theme, book.childName));
    };
    window.addEventListener('coloring_book_favorites_updated', handleUpdate);
    return () => {
      window.removeEventListener('coloring_book_favorites_updated', handleUpdate);
    };
  }, [book.id, book.theme, book.childName]);

  const handleToggleFavorite = () => {
    if (isSavedFavorite) {
      removeFavorite(book.id);
      setIsSavedFavorite(false);
      setFavorites(getFavorites());
    } else {
      saveFavorite(book);
      setIsSavedFavorite(true);
      setFavorites(getFavorites());
      playChimeSound('fanfare');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  const handleReadAloud = (pageId: string, text: string) => {
    if (speakingPageId === pageId) {
      stopSpeaking();
      setSpeakingPageId(null);
    } else {
      stopSpeaking();
      setSpeakingPageId(pageId);
      speakStory(text, () => {
        setSpeakingPageId(null);
      });
    }
  };

  const handlePageRegen = async (pageId: string) => {
    setRegeneratingIds((prev) => ({ ...prev, [pageId]: true }));
    try {
      await onRegeneratePage(pageId);
    } finally {
      setRegeneratingIds((prev) => ({ ...prev, [pageId]: false }));
    }
  };

  const failedPages = book.pages.filter((p) => p.status === 'error');

  const handleRetryAllFailedPages = async () => {
    for (const page of failedPages) {
      await handlePageRegen(page.id);
    }
  };

  const handleStickerRegen = async () => {
    if (!onRegenerateStickers) return;
    setIsRegeneratingStickers(true);
    try {
      await onRegenerateStickers();
      playChimeSound('sparkle');
    } finally {
      setIsRegeneratingStickers(false);
    }
  };

  const handleDownloadSinglePng = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${filename.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="coloring-book-viewer" className="space-y-8 pb-28 sm:pb-36 scroll-mt-20">
      {/* Warm, Child-Friendly Storybook Header & View Mode Switcher */}
      <div className="bg-linear-to-r from-amber-100/90 via-orange-50/80 to-amber-100/70 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border border-amber-300/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 transition-colors">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider shadow-2xs">
              ✨ {book.childName}'s Storybook
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-850 border border-amber-200 dark:border-slate-700 text-amber-950 dark:text-amber-300 text-xs font-bold shadow-2xs">
              🎨 {book.pages.length} Pages + Cover
            </span>
            {book.difficulty && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-850 border border-amber-200 dark:border-slate-700 text-amber-900 dark:text-amber-300 text-xs font-bold shadow-2xs">
                {book.difficulty === 'toddler'
                  ? '🖍️ Toddler: Big Bold Lines'
                  : book.difficulty === 'intricate'
                  ? '✒️ Intricate Patterns'
                  : '🎨 Easy Kids Outlines'}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100 tracking-tight" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            {book.title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 italic">
            "{book.subtitle}" — <span className="font-medium">{book.dedication}</span>
          </p>
        </div>

        {/* View Mode Switcher & Favorites */}
        <div className="flex items-center gap-2.5 flex-wrap self-stretch lg:self-auto justify-between lg:justify-end">
          {/* Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1.5 bg-white/95 dark:bg-slate-800 rounded-2xl border border-amber-300/80 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('grid');
                playChimeSound('pop');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400 font-black'
                  : 'text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-amber-50 dark:hover:bg-slate-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>🗂️ All Pages Gallery</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('flip');
                playChimeSound('pageflip');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'flip'
                  ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400 font-black'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-amber-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>📖 Flip Storybook</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {onOpenBatchRegenerate && (
              <button
                type="button"
                onClick={() => {
                  playChimeSound('sparkle');
                  onOpenBatchRegenerate();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                title="Batch regenerate all pages in book with 1-click"
              >
                <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse" />
                <span>Batch Regenerate</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setBorderModalTargetPage(null); // null means apply book-wide
                setIsBorderModalOpen(true);
                playChimeSound('pop');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-gray-800 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Customize borders for all pages in this coloring book"
            >
              <span>🖼️</span>
              <span>Borders</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsHeroModalOpen(true);
                playChimeSound('sparkle');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-linear-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
              title="Transform child or pet photo into personalized line art"
            >
              <Camera className="w-4 h-4 text-pink-100" />
              <span>Photo-to-Line-Art</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCertificateModalOpen(true);
                playChimeSound('fanfare');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-black transition-all cursor-pointer shadow-xs"
              title="Award personalized Coloring Master Diploma certificate"
            >
              <Award className="w-4 h-4 text-amber-700" />
              <span>Diploma</span>
            </button>

            {onToggleQrCode && (
              <button
                type="button"
                onClick={() => {
                  const newState = !(book.includeQrCode !== false);
                  onToggleQrCode(newState);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border ${
                  book.includeQrCode !== false
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Toggle bottom-corner QR code for audio read-along on physical printouts"
              >
                <QrCode className={`w-4 h-4 ${book.includeQrCode !== false ? 'text-emerald-600' : 'text-gray-500'}`} />
                <span>QR Audio: {book.includeQrCode !== false ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {onOpenPageReorder && (
              <button
                type="button"
                onClick={onOpenPageReorder}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-950 border border-orange-300 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                title="Arrange story sequence with drag-and-drop page reordering"
              >
                <span>🔀</span>
                <span>Arrange Story</span>
              </button>
            )}

            {onOpenPrintPreview && (
              <button
                type="button"
                onClick={onOpenPrintPreview}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Open full-screen Print Preview modal to inspect all PDF pages"
              >
                <Eye className="w-4 h-4 text-amber-700" />
                <span>Print Preview</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isSavedFavorite
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                  : 'bg-white text-gray-800 border border-amber-300 hover:bg-amber-50'
              }`}
              title={isSavedFavorite ? 'Saved in your favorites!' : 'Save book to favorites'}
            >
              <Star className={`w-4 h-4 ${isSavedFavorite ? 'fill-yellow-200 text-yellow-100' : 'text-amber-500'}`} />
              <span>{isSavedFavorite ? 'Favorited' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFavoritesModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-gray-800 hover:bg-amber-50 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Browse your saved favorite themes"
            >
              <Bookmark className="w-4 h-4 text-amber-600" />
              <span>Saved ({favorites.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Page Navigation Bar with Subtle Flip-Book Controls */}
      <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-amber-200/90 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Prev & Next Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="book-nav-prev-btn"
            onClick={() => handleNavigatePage(safeActiveIndex - 1)}
            disabled={safeActiveIndex === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs active:scale-95"
            title="Flip to Previous Coloring Page (←)"
          >
            <ChevronLeft className="w-4 h-4 text-amber-700" />
            <span className="hidden sm:inline">Prev Page</span>
            <span className="sm:hidden">Prev</span>
          </button>

          <button
            type="button"
            id="book-nav-next-btn"
            onClick={() => handleNavigatePage(safeActiveIndex + 1)}
            disabled={safeActiveIndex >= navSlides.length - 1}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs active:scale-95"
            title="Flip to Next Coloring Page (→)"
          >
            <span className="hidden sm:inline">Next Page</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Page Label & Quick Slide Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/80">
            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
            <span className="text-xs font-black text-amber-950">
              {currentNavSlide?.label || `Page ${safeActiveIndex + 1}`}
            </span>
            <span className="text-[11px] text-amber-700 font-semibold hidden md:inline">
              • {currentNavSlide?.title}
            </span>
          </div>

          {/* Quick Page Jump Pills */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] sm:max-w-xs md:max-w-md py-0.5">
            {navSlides.map((item) => {
              const isSelected = safeActiveIndex === item.index;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigatePage(item.index)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300 scale-105 font-black'
                      : 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border border-amber-200 hover:scale-102'
                  }`}
                  title={`Flip to ${item.title}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode Indicator / Switch Quick Toggle */}
        <div className="flex items-center gap-2">
          {onOpenBrandModal && (
            <button
              type="button"
              onClick={onOpenBrandModal}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                book.brandIntegration?.enabled
                  ? 'bg-amber-100 text-amber-950 border-amber-400'
                  : 'bg-white hover:bg-amber-50 text-gray-700 border-gray-200'
              }`}
              title="Configure custom organization logo, sponsor, and website URL"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Brand Logo</span>
            </button>
          )}

          {onOpenWebsiteModal && (
            <button
              type="button"
              onClick={onOpenWebsiteModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold transition-all cursor-pointer border border-blue-200 shadow-2xs"
              title="Open Website Embed Widget and sharing tools"
            >
              <Globe className="w-3.5 h-3.5 text-blue-700" />
              <span className="hidden sm:inline">Website &amp; Embed</span>
            </button>
          )}

          {onOpenActivitiesModal && (
            <button
              type="button"
              onClick={onOpenActivitiesModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-orange-950 text-xs font-bold transition-all cursor-pointer border border-orange-300 shadow-2xs"
              title="Bonus Maze Adventure, Cut-Out Bookmarks, and Color Mixing Lab"
            >
              <Compass className="w-3.5 h-3.5 text-orange-700" />
              <span>Activities &amp; Crafts</span>
            </button>
          )}

          {viewMode === 'grid' ? (
            <button
              type="button"
              onClick={() => {
                setViewMode('flip');
                playChimeSound('pageflip');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100/90 hover:bg-amber-200 text-amber-950 text-xs font-bold transition-all cursor-pointer border border-amber-300 shadow-2xs"
              title="Open full interactive Flip Book reader"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-800" />
              <span>Open Flip Mode</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setViewMode('grid');
                playChimeSound('pop');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all cursor-pointer border border-amber-200 shadow-2xs"
              title="Switch to gallery grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-700" />
              <span>Grid View</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Coloring Book Reader / Grid Views with Animated Flip Transition */}
      <AnimatePresence mode="wait">
        {viewMode === 'flip' ? (
          <motion.div
            key="view-flip"
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            <FlipBookReader
              book={book}
              activePageIndex={safeActiveIndex}
              onPageChange={handleNavigatePage}
              onOpenColorStudio={setActiveColoringPage}
              onZoomImage={setSelectedPreviewImg}
              onRegenerateCover={onRegenerateCover}
              onRegeneratePage={(id) => handlePageRegen(id)}
              onEditPage={onEditPage}
              onPrintSinglePage={onPrintSinglePage}
              onPrintStickerSheet={onPrintStickerSheet}
              onRegenerateStickers={onRegenerateStickers}
              regeneratingIds={regeneratingIds}
              speakingPageId={speakingPageId}
              onReadAloud={handleReadAloud}
              onSaveVoiceAudio={onSaveVoiceAudio}
            />
          </motion.div>
        ) : (
          <motion.div
            key="view-grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="space-y-8"
          >
          {/* Prominent API Failure Warning Banner with Retry All Action */}
          {failedPages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-rose-950">
                    {failedPages.length} {failedPages.length === 1 ? 'page' : 'pages'} could not be drawn
                  </h4>
                  <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                    API generation was interrupted or reached a limit. You can retry individual pages below or retry all {failedPages.length} failed {failedPages.length === 1 ? 'page' : 'pages'} now.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRetryAllFailedPages}
                className="shrink-0 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry {failedPages.length} Failed {failedPages.length === 1 ? 'Page' : 'Pages'}</span>
              </button>
            </motion.div>
          )}

          {/* COVER CARD PREVIEW */}
          <section
            id="coloring-book-cover-card"
            className="bg-linear-to-br from-amber-50/80 via-white to-orange-50/60 rounded-3xl border border-amber-200/90 p-6 sm:p-7 shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
              {/* Cover image preview with animated entry/exit */}
              <div className="w-full md:w-64 shrink-0 aspect-3/4 rounded-2xl bg-white p-2.5 shadow-md border border-amber-200 ring-4 ring-amber-100/70 flex flex-col items-center justify-center relative group overflow-hidden">
                <AnimatePresence mode="wait">
                  {book.coverImageUrl && book.coverStatus !== 'generating' ? (
                    <motion.div
                      key={`cover-img-${book.coverImageUrl}`}
                      initial={{ opacity: 0, y: 14, scale: 0.96, filter: 'blur(3px)' }}
                      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -12, scale: 0.96, filter: 'blur(2px)' }}
                      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      className="w-full h-full relative flex items-center justify-center"
                    >
                      <img
                        src={book.coverImageUrl}
                        alt="Custom Cover Art"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain rounded-xl filter contrast-125 transition-transform duration-200 group-hover:scale-101"
                      />
                      <button
                        onClick={() => setSelectedPreviewImg({ url: book.coverImageUrl!, title: `${book.childName}'s Cover Page` })}
                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 font-bold text-xs rounded-xl transition-opacity cursor-pointer"
                      >
                        <ZoomIn className="w-4 h-4" /> Fullscreen Preview
                      </button>
                    </motion.div>
                  ) : book.coverStatus === 'generating' ? (
                    <motion.div
                      key="cover-generating"
                      initial={{ opacity: 0, scale: 0.92, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="text-center p-4 flex flex-col items-center justify-center gap-2.5"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                        <Sparkles className="w-4 h-4 text-amber-500 absolute inset-0 m-auto animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">Drawing Cover Art...</p>
                        <p className="text-[11px] text-gray-500">Creating custom coloring lettering</p>
                      </div>
                      <div className="w-24 h-1.5 bg-amber-100 rounded-full overflow-hidden mt-1">
                        <div className="w-full h-full bg-linear-to-r from-amber-400 via-orange-500 to-amber-400 rounded-full animate-pulse"></div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="cover-empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-center p-4"
                    >
                      <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
                      <p className="text-xs font-bold text-gray-800">Cover Artwork</p>
                      <p className="text-[11px] text-gray-500">Thick-line coloring cover</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Cover Details */}
              <div className="flex-1 text-left space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-block px-3 py-1 rounded-full bg-amber-600 text-white text-xs font-black uppercase tracking-wider shadow-2xs">
                    ★ Book Cover ★
                  </div>
                  {book.artStyle && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 shadow-2xs">
                      <span>{getArtStyleDefinition(book.artStyle).emoji}</span>
                      <span>{getArtStyleDefinition(book.artStyle).name} Style</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleNavigatePage(0);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100/80 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open in Flip Mode</span>
                  </button>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  {book.childName}'S {book.theme} COLORING BOOK
                </h3>

                <p className="text-sm font-medium text-gray-600">
                  {book.subtitle}
                </p>

                {/* Thematic Illustration Highlight */}
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-orange-50/80 border border-orange-200/90 text-xs text-orange-950 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-bold text-orange-900 block truncate">
                      Thematic Cover Art • {book.theme}
                    </span>
                    <span className="text-[11px] text-orange-800 leading-normal block">
                      {getThematicCoverDescription(book.theme, book.childName)}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 font-medium space-y-1">
                  <p><strong>Dedication:</strong> {book.dedication}</p>
                  <p className="text-[11px] text-amber-800">
                    <strong>Color Your Own Cover:</strong> Printed with large coloring title fonts so {book.childName} can color their own personalized book cover!
                  </p>
                </div>

                {/* Brand & Website Presentation Banner */}
                {book.brandIntegration?.enabled && book.brandIntegration.showOnCover && (
                  <div className="p-3 rounded-2xl bg-linear-to-r from-amber-50 to-orange-50 border border-amber-300/80 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {book.brandIntegration.logoUrl ? (
                        <img
                          src={book.brandIntegration.logoUrl}
                          alt="Brand Logo"
                          className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 border border-amber-200 shrink-0"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-amber-700 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block truncate">
                          {book.brandIntegration.tagline || 'Presented by'}
                        </span>
                        <span className="text-xs font-black text-gray-900 block truncate">
                          {book.brandIntegration.organizationName}
                        </span>
                      </div>
                    </div>

                    {book.brandIntegration.websiteUrl && (
                      <a
                        href={book.brandIntegration.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition-all shrink-0 shadow-2xs"
                      >
                        <Globe className="w-3 h-3 text-amber-600" />
                        <span className="max-w-[140px] truncate">
                          {book.brandIntegration.websiteUrl.replace(/^https?:\/\//, '')}
                        </span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    )}
                  </div>
                )}

                {/* Actions for Cover */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {book.coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        playChimeSound('magic');
                        setActiveColoringPage({
                          pageId: 'cover',
                          title: `${book.childName}'s Custom Cover`,
                          imageUrl: book.coverImageUrl!,
                          storyCaption: book.subtitle,
                          funFactOrTip: book.dedication,
                          borderStyle: book.defaultBorderStyle || 'classic-double',
                        });
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Paintbrush className="w-4 h-4" />
                      <span>🎨 Color Cover Online!</span>
                    </button>
                  )}

                  <button
                    onClick={() => onRegenerateCover(false)}
                    disabled={book.coverStatus === 'generating'}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${book.coverStatus === 'generating' ? 'animate-spin' : ''}`} />
                    <span>{book.coverStatus === 'generating' ? 'Generating Art...' : 'Redo AI Cover Art'}</span>
                  </button>

                  <button
                    onClick={() => onRegenerateCover(true)}
                    disabled={book.coverStatus === 'generating'}
                    title="Switch to instant hand-drawn vector thematic cover"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300/80 text-amber-900 text-xs font-bold transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Instant Vector Cover</span>
                  </button>

                  {book.coverImageUrl && (
                    <button
                      onClick={() => handleDownloadSinglePng(book.coverImageUrl!, `${book.childName}-cover-page`)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Cover PNG</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

      {/* DISTINCT COLORING PAGES GRID WITH FLUID ENTRY / EXIT ANIMATIONS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              <span>{book.pages.length} Distinct Coloring Pages</span>
              <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                Black & White • Thick Outlines
              </span>
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Each page features a distinct scene from {book.childName}'s {book.theme} adventure with coloring tips, fun facts & bold outlines.
            </p>
          </div>
        </div>

        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {book.pages.map((page, index) => {
              const isRegen = regeneratingIds[page.id] || page.status === 'generating';

              return (
                <motion.div
                  key={page.id}
                  layout
                  initial={{ opacity: 0, y: 28, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.92 }}
                  transition={{
                    duration: 0.38,
                    delay: Math.min(index * 0.05, 0.35),
                    ease: [0.16, 1, 0.3, 1],
                    layout: { type: 'spring', stiffness: 350, damping: 32 },
                  }}
                  className="bg-white rounded-3xl border border-amber-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all relative group"
                  id={`coloring-page-card-${index + 1}`}
                >
                  {/* Page Number & Status Pill with Smooth Badge Transition */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black tracking-wider shadow-2xs">
                        PAGE {page.pageNumber} OF {book.pages.length}
                      </span>
                      {page.activityMode === 'color-by-numbers' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black">
                          🔢 Color by Numbers
                        </span>
                      )}
                      {page.activityMode === 'dot-to-dot' && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-black">
                          ✏️ Dot-to-Dot
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const pageSlideIdx = (book.coverImageUrl ? 1 : 0) + index;
                          handleNavigatePage(pageSlideIdx);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100/70 hover:bg-amber-200 text-amber-900 text-[11px] font-bold transition-all cursor-pointer"
                        title="Open in Flip Book mode"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Flip</span>
                      </button>

                      <AnimatePresence mode="wait">
                        {page.status === 'completed' && !isRegen && (
                          <motion.span
                            key="status-completed"
                            initial={{ opacity: 0, scale: 0.85, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 4 }}
                            transition={{ duration: 0.2 }}
                            className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"
                          >
                            <Check className="w-3 h-3" /> Ready
                          </motion.span>
                        )}
                        {isRegen && (
                          <motion.span
                            key="status-drawing"
                            initial={{ opacity: 0, scale: 0.85, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 4 }}
                            transition={{ duration: 0.2 }}
                            className="text-[11px] font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200"
                          >
                            <RefreshCw className="w-3 h-3 animate-spin" /> Drawing...
                          </motion.span>
                        )}
                        {page.status === 'error' && !isRegen && (
                          <motion.span
                            key="status-error"
                            initial={{ opacity: 0, scale: 0.85, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 4 }}
                            transition={{ duration: 0.2 }}
                            className="text-[11px] font-bold text-rose-700 flex items-center gap-1 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200"
                          >
                            <AlertCircle className="w-3 h-3" /> Retry
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Page Scene Title with Smooth Update Animation */}
                  <motion.h4
                    key={page.title}
                    initial={{ opacity: 0.75, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="font-black text-gray-900 text-base mt-2.5 line-clamp-1"
                    title={page.title}
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                  >
                    {page.title}
                  </motion.h4>

                  {/* Main Coloring Art Frame with Fluid Entry & Exit Transitions */}
                  <div className="my-3 w-full aspect-3/4 border border-gray-200/90 rounded-2xl bg-white p-2.5 flex items-center justify-center relative overflow-hidden shadow-inner group">
                    <AnimatePresence mode="wait">
                      {page.imageUrl && !isRegen ? (
                        <motion.div
                          key={`art-${page.imageUrl}`}
                          initial={{ opacity: 0, y: 14, scale: 0.96, filter: 'blur(3px)' }}
                          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, y: -12, scale: 0.96, filter: 'blur(2px)' }}
                          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                          className="w-full h-full relative flex items-center justify-center"
                        >
                          <img
                            src={page.coloredImageUrl || page.imageUrl}
                            alt={page.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain filter contrast-125 rounded-lg transition-transform duration-200 group-hover:scale-101"
                          />

                          {/* Customizable Page Border Overlay */}
                          <div className="absolute inset-0 pointer-events-none">
                            <PageBorderRenderer borderStyle={page.borderStyle || book.defaultBorderStyle || 'classic-double'} />
                          </div>

                          {/* Placed Stickers overlay if not baked into coloredImageUrl */}
                          {!page.coloredImageUrl && page.placedStickers && page.placedStickers.length > 0 && (
                            <div className="absolute inset-0 pointer-events-none">
                              {page.placedStickers.map((st) => (
                                <div
                                  key={st.id}
                                  className="absolute select-none"
                                  style={{
                                    left: `${st.x}%`,
                                    top: `${st.y}%`,
                                    transform: `translate(-50%, -50%) rotate(${st.rotation}deg) scale(${st.scale})`,
                                  }}
                                >
                                  <span className="text-2xl drop-shadow-md">{st.emoji}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Colored artwork badge */}
                          {page.coloredImageUrl && (
                            <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 z-10">
                              <Sparkles className="w-3 h-3" /> Colored!
                            </div>
                          )}

                          {/* Corner QR code badge indicator */}
                          {book.includeQrCode !== false && (
                            <div
                              className="absolute bottom-2 right-2 bg-white/90 border border-gray-300 rounded-md px-1.5 py-0.5 text-[9px] font-black text-gray-700 shadow-2xs select-none flex items-center gap-1 z-10"
                              title="QR Code for audio read-along included on printouts"
                            >
                              <span>📱</span>
                              <span>QR Audio</span>
                            </div>
                          )}

                          {/* Zoom button on hover */}
                          <button
                            onClick={() => setSelectedPreviewImg({ url: page.coloredImageUrl || page.imageUrl!, title: `Page ${page.pageNumber}: ${page.title}` })}
                            className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 font-bold text-xs rounded-2xl transition-opacity cursor-pointer"
                          >
                            <ZoomIn className="w-4 h-4" /> Full View
                          </button>
                        </motion.div>
                      ) : isRegen ? (
                        <motion.div
                          key={`drawing-${page.id}`}
                          initial={{ opacity: 0, scale: 0.92, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -8 }}
                          transition={{ duration: 0.3 }}
                          className="text-center p-4 flex flex-col items-center justify-center gap-2.5"
                        >
                          <div className="relative">
                            <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                            <Sparkles className="w-4 h-4 text-amber-500 absolute inset-0 m-auto animate-pulse" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">Generating Line Art...</p>
                            <p className="text-[11px] text-gray-500">Creating clean black outlines</p>
                          </div>
                          <div className="w-24 h-1.5 bg-amber-100 rounded-full overflow-hidden mt-1">
                            <div className="w-full h-full bg-linear-to-r from-amber-400 via-orange-500 to-amber-400 rounded-full animate-pulse"></div>
                          </div>
                        </motion.div>
                      ) : page.status === 'error' ? (
                        <motion.div
                          key={`error-${page.id}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center p-4 flex flex-col items-center justify-center gap-2"
                        >
                          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-1">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-bold text-gray-900">Drawing Incomplete</p>
                          <p className="text-[11px] text-rose-900 bg-rose-50/90 border border-rose-200/90 rounded-xl px-2.5 py-1.5 leading-relaxed font-medium shadow-2xs max-w-[220px]">
                            {page.errorMessage || 'Could not generate this page image. Please try again.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => handlePageRegen(page.id)}
                            className="mt-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer transition-all"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry Page Drawing</span>
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={`empty-${page.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-center p-4 flex flex-col items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-8 h-8 text-amber-500 mb-1" />
                          <p className="text-xs font-bold text-gray-800">No Image Yet</p>
                          <button
                            type="button"
                            onClick={() => handlePageRegen(page.id)}
                            className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 cursor-pointer"
                          >
                            Draw This Page
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Number Legend in Grid View */}
                  {page.activityMode === 'color-by-numbers' && page.numberLegend && page.numberLegend.length > 0 && (
                    <div className="mb-2.5 p-2.5 rounded-xl bg-amber-100/90 border border-amber-300">
                      <div className="text-[10px] font-black text-amber-950 mb-1.5 flex items-center justify-between">
                        <span>🔢 Number Color Code</span>
                        <span className="text-[10px] text-amber-800">Tap to paint!</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {page.numberLegend.map((item) => (
                          <button
                            key={item.number}
                            type="button"
                            onClick={() => {
                              playChimeSound('pop');
                              setActiveColoringPage({
                                pageId: page.id,
                                title: `Page ${page.pageNumber}: ${page.title}`,
                                pageNumber: page.pageNumber,
                                imageUrl: page.coloredImageUrl || page.imageUrl!,
                                storyCaption: page.storyCaption,
                                secondaryCaption: page.secondaryCaption,
                                secondaryLanguage: page.secondaryLanguage || book.secondaryLanguage,
                                numberLegend: page.numberLegend,
                                activityMode: page.activityMode || book.activityMode,
                                funFactOrTip: page.funFactOrTip,
                                borderStyle: page.borderStyle || book.defaultBorderStyle || 'classic-double',
                                placedStickers: page.placedStickers || [],
                                voiceAudioUrl: page.voiceAudioUrl,
                              });
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-[11px] font-bold text-gray-800 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs"
                            title={`Number ${item.number} is ${item.colorName}`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] text-white font-black"
                              style={{ backgroundColor: item.hex }}
                            >
                              {item.number}
                            </span>
                            <span>{item.colorName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Story Caption / Rhyming Line with Audio Read Aloud */}
                  <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 mb-2.5 text-left flex items-start justify-between gap-2">
                    <motion.p
                      key={page.storyCaption}
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs text-gray-800 font-medium italic leading-relaxed line-clamp-2"
                      title={page.storyCaption}
                    >
                      "{page.storyCaption}"
                    </motion.p>
                    <button
                      type="button"
                      onClick={() => handleReadAloud(page.id, `${page.title}. ${page.storyCaption}. ${page.funFactOrTip || ''}`)}
                      className={`shrink-0 p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        speakingPageId === page.id
                          ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                          : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                      title={speakingPageId === page.id ? 'Stop reading' : '🔊 Listen to story'}
                    >
                      {speakingPageId === page.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Secondary Bilingual Story Caption */}
                  {page.secondaryCaption && (
                    <div className="p-2.5 rounded-xl bg-orange-50/80 border border-orange-200/90 mb-2.5 text-left flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider bg-orange-200 text-orange-900 px-1.5 py-0.5 rounded-sm inline-block mb-1">
                          🌐 {page.secondaryLanguage ? page.secondaryLanguage.toUpperCase() : 'BILINGUAL'}
                        </span>
                        <motion.p
                          key={page.secondaryCaption}
                          initial={{ opacity: 0.7 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="text-xs text-orange-950 font-medium italic leading-relaxed line-clamp-2"
                        >
                          "{page.secondaryCaption}"
                        </motion.p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReadAloud(`sec-${page.id}`, page.secondaryCaption!)}
                        className={`shrink-0 p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          speakingPageId === `sec-${page.id}`
                            ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                            : 'bg-white text-orange-800 border-orange-200 hover:bg-orange-100'
                        }`}
                        title={speakingPageId === `sec-${page.id}` ? 'Stop reading' : '🔊 Listen to translation'}
                      >
                        {speakingPageId === `sec-${page.id}` ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Read-Along Voice Recording & Player */}
                  {onSaveVoiceAudio && (
                    <div className="mb-2.5">
                      <VoiceRecorderWidget
                        pageNumber={page.pageNumber}
                        initialAudioUrl={page.voiceAudioUrl}
                        initialDuration={page.voiceAudioDuration}
                        onSaveAudio={(audioUrl, dur) => onSaveVoiceAudio(page.id, audioUrl, dur)}
                        onRemoveAudio={() => onSaveVoiceAudio(page.id, '', 0)}
                        compact={true}
                      />
                    </div>
                  )}

                  {/* Small Text Box: Coloring Suggestion or Fun Fact with Smooth Update Transition */}
                  <AnimatePresence mode="wait">
                    {page.funFactOrTip && (
                      <motion.div
                        key={page.funFactOrTip}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                        className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 text-left mb-2 flex items-start gap-2 shadow-2xs"
                      >
                        <span className="text-base leading-none select-none">💡</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-amber-900 block">
                            Coloring Tip & Fun Fact
                          </span>
                          <p className="text-xs text-amber-950 font-medium mt-0.5 leading-snug">
                            {page.funFactOrTip}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Digital Color Picker and Basic Drawing Canvas Tool */}
                  {page.imageUrl && (
                    <div className="mb-2.5">
                      <PageColorTesterCanvas
                        imageUrl={page.imageUrl}
                        pageTitle={page.title}
                        onOpenFullStudio={() => {
                          playChimeSound('magic');
                          setActiveColoringPage({
                            pageId: page.id,
                            title: `Page ${page.pageNumber}: ${page.title}`,
                            pageNumber: page.pageNumber,
                            imageUrl: page.imageUrl!,
                            storyCaption: page.storyCaption,
                            secondaryCaption: page.secondaryCaption,
                            secondaryLanguage: page.secondaryLanguage || book.secondaryLanguage,
                            numberLegend: page.numberLegend,
                            activityMode: page.activityMode || book.activityMode,
                            funFactOrTip: page.funFactOrTip,
                            borderStyle: page.borderStyle || book.defaultBorderStyle || 'classic-double',
                            placedStickers: page.placedStickers || [],
                            voiceAudioUrl: page.voiceAudioUrl,
                          });
                        }}
                      />
                    </div>
                  )}

                  {/* Primary Kid CTA: Color This Page Online */}
                  {page.imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        playChimeSound('magic');
                        setActiveColoringPage({
                          pageId: page.id,
                          title: `Page ${page.pageNumber}: ${page.title}`,
                          pageNumber: page.pageNumber,
                          imageUrl: page.coloredImageUrl || page.imageUrl!,
                          storyCaption: page.storyCaption,
                          secondaryCaption: page.secondaryCaption,
                          secondaryLanguage: page.secondaryLanguage || book.secondaryLanguage,
                          numberLegend: page.numberLegend,
                          activityMode: page.activityMode || book.activityMode,
                          funFactOrTip: page.funFactOrTip,
                          borderStyle: page.borderStyle || book.defaultBorderStyle || 'classic-double',
                          placedStickers: page.placedStickers || [],
                          voiceAudioUrl: page.voiceAudioUrl,
                        });
                      }}
                      className="w-full mb-3 py-2 px-3 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Paintbrush className="w-4 h-4" />
                      <span>🎨 Color This Page Online!</span>
                    </button>
                  )}

                  {/* Page Action Bar */}
                  <div className="flex items-center justify-between gap-1.5 pt-2.5 border-t border-amber-100/80 text-xs">
                    <div className="flex items-center gap-1">
                      {/* Regenerate / Retry Button */}
                      <button
                        onClick={() => handlePageRegen(page.id)}
                        disabled={isRegen}
                        title={page.status === 'error' ? 'Retry generating this page' : 'Regenerate this specific coloring page'}
                        className={`p-1.5 sm:px-2 sm:py-1 rounded-lg font-medium transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer ${
                          page.status === 'error'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegen ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{page.status === 'error' ? 'Retry' : 'Redo'}</span>
                      </button>

                      {/* Edit Scene / Prompt Button */}
                      <button
                        onClick={() => onEditPage(page)}
                        title="Customize prompt or caption"
                        className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      {/* Border Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setBorderModalTargetPage(page);
                          setIsBorderModalOpen(true);
                          playChimeSound('pop');
                        }}
                        title="Customize page border"
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-900 transition-colors cursor-pointer text-xs"
                      >
                        🖼️
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Print single page */}
                      <button
                        onClick={() => onPrintSinglePage(page)}
                        title="Print this single page"
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* Download single PNG */}
                      {page.imageUrl && (
                        <button
                          onClick={() => handleDownloadSinglePng(page.imageUrl!, `${book.childName}-page-${page.pageNumber}`)}
                          title="Download high-res PNG"
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* PRINTABLE THEMED STICKER SHEET (BONUS ACTIVITY PAGE) */}
      <section
        id="coloring-book-sticker-sheet"
        className="bg-linear-to-br from-amber-50/80 via-orange-50/50 to-yellow-50/60 rounded-3xl border border-amber-200/90 p-6 sm:p-7 shadow-sm relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8">
          {/* Sticker Preview Container with Animated Entry/Exit */}
          <div className="w-full sm:w-72 shrink-0 aspect-3/4 bg-white rounded-2xl p-2.5 shadow-md border border-amber-200 ring-4 ring-amber-100/70 relative group overflow-hidden flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {book.stickerSheet?.imageUrl ? (
                <motion.div
                  key={`sticker-${book.stickerSheet.imageUrl}`}
                  initial={{ opacity: 0, y: 14, scale: 0.96, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, scale: 0.96, filter: 'blur(2px)' }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full h-full relative flex items-center justify-center"
                >
                  <img
                    src={book.stickerSheet.imageUrl}
                    alt={book.stickerSheet.title}
                    className="w-full h-full object-contain filter contrast-125 transition-transform duration-200 group-hover:scale-101"
                  />
                  <button
                    onClick={() => setSelectedPreviewImg({ url: book.stickerSheet!.imageUrl, title: book.stickerSheet!.title })}
                    className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 font-bold text-xs rounded-2xl transition-opacity cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" /> Full View
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="sticker-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-center p-4"
                >
                  <Scissors className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-800">Printable Stickers</p>
                  <p className="text-[11px] text-gray-500 mt-1">Ready to generate cut-out badges!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Details & Actions */}
          <div className="flex-1 min-w-0 text-left space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                <Scissors className="w-3.5 h-3.5" /> Bonus Activity Page
              </span>
              <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-full">
                ✂️ Cut-Out &amp; Stick!
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-gray-900" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              {book.stickerSheet?.title || `${book.childName}'s Printable Stickers`}
            </h3>

            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-xl">
              A printable page of themed stickers, medals, and achievement badges! Children can test color combinations digitally or color them on paper, cut along the dashed guidelines with safety scissors, and stick them onto their coloring book scenes.
            </p>

            {/* Feature Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1 max-w-lg">
              <div className="bg-white/90 border border-amber-200 rounded-xl p-2 text-center text-xs font-semibold text-gray-800 shadow-2xs">
                ✂️ Dashed Cut Guides
              </div>
              <div className="bg-white/90 border border-amber-200 rounded-xl p-2 text-center text-xs font-semibold text-gray-800 shadow-2xs">
                🏅 Star Artist Medals
              </div>
              <div className="bg-white/90 border border-amber-200 rounded-xl p-2 text-center text-xs font-semibold text-gray-800 shadow-2xs">
                🎨 Ready to Color
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap pt-2">
              {book.stickerSheet?.imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    playChimeSound('magic');
                    setActiveColoringPage({
                      pageId: 'stickers',
                      title: book.stickerSheet!.title,
                      imageUrl: book.stickerSheet!.imageUrl,
                      storyCaption: `Cut along dashed lines with safety scissors and stick onto your colored pages!`,
                      funFactOrTip: `Use bold bright colors for your stickers so they pop out on your pages!`,
                    });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Paintbrush className="w-4 h-4" />
                  <span>🎨 Color Stickers Online!</span>
                </button>
              )}

              {onPrintStickerSheet && book.stickerSheet?.imageUrl && (
                <button
                  type="button"
                  onClick={onPrintStickerSheet}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-gray-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Print sticker sheet page directly"
                >
                  <Printer className="w-4 h-4 text-amber-700" />
                  <span>Print Stickers</span>
                </button>
              )}

              {book.stickerSheet?.imageUrl && (
                <button
                  type="button"
                  onClick={() => handleDownloadSinglePng(book.stickerSheet!.imageUrl, `${book.childName}-stickers`)}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-gray-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Download sticker sheet PNG"
                >
                  <Download className="w-4 h-4 text-gray-700" />
                  <span>PNG</span>
                </button>
              )}

              {onRegenerateStickers && (
                <button
                  type="button"
                  onClick={handleStickerRegen}
                  disabled={isRegeneratingStickers}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  title="Regenerate sticker designs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingStickers ? 'animate-spin' : ''}`} />
                  <span>{isRegeneratingStickers ? 'Generating...' : 'Regenerate Stickers'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const stickerIdx = (book.coverImageUrl ? 1 : 0) + book.pages.length;
                  handleNavigatePage(stickerIdx);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-amber-200/80 hover:bg-amber-300 border border-amber-400 text-amber-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Open stickers in Flip Book mode"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>📖 Flip to this Page</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BONUS ACTIVITIES & CRAFTS CENTER BANNER */}
      {onOpenActivitiesModal && (
        <section className="bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden text-left">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs">
                <Compass className="w-3.5 h-3.5 text-amber-200" />
                <span>Kid Puzzles, Science &amp; Cut-Out Crafts</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                ⭐ {book.childName}'s Bonus Activity Hub ⭐
              </h3>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                Take a fun break between coloring pages! Explore our printable themed mazes, DIY cut-out bookmarks, bedroom door hangers, color mixing lab experiments, and story word searches.
              </p>

              {/* 4 Interactive Feature Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-white/15 backdrop-blur-xs rounded-xl p-2 text-center text-xs font-bold border border-white/20">
                  🧭 Themed Maze
                </div>
                <div className="bg-white/15 backdrop-blur-xs rounded-xl p-2 text-center text-xs font-bold border border-white/20">
                  ✂️ DIY Bookmarks
                </div>
                <div className="bg-white/15 backdrop-blur-xs rounded-xl p-2 text-center text-xs font-bold border border-white/20">
                  🎨 Color Science Lab
                </div>
                <div className="bg-white/15 backdrop-blur-xs rounded-xl p-2 text-center text-xs font-bold border border-white/20">
                  🔍 Word Search
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenActivitiesModal}
                className="px-6 py-3.5 rounded-2xl bg-white hover:bg-amber-50 text-amber-950 font-black text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Compass className="w-5 h-5 text-orange-600" />
                <span>Open Activities &amp; Crafts!</span>
              </button>
              <span className="text-[11px] text-white/80 font-medium">
                100% Printable &amp; PNG Downloadable
              </span>
            </div>
          </div>
        </section>
      )}

      {/* SPECIAL INTERACTIVE FEATURES ROW: Photo-to-Line-Art & Master Certificate */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Child & Pet Photo-to-Line-Art */}
        <div className="bg-linear-to-br from-rose-50 via-pink-50/60 to-amber-50/50 rounded-3xl border border-rose-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between text-left">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Camera className="w-3 h-3" /> Child &amp; Pet Feature
              </span>
              <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                100% Local Outline Filter
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-1.5" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              Star in the Book! 📸
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-4">
              Turn a picture of {book.childName} or a beloved family pet into a crisp black-and-white coloring page! Adjust line weight, contrast, and clean borders instantly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsHeroModalOpen(true);
              playChimeSound('sparkle');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <Camera className="w-4 h-4 text-pink-200" />
            <span>Convert Photo to Line Art &amp; Add Page</span>
          </button>
        </div>

        {/* Card 2: Coloring Master Certificate of Completion */}
        <div className="bg-linear-to-br from-amber-50 via-yellow-50/60 to-orange-50/50 rounded-3xl border border-amber-300 p-5 sm:p-6 shadow-xs flex flex-col justify-between text-left">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3 h-3" /> Diploma of Achievement
              </span>
              <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">
                Printable PDF
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-1.5" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              Coloring Master Certificate 🏆
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-4">
              Award {book.childName} a personalized Certificate of Achievement for completing this {book.theme} coloring adventure! Sign and print or download as a keepsake.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCertificateModalOpen(true);
              playChimeSound('fanfare');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <Award className="w-4 h-4 text-yellow-200" />
            <span>Customize &amp; Print Award Certificate</span>
          </button>
        </div>
      </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox / Zoom Modal */}
      {selectedPreviewImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPreviewImg(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-4 border-2 border-gray-900 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
              <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-600" />
                {selectedPreviewImg.title}
              </h4>
              <button
                onClick={() => setSelectedPreviewImg(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="aspect-3/4 max-h-[70vh] bg-white border-2 border-gray-900 rounded-xl p-2 flex items-center justify-center">
              <img
                src={selectedPreviewImg.url}
                alt={selectedPreviewImg.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain filter contrast-125"
              />
            </div>

            <div className="flex items-center justify-between mt-3 pt-2">
              <span className="text-xs text-gray-500 font-medium">
                High-contrast black & white line art ready for home printing
              </span>
              <button
                onClick={() => handleDownloadSinglePng(selectedPreviewImg.url, selectedPreviewImg.title)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" /> Download PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Digital Coloring Canvas Studio Modal */}
      {activeColoringPage && (
        <DigitalColoringModal
          isOpen={Boolean(activeColoringPage)}
          onClose={() => setActiveColoringPage(null)}
          pageTitle={activeColoringPage.title}
          pageNumber={activeColoringPage.pageNumber}
          imageUrl={activeColoringPage.imageUrl}
          storyCaption={activeColoringPage.storyCaption}
          secondaryCaption={activeColoringPage.secondaryCaption}
          secondaryLanguage={activeColoringPage.secondaryLanguage}
          funFactOrTip={activeColoringPage.funFactOrTip}
          numberLegend={activeColoringPage.numberLegend}
          activityMode={activeColoringPage.activityMode}
          childName={book.childName}
          borderStyle={activeColoringPage.borderStyle}
          initialStickers={activeColoringPage.placedStickers}
          voiceAudioUrl={activeColoringPage.voiceAudioUrl}
          onSaveVoiceAudio={(audioUrl, dur) => {
            if (activeColoringPage.pageId && onSaveVoiceAudio) {
              onSaveVoiceAudio(activeColoringPage.pageId, audioUrl, dur);
            }
          }}
          onSaveArtwork={(coloredDataUrl, stickers, border) => {
            if (activeColoringPage.pageId && onSavePageArtwork) {
              onSavePageArtwork(activeColoringPage.pageId, coloredDataUrl, stickers, border);
            }
          }}
        />
      )}

      {/* Child & Pet Photo-to-Line-Art Modal */}
      <PersonalizedHeroModal
        isOpen={isHeroModalOpen}
        onClose={() => setIsHeroModalOpen(false)}
        childName={book.childName}
        theme={book.theme}
        onApplyHeroPage={(heroData) => {
          onAddHeroPage?.(heroData);
          setIsHeroModalOpen(false);
        }}
      />

      {/* Completion Diploma Certificate Modal */}
      <CertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        book={book}
        onUpdateCertificateDetails={onUpdateCertificate}
      />

      {/* Border Customization Modal */}
      <BorderSelectorModal
        isOpen={isBorderModalOpen}
        onClose={() => {
          setIsBorderModalOpen(false);
          setBorderModalTargetPage(null);
        }}
        currentBorder={
          borderModalTargetPage
            ? borderModalTargetPage.borderStyle || book.defaultBorderStyle || 'classic-double'
            : book.defaultBorderStyle || 'classic-double'
        }
        pageTitle={borderModalTargetPage ? borderModalTargetPage.title : undefined}
        pageNumber={borderModalTargetPage ? borderModalTargetPage.pageNumber : undefined}
        onSelectBorder={(border, applyToAll) => {
          if (applyToAll || !borderModalTargetPage) {
            onUpdateAllBorders?.(border);
          } else {
            onUpdatePageBorder?.(borderModalTargetPage.id, border);
          }
          setIsBorderModalOpen(false);
          setBorderModalTargetPage(null);
        }}
      />

      {/* Save to Favorites Modal */}
      <FavoritesModal
        isOpen={isFavoritesModalOpen}
        onClose={() => setIsFavoritesModalOpen(false)}
        favorites={favorites}
        onRemoveFavorite={(id) => {
          removeFavorite(id);
          setFavorites(getFavorites());
        }}
        onLoadFavorite={(fav) => {
          onLoadFavorite?.(fav);
          setIsFavoritesModalOpen(false);
        }}
      />

      {/* Side-Scrolling Film Strip Navigation Bar (Quick Jump Thumbnails) */}
      <FilmStripNav
        book={book}
        viewMode={viewMode}
        activePageIndex={safeActiveIndex}
        onSelectSlide={(idx) => {
          handleNavigatePage(idx);
        }}
        onDownloadPdf={onDownloadPdf}
        onOpenPrintPreview={onOpenPrintPreview}
        onOpenPageReorder={onOpenPageReorder}
        isPreparingPdf={isPreparingPdf}
        pdfProgress={pdfProgress}
        isPdfBtnTooltipVisible={isPdfBtnTooltipVisible}
        setIsPdfBtnTooltipVisible={setIsPdfBtnTooltipVisible}
        isBookGenerationFinished={isBookGenerationFinished}
        isGeneratingBook={isGeneratingBook}
      />
    </div>
  );
};
