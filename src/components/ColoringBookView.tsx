import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ColoringBook, ColoringPage, ImageResolution, FavoriteBook, ActivityMode, BookLanguage, NumberLegendItem } from '../types';
import { DigitalColoringModal } from './DigitalColoringModal';
import { PageColorTesterCanvas } from './PageColorTesterCanvas';
import { FavoritesModal } from './FavoritesModal';
import { FlipBookReader } from './FlipBookReader';
import { FilmStripNav } from './FilmStripNav';
import { getFavorites, saveFavorite, removeFavorite, isFavorite } from '../utils/favoritesStorage';
import { playChimeSound, speakStory, stopSpeaking } from '../utils/kidAudio';
import confetti from 'canvas-confetti';

interface ColoringBookViewProps {
  book: ColoringBook;
  onRegeneratePage: (pageId: string, customPrompt?: string, resolution?: ImageResolution) => Promise<void>;
  onRegenerateCover: () => Promise<void>;
  onRegenerateStickers?: () => Promise<void>;
  onEditPage: (page: ColoringPage) => void;
  onPrintSinglePage: (page: ColoringPage) => void;
  onPrintStickerSheet?: () => void;
  onLoadFavorite?: (favorite: FavoriteBook) => void;
  onDownloadPdf?: () => void;
  isPreparingPdf?: boolean;
  pdfProgress?: number;
  isPdfBtnTooltipVisible?: boolean;
  setIsPdfBtnTooltipVisible?: (visible: boolean) => void;
  isBookGenerationFinished?: boolean;
  isGeneratingBook?: boolean;
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
  isPreparingPdf,
  pdfProgress,
  isPdfBtnTooltipVisible,
  setIsPdfBtnTooltipVisible,
  isBookGenerationFinished,
  isGeneratingBook,
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
  const [activeColoringPage, setActiveColoringPage] = useState<{
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
  } | null>(null);

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
      <div className="bg-linear-to-r from-amber-100/90 via-orange-50/80 to-amber-100/70 border border-amber-300/80 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider shadow-2xs">
              ✨ {book.childName}'s Storybook
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/90 border border-amber-200 text-amber-950 text-xs font-bold shadow-2xs">
              🎨 {book.pages.length} Pages + Cover
            </span>
            {book.difficulty && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/90 border border-amber-200 text-amber-900 text-xs font-bold shadow-2xs">
                {book.difficulty === 'toddler'
                  ? '🖍️ Toddler: Big Bold Lines'
                  : book.difficulty === 'intricate'
                  ? '✒️ Intricate Patterns'
                  : '🎨 Easy Kids Outlines'}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            {book.title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-700 italic">
            "{book.subtitle}" — <span className="font-medium">{book.dedication}</span>
          </p>
        </div>

        {/* View Mode Switcher & Favorites */}
        <div className="flex items-center gap-2.5 flex-wrap self-stretch lg:self-auto justify-between lg:justify-end">
          {/* Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1.5 bg-white/95 rounded-2xl border border-amber-300/80 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('grid');
                playChimeSound('pop');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400 font-black'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-amber-50'
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
          <div className="flex items-center gap-1.5">
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

      {/* 1. INTERACTIVE 3D FLIP BOOK READER (Single-page with animated page turn transitions) */}
      {viewMode === 'flip' && (
        <FlipBookReader
          book={book}
          activePageIndex={activePageIndex}
          onPageChange={setActivePageIndex}
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
        />
      )}

      {/* 2. ALL PAGES GRID OVERVIEW */}
      {viewMode === 'grid' && (
        <div className="space-y-8">
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
                  <button
                    type="button"
                    onClick={() => {
                      setActivePageIndex(0);
                      setViewMode('flip');
                      playChimeSound('pageflip');
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

                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 font-medium space-y-1">
                  <p><strong>Dedication:</strong> {book.dedication}</p>
                  <p className="text-[11px] text-amber-800">
                    <strong>Color Your Own Cover:</strong> Printed with large coloring title fonts so {book.childName} can color their own personalized book cover!
                  </p>
                </div>

                {/* Actions for Cover */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {book.coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        playChimeSound('magic');
                        setActiveColoringPage({
                          title: `${book.childName}'s Custom Cover`,
                          imageUrl: book.coverImageUrl!,
                          storyCaption: book.subtitle,
                          funFactOrTip: book.dedication,
                        });
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Paintbrush className="w-4 h-4" />
                      <span>🎨 Color Cover Online!</span>
                    </button>
                  )}

                  <button
                    onClick={onRegenerateCover}
                    disabled={book.coverStatus === 'generating'}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${book.coverStatus === 'generating' ? 'animate-spin' : ''}`} />
                    <span>{book.coverStatus === 'generating' ? 'Generating Art...' : 'Redo Cover Art'}</span>
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
                          setActivePageIndex(pageSlideIdx);
                          setViewMode('flip');
                          playChimeSound('pageflip');
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
                            src={page.imageUrl}
                            alt={page.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain filter contrast-125 rounded-lg transition-transform duration-200 group-hover:scale-101"
                          />
                          {/* Zoom button on hover */}
                          <button
                            onClick={() => setSelectedPreviewImg({ url: page.imageUrl!, title: `Page ${page.pageNumber}: ${page.title}` })}
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
                      ) : (
                        <motion.div
                          key={`empty-${page.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-center p-4"
                        >
                          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-xs font-bold text-gray-800">No Image Yet</p>
                          <p className="text-[11px] text-gray-500">Click Regenerate to create art</p>
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
                                title: `Page ${page.pageNumber}: ${page.title}`,
                                pageNumber: page.pageNumber,
                                imageUrl: page.imageUrl!,
                                storyCaption: page.storyCaption,
                                secondaryCaption: page.secondaryCaption,
                                secondaryLanguage: page.secondaryLanguage || book.secondaryLanguage,
                                numberLegend: page.numberLegend,
                                activityMode: page.activityMode || book.activityMode,
                                funFactOrTip: page.funFactOrTip,
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
                            title: `Page ${page.pageNumber}: ${page.title}`,
                            pageNumber: page.pageNumber,
                            imageUrl: page.imageUrl!,
                            storyCaption: page.storyCaption,
                            secondaryCaption: page.secondaryCaption,
                            secondaryLanguage: page.secondaryLanguage || book.secondaryLanguage,
                            numberLegend: page.numberLegend,
                            activityMode: page.activityMode || book.activityMode,
                            funFactOrTip: page.funFactOrTip,
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
                          title: `Page ${page.pageNumber}: ${page.title}`,
                          pageNumber: page.pageNumber,
                          imageUrl: page.imageUrl!,
                          storyCaption: page.storyCaption,
                          secondaryCaption: page.secondaryCaption,
                          secondaryLanguage: page.secondaryLanguage || book.secondaryLanguage,
                          numberLegend: page.numberLegend,
                          activityMode: page.activityMode || book.activityMode,
                          funFactOrTip: page.funFactOrTip,
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
                      {/* Regenerate Button */}
                      <button
                        onClick={() => handlePageRegen(page.id)}
                        disabled={isRegen}
                        title="Regenerate this specific coloring page"
                        className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-medium transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegen ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Redo</span>
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
                  setActivePageIndex(stickerIdx);
                  setViewMode('flip');
                  playChimeSound('pageflip');
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
        </div>
      )}

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
        />
      )}

      {/* Save to Favorites Modal */}
      <FavoritesModal
        isOpen={isFavoritesModalOpen}
        onClose={() => setIsFavoritesModalOpen(false)}
        onLoadBook={(fav) => {
          onLoadFavorite?.(fav);
          setIsFavoritesModalOpen(false);
        }}
        currentBookId={book.id}
      />

      {/* Side-Scrolling Film Strip Navigation Bar (Quick Jump Thumbnails) */}
      <FilmStripNav
        book={book}
        viewMode={viewMode}
        activePageIndex={activePageIndex}
        onSelectSlide={(idx) => {
          setActivePageIndex(idx);
        }}
        onDownloadPdf={onDownloadPdf}
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
