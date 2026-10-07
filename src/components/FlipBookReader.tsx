import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  RefreshCw,
  Edit3,
  Printer,
  Volume2,
  VolumeX,
  Paintbrush,
  ZoomIn,
  Scissors,
  Check,
  AlertCircle,
  Film,
  Building2,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { ColoringBook, ColoringPage, ActivityMode, BookLanguage, NumberLegendItem, PageBorderStyle, PlacedSticker } from '../types';
import { playChimeSound } from '../utils/kidAudio';
import { PageColorTesterCanvas } from './PageColorTesterCanvas';
import { PageBorderRenderer } from './PageBorderRenderer';
import { VoiceRecorderWidget } from './VoiceRecorderWidget';

export interface FlipBookSlide {
  id: string;
  type: 'cover' | 'page' | 'stickers';
  title: string;
  navLabel: string;
  badge: string;
  pageNumber?: number;
  imageUrl?: string;
  status?: string;
  subtitle?: string;
  dedication?: string;
  storyCaption?: string;
  secondaryCaption?: string;
  secondaryLanguage?: BookLanguage;
  numberLegend?: NumberLegendItem[];
  activityMode?: ActivityMode;
  funFactOrTip?: string;
  rawPage?: ColoringPage;
}

export interface FlipBookReaderProps {
  book: ColoringBook;
  activePageIndex: number;
  onPageChange: (index: number) => void;
  onOpenColorStudio: (pageData: {
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
    borderStyle?: PageBorderStyle;
    placedStickers?: PlacedSticker[];
    voiceAudioUrl?: string;
    slideIndex?: number;
  }) => void;
  onZoomImage: (image: { url: string; title: string }) => void;
  onRegenerateCover: () => void;
  onRegeneratePage: (pageId: string) => void;
  onEditPage: (page: ColoringPage) => void;
  onPrintSinglePage: (page: ColoringPage) => void;
  onPrintStickerSheet?: () => void;
  onRegenerateStickers?: () => Promise<void>;
  regeneratingIds: Record<string, boolean>;
  speakingPageId: string | null;
  onReadAloud: (pageId: string, text: string) => void;
  onSaveVoiceAudio?: (pageId: string, audioUrl: string, duration: number) => void;
}

// Subtle, realistic 3D paper page-flip transition variants
const pageFlipVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 32 : -32,
    rotateY: direction > 0 ? 15 : -15,
    skewY: direction > 0 ? -0.7 : 0.7,
    opacity: 0,
    scale: 0.985,
    transformOrigin: direction > 0 ? 'left center' : 'right center',
    boxShadow:
      direction > 0
        ? '-14px 10px 24px -6px rgba(0,0,0,0.12), inset 8px 0 16px -8px rgba(0,0,0,0.05)'
        : '14px 10px 24px -6px rgba(0,0,0,0.12), inset -8px 0 16px -8px rgba(0,0,0,0.05)',
  }),
  center: {
    x: 0,
    rotateY: 0,
    skewY: 0,
    opacity: 1,
    scale: 1,
    transformOrigin: 'center center',
    boxShadow: '0 10px 28px -6px rgba(0,0,0,0.10)',
    transition: {
      x: { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 },
      rotateY: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      skewY: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      opacity: { duration: 0.22 },
      scale: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -32 : 32,
    rotateY: direction > 0 ? -18 : 18,
    skewY: direction > 0 ? 0.7 : -0.7,
    opacity: 0,
    scale: 0.98,
    transformOrigin: direction > 0 ? 'right center' : 'left center',
    boxShadow:
      direction > 0
        ? '14px 10px 24px -6px rgba(0,0,0,0.12), inset -8px 0 16px -8px rgba(0,0,0,0.05)'
        : '-14px 10px 24px -6px rgba(0,0,0,0.12), inset 8px 0 16px -8px rgba(0,0,0,0.05)',
    transition: {
      x: { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 },
      rotateY: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
      skewY: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
      opacity: { duration: 0.18 },
      scale: { duration: 0.26 },
    },
  }),
};

export const FlipBookReader: React.FC<FlipBookReaderProps> = ({
  book,
  activePageIndex,
  onPageChange,
  onOpenColorStudio,
  onZoomImage,
  onRegenerateCover,
  onRegeneratePage,
  onEditPage,
  onPrintSinglePage,
  onPrintStickerSheet,
  onRegenerateStickers,
  regeneratingIds,
  speakingPageId,
  onReadAloud,
  onSaveVoiceAudio,
}) => {
  const [flipDirection, setFlipDirection] = useState<number>(1);
  const prevActiveIndexRef = useRef<number>(activePageIndex);

  // Sync flipDirection when activePageIndex changes externally
  useEffect(() => {
    if (activePageIndex !== prevActiveIndexRef.current) {
      setFlipDirection(activePageIndex > prevActiveIndexRef.current ? 1 : -1);
      prevActiveIndexRef.current = activePageIndex;
    }
  }, [activePageIndex]);

  const [isRegeneratingStickers, setIsRegeneratingStickers] = useState(false);

  // Compile sequential book slides (Cover -> Story Pages -> Bonus Stickers)
  const slides: FlipBookSlide[] = [];

  if (book.coverImageUrl || book.coverStatus) {
    slides.push({
      id: 'slide-cover',
      type: 'cover',
      title: `${book.childName}'s Custom Cover`,
      navLabel: 'Cover',
      badge: '★ Book Cover ★',
      imageUrl: book.coverImageUrl,
      status: book.coverStatus,
      subtitle: book.subtitle,
      dedication: book.dedication,
      storyCaption: book.subtitle,
      funFactOrTip: book.dedication,
    });
  }

  book.pages.forEach((p) => {
    const pageMode = p.activityMode || book.activityMode;
    const modeBadge =
      pageMode === 'color-by-numbers'
        ? '🔢 Color by Numbers'
        : pageMode === 'dot-to-dot'
        ? '✏️ Connect the Dots'
        : `PAGE ${p.pageNumber} OF ${book.pages.length}`;

    slides.push({
      id: `slide-${p.id}`,
      type: 'page',
      title: p.title,
      navLabel: `Page ${p.pageNumber}`,
      badge: modeBadge,
      pageNumber: p.pageNumber,
      imageUrl: p.coloredImageUrl || p.imageUrl,
      status: p.status,
      storyCaption: p.storyCaption,
      secondaryCaption: p.secondaryCaption,
      secondaryLanguage: p.secondaryLanguage || book.secondaryLanguage,
      numberLegend: p.numberLegend,
      activityMode: pageMode,
      funFactOrTip: p.funFactOrTip,
      rawPage: p,
    });
  });

  if (book.stickerSheet?.imageUrl || book.stickerSheet?.status) {
    slides.push({
      id: 'slide-stickers',
      type: 'stickers',
      title: book.stickerSheet?.title || `${book.childName}'s Printable Stickers`,
      navLabel: 'Stickers',
      badge: '✂️ Bonus Stickers',
      imageUrl: book.stickerSheet?.imageUrl,
      status: book.stickerSheet?.status,
      storyCaption: 'Cut along dashed lines with safety scissors and stick onto your colored pages!',
      funFactOrTip: 'Use bold bright colors for your stickers so they pop out on your pages!',
    });
  }

  const safeIndex = Math.max(0, Math.min(activePageIndex, slides.length - 1));
  const currentSlide = slides[safeIndex] || slides[0];
  const prevSlide = safeIndex > 0 ? slides[safeIndex - 1] : null;
  const nextSlide = safeIndex < slides.length - 1 ? slides[safeIndex + 1] : null;

  const handleGoTo = (newIndex: number) => {
    if (newIndex === safeIndex || newIndex < 0 || newIndex >= slides.length) return;
    setFlipDirection(newIndex > safeIndex ? 1 : -1);
    onPageChange(newIndex);
    playChimeSound('pageflip');
  };

  // Keyboard navigation for realistic book reading (Left/Right Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight' && safeIndex < slides.length - 1) {
        handleGoTo(safeIndex + 1);
      } else if (e.key === 'ArrowLeft' && safeIndex > 0) {
        handleGoTo(safeIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeIndex, slides.length]);

  const handleDownloadSinglePng = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${filename.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Film Strip thumbnail navigation state and handlers
  const filmStripScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollStripLeft, setCanScrollStripLeft] = useState(false);
  const [canScrollStripRight, setCanScrollStripRight] = useState(false);

  const checkStripScroll = () => {
    const el = filmStripScrollRef.current;
    if (!el) return;
    setCanScrollStripLeft(el.scrollLeft > 6);
    setCanScrollStripRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  };

  useEffect(() => {
    checkStripScroll();
    const el = filmStripScrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkStripScroll, { passive: true });
    window.addEventListener('resize', checkStripScroll);
    return () => {
      el.removeEventListener('scroll', checkStripScroll);
      window.removeEventListener('resize', checkStripScroll);
    };
  }, [slides.length]);

  const scrollFilmStrip = (direction: 'left' | 'right') => {
    if (!filmStripScrollRef.current) return;
    const distance = direction === 'left' ? -220 : 220;
    filmStripScrollRef.current.scrollBy({ left: distance, behavior: 'smooth' });
    playChimeSound('pop');
  };

  // Keep active thumbnail centered in film strip
  useEffect(() => {
    const el = document.getElementById(`reader-film-thumb-${safeIndex}`);
    if (el && filmStripScrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [safeIndex]);

  return (
    <div className="space-y-4">
      {/* Clean, Whimsical Storybook Reading Ribbon */}
      <div className="bg-linear-to-r from-amber-100/90 via-orange-50/80 to-amber-100/80 border border-amber-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleGoTo(safeIndex - 1)}
            disabled={safeIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4 text-amber-700" />
            <span>Prev Page</span>
          </button>

          <button
            type="button"
            onClick={() => handleGoTo(safeIndex + 1)}
            disabled={safeIndex === slides.length - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
          >
            <span>Next Page</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Current Slide Info */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-xs font-black uppercase tracking-wider shadow-2xs">
              {currentSlide.navLabel}
            </span>
            <span className="text-xs text-amber-900 font-bold">
              Page {safeIndex + 1} of {slides.length}
            </span>
          </div>
          <p className="text-xs text-gray-700 mt-0.5 truncate max-w-xs sm:max-w-md font-semibold">
            {currentSlide.title}
          </p>
        </div>

        {/* Quick Slide Dots Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
          {slides.map((slide, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => handleGoTo(idx)}
                className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400 scale-110'
                    : 'bg-white hover:bg-amber-100 text-gray-700 border border-amber-200'
                }`}
                title={slide.title}
              >
                {slide.type === 'cover' ? '📕' : slide.type === 'stickers' ? '✂️' : idx}
              </button>
            );
          })}
        </div>
      </div>

      {/* PARENT CONTAINER WITH ANIMATED PAGE FLIP TRANSITIONS */}
      <div
        id="coloring-book-pages-container"
        className="relative w-full rounded-3xl bg-linear-to-b from-amber-50/50 via-white to-orange-50/40 p-4 sm:p-7 border border-amber-200/90 shadow-lg overflow-hidden select-none"
        style={{ perspective: 1400 }}
      >
        {/* Floating Left Turn Arrow Button */}
        <button
          type="button"
          onClick={() => handleGoTo(safeIndex - 1)}
          disabled={safeIndex === 0}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 hover:bg-amber-50 border border-amber-300 shadow-md flex items-center justify-center text-amber-900 transition-all hover:scale-110 active:scale-95 disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
          title="Flip to Previous Page (←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Floating Right Turn Arrow Button */}
        <button
          type="button"
          onClick={() => handleGoTo(safeIndex + 1)}
          disabled={safeIndex === slides.length - 1}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 hover:bg-amber-50 border border-amber-300 shadow-md flex items-center justify-center text-amber-900 transition-all hover:scale-110 active:scale-95 disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
          title="Flip to Next Page (→)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* AnimatePresence for Page Flip Transition */}
        <AnimatePresence mode="wait" custom={flipDirection}>
          <motion.div
            key={currentSlide.id}
            custom={flipDirection}
            variants={pageFlipVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ transformStyle: 'preserve-3d' }}
            className="w-full bg-white rounded-3xl border border-amber-200/80 p-4 sm:p-7 shadow-sm relative overflow-hidden"
          >
            {/* Subtle Paper Flip Light Curl Sheen */}
            <motion.div
              key={`page-sheen-${currentSlide.id}`}
              initial={{ opacity: 0.18, x: flipDirection > 0 ? -30 : 30 }}
              animate={{ opacity: 0, x: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="absolute inset-0 pointer-events-none rounded-3xl bg-linear-to-r from-transparent via-amber-200/20 to-transparent z-10"
            />
            {/* 1. SLIDE: COVER PAGE */}
            {currentSlide.type === 'cover' && (
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                {/* Cover Artwork Preview with Animated Entry/Exit */}
                <div className="w-full md:w-72 shrink-0 aspect-3/4 rounded-2xl bg-white p-2.5 shadow-md border border-amber-200 ring-4 ring-amber-100/70 flex flex-col items-center justify-center relative group overflow-hidden">
                  <AnimatePresence mode="wait">
                    {book.coverImageUrl ? (
                      <motion.div
                        key={`cover-${book.coverImageUrl}`}
                        initial={{ opacity: 0, y: 12, scale: 0.96, filter: 'blur(3px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -12, scale: 0.96, filter: 'blur(2px)' }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full h-full relative flex items-center justify-center"
                      >
                        <img
                          src={book.coverImageUrl}
                          alt="Custom Cover Art"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain rounded-xl filter contrast-125"
                        />
                        <button
                          onClick={() => onZoomImage({ url: book.coverImageUrl!, title: `${book.childName}'s Cover Page` })}
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 font-bold text-xs rounded-xl transition-opacity cursor-pointer"
                        >
                          <ZoomIn className="w-4 h-4" /> Fullscreen Preview
                        </button>
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

                {/* Cover Details & Actions */}
                <div className="flex-1 text-left space-y-3.5">
                  <div className="inline-block px-3 py-1 rounded-full bg-amber-600 text-white text-xs font-black uppercase tracking-wider shadow-2xs">
                    ★ Book Cover ★
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                    {book.childName}'S {book.theme} COLORING BOOK
                  </h2>

                  <p className="text-sm font-medium text-gray-600">
                    {book.subtitle}
                  </p>

                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 font-medium space-y-1">
                    <p><strong>Dedication:</strong> {book.dedication}</p>
                    <p className="text-[11px] text-amber-800">
                      <strong>Color Your Own Cover:</strong> Printed with large coloring title fonts so {book.childName} can color their own book cover!
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
                          <span className="max-w-[130px] truncate">
                            {book.brandIntegration.websiteUrl.replace(/^https?:\/\//, '')}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    {book.coverImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          playChimeSound('magic');
                          onOpenColorStudio({
                            title: `${book.childName}'s Custom Cover`,
                            imageUrl: book.coverImageUrl!,
                            storyCaption: book.subtitle,
                            funFactOrTip: book.dedication,
                            slideIndex: safeIndex,
                          });
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Paintbrush className="w-4 h-4" />
                        <span>🎨 Color Cover Online!</span>
                      </button>
                    )}

                    <button
                      onClick={onRegenerateCover}
                      disabled={book.coverStatus === 'generating'}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${book.coverStatus === 'generating' ? 'animate-spin' : ''}`} />
                      <span>{book.coverStatus === 'generating' ? 'Generating Art...' : 'Regenerate Cover Art'}</span>
                    </button>

                    {book.coverImageUrl && (
                      <button
                        onClick={() => handleDownloadSinglePng(book.coverImageUrl!, `${book.childName}-cover-page`)}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PNG</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. SLIDE: COLORING PAGE */}
            {currentSlide.type === 'page' && currentSlide.rawPage && (() => {
              const page = currentSlide.rawPage;
              const isRegen = regeneratingIds[page.id] || page.status === 'generating';

              return (
                <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
                  {/* Left: Line Art + Color Tester + Studio CTA */}
                  <div className="w-full lg:w-96 shrink-0 flex flex-col gap-3">
                    <div className="w-full aspect-3/4 bg-white rounded-2xl p-2.5 shadow-md border border-amber-200 ring-4 ring-amber-100/70 relative group overflow-hidden flex flex-col items-center justify-center">
                      <AnimatePresence mode="wait">
                        {page.imageUrl && !isRegen ? (
                          <motion.div
                            key={`page-img-${page.imageUrl}`}
                            initial={{ opacity: 0, y: 12, scale: 0.96, filter: 'blur(3px)' }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -12, scale: 0.96, filter: 'blur(2px)' }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full h-full relative flex items-center justify-center"
                          >
                            <img
                              src={page.imageUrl}
                              alt={page.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain filter contrast-125"
                            />

                            {/* Customizable Page Border Overlay */}
                            <div className="absolute inset-0 pointer-events-none">
                              <PageBorderRenderer
                                borderStyle={
                                  page.borderStyle || book.defaultBorderStyle || 'classic-double'
                                }
                              />
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
                                className="absolute bottom-2 right-2 bg-white/90 border border-gray-300 rounded-md px-1.5 py-0.5 text-[9px] font-black text-gray-700 shadow-2xs z-10 select-none flex items-center gap-1"
                                title="QR Code for audio read-along included on printouts"
                              >
                                <span>📱</span>
                                <span>QR Audio</span>
                              </div>
                            )}

                            <button
                              onClick={() => onZoomImage({ url: page.imageUrl!, title: page.title })}
                              className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 font-bold text-xs rounded-xl transition-opacity cursor-pointer z-20"
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
                              <p className="text-xs font-bold text-gray-800">Drawing Scene...</p>
                              <p className="text-[11px] text-gray-500">Creating line art outlines</p>
                            </div>
                          </motion.div>
                        ) : page.status === 'error' ? (
                          <motion.div
                            key={`error-${page.id}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center p-5 flex flex-col items-center justify-center gap-2 max-w-xs mx-auto"
                          >
                            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-1">
                              <AlertCircle className="w-7 h-7" />
                            </div>
                            <p className="text-sm font-bold text-gray-900">Drawing Incomplete</p>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {page.errorMessage || 'Could not generate this page image.'}
                            </p>
                            <button
                              type="button"
                              onClick={() => onRegeneratePage(page.id)}
                              className="mt-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer transition-all"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Retry Drawing Page</span>
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
                            <AlertCircle className="w-8 h-8 text-gray-400 mb-1" />
                            <p className="text-xs font-bold text-gray-800">No Image Yet</p>
                            <button
                              type="button"
                              onClick={() => onRegeneratePage(page.id)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                            >
                              Draw This Page
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Quick Color Tester mini canvas */}
                    {page.imageUrl && (
                      <PageColorTesterCanvas
                        imageUrl={page.imageUrl}
                        pageTitle={page.title}
                        onOpenFullStudio={() => {
                          playChimeSound('magic');
                          onOpenColorStudio({
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
                            slideIndex: safeIndex,
                          });
                        }}
                      />
                    )}

                    {/* Open Full Color Studio Button */}
                    {page.imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          playChimeSound('magic');
                          onOpenColorStudio({
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
                            slideIndex: safeIndex,
                          });
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Paintbrush className="w-4 h-4" />
                        <span>🎨 Open Full Color Studio</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Scene Story, Tips, Action Bar */}
                  <div className="flex-1 min-w-0 text-left space-y-4 w-full">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-md bg-gray-900 text-white text-xs font-bold tracking-wider">
                          PAGE {page.pageNumber} OF {book.pages.length}
                        </span>
                        {page.activityMode === 'color-by-numbers' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-black">
                            🔢 Color by Numbers
                          </span>
                        )}
                        {page.activityMode === 'dot-to-dot' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-sky-500 text-white text-xs font-black">
                            ✏️ Dot-to-Dot
                          </span>
                        )}
                      </div>
                      {page.status === 'completed' && (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3.5 h-3.5" /> Ready to Color
                        </span>
                      )}
                      {page.status === 'error' && !isRegen && (
                        <span className="text-xs font-semibold text-rose-700 flex items-center gap-1 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5" /> Generation Failed
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                      {page.title}
                    </h3>

                    {/* Activity Mode Interactive Legend */}
                    {page.activityMode === 'color-by-numbers' && page.numberLegend && page.numberLegend.length > 0 && (
                      <div className="p-3 rounded-2xl bg-amber-100/90 border border-amber-300 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                            🔢 Color By Numbers Legend
                          </span>
                          <span className="text-[11px] font-semibold text-amber-800">
                            Click to color in Studio!
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {page.numberLegend.map((item) => (
                            <button
                              key={item.number}
                              type="button"
                              onClick={() => {
                                playChimeSound('pop');
                                onOpenColorStudio({
                                  title: `Page ${page.pageNumber}: ${page.title}`,
                                  pageNumber: page.pageNumber,
                                  imageUrl: page.imageUrl!,
                                  storyCaption: page.storyCaption,
                                  secondaryCaption: page.secondaryCaption,
                                  secondaryLanguage: page.secondaryLanguage,
                                  numberLegend: page.numberLegend,
                                  activityMode: page.activityMode,
                                  funFactOrTip: page.funFactOrTip,
                                  slideIndex: safeIndex,
                                });
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-amber-300 shadow-2xs text-xs font-bold text-gray-800 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                              title={`Color ${item.number}: ${item.colorName}`}
                            >
                              <span
                                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-black shadow-2xs"
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

                    {page.activityMode === 'dot-to-dot' && (
                      <div className="p-3 rounded-2xl bg-sky-50 border border-sky-300 shadow-2xs flex items-center gap-2.5">
                        <span className="text-2xl select-none">✏️</span>
                        <div>
                          <p className="text-xs font-black text-sky-950">Dot-to-Dot Puzzle</p>
                          <p className="text-[11px] text-sky-800">Connect the numbered dots in sequence from 1 to complete the picture outline!</p>
                        </div>
                      </div>
                    )}

                    {/* Story Caption with Audio Read Aloud */}
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-left flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-800 font-medium italic leading-relaxed">
                        "{page.storyCaption}"
                      </p>
                      <button
                        type="button"
                        onClick={() => onReadAloud(page.id, `${page.title}. ${page.storyCaption}. ${page.funFactOrTip || ''}`)}
                        className={`shrink-0 p-2 rounded-xl border transition-colors cursor-pointer ${
                          speakingPageId === page.id
                            ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                            : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-100'
                        }`}
                        title={speakingPageId === page.id ? 'Stop reading' : '🔊 Listen to story'}
                      >
                        {speakingPageId === page.id ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Read-Along Voice Narration Widget */}
                    {onSaveVoiceAudio && (
                      <div className="pt-0.5">
                        <VoiceRecorderWidget
                          pageNumber={page.pageNumber}
                          initialAudioUrl={page.voiceAudioUrl}
                          initialDuration={page.voiceAudioDuration}
                          onSaveAudio={(audioUrl, dur) => onSaveVoiceAudio(page.id, audioUrl, dur)}
                          onRemoveAudio={() => onSaveVoiceAudio(page.id, '', 0)}
                        />
                      </div>
                    )}

                    {/* Secondary Bilingual Caption */}
                    {page.secondaryCaption && (
                      <div className="p-3 rounded-2xl bg-orange-50/80 border border-orange-200 text-left flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-orange-200 text-orange-900 px-2 py-0.5 rounded-md">
                              🌐 {page.secondaryLanguage ? page.secondaryLanguage.toUpperCase() : 'BILINGUAL'}
                            </span>
                            <span className="text-xs text-orange-950 font-bold">Story Translation</span>
                          </div>
                          <p className="text-sm text-orange-950 font-medium italic leading-relaxed">
                            "{page.secondaryCaption}"
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onReadAloud(`sec-${page.id}`, page.secondaryCaption!)}
                          className={`shrink-0 p-2 rounded-xl border transition-colors cursor-pointer ${
                            speakingPageId === `sec-${page.id}`
                              ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                              : 'bg-white text-orange-800 border-orange-200 hover:bg-orange-100'
                          }`}
                          title={speakingPageId === `sec-${page.id}` ? 'Stop reading' : '🔊 Listen to translation'}
                        >
                          {speakingPageId === `sec-${page.id}` ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      </div>
                    )}

                    {/* Coloring Tip & Fun Fact */}
                    {page.funFactOrTip && (
                      <div className="p-3.5 rounded-2xl bg-amber-100/70 border border-amber-300 text-left flex items-start gap-2.5 shadow-2xs">
                        <span className="text-xl leading-none select-none">💡</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs uppercase tracking-wider text-amber-900 block">
                            Coloring Tip &amp; Fun Fact
                          </span>
                          <p className="text-xs sm:text-sm text-amber-950 font-medium mt-1 leading-snug">
                            {page.funFactOrTip}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Page Action Controls */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onRegeneratePage(page.id)}
                          disabled={isRegen}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors ${
                            page.status === 'error'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRegen ? 'animate-spin' : ''}`} />
                          <span>{isRegen ? 'Redrawing...' : page.status === 'error' ? 'Retry Drawing' : 'Regenerate'}</span>
                        </button>

                        <button
                          onClick={() => onEditPage(page)}
                          className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Scene</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onPrintSinglePage(page)}
                          className="px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Print this single page"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Page</span>
                        </button>

                        {page.imageUrl && (
                          <button
                            onClick={() => handleDownloadSinglePng(page.imageUrl!, `${book.childName}-page-${page.pageNumber}`)}
                            className="px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Download high-res PNG"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PNG</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. SLIDE: BONUS STICKERS */}
            {currentSlide.type === 'stickers' && (
              <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8">
                <div className="w-full sm:w-72 shrink-0 aspect-3/4 bg-white border-2 border-dashed border-gray-800 rounded-2xl p-3 shadow-md relative group flex flex-col items-center justify-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    {book.stickerSheet?.imageUrl ? (
                      <motion.div
                        key={`stickers-img-${book.stickerSheet.imageUrl}`}
                        initial={{ opacity: 0, y: 12, scale: 0.96, filter: 'blur(3px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -12, scale: 0.96, filter: 'blur(2px)' }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full h-full relative flex items-center justify-center"
                      >
                        <img
                          src={book.stickerSheet.imageUrl}
                          alt={book.stickerSheet.title}
                          className="w-full h-full object-contain filter contrast-125"
                        />
                        <button
                          onClick={() => onZoomImage({ url: book.stickerSheet!.imageUrl, title: book.stickerSheet!.title })}
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 font-bold text-xs rounded-2xl transition-opacity cursor-pointer"
                        >
                          <ZoomIn className="w-4 h-4" /> Full View
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="stickers-empty"
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

                  <div className="flex items-center gap-2.5 flex-wrap pt-2">
                    {book.stickerSheet?.imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          playChimeSound('magic');
                          onOpenColorStudio({
                            title: book.stickerSheet!.title,
                            imageUrl: book.stickerSheet!.imageUrl,
                            storyCaption: `Cut along dashed lines with safety scissors and stick onto your colored pages!`,
                            funFactOrTip: `Use bold bright colors for your stickers so they pop out on your pages!`,
                            slideIndex: safeIndex,
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
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingStickers ? 'animate-spin' : ''}`} />
                        <span>{isRegeneratingStickers ? 'Generating...' : 'Regenerate Stickers'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* SECONDARY FILM STRIP NAVIGATION COMPONENT: THUMBNAIL PREVIEWS OF ALL BOOK PAGES */}
      <nav
        aria-label="Book Pages Filmstrip"
        className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-amber-300/90 shadow-sm p-2.5 sm:p-3 space-y-2 select-none"
      >
        {/* Film Strip Header: Title, Count, and Scroll Controls */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-500 text-white shadow-2xs">
              <Film className="w-3.5 h-3.5" />
            </div>
            <span
              className="font-black text-gray-900 text-xs flex items-center gap-1.5"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              <span>Film Strip Navigation</span>
              <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                {slides.length} Pages
              </span>
            </span>
            <span className="hidden md:inline text-[11px] text-gray-500 font-medium">
              • Quick jump between pages with instant thumbnail preview
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg hidden sm:inline">
              Selected: {currentSlide.navLabel}
            </span>
            <button
              type="button"
              onClick={() => scrollFilmStrip('left')}
              disabled={!canScrollStripLeft}
              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-amber-100 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
              title="Scroll thumbnails left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollFilmStrip('right')}
              disabled={!canScrollStripRight}
              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-amber-100 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
              title="Scroll thumbnails right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Film Strip Thumbnail Track */}
        <div
          ref={filmStripScrollRef}
          onScroll={checkStripScroll}
          className="w-full overflow-x-auto flex items-center gap-2 sm:gap-2.5 py-1 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          {slides.map((slide, sIdx) => {
            const isActive = sIdx === safeIndex;
            return (
              <button
                key={`film-${slide.id}`}
                id={`reader-film-thumb-${sIdx}`}
                type="button"
                onClick={() => handleGoTo(sIdx)}
                className={`group shrink-0 w-20 sm:w-24 h-26 sm:h-30 rounded-xl border-2 p-1.5 flex flex-col justify-between transition-all duration-200 cursor-pointer text-left relative ${
                  isActive
                    ? 'border-amber-500 bg-amber-50/95 ring-3 ring-amber-400 shadow-md scale-102 font-bold'
                    : 'border-amber-200/80 bg-white hover:border-amber-400 hover:bg-amber-50/40 opacity-85 hover:opacity-100'
                }`}
                title={`Jump to ${slide.navLabel}: ${slide.title}`}
              >
                {/* Thumbnail Art Frame */}
                <div className="w-full h-16 sm:h-19 bg-white rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden relative shadow-2xs">
                  {slide.imageUrl ? (
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain filter contrast-125 p-0.5 transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-[10px] text-gray-400 font-bold flex flex-col items-center">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500 mb-1" />
                      <span>Art</span>
                    </div>
                  )}

                  {/* Mode / Type Mini Chip */}
                  <div className="absolute top-1 left-1">
                    <span className="px-1 py-0.2 rounded text-[9px] font-black uppercase tracking-tight bg-gray-900/80 text-white">
                      {slide.type === 'cover' ? 'Cover' : slide.type === 'stickers' ? 'Stickers' : `P${slide.pageNumber}`}
                    </span>
                  </div>

                  {isActive && (
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white shadow-xs" />
                  )}
                </div>

                {/* Thumbnail Label */}
                <div className="pt-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] font-extrabold text-gray-900 truncate">
                    <span>{slide.navLabel}</span>
                    {slide.activityMode === 'color-by-numbers' && (
                      <span className="text-[9px] text-amber-700">🔢</span>
                    )}
                    {slide.activityMode === 'dot-to-dot' && (
                      <span className="text-[9px] text-sky-700">✏️</span>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-500 truncate mt-0.2">
                    {slide.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Navigation Bar with Quick Slide Titles & Keyboard Tip */}
      <div className="bg-white rounded-2xl border-2 border-gray-900/80 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <button
          type="button"
          onClick={() => handleGoTo(safeIndex - 1)}
          disabled={safeIndex === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-800 hover:bg-amber-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto justify-center sm:justify-start"
        >
          <ChevronLeft className="w-4 h-4 text-amber-600" />
          <span className="truncate max-w-[140px] sm:max-w-[200px]">
            {prevSlide ? `Prev: ${prevSlide.navLabel}` : 'Beginning of Book'}
          </span>
        </button>

        <div className="text-center text-[11px] text-gray-500 font-medium">
          💡 Tip: Use keyboard <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-800 font-bold">←</kbd> and <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-800 font-bold">→</kbd> arrows to flip pages!
        </div>

        <button
          type="button"
          onClick={() => handleGoTo(safeIndex + 1)}
          disabled={safeIndex === slides.length - 1}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-800 hover:bg-amber-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto justify-center sm:justify-end"
        >
          <span className="truncate max-w-[140px] sm:max-w-[200px]">
            {nextSlide ? `Next: ${nextSlide.navLabel}` : 'End of Book'}
          </span>
          <ChevronRight className="w-4 h-4 text-amber-600" />
        </button>
      </div>
    </div>
  );
};
