import React, { useState } from 'react';
import { X, Download, Printer, Check, FileText, Sparkles, BookOpen, Layers } from 'lucide-react';
import { ColoringBook } from '../types';
import { generateColoringBookPdf, GeneratePdfOptions } from '../utils/pdfGenerator';
import confetti from 'canvas-confetti';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: ColoringBook;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  book,
}) => {
  if (!isOpen) return null;

  const [paperSize, setPaperSize] = useState<'letter' | 'a4'>('letter');
  const [includeCover, setIncludeCover] = useState(true);
  const [includeDedicationPage, setIncludeDedicationPage] = useState(true);
  const [includeCertificate, setIncludeCertificate] = useState(true);
  const [includeCaptions, setIncludeCaptions] = useState(true);
  const [includeStickers, setIncludeStickers] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');

  const totalPages =
    (includeCover ? 1 : 0) +
    (includeDedicationPage ? 1 : 0) +
    book.pages.length +
    (includeCertificate ? 1 : 0) +
    (includeStickers && book.stickerSheet?.imageUrl ? 1 : 0);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // fallback if canvas confetti not supported
    }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    setProgressPercent(10);
    setStatusText('Preparing coloring book PDF...');

    try {
      const options: GeneratePdfOptions = {
        paperSize,
        includeCover,
        includeDedicationPage,
        includeCertificate,
        includeStickers,
        includeCaptions,
        onProgress: (percent, text) => {
          setProgressPercent(percent);
          setStatusText(text);
        },
      };

      const doc = await generateColoringBookPdf(book, options);
      const safeName = (book.childName || 'coloring-book').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const safeTheme = (book.theme || 'adventure').toLowerCase().replace(/[^a-z0-9]/g, '-');
      doc.save(`${safeName}-${safeTheme}-coloring-book.pdf`);

      triggerCelebration();
      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Could not compile PDF. Please verify that images are loaded and try again.');
      setIsProcessing(false);
    }
  };

  const handleDirectPrint = async () => {
    setIsProcessing(true);
    setProgressPercent(15);
    setStatusText('Generating printable stream...');

    try {
      const options: GeneratePdfOptions = {
        paperSize,
        includeCover,
        includeDedicationPage,
        includeCertificate,
        includeStickers,
        includeCaptions,
        onProgress: (percent, text) => {
          setProgressPercent(percent);
          setStatusText(text);
        },
      };

      const doc = await generateColoringBookPdf(book, options);
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);

      // Open printable view in new window or iframe
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }

      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      console.error('Error printing PDF:', err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border-2 border-gray-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                Export & Print Coloring Book
              </h3>
              <p className="text-[11px] text-white/90">
                Customized for {book.childName} • {book.theme}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Summary Preview Box */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-gray-800 space-y-1.5">
            <div className="flex items-center justify-between font-bold text-gray-900">
              <span>{book.title}</span>
              <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md text-[10px]">
                {totalPages} Pages Total
              </span>
            </div>
            <p className="text-gray-600 italic">"{book.subtitle}"</p>
            <div className="flex items-center gap-2 sm:gap-4 text-[11px] text-gray-500 pt-1 border-t border-amber-200/60 flex-wrap">
              <span>{book.pages.length} Scenes</span>
              <span>•</span>
              <span>{includeCover ? 'Cover Included' : 'No Cover'}</span>
              <span>•</span>
              <span>{includeStickers && book.stickerSheet?.imageUrl ? '✂️ Stickers Included' : 'No Stickers'}</span>
              <span>•</span>
              <span>Resolution: {book.resolution}</span>
            </div>
          </div>

          {/* Paper Size Option */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Printer Paper Size
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'letter', label: 'US Letter (8.5 × 11 in)', desc: 'Standard North American home printer paper' },
                { id: 'a4', label: 'A4 Paper (210 × 297 mm)', desc: 'International standard paper' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaperSize(p.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paperSize === p.id
                      ? 'border-amber-600 bg-amber-50/80 font-bold text-amber-950 ring-2 ring-amber-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <div className="text-xs">{p.label}</div>
                  <div className="text-[10px] text-gray-500 font-normal mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles: Include Cover, Captions & Stickers */}
          <div className="space-y-2.5 pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCover}
                onChange={(e) => setIncludeCover(e.target.checked)}
                className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 border-gray-300"
              />
              <span className="text-xs font-semibold text-gray-800">
                Include Custom Cover Page (with "{book.childName}'s Coloring Book" title & border)
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDedicationPage}
                onChange={(e) => setIncludeDedicationPage(e.target.checked)}
                className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 border-gray-300"
              />
              <span className="text-xs font-semibold text-gray-800">
                Include Dedication Page & Crayon Color Tester Palette (with message for {book.childName})
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCertificate}
                onChange={(e) => setIncludeCertificate(e.target.checked)}
                className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 border-gray-300"
              />
              <span className="text-xs font-semibold text-gray-800">
                Include Official "Master Artist" Award Certificate of Completion
              </span>
            </label>

            {book.stickerSheet?.imageUrl && (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStickers}
                  onChange={(e) => setIncludeStickers(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 border-gray-300"
                />
                <span className="text-xs font-semibold text-gray-800">
                  Include Bonus Printable Cut-Out Sticker Sheet (badges, stars, medals & cut guides)
                </span>
              </label>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCaptions}
                onChange={(e) => setIncludeCaptions(e.target.checked)}
                className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 border-gray-300"
              />
              <span className="text-xs font-semibold text-gray-800">
                Include rhyming story captions beneath each scene
              </span>
            </label>
          </div>

          {/* Progress bar if generating */}
          {isProcessing && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span>{statusText}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDirectPrint}
              disabled={isProcessing}
              className="py-3 px-4 rounded-xl border-2 border-gray-900 hover:bg-gray-50 text-gray-900 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Direct Print Book</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isProcessing}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isProcessing ? 'Compiling PDF...' : 'Download PDF Book'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
