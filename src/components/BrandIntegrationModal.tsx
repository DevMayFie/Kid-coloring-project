import React, { useState, useRef } from 'react';
import {
  X,
  Building2,
  Globe,
  Upload,
  Check,
  Sparkles,
  QrCode,
  Eye,
  Trash2,
  Palette,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { BrandIntegration } from '../types';
import { getPresetLogoDataUrl } from './BrandLogo';
import { playChimeSound } from '../utils/kidAudio';

interface BrandIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandIntegration?: BrandIntegration;
  onSave: (integration: BrandIntegration) => void;
  childName: string;
}

const PRESET_OPTIONS = [
  { id: 'crayon-mascot', label: 'Crayon Mascot', desc: 'Friendly art character' },
  { id: 'school-crest', label: 'School Crest', desc: 'Academics & Daycare' },
  { id: 'art-palette', label: 'Art Palette', desc: 'Creative studio & crafts' },
  { id: 'star-rocket', label: 'Star Rocket', desc: 'Camp & adventure' },
  { id: 'party-balloon', label: 'Party Balloons', desc: 'Birthdays & events' },
] as const;

export const BrandIntegrationModal: React.FC<BrandIntegrationModalProps> = ({
  isOpen,
  onClose,
  brandIntegration,
  onSave,
  childName,
}) => {
  const [enabled, setEnabled] = useState<boolean>(brandIntegration?.enabled ?? false);
  const [organizationName, setOrganizationName] = useState<string>(
    brandIntegration?.organizationName || 'Sunny Day Academy'
  );
  const [websiteUrl, setWebsiteUrl] = useState<string>(
    brandIntegration?.websiteUrl || 'https://sunnydayacademy.org'
  );
  const [tagline, setTagline] = useState<string>(
    brandIntegration?.tagline || 'Presented with love by'
  );
  const [logoPreset, setLogoPreset] = useState<
    'crayon-mascot' | 'school-crest' | 'art-palette' | 'star-rocket' | 'party-balloon' | 'custom'
  >(brandIntegration?.logoPreset || 'school-crest');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(brandIntegration?.logoUrl || '');
  const [showOnCover, setShowOnCover] = useState<boolean>(brandIntegration?.showOnCover ?? true);
  const [showOnPageFooter, setShowOnPageFooter] = useState<boolean>(
    brandIntegration?.showOnPageFooter ?? true
  );
  const [showWebsiteQrCode, setShowWebsiteQrCode] = useState<boolean>(
    brandIntegration?.showWebsiteQrCode ?? true
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, or SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setCustomLogoUrl(result);
        setLogoPreset('custom');
        playChimeSound('pop');
      }
    };
    reader.readAsDataURL(file);
  };

  const activeLogoUrl =
    logoPreset === 'custom' && customLogoUrl ? customLogoUrl : getPresetLogoDataUrl(logoPreset);

  const handleApply = () => {
    const cleanUrl = websiteUrl.trim();
    const formattedUrl =
      cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')
        ? `https://${cleanUrl}`
        : cleanUrl;

    const updated: BrandIntegration = {
      enabled,
      organizationName: organizationName.trim() || 'Our Community Partner',
      websiteUrl: formattedUrl || 'https://ai.studio',
      tagline: tagline.trim() || 'Presented by',
      logoPreset,
      logoUrl: activeLogoUrl,
      showOnCover,
      showOnPageFooter,
      showWebsiteQrCode,
    };

    onSave(updated);
    playChimeSound('sparkle');
    onClose();
  };

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
        <div className="p-4 sm:p-6 bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-lg sm:text-xl font-black tracking-tight"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                Brand &amp; Website Integrations
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                Add your school, camp, event, or business logo and website to printable books
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

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {/* Main Activation Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200/90 shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-sm font-black text-amber-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Enable Custom Brand &amp; Website Integration
              </span>
              <p className="text-xs text-amber-800/80">
                Displays your custom logo, sponsor tagline, and website link on book covers &amp; page footers
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => {
                  setEnabled(e.target.checked);
                  playChimeSound('pop');
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Form Fields (Active when enabled or previewable) */}
          <div className={`space-y-5 transition-opacity ${enabled ? 'opacity-100' : 'opacity-60'}`}>
            {/* Organization / Brand Name & Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  Organization / Sponsor Name
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Sunnybrook Elementary"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-600" />
                  Website URL
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="e.g. https://myschool.org"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Sponsor / Presentation Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Presented with love by, Sponsored by, In partnership with"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden transition-all"
              />
            </div>

            {/* Logo Selection (Upload or Presets) */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700">
                Brand Logo (Upload Custom or Choose Preset)
              </label>

              {/* Presets Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setLogoPreset(preset.id);
                      playChimeSound('pop');
                    }}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                      logoPreset === preset.id
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                  >
                    <img
                      src={getPresetLogoDataUrl(preset.id)}
                      alt={preset.label}
                      className="w-10 h-10 object-contain"
                    />
                    <span className="text-[11px] font-bold text-gray-900 leading-tight">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Logo Upload Option */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-300 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                    {customLogoUrl ? (
                      <img
                        src={customLogoUrl}
                        alt="Custom Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">
                      {customLogoUrl ? 'Custom Logo Uploaded' : 'Upload Your Own Organization Logo'}
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      PNG, JPG, or SVG (transparent background recommended)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    {customLogoUrl ? 'Replace Logo' : 'Select File...'}
                  </button>
                  {customLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomLogoUrl('');
                        setLogoPreset('crayon-mascot');
                      }}
                      className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Remove uploaded logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Display Placement Options */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Placement &amp; Print Options
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-amber-50/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={showOnCover}
                    onChange={(e) => setShowOnCover(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-400"
                  />
                  <span className="text-xs font-semibold text-gray-800">Show on Cover</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-amber-50/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={showOnPageFooter}
                    onChange={(e) => setShowOnPageFooter(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-400"
                  />
                  <span className="text-xs font-semibold text-gray-800">Show in Page Footers</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-amber-50/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={showWebsiteQrCode}
                    onChange={(e) => setShowWebsiteQrCode(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-400"
                  />
                  <span className="text-xs font-semibold text-gray-800">Website QR Code</span>
                </label>
              </div>
            </div>

            {/* Live Visual Preview Card */}
            <div className="p-4 rounded-2xl bg-linear-to-br from-amber-50 via-white to-orange-50 border border-amber-200 shadow-xs space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live Book Presentation Preview
              </span>

              {/* Cover Banner Preview */}
              <div className="p-3 bg-white rounded-xl border border-amber-200/90 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={activeLogoUrl}
                    alt="Brand Logo Preview"
                    className="w-9 h-9 rounded-lg object-contain"
                  />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">
                      {tagline}
                    </span>
                    <span className="text-xs font-black text-gray-900 block">
                      {organizationName}
                    </span>
                    <span className="text-[10px] text-amber-700 font-medium block">
                      {websiteUrl}
                    </span>
                  </div>
                </div>

                {showWebsiteQrCode && (
                  <div className="flex flex-col items-center justify-center p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-center shrink-0">
                    <QrCode className="w-6 h-6 text-gray-800" />
                    <span className="text-[8px] font-bold text-gray-600 mt-0.5">SCAN WEBSITE</span>
                  </div>
                )}
              </div>

              {/* Page Footer Preview */}
              <div className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <span className="text-[10px] text-gray-500 font-medium">
                  ★ {organizationName} ({websiteUrl.replace(/^https?:\/\//, '')}) • Made for{' '}
                  {childName} • Page 1 of 5 ★
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save &amp; Apply Branding</span>
          </button>
        </div>
      </div>
    </div>
  );
};
