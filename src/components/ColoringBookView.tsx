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
import { ColoringBook, ColoringPage, ImageResolution, FavoriteBook } from '../types';
import { DigitalColoringModal } from './DigitalColoringModal';
import { PageColorTesterCanvas } from './PageColorTesterCanvas';
import { FavoritesModal } from './FavoritesModal';
import { FlipBookReader } from './FlipBookReader';
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
}) => {
  const [selectedPreviewImg, setSelectedPreviewImg] = useState<{ url: string; title: string } | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Record<string, boolean>>({});
  const [isRegeneratingStickers, setIsRegeneratingStickers] = useState(false);
  const [speakingPageId, setSpeakingPageId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteBook[]>(() => getFavorites());
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [isSavedFavorite, setIsSavedFavorite] = useState(() => isFavorite(book.id, book.theme, book.childName));
  const [viewMode, setViewMode] = useState<'flip' | 'grid'>('flip');
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [activeColoringPage, setActiveColoringPage] = useState<{
    title: string;
    pageNumber?: number;
    imageUrl: string;
    storyCaption?: string;
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
    <div className="space-y-8">
      {/* Book Summary & Navigation Bar with Favorites Controls */}
      <div className="bg-amber-100/70 border-2 border-amber-300/80 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-[11px] font-bold uppercase tracking-wider">
              Printable Book Ready
            </span>
            <span className="text-xs text-amber-900 font-semibold">
              Format: {book.resolution} • {book.pages.length} Pages + Cover
            </span>
            {book.difficulty && (
              <span className="px-2.5 py-0.5 rounded-full bg-white border border-amber-300 text-amber-900 text-[11px] font-bold shadow-2xs">
                {book.difficulty === 'toddler'
                  ? '🖍️ Toddler: Simple Thick Lines'
                  : book.difficulty === 'intricate'
                  ? '✒️ Intricate Patterns (Ages 8+)'
                  : '🎨 Kids Standard Outlines'}
              </span>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mt-1" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            {book.title}
          </h3>
          <p className="text-xs text-gray-700 mt-0.5 italic">
            "{book.subtitle}" — {book.dedication}
          </p>
        </div>

        {/* Favorites & Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Save to Favorites Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
              isSavedFavorite
                ? 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-300'
                : 'bg-white text-gray-800 border border-amber-300 hover:bg-amber-50'
            }`}
            title={isSavedFavorite ? 'Saved in your favorites!' : 'Save theme & configuration to favorites'}
          >
            <Star className={`w-4 h-4 ${isSavedFavorite ? 'fill-yellow-200 text-yellow-100' : 'text-amber-500'}`} />
            <span>{isSavedFavorite ? '★ Favorited' : 'Save to Favorites'}</span>
          </button>

          {/* Browse Saved Favorites Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsFavoritesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-gray-800 hover:bg-amber-50 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Browse your saved favorite themes"
          >
            <Bookmark className="w-4 h-4 text-amber-600" />
            <span>My Favorites ({favorites.length})</span>
          </button>
        </div>
      </div>

      {/* View Mode Toggle: Interactive Flip Book vs Grid Overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-gray-900/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-2xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-gray-900 leading-tight" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              Coloring Book Viewer
            </h4>
            <p className="text-[11px] text-gray-600">
              {viewMode === 'flip'
                ? 'Interactive flip book reader — pages turn with 3D animation and sound effects'
                : 'All pages grid overview — browse all scenes and jump to any page'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200 self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => {
              setViewMode('flip');
              playChimeSound('pageflip');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'flip'
                ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📖 Flip Book Mode</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('grid');
              playChimeSound('pop');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>🗂️ All Pages Grid</span>
          </button>
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
          <section className="bg-white rounded-2xl border-2 border-gray-900/80 p-6 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Cover image preview */}
              <div className="w-full md:w-64 shrink-0 aspect-3/4 border-2 border-dashed border-gray-400 rounded-xl bg-white p-2 shadow-inner flex flex-col items-center justify-center relative group">
                {book.coverImageUrl ? (
                  <>
                    <img
                      src={book.coverImageUrl}
                      alt="Custom Cover Art"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-lg filter contrast-125"
                    />
                    <button
                      onClick={() => setSelectedPreviewImg({ url: book.coverImageUrl!, title: `${book.childName}'s Cover Page` })}
                      className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 font-bold text-xs rounded-xl transition-opacity"
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

              {/* Cover Details */}
              <div className="flex-1 text-left space-y-3">
                <div className="flex items-center gap-2">
                  <div className="inline-block px-3 py-1 rounded-md bg-gray-900 text-white text-xs font-bold uppercase tracking-widest">
                    ★ Cover Page ★
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePageIndex(0);
                      setViewMode('flip');
                      playChimeSound('pageflip');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>📖 Flip to this Page</span>
                  </button>
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

            {/* Actions for Cover */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
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
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>🎨 Color Cover Online!</span>
                </button>
              )}

              <button
                onClick={onRegenerateCover}
                disabled={book.coverStatus === 'generating'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${book.coverStatus === 'generating' ? 'animate-spin' : ''}`} />
                <span>{book.coverStatus === 'generating' ? 'Generating Art...' : 'Regenerate Cover Art'}</span>
              </button>

              {book.coverImageUrl && (
                <button
                  onClick={() => handleDownloadSinglePng(book.coverImageUrl!, `${book.childName}-cover-page`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Cover PNG</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* DISTINCT COLORING PAGES GRID */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {book.pages.map((page, index) => {
            const isRegen = regeneratingIds[page.id] || page.status === 'generating';

            return (
              <div
                key={page.id}
                className="bg-white rounded-2xl border-2 border-gray-800 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative group"
                id={`coloring-page-card-${index + 1}`}
              >
                {/* Page Number & Status Pill */}
                <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                  <span className="px-2.5 py-0.5 rounded-md bg-gray-900 text-white text-xs font-bold tracking-wider">
                    PAGE {page.pageNumber} OF {book.pages.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const pageSlideIdx = (book.coverImageUrl ? 1 : 0) + index;
                        setActivePageIndex(pageSlideIdx);
                        setViewMode('flip');
                        playChimeSound('pageflip');
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold transition-all cursor-pointer"
                      title="Open in Flip Book mode"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Flip</span>
                    </button>

                    {page.status === 'completed' && (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check className="w-3 h-3" /> Ready
                      </span>
                    )}
                    {page.status === 'generating' && (
                      <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Drawing...
                      </span>
                    )}
                    {page.status === 'error' && (
                      <span className="text-[11px] font-semibold text-rose-700 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        <AlertCircle className="w-3 h-3" /> Retry
                      </span>
                    )}
                  </div>
                </div>

                {/* Page Scene Title */}
                <h4 className="font-bold text-gray-900 text-base mt-2 line-clamp-1" title={page.title}>
                  {page.title}
                </h4>

                {/* Main Coloring Art Frame */}
                <div className="my-3 w-full aspect-3/4 border-2 border-gray-900 rounded-xl bg-white p-2 flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                  {page.imageUrl ? (
                    <>
                      <img
                        src={page.imageUrl}
                        alt={page.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain filter contrast-125"
                      />
                      {/* Zoom button on hover */}
                      <button
                        onClick={() => setSelectedPreviewImg({ url: page.imageUrl!, title: `Page ${page.pageNumber}: ${page.title}` })}
                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 font-bold text-xs rounded-xl transition-opacity"
                      >
                        <ZoomIn className="w-4 h-4" /> Full View
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      {isRegen ? (
                        <>
                          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-xs font-bold text-gray-800">Generating Line Art...</p>
                          <p className="text-[11px] text-gray-500">Using gemini-3-pro-image-preview</p>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-xs font-bold text-gray-800">No Image Yet</p>
                          <p className="text-[11px] text-gray-500">Click Regenerate to create art</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Story Caption / Rhyming Line with Audio Read Aloud */}
                <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 mb-2.5 text-left flex items-start justify-between gap-2">
                  <p className="text-xs text-gray-800 font-medium italic leading-relaxed line-clamp-2" title={page.storyCaption}>
                    "{page.storyCaption}"
                  </p>
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

                {/* Small Text Box: Coloring Suggestion or Fun Fact */}
                {page.funFactOrTip && (
                  <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 text-left mb-2 flex items-start gap-2 shadow-2xs">
                    <span className="text-base leading-none select-none">💡</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-amber-900 block">
                        Coloring Tip & Fun Fact
                      </span>
                      <p className="text-xs text-amber-950 font-medium mt-0.5 leading-snug">
                        {page.funFactOrTip}
                      </p>
                    </div>
                  </div>
                )}

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
                        funFactOrTip: page.funFactOrTip,
                      });
                    }}
                    className="w-full mb-3 py-2 px-3 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Paintbrush className="w-3.5 h-3.5" />
                    <span>🎨 Open Full Color Studio</span>
                  </button>
                )}

                {/* Page Action Bar */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-1">
                    {/* Regenerate Button */}
                    <button
                      onClick={() => handlePageRegen(page.id)}
                      disabled={isRegen}
                      title="Regenerate this specific coloring page"
                      className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRegen ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Redo</span>
                    </button>

                    {/* Edit Scene / Prompt Button */}
                    <button
                      onClick={() => onEditPage(page)}
                      title="Customize prompt or caption"
                      className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors flex items-center gap-1"
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
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    {/* Download single PNG */}
                    {page.imageUrl && (
                      <button
                        onClick={() => handleDownloadSinglePng(page.imageUrl!, `${book.childName}-page-${page.pageNumber}`)}
                        title="Download high-res PNG"
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PRINTABLE THEMED STICKER SHEET (BONUS ACTIVITY PAGE) */}
      <section className="bg-linear-to-br from-amber-50 via-orange-50/40 to-yellow-50 rounded-3xl border-2 border-dashed border-amber-400 p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8">
          {/* Sticker Preview Container */}
          <div className="w-full sm:w-72 shrink-0 aspect-3/4 bg-white border-2 border-dashed border-gray-800 rounded-2xl p-3 shadow-md relative group flex flex-col items-center justify-center">
            {book.stickerSheet?.imageUrl ? (
              <>
                <img
                  src={book.stickerSheet.imageUrl}
                  alt={book.stickerSheet.title}
                  className="w-full h-full object-contain filter contrast-125"
                />
                <button
                  onClick={() => setSelectedPreviewImg({ url: book.stickerSheet!.imageUrl, title: book.stickerSheet!.title })}
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
          funFactOrTip={activeColoringPage.funFactOrTip}
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
    </div>
  );
};
