import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Check, Sparkles, Sliders, Palette } from 'lucide-react';
import { ColoringPage, ImageResolution, ArtStyle } from '../types';
import { ART_STYLES, getArtStyleDefinition } from '../utils/artStyles';

interface PageEditorModalProps {
  page: ColoringPage | null;
  onClose: () => void;
  onSaveAndRegenerate: (pageId: string, updatedData: {
    title: string;
    storyCaption: string;
    prompt: string;
    resolution: ImageResolution;
    artStyle?: ArtStyle;
    funFactOrTip?: string;
  }) => Promise<void>;
  isRegenerating: boolean;
}

export const PageEditorModal: React.FC<PageEditorModalProps> = ({
  page,
  onClose,
  onSaveAndRegenerate,
  isRegenerating,
}) => {
  const [title, setTitle] = useState(page?.title || '');
  const [storyCaption, setStoryCaption] = useState(page?.storyCaption || '');
  const [funFactOrTip, setFunFactOrTip] = useState(page?.funFactOrTip || '');
  const [prompt, setPrompt] = useState(page?.prompt || '');
  const [resolution, setResolution] = useState<ImageResolution>(page?.resolution || '2K');
  const [artStyle, setArtStyle] = useState<ArtStyle>(page?.artStyle || 'classic');

  // Synchronize fields when active page changes
  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setStoryCaption(page.storyCaption);
      setFunFactOrTip(page.funFactOrTip || '');
      setPrompt(page.prompt);
      setResolution(page.resolution || '2K');
      setArtStyle(page.artStyle || 'classic');
    }
  }, [page]);

  if (!page) return null;

  const handleApplyStylePreset = (styleId: ArtStyle) => {
    setArtStyle(styleId);
    const styleDef = getArtStyleDefinition(styleId);
    // Append or replace style directive in prompt
    let cleanPrompt = prompt.trim();
    if (!cleanPrompt.toLowerCase().includes(styleDef.name.toLowerCase())) {
      cleanPrompt = `${cleanPrompt}. ${styleDef.promptDirective}`;
    }
    setPrompt(cleanPrompt);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAndRegenerate(page.id, {
      title,
      storyCaption,
      prompt,
      resolution,
      artStyle,
      funFactOrTip,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border-2 border-gray-900 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-4 bg-amber-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold text-base" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              Edit Coloring Page {page.pageNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Scene Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Scene Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden"
            />
          </div>

          {/* Story Caption */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Story Caption / Rhyme (Printed beneath image)
            </label>
            <textarea
              value={storyCaption}
              onChange={(e) => setStoryCaption(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden"
            />
          </div>

          {/* Coloring Suggestion or Fun Fact */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 flex items-center gap-1.5">
              <span>💡</span>
              <span>Coloring Suggestion or Fun Fact (Printed in text box)</span>
            </label>
            <textarea
              value={funFactOrTip}
              onChange={(e) => setFunFactOrTip(e.target.value)}
              rows={2}
              placeholder="e.g., Make the rocket fiery red! or Did you know T-Rex had tiny arms?"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden"
            />
          </div>

          {/* Quick Art Style Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-600" />
                <span>Art Style Preset</span>
              </label>
              <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Active: {getArtStyleDefinition(artStyle).name}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ART_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleApplyStylePreset(style.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    artStyle === style.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-amber-50 text-gray-700 hover:text-amber-900 border border-gray-200'
                  }`}
                >
                  <span>{style.emoji}</span>
                  <span>{style.name}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Click any style to apply its unique drawing personality to this page's prompt.
            </p>
          </div>

          {/* Image Line Art Prompt */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Art Description Prompt (gemini-3-pro-image-preview)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Engineered with thick black outlines, pure white background, and no gray shading.
            </p>
          </div>

          {/* Resolution Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Target Resolution
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['1K', '2K', '4K'] as ImageResolution[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResolution(r)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                    resolution === r
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white hover:bg-amber-50 text-gray-700 border-gray-300'
                  }`}
                >
                  {r} Size
                </button>
              ))}
            </div>
          </div>

          {/* Current Art Thumbnail */}
          {page.imageUrl && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
              <img
                src={page.imageUrl}
                alt="Current art"
                className="w-14 h-14 object-contain rounded-lg border border-gray-300 bg-white"
              />
              <div className="text-xs text-gray-600">
                <span className="font-semibold block text-gray-900">Current Artwork Loaded</span>
                Saving will regenerate this page with the new prompt and resolution.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRegenerating}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>{isRegenerating ? 'Regenerating Art...' : 'Save & Redraw Page'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
