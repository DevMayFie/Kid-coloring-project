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
} from 'lucide-react';
import { BrandLogo, getPresetLogoDataUrl } from './BrandLogo';
import { BrandIntegration } from '../types';
import { isSoundMuted, toggleSoundMuted, playChimeSound } from '../utils/kidAudio';

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
  brandIntegration?: BrandIntegration;
  hasCustomBrand?: boolean;
  isGeneratingPdf: boolean;
  pageCount: number;
  historyCount?: number;
  onScrollToHistory?: () => void;
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
  brandIntegration,
  hasCustomBrand = false,
  isGeneratingPdf,
  pageCount,
  historyCount = 0,
  onScrollToHistory,
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-amber-200/70 px-3 sm:px-6 py-2 shadow-2xs transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand Logo & Book Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          {/* Main App Brand Logo & Title */}
          <div className="flex items-center shrink-0">
            <BrandLogo size="sm" showText={true} compactOnMobile={true} />
          </div>

          {/* Divider between App Brand and Current Book */}
          <div className="hidden md:block h-5 w-px bg-amber-200 shrink-0" />

          {/* Book Title & Page Count (Hidden on mobile to avoid crowding) */}
          <div className="hidden md:flex items-center gap-2 min-w-0">
            <h1
              className="font-bold text-gray-900 text-xs sm:text-sm tracking-tight truncate max-w-[180px] lg:max-w-[280px]"
              title={displayTitle}
            >
              {displayTitle}
            </h1>
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
              {pageCount} Pages + Cover
            </span>
          </div>

          {/* Custom Organization Badge (if active) */}
          {brandIntegration?.enabled && (
            <div
              onClick={onOpenBrandModal}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-linear-to-r from-amber-50 to-orange-50 border border-amber-300 text-xs text-amber-900 cursor-pointer hover:border-amber-400 hover:shadow-xs transition-all shrink-0"
              title={`Custom organization brand active: ${brandIntegration.organizationName}. Click to edit.`}
            >
              {customLogoSrc ? (
                <img
                  src={customLogoSrc}
                  alt={brandIntegration.organizationName}
                  className="w-4 h-4 object-contain rounded-full bg-white shadow-2xs p-0.5"
                />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
              )}
              <span className="font-medium text-[11px] truncate max-w-[130px]">
                {brandIntegration.organizationName}
              </span>
            </div>
          )}
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Brand & Logo Integration Button (Desktop: lg+) */}
          {onOpenBrandModal && (
            <button
              onClick={onOpenBrandModal}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer relative ${
                hasCustomBrand
                  ? 'bg-amber-100/90 text-amber-950 border-amber-400 ring-1 ring-amber-300'
                  : 'bg-white hover:bg-amber-50 text-gray-700 border-gray-200'
              }`}
              id="header-brand-btn"
              title="Configure custom organization logo, sponsor, and website URL"
            >
              <Building2 className={`w-3.5 h-3.5 ${hasCustomBrand ? 'text-amber-700' : 'text-gray-500'}`} />
              <span>Brand &amp; Logo</span>
              {hasCustomBrand && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </button>
          )}

          {/* Bonus Activities & Crafts Center (Desktop: lg+) */}
          {onOpenActivitiesModal && (
            <button
              onClick={onOpenActivitiesModal}
              className="hidden lg:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-orange-950 border border-orange-300/80 text-xs font-semibold transition-colors cursor-pointer"
              id="header-activities-btn"
              title="Bonus Maze Adventure, Cut-Out Bookmarks, and Color Mixing Lab"
            >
              <Compass className="w-3.5 h-3.5 text-orange-700" />
              <span>Activities &amp; Crafts</span>
            </button>
          )}

          {/* Website Integrations & Embed Button (Desktop: md+) */}
          {onOpenWebsiteModal && (
            <button
              onClick={onOpenWebsiteModal}
              className="hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-50/90 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer"
              id="header-website-btn"
              title="Website embed widget, badges, and QR codes"
            >
              <Globe className="w-3.5 h-3.5 text-blue-700" />
              <span>Website &amp; Embed</span>
            </button>
          )}

          {/* History Button (sm+) */}
          {onScrollToHistory && (
            <button
              onClick={onScrollToHistory}
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-50/90 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-semibold transition-colors cursor-pointer"
              id="header-history-btn"
              title="View previously generated coloring books in this session"
            >
              <History className="w-3.5 h-3.5 text-amber-700" />
              <span>History</span>
              {historyCount > 0 && (
                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {historyCount}
                </span>
              )}
            </button>
          )}

          {/* AI Story Chat Assistant (Always visible) */}
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-semibold transition-colors cursor-pointer"
            id="desktop-chat-btn"
            title="Open AI Story Assistant"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Story Chat</span>
          </button>

          {/* Print Preview Button (Desktop: xl+) */}
          {onOpenPrintPreview && (
            <button
              onClick={onOpenPrintPreview}
              title="Open full-screen Print Preview modal"
              className="hidden xl:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold transition-colors cursor-pointer"
              id="header-print-preview-btn"
            >
              <Eye className="w-3.5 h-3.5 text-amber-700" />
              <span>Print Preview</span>
            </button>
          )}

          {/* Direct Print Button (sm+) */}
          <button
            onClick={onDirectPrint}
            title="Print entire coloring book"
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium transition-colors cursor-pointer"
            id="print-book-btn"
          >
            <Printer className="w-3.5 h-3.5 text-gray-600" />
            <span>Print</span>
          </button>

          {/* Sound / Quiet Mode Toggle (Classroom & bedtime friendly) */}
          <button
            type="button"
            onClick={() => {
              const next = toggleSoundMuted();
              setIsMuted(next);
              if (!next) playChimeSound('sparkle');
            }}
            title={isMuted ? 'Quiet Mode is ON (Click to unmute sound effects)' : 'Sound is ON (Click to enable Quiet Mode)'}
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              isMuted
                ? 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                : 'bg-amber-50/80 hover:bg-amber-100 text-amber-900 border-amber-200 hover:border-amber-300'
            }`}
            id="header-quiet-mode-btn"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="hidden xl:inline text-[11px] font-bold">
              {isMuted ? 'Quiet' : 'Sound'}
            </span>
          </button>

          {/* Download Full PDF Button (Always prominent) */}
          <button
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            id="download-pdf-btn"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? '...' : 'PDF Book'}</span>
          </button>

          {/* Mobile "More Tools" Menu Button (Visible on mobile/tablet screens < md) */}
          <div className="relative md:hidden" ref={menuRef}>
            <button
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              aria-label="More options"
              aria-expanded={isMoreMenuOpen}
              className={`flex items-center justify-center p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer relative ${
                isMoreMenuOpen
                  ? 'bg-amber-100 text-amber-950 border-amber-400'
                  : 'bg-white hover:bg-amber-50 text-gray-700 border-gray-200'
              }`}
              title="More options and integrations"
            >
              <MoreVertical className="w-4 h-4 text-gray-700" />
              {(hasCustomBrand || historyCount > 0) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Dropdown Menu */}
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-amber-200/90 py-1.5 z-50 divide-y divide-gray-100 transition-all animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 bg-amber-50/60">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    Book Tools &amp; Sharing
                  </div>
                  <div className="text-xs text-gray-600 truncate font-medium">
                    {displayTitle}
                  </div>
                </div>

                <div className="py-1">
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

                  {/* Export Project Source Code (.ZIP) */}
                  <a
                    href="/api/download-project"
                    download="coloring-book-studio-latest.zip"
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-emerald-50 transition-colors group cursor-pointer border-t border-amber-100"
                    title="Export complete codebase with latest changes"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                        <Download className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          <span>Download Project (.ZIP)</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                            Source
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">Export full codebase for Claude / GitHub</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
