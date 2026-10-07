import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Code2,
  Copy,
  Check,
  Share2,
  Download,
  ExternalLink,
  Sparkles,
  QrCode,
  Layout,
  CheckCircle2,
} from 'lucide-react';
import { ColoringBook } from '../types';
import { generateQrCodeDataUrl } from '../utils/qrCodeGenerator';
import { playChimeSound } from '../utils/kidAudio';
import confetti from 'canvas-confetti';

interface WebsiteIntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: ColoringBook;
  onOpenBrandModal?: () => void;
}

type TabKey = 'embed' | 'badges' | 'qrcode' | 'share';

export const WebsiteIntegrationsModal: React.FC<WebsiteIntegrationsModalProps> = ({
  isOpen,
  onClose,
  book,
  onOpenBrandModal,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('embed');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [embedWidth, setEmbedWidth] = useState<'100%' | '960px' | '768px' | '480px'>('100%');
  const [embedHeight, setEmbedHeight] = useState<number>(750);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Derive current URL safely
  const currentUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : 'https://ais-dev-mujl62w6sk5fiohf3hc6iz-51555835967.us-east1.run.app';

  const brandUrl =
    book.brandIntegration?.enabled && book.brandIntegration.websiteUrl
      ? book.brandIntegration.websiteUrl
      : currentUrl;

  // Generate QR Code on modal open or URL change
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    generateQrCodeDataUrl(brandUrl, 320)
      .then((dataUrl) => {
        if (isMounted) setQrDataUrl(dataUrl);
      })
      .catch((err) => console.warn('Could not generate QR code:', err));

    return () => {
      isMounted = false;
    };
  }, [isOpen, brandUrl]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    playChimeSound('sparkle');
    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.7 },
      colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899'],
    });

    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${book.childName}'s ${book.theme} Coloring Book`,
          text: `Check out ${book.childName}'s custom printable coloring book on ${book.theme}!`,
          url: currentUrl,
        });
        playChimeSound('magic');
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy(currentUrl, 'direct-link');
    }
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${book.childName || 'coloring-book'}-website-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playChimeSound('magic');
  };

  // Embed snippet
  const embedCode = `<iframe
  src="${currentUrl}"
  width="${embedWidth}"
  height="${embedHeight}"
  style="border: none; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);"
  title="${book.childName}'s Coloring Book"
  allow="camera; microphone; clipboard-write"
></iframe>`;

  // Badge snippets
  const htmlButtonSnippet = `<a href="${currentUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:linear-gradient(135deg,#F59E0B,#EA580C);color:#fff;font-family:sans-serif;font-weight:bold;font-size:14px;border-radius:12px;text-decoration:none;box-shadow:0 4px 10px rgba(245,158,11,0.3);">
  <span>🎨</span>
  <span>Color ${book.childName}'s Book Online</span>
</a>`;

  const markdownSnippet = `[![Color ${book.childName}'s Book Online](https://img.shields.io/badge/ColorCraft%20Kids-Color%20Online-amber?style=for-the-badge&logo=palette)](${currentUrl})`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full border border-amber-200 shadow-2xl relative my-6 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-linear-to-r from-blue-600 via-indigo-600 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-lg sm:text-xl font-black tracking-tight"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                Website &amp; Embed Integrations
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                Embed this interactive coloring book into your website, blog, or school portal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-4 sm:px-6 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('embed')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'embed'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Embed Widget (iframe)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('badges')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'badges'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Website Badges &amp; Buttons</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qrcode')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'qrcode'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Website QR Code</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'share'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Direct Web Link</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left">
          {/* TAB 1: EMBED IFRAME WIDGET */}
          {activeTab === 'embed' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium flex items-start gap-2.5">
                <Code2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Seamlessly embed this interactive coloring book:</p>
                  <p className="text-[11px] text-indigo-800">
                    Works on WordPress, Shopify, Squarespace, Wix, Webflow, Notion, or custom HTML sites.
                  </p>
                </div>
              </div>

              {/* Customizer controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5 text-gray-500" />
                    Widget Width
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['100%', '960px', '768px', '480px'] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setEmbedWidth(w)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          embedWidth === w
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Widget Height: {embedHeight}px
                  </label>
                  <input
                    type="range"
                    min="550"
                    max="1000"
                    step="50"
                    value={embedHeight}
                    onChange={(e) => setEmbedHeight(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">Copy Embed Code</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(embedCode, 'embed-code')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    {copiedKey === 'embed-code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3.5 bg-gray-900 rounded-2xl text-gray-100 font-mono text-[11px] overflow-x-auto border border-gray-800 shadow-inner">
                  <pre>{embedCode}</pre>
                </div>
              </div>

              {/* CMS Quick Guides */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs space-y-2">
                <h4 className="font-bold text-gray-900">How to paste on your platform:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-[11px]">
                  <li>
                    <strong>WordPress:</strong> Add a <em>Custom HTML</em> block and paste the snippet.
                  </li>
                  <li>
                    <strong>Shopify / Squarespace / Wix:</strong> Add an <em>Embed / Code block</em> and set to HTML.
                  </li>
                  <li>
                    <strong>Substack / Notion:</strong> Paste the direct web link to create an interactive bookmark.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: WEBSITE BADGES & BUTTONS */}
          {activeTab === 'badges' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                <p className="font-bold">Add vibrant buttons to your website or blog:</p>
                <p className="text-[11px] text-amber-800">
                  Allow your site visitors to jump straight into coloring with one click.
                </p>
              </div>

              {/* HTML Button Section */}
              <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900">1. Styled HTML Button</h4>
                  <button
                    type="button"
                    onClick={() => handleCopy(htmlButtonSnippet, 'html-btn')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    {copiedKey === 'html-btn' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'html-btn' ? 'Copied!' : 'Copy HTML'}</span>
                  </button>
                </div>

                {/* Preview */}
                <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-center">
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 text-white font-bold text-xs shadow-md"
                  >
                    <span>🎨</span>
                    <span>Color {book.childName}'s Book Online</span>
                  </a>
                </div>

                <div className="p-2.5 bg-gray-900 rounded-xl text-gray-200 font-mono text-[10px] overflow-x-auto">
                  <pre>{htmlButtonSnippet}</pre>
                </div>
              </div>

              {/* Markdown Shield Badge */}
              <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900">2. Markdown Badge (GitHub / Docs)</h4>
                  <button
                    type="button"
                    onClick={() => handleCopy(markdownSnippet, 'md-btn')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    {copiedKey === 'md-btn' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'md-btn' ? 'Copied!' : 'Copy Markdown'}</span>
                  </button>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-sm bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-xs">
                    ColorCraft Kids | Color Online
                  </span>
                </div>

                <div className="p-2.5 bg-gray-900 rounded-xl text-gray-200 font-mono text-[10px] overflow-x-auto">
                  <pre>{markdownSnippet}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WEBSITE QR CODE */}
          {activeTab === 'qrcode' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row items-center gap-5">
                <div className="p-3 bg-white rounded-2xl border border-amber-200 shadow-md shrink-0 flex flex-col items-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Website QR Code"
                      className="w-40 h-40 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-gray-400">
                      <QrCode className="w-12 h-12 animate-pulse" />
                    </div>
                  )}
                  <span className="text-[9px] font-bold text-gray-500 mt-1.5 uppercase">
                    Scan with Phone Camera
                  </span>
                </div>

                <div className="space-y-3 text-left">
                  <div>
                    <h4
                      className="text-base font-black text-gray-900"
                      style={{ fontFamily: "'Fredoka', sans-serif" }}
                    >
                      High-Resolution Website QR Code
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Direct target: <strong className="text-amber-700">{brandUrl}</strong>
                    </p>
                  </div>

                  <p className="text-xs text-gray-500">
                    Perfect for printing on classroom bulletins, birthday party invitations, school newsletters, daycare take-home packets, or event flyers!
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadQrPng}
                      disabled={!qrDataUrl}
                      className="px-4 py-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download QR Image (.PNG)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(brandUrl, 'qr-url')}
                      className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedKey === 'qr-url' ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copiedKey === 'qr-url' ? 'URL Copied!' : 'Copy URL'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Organization Website Branding Notice */}
              {onOpenBrandModal && (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
                  <div className="text-xs text-blue-950">
                    <p className="font-bold">Want the QR code to point to your school or business website?</p>
                    <p className="text-[11px] text-blue-800">
                      Configure your custom domain, logo, and sponsor name in Brand Settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBrandModal();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                  >
                    Set Custom URL
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIRECT SHARE */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
                <span className="text-xs font-bold text-gray-700 block">Direct Website URL</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono bg-gray-50 text-gray-700 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(currentUrl, 'direct-link')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    {copiedKey === 'direct-link' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Native Web Share API</h4>
                  <p className="text-[11px] text-gray-500">
                    Share directly via Messages, WhatsApp, AirDrop, or Email
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Share2 className="w-4 h-4 text-indigo-600" />
                  <span>Share Online</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
