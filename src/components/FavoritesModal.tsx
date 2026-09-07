import React from 'react';
import { FavoriteBook } from '../types';
import { X, Trash2, BookOpen, Sparkles, Calendar, Star, Check } from 'lucide-react';
import { playChimeSound } from '../utils/kidAudio';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: FavoriteBook[];
  onRemoveFavorite: (id: string) => void;
  onLoadFavorite: (favorite: FavoriteBook) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onLoadFavorite,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full border-4 border-amber-300 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 p-5 sm:p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
              <Star className="w-6 h-6 text-yellow-100 fill-yellow-200" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                My Favorite Books & Themes
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                {favorites.length} {favorites.length === 1 ? 'saved configuration' : 'saved configurations'} ready for quick re-generation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {favorites.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner text-3xl">
                ⭐
              </div>
              <h4 className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                No Saved Favorites Yet!
              </h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                When you create a coloring book you love, click the{' '}
                <span className="font-bold text-amber-700">"⭐ Save to Favorites"</span> button in the coloring book view.
                It will appear here so you can re-generate or print it anytime!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {favorites.map((fav) => {
                const dateStr = new Date(fav.savedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={fav.id}
                    className="p-4 rounded-2xl bg-amber-50/50 border-2 border-amber-200 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between group relative text-left"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                          {fav.childName}'s Adventure
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {dateStr}
                        </span>
                      </div>

                      {/* Thumbnail & Title */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-16 h-20 shrink-0 bg-white border border-amber-200 rounded-xl overflow-hidden shadow-xs flex items-center justify-center p-1">
                          {fav.coverImageUrl ? (
                            <img
                              src={fav.coverImageUrl}
                              alt={fav.title}
                              className="w-full h-full object-contain filter contrast-125"
                            />
                          ) : (
                            <BookOpen className="w-6 h-6 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                            {fav.title}
                          </h4>
                          <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                            Theme: {fav.theme}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 bg-white rounded-md border border-amber-200 font-medium text-gray-600">
                              {fav.pageCount} Pages
                            </span>
                            {fav.difficulty && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-white rounded-md border border-amber-200 font-medium text-gray-600">
                                {fav.difficulty}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          playChimeSound('sparkle');
                          onLoadFavorite(fav);
                          onClose();
                        }}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Load & Use Book</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onRemoveFavorite(fav.id);
                        }}
                        className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-gray-200 hover:border-rose-200 transition-colors cursor-pointer"
                        title="Delete from Favorites"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
