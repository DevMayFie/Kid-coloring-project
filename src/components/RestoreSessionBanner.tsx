import React from 'react';
import { RotateCcw, X, Sparkles, BookOpen, Clock } from 'lucide-react';
import { formatRelativeTime } from '../utils/historyAndAutosave';
import { ColoringBook } from '../types';

interface RestoreSessionBannerProps {
  savedBook: ColoringBook;
  savedAt: number;
  onRestore: () => void;
  onDismiss: () => void;
}

export const RestoreSessionBanner: React.FC<RestoreSessionBannerProps> = ({
  savedBook,
  savedAt,
  onRestore,
  onDismiss,
}) => {
  return (
    <div
      id="restore-session-banner"
      className="bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-2xl p-4 sm:p-4.5 shadow-md border border-amber-400/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-300"
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
          <RotateCcw className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-md text-amber-50 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-yellow-200" />
              Saved Session Found
            </span>
            <span className="text-xs text-amber-100 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(savedAt)}
            </span>
          </div>
          <p className="text-sm font-semibold text-white mt-0.5 truncate">
            &ldquo;{savedBook.title || `${savedBook.childName}'s Coloring Book`}&rdquo; • for{' '}
            <strong>{savedBook.childName || 'Explorer'}</strong> ({savedBook.pages?.length || 0} pages)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0">
        <button
          type="button"
          id="banner-restore-session-btn"
          onClick={onRestore}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-900 text-xs font-bold shadow-sm transition-transform active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-amber-600" />
          <span>Restore Last Session</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
