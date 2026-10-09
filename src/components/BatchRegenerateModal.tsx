import React, { useState } from 'react';
import { X, RefreshCw, Sparkles, Wand2, ArrowRight, Palette, Check } from 'lucide-react';
import { playChimeSound } from '../utils/kidAudio';
import { ArtStyle } from '../types';
import { ART_STYLES, getArtStyleDefinition } from '../utils/artStyles';

interface BatchRegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  childName: string;
  pageCount: number;
  currentArtStyle?: ArtStyle;
  isBatchGenerating: boolean;
  batchProgress: {
    current: number;
    total: number;
    pageTitle: string;
    percent: number;
  } | null;
  onBatchRegenerate: (newTheme?: string, refreshPlan?: boolean, newArtStyle?: ArtStyle) => Promise<void>;
}

export const BatchRegenerateModal: React.FC<BatchRegenerateModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  childName,
  pageCount,
  currentArtStyle = 'classic',
  isBatchGenerating,
  batchProgress,
  onBatchRegenerate,
}) => {
  const [themeInput, setThemeInput] = useState(currentTheme);
  const [selectedArtStyle, setSelectedArtStyle] = useState<ArtStyle>(currentArtStyle);
  const [refreshPlan, setRefreshPlan] = useState(true);

  if (!isOpen) return null;

  const handleStart = async () => {
    playChimeSound('magic');
    const trimmed = themeInput.trim();
    const targetTheme = trimmed.length > 0 ? trimmed : currentTheme;
    await onBatchRegenerate(targetTheme, refreshPlan, selectedArtStyle);
  };

  const QUICK_THEME_REFRESH_IDEAS = [
    'Space Dinosaurs with Glowing Star Armor',
    'Underwater Mermaid Puppy Kingdom',
    'Enchanted Treehouse Bakery & Woodland Friends',
    'Superhero Animals Saving the City',
    'Magical Safari Train with Flying Rainbow Birds',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border-4 border-amber-300 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-amber-500 via-amber-400 to-yellow-300 px-6 py-4 flex items-center justify-between border-b-2 border-amber-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/90 shadow-xs flex items-center justify-center text-xl">
              🔄
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-950 flex items-center gap-2">
                Batch Regenerate All Pages
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-400 font-extrabold uppercase">
                  1-Click Refresh
                </span>
              </h2>
              <p className="text-xs font-semibold text-amber-950/80">
                Refresh your theme and redraw all {pageCount} pages automatically!
              </p>
            </div>
          </div>
          {!isBatchGenerating && (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-amber-950 flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {isBatchGenerating ? (
            /* Running Progress State */
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin flex items-center justify-center" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl select-none">🎨</span>
                </div>
              </div>

              <div className="space-y-1.5 max-w-md">
                <span className="text-xs font-black uppercase tracking-wider text-amber-700 block">
                  Batch Theme Refreshing in Progress...
                </span>
                <h3 className="text-base font-extrabold text-gray-900">
                  {batchProgress?.pageTitle
                    ? `Redrawing: "${batchProgress.pageTitle}"`
                    : 'Planning & redrawing all pages...'}
                </h3>
                <p className="text-xs text-gray-600 font-medium">
                  Page {batchProgress?.current || 1} of {batchProgress?.total || pageCount} • High-Resolution Line Art
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md bg-gray-100 rounded-full h-3.5 border border-gray-200 overflow-hidden shadow-inner">
                <div
                  className="bg-linear-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.min(100, Math.max(5, batchProgress?.percent || 10))}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Please keep this window open while Gemini creates your fresh coloring book scenes!
              </p>
            </div>
          ) : (
            /* Configuration & 1-Click Trigger State */
            <div className="space-y-4">
              {/* Theme Input & Refresh Option */}
              <div className="bg-amber-50/80 rounded-2xl p-4 border-2 border-amber-200 space-y-2">
                <label className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center justify-between">
                  <span>Current or Refreshed Theme:</span>
                  <span className="text-[10px] text-amber-700 font-semibold">Tweak to refresh ideas</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    placeholder="Enter coloring book theme..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-amber-300 text-sm font-bold text-gray-900 focus:outline-hidden focus:border-amber-500 shadow-2xs"
                  />
                  {themeInput !== currentTheme && (
                    <button
                      type="button"
                      onClick={() => setThemeInput(currentTheme)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100 px-2 py-1 rounded-md"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Quick Inspiration Pills */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-gray-600 block mb-1.5">
                    Or pick a fresh themed twist for {childName}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_THEME_REFRESH_IDEAS.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => {
                          setThemeInput(idea);
                          playChimeSound('pop');
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102"
                      >
                        + {idea}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Art Style Selector */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-600" />
                    Artistic Line Style:
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-300">
                    Active: {getArtStyleDefinition(selectedArtStyle).name}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ART_STYLES.map((style) => {
                    const isSelected = selectedArtStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedArtStyle(style.id)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500/20'
                            : 'border-gray-200 hover:border-amber-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-base select-none">{style.emoji}</span>
                          {isSelected && (
                            <span className="w-3.5 h-3.5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                              <Check className="w-2 h-2" />
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-[11px] text-gray-900 leading-tight">
                          {style.name}
                        </div>
                        <div className="text-[9px] text-gray-500 truncate mt-0.5">
                          {style.tagline}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Refresh Mode Switch */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs space-y-2">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wide block">
                  Batch Regeneration Scope:
                </span>
                <label className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-50/50 border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refreshPlan}
                    onChange={(e) => setRefreshPlan(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 border-gray-300 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-black text-amber-950 block">
                      Refresh Scene Prompts & Story Captions with Gemini
                    </span>
                    <span className="text-[11px] text-gray-600 leading-tight block">
                      Generates fresh new story scenes, captions, and coloring tips tailored to the updated theme before redrawing.
                    </span>
                  </div>
                </label>
              </div>

              {/* Notice */}
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center gap-2.5 text-xs text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  All <strong>{pageCount} pages</strong> in this book will be redrawn with clean, printable line-art.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isBatchGenerating && (
          <div className="bg-amber-50/70 p-4 border-t border-amber-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleStart}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black transition-all cursor-pointer shadow-md hover:scale-102 active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>⚡ Batch Regenerate All {pageCount} Pages Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
