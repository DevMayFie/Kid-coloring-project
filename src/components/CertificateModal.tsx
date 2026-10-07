import React, { useState } from 'react';
import { X, Award, Printer, Download, Sparkles, CheckCircle, Edit3 } from 'lucide-react';
import { ColoringBook } from '../types';
import { generateCertificateDataUrl } from '../utils/certificateGenerator';
import { playChimeSound } from '../utils/kidAudio';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: ColoringBook;
  onUpdateCertificateDetails?: (details: { recipientName: string; awardDate: string; presenter?: string }) => void;
}

export function CertificateModal({
  isOpen,
  onClose,
  book,
  onUpdateCertificateDetails,
}: CertificateModalProps) {
  const [recipientName, setRecipientName] = useState(
    book.certificateDetails?.recipientName || book.childName || 'Young Artist'
  );
  const [awardDate, setAwardDate] = useState(
    book.certificateDetails?.awardDate ||
      new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
  );
  const [presenter, setPresenter] = useState(book.certificateDetails?.presenter || 'ColorCraft Academy');
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen) return null;

  const certificateSvgUrl = generateCertificateDataUrl({
    childName: recipientName,
    bookTitle: book.title || book.theme,
    theme: book.theme,
    awardDate,
    presenter,
  });

  const handlePrint = () => {
    playChimeSound('fanfare');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Certificate of Completion - ${recipientName}</title>
          <style>
            @page { size: landscape; margin: 0; }
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fff; }
            img { width: 95vw; max-height: 95vh; object-fit: contain; }
          </style>
        </head>
        <body>
          <img src="${certificateSvgUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadImage = () => {
    playChimeSound('magic');
    const link = document.createElement('a');
    link.href = certificateSvgUrl;
    link.download = `${recipientName.replace(/\s+/g, '_')}_Coloring_Master_Certificate.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveDetails = () => {
    onUpdateCertificateDetails?.({
      recipientName,
      awardDate,
      presenter,
    });
    setIsEditing(false);
    playChimeSound('pop');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border-2 border-amber-300">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-amber-500 via-yellow-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shadow-inner">
              🏆
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Coloring Master Diploma of Achievement
                <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  Official Award
                </span>
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                Celebrates completing every adventure scene in "{book.title || book.theme}"
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

        {/* Certificate Display Canvas */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-amber-50/40 flex flex-col items-center justify-center">
          <div className="w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden border-4 border-amber-400 bg-white relative group">
            <img
              src={certificateSvgUrl}
              alt="Official Certificate of Completion"
              className="w-full h-auto object-contain select-none"
            />
          </div>

          {/* Quick Customizer form */}
          {isEditing ? (
            <div className="w-full max-w-3xl mt-4 p-4 bg-white rounded-2xl border border-amber-200 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                Customize Awardee Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Artist Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Award Date</label>
                  <input
                    type="text"
                    value={awardDate}
                    onChange={(e) => setAwardDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Presenter / Signer</label>
                  <input
                    type="text"
                    value={presenter}
                    onChange={(e) => setPresenter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Save & Update Preview
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Name / Date / Signer</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Also automatically included as the final page when downloading PDF</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadImage}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download SVG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Award Diploma</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
