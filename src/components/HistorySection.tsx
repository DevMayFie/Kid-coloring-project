import React, { useState } from 'react';
import { History, RotateCcw, Trash2, BookOpen, Check, Clock, Sparkles, ChevronDown, ChevronUp, Layers, User } from 'lucide-react';
import { ColoringBook } from '../types';
import { formatRelativeTime } from '../utils/historyAndAutosave';

interface HistorySectionProps {
  historyBooks: ColoringBook[];
  activeBookId: string;
  onLoadBook: (book: ColoringBook) => void;
  onRemoveBook: (id: string) => void;
  onClearHistory: () => void;
  hasAutosavedSession: boolean;
  autosavedBook?: ColoringBook | null;
  autosavedSavedAt?: number;
  onRestoreLastSession: () => void;
  isAutoSaved?: boolean;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  historyBooks,
  activeBookId,
  onLoadBook,
  onRemoveBook,
  onClearHistory,
  hasAutosavedSession,
  autosavedBook,
  autosavedSavedAt,
  onRestoreLastSession,
  isAutoSaved = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section
      id="session-history-section"
      className="bg-white rounded-3xl border border-amber-200/80 p-4 sm:p-6 shadow-sm space-y-4 transition-all"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
            <History className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span>Session History</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {historyBooks.length} of 5 books
                </span>
              </h2>
              {isAutoSaved && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-saved locally
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Quickly re-load any of your previously generated coloring books from this browser session.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {/* Restore Last Session button if data exists in localStorage */}
          {hasAutosavedSession && (
            <button
              type="button"
              id="history-restore-session-btn"
              onClick={onRestoreLastSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-2xs transition-transform active:scale-95 cursor-pointer"
              title={`Restore last auto-saved session from ${autosavedSavedAt ? formatRelativeTime(autosavedSavedAt) : 'storage'}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Last Session</span>
            </button>
          )}

          {/* Clear history button */}
          {historyBooks.length > 0 && (
            <button
              type="button"
              id="clear-history-btn"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 text-xs font-medium transition-colors cursor-pointer"
              title="Clear all books from session history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear History</span>
            </button>
          )}

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse session history' : 'Expand session history'}
            aria-label={isExpanded ? 'Collapse session history' : 'Expand session history'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* History Grid */}
      {isExpanded && (
        <div className="pt-1">
          {historyBooks.length === 0 ? (
            <div className="py-8 px-4 text-center border-2 border-dashed border-amber-200 rounded-2xl bg-amber-50/40 space-y-2">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-700">
                No previous books generated in this browser session yet
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Generate a new coloring book above, and up to 5 books will appear here automatically for quick re-loading anytime!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {historyBooks.map((item, index) => {
                const isActive = item.id === activeBookId;
                const coverThumb = item.coverImageUrl || (item.pages && item.pages[0]?.imageUrl);

                return (
                  <div
                    key={item.id || index}
                    id={`history-card-${index}`}
                    className={`group relative rounded-2xl border transition-all flex flex-col justify-between overflow-hidden bg-white ${
                      isActive
                        ? 'border-amber-500 ring-2 ring-amber-400/40 shadow-xs'
                        : 'border-gray-200/90 hover:border-amber-300 hover:shadow-2xs'
                    }`}
                  >
                    {/* Top Thumbnail Preview */}
                    <div className="relative aspect-4/3 bg-gray-50 border-b border-gray-100 flex items-center justify-center overflow-hidden">
                      {coverThumb ? (
                        <img
                          src={coverThumb}
                          alt={item.title}
                          className="w-full h-full object-contain p-2 group-hover:scale-102 transition-transform duration-200"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-gray-300 flex flex-col items-center justify-center gap-1">
                          <BookOpen className="w-8 h-8" />
                          <span className="text-[10px]">No Preview</span>
                        </div>
                      )}

                      {/* Active Badge */}
                      {isActive && (
                        <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Currently Active</span>
                        </div>
                      )}

                      {/* Delete from session button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveBook(item.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-600 shadow-2xs opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Remove from session history"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Page Count Overlay */}
                      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-300" />
                        <span>{item.pages?.length || 0} Pages</span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-gray-500 mb-1">
                          <span className="truncate max-w-[120px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                            {item.theme}
                          </span>
                          <span className="flex items-center gap-0.5 text-gray-400 shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <h3
                          className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-amber-900 transition-colors"
                          title={item.title}
                        >
                          {item.title}
                        </h3>
                        {item.childName && (
                          <p className="text-[11px] text-gray-600 flex items-center gap-1 mt-1 truncate">
                            <User className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>For {item.childName}</span>
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 border-t border-gray-100">
                        {isActive ? (
                          <div className="w-full py-1.5 rounded-xl bg-amber-50 text-amber-800 text-[11px] font-bold text-center border border-amber-200">
                            Active in Viewer
                          </div>
                        ) : (
                          <button
                            type="button"
                            id={`load-history-book-${index}`}
                            onClick={() => onLoadBook(item)}
                            className="w-full py-1.5 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-98 cursor-pointer shadow-2xs"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Re-load Book</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
