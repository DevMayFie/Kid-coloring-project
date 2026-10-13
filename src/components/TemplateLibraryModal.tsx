import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  ArrowRight,
  Filter,
  Layers,
  Palette,
  Check,
} from 'lucide-react';
import { PREMADE_TEMPLATES, PremadeTemplate } from '../utils/premadeTemplates';
import { ColoringBook } from '../types';
import { playChimeSound } from '../utils/kidAudio';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (book: ColoringBook) => void;
  currentChildName?: string;
}

export const TemplateLibraryModal: React.FC<TemplateLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentChildName = 'Leo',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [personalizeName, setPersonalizeName] = useState<string>(currentChildName);
  const [selectedTemplate, setSelectedTemplate] = useState<PremadeTemplate | null>(null);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Books' },
    { id: 'space', label: 'Space & Dinos' },
    { id: 'ocean', label: 'Ocean & Sea' },
    { id: 'fantasy', label: 'Unicorns & Magic' },
    { id: 'superhero', label: 'Hero Pups' },
    { id: 'animals', label: 'Jungle Safari' },
    { id: 'adventure', label: 'Trucks & Cars' },
  ];

  const filtered = PREMADE_TEMPLATES.filter((tpl) => {
    if (selectedCategory === 'all') return true;
    return tpl.category === selectedCategory;
  });

  const handleApply = (tpl: PremadeTemplate) => {
    const finalChildName = personalizeName.trim() || tpl.childName;
    const personalizedBook: ColoringBook = {
      ...tpl.book,
      id: `tpl-${tpl.id}-${Date.now()}`,
      childName: finalChildName,
      title: tpl.title.replace(new RegExp(tpl.childName, 'gi'), finalChildName),
      subtitle: tpl.subtitle,
      dedication: tpl.dedication.replace(new RegExp(tpl.childName, 'gi'), finalChildName),
      createdAt: Date.now(),
      pages: tpl.book.pages.map((p) => ({
        ...p,
        storyCaption: p.storyCaption.replace(new RegExp(tpl.childName, 'gi'), finalChildName),
      })),
    };

    playChimeSound('fanfare');
    onSelectTemplate(personalizedBook);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-amber-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-amber-100 dark:border-slate-800 bg-linear-to-r from-amber-50 via-orange-50/50 to-amber-50 dark:from-slate-900 dark:to-slate-850 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">📚</span>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-slate-100">
                Ready-to-Color Template Books
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                Instant • No Wait
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
              Pick a professionally designed coloring book. Instant full pages, cover art, and printable PDF with zero AI generation wait time.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Child Personalization Strip */}
        <div className="px-4 sm:px-6 py-3 bg-amber-100/60 dark:bg-slate-850 border-b border-amber-200/60 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">
              Personalize For:
            </span>
            <input
              type="text"
              value={personalizeName}
              onChange={(e) => setPersonalizeName(e.target.value.slice(0, 30))}
              placeholder="Child's name"
              className="px-3 py-1 bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 w-36"
            />
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white/80 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-white border border-amber-200/60 dark:border-slate-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tpl) => {
            const displayTitle = tpl.title.replace(
              new RegExp(tpl.childName, 'gi'),
              personalizeName.trim() || tpl.childName
            );

            return (
              <div
                key={tpl.id}
                className="group bg-white dark:bg-slate-850 rounded-2xl border border-amber-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 p-4 flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="space-y-3">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-3xl p-2 rounded-xl bg-amber-50 dark:bg-slate-800 border border-amber-100 dark:border-slate-700 group-hover:scale-105 transition-transform">
                      {tpl.emoji}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300">
                      {tpl.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-sm text-gray-900 dark:text-slate-100 line-clamp-1">
                      {displayTitle}
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      {tpl.theme} • {tpl.pageCount} Pages
                    </p>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {tpl.description}
                  </p>

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {tpl.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="pt-4 mt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 dark:text-slate-500 capitalize">
                    {tpl.difficulty} lines
                  </span>
                  <button
                    onClick={() => handleApply(tpl)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    <span>Load Book</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-slate-850 border-t border-amber-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
          <span>✨ Instant templates load immediately without using AI tokens or wait times.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-750 font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
