import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Film,
  Download,
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  Scissors,
  BookOpen,
} from 'lucide-react';
import { ColoringBook } from '../types';
import { playChimeSound } from '../utils/kidAudio';
import { ProgressRing } from './ProgressRing';
import { Tooltip } from './Tooltip';

export interface FilmStripItem {
  id: string;
  type: 'cover' | 'page' | 'stickers';
  label: string;
  badge: string;
  title: string;
  imageUrl?: string;
  status?: 'completed' | 'generating' | 'error';
  domId: string;
  slideIndex: number;
}

interface FilmStripNavProps {
  book: ColoringBook;
  viewMode: 'grid' | 'flip';
  activePageIndex?: number;
  onSelectSlide?: (slideIndex: number) => void;
  onDownloadPdf?: () => void;
  isPreparingPdf?: boolean;
  pdfProgress?: number;
  isPdfBtnTooltipVisible?: boolean;
  setIsPdfBtnTooltipVisible?: (visible: boolean) => void;
  isBookGenerationFinished?: boolean;
  isGeneratingBook?: boolean;
}

export const FilmStripNav: React.FC<FilmStripNavProps> = ({
  book,
  viewMode,
  activePageIndex = 0,
  onSelectSlide,
  onDownloadPdf,
  isPreparingPdf = false,
  pdfProgress = 0,
  isPdfBtnTooltipVisible = false,
  setIsPdfBtnTooltipVisible,
  isBookGenerationFinished = false,
  isGeneratingBook = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItemDomId, setActiveItemDomId] = useState<string>('coloring-book-cover-card');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const stripScrollRef = useRef<HTMLDivElement>(null);

  // Build ordered list of film strip items: Cover + Pages + Stickers
  const items: FilmStripItem[] = [];

  // 1. Cover item
  items.push({
    id: 'film-item-cover',
    type: 'cover',
    label: 'Cover',
    badge: '★ Cover',
    title: `${book.childName}'s Custom Cover`,
    imageUrl: book.coverImageUrl,
    status: book.coverStatus,
    domId: 'coloring-book-cover-card',
    slideIndex: 0,
  });

  // 2. Coloring Pages
  book.pages.forEach((page, idx) => {
    items.push({
      id: `film-item-page-${page.id}`,
      type: 'page',
      label: `Page ${page.pageNumber}`,
      badge: `P${page.pageNumber}`,
      title: `Page ${page.pageNumber}: ${page.title}`,
      imageUrl: page.imageUrl,
      status: page.status,
      domId: `coloring-page-card-${idx + 1}`,
      slideIndex: (book.coverImageUrl ? 1 : 0) + idx,
    });
  });

  // 3. Bonus Sticker Sheet (if available)
  if (book.stickerSheet) {
    items.push({
      id: 'film-item-stickers',
      type: 'stickers',
      label: 'Stickers',
      badge: '✂️ Cut-Outs',
      title: book.stickerSheet.title || 'Bonus Cut-Out Sticker Sheet',
      imageUrl: book.stickerSheet.imageUrl,
      status: book.stickerSheet.status,
      domId: 'coloring-book-sticker-sheet',
      slideIndex: (book.coverImageUrl ? 1 : 0) + book.pages.length,
    });
  }

  // Check scroll boundary state to show/hide arrow buttons
  const checkScrollBoundaries = () => {
    const el = stripScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    checkScrollBoundaries();
    const el = stripScrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScrollBoundaries, { passive: true });
    window.addEventListener('resize', checkScrollBoundaries);
    return () => {
      el.removeEventListener('scroll', checkScrollBoundaries);
      window.removeEventListener('resize', checkScrollBoundaries);
    };
  }, [items.length]);

  // IntersectionObserver to detect which page card is currently in view (Grid Mode)
  useEffect(() => {
    if (viewMode !== 'grid') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            setActiveItemDomId(entry.target.id);
          }
        });
      },
      {
        root: null,
        rootMargin: '-10% 0px -40% 0px',
        threshold: [0.3, 0.5, 0.8],
      }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.domId);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [items, viewMode]);

  // Scroll active thumbnail into view in the film strip
  useEffect(() => {
    const activeItem =
      viewMode === 'flip'
        ? items.find((it) => it.slideIndex === activePageIndex)
        : items.find((it) => it.domId === activeItemDomId);

    if (activeItem) {
      const thumbEl = document.getElementById(`thumb-${activeItem.id}`);
      if (thumbEl && stripScrollRef.current) {
        thumbEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeItemDomId, activePageIndex, viewMode]);

  // Handle clicking a thumbnail item
  const handleItemClick = (item: FilmStripItem) => {
    playChimeSound('pop');

    if (viewMode === 'flip') {
      onSelectSlide?.(item.slideIndex);
      // Scroll to the book container smoothly
      const bookContainer = document.getElementById('coloring-book-pages-container');
      if (bookContainer) {
        bookContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      setActiveItemDomId(item.domId);
      const targetEl = document.getElementById(item.domId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Flash a warm halo ring to confirm navigation landing
        targetEl.classList.add('ring-4', 'ring-amber-400', 'ring-offset-4', 'transition-all', 'duration-300');
        setTimeout(() => {
          targetEl.classList.remove('ring-4', 'ring-amber-400', 'ring-offset-4');
        }, 1500);
      }
    }
  };

  // Scroll film strip sideways with arrows
  const scrollStrip = (direction: 'left' | 'right') => {
    if (!stripScrollRef.current) return;
    const scrollAmount = direction === 'left' ? -220 : 220;
    stripScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    playChimeSound('pop');
  };

  return (
    <aside
      aria-label="Coloring Book Pages Filmstrip"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.25rem)] max-w-5xl transition-all duration-300 ease-in-out select-none"
      id="film-strip-nav-container"
    >
      {/* COLLAPSED PILL DOCK */}
      {isCollapsed ? (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(false);
              playChimeSound('sparkle');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900/95 text-white shadow-xl hover:bg-gray-800 border border-amber-400/80 transition-all transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
            title="Open Pages Filmstrip Navigation"
          >
            <Film className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold tracking-tight">
              🎞️ Pages Filmstrip ({items.length} Pages)
            </span>
            <ChevronUp className="w-4 h-4 text-amber-300 ml-1" />
          </button>
        </div>
      ) : (
        /* EXPANDED FILM STRIP DOCK */
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-amber-300 shadow-[0_10px_35px_rgba(0,0,0,0.18)] p-2 sm:p-2.5 flex flex-col gap-1.5">
          {/* Top Mini Toolbar: Title, Count, Mode Indicator & Minimize Button */}
          <div className="flex items-center justify-between px-2 pt-0.5 pb-1 border-b border-amber-100 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-amber-500 text-white shadow-2xs">
                <Film className="w-3.5 h-3.5" />
              </div>
              <span className="font-black text-gray-900 text-xs flex items-center gap-1.5" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                <span>🎞️ Quick Page Filmstrip</span>
                <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                  {items.length} Scenes
                </span>
              </span>
              <span className="hidden md:inline text-[11px] text-gray-500">
                • Click any thumbnail to jump instantly
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Optional PDF Download Button in Filmstrip for complete bottom-bar control */}
              {onDownloadPdf && (
                <div className="relative inline-flex items-center">
                  <button
                    id="bottom-download-pdf-btn"
                    disabled={isPreparingPdf}
                    onMouseEnter={() => setIsPdfBtnTooltipVisible?.(true)}
                    onMouseLeave={() => setIsPdfBtnTooltipVisible?.(false)}
                    onFocus={() => setIsPdfBtnTooltipVisible?.(true)}
                    onBlur={() => setIsPdfBtnTooltipVisible?.(false)}
                    onClick={onDownloadPdf}
                    className={`group relative overflow-hidden px-3 py-1.5 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-xs transition-all duration-200 hover:scale-102 active:scale-95 cursor-pointer disabled:opacity-90 flex items-center gap-1.5 select-none ${
                      isBookGenerationFinished && !isGeneratingBook && !isPreparingPdf
                        ? 'ring-2 ring-amber-400'
                        : ''
                    }`}
                    aria-label="Export as PDF"
                  >
                    {isPreparingPdf ? (
                      <ProgressRing
                        size={15}
                        strokeWidth={2.2}
                        progress={pdfProgress}
                        indicatorColor="#ffffff"
                        trackColor="rgba(255, 255, 255, 0.3)"
                        className="relative z-20"
                      />
                    ) : (
                      <Download className="w-3.5 h-3.5 shrink-0 relative z-20" />
                    )}
                    <span className="relative z-20 text-[11px]">
                      {isPreparingPdf ? 'Preparing PDF...' : 'Download PDF'}
                    </span>
                  </button>

                  <Tooltip
                    text="Export as PDF"
                    isVisible={isPdfBtnTooltipVisible && !isPreparingPdf}
                    shortcut="Ctrl+S"
                  />
                </div>
              )}

              {/* Minimize Strip Button */}
              <button
                type="button"
                onClick={() => {
                  setIsCollapsed(true);
                  playChimeSound('pop');
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-amber-100/70 text-[11px] font-bold transition-all cursor-pointer"
                title="Minimize filmstrip navigation"
              >
                <span>Hide</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Film Strip Track with Side Navigation Arrows */}
          <div className="relative flex items-center group">
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => scrollStrip('left')}
              disabled={!canScrollLeft}
              className={`absolute -left-1 sm:-left-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 hover:bg-amber-100 text-gray-800 border border-amber-300 shadow-md flex items-center justify-center transition-all ${
                canScrollLeft
                  ? 'opacity-100 cursor-pointer hover:scale-110 active:scale-95'
                  : 'opacity-0 pointer-events-none'
              }`}
              title="Scroll thumbnails left"
            >
              <ChevronLeft className="w-4 h-4 text-amber-900" />
            </button>

            {/* Scrollable Thumbnails Container */}
            <div
              ref={stripScrollRef}
              className="w-full overflow-x-auto scrollbar-none flex items-center gap-2 sm:gap-2.5 py-1 px-1 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <AnimatePresence mode="popLayout">
                {items.map((item, itemIdx) => {
                  const isSelected =
                    viewMode === 'flip'
                      ? item.slideIndex === activePageIndex
                      : item.domId === activeItemDomId;

                  return (
                    <motion.button
                      key={item.id}
                      id={`thumb-${item.id}`}
                      type="button"
                      layout
                      initial={{ opacity: 0, scale: 0.85, x: 12 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.85, x: -12 }}
                      transition={{ duration: 0.28, delay: Math.min(itemIdx * 0.03, 0.25) }}
                      onClick={() => handleItemClick(item)}
                      className={`shrink-0 w-16 sm:w-20 h-22 sm:h-26 rounded-xl overflow-hidden border-2 transition-all duration-200 flex flex-col justify-between p-1 cursor-pointer relative group/thumb ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/90 ring-3 ring-amber-400 shadow-md scale-105'
                          : 'border-amber-200/90 bg-white hover:border-amber-400 hover:bg-amber-50/40 opacity-90 hover:opacity-100'
                      }`}
                      title={item.title}
                    >
                      {/* Thumbnail Image Box */}
                      <div className="w-full h-14 sm:h-17 bg-white rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden relative">
                        <AnimatePresence mode="wait">
                          {item.imageUrl ? (
                            <motion.img
                              key={`thumb-img-${item.imageUrl}`}
                              src={item.imageUrl}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="w-full h-full object-contain filter contrast-125 p-0.5"
                              loading="lazy"
                            />
                          ) : (
                            <motion.div
                              key="thumb-empty"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="w-full h-full flex flex-col items-center justify-center p-1 bg-gray-50 text-gray-400"
                            >
                              {item.status === 'generating' ? (
                                <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              )}
                              <span className="text-[8px] font-bold text-gray-500 mt-0.5">
                                {item.status === 'generating' ? 'Drawing' : 'Empty'}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      {/* Small Type Icon (Cover / Stickers) */}
                      {item.type === 'stickers' && (
                        <span className="absolute top-0.5 right-0.5 p-0.5 bg-amber-500 text-white rounded-full text-[9px] shadow-2xs">
                          <Scissors className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {item.type === 'cover' && (
                        <span className="absolute top-0.5 right-0.5 p-0.5 bg-gray-900 text-white rounded-full text-[9px] shadow-2xs">
                          <BookOpen className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Bottom Label & Status Indicator */}
                    <div className="w-full flex items-center justify-between px-0.5 pt-0.5">
                      <span
                        className={`text-[9px] sm:text-[10px] font-black truncate leading-tight ${
                          isSelected ? 'text-amber-950 font-black' : 'text-gray-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                      {item.status === 'completed' && (
                        <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                      )}
                    </div>

                    {/* Active Pip Indicator */}
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white shadow-xs" />
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollStrip('right')}
              disabled={!canScrollRight}
              className={`absolute -right-1 sm:-right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 hover:bg-amber-100 text-gray-800 border border-amber-300 shadow-md flex items-center justify-center transition-all ${
                canScrollRight
                  ? 'opacity-100 cursor-pointer hover:scale-110 active:scale-95'
                  : 'opacity-0 pointer-events-none'
              }`}
              title="Scroll thumbnails right"
            >
              <ChevronRight className="w-4 h-4 text-amber-900" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
