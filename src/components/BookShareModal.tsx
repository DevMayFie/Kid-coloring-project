import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileCode,
  Check,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { exportBookToJsonFile, parseImportedBookJson } from '../utils/bookSharing';
import { ColoringBook } from '../types';
import { playChimeSound } from '../utils/kidAudio';
import confetti from 'canvas-confetti';

interface BookShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBook: ColoringBook;
  onImportBook: (book: ColoringBook) => void;
}

export const BookShareModal: React.FC<BookShareModalProps> = ({
  isOpen,
  onClose,
  currentBook,
  onImportBook,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    exportBookToJsonFile(currentBook);
    playChimeSound('sparkle');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const importedBook = parseImportedBookJson(text);
        setImportSuccess(`Successfully imported "${importedBook.title}" (${importedBook.pages.length} pages)!`);
        playChimeSound('fanfare');
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
        });

        setTimeout(() => {
          onImportBook(importedBook);
          onClose();
        }, 1200);
      } catch (err: any) {
        setImportError(err.message || 'Failed to read file. Please verify it is a valid .colorkid file.');
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-amber-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-amber-100 dark:border-slate-800 bg-linear-to-r from-amber-50 to-orange-50/50 dark:from-slate-900 dark:to-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <h2 className="text-lg font-black text-gray-900 dark:text-slate-100">
              Import & Export Coloring Books
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="p-3 bg-amber-100/60 dark:bg-slate-850 border-b border-amber-200/60 dark:border-slate-800 flex gap-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-white/80 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-white'
            }`}
          >
            📥 Export File (.colorkid)
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-white/80 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-white'
            }`}
          >
            📤 Import File (.colorkid)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {activeTab === 'export' ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-amber-50/70 dark:bg-slate-800/70 rounded-2xl border border-amber-200/70 dark:border-slate-700 text-left space-y-1">
                <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  Ready to export: {currentBook.title}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Includes {currentBook.pages.length} vector pages, cover art, stickers, and custom dedication.
                </p>
              </div>

              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                Save your book as a standalone <strong>.colorkid</strong> file. You can email it to friends, grandparents, or teachers who can instantly load and print it on any device!
              </p>

              <button
                onClick={handleExport}
                className="w-full py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download .colorkid Book File</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-600 dark:text-slate-400 text-center leading-relaxed">
                Select a <strong>.colorkid</strong> or JSON coloring book file exported from another user or device.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 rounded-2xl p-8 text-center cursor-pointer bg-amber-50/30 dark:bg-slate-800/30 hover:bg-amber-50/60 transition-all"
              >
                <Upload className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  Click to choose a .colorkid file
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                  Supports JSON and .colorkid formats
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".colorkid,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {importError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-slate-850 border-t border-amber-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-750 text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
