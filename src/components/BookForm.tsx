import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  User,
  Layers,
  Sliders,
  ChevronDown,
  Check,
  HelpCircle,
  FileText,
  Plus,
  Minus,
  Paintbrush,
  Compass,
  BookOpen,
  Lightbulb,
  Loader2,
  RefreshCw,
  X,
  ArrowRight,
  Hash,
  PenTool,
  Globe,
  Heart,
} from 'lucide-react';
import { ImageResolution, AspectRatio, ColoringDifficulty, ActivityMode, BookLanguage } from '../types';
import { POPULAR_THEMES } from '../utils/sampleData';
import { KidStoryBuilder } from './KidStoryBuilder';
import { playChimeSound } from '../utils/kidAudio';

export interface InspirationTheme {
  theme: string;
  suggestedTitle: string;
  description: string;
  emoji: string;
  tag: string;
  sampleScenes?: string[];
}

interface BookFormProps {
  initialTheme: string;
  initialChildName: string;
  initialCustomTitle?: string;
  initialDedicationAuthor?: string;
  initialPageCount?: number;
  initialDifficulty?: ColoringDifficulty;
  initialActivityMode?: ActivityMode;
  initialResolution: ImageResolution;
  initialAspectRatio: AspectRatio;
  isGenerating: boolean;
  onGenerateBook: (options: {
    theme: string;
    childName: string;
    customTitle?: string;
    dedicationAuthor?: string;
    pageCount: number;
    difficulty: ColoringDifficulty;
    activityMode: ActivityMode;
    secondaryLanguage?: BookLanguage;
    resolution: ImageResolution;
    aspectRatio: AspectRatio;
    userNotes?: string;
  }) => Promise<void>;
}

export const BookForm: React.FC<BookFormProps> = ({
  initialTheme,
  initialChildName,
  initialCustomTitle = '',
  initialDedicationAuthor = '',
  initialPageCount = 5,
  initialDifficulty = 'standard',
  initialActivityMode = 'standard',
  initialResolution,
  initialAspectRatio,
  isGenerating,
  onGenerateBook,
}) => {
  const [theme, setTheme] = useState(initialTheme);
  const [childName, setChildName] = useState(initialChildName);
  const [customTitle, setCustomTitle] = useState(initialCustomTitle);
  const [dedicationAuthor, setDedicationAuthor] = useState(initialDedicationAuthor);
  const [pageCount, setPageCount] = useState<number>(initialPageCount);
  const [difficulty, setDifficulty] = useState<ColoringDifficulty>(initialDifficulty);
  const [activityMode, setActivityMode] = useState<ActivityMode>(initialActivityMode);
  const [secondaryLanguage, setSecondaryLanguage] = useState<BookLanguage | ''>('');
  const [resolution, setResolution] = useState<ImageResolution>(initialResolution);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialAspectRatio);
  const [userNotes, setUserNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [themeMode, setThemeMode] = useState<'kid-magic' | 'custom'>('kid-magic');

  // Theme Inspiration state
  const [inspirationThemes, setInspirationThemes] = useState<InspirationTheme[]>([]);
  const [isLoadingInspiration, setIsLoadingInspiration] = useState(false);
  const [showInspirationPanel, setShowInspirationPanel] = useState(false);
  const [inspirationError, setInspirationError] = useState<string | null>(null);

  const handleGetInspiration = async () => {
    setIsLoadingInspiration(true);
    setInspirationError(null);
    setShowInspirationPanel(true);
    playChimeSound('magic');

    try {
      const response = await fetch('/api/inspire-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: childName.trim(),
        }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.themes) && data.themes.length > 0) {
        setInspirationThemes(data.themes);
      } else {
        throw new Error(data.error || 'Could not fetch creative themes.');
      }
    } catch (err: any) {
      console.error('Error getting inspiration:', err);
      setInspirationError(err.message || 'Failed to load theme ideas. Please try again.');
    } finally {
      setIsLoadingInspiration(false);
    }
  };

  const handleApplyInspiration = (item: InspirationTheme) => {
    setTheme(item.theme);
    if (item.suggestedTitle) {
      setCustomTitle(item.suggestedTitle);
    }
    playChimeSound('sparkle');
  };

  // Check if current theme matches one of the popular presets
  const matchedPreset = POPULAR_THEMES.find(
    (item) => item.theme.toLowerCase() === theme.trim().toLowerCase()
  );
  const dropdownValue = matchedPreset ? matchedPreset.theme : 'custom';

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      // Keep existing custom or clear if it matched a preset
      if (matchedPreset) {
        setTheme('');
      }
    } else {
      setTheme(val);
    }
  };

  const handleSelectPresetChip = (presetTheme: string) => {
    setTheme(presetTheme);
  };

  const handleSelectStarterTheme = (item: (typeof POPULAR_THEMES)[0]) => {
    setTheme(item.theme);
    if (item.suggestedTitle) {
      setCustomTitle(item.suggestedTitle);
    }
    playChimeSound('sparkle');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim() || !childName.trim() || isGenerating) return;
    const validatedPageCount = Math.max(1, Math.min(12, Number(pageCount) || 5));
    onGenerateBook({
      theme: theme.trim(),
      childName: childName.trim(),
      customTitle: customTitle.trim() || undefined,
      dedicationAuthor: dedicationAuthor.trim() || undefined,
      pageCount: validatedPageCount,
      difficulty,
      activityMode,
      secondaryLanguage: secondaryLanguage || undefined,
      resolution,
      aspectRatio,
      userNotes: userNotes.trim(),
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-200/90 shadow-sm p-5 sm:p-7">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title and intro banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              <span className="text-amber-600">Create a New Coloring Book</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              Personalized {pageCount}-page story adventure with custom cover, coloring suggestions, fun facts & thick black outlines.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Ready to Print & Color
          </span>
        </div>

        {/* Primary Row 1: Child's Name & Number of Pages */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          {/* Child Name */}
          <div className="sm:col-span-7">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="child-name-input" className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600" />
                Child's First Name
              </label>
              <button
                type="button"
                id="get-inspiration-btn"
                onClick={handleGetInspiration}
                disabled={isLoadingInspiration}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-60 active:scale-95"
                title="Get 3 creative, trending coloring book themes tailored to this child's name"
              >
                {isLoadingInspiration ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-3 h-3 text-yellow-200" />
                    <span>Get Inspiration</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                id="child-name-input"
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="e.g., Leo, Maya, Oliver..."
                required
                maxLength={30}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-amber-500 focus:ring-3 focus:ring-amber-200/50 text-sm font-semibold text-gray-900 placeholder:text-gray-400 bg-amber-50/20 transition-all outline-hidden"
              />
            </div>
            <span className="text-[11px] text-gray-500 mt-1 block">
              Printed prominently on the cover & across all coloring pages
            </span>
          </div>

          {/* Number of Pages Selector (Default: 5) */}
          <div className="sm:col-span-5">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="page-count-input" className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                Number of Pages
              </label>
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 font-bold">
                Default: 5
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-gray-300 rounded-xl bg-amber-50/20 overflow-hidden focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200/50">
                <button
                  type="button"
                  onClick={() => setPageCount((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-2.5 hover:bg-amber-100 text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Decrease page count"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  id="page-count-input"
                  type="number"
                  min={1}
                  max={12}
                  value={pageCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setPageCount(Math.max(1, Math.min(12, val)));
                    } else {
                      setPageCount(5);
                    }
                  }}
                  className="w-12 text-center text-sm font-bold text-gray-900 py-2 outline-hidden bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setPageCount((prev) => Math.min(12, prev + 1))}
                  className="px-3 py-2.5 hover:bg-amber-100 text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Increase page count"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                {[3, 5, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPageCount(num)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      pageCount === num
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[11px] text-gray-500 mt-1 block">
              Distinct black-and-white scenes (1 to 12)
            </span>
          </div>
        </div>

        {/* AI Theme Inspiration Panel */}
        {showInspirationPanel && (
          <div
            id="inspiration-themes-panel"
            className="bg-linear-to-br from-amber-50/95 via-orange-50/80 to-yellow-50/90 border-2 border-amber-300/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 transition-all"
          >
            <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight flex items-center gap-1.5">
                    <span>Trending Theme Inspiration</span>
                    {childName.trim() ? (
                      <span className="text-amber-800 font-semibold">for {childName.trim()}</span>
                    ) : (
                      <span className="text-gray-500 font-normal text-xs">(Enter child name above to personalize)</span>
                    )}
                  </h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Select any trending theme to auto-fill the story adventure & matching book title
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="refresh-inspiration-btn"
                  onClick={handleGetInspiration}
                  disabled={isLoadingInspiration}
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-white/90 hover:bg-white border border-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Generate 3 fresh creative themes"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingInspiration ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">New Ideas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInspirationPanel(false)}
                  className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
                  title="Close theme inspiration"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isLoadingInspiration ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-gray-800">
                    Brainstorming 3 creative trending themes{childName.trim() ? ` for ${childName.trim()}` : ''}...
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Generating imaginative adventures, catchy titles, and fun scenes to color
                  </p>
                </div>
              </div>
            ) : inspirationError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
                <span>{inspirationError}</span>
                <button
                  type="button"
                  onClick={handleGetInspiration}
                  className="font-bold underline text-red-800 ml-2 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {inspirationThemes.map((item, idx) => {
                  const isSelected = theme.toLowerCase() === item.theme.toLowerCase();
                  return (
                    <div
                      key={idx}
                      id={`inspiration-card-${idx}`}
                      onClick={() => handleApplyInspiration(item)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-amber-100/90 border-amber-500 ring-2 ring-amber-400/50 shadow-xs'
                          : 'bg-white/95 hover:bg-white border-amber-200 hover:border-amber-400 hover:shadow-2xs'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-2xl select-none" role="img" aria-label="theme emoji">
                            {item.emoji}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-900 border border-amber-200/80">
                            {item.tag}
                          </span>
                        </div>
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-amber-900 transition-colors">
                            {item.theme}
                          </h5>
                          <p className="text-[11px] text-amber-900 font-semibold line-clamp-1 italic mt-0.5">
                            &ldquo;{item.suggestedTitle}&rdquo;
                          </p>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                        {item.sampleScenes && item.sampleScenes.length > 0 && (
                          <div className="pt-1 space-y-0.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              Scenes include:
                            </span>
                            <ul className="text-[10px] text-gray-500 space-y-0.5 pl-3 list-disc">
                              {item.sampleScenes.slice(0, 2).map((scene, sIdx) => (
                                <li key={sIdx} className="line-clamp-1">
                                  {scene}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 mt-2.5 border-t border-amber-100/80 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Theme Applied</span>
                            </>
                          ) : (
                            <>
                              <span>Use this theme</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-semibold">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Preferred Coloring Book Title (Explicitly overrides default generated title) */}
        <div className="space-y-1.5 pt-0.5" id="preferred-book-title-container">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label
              htmlFor="custom-book-title-input"
              className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              Preferred Book Title (Optional)
            </label>
            <span className="text-[11px] text-amber-900 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-md font-semibold self-start sm:self-auto">
              Overrides default generated title
            </span>
          </div>
          <div className="relative">
            <input
              id="custom-book-title-input"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={
                childName.trim()
                  ? `Leave blank to auto-generate "${childName}'s ${theme.trim() || 'Adventure'} Coloring Book", or type your preferred title...`
                  : 'e.g., Maya\'s Magical Safari Adventure (or leave blank to auto-generate)...'
              }
              maxLength={70}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-amber-500 focus:ring-3 focus:ring-amber-200/50 text-sm font-semibold text-gray-900 placeholder:text-gray-400 bg-amber-50/20 transition-all outline-hidden pr-16"
            />
            {customTitle && (
              <button
                type="button"
                onClick={() => setCustomTitle('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                title="Clear preferred title"
              >
                Clear
              </button>
            )}
          </div>
          <span className="text-[11px] text-gray-500 block">
            {customTitle.trim() ? (
              <span className="text-amber-800 font-medium">
                ⭐ Custom title active: <strong>&ldquo;{customTitle.trim()}&rdquo;</strong> will be printed on the cover, pages, and exported PDF.
              </span>
            ) : (
              'Leave blank to let AI generate a cheerful title, or type your own to customize the cover.'
            )}
          </span>
        </div>

        {/* 1-Click Starter Themes Gallery (Instant inspiration) */}
        <div className="pt-2 pb-1 space-y-2.5" id="starter-themes-gallery">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <span className="text-base select-none">🎨</span>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                1-Click Starter Themes
              </label>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                Tap to Auto-Fill
              </span>
            </div>
            <span className="text-[11px] text-gray-500">
              Pick a theme to instantly set adventure &amp; title
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {POPULAR_THEMES.map((item) => {
              const isSelected = theme.trim().toLowerCase() === item.theme.toLowerCase();
              return (
                <button
                  key={item.theme}
                  type="button"
                  onClick={() => handleSelectStarterTheme(item)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group relative ${
                    isSelected
                      ? 'bg-amber-100/90 border-amber-500 ring-2 ring-amber-400/80 shadow-xs scale-101'
                      : 'bg-white hover:bg-amber-50/70 border-gray-200/90 hover:border-amber-300 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <span className="text-2xl select-none group-hover:scale-115 transition-transform">
                      {item.emoji}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-gray-100 text-gray-600 group-hover:bg-amber-100 group-hover:text-amber-900'
                      }`}
                    >
                      {item.tag}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-xs text-gray-900 group-hover:text-amber-950 flex items-center justify-between gap-1">
                      <span className="truncate">{item.theme}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-500 leading-snug line-clamp-1 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Row 2: Theme Selection with Kid Magic Builder Tab */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Story Theme & Adventure
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="theme-section-inspiration-btn"
                onClick={handleGetInspiration}
                disabled={isLoadingInspiration}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100/90 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-60 shadow-2xs active:scale-95"
                title="AI generates 3 creative, trending themes"
              >
                {isLoadingInspiration ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                ) : (
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>Get Inspiration</span>
              </button>

              {/* Mode Switch Tabs */}
              <div className="inline-flex p-1 bg-amber-100/70 border border-amber-300/80 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setThemeMode('kid-magic')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    themeMode === 'kid-magic'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-900 hover:text-amber-950'
                  }`}
                >
                  <span>✨ Kid Magic Builder</span>
                  <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-full hidden sm:inline">
                    Interactive
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('custom')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    themeMode === 'custom'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-900 hover:text-amber-950'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Text / Presets</span>
                </button>
              </div>
            </div>
          </div>

          {themeMode === 'kid-magic' ? (
            <div className="space-y-3">
              <KidStoryBuilder
                childName={childName}
                currentTheme={theme}
                onApplyTheme={(appliedTheme) => {
                  setTheme(appliedTheme);
                }}
              />
              <div className="flex items-center gap-2 p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs">
                <span className="font-bold text-amber-900 shrink-0">Selected Theme:</span>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Theme preview..."
                  className="flex-1 font-semibold text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-amber-200 text-xs outline-hidden focus:border-amber-500"
                />
                <span className="text-[10px] text-gray-500 hidden sm:inline">Editable above</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* Theme Dropdown Selection */}
                <div className="sm:col-span-5">
                  <label htmlFor="popular-theme-dropdown" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Popular Theme Dropdown
                  </label>
                  <select
                    id="popular-theme-dropdown"
                    value={dropdownValue}
                    onChange={handleDropdownChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-amber-500 focus:ring-3 focus:ring-amber-200/50 text-sm font-semibold text-gray-900 bg-white cursor-pointer outline-hidden transition-all"
                  >
                    <option value="custom">✏️ Custom Theme (Type below)</option>
                    {POPULAR_THEMES.map((pt) => (
                      <option key={pt.theme} value={pt.theme}>
                        {pt.emoji} {pt.theme}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Select a popular theme or write your own
                  </span>
                </div>

                {/* Custom Theme Input */}
                <div className="sm:col-span-7">
                  <label htmlFor="theme-input" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Custom Theme or Selected Theme
                  </label>
                  <div className="relative">
                    <input
                      id="theme-input"
                      type="text"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="e.g., Jungle Animals, Space Dinosaurs, Underwater Mermaid..."
                      required
                      maxLength={60}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-amber-500 focus:ring-3 focus:ring-amber-200/50 text-sm font-semibold text-gray-900 placeholder:text-gray-400 bg-amber-50/20 transition-all outline-hidden"
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Type any custom theme or edit the selected preset
                  </span>
                </div>
              </div>

              {/* Quick Popular Theme Selection Chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Quick 5 Popular Themes:
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium">Click to pick</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_THEMES.slice(0, 5).map((item) => {
                    const isSelected = theme.toLowerCase() === item.theme.toLowerCase();
                    return (
                      <button
                        key={item.theme}
                        type="button"
                        onClick={() => handleSelectPresetChip(item.theme)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-semibold'
                            : 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border-amber-200/70'
                        }`}
                      >
                        <span>{item.emoji}</span>
                        <span>{item.theme}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      if (matchedPreset) setTheme('');
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 border ${
                      dropdownValue === 'custom'
                        ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    <span>✏️</span>
                    <span>Custom Theme</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACTIVITY PUZZLE MODE (Standard Storybook, Color by Numbers, Dot-to-Dot Puzzle) */}
        <div className="pt-2 border-t border-gray-100" id="activity-mode-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Activity & Puzzle Style
            </label>
            <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md font-semibold self-start sm:self-auto">
              Choose play style for every page
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="activity-mode-selector">
            {[
              {
                id: 'standard' as ActivityMode,
                emoji: '🎨',
                name: 'Storybook Art',
                tagline: 'Classic Coloring',
                desc: 'Open-ended story scenes with bold outlines. Kids freely choose all their colors.',
              },
              {
                id: 'color-by-numbers' as ActivityMode,
                emoji: '🔢',
                name: 'Color by Numbers',
                tagline: 'Numbered Compartments',
                desc: 'Numbered shapes with matching color legend key [1–6]. Great for number recognition!',
              },
              {
                id: 'dot-to-dot' as ActivityMode,
                emoji: '✏️',
                name: 'Dot-to-Dot Puzzle',
                tagline: 'Connect the Dots',
                desc: 'Numbered dots (1–25) outlining the main character. Connect the lines, then color in!',
              },
            ].map((mode) => {
              const isSelected = activityMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  id={`activity-mode-btn-${mode.id}`}
                  onClick={() => {
                    setActivityMode(mode.id);
                    playChimeSound('pop');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/90 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-gray-200 hover:border-amber-300 bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base select-none">{mode.emoji}</span>
                        <span className="font-bold text-sm text-gray-900">{mode.name}</span>
                      </div>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-amber-900 mb-1">{mode.tagline}</div>
                    <p className="text-[11px] text-gray-600 leading-snug">{mode.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* DIFFICULTY SELECTOR (Ranges from 'simple thick lines for toddlers' to 'intricate patterns for older children') */}
        <div className="pt-2 border-t border-gray-100" id="difficulty-selector-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5 text-amber-600" />
              Coloring Line Difficulty
            </label>
            <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md font-semibold self-start sm:self-auto">
              Adjusts AI line prompts & detail density
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="coloring-difficulty-selector">
            {[
              {
                id: 'toddler' as ColoringDifficulty,
                emoji: '🖍️',
                name: 'Toddler',
                age: 'Ages 1–3',
                tagline: 'Simple thick lines for toddlers',
                desc: 'Massive ultra-thick outlines & giant open shapes. Zero clutter, ideal for chunky crayons or fingers.',
                bestWith: 'Best with Chunky Crayons',
                strokeWeight: 'heavy',
              },
              {
                id: 'standard' as ColoringDifficulty,
                emoji: '🎨',
                name: 'Kids Standard',
                age: 'Ages 4–7',
                tagline: 'Classic bold outlines',
                desc: 'Clean bold line art with playful storytelling elements and balanced spaces for coloring markers.',
                bestWith: 'Best with Markers & Crayons',
                strokeWeight: 'medium',
              },
              {
                id: 'intricate' as ColoringDifficulty,
                emoji: '✒️',
                name: 'Older Children',
                age: 'Ages 8+',
                tagline: 'Intricate patterns for older children',
                desc: 'Detailed fine black line art, decorative zentangles, geometric textures & ornate background scenery.',
                bestWith: 'Best with Colored Pencils & Fine Pens',
                strokeWeight: 'intricate',
              },
            ].map((option) => {
              const isSelected = difficulty === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  id={`difficulty-option-${option.id}`}
                  onClick={() => setDifficulty(option.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/90 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-gray-200 hover:border-amber-300 bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base select-none">{option.emoji}</span>
                        <span className="font-bold text-sm text-gray-900">{option.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {option.age}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-amber-900 mb-1">
                      {option.tagline}
                    </div>

                    {/* Visual line stroke preview */}
                    <div className="w-full h-5 my-1.5 flex items-center px-1.5 bg-white/80 rounded-md border border-gray-100">
                      {option.strokeWeight === 'heavy' && (
                        <div className="w-full h-2 bg-gray-900 rounded-full" title="Extra thick bold stroke" />
                      )}
                      {option.strokeWeight === 'medium' && (
                        <div className="w-full h-1 bg-gray-900 rounded-full" title="Classic bold stroke" />
                      )}
                      {option.strokeWeight === 'intricate' && (
                        <div className="w-full flex items-center gap-1" title="Intricate patterned strokes">
                          <div className="flex-1 h-0.5 bg-gray-900 border-t border-dashed border-gray-900" />
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                          <div className="flex-1 h-0.5 bg-gray-900" />
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                          <div className="flex-1 h-0.5 bg-gray-900 border-t border-dotted border-gray-900" />
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-600 leading-snug mt-1">
                      {option.desc}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-gray-200/60 text-[10px] font-medium text-amber-800 flex items-center justify-between">
                    <span>{option.bestWith}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic AI Prompt Directive Indicator */}
          <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-2 text-xs">
            <span className="text-amber-700 font-bold text-sm leading-none select-none">✨</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-900">
                  Active AI Prompt Directive:
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                  {difficulty === 'toddler' ? 'Simple Thick Lines' : difficulty === 'intricate' ? 'Intricate Patterns' : 'Standard Bold Outlines'}
                </span>
              </div>
              <p className="text-amber-950 font-mono text-[11px] mt-1 leading-snug">
                {difficulty === 'toddler'
                  ? 'Prompt snippet: "Toddler coloring book page, simple thick lines for toddlers, ultra-bold heavy black outlines, giant open shapes for chunky crayons, zero clutter, minimal elements, pure clean white background"'
                  : difficulty === 'intricate'
                  ? 'Prompt snippet: "Intricate coloring book page for older children, intricate patterns for older children, detailed crisp black line art, decorative zentangles, ornate background scenery, complex detailed coloring sections"'
                  : 'Prompt snippet: "Children\'s coloring book page, bold crisp black outlines, pure white background, clear recognizable shapes, playful fun details, large coloring spaces for crayons and markers"'}
              </p>
            </div>
          </div>
        </div>

        {/* IMAGE SIZE AFFORDANCE (Mandatory requirement: 1K, 2K, 4K using gemini-3-pro-image-preview) */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              Image Resolution (gemini-3-pro-image-preview)
            </label>
            <div className="group relative cursor-pointer flex items-center gap-1 text-[11px] text-gray-500">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              <span>Which size to choose?</span>
              <div className="absolute right-0 bottom-full mb-2 w-64 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl hidden group-hover:block z-50 pointer-events-none">
                Higher resolutions (2K & 4K) yield ultra-crisp line weights for razor-sharp physical printing, while 1K generates the fastest.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3" id="image-resolution-selector">
            {(['1K', '2K', '4K'] as ImageResolution[]).map((resOption) => {
              const isSelected = resolution === resOption;
              const details =
                resOption === '1K'
                  ? { label: 'Standard 1K', desc: 'Fastest generation, crisp for regular home print' }
                  : resOption === '2K'
                  ? { label: 'High-Res 2K', desc: 'Recommended: sharp outlines & clean details' }
                  : { label: 'Ultra 4K', desc: 'Maximum fidelity thick lines for photo printers' };

              return (
                <button
                  key={resOption}
                  type="button"
                  onClick={() => setResolution(resOption)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20'
                      : 'border-gray-200 hover:border-amber-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-gray-900">{resOption}</span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-amber-900">{details.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{details.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Options Accordion (Aspect Ratio & Story Instructions) */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Layout & Story Options'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 rounded-xl bg-gray-50/80 border border-gray-200 space-y-4">
              {/* Aspect Ratio */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Page Aspect Ratio
                </label>
                <div className="flex gap-3">
                  {[
                    { id: '3:4', title: '3:4 Portrait', desc: 'Standard 8.5x11" Letter & A4 paper' },
                    { id: '1:1', title: '1:1 Square', desc: 'Modern square coloring booklet' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatio(ratio.id as AspectRatio)}
                      className={`flex-1 p-2.5 rounded-lg border text-left text-xs ${
                        aspectRatio === ratio.id
                          ? 'border-amber-600 bg-amber-50 font-bold text-amber-900'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      <div>{ratio.title}</div>
                      <div className="text-[10px] text-gray-500 font-normal">{ratio.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dedication Author */}
              <div>
                <label htmlFor="dedication-author-input" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Book Dedicated By (Optional)</span>
                </label>
                <input
                  id="dedication-author-input"
                  type="text"
                  value={dedicationAuthor}
                  onChange={(e) => setDedicationAuthor(e.target.value)}
                  placeholder="e.g., Mom & Dad, Grandma & Grandpa, Uncle David, Santa"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:border-amber-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Printed in the dedication box and opening certificate inside the PDF!
                </p>
              </div>

              {/* Bilingual Dual-Language Captions */}
              <div>
                <label htmlFor="secondary-language-select" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span>Bilingual Story Captions (Optional)</span>
                </label>
                <select
                  id="secondary-language-select"
                  value={secondaryLanguage}
                  onChange={(e) => setSecondaryLanguage(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white focus:border-amber-500 focus:outline-hidden"
                >
                  <option value="">English Only (Default)</option>
                  <option value="es">🇪🇸 Spanish (Español)</option>
                  <option value="fr">🇫🇷 French (Français)</option>
                  <option value="de">🇩🇪 German (Deutsch)</option>
                  <option value="it">🇮🇹 Italian (Italiano)</option>
                  <option value="pt">🇧🇷 Portuguese (Português)</option>
                  <option value="ja">🇯🇵 Japanese (日本語)</option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  Generates dual-language rhyming captions with native speech narration in the coloring studio!
                </p>
              </div>

              {/* Extra Story Notes */}
              <div>
                <label htmlFor="user-notes-input" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Custom Story or Character Details (Optional)
                </label>
                <input
                  id="user-notes-input"
                  type="text"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="e.g., Leo loves triceratops, include a racing track, include rhyming poems"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isGenerating || !theme.trim() || !childName.trim()}
            id="generate-coloring-book-btn"
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-800 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Generating {pageCount}-Page Adventure with Gemini...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Generate {pageCount}-Page Coloring Book for {childName || 'Child'}</span>
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-gray-500 mt-2 font-medium">
            Generates a custom cover + {pageCount} black-and-white scenes ({difficulty === 'toddler' ? 'simple thick lines for toddlers' : difficulty === 'intricate' ? 'intricate patterns for older children' : 'classic bold outlines'}) with coloring tips & fun facts in {resolution} resolution ready for PDF export.
          </p>
        </div>
      </form>
    </div>
  );
};
