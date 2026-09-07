import React from 'react';
import { Palette, Sparkles, MessageSquare, Download, Printer, BookOpen } from 'lucide-react';

interface HeaderProps {
  childName: string;
  theme: string;
  onOpenChat: () => void;
  onDownloadPdf: () => void;
  onDirectPrint: () => void;
  isGeneratingPdf: boolean;
  pageCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  childName,
  theme,
  onOpenChat,
  onDownloadPdf,
  onDirectPrint,
  isGeneratingPdf,
  pageCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-amber-50/95 backdrop-blur-md border-b border-amber-200/80 px-4 sm:px-8 py-3.5 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Logo and App Title */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-pink-500 flex items-center justify-center text-white shadow-sm ring-2 ring-white">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-gray-900 text-lg sm:text-xl tracking-tight flex items-center gap-1.5" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  ColorCraft Studio
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Gemini 3 Pro Image
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Printable Personalized Children's Coloring Books
              </p>
            </div>
          </div>

          {/* Mobile Chat trigger */}
          <button
            onClick={onOpenChat}
            className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold"
            id="mobile-chat-btn"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Story Chat</span>
          </button>
        </div>

        {/* Current book badge & Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-amber-200/70 text-xs text-gray-700 shadow-2xs">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Book for <strong className="text-gray-900 font-semibold">{childName || 'Child'}</strong>: <em className="text-amber-800 not-italic font-medium">{theme || 'Theme'}</em></span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-md font-bold">{pageCount} Pages + Cover</span>
          </div>

          {/* Chat Assistant Button */}
          <button
            onClick={onOpenChat}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold transition-colors shadow-2xs"
            id="desktop-chat-btn"
          >
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span>Story Chat Assistant</span>
          </button>

          {/* Direct Print Button */}
          <button
            onClick={onDirectPrint}
            title="Print entire coloring book"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold transition-colors shadow-2xs"
            id="print-book-btn"
          >
            <Printer className="w-4 h-4 text-gray-600" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Download Full PDF Button */}
          <button
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-98 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            id="download-pdf-btn"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Building PDF...' : 'Download PDF Book'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
