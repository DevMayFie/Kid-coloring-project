import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  RotateCcw,
  RotateCw,
  Download,
  Trash2,
  Sparkles,
  Volume2,
  VolumeX,
  Award,
  Music,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  playChimeSound,
  playSplashSound,
  speakStory,
  stopSpeaking,
  isBackgroundMusicPlaying,
  toggleBackgroundMusic,
} from '../utils/kidAudio';
import { NumberLegendItem, ActivityMode } from '../types';

interface DigitalColoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageTitle: string;
  pageNumber?: number;
  imageUrl: string;
  storyCaption?: string;
  secondaryCaption?: string;
  secondaryLanguage?: string;
  funFactOrTip?: string;
  childName?: string;
  numberLegend?: NumberLegendItem[];
  activityMode?: ActivityMode;
}

type ToolType = 'crayon' | 'marker' | 'glitter' | 'rainbow' | 'fill' | 'stamp' | 'eraser';
type StampType =
  | '⭐'
  | '💖'
  | '🌸'
  | '👑'
  | '🐾'
  | '🚀'
  | '🦄'
  | '🦖'
  | '🍦'
  | '🎨'
  | '🌈'
  | '🎈'
  | '⚡'
  | '🍀'
  | '🦁'
  | '🍪';

const KID_PALETTE = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Sunshine Yellow
  '#84cc16', // Lime Green
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Bright Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Bubblegum Pink
  '#f43f5e', // Rose
  '#854d0e', // Brown
  '#78716c', // Warm Gray
  '#1f2937', // Dark Gray / Ink
];

const BRUSH_SIZES = [
  { label: 'Fine', size: 6 },
  { label: 'Medium', size: 16 },
  { label: 'Chunky', size: 32 },
  { label: 'Giant', size: 56 },
];

const STAMPS: StampType[] = [
  '⭐',
  '💖',
  '🌸',
  '👑',
  '🐾',
  '🚀',
  '🦄',
  '🦖',
  '🍦',
  '🎨',
  '🌈',
  '🎈',
  '⚡',
  '🍀',
  '🦁',
  '🍪',
];

export const DigitalColoringModal: React.FC<DigitalColoringModalProps> = ({
  isOpen,
  onClose,
  pageTitle,
  pageNumber,
  imageUrl,
  storyCaption,
  secondaryCaption,
  secondaryLanguage = 'es',
  funFactOrTip,
  childName = 'Little Explorer',
  numberLegend,
  activityMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineArtImgRef = useRef<HTMLImageElement | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>('crayon');
  const [selectedColor, setSelectedColor] = useState<string>(KID_PALETTE[0]);
  const [brushSize, setBrushSize] = useState<number>(16);
  const [selectedStamp, setSelectedStamp] = useState<StampType>('⭐');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingLanguage, setSpeakingLanguage] = useState<'en' | 'secondary'>('en');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isCelebrating, setIsCelebrating] = useState<boolean>(false);
  const [isMusicOn, setIsMusicOn] = useState<boolean>(() => isBackgroundMusicPlaying());
  const rainbowHueRef = useRef<number>(0);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize and load image
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      lineArtImgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Match canvas resolution to image or reasonable high-dpi dimensions
      canvas.width = 900;
      canvas.height = 1200;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Draw background white & initial line art
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Save initial snapshot to undo history
      const initialSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
    };

    return () => {
      stopSpeaking();
    };
  }, [isOpen, imageUrl]);

  // Clean up speech on close
  const handleClose = () => {
    stopSpeaking();
    setIsSpeaking(false);
    onClose();
  };

  // Push current state to undo history
  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, snapshot].slice(-15); // keep last 15 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 14));
  }, [historyIndex]);

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (canvas && ctx && history[newIdx]) {
        ctx.putImageData(history[newIdx], 0, 0);
        setHistoryIndex(newIdx);
        playChimeSound('click');
      }
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (canvas && ctx && history[newIdx]) {
        ctx.putImageData(history[newIdx], 0, 0);
        setHistoryIndex(newIdx);
        playChimeSound('click');
      }
    }
  };

  // Reset / Clear
  const handleReset = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    const img = lineArtImgRef.current;
    if (canvas && ctx && img) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      pushHistory();
      playChimeSound('pop');
    }
  };

  // Flood Fill algorithm for Paint Bucket
  const performFloodFill = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    // Convert hex color to rgb
    const fillHex = selectedColor.replace('#', '');
    const fillR = parseInt(fillHex.substring(0, 2), 16);
    const fillG = parseInt(fillHex.substring(2, 4), 16);
    const fillB = parseInt(fillHex.substring(4, 6), 16);

    // If tapping on very dark black line or already target color, ignore
    if (startR < 60 && startG < 60 && startB < 60) return;
    if (startR === fillR && startG === fillG && startB === fillB) return;

    const colorMatch = (pos: number) => {
      const r = data[pos];
      const g = data[pos + 1];
      const b = data[pos + 2];
      const a = data[pos + 3];
      // Do not spread into black outlines
      if (r < 75 && g < 75 && b < 75 && a > 180) return false;
      const diff = Math.abs(r - startR) + Math.abs(g - startG) + Math.abs(b - startB) + Math.abs(a - startA);
      return diff < 60;
    };

    const queue: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    visited[startY * width + startX] = 1;

    let iterations = 0;
    const maxIterations = 350000;

    while (queue.length > 0 && iterations < maxIterations) {
      iterations++;
      const [curX, curY] = queue.pop()!;
      const pos = (curY * width + curX) * 4;

      data[pos] = fillR;
      data[pos + 1] = fillG;
      data[pos + 2] = fillB;
      data[pos + 3] = 255;

      const neighbors: [number, number][] = [
        [curX + 1, curY],
        [curX - 1, curY],
        [curX, curY + 1],
        [curX, curY - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIndex = ny * width + nx;
          if (!visited[nIndex]) {
            visited[nIndex] = 1;
            const nPos = nIndex * 4;
            if (colorMatch(nPos)) {
              queue.push([nx, ny]);
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Pro move: re-draw the original black lines on top with 'multiply' blend mode
    // so outlines never get jagged or faded by the fill!
    if (lineArtImgRef.current) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(lineArtImgRef.current, 0, 0, width, height);
      ctx.restore();
    }

    pushHistory();
    playChimeSound('magic');
  };

  // Convert client coordinates to canvas internal scale
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    };
  };

  // Pointer Down handler
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;

    if (activeTool === 'fill') {
      performFloodFill(coords.x, coords.y);
      return;
    }

    if (activeTool === 'stamp') {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.font = `${brushSize * 2.2}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(selectedStamp, coords.x, coords.y);
        pushHistory();
        playChimeSound('sparkle');
      }
      return;
    }

    setIsDrawing(true);
    drawStroke(coords.x, coords.y, true);
  };

  // Pointer Move handler
  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    drawStroke(coords.x, coords.y, false);
    lastPointRef.current = coords;
  };

  // Pointer Up / Leave handler
  const handlePointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPointRef.current = null;

      // Re-overlay line art with multiply so black outlines stay crisp on top of strokes!
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && lineArtImgRef.current && activeTool !== 'eraser') {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(lineArtImgRef.current, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      pushHistory();
    }
  };

  // Draw brush stroke with Glitter, Rainbow, Crayon, Marker, Eraser
  const drawStroke = (x: number, y: number, isStart: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = brushSize * 1.5;
    } else if (activeTool === 'glitter') {
      // Glitter stroke: sparkling stroke with glittering particle flecks
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = 0.85;

      const glitterColors = ['#ffd700', '#fbcfe8', '#38bdf8', '#f43f5e', '#a855f7', '#ffffff', '#4ade80'];
      for (let i = 0; i < 4; i++) {
        const offsetX = (Math.random() - 0.5) * brushSize * 1.8;
        const offsetY = (Math.random() - 0.5) * brushSize * 1.8;
        const sparkR = 1 + Math.random() * Math.max(2, brushSize * 0.25);
        ctx.fillStyle = glitterColors[Math.floor(Math.random() * glitterColors.length)];
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, sparkR, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (activeTool === 'rainbow') {
      rainbowHueRef.current = (rainbowHueRef.current + 6) % 360;
      ctx.strokeStyle = `hsl(${rainbowHueRef.current}, 90%, 55%)`;
      ctx.lineWidth = brushSize;
    } else if (activeTool === 'crayon') {
      // Crayon texture effect: slightly transparent with softer line
      ctx.strokeStyle = selectedColor;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = brushSize;
    } else {
      // Marker: bold solid color
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
    }

    ctx.beginPath();
    if (isStart) {
      ctx.arc(x, y, (ctx.lineWidth || 10) / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    } else {
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Read story aloud with language choice
  const handleToggleSpeak = (lang: 'en' | 'secondary' = 'en') => {
    if (isSpeaking && speakingLanguage === lang) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      stopSpeaking();
      setSpeakingLanguage(lang);
      const textToRead =
        lang === 'secondary' && secondaryCaption
          ? secondaryCaption
          : `${pageTitle}. ${storyCaption || ''}. ${funFactOrTip || ''}`;

      setIsSpeaking(true);
      const langCode = lang === 'secondary' ? secondaryLanguage : 'en-US';
      speakStory(textToRead, {
        lang: langCode,
        onEnd: () => {
          setIsSpeaking(false);
        },
      });
    }
  };

  // Toggle Background Melody
  const handleToggleMusic = () => {
    const newState = toggleBackgroundMusic();
    setIsMusicOn(newState);
    playChimeSound('sparkle');
  };

  // Celebrate Masterpiece completion
  const handleCelebrate = () => {
    setIsCelebrating(true);
    playChimeSound('fanfare');

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
    });

    setTimeout(() => {
      setIsCelebrating(false);
    }, 4000);
  };

  // Download colored PNG
  const handleDownloadArt = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${childName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-colored-art.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    playChimeSound('sparkle');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-amber-50 rounded-3xl max-w-5xl w-full border-4 border-amber-400 shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* TOP HEADER BAR */}
        <div className="bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-3 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl select-none">🎨</span>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="font-black text-lg sm:text-xl tracking-tight leading-none"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                >
                  {pageTitle}
                </h3>
                {pageNumber && (
                  <span className="px-2 py-0.5 rounded-full bg-black/20 text-white text-[11px] font-bold">
                    Page {pageNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-100 font-medium mt-0.5">
                Digital Coloring Studio for {childName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Background Music Toggle */}
            <button
              type="button"
              onClick={handleToggleMusic}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isMusicOn ? 'bg-amber-300 text-amber-950 ring-2 ring-white/50' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title="Toggle gentle lullaby background music"
            >
              <Music className={`w-3.5 h-3.5 ${isMusicOn ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isMusicOn ? 'Melody: On' : 'Music'}</span>
            </button>

            {/* Story Narrator Button */}
            {(storyCaption || funFactOrTip) && (
              <button
                type="button"
                onClick={() => handleToggleSpeak('en')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isSpeaking && speakingLanguage === 'en'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title="Listen to the story read aloud in English"
              >
                {isSpeaking && speakingLanguage === 'en' ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isSpeaking && speakingLanguage === 'en' ? 'Stop' : '🔊 Read'}</span>
              </button>
            )}

            {/* Bilingual Secondary Story Narrator Button */}
            {secondaryCaption && (
              <button
                type="button"
                onClick={() => handleToggleSpeak('secondary')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isSpeaking && speakingLanguage === 'secondary'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title={`Listen in ${secondaryLanguage.toUpperCase()}`}
              >
                <span className="text-xs">🌐</span>
                <span className="text-[11px] font-bold">{secondaryLanguage.toUpperCase()}</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Celebration Banner */}
        {isCelebrating && (
          <div className="bg-amber-300 text-amber-950 px-4 py-2 text-center text-sm font-black flex items-center justify-center gap-2 animate-bounce shadow-inner">
            <Award className="w-5 h-5 text-amber-800" />
            <span>🎉 AMAZING ARTWORK, {childName.toUpperCase()}! You're a Master Colorer! 🌟</span>
          </div>
        )}

        {/* MAIN BODY: CANVAS & TOOLBAR */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col lg:flex-row items-center justify-center gap-4">
          {/* THE COLORING CANVAS */}
          <div className="relative aspect-3/4 max-h-[62vh] sm:max-h-[68vh] w-auto bg-white rounded-2xl border-4 border-gray-900 shadow-xl overflow-hidden touch-none select-none flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className="w-full h-full object-contain cursor-crosshair"
            />
          </div>

          {/* SIDE/BOTTOM TOOLBAR */}
          <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
            {/* TOOL SELECTOR */}
            <div className="bg-white rounded-2xl p-3 border-2 border-amber-200 shadow-xs space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">
                Pick Your Tool:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'crayon' as ToolType, label: 'Crayon', icon: '🖍️' },
                  { id: 'marker' as ToolType, label: 'Marker', icon: '🖌️' },
                  { id: 'glitter' as ToolType, label: 'Glitter', icon: '✨' },
                  { id: 'rainbow' as ToolType, label: 'Rainbow', icon: '🌈' },
                  { id: 'fill' as ToolType, label: 'Fill', icon: '🪣' },
                  { id: 'stamp' as ToolType, label: 'Stamps', icon: '⭐' },
                  { id: 'eraser' as ToolType, label: 'Eraser', icon: '🧽' },
                ].map((tool) => {
                  const isSelected = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => {
                        setActiveTool(tool.id);
                        playChimeSound('pop');
                      }}
                      className={`p-1.5 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-white shadow-sm scale-105 border-2 border-amber-600'
                          : 'bg-gray-50 hover:bg-amber-50 text-gray-800 border border-gray-200'
                      }`}
                    >
                      <span className="text-lg select-none">{tool.icon}</span>
                      <span className="text-[10px]">{tool.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Brush Size Selector */}
              {activeTool !== 'fill' && activeTool !== 'stamp' && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 mb-1">
                    <span>Brush Thickness:</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {BRUSH_SIZES.map((b) => (
                      <button
                        key={b.size}
                        type="button"
                        onClick={() => setBrushSize(b.size)}
                        className={`py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          brushSize === b.size
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 16 Stickers & Stamps Grid */}
              {activeTool === 'stamp' && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-[11px] font-bold text-gray-600 block mb-1">
                    Pick a Stamp to Place on Canvas:
                  </span>
                  <div className="grid grid-cols-8 gap-1">
                    {STAMPS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setSelectedStamp(st);
                          playChimeSound('sparkle');
                        }}
                        className={`text-lg p-1 rounded-lg border cursor-pointer flex items-center justify-center ${
                          selectedStamp === st
                            ? 'border-amber-500 bg-amber-100 scale-110'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DOT-TO-DOT TIP BANNER (If dot-to-dot mode) */}
            {activityMode === 'dot-to-dot' && (
              <div className="bg-sky-50 rounded-2xl p-2.5 border-2 border-sky-300 shadow-xs flex items-center gap-2">
                <span className="text-xl select-none">✏️</span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-sky-900 block">
                    Connect the Dots!
                  </span>
                  <p className="text-[11px] text-sky-800 font-medium leading-tight">
                    Select Marker or Crayon to connect dots 1, 2, 3... in numerical order!
                  </p>
                </div>
              </div>
            )}

            {/* COLOR BY NUMBERS KEY (If available for page) */}
            {numberLegend && numberLegend.length > 0 && (
              <div className="bg-amber-100/90 rounded-2xl p-2.5 border-2 border-amber-300 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 block">
                    🔢 Color By Numbers Key:
                  </span>
                  <span className="text-[10px] text-amber-800 font-bold">Tap to select</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {numberLegend.map((item) => {
                    const isSelected = selectedColor.toLowerCase() === item.hex.toLowerCase();
                    return (
                      <button
                        key={item.number}
                        type="button"
                        onClick={() => {
                          setSelectedColor(item.hex);
                          if (activeTool === 'eraser' || activeTool === 'rainbow') {
                            setActiveTool('fill');
                          }
                          playSplashSound(1.1);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-white shadow-md scale-105 ring-2 ring-amber-600'
                            : 'bg-white border border-amber-300 text-gray-900 hover:scale-105 shadow-2xs'
                        }`}
                        title={`Select Color ${item.number}: ${item.colorName}`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border ${isSelected ? 'border-white ring-1 ring-white' : 'border-gray-400'}`}
                          style={{ backgroundColor: item.hex }}
                        />
                        <span className="font-extrabold">[{item.number}]</span>
                        <span className={`text-[10px] ${isSelected ? 'text-white' : 'text-gray-600'}`}>{item.colorName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* COLOR PALETTE */}
            {activeTool !== 'rainbow' && activeTool !== 'eraser' && (
              <div className="bg-white rounded-2xl p-3 border-2 border-amber-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                    Kid Color Box:
                  </span>
                  <div
                    className="w-4 h-4 rounded-full border border-gray-400"
                    style={{ backgroundColor: selectedColor }}
                  />
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {KID_PALETTE.map((color) => {
                    const isSelected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color);
                          playSplashSound();
                        }}
                        style={{ backgroundColor: color }}
                        className={`h-8 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-gray-900 scale-110 shadow-md ring-2 ring-amber-400'
                            : 'border-white hover:scale-105 shadow-xs'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS: UNDO / REDO / RESET / CELEBRATE / SAVE */}
            <div className="bg-white rounded-2xl p-3 border-2 border-amber-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 cursor-pointer"
                    title="Undo"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 cursor-pointer"
                    title="Redo"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-2 rounded-xl bg-gray-100 hover:bg-rose-100 text-rose-600 cursor-pointer"
                    title="Start Over / Clear"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCelebrate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-amber-950 font-black text-xs shadow-sm active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>I'm Done! 🎉</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadArt}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save My Colored Artwork!</span>
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM STORY TICKER WITH BILINGUAL SUPPORT */}
        {(storyCaption || funFactOrTip || secondaryCaption) && (
          <div className="bg-amber-100/80 px-4 py-2.5 border-t border-amber-300 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex-1 min-w-0">
              {storyCaption && (
                <p className="font-semibold text-gray-800 line-clamp-1 italic">
                  "{storyCaption}"
                </p>
              )}
              {secondaryCaption && (
                <p className="text-[11px] text-amber-900 font-semibold line-clamp-1">
                  🌐 <span className="uppercase text-[10px] font-bold text-amber-700">[{secondaryLanguage}]:</span> "{secondaryCaption}"
                </p>
              )}
              {funFactOrTip && (
                <p className="text-[11px] text-amber-900 font-bold mt-0.5 line-clamp-1">
                  💡 {funFactOrTip}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleSpeak('en')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold text-[11px] hover:bg-amber-50 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                <span>{isSpeaking && speakingLanguage === 'en' ? 'Pause' : 'Read English'}</span>
              </button>

              {secondaryCaption && (
                <button
                  type="button"
                  onClick={() => handleToggleSpeak('secondary')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-200 border border-amber-400 text-amber-950 font-bold text-[11px] hover:bg-amber-300 cursor-pointer"
                >
                  <span>Read {secondaryLanguage.toUpperCase()}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
