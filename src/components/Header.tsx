import React from 'react';
import { Palette, MessageSquare, Download, Printer, BookOpen, History } from 'lucide-react';

interface HeaderProps {
  childName: string;
  theme: string;
  bookTitle?: string;
  onOpenChat: () => void;
  onDownloadPdf: () => void;
  onDirectPrint: () => void;
  isGeneratingPdf: boolean;
  pageCount: number;
  historyCount?: number;
  onScrollToHistory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  childName,
  theme,
  bookTitle,
  onOpenChat,
  onDownloadPdf,
  onDirectPrint,
  isGeneratingPdf,
  pageCount,
  historyCount = 0,
  onScrollToHistory,
}) => {
  const displayTitle = bookTitle?.trim() || (childName ? `${childName}'s ${theme || 'Coloring'} Book` : 'Coloring Book');

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-amber-200/70 px-3 sm:px-6 py-2 shadow-2xs transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Minimalist Book Title Indicator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-100/90 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-bold text-gray-900 text-sm sm:text-base tracking-tight truncate" title={displayTitle}>
              {displayTitle}
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
              {pageCount} Pages + Cover
            </span>
          </div>
        </div>

        {/* Minimalist Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* History Button */}
          {onScrollToHistory && (
            <button
              onClick={onScrollToHistory}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-50/90 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-semibold transition-colors cursor-pointer"
              id="header-history-btn"
              title="View up to 5 previously generated coloring books in this session"
            >
              <History className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">History</span>
              {historyCount > 0 && (
                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {historyCount}
                </span>
              )}
            </button>
          )}

          {/* AI Story Chat Assistant */}
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-semibold transition-colors cursor-pointer"
            id="desktop-chat-btn"
            title="Open AI Story Assistant"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Story Chat</span>
          </button>

          {/* Direct Print Button */}
          <button
            onClick={onDirectPrint}
            title="Print entire coloring book"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium transition-colors cursor-pointer"
            id="print-book-btn"
          >
            <Printer className="w-3.5 h-3.5 text-gray-600" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Download Full PDF Button */}
          <button
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            id="download-pdf-btn"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Preparing...' : 'PDF Book'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
