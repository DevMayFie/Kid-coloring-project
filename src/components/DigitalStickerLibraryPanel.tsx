import React, { useState } from 'react';
import { Sparkles, Search, Layers, X } from 'lucide-react';
import {
  DIGITAL_STICKER_LIBRARY,
  STICKER_CATEGORIES,
  DigitalSticker,
} from '../data/stickerLibrary';
import { playChimeSound } from '../utils/kidAudio';

interface DigitalStickerLibraryPanelProps {
  onSelectSticker: (sticker: DigitalSticker) => void;
  onDragStartSticker?: (sticker: DigitalSticker, e: React.DragEvent) => void;
  className?: string;
  onClose?: () => void;
  totalPlacedCount?: number;
  onClearAllStickers?: () => void;
}

export const DigitalStickerLibraryPanel: React.FC<DigitalStickerLibraryPanelProps> = ({
  onSelectSticker,
  onDragStartSticker,
  className = '',
  onClose,
  totalPlacedCount = 0,
  onClearAllStickers,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredStickers = DIGITAL_STICKER_LIBRARY.filter((s) => {
    const matchesCategory = activeCategory === 'all' || s.theme === activeCategory;
    const matchesSearch =
      searchQuery.trim().length === 0 ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.themeLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDragStart = (sticker: DigitalSticker, e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/json', JSON.stringify(sticker));
    e.dataTransfer.effectAllowed = 'copy';
    playChimeSound('pop');
    onDragStartSticker?.(sticker, e);
  };

  return (
    <div className={`bg-white rounded-2xl border-2 border-amber-300 shadow-sm flex flex-col overflow-hidden ${className}`}>
      {/* Panel Header */}
      <div className="bg-linear-to-r from-amber-400 via-amber-300 to-yellow-200 px-3.5 py-2.5 flex items-center justify-between border-b border-amber-300">
        <div className="flex items-center gap-2">
          <span className="text-xl select-none">✨</span>
          <div>
            <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
              <span>Sticker Library</span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full border border-amber-400 font-extrabold">
                {filteredStickers.length}
              </span>
            </h4>
            <p className="text-[10px] font-semibold text-amber-900/80 leading-none mt-0.5">
              Drag & drop onto your colored page!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {totalPlacedCount > 0 && onClearAllStickers && (
            <button
              type="button"
              onClick={onClearAllStickers}
              className="text-[10px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200 cursor-pointer"
              title="Remove all placed stickers from page"
            >
              Clear ({totalPlacedCount})
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/80 hover:bg-white text-amber-950 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="p-2 border-b border-amber-100 bg-amber-50/40 overflow-x-auto flex gap-1 scrollbar-thin">
        {STICKER_CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                playChimeSound('pop');
              }}
              className={`px-2 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-amber-500 text-white shadow-xs scale-102 font-extrabold'
                  : 'bg-white hover:bg-amber-100 text-gray-700 border border-amber-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="px-2.5 py-1.5 border-b border-gray-100 bg-white">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stickers..."
            className="w-full pl-8 pr-3 py-1 text-xs rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-amber-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Stickers Grid */}
      <div className="p-2.5 overflow-y-auto max-h-60 sm:max-h-72 grid grid-cols-4 sm:grid-cols-4 gap-2">
        {filteredStickers.map((sticker) => (
          <div
            key={sticker.id}
            draggable
            onDragStart={(e) => handleDragStart(sticker, e)}
            onClick={() => {
              onSelectSticker(sticker);
              playChimeSound('sparkle');
            }}
            title={`Drag to place ${sticker.name} onto canvas, or click to place`}
            className="group relative flex flex-col items-center justify-center p-1.5 bg-amber-50/30 hover:bg-amber-100/70 border-2 border-transparent hover:border-amber-400 rounded-2xl cursor-grab active:cursor-grabbing transition-all hover:scale-105 active:scale-95 select-none"
          >
            {/* Sticker Image / Emoji Preview */}
            <div className="relative w-12 h-12 flex items-center justify-center">
              <img
                src={sticker.svgDataUri}
                alt={sticker.name}
                className="w-12 h-12 object-contain pointer-events-none drop-shadow-sm group-hover:drop-shadow-md transition-all"
              />
            </div>
            <span className="text-[10px] font-extrabold text-gray-700 group-hover:text-amber-950 text-center leading-tight truncate w-full mt-0.5">
              {sticker.name}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom Hint */}
      <div className="bg-amber-50 px-3 py-1.5 border-t border-amber-200 text-center">
        <p className="text-[10px] text-amber-900 font-bold">
          💡 Click sticker to add to center, or drag & drop directly onto page!
        </p>
      </div>
    </div>
  );
};
