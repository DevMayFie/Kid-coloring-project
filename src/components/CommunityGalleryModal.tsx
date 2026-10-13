import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Heart,
  Download,
  Share2,
  Sparkles,
  BookOpen,
  Upload,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  fetchCommunityBooks,
  likeCommunityBook,
  recordCommunityBookDownload,
  convertCommunityBookToColoringBook,
  publishBookToCommunity,
  PublishedCommunityBook,
} from '../utils/communityBooksService';
import { ColoringBook } from '../types';
import { playChimeSound } from '../utils/kidAudio';
import confetti from 'canvas-confetti';

interface CommunityGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBook: ColoringBook;
  onLoadBook: (book: ColoringBook) => void;
  onOpenImportModal: () => void;
}

export const CommunityGalleryModal: React.FC<CommunityGalleryModalProps> = ({
  isOpen,
  onClose,
  currentBook,
  onLoadBook,
  onOpenImportModal,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'publish'>('browse');
  const [books, setBooks] = useState<PublishedCommunityBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [likedBookIds, setLikedBookIds] = useState<Record<string, boolean>>({});

  // Publishing state
  const [authorName, setAuthorName] = useState('Parent & Artist');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGallery();
    }
  }, [isOpen]);

  const loadGallery = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCommunityBooks();
      setBooks(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (likedBookIds[bookId]) return;

    setLikedBookIds((prev) => ({ ...prev, [bookId]: true }));
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, likesCount: b.likesCount + 1 } : b))
    );

    playChimeSound('sparkle');
    try {
      await likeCommunityBook(bookId);
    } catch {
      // Non-fatal
    }
  };

  const handleSelectBook = async (item: PublishedCommunityBook) => {
    recordCommunityBookDownload(item.id);
    const loadedBook = convertCommunityBookToColoringBook(item, currentBook.childName || 'Little Artist');
    playChimeSound('fanfare');
    onLoadBook(loadedBook);
    onClose();
  };

  const handlePublishCurrentBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    setPublishError(null);

    try {
      await publishBookToCommunity(currentBook, authorName);
      setPublishSuccess(true);
      playChimeSound('fanfare');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
      loadGallery();
    } catch (err: any) {
      setPublishError(err.message || 'Could not publish book. Please verify your connection.');
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-amber-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-amber-100 dark:border-slate-800 bg-linear-to-r from-amber-50 via-rose-50/40 to-amber-50 dark:from-slate-900 dark:to-slate-850 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌍</span>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-slate-100">
                Community Coloring Gallery
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-bold">
                Live Shared Books
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
              Explore and color books published by families and creators around the world, or share your own creation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Actions Strip */}
        <div className="px-4 sm:px-6 py-3 bg-amber-100/60 dark:bg-slate-850 border-b border-amber-200/60 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'browse'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-white/80 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-white'
              }`}
            >
              🎨 Browse Community Books ({books.length})
            </button>
            <button
              onClick={() => setActiveTab('publish')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'publish'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-white/80 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-white'
              }`}
            >
              📤 Publish Current Book
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadGallery}
              disabled={isLoading}
              className="p-1.5 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
              title="Refresh Gallery"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenImportModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-amber-300 dark:border-slate-700 hover:bg-amber-50 text-xs font-bold transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span>Import Book File</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {activeTab === 'browse' ? (
            isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3 text-gray-500">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-sm font-medium">Loading community library...</p>
              </div>
            ) : books.length === 0 ? (
              <div className="py-16 text-center space-y-4 max-w-md mx-auto">
                <span className="text-4xl">🌟</span>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                  Be the First to Share a Book!
                </h3>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  The community gallery is ready. Share your customized coloring adventure so other families can color it!
                </p>
                <button
                  onClick={() => setActiveTab('publish')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs"
                >
                  Publish Current Book Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.map((b) => (
                  <div
                    key={b.id}
                    className="group bg-white dark:bg-slate-850 rounded-2xl border border-amber-200 dark:border-slate-750 p-4 flex flex-col justify-between transition-all hover:shadow-md hover:border-amber-400"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-amber-200/50">
                          {b.theme}
                        </span>
                        <button
                          onClick={(e) => handleLike(b.id, e)}
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
                            likedBookIds[b.id]
                              ? 'bg-rose-100 text-rose-700 font-bold'
                              : 'text-gray-500 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              likedBookIds[b.id] ? 'fill-rose-500 text-rose-500' : ''
                            }`}
                          />
                          <span>{b.likesCount}</span>
                        </button>
                      </div>

                      <div>
                        <h4 className="font-black text-sm text-gray-900 dark:text-slate-100 line-clamp-1">
                          {b.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          By <span className="font-semibold">{b.authorName}</span> • {b.pageCount} Pages
                        </p>
                      </div>

                      {b.subtitle && (
                        <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 italic">
                          "{b.subtitle}"
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 capitalize">
                        {b.difficulty}
                      </span>
                      <button
                        onClick={() => handleSelectBook(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Color This Book</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Publish View */
            <div className="max-w-lg mx-auto py-6 space-y-6">
              {publishSuccess ? (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-center space-y-3">
                  <Check className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                    Book Published to Community!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Your coloring adventure is now live in the community gallery for other families to discover and print.
                  </p>
                  <button
                    onClick={() => {
                      setPublishSuccess(false);
                      setActiveTab('browse');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black"
                  >
                    View in Gallery
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePublishCurrentBook} className="space-y-4">
                  <div className="bg-amber-50/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-amber-200 dark:border-slate-700 space-y-2">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                      Publishing: {currentBook.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-slate-400">
                      Theme: <span className="font-semibold">{currentBook.theme}</span> • {currentBook.pages.length} Pages
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-400">
                      🛡️ <strong>Child Privacy Protection:</strong> Real child names and photos are automatically stripped and replaced with generic kid-friendly titles before sharing.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Author / Creator Name (Public)
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value.slice(0, 50))}
                      placeholder="e.g. Leo's Mom, Art Class 3B, Creative Family"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {publishError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{publishError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="w-full py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isPublishing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Publishing to Gallery...</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>Publish to Community Gallery</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-slate-850 border-t border-amber-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
          <span>Safe sharing powered by Google Firebase Firestore.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-750 font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
