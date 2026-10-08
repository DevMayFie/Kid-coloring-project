import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Camera,
  Sparkles,
  Wand2,
  CheckCircle,
  RefreshCw,
  Image as ImageIcon,
  Heart,
  Dog,
  Smile,
  ShieldAlert,
} from 'lucide-react';
import { convertPhotoToLineArt } from '../utils/photoToLineArtFilter';
import { playChimeSound } from '../utils/kidAudio';
import { resizeAndCompressImage } from '../utils/imageCompressor';
import { sanitizeInput } from '../utils/security';
import { ParentalConsentModal } from './ParentalConsentModal';
import { getParentalConsentSync, getParentalConsentRecordAsync } from '../utils/dbStorage';
import { getClientSessionId } from '../utils/session';

interface PersonalizedHeroModalProps {
  isOpen: boolean;
  onClose: () => void;
  childName: string;
  theme: string;
  onApplyHeroPage: (heroData: {
    imageUrl: string;
    title: string;
    caption: string;
    asCover?: boolean;
  }) => void;
}

export function PersonalizedHeroModal({
  isOpen,
  onClose,
  childName,
  theme,
  onApplyHeroPage,
}: PersonalizedHeroModalProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lineArtPreview, setLineArtPreview] = useState<string | null>(null);
  const [subjectType, setSubjectType] = useState<'child' | 'pet' | 'toy' | 'custom'>('child');
  const [heroName, setHeroName] = useState(childName || 'Little Hero');
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [strokeWeight, setStrokeWeight] = useState<'bold' | 'extra-bold'>('bold');
  const [asCover, setAsCover] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasParentalConsent, setHasParentalConsent] = useState(() => getParentalConsentSync());
  const [showConsentModal, setShowConsentModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!hasParentalConsent) {
      setShowConsentModal(true);
      return;
    }

    setErrorMsg(null);
    try {
      // Compress and resize client-side to max 1024x1024 to keep payload lightweight and fast
      const compressedDataUrl = await resizeAndCompressImage(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.82,
      });
      setPhotoPreview(compressedDataUrl);
      playChimeSound('pop');
      // Generate instant local line-art preview
      await runLocalLineArt(compressedDataUrl, strokeWeight);
    } catch (err: any) {
      console.warn('Error compressing photo:', err);
      setErrorMsg('Failed to process image. Please try another photo.');
    }
  };

  const runLocalLineArt = async (imgUrl: string, weight: 'bold' | 'extra-bold') => {
    setIsProcessingLocal(true);
    try {
      const lineArt = await convertPhotoToLineArt(imgUrl, {
        strokeThickness: weight,
        edgeThreshold: 38,
        contrastBoost: 1.35,
      });
      setLineArtPreview(lineArt);
    } catch (err: any) {
      console.warn('Local line art extraction error:', err);
      setErrorMsg('Failed to process photo locally. You can still try AI Generation.');
    } finally {
      setIsProcessingLocal(false);
    }
  };

  const handleGenerateAiArt = async () => {
    if (!photoPreview) return;
    if (!hasParentalConsent) {
      setErrorMsg('Parental consent is required before using AI photo processing.');
      return;
    }
    const cleanHeroName = sanitizeInput(heroName, 40) || 'Hero';
    setIsGeneratingAi(true);
    setErrorMsg(null);
    playChimeSound('sparkle');

    try {
      const sessionId = getClientSessionId();
      const consentRecord = await getParentalConsentRecordAsync();
      let token = consentRecord?.consentToken;
      if (!token) {
        try {
          const tokenRes = await fetch('/api/verify-parental-consent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId,
            },
            body: JSON.stringify({
              guardianRole: consentRecord?.guardianType || 'parent',
              childName: cleanHeroName,
              sessionId,
              coppaConfirmed: true,
            }),
          });
          const tokenData = await tokenRes.json();
          if (tokenData.success && tokenData.consentToken) {
            token = tokenData.consentToken;
          }
        } catch (tErr) {
          console.warn('Could not auto-fetch consent token:', tErr);
        }
      }

      if (!token) {
        throw new Error('Valid parental consent verification token is required under COPPA.');
      }

      const res = await fetch('/api/photo-to-line-art', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
          'x-parental-consent-token': token,
        },
        body: JSON.stringify({
          photoBase64: photoPreview,
          subjectType,
          childName: cleanHeroName,
          theme: sanitizeInput(theme, 50),
          sceneSetting: `celebrating an epic ${theme} adventure with friendly companion characters`,
          difficulty: 'standard',
          parentConsentToken: token,
          sessionId,
        }),
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setLineArtPreview(data.imageUrl);
        playChimeSound('fanfare');
      } else {
        throw new Error(data.error || 'AI generation could not process photo.');
      }
    } catch (err: any) {
      console.warn('AI Hero generation fallback to local filter:', err);
      setErrorMsg(err.message || 'AI service busy. Converted with instant high-contrast line-art filter!');
      // Re-run local extraction as safe fallback
      await runLocalLineArt(photoPreview, 'extra-bold');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApply = () => {
    if (!lineArtPreview) return;

    const subjectLabel =
      subjectType === 'pet' ? 'Furry Sidekick' : subjectType === 'toy' ? 'Magical Toy' : 'Explorer Hero';

    onApplyHeroPage({
      imageUrl: lineArtPreview,
      title: `${heroName} the ${subjectLabel}`,
      caption: `Look! ${heroName} is starring in their very own ${theme} coloring adventure!`,
      asCover,
    });
    playChimeSound('magic');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-2 border-amber-200">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner">
              📸
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Personalized Hero Photo-to-Line-Art</h2>
              <p className="text-xs text-amber-100 font-medium">
                Turn your child, pet, or toy into a starring coloring page!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Subject Type Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              1. Who is the Star Hero?
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { id: 'child', label: 'My Child', icon: Smile, desc: 'Starring adventurer' },
                { id: 'pet', label: 'Family Pet', icon: Dog, desc: 'Furry companion' },
                { id: 'toy', label: 'Favorite Toy', icon: Heart, desc: 'Magical sidekick' },
              ].map((sub) => {
                const Icon = sub.icon;
                const isSelected = subjectType === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSubjectType(sub.id as any);
                      playChimeSound('pop');
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                        : 'border-gray-200 hover:border-amber-300 text-gray-600 bg-white'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-1 ${isSelected ? 'text-amber-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-black">{sub.label}</span>
                    <span className="text-[10px] text-gray-500">{sub.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hero Name & Cover Option */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Hero Name</label>
              <input
                type="text"
                value={heroName}
                onChange={(e) => setHeroName(e.target.value)}
                placeholder="e.g. Leo, Bella, Teddy"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={asCover}
                  onChange={(e) => setAsCover(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-md border-gray-300 focus:ring-amber-500"
                />
                <span>Also make this the Front Cover of the book</span>
              </label>
            </div>
          </div>

          {/* Upload Area */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              2. Upload Reference Photo
            </label>

            {/* Parental Consent & Privacy Protection Gate */}
            <div className="mb-3 p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-amber-950">Child Privacy & Safety Notice</h5>
                  <p className="text-[11px] text-amber-900 leading-relaxed mt-0.5">
                    Photos are processed in-memory solely to generate black-and-white coloring outlines. We never store, index, or share personal photos of children.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-2 pt-2 border-t border-amber-200/60 select-none">
                <input
                  type="checkbox"
                  checked={hasParentalConsent}
                  onChange={(e) => {
                    setHasParentalConsent(e.target.checked);
                    if (e.target.checked) setErrorMsg(null);
                  }}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-amber-950">
                  I am a parent or legal guardian (18+) and consent to processing this photo for this coloring book
                </span>
              </label>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />

            {!photoPreview ? (
              <div
                onClick={() => {
                  if (!hasParentalConsent) {
                    setShowConsentModal(true);
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-colors group cursor-pointer ${
                  hasParentalConsent
                    ? 'border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-50'
                    : 'border-gray-200 bg-gray-50/60 hover:bg-amber-50/30'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${
                  hasParentalConsent ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'
                }`}>
                  <Camera className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-gray-800">
                  {hasParentalConsent ? 'Click or drag & drop a photo here' : 'Parental consent required to upload child photo'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Supports PNG, JPG, or WEBP photos (automatically compressed)</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Original Photo */}
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 aspect-3/4 flex flex-col items-center justify-center">
                  <img
                    src={photoPreview}
                    alt="Original Upload"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Original Photo
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-gray-800 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm cursor-pointer"
                  >
                    Change Photo
                  </button>
                </div>

                {/* Line Art Result */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400 bg-white aspect-3/4 flex flex-col items-center justify-center">
                  {isProcessingLocal || isGeneratingAi ? (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                      <p className="text-xs font-bold text-gray-700">
                        {isGeneratingAi
                          ? 'Generating AI cartoon hero line art...'
                          : 'Extracting clean coloring contours...'}
                      </p>
                    </div>
                  ) : lineArtPreview ? (
                    <>
                      <img
                        src={lineArtPreview}
                        alt="Coloring Line Art"
                        className="w-full h-full object-contain filter contrast-125 p-2"
                      />
                      <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Ready to Color!
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 font-medium">Processing line art...</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Tools & Error Feedback */}
          {errorMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {photoPreview && (
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600">Outline Weight:</span>
                <button
                  type="button"
                  onClick={() => {
                    setStrokeWeight('bold');
                    runLocalLineArt(photoPreview, 'bold');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    strokeWeight === 'bold' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Classic Bold
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStrokeWeight('extra-bold');
                    runLocalLineArt(photoPreview, 'extra-bold');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    strokeWeight === 'extra-bold' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Extra Thick
                </button>
              </div>

              <button
                type="button"
                onClick={handleGenerateAiArt}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>AI Cartoon Stylize</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={!lineArtPreview || isProcessingLocal || isGeneratingAi}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md transition-all disabled:opacity-40 cursor-pointer active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Add Hero to Coloring Book</span>
          </button>
        </div>
      </div>

      {/* Mandatory Parental Consent Modal */}
      <ParentalConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsentGiven={() => {
          setHasParentalConsent(true);
          setErrorMsg(null);
          // Auto-trigger file upload
          setTimeout(() => {
            fileInputRef.current?.click();
          }, 150);
        }}
        childName={heroName}
        hasPhoto={true}
        actionTitle="Upload Child Photo"
      />
    </div>
  );
}
