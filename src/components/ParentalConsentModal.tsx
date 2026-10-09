import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Heart,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { saveParentalConsentAsync } from '../utils/dbStorage';
import { playChimeSound } from '../utils/kidAudio';
import { getClientSessionId } from '../utils/session';

export interface ParentalConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentGiven: () => void;
  childName?: string;
  hasPhoto?: boolean;
  actionTitle?: string;
}

export const ParentalConsentModal: React.FC<ParentalConsentModalProps> = ({
  isOpen,
  onClose,
  onConsentGiven,
  childName,
  hasPhoto = false,
  actionTitle = 'Create Coloring Book',
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const [guardianType, setGuardianType] = useState<'parent' | 'guardian' | 'educator'>('parent');
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isChecked || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const sessionId = getClientSessionId();
      const activeChildName = childName?.trim() || 'Hero';
      const res = await fetch('/api/verify-parental-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({
          guardianRole: guardianType,
          childName: activeChildName,
          sessionId,
          coppaConfirmed: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Parental verification rejected by server (Status ${res.status}).`);
      }

      const data = await res.json();
      if (!data.success || !data.consentToken) {
        throw new Error(data.error || 'Server failed to issue cryptographic parental consent token.');
      }

      const serverToken = data.consentToken;

      await saveParentalConsentAsync({
        childName: activeChildName,
        guardianType,
        consentToken: serverToken,
      });

      playChimeSound('sparkle');
      onConsentGiven();
      onClose();
    } catch (err: any) {
      console.error('Parental consent verification rejected:', err);
      // STRICT COPPA SECURITY: Consent is NOT granted when verification fails
      setErrorMessage(
        err.message || 'Verification could not be confirmed with the server. Parental consent was not granted. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="parental-consent-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full border-2 border-amber-300 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 sm:p-6 text-white relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner shrink-0">
                <ShieldCheck className="w-7 h-7 text-yellow-200" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-yellow-100 text-[11px] font-semibold tracking-wide uppercase">
                  <Lock className="w-3 h-3" /> Child Privacy & Safety
                </span>
                <h3
                  id="parental-consent-title"
                  className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                >
                  Parental Consent Required
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              aria-label="Close consent dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="bg-red-50 border-2 border-red-300 text-red-800 rounded-2xl p-4 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-red-900 mb-0.5">Verification Failed</p>
                <p>{errorMessage}</p>
                <p className="mt-1 text-[11px] text-red-700">Consent cannot be granted until server verification succeeds.</p>
              </div>
            </div>
          )}

          {/* Friendly introductory explanation */}
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 text-xs sm:text-sm text-amber-950 leading-relaxed">
            <p className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1.5">
              <Heart className="w-4 h-4 text-red-500 fill-red-400" />
              Safety-First Family Experience
            </p>
            ColorCraft is built for children, families, and classrooms. In accordance with the
            <strong> Children&apos;s Online Privacy Protection Act (COPPA)</strong> and privacy best
            practices, we require verified parental or guardian consent before processing any child
            information.
          </div>

          {/* Data Being Submitted Badge */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-2">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-600" />
              Information You Are Submitting
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs">
                <span className="text-gray-500 block">Child&apos;s First Name:</span>
                <span className="font-bold text-gray-900 text-sm">
                  {childName?.trim() ? `"${childName.trim()}"` : 'Child Name'}
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Used solely for book cover, page titles & dedication.
                </p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs">
                <span className="text-gray-500 block">Photo Processing:</span>
                <span className="font-bold text-gray-900 text-sm">
                  {hasPhoto ? 'Photo Included' : 'No Photo Uploaded'}
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {hasPhoto
                    ? 'Converted into printable line-art coloring page.'
                    : 'Standard story themes generated with Gemini AI.'}
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Guarantees */}
          <div className="space-y-2 text-xs text-gray-600">
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
              Our Privacy Commitments
            </h4>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>No Tracking or Selling:</strong> We never sell, rent, or share
                  children&apos;s names or photos with advertisers or data brokers.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Private IndexedDB Storage:</strong> Coloring books are stored in your
                  browser&apos;s private, persistent IndexedDB storage on your own device.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Complete Control:</strong> You can delete saved sessions or clear history
                  at any time with a single click.
                </span>
              </li>
            </ul>
          </div>

          {/* Guardian Role selection */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              I am confirming as a:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'parent', label: 'Parent' },
                { id: 'guardian', label: 'Legal Guardian' },
                { id: 'educator', label: 'Educator / Teacher' },
              ].map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setGuardianType(role.id as any)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    guardianType === role.id
                      ? 'bg-amber-100/80 border-amber-400 text-amber-900 ring-2 ring-amber-300/40'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mandatory Checkbox Container */}
          <div
            className={`p-4 rounded-2xl border-2 transition-all ${
              isChecked
                ? 'bg-emerald-50/60 border-emerald-300'
                : 'bg-amber-50/70 border-amber-300'
            }`}
          >
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="parental-consent-checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 w-5 h-5 rounded-md text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer accent-amber-600 shrink-0"
              />
              <div className="text-xs sm:text-sm font-medium text-gray-900 leading-snug">
                <span className="font-bold text-gray-950 block mb-0.5">
                  Mandatory Parental Consent (Required):
                </span>
                I confirm that I am at least 18 years of age and the parent, legal guardian, or
                authorized adult for this child. I explicitly give my consent to process the
                child&apos;s name and/or photo solely to create these personalized coloring pages and
                save them to this device&apos;s storage.
              </div>
            </label>
          </div>

          {/* More Details Toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowFullTerms(!showFullTerms)}
              className="text-xs text-amber-700 hover:text-amber-900 font-semibold underline cursor-pointer"
            >
              {showFullTerms ? 'Hide Full Policy Summary' : 'Read Full Privacy & Safety Guidelines'}
            </button>
            {showFullTerms && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-[11px] text-gray-600 text-left space-y-2 border border-gray-200">
                <p>
                  <strong>COPPA Compliance:</strong> ColorCraft does not require children to create
                  accounts, enter personal email addresses, or disclose personal identifiers. All
                  personalization is driven by adult users and saved client-side in persistent
                  IndexedDB.
                </p>
                <p>
                  <strong>Photo Line-Art Processing:</strong> When photos are converted to coloring
                  pages, image processing extracts high-contrast line drawings. Photos are never
                  re-used for advertising or marketing.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel / Go Back
          </button>
          <button
            type="button"
            id="confirm-parental-consent-btn"
            onClick={handleConfirm}
            disabled={!isChecked || isSubmitting}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
              isChecked
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
            }`}
          >
            {isChecked ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>I Consent &amp; {actionTitle}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-gray-400" />
                <span>Please Check Consent Box to Proceed</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
