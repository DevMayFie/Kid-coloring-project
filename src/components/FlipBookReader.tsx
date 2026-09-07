import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { ColoringBook, ColoringPage } from '../types';
import { playChimeSound } from '../utils/kidAudio';
import { PageColorTesterCanvas } from './PageColorTesterCanvas';

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
  funFactOrTip?: string;
  rawPage?: ColoringPage;
}

export interface FlipBookReaderProps {
  book: ColoringBook;
  activePageIndex: number;
  onPageChange: (index: number) => void;
  onOpenColorStudio: (pageData: {
    title: string;
    pageNumber?: number;
    imageUrl: string;
    storyCaption?: string;
    funFactOrTip?: string;
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
}

// 3D realistic page flip transition variants
const pageFlipVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 260 : -260,
    rotateY: direction > 0 ? 32 : -32,
    opacity: 0,
    scale: 0.94,
    transformOrigin: direction > 0 ? 'left center' : 'right center',
    boxShadow: direction > 0 ? '-24px 20px 30px rgba(0,0,0,0.18)' : '24px 20px 30px rgba(0,0,0,0.18)',
  }),
  center: {
    x: 0,
    rotateY: 0,
    opacity: 1,
    scale: 1,
    transformOrigin: 'center center',
    boxShadow: '0 10px 28px -6px rgba(0,0,0,0.12)',
    transition: {
      x: { type: 'spring', stiffness: 280, damping: 28 },
      rotateY: { duration: 0.42, ease: [0.25, 1, 0.5, 1] },
      opacity: { duration: 0.28 },
      scale: { duration: 0.3 },
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -260 : 260,
    rotateY: direction > 0 ? -32 : 32,
    opacity: 0,
    scale: 0.94,
    transformOrigin: direction > 0 ? 'right center' : 'left center',
    boxShadow: direction > 0 ? '24px 20px 30px rgba(0,0,0,0.18)' : '-24px 20px 30px rgba(0,0,0,0.18)',
    transition: {
      x: { type: 'spring', stiffness: 280, damping: 28 },
      rotateY: { duration: 0.38, ease: [0.25, 1, 0.5, 1] },
      opacity: { duration: 0.22 },
      scale: { duration: 0.25 },
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
}) => {
  const [flipDirection, setFlipDirection] = useState<number>(1);
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
    slides.push({
      id: `slide-${p.id}`,
      type: 'page',
      title: p.title,
      navLabel: `Page ${p.pageNumber}`,
      badge: `PAGE ${p.pageNumber} OF ${book.pages.length}`,
      pageNumber: p.pageNumber,
      imageUrl: p.imageUrl,
      status: p.status,
      storyCaption: p.storyCaption,
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
            className="w-full bg-white rounded-3xl border border-amber-200/80 p-4 sm:p-7 shadow-sm"
          >
            {/* 1. SLIDE: COVER PAGE */}
            {currentSlide.type === 'cover' && (
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                {/* Cover Artwork Preview */}
                <div className="w-full md:w-72 shrink-0 aspect-3/4 rounded-2xl bg-white p-2.5 shadow-md border border-amber-200 ring-4 ring-amber-100/70 flex flex-col items-center justify-center relative group overflow-hidden">
                  {book.coverImageUrl ? (
                    <>
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
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
                      <p className="text-xs font-bold text-gray-800">Cover Artwork</p>
                      <p className="text-[11px] text-gray-500">Thick-line coloring cover</p>
                    </div>
                  )}
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
                      {page.imageUrl ? (
                        <>
                          <img
                            src={page.imageUrl}
                            alt={page.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain filter contrast-125"
                          />
                          <button
                            onClick={() => onZoomImage({ url: page.imageUrl!, title: page.title })}
                            className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 font-bold text-xs rounded-xl transition-opacity cursor-pointer"
                          >
                            <ZoomIn className="w-4 h-4" /> Full View
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          {isRegen ? (
                            <>
                              <RefreshCw className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-spin" />
                              <p className="text-xs font-bold text-gray-800">Drawing Scene...</p>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs font-bold text-gray-800">No Image Yet</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Color Tester mini canvas */}
                    {page.imageUrl && (
                      <PageColorTesterCanvas
                        imageUrl={page.imageUrl}
                        pageTitle={page.title}
                        onOpenFullStudio={() => {
                          playChimeSound('magic');
                          onOpenColorStudio({
                            title: `Page ${page.pageNumber}: ${page.title}`,
                            pageNumber: page.pageNumber,
                            imageUrl: page.imageUrl!,
                            storyCaption: page.storyCaption,
                            funFactOrTip: page.funFactOrTip,
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
                            title: `Page ${page.pageNumber}: ${page.title}`,
                            pageNumber: page.pageNumber,
                            imageUrl: page.imageUrl!,
                            storyCaption: page.storyCaption,
                            funFactOrTip: page.funFactOrTip,
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
                      <span className="px-3 py-1 rounded-md bg-gray-900 text-white text-xs font-bold tracking-wider">
                        PAGE {page.pageNumber} OF {book.pages.length}
                      </span>
                      {page.status === 'completed' && (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3.5 h-3.5" /> Ready to Color
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                      {page.title}
                    </h3>

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
                          className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRegen ? 'animate-spin' : ''}`} />
                          <span>{isRegen ? 'Redrawing...' : 'Regenerate'}</span>
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
                <div className="w-full sm:w-72 shrink-0 aspect-3/4 bg-white border-2 border-dashed border-gray-800 rounded-2xl p-3 shadow-md relative group flex flex-col items-center justify-center">
                  {book.stickerSheet?.imageUrl ? (
                    <>
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
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <Scissors className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-gray-800">Printable Stickers</p>
                      <p className="text-[11px] text-gray-500 mt-1">Ready to generate cut-out badges!</p>
                    </div>
                  )}
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
