import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  RotateCcw,
  Check,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { ColoringPage } from '../types';
import { playChimeSound } from '../utils/kidAudio';

interface PageReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: ColoringPage[];
  onSaveOrder: (newPages: ColoringPage[]) => void;
  childName: string;
}

export const PageReorderModal: React.FC<PageReorderModalProps> = ({
  isOpen,
  onClose,
  pages,
  onSaveOrder,
  childName,
}) => {
  const [orderedPages, setOrderedPages] = useState<ColoringPage[]>(pages);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sync state whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setOrderedPages([...pages]);
    }
  }, [isOpen, pages]);

  if (!isOpen) return null;

  // Move page up / left
  const handleMovePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedPages.length) return;
    const newItems = [...orderedPages];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    setOrderedPages(newItems);
    playChimeSound('pop');
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // set small drag preview if needed
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newItems = [...orderedPages];
    const [moved] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, moved);
    setOrderedPages(newItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
    playChimeSound('sparkle');
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Reverse sequence
  const handleReverseOrder = () => {
    setOrderedPages([...orderedPages].reverse());
    playChimeSound('pop');
  };

  // Reset to original
  const handleResetOrder = () => {
    setOrderedPages([...pages]);
    playChimeSound('pop');
  };

  // Save changes
  const handleSave = () => {
    onSaveOrder(orderedPages);
    playChimeSound('fanfare');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Arrange Story Sequence"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 text-gray-900 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-amber-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Arrange Story Sequence
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {orderedPages.length} Pages
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Drag cards or use arrows to adjust the narrative flow of {childName}'s coloring book.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Quick Actions */}
        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2 text-xs">
          <span className="text-gray-500 flex items-center gap-1.5 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            Story order will be reflected in 3D FlipBook and PDF printouts
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReverseOrder}
              className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium hover:border-gray-300 transition-colors cursor-pointer flex items-center gap-1"
              title="Reverse page order"
            >
              <RotateCcw className="w-3 h-3 text-gray-500" />
              Reverse
            </button>
            <button
              onClick={handleResetOrder}
              className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium hover:border-gray-300 transition-colors cursor-pointer"
              title="Reset to initial order"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Reorderable List / Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 select-none">
          <AnimatePresence>
            {orderedPages.map((page, index) => {
              const isDragging = draggedIndex === index;
              const isOver = dragOverIndex === index;

              return (
                <div
                  key={page.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 cursor-grab active:cursor-grabbing ${
                    isDragging
                      ? 'opacity-40 border-dashed border-amber-400 bg-amber-50/50'
                      : isOver
                      ? 'border-amber-500 bg-amber-50/70 shadow-md scale-101'
                      : 'border-gray-200 bg-white hover:border-amber-300 hover:shadow-xs'
                  }`}
                >
                  {/* Grip Handle */}
                  <div className="text-gray-400 group-hover:text-amber-500 cursor-grab shrink-0 p-1">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Sequential Number Badge */}
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-500 to-orange-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-14 h-18 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {page.coloredImageUrl || page.imageUrl ? (
                      <img
                        src={page.coloredImageUrl || page.imageUrl}
                        alt={page.title}
                        className="w-full h-full object-contain p-0.5 bg-white"
                      />
                    ) : (
                      <BookOpen className="w-5 h-5 text-gray-300" />
                    )}
                  </div>

                  {/* Title & Story Preview */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900 truncate">
                        {page.title}
                      </h4>
                      {page.isHeroPage && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700 font-bold">
                          Hero Art
                        </span>
                      )}
                      {page.coloredImageUrl && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-700 font-bold">
                          Colored
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {page.storyCaption || 'No caption'}
                    </p>
                    {page.secondaryCaption && (
                      <p className="text-[11px] text-gray-400 italic line-clamp-1">
                        ★ {page.secondaryCaption}
                      </p>
                    )}
                  </div>

                  {/* Move Up / Move Down Arrow Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePage(index, index - 1);
                      }}
                      className="w-7 h-7 rounded-lg border border-gray-200 bg-gray-50 hover:bg-amber-100 hover:text-amber-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer text-gray-600"
                      title="Move Earlier"
                    >
                      <ChevronLeft className="w-4 h-4 rotate-90 sm:rotate-0" />
                    </button>
                    <button
                      type="button"
                      disabled={index === orderedPages.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePage(index, index + 1);
                      }}
                      className="w-7 h-7 rounded-lg border border-gray-200 bg-gray-50 hover:bg-amber-100 hover:text-amber-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer text-gray-600"
                      title="Move Later"
                    >
                      <ChevronRight className="w-4 h-4 rotate-90 sm:rotate-0" />
                    </button>
                  </div>
                </div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Bottom Actions */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Save Story Sequence
          </button>
        </div>
      </div>
    </div>
  );
};
