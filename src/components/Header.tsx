import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  MessageSquare,
  Download,
  Printer,
  BookOpen,
  History,
  Eye,
  Building2,
  Globe,
  MoreVertical,
  ChevronRight,
  Sparkles,
  Compass,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  FolderDown,
  FileCode,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { BrandLogo, getPresetLogoDataUrl } from './BrandLogo';
import { BrandIntegration } from '../types';
import { isSoundMuted, toggleSoundMuted, playChimeSound } from '../utils/kidAudio';
import { purgeAllChildData } from '../utils/dbStorage';

interface HeaderProps {
  childName: string;
  theme: string;
  bookTitle?: string;
  onOpenChat: () => void;
  onDownloadPdf: () => void;
  onDirectPrint: () => void;
  onOpenPrintPreview?: () => void;
  onOpenBrandModal?: () => void;
  onOpenWebsiteModal?: () => void;
  onOpenActivitiesModal?: () => void;
  onOpenTemplates?: () => void;
  onOpenCommunityGallery?: () => void;
  onOpenBookShare?: () => void;
  brandIntegration?: BrandIntegration;
  hasCustomBrand?: boolean;
  isGeneratingPdf: boolean;
  pageCount: number;
  historyCount?: number;
  onScrollToHistory?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  childName,
  theme,
  bookTitle,
  onOpenChat,
  onDownloadPdf,
  onDirectPrint,
  onOpenPrintPreview,
  onOpenBrandModal,
  onOpenWebsiteModal,
  onOpenActivitiesModal,
  onOpenTemplates,
  onOpenCommunityGallery,
  onOpenBookShare,
  brandIntegration,
  hasCustomBrand = false,
  isGeneratingPdf,
  pageCount,
  historyCount = 0,
  onScrollToHistory,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => isSoundMuted());
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync mute state on global event
  useEffect(() => {
    const handleMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ muted: boolean }>;
      setIsMuted(customEvent.detail?.muted ?? isSoundMuted());
    };
    window.addEventListener('colorcraft_sound_toggle', handleMuteChange);
    return () => window.removeEventListener('colorcraft_sound_toggle', handleMuteChange);
  }, []);

  // Close dropdown menu on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    }

    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMoreMenuOpen]);

  const displayTitle =
    bookTitle?.trim() ||
    (childName ? `${childName}'s ${theme || 'Coloring'} Book` : 'Coloring Book');

  const customLogoSrc =
    brandIntegration?.logoUrl ||
    (brandIntegration?.logoPreset
      ? getPresetLogoDataUrl(brandIntegration.logoPreset)
      : null);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-amber-200/70 dark:border-slate-800 px-3 sm:px-6 py-2 shadow-2xs transition-colors isolate">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Book Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
          {/* Main App Brand Logo & Title */}
          <div className="flex items-center shrink-0">
            <BrandLogo size="sm" showText={true} compactOnMobile={true} />
          </div>

          {/* Divider between App Brand and Current Book */}
          <div className="hidden md:block h-5 w-px bg-amber-200 dark:bg-slate-700 shrink-0" />

          {/* Book Title & Page Count (Hidden on smaller screens to prevent crowding) */}
          <div className="hidden md:flex items-center gap-2 min-w-0 overflow-hidden">
            <h1
              className="font-bold text-gray-900 dark:text-slate-100 text-xs sm:text-sm tracking-tight truncate max-w-[140px] lg:max-w-[220px]"
              title={displayTitle}
            >
              {displayTitle}
            </h1>
            <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-slate-800 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-slate-700 shrink-0">
              {pageCount} Pages + Cover
            </span>
          </div>

          {/* Custom Organization Badge (if active) */}
          {brandIntegration?.enabled && (
            <div
              onClick={onOpenBrandModal}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-linear-to-r from-amber-50 to-orange-50 border border-amber-300 text-xs text-amber-900 cursor-pointer hover:border-amber-400 hover:shadow-xs transition-all shrink-0"
              title={`Custom organization brand active: ${brandIntegration.organizationName}. Click to edit.`}
            >
              {customLogoSrc ? (
                <img
                  src={customLogoSrc}
                  alt={brandIntegration.organizationName}
                  className="w-3.5 h-3.5 object-contain rounded-full bg-white shadow-2xs p-0.5"
                />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
              )}
              <span className="font-medium text-[11px] truncate max-w-[110px]">
                {brandIntegration.organizationName}
              </span>
            </div>
          )}
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Direct Print Button (Desktop: xl+) */}
          <button
            onClick={onDirectPrint}
            title="Print entire coloring book"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            id="print-book-btn"
          >
            <Printer className="w-3.5 h-3.5 text-gray-600 dark:text-slate-400" />
            <span>Print</span>
          </button>

          {/* AI Story Chat Assistant */}
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 text-xs font-semibold transition-colors cursor-pointer"
            id="desktop-chat-btn"
            title="Open AI Story Assistant"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">Story Chat</span>
          </button>

          {/* Sound / Quiet Mode Toggle (Classroom & bedtime friendly - hidden on mobile, accessible in More menu) */}
          <button
            type="button"
            onClick={() => {
              const next = toggleSoundMuted();
              setIsMuted(next);
              if (!next) playChimeSound('sparkle');
            }}
            title={isMuted ? 'Quiet Mode is ON (Click to unmute sound effects)' : 'Sound is ON (Click to enable Quiet Mode)'}
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            className={`hidden sm:flex items-center justify-center p-1.5 sm:px-2 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              isMuted
                ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700'
                : 'bg-amber-50/80 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-slate-700 hover:border-amber-300'
            }`}
            id="header-quiet-mode-btn"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 shrink-0" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
          </button>

          {/* Download Full PDF Button (Always prominent) */}
          <button
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
            id="download-pdf-btn"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{isGeneratingPdf ? '...' : 'PDF Book'}</span>
          </button>

          {/* Global Dark Mode Toggle (hidden on mobile, accessible in More menu) */}
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={() => {
                onToggleDarkMode();
                playChimeSound('pop');
              }}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
              className="hidden sm:flex items-center justify-center p-1.5 sm:px-2 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-amber-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 shrink-0"
              id="header-dark-mode-btn"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
              )}
            </button>
          )}


          {/* "More Tools & Export" Menu Button */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              aria-label="More options"
              aria-expanded={isMoreMenuOpen}
              className={`flex items-center justify-center p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer relative ${
                isMoreMenuOpen
                  ? 'bg-amber-100 dark:bg-slate-800 text-amber-950 dark:text-amber-300 border-amber-400 dark:border-amber-600'
                  : 'bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700'
              }`}
              title="More options, exports, and integrations"
            >
              <MoreVertical className="w-4 h-4 text-gray-700 dark:text-slate-300" />
              {(hasCustomBrand || historyCount > 0) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Dropdown Menu */}
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-amber-200/90 dark:border-slate-800 py-1.5 z-50 divide-y divide-gray-100 dark:divide-slate-800 transition-all animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 bg-amber-50/60 dark:bg-slate-800/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    Book Tools &amp; Sharing
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-300 truncate font-medium">
                    {displayTitle}
                  </div>
                </div>

                <div className="py-1">
                  {/* Ready-to-Color Templates Option */}
                  {onOpenTemplates && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenTemplates();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <span>Premade Templates</span>
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                              Instant
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">Ready-to-color books, zero wait</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}

                  {/* Community Gallery Option */}
                  {onOpenCommunityGallery && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenCommunityGallery();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <span>Community Gallery</span>
                            <span className="text-[10px] bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-300 px-1.5 py-0.2 rounded-full font-bold">
                              Shared
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">Discover &amp; color books from others</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-rose-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}

                  {/* Share & Import Books Option */}
                  {onOpenBookShare && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenBookShare();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          <FolderDown className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white">Import &amp; Export Book</div>
                          <div className="text-[11px] text-gray-500 truncate">Save or load .colorkid files</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}

                  {/* Brand & Logo Option */}
                  {onOpenBrandModal && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenBrandModal();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-amber-50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg ${hasCustomBrand ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                            <span>Brand &amp; Logo</span>
                            {hasCustomBrand && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {hasCustomBrand ? brandIntegration?.organizationName : 'Custom logo & credits'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}

                  {/* Activities & Crafts Option */}
                  {onOpenActivitiesModal && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenActivitiesModal();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-orange-50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-orange-100 text-orange-800">
                          <Compass className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">Activities &amp; Crafts</div>
                          <div className="text-[11px] text-gray-500 truncate">Mazes, cut-outs &amp; puzzles</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}

                  {/* Website & Embed Option */}
                  {onOpenWebsiteModal && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenWebsiteModal();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-blue-50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">Website &amp; Embed</div>
                          <div className="text-[11px] text-gray-500 truncate">Widgets, badges &amp; QR codes</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}

                  {/* Print Preview & Booklet Option */}
                  {onOpenPrintPreview && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenPrintPreview();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-amber-50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">Print Preview</div>
                          <div className="text-[11px] text-gray-500 truncate">Booklet layout &amp; covers</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}

                  {/* Direct Print Option */}
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onDirectPrint();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
                        <Printer className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900">Print Book</div>
                        <div className="text-[11px] text-gray-500 truncate">Send to printer</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  {/* Quiet Mode / Sound Toggle Option */}
                  <button
                    onClick={() => {
                      const next = toggleSoundMuted();
                      setIsMuted(next);
                      if (!next) playChimeSound('sparkle');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-amber-50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg ${isMuted ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-800'}`}>
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900">
                          {isMuted ? 'Quiet Mode (Muted)' : 'Sound Effects (On)'}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {isMuted ? 'Tap to enable sound effects' : 'Tap to mute sounds'}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isMuted ? 'bg-gray-200 text-gray-700' : 'bg-amber-200 text-amber-900'}`}>
                      {isMuted ? 'Muted' : 'On'}
                    </span>
                  </button>

                  {/* Session History Option */}
                  {onScrollToHistory && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onScrollToHistory();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-amber-50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                          <History className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                            <span>Saved Books History</span>
                            {historyCount > 0 && (
                              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full font-bold">
                                {historyCount}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">Switch to past session books</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}

                  {/* Dark Mode Toggle in Menu */}
                  {onToggleDarkMode && (
                    <button
                      onClick={() => {
                        onToggleDarkMode();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer border-t border-gray-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-slate-800 text-amber-800 dark:text-amber-400">
                          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                            {isDarkMode ? 'Gentle warm paper theme' : 'High-contrast dark studio theme'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                        {isDarkMode ? 'Dark' : 'Light'}
                      </span>
                    </button>
                  )}

                  {/* Export Project Source Code (.ZIP) - Development only */}
                  {import.meta.env.DEV && (
                    <a
                      href="/api/download-project"
                      download="coloring-book-studio-latest.zip"
                      onClick={() => {
                        playChimeSound('sparkle');
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors group cursor-pointer border-t border-amber-100 dark:border-slate-800"
                      title="Export complete codebase with latest changes"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                          <FolderDown className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>Download Project (.ZIP)</span>
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                              Source
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">Export full codebase for Claude / GitHub</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  )}

                  {/* Child Privacy: Erase All Stored Data */}
                  <button
                    onClick={async () => {
                      setIsMoreMenuOpen(false);
                      const confirmed = window.confirm(
                        'Erase All Child Data:\n\nThis will permanently delete all saved coloring books, hero photos, session history, and reset parental consent stored in your browser.\n\nAre you sure you want to proceed?'
                      );
                      if (confirmed) {
                        await purgeAllChildData();
                        playChimeSound('pop');
                        window.location.reload();
                      }
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 transition-colors group cursor-pointer border-t border-rose-100 dark:border-slate-800"
                    title="Erase all child data and stored illustrations"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold flex items-center gap-1.5">
                           <span>Erase All Child Data</span>
                          <span className="text-[10px] bg-rose-100 dark:bg-rose-900/70 text-rose-800 dark:text-rose-300 px-1.5 py-0.2 rounded-full font-bold">
                            Privacy
                          </span>
                        </div>
                        <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80 truncate">
                          Delete stored photos, books & consent
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-600 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
