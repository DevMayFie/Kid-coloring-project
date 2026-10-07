import React, { useState } from 'react';
import { X, Check, Sparkles, CheckCheck } from 'lucide-react';
import { PageBorderStyle } from '../types';
import { BORDER_STYLES, PageBorderRenderer } from './PageBorderRenderer';
import { playChimeSound } from '../utils/kidAudio';

interface BorderSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBorder: PageBorderStyle;
  pageTitle?: string;
  pageNumber?: number;
  onSelectBorder: (border: PageBorderStyle, applyToAll: boolean) => void;
}

export const BorderSelectorModal: React.FC<BorderSelectorModalProps> = ({
  isOpen,
  onClose,
  currentBorder,
  pageTitle,
  pageNumber,
  onSelectBorder,
}) => {
  const [selected, setSelected] = useState<PageBorderStyle>(currentBorder);

  if (!isOpen) return null;

  const handleChoose = (applyToAll: boolean) => {
    onSelectBorder(selected, applyToAll);
    playChimeSound('sparkle');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-amber-300 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-amber-400 via-amber-300 to-yellow-200 px-6 py-4 flex items-center justify-between border-b-2 border-amber-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">🖼️</span>
            <div>
              <h2 className="text-lg font-black text-amber-950 flex items-center gap-2">
                Custom Page Borders
                <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-400 font-bold">
                  {pageNumber ? `Page ${pageNumber}` : 'All Pages'}
                </span>
              </h2>
              <p className="text-xs font-semibold text-amber-900/80">
                {pageTitle
                  ? `Choose a themed decorative border for "${pageTitle}"`
                  : 'Customize the frame borders around your coloring scenes'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-amber-950 flex items-center justify-center transition-all cursor-pointer shadow-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Grid of Border Styles */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BORDER_STYLES.map((border) => {
              const isSelected = selected === border.id;
              return (
                <div
                  key={border.id}
                  onClick={() => {
                    setSelected(border.id);
                    playChimeSound('pop');
                  }}
                  className={`relative p-3 rounded-2xl border-2 cursor-pointer transition-all flex gap-3.5 items-center select-none ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400 scale-101'
                      : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/30'
                  }`}
                >
                  {/* Miniature Visual Preview of the border */}
                  <div className="relative w-16 h-20 bg-amber-50/40 rounded-lg border border-gray-300 shrink-0 overflow-hidden flex items-center justify-center">
                    <PageBorderRenderer borderStyle={border.id} className="scale-95" />
                    <span className="text-xl select-none relative z-10">{border.icon}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-extrabold text-sm text-gray-900 leading-tight">
                        {border.name}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        {border.tag}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-snug">
                      {border.description}
                    </p>
                  </div>

                  {/* Selection Indicator */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'border-2 border-gray-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-amber-50/70 p-4 border-t border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-600 font-medium text-center sm:text-left">
            Borders show in web reader, full-screen print preview, and printable PDFs!
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleChoose(false)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-xs font-black transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 text-amber-600" />
              <span>Apply to This Page</span>
            </button>

            <button
              type="button"
              onClick={() => handleChoose(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Apply to All Pages</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
