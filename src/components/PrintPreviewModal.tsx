import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Layers,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Maximize2,
  FileCheck,
  RefreshCw,
  SlidersHorizontal,
  Award,
  BookOpen,
  Scissors,
} from 'lucide-react';
import { ColoringBook, ColoringPage, PrintLayoutMode } from '../types';
import { generateColoringBookPdf, GeneratePdfOptions } from '../utils/pdfGenerator';
import { playChimeSound } from '../utils/kidAudio';
import confetti from 'canvas-confetti';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: ColoringBook;
}

type PreviewLayoutMode = 'sheets' | 'single' | 'pdf';

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  book,
}) => {
  const [paperSize, setPaperSize] = useState<'letter' | 'a4'>('letter');
  const [printLayout, setPrintLayout] = useState<PrintLayoutMode>(book.printLayout || 'standard');
  const [includeCover, setIncludeCover] = useState(true);
  const [includeDedicationPage, setIncludeDedicationPage] = useState(true);
  const [includeCertificate, setIncludeCertificate] = useState(true);
  const [includeCaptions, setIncludeCaptions] = useState(true);
  const [includeStickers, setIncludeStickers] = useState(true);
  const [includeDrawYourEnding, setIncludeDrawYourEnding] = useState(book.includeDrawYourEnding !== false);
  const [includeCrayonSwatches, setIncludeCrayonSwatches] = useState(book.includeCrayonSwatches !== false);
  const [viewMode, setViewMode] = useState<PreviewLayoutMode>('sheets');
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isCompilingPdf, setIsCompilingPdf] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [showOptionsPopover, setShowOptionsPopover] = useState(false);

  // Compile or update PDF blob whenever options change
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    let currentUrl: string | null = null;

    const compilePdf = async () => {
      setIsCompilingPdf(true);
      setStatusMessage('Compiling high-resolution PDF layout...');

      try {
        const options: GeneratePdfOptions = {
          paperSize,
          includeCover,
          includeDedicationPage,
          includeCertificate,
          includeStickers,
          includeCaptions,
          includeDrawYourEnding,
          includeCrayonSwatches,
          printLayout,
        };

        const doc = await generateColoringBookPdf(book, options);
        if (isCancelled) return;

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        currentUrl = url;
        setPdfBlobUrl(url);
        setStatusMessage('Layout compiled successfully');
      } catch (err) {
        console.error('Failed to compile PDF preview:', err);
        if (!isCancelled) {
          setStatusMessage('Could not generate PDF preview stream');
        }
      } finally {
        if (!isCancelled) {
          setIsCompilingPdf(false);
        }
      }
    };

    compilePdf();

    return () => {
      isCancelled = true;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [
    isOpen,
    book,
    paperSize,
    includeCover,
    includeDedicationPage,
    includeCertificate,
    includeCaptions,
    includeStickers,
    includeDrawYourEnding,
    includeCrayonSwatches,
    printLayout,
  ]);

  // Construct visual preview sheets
  interface PreviewSheet {
    id: string;
    type: 'cover' | 'dedication' | 'coloring' | 'stickers' | 'certificate' | 'draw-ending';
    title: string;
    sheetNumber: number;
    subtitle?: string;
    imageUrl?: string;
    caption?: string;
    secondaryCaption?: string;
    funFactOrTip?: string;
    pageData?: ColoringPage;
  }

  const sheets: PreviewSheet[] = [];
  let sheetCount = 0;

  if (includeCover) {
    sheetCount++;
    sheets.push({
      id: 'sheet-cover',
      type: 'cover',
      title: `${book.childName.toUpperCase()}'S COLORING BOOK`,
      sheetNumber: sheetCount,
      subtitle: book.subtitle,
      imageUrl: book.coverImageUrl,
    });
  }

  if (includeDedicationPage) {
    sheetCount++;
    sheets.push({
      id: 'sheet-dedication',
      type: 'dedication',
      title: 'DEDICATION & COLOR TESTER',
      sheetNumber: sheetCount,
      subtitle: book.dedication,
    });
  }

  book.pages.forEach((page) => {
    sheetCount++;
    sheets.push({
      id: `sheet-page-${page.id}`,
      type: 'coloring',
      title: page.title,
      sheetNumber: sheetCount,
      imageUrl: page.imageUrl,
      caption: includeCaptions ? page.storyCaption : undefined,
      secondaryCaption: includeCaptions ? page.secondaryCaption : undefined,
      funFactOrTip: page.funFactOrTip,
      pageData: page,
    });
  });

  if (includeDrawYourEnding) {
    sheetCount++;
    sheets.push({
      id: 'sheet-draw-ending',
      type: 'draw-ending',
      title: '⭐ BONUS: DRAW YOUR OWN ENDING! ⭐',
      sheetNumber: sheetCount,
      subtitle: `What happens next in ${book.childName}'s adventure? Draw and write your original ending!`,
    });
  }

  if (includeStickers && book.stickerSheet?.imageUrl) {
    sheetCount++;
    sheets.push({
      id: 'sheet-stickers',
      type: 'stickers',
      title: book.stickerSheet.title || `${book.childName}'s Cut-Out Stickers`,
      sheetNumber: sheetCount,
      imageUrl: book.stickerSheet.imageUrl,
      subtitle: 'Cut along dashed lines with safety scissors and stick onto your pages!',
    });
  }

  if (includeCertificate) {
    sheetCount++;
    sheets.push({
      id: 'sheet-certificate',
      type: 'certificate',
      title: 'MASTER ARTIST CERTIFICATE',
      sheetNumber: sheetCount,
      subtitle: `Awarded to ${book.childName}`,
    });
  }

  const safeSheetIndex = Math.max(0, Math.min(activeSheetIndex, sheets.length - 1));
  const currentSheet = sheets[safeSheetIndex] || sheets[0];

  // Download PDF Handler
  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    playChimeSound('fanfare');
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}

    const link = document.createElement('a');
    link.href = pdfBlobUrl;
    const safeName = (book.childName || 'coloring-book').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const safeTheme = (book.theme || 'adventure').toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = `${safeName}-${safeTheme}-coloring-book.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct Print Handler
  const handlePrint = () => {
    if (!pdfBlobUrl) return;
    playChimeSound('sparkle');
    // Try in-page hidden iframe printing to avoid popup blockers in sandboxed iframes
    try {
      let printFrame = document.getElementById('pdf-preview-print-iframe') as HTMLIFrameElement;
      if (printFrame) {
        printFrame.remove();
      }
      printFrame = document.createElement('iframe');
      printFrame.id = 'pdf-preview-print-iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.src = pdfBlobUrl;
      document.body.appendChild(printFrame);
      printFrame.onload = () => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print failed, falling back to download:', e);
          const dlLink = document.createElement('a');
          dlLink.href = pdfBlobUrl;
          dlLink.download = `${book.childName || 'coloring-book'}-print.pdf`;
          dlLink.click();
        }
      };
    } catch (e) {
      console.warn('Print iframe error:', e);
      const dlLink = document.createElement('a');
      dlLink.href = pdfBlobUrl;
      dlLink.download = `${book.childName || 'coloring-book'}-print.pdf`;
      dlLink.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full-Screen Print Preview"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col overflow-hidden text-white"
    >
      {/* 1. TOP PRINT PREVIEW CONTROL BAR */}
      <header className="shrink-0 bg-gray-950/95 border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 select-none">
        {/* Left: Title & Page Count */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-xs">
            <Printer className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                className="font-bold text-sm sm:text-base text-white tracking-tight truncate"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                Print Preview: {book.title}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider shrink-0">
                {sheets.length} Sheets
              </span>
            </div>
            <p className="text-[11px] text-gray-400 truncate">
              {paperSize === 'letter' ? 'US Letter (8.5 × 11 in)' : 'A4 (210 × 297 mm)'} • Ready for standard home & school printers
            </p>
          </div>
        </div>

        {/* Center: View Mode & Zoom Controls */}
        <div className="hidden md:flex items-center gap-2 bg-gray-900/90 rounded-xl p-1 border border-gray-800">
          <button
            type="button"
            onClick={() => setViewMode('sheets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'sheets'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            title="View all sheets in an interactive printable grid"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Sheets Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'single'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            title="Inspect individual sheets one at a time"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Single Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('pdf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'pdf'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            title="Inspect compiled PDF vector stream"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Native PDF</span>
          </button>

          <div className="h-4 w-px bg-gray-700 mx-1" />

          {/* Zoom In / Out */}
          <div className="flex items-center gap-1 px-1">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-gray-300 w-10 text-center">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Print Options, Actions & Close */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Options Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOptionsPopover((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-bold transition-colors cursor-pointer"
              title="Adjust paper size and printable sections"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Print Options</span>
            </button>

            {/* Popover */}
            {showOptionsPopover && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl z-40 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="font-bold text-gray-200 uppercase tracking-wider text-[10px]">
                    Print Layout Settings
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOptionsPopover(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Print Layout Mode */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-300 block">
                    Booklet & Page Format:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintLayout('standard')}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        printLayout === 'standard'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      📄 Full Pages
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintLayout('booklet')}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        printLayout === 'booklet'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      📖 Mini-Booklet
                    </button>
                  </div>
                  {printLayout === 'booklet' && (
                    <p className="text-[10px] text-amber-400/90 leading-tight">
                      2-Up landscape half-sheets with center fold & staple line guides!
                    </p>
                  )}
                </div>

                {/* Paper Size */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-300 block">
                    Paper Standard:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaperSize('letter')}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        paperSize === 'letter'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      US Letter
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperSize('a4')}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        paperSize === 'a4'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      A4 Standard
                    </button>
                  </div>
                </div>

                {/* Checklist Toggles */}
                <div className="space-y-2 pt-1 border-t border-gray-800">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={includeCover}
                      onChange={(e) => setIncludeCover(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0"
                    />
                    <span>Include Cover Page</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={includeDedicationPage}
                      onChange={(e) => setIncludeDedicationPage(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0"
                    />
                    <span>Dedication & Color Swatches</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={includeCaptions}
                      onChange={(e) => setIncludeCaptions(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0"
                    />
                    <span>Story Captions & Fun Facts</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={includeCrayonSwatches}
                      onChange={(e) => setIncludeCrayonSwatches(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0"
                    />
                    <span>🖍️ Crayon Swatch Guide Strips</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={includeDrawYourEnding}
                      onChange={(e) => setIncludeDrawYourEnding(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0"
                    />
                    <span>⭐ "Draw Your Own Ending" Bonus</span>
                  </label>

                  {book.stickerSheet?.imageUrl && (
                    <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={includeStickers}
                        onChange={(e) => setIncludeStickers(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-0"
                      />
                      <span>Bonus Cut-Out Sticker Sheet</span>
                    </label>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={includeCertificate}
                      onChange={(e) => setIncludeCertificate(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0"
                    />
                    <span>Official Artist Certificate</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Direct Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={!pdfBlobUrl || isCompilingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer border border-gray-700"
            title="Open printable browser print dialog"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Print Book</span>
          </button>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!pdfBlobUrl || isCompilingPdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white text-xs font-black shadow-md transition-all disabled:opacity-40 cursor-pointer"
            title="Download the compiled PDF file"
          >
            {isCompilingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isCompilingPdf ? 'Preparing...' : 'Download PDF'}</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer border border-gray-800 ml-1"
            title="Close Print Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN PREVIEW CANVAS AREA */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex items-start justify-center relative bg-gray-950/70">
        {/* VIEW MODE A: ALL SHEETS GRID (PRINT SPREAD) */}
        {viewMode === 'sheets' && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-6xl w-full mx-auto transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            {sheets.map((sheet, index) => (
              <div
                key={sheet.id}
                className="group relative flex flex-col items-center"
              >
                {/* Simulated Paper Sheet */}
                <div
                  className={`w-full aspect-[8.5/11] bg-white text-gray-900 rounded-lg shadow-2xl p-6 flex flex-col justify-between border-2 border-gray-300 relative transition-transform duration-200 hover:scale-[1.01] overflow-hidden ${
                    sheet.type === 'cover' ? 'ring-4 ring-amber-400/40' : ''
                  }`}
                  style={{ minHeight: '440px' }}
                >
                  {/* Outer Double Print Margin (12mm Simulation) */}
                  <div className="absolute inset-3 border-2 border-gray-800 rounded-sm pointer-events-none" />
                  <div className="absolute inset-3.5 border border-gray-400 pointer-events-none" />

                  {/* SHEET HEADER */}
                  <div className="pt-2 text-center relative z-10">
                    {sheet.type === 'cover' ? (
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-0.5 rounded-full border border-amber-300">
                          ★ COLOR YOUR OWN COVER ★
                        </span>
                        <h1
                          className="text-base sm:text-lg font-black text-gray-950 tracking-tight mt-1"
                          style={{ fontFamily: "'Fredoka', sans-serif" }}
                        >
                          {sheet.title}
                        </h1>
                      </div>
                    ) : sheet.type === 'dedication' ? (
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          PERSONAL DEDICATION
                        </span>
                        <h2 className="text-sm font-black text-gray-900 mt-1">
                          A Special Gift for {book.childName}
                        </h2>
                      </div>
                    ) : sheet.type === 'certificate' ? (
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 bg-amber-100 px-3 py-0.5 rounded-full border border-amber-300">
                          OFFICIAL CERTIFICATE
                        </span>
                        <h2 className="text-base font-black text-amber-950 mt-1" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                          MASTER ARTIST AWARD
                        </h2>
                      </div>
                    ) : sheet.type === 'stickers' ? (
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                          BONUS PRINTABLE STICKERS
                        </span>
                        <h2 className="text-sm font-black text-gray-900 mt-1">
                          {sheet.title}
                        </h2>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between px-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          <span>{book.childName}'s Adventure</span>
                          <span>Page {sheet.pageData?.pageNumber}</span>
                        </div>
                        <h2 className="text-sm font-bold text-gray-900 mt-0.5">
                          {sheet.title}
                        </h2>
                      </div>
                    )}
                  </div>

                  {/* SHEET ARTWORK BODY */}
                  <div className="flex-1 flex flex-col items-center justify-center p-2 relative z-10 overflow-hidden">
                    {sheet.type === 'dedication' ? (
                      <div className="w-full h-full flex flex-col justify-around p-3 text-center">
                        <div className="p-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 space-y-2">
                          <p className="text-xs font-semibold text-gray-800 italic leading-relaxed">
                            "{sheet.subtitle}"
                          </p>
                          <p className="text-[10px] text-amber-900 font-bold uppercase tracking-wider">
                            Signed with Love • Happy Coloring!
                          </p>
                        </div>

                        {/* Crayon Color Tester Swatches */}
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 block">
                            🖍️ Crayon & Marker Color Tester Swatches
                          </span>
                          <p className="text-[9px] text-gray-500">
                            Test your colors in the circles below before coloring your story!
                          </p>
                          <div className="flex justify-center gap-2 pt-1">
                            {['#FF4D4D', '#FFA500', '#FFD700', '#4CAF50', '#2196F3', '#9C27B0'].map((color, cIdx) => (
                              <div
                                key={cIdx}
                                className="w-7 h-7 rounded-full border-2 border-gray-400 flex items-center justify-center bg-gray-50 text-[9px] font-bold text-gray-400"
                              >
                                {cIdx + 1}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : sheet.type === 'certificate' ? (
                      <div className="w-full h-full flex flex-col justify-between items-center p-3 text-center border-2 border-amber-300 rounded-xl bg-amber-50/40">
                        <div className="pt-2">
                          <Award className="w-10 h-10 text-amber-600 mx-auto" />
                          <p className="text-xs font-serif text-gray-600 mt-1">This certifies that</p>
                          <p className="text-lg font-black text-amber-900 tracking-wider mt-1" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                            {book.childName.toUpperCase()}
                          </p>
                          <p className="text-[11px] text-gray-700 mt-1">
                            has masterfully colored and completed all scenes of
                          </p>
                          <p className="text-xs font-bold text-gray-950 italic mt-0.5">
                            "{book.title}"
                          </p>
                        </div>
                        <div className="w-full flex justify-between items-end px-4 pb-2 pt-4 border-t border-amber-200 text-[9px] text-gray-600 font-medium">
                          <div>
                            <div className="w-20 border-b border-gray-800 mb-1" />
                            <span>Artist Signature</span>
                          </div>
                          <div className="text-amber-800 font-bold uppercase">
                            ★ CERTIFIED COMPLETE ★
                          </div>
                          <div>
                            <div className="w-20 border-b border-gray-800 mb-1" />
                            <span>Date Completed</span>
                          </div>
                        </div>
                      </div>
                    ) : sheet.type === 'draw-ending' ? (
                      <div className="w-full h-full flex flex-col justify-between p-2">
                        <div className="w-full flex-1 border-2 border-dashed border-amber-400/80 rounded-xl bg-amber-50/20 p-3 flex flex-col items-center justify-center relative">
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-100 px-2 py-0.5 rounded-full mb-1">
                            ✏️ Your Creative Imagination Space
                          </span>
                          <p className="text-[10px] text-gray-500 text-center max-w-xs">
                            Draw the grand finale to {book.childName}'s adventure inside this box!
                          </p>
                          <div className="w-14 h-14 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xl mt-2">
                            🎨
                          </div>
                        </div>

                        {/* Handwriting Lines */}
                        <div className="w-full pt-2 space-y-1.5">
                          <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                            My Story Ending:
                          </p>
                          <div className="w-full border-b border-gray-400 border-dashed" />
                          <div className="w-full border-b border-gray-400 border-dashed" />
                          <div className="flex justify-between items-center text-[8px] text-gray-500 pt-0.5">
                            <span>Written & Illustrated by: _______________________</span>
                            <span>The End! ★</span>
                          </div>
                        </div>
                      </div>
                    ) : sheet.imageUrl ? (
                      <div className="w-full h-full flex items-center justify-center p-1">
                        <img
                          src={sheet.imageUrl}
                          alt={sheet.title}
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain filter contrast-125"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 font-bold">
                        Line Art Illustration
                      </div>
                    )}
                  </div>

                  {/* Foldable Mini-Booklet Center Fold Line */}
                  {printLayout === 'booklet' && (
                    <div className="absolute inset-y-0 left-1/2 w-0 border-r-2 border-dashed border-amber-500/50 pointer-events-none z-20 flex items-center justify-center">
                      <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-xs rotate-90 whitespace-nowrap">
                        ✂️ Fold & Staple Centerline
                      </span>
                    </div>
                  )}

                  {/* SHEET FOOTER */}
                  <div className="pt-2 pb-1 text-center relative z-10 border-t border-gray-200">
                    {sheet.caption && (
                      <p className="text-[11px] font-semibold text-gray-800 leading-snug line-clamp-2 px-2">
                        {sheet.caption}
                      </p>
                    )}
                    {sheet.secondaryCaption && (
                      <p className="text-[10px] text-amber-800 italic line-clamp-1 px-2 mt-0.5">
                        {sheet.secondaryCaption}
                      </p>
                    )}
                    {includeCrayonSwatches && sheet.type === 'coloring' && (
                      <div className="flex items-center justify-center gap-1.5 py-1 px-2 my-0.5 rounded-md bg-amber-50/80 border border-amber-200/60">
                        <span className="text-[8px] font-black uppercase text-amber-800 tracking-wider">
                          🖍️ Suggested Colors:
                        </span>
                        <div className="flex items-center gap-1">
                          {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'].map((c, i) => (
                            <span
                              key={i}
                              className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[9px] text-gray-400 font-medium px-2 pt-1">
                      <span>{book.title}</span>
                      <span>Sheet {sheet.sheetNumber} of {sheets.length}</span>
                    </div>
                  </div>
                </div>

                {/* Sheet Indicator Badge */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-gray-900 border border-gray-800 text-[11px] font-bold text-gray-300">
                    Sheet {sheet.sheetNumber}: {sheet.type.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSheetIndex(index);
                      setViewMode('single');
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                  >
                    Inspect Full Sheet →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW MODE B: SINGLE SHEET CAROUSEL */}
        {viewMode === 'single' && (
          <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto space-y-4">
            {/* Sheet Carousel Navigator */}
            <div className="flex items-center justify-between w-full px-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveSheetIndex((i) => Math.max(0, i - 1))}
                disabled={safeSheetIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-amber-400" />
                <span>Previous Sheet</span>
              </button>

              <div className="text-center">
                <span className="text-amber-400 font-black">
                  Sheet {currentSheet.sheetNumber} of {sheets.length}
                </span>
                <span className="text-gray-400 ml-2 font-normal">({currentSheet.title})</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveSheetIndex((i) => Math.min(sheets.length - 1, i + 1))}
                disabled={safeSheetIndex === sheets.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Next Sheet</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>

            {/* Single Big Paper Sheet */}
            <div
              className="w-full aspect-[8.5/11] max-w-xl bg-white text-gray-900 rounded-xl shadow-2xl p-8 flex flex-col justify-between border-4 border-gray-300 relative transition-transform duration-200 overflow-hidden"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              {/* Outer Margin Guides */}
              <div className="absolute inset-4 border-2 border-gray-800 rounded-sm pointer-events-none" />
              <div className="absolute inset-5 border border-gray-400 pointer-events-none" />

              {/* Header */}
              <div className="pt-2 text-center relative z-10">
                <h2
                  className="text-lg font-black text-gray-950 tracking-tight"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                >
                  {currentSheet.title}
                </h2>
                {currentSheet.subtitle && (
                  <p className="text-xs text-gray-600 italic mt-0.5">{currentSheet.subtitle}</p>
                )}
              </div>

              {/* Artwork Center */}
              <div className="flex-1 flex flex-col items-center justify-center p-3 relative z-10">
                {currentSheet.type === 'draw-ending' ? (
                  <div className="w-full h-full flex flex-col justify-between p-4">
                    <div className="w-full flex-1 border-2 border-dashed border-amber-400/80 rounded-2xl bg-amber-50/20 p-6 flex flex-col items-center justify-center relative min-h-[220px]">
                      <span className="text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-full mb-2">
                        ✏️ Child's Creative Imagination Box
                      </span>
                      <p className="text-xs text-gray-500 text-center max-w-sm">
                        Pick up your crayons and markers to draw the final scene of {book.childName}'s journey!
                      </p>
                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-3xl mt-4">
                        🎨
                      </div>
                    </div>

                    {/* Story handwriting lines */}
                    <div className="w-full pt-4 space-y-2">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                        My Story Ending:
                      </p>
                      <div className="w-full border-b-2 border-gray-400 border-dashed" />
                      <div className="w-full border-b-2 border-gray-400 border-dashed" />
                      <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1">
                        <span>Written & Illustrated by: _______________________</span>
                        <span>The End! ★</span>
                      </div>
                    </div>
                  </div>
                ) : currentSheet.imageUrl ? (
                  <img
                    src={currentSheet.imageUrl}
                    alt={currentSheet.title}
                    referrerPolicy="no-referrer"
                    className="max-h-[50vh] max-w-full object-contain filter contrast-125"
                  />
                ) : (
                  <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-sm font-bold text-gray-400">
                    {currentSheet.type.toUpperCase()} PREVIEW
                  </div>
                )}
              </div>

              {/* Foldable Mini-Booklet Center Fold Line */}
              {printLayout === 'booklet' && (
                <div className="absolute inset-y-0 left-1/2 w-0 border-r-2 border-dashed border-amber-500/50 pointer-events-none z-20 flex items-center justify-center">
                  <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-xs rotate-90 whitespace-nowrap">
                    ✂️ Fold & Staple Centerline
                  </span>
                </div>
              )}

              {/* Caption Footer */}
              <div className="pt-3 pb-2 text-center relative z-10 border-t border-gray-200 space-y-1">
                {currentSheet.caption && (
                  <p className="text-sm font-bold text-gray-900">{currentSheet.caption}</p>
                )}
                {currentSheet.secondaryCaption && (
                  <p className="text-xs text-amber-800 italic">{currentSheet.secondaryCaption}</p>
                )}
                {includeCrayonSwatches && currentSheet.type === 'coloring' && (
                  <div className="flex items-center justify-center gap-2 py-1 px-3 my-0.5 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                      🖍️ Crayon Swatch Guide:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'].map((c, i) => (
                        <span
                          key={i}
                          className="w-3.5 h-3.5 rounded-full border border-gray-300 inline-block shadow-2xs"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {currentSheet.funFactOrTip && (
                  <p className="text-[11px] text-gray-500 font-medium">{currentSheet.funFactOrTip}</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                  <span>{book.title}</span>
                  <span>Sheet {currentSheet.sheetNumber} of {sheets.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODE C: NATIVE PDF EMBEDDED STREAM */}
        {viewMode === 'pdf' && (
          <div className="w-full max-w-5xl h-[78vh] bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl flex flex-col">
            {isCompilingPdf ? (
              <div className="flex-1 flex flex-col items-center justify-center text-amber-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-sm font-bold">Compiling PDF preview stream...</span>
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                title="Coloring Book PDF Print Layout Preview"
                className="w-full h-full border-0 bg-gray-900"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-2">
                <FileText className="w-10 h-10 text-gray-600" />
                <p className="text-sm font-bold">PDF preview stream not ready</p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold"
                >
                  Download directly
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. BOTTOM PREVIEW ACTION BAR */}
      <footer className="shrink-0 bg-gray-950 border-t border-gray-800 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-400">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          <span>
            {isCompilingPdf ? 'Updating print layout...' : 'Print layout verified • Ready for high-contrast ink printing'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-500">
            Total {sheets.length} Pages • {paperSize === 'letter' ? 'Letter' : 'A4'} Format
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold cursor-pointer"
          >
            Close Preview
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!pdfBlobUrl || isCompilingPdf}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Book</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
