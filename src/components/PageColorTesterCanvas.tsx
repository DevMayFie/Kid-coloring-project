import React, { useRef, useState, useEffect } from 'react';
import { Palette, Undo2, Trash2, Eraser, Paintbrush, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { playPopSound, playChimeSound } from '../utils/kidAudio';

interface PageColorTesterCanvasProps {
  imageUrl: string;
  pageTitle: string;
  onOpenFullStudio?: () => void;
}

const KID_PALETTE = [
  { name: 'Cherry Red', hex: '#ef4444' },
  { name: 'Sun Orange', hex: '#f97316' },
  { name: 'Lemon Yellow', hex: '#eab308' },
  { name: 'Grass Green', hex: '#22c55e' },
  { name: 'Sky Blue', hex: '#3b82f6' },
  { name: 'Grape Purple', hex: '#a855f7' },
  { name: 'Bubblegum Pink', hex: '#ec4899' },
  { name: 'Chocolate', hex: '#78350f' },
  { name: 'Ink Black', hex: '#111827' },
];

export const PageColorTesterCanvas: React.FC<PageColorTesterCanvasProps> = ({
  imageUrl,
  pageTitle,
  onOpenFullStudio,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState(8);
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);

  // Initialize canvas sizing based on container
  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Set display and buffer dimensions
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Save blank state to history
      historyRef.current = [ctx.getImageData(0, 0, width, height)];
    }
  }, [isActive]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const { x, y } = getCoordinates(e);
    lastPointRef.current = { x, y };

    ctx.save();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize * 2;
    } else {
      // Multiply & translucent so black line-art underneath remains clearly visible!
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
    }

    ctx.beginPath();
    ctx.arc(x, y, (tool === 'eraser' ? brushSize * 2 : brushSize) / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();

    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    const { x, y } = getCoordinates(e);

    ctx.save();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save snapshot to history for undo (max 10)
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = [...historyRef.current.slice(-9), snapshot];
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    if (prev) {
      ctx.putImageData(prev, 0, 0);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setHasDrawn(false);
    playPopSound(250);
  };

  return (
    <div className="w-full">
      {/* Trigger Button: Toggle Quick Color Tester */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={() => {
            playPopSound(isActive ? 350 : 500);
            setIsActive(!isActive);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
            isActive
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-50'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-700" style={{ color: isActive ? 'white' : undefined }} />
          <span>{isActive ? 'Hide Color Tester' : '🎨 Test Colors on Page'}</span>
          {isActive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {isActive && (
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
            Draw to test palette!
          </span>
        )}
      </div>

      {/* When active: Interactive Color Picker Palette & Canvas Overlay */}
      {isActive && (
        <div className="p-2.5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 space-y-2 mb-3 shadow-sm animate-in fade-in zoom-in-95 duration-150">
          {/* Color Picker Swatches + Native Color Input */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 shrink-0">
              Color:
            </span>

            {/* Native Digital Color Picker Input with Pipette */}
            <label className="relative flex items-center justify-center w-7 h-7 rounded-lg border-2 border-dashed border-gray-400 hover:border-amber-600 bg-white cursor-pointer overflow-hidden shadow-2xs group" title="Choose custom digital color">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => {
                  setSelectedColor(e.target.value);
                  setTool('brush');
                  playPopSound(580);
                }}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <div
                className="w-4 h-4 rounded-md border border-gray-300 shadow-inner"
                style={{ backgroundColor: selectedColor }}
              />
            </label>

            {/* Kid Friendly Swatch Palette */}
            {KID_PALETTE.map((swatch) => (
              <button
                key={swatch.hex}
                type="button"
                onClick={() => {
                  setSelectedColor(swatch.hex);
                  setTool('brush');
                  playPopSound(500);
                }}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer shadow-2xs ${
                  selectedColor === swatch.hex && tool === 'brush'
                    ? 'scale-120 border-gray-900 ring-2 ring-amber-400 z-10'
                    : 'border-white hover:scale-110'
                }`}
                style={{ backgroundColor: swatch.hex }}
                title={swatch.name}
              />
            ))}
          </div>

          {/* Tool & Brush Size Controls */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/80 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setTool('brush');
                  playPopSound(450);
                }}
                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] cursor-pointer transition-colors ${
                  tool === 'brush'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Paintbrush className="w-3 h-3" />
                <span>Brush</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTool('eraser');
                  playPopSound(300);
                }}
                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] cursor-pointer transition-colors ${
                  tool === 'eraser'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Eraser className="w-3 h-3" />
                <span>Eraser</span>
              </button>

              {/* Stroke Size Selector */}
              <div className="flex items-center gap-0.5 ml-1 bg-white p-0.5 rounded-lg border border-gray-200">
                {[
                  { label: 'S', size: 4 },
                  { label: 'M', size: 10 },
                  { label: 'L', size: 22 },
                ].map((s) => (
                  <button
                    key={s.size}
                    type="button"
                    onClick={() => setBrushSize(s.size)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      brushSize === s.size ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title={`${s.label} Brush`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                className="p-1 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 cursor-pointer"
                title="Undo last stroke"
              >
                <Undo2 className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-lg bg-white border border-gray-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                title="Clear test strokes"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Interactive Tester Canvas Container (overlaid directly on the image preview) */}
          <div
            ref={containerRef}
            className="relative w-full aspect-3/4 rounded-xl border-2 border-dashed border-amber-400 bg-white overflow-hidden shadow-inner select-none touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          >
            {/* Background coloring page line art image */}
            <img
              src={imageUrl}
              alt={pageTitle}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none filter contrast-125 select-none"
              referrerPolicy="no-referrer"
            />

            {/* Drawing canvas positioned directly over the line art */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full mix-blend-multiply pointer-events-auto"
            />

            {/* Friendly hint overlay if nothing drawn yet */}
            {!hasDrawn && (
              <div className="absolute top-2 left-2 right-2 pointer-events-none bg-amber-400/90 text-amber-950 font-bold text-[10px] py-1 px-2 rounded-lg text-center shadow-xs backdrop-blur-xs">
                ✨ Click & drag here to test color combos before printing!
              </div>
            )}
          </div>

          {/* Full Studio Promotion CTA */}
          {onOpenFullStudio && (
            <button
              type="button"
              onClick={() => {
                playChimeSound('magic');
                onOpenFullStudio();
              }}
              className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[11px] font-black flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Open in Full Digital Studio (Magic Fill & Stickers)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
