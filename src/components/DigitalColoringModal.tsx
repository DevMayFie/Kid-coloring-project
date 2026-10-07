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
import { NumberLegendItem, ActivityMode, PageBorderStyle, PlacedSticker } from '../types';
import { PageBorderRenderer, BORDER_STYLES } from './PageBorderRenderer';
import { DigitalStickerLibraryPanel } from './DigitalStickerLibraryPanel';
import { DigitalSticker } from '../data/stickerLibrary';
import { VoiceRecorderWidget } from './VoiceRecorderWidget';

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
  borderStyle?: PageBorderStyle;
  initialStickers?: PlacedSticker[];
  voiceAudioUrl?: string;
  onSaveVoiceAudio?: (audioUrl: string, duration: number) => void;
  onSaveArtwork?: (coloredDataUrl: string, stickers: PlacedSticker[], borderStyle?: PageBorderStyle) => void;
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

export interface ThematicPalette {
  id: string;
  name: string;
  emoji: string;
  colors: string[];
}

export const KID_PALETTE = [
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

export const CURATED_THEMATIC_PALETTES: ThematicPalette[] = [
  {
    id: 'rainbow',
    name: 'Rainbow Classic',
    emoji: '🌈',
    colors: KID_PALETTE,
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    emoji: '🌊',
    colors: ['#0f4c81', '#0284c7', '#38bdf8', '#2dd4bf', '#f43f5e', '#fde047', '#fb923c', '#e0e7ff', '#1e293b', '#ffffff'],
  },
  {
    id: 'safari',
    name: 'Safari Savanna',
    emoji: '🦁',
    colors: ['#b45309', '#78350f', '#ea580c', '#65a30d', '#15803d', '#fef08a', '#64748b', '#fed7aa', '#451a03', '#ffffff'],
  },
  {
    id: 'galaxy',
    name: 'Cosmic Galaxy',
    emoji: '🚀',
    colors: ['#581c87', '#9333ea', '#ec4899', '#06b6d4', '#3b82f6', '#facc15', '#1e1b4b', '#f8fafc', '#a855f7', '#38bdf8'],
  },
  {
    id: 'meadow',
    name: 'Pastel Meadow',
    emoji: '🌸',
    colors: ['#f472b6', '#fbcfe8', '#a7f3d0', '#bae6fd', '#ddd6fe', '#fef08a', '#fed7aa', '#ffffff', '#86efac', '#f9a8d4'],
  },
  {
    id: 'autumn',
    name: 'Woodland Autumn',
    emoji: '🍂',
    colors: ['#c2410c', '#991b1b', '#d97706', '#713f12', '#3f6212', '#a16207', '#f97316', '#fef3c7', '#292524', '#fde68a'],
  },
  {
    id: 'berry',
    name: 'Berry Sweet',
    emoji: '🍓',
    colors: ['#dc2626', '#2563eb', '#7c3aed', '#db2777', '#84cc16', '#fbbf24', '#f43f5e', '#ffffff', '#e11d48', '#9333ea'],
  },
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
  borderStyle = 'classic-double',
  initialStickers = [],
  voiceAudioUrl,
  onSaveVoiceAudio,
  onSaveArtwork,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
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

  // Digital Stickers & Customizable Borders state
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>(initialStickers || []);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [currentBorderStyle, setCurrentBorderStyle] = useState<PageBorderStyle>(borderStyle || 'classic-double');
  const [activeTab, setActiveTab] = useState<'tools' | 'stickers' | 'borders'>('tools');
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);

  // Thematic Palette state
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('rainbow');
  const activePalette =
    CURATED_THEMATIC_PALETTES.find((p) => p.id === selectedPaletteId) || CURATED_THEMATIC_PALETTES[0];

  // Interactive Dot-to-Dot & Maze state
  const [currentDotIndex, setCurrentDotIndex] = useState<number>(0);
  const [isDotToDotComplete, setIsDotToDotComplete] = useState<boolean>(false);
  const [isSnapToDotEnabled, setIsSnapToDotEnabled] = useState<boolean>(true);
  const [isMazeGuideOn, setIsMazeGuideOn] = useState<boolean>(false);

  // 18 cheerful outline coordinates (percentage 0-100 on canvas) for Dot-to-Dot activities
  const DOT_NODES = [
    { id: 1, x: 50, y: 16 },
    { id: 2, x: 62, y: 22 },
    { id: 3, x: 74, y: 22 },
    { id: 4, x: 82, y: 34 },
    { id: 5, x: 82, y: 48 },
    { id: 6, x: 90, y: 60 },
    { id: 7, x: 84, y: 72 },
    { id: 8, x: 70, y: 78 },
    { id: 9, x: 60, y: 88 },
    { id: 10, x: 50, y: 82 },
    { id: 11, x: 40, y: 88 },
    { id: 12, x: 30, y: 78 },
    { id: 13, x: 16, y: 72 },
    { id: 14, x: 10, y: 60 },
    { id: 15, x: 18, y: 48 },
    { id: 16, x: 18, y: 34 },
    { id: 17, x: 26, y: 22 },
    { id: 18, x: 38, y: 22 },
  ];

  const handleDotClick = (dotId: number) => {
    if (isDotToDotComplete) return;
    const expected = currentDotIndex + 1;
    if (dotId === expected) {
      const canvas = canvasRef.current;
      if (canvas && currentDotIndex > 0) {
        const prevDot = DOT_NODES[currentDotIndex - 1];
        const currDot = DOT_NODES[currentDotIndex];
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo((prevDot.x / 100) * canvas.width, (prevDot.y / 100) * canvas.height);
          ctx.lineTo((currDot.x / 100) * canvas.width, (currDot.y / 100) * canvas.height);
          ctx.stroke();
          ctx.restore();
          pushHistory();
        }
      }

      playSplashSound(1.2);
      playChimeSound('sparkle');
      if ('speechSynthesis' in window) {
        try {
          const u = new SpeechSynthesisUtterance(String(dotId));
          u.rate = 1.1;
          u.pitch = 1.3;
          window.speechSynthesis.speak(u);
        } catch (e) {}
      }

      setCurrentDotIndex(dotId);

      if (dotId === DOT_NODES.length) {
        const canvas = canvasRef.current;
        if (canvas) {
          const first = DOT_NODES[0];
          const last = DOT_NODES[DOT_NODES.length - 1];
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo((last.x / 100) * canvas.width, (last.y / 100) * canvas.height);
            ctx.lineTo((first.x / 100) * canvas.width, (first.y / 100) * canvas.height);
            ctx.stroke();
            ctx.restore();
            pushHistory();
          }
        }
        setIsDotToDotComplete(true);
        handleCelebrate();
      }
    } else {
      playChimeSound('pop');
    }
  };

  // Sync stickers and border on open
  useEffect(() => {
    if (isOpen) {
      setPlacedStickers(initialStickers || []);
      setCurrentBorderStyle(borderStyle || 'classic-double');
      setCurrentDotIndex(0);
      setIsDotToDotComplete(false);
    }
  }, [isOpen, imageUrl, borderStyle, initialStickers]);

  // Initialize and load image
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const initializeCanvasWithImage = (imageElement: HTMLImageElement | null) => {
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
      if (imageElement) {
        ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      }

      // Save initial snapshot to undo history
      const initialSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      lineArtImgRef.current = img;
      initializeCanvasWithImage(img);
    };
    img.onerror = () => {
      // Fallback: try loading without crossOrigin if CORS headers were blocked
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        lineArtImgRef.current = fallbackImg;
        initializeCanvasWithImage(fallbackImg);
      };
      fallbackImg.onerror = () => {
        // Initialize white canvas so child can still freely draw
        initializeCanvasWithImage(null);
      };
      fallbackImg.src = imageUrl;
    };
    img.src = imageUrl;

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

  // Helper to bake stickers onto canvas bitmap for pristine PNG export and saving
  const generateCompositeDataUrl = async (): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/png');

    // Draw base colored drawing
    ctx.drawImage(canvas, 0, 0);

    // Bake placed stickers in order
    if (placedStickers.length > 0) {
      for (const sticker of placedStickers) {
        const posX = (sticker.x / 100) * offscreen.width;
        const posY = (sticker.y / 100) * offscreen.height;
        const stickerPixelSize = 130 * (sticker.scale || 1.0);

        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(((sticker.rotation || 0) * Math.PI) / 180);

        if (sticker.svgDataUri) {
          try {
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                ctx.drawImage(
                  img,
                  -stickerPixelSize / 2,
                  -stickerPixelSize / 2,
                  stickerPixelSize,
                  stickerPixelSize
                );
                resolve();
              };
              img.onerror = () => resolve();
              img.src = sticker.svgDataUri!;
            });
          } catch (e) {
            ctx.font = `${stickerPixelSize * 0.75}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sticker.emoji, 0, 0);
          }
        } else {
          ctx.font = `${stickerPixelSize * 0.75}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sticker.emoji, 0, 0);
        }

        ctx.restore();
      }
    }

    return offscreen.toDataURL('image/png');
  };

  // Drag & drop sticker from panel onto canvas
  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverCanvas) setIsDragOverCanvas(true);
  };

  const handleCanvasDragLeave = () => {
    setIsDragOverCanvas(false);
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const stickerData = JSON.parse(raw);
      if (!canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const x = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(8, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100));

      const newSticker: PlacedSticker = {
        id: `sticker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        stickerId: stickerData.id,
        emoji: stickerData.emoji,
        label: stickerData.name,
        svgDataUri: stickerData.svgDataUri,
        x,
        y,
        scale: 1.0,
        rotation: 0,
      };

      setPlacedStickers((prev) => [...prev, newSticker]);
      setActiveStickerId(newSticker.id);
      playChimeSound('sparkle');
    } catch (err) {
      console.warn('Canvas drop sticker error:', err);
    }
  };

  const handleSelectStickerFromLibrary = (sticker: DigitalSticker) => {
    const newSticker: PlacedSticker = {
      id: `sticker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      stickerId: sticker.id,
      emoji: sticker.emoji,
      label: sticker.name,
      svgDataUri: sticker.svgDataUri,
      x: 50 + (Math.random() * 16 - 8),
      y: 50 + (Math.random() * 16 - 8),
      scale: 1.0,
      rotation: 0,
    };
    setPlacedStickers((prev) => [...prev, newSticker]);
    setActiveStickerId(newSticker.id);
    playChimeSound('pop');
  };

  const handleUpdatePlacedSticker = (id: string, updates: Partial<PlacedSticker>) => {
    setPlacedStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleDeletePlacedSticker = (id: string) => {
    setPlacedStickers((prev) => prev.filter((s) => s.id !== id));
    if (activeStickerId === id) setActiveStickerId(null);
    playChimeSound('pop');
  };

  // Download colored PNG (including all baked stickers!)
  const handleDownloadArt = async () => {
    const dataUrl = await generateCompositeDataUrl();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `${childName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-colored-art.png`;
    link.href = dataUrl;
    link.click();
    playChimeSound('sparkle');
  };

  // Save colored artwork with stickers & border back to coloring book
  const handleSaveToBook = async () => {
    const dataUrl = await generateCompositeDataUrl();
    if (dataUrl && onSaveArtwork) {
      onSaveArtwork(dataUrl, placedStickers, currentBorderStyle);
    }
    handleCelebrate();
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
          <div
            ref={canvasContainerRef}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
            className={`relative aspect-3/4 max-h-[62vh] sm:max-h-[68vh] w-auto bg-white rounded-2xl border-4 ${
              isDragOverCanvas ? 'border-amber-500 ring-4 ring-amber-300' : 'border-gray-900'
            } shadow-xl overflow-hidden touch-none select-none flex items-center justify-center transition-all`}
          >
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

            {/* CUSTOMIZABLE BORDER OVERLAY */}
            <PageBorderRenderer borderStyle={currentBorderStyle} />

            {/* DRAG-AND-DROP TARGET HIGHLIGHT OVERLAY */}
            {isDragOverCanvas && (
              <div className="absolute inset-0 bg-amber-400/20 backdrop-blur-2xs border-4 border-dashed border-amber-500 rounded-2xl flex flex-col items-center justify-center pointer-events-none z-30 animate-pulse">
                <span className="text-4xl select-none mb-1">✨</span>
                <span className="bg-white/95 text-amber-950 px-3 py-1 rounded-xl font-black text-xs shadow-md border-2 border-amber-400">
                  Drop Sticker Here!
                </span>
              </div>
            )}

            {/* INTERACTIVE PLACED STICKERS LAYER */}
            {placedStickers.map((st) => {
              const isSelected = activeStickerId === st.id;
              return (
                <div
                  key={st.id}
                  style={{
                    position: 'absolute',
                    left: `${st.x}%`,
                    top: `${st.y}%`,
                    transform: `translate(-50%, -50%) rotate(${st.rotation || 0}deg) scale(${st.scale || 1.0})`,
                    zIndex: isSelected ? 30 : 20,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStickerId(st.id);
                    playChimeSound('pop');
                  }}
                  className={`group select-none cursor-move touch-none p-1 transition-transform ${
                    isSelected ? 'ring-2 ring-amber-500 rounded-full bg-amber-200/30' : ''
                  }`}
                >
                  {/* Sticker Visual */}
                  {st.svgDataUri ? (
                    <img
                      src={st.svgDataUri}
                      alt={st.label}
                      className="w-14 h-14 object-contain pointer-events-none drop-shadow-md"
                    />
                  ) : (
                    <span className="text-5xl select-none filter drop-shadow-md">{st.emoji}</span>
                  )}

                  {/* Selected Sticker Action Bar */}
                  {isSelected && (
                    <div
                      className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white/95 rounded-full px-2 py-0.5 shadow-md border border-amber-400 flex items-center gap-1.5 text-[11px] whitespace-nowrap z-40"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdatePlacedSticker(st.id, {
                            rotation: ((st.rotation || 0) + 20) % 360,
                          })
                        }
                        className="hover:scale-125 transition-transform text-amber-800"
                        title="Rotate 20°"
                      >
                        🔄
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdatePlacedSticker(st.id, {
                            scale: Math.min(2.5, (st.scale || 1.0) + 0.2),
                          })
                        }
                        className="hover:scale-125 transition-transform text-amber-900 font-black px-0.5"
                        title="Grow"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdatePlacedSticker(st.id, {
                            scale: Math.max(0.5, (st.scale || 1.0) - 0.2),
                          })
                        }
                        className="hover:scale-125 transition-transform text-amber-900 font-black px-0.5"
                        title="Shrink"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlacedSticker(st.id)}
                        className="hover:scale-125 transition-transform text-rose-600 pl-0.5"
                        title="Delete Sticker"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* INTERACTIVE SNAP-TO-DOT NUMBERS LAYER */}
            {activityMode === 'dot-to-dot' && isSnapToDotEnabled && (
              <div className="absolute inset-0 pointer-events-auto z-25">
                {DOT_NODES.map((dot) => {
                  const isCompleted = currentDotIndex >= dot.id;
                  const isNext = currentDotIndex + 1 === dot.id;
                  return (
                    <button
                      key={dot.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDotClick(dot.id);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${dot.x}%`,
                        top: `${dot.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-[11px] select-none transition-all cursor-pointer shadow-md ${
                        isCompleted
                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 scale-95'
                          : isNext
                          ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-300 animate-bounce scale-115 z-30 font-black'
                          : 'bg-white text-gray-800 border-2 border-gray-700 hover:scale-105'
                      }`}
                      title={`Dot #${dot.id}`}
                    >
                      {dot.id}
                    </button>
                  );
                })}
              </div>
            )}

            {/* MAZE PATHFINDER GUIDE OVERLAY */}
            {activityMode === 'maze' && isMazeGuideOn && (
              <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                  <path
                    d="M 15 20 Q 25 35 35 25 T 55 45 T 40 70 T 75 80"
                    stroke="#06b6d4"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray="4 3"
                    className="animate-pulse opacity-85"
                  />
                </svg>
                <div className="absolute top-3 right-3 bg-cyan-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black shadow-md">
                  ✨ Magic Path Guide
                </div>
              </div>
            )}
          </div>

          {/* SIDE/BOTTOM TOOLBAR */}
          <div className="w-full lg:w-84 flex flex-col gap-3 shrink-0">
            {/* SIDEBAR TABS: DRAWING TOOLS / STICKER LIBRARY / PAGE BORDER */}
            <div className="bg-white rounded-2xl p-1.5 border-2 border-amber-200 shadow-xs flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('tools');
                  playChimeSound('pop');
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'tools'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-transparent hover:bg-amber-50 text-gray-700'
                }`}
              >
                <span>🖍️</span>
                <span>Tools</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('stickers');
                  playChimeSound('sparkle');
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                  activeTab === 'stickers'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-transparent hover:bg-amber-50 text-gray-700'
                }`}
              >
                <span>✨</span>
                <span>Stickers</span>
                {placedStickers.length > 0 && (
                  <span className="text-[10px] bg-amber-200 text-amber-950 font-black px-1.5 py-0.2 rounded-full">
                    {placedStickers.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('borders');
                  playChimeSound('pop');
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'borders'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-transparent hover:bg-amber-50 text-gray-700'
                }`}
              >
                <span>🖼️</span>
                <span>Border</span>
              </button>
            </div>

            {/* TAB 1: DRAWING TOOLS */}
            {activeTab === 'tools' && (
              <>
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

            {/* DOT-TO-DOT INTERACTIVE CONTROLS */}
            {activityMode === 'dot-to-dot' && (
              <div className="bg-sky-50 rounded-2xl p-3 border-2 border-sky-300 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg select-none">✏️</span>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-sky-900 block">
                        Snap-to-Dot Mode
                      </span>
                      <span className="text-[10px] text-sky-700 font-bold">
                        {isDotToDotComplete
                          ? '🌟 Solved! Great job!'
                          : `Next: Dot #${currentDotIndex + 1} of ${DOT_NODES.length}`}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSnapToDotEnabled(!isSnapToDotEnabled);
                      playChimeSound('pop');
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer transition-all ${
                      isSnapToDotEnabled ? 'bg-sky-500 text-white shadow-xs' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isSnapToDotEnabled ? 'Snap: ON' : 'Snap: OFF'}
                  </button>
                </div>

                <div className="w-full bg-sky-200/80 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-sky-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(currentDotIndex / DOT_NODES.length) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-sky-800 font-medium">Tap each number in order to draw!</span>
                  {currentDotIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentDotIndex(0);
                        setIsDotToDotComplete(false);
                        playChimeSound('pop');
                      }}
                      className="text-sky-700 font-bold hover:underline cursor-pointer"
                    >
                      Reset Dots
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* MAZE PATHFINDER SOLVER GUIDE */}
            {activityMode === 'maze' && (
              <div className="bg-cyan-50 rounded-2xl p-3 border-2 border-cyan-300 shadow-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg select-none">🧭</span>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-cyan-950 block">
                      Magic Maze Pathfinder
                    </span>
                    <span className="text-[10px] text-cyan-800 font-medium">
                      {isMazeGuideOn ? 'Glowing guide path is active' : 'Need a hint? Turn on pathfinder'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsMazeGuideOn(!isMazeGuideOn);
                    playChimeSound('sparkle');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all shadow-xs ${
                    isMazeGuideOn ? 'bg-cyan-600 text-white' : 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border border-cyan-300'
                  }`}
                >
                  {isMazeGuideOn ? 'Hide Path' : 'Show Path ✨'}
                </button>
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

            {/* CURATED THEMATIC PALETTES & COLOR BOX */}
            {activeTool !== 'rainbow' && activeTool !== 'eraser' && (
              <div className="bg-white rounded-2xl p-3 border-2 border-amber-200 shadow-xs space-y-2.5">
                {/* Palette Selector Tabs */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-600">
                      🎨 Curated Palettes:
                    </span>
                    <div
                      className="w-4 h-4 rounded-full border border-gray-400 shadow-2xs"
                      style={{ backgroundColor: selectedColor }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {CURATED_THEMATIC_PALETTES.map((tp) => {
                      const isChosen = selectedPaletteId === tp.id;
                      return (
                        <button
                          key={tp.id}
                          type="button"
                          onClick={() => {
                            setSelectedPaletteId(tp.id);
                            setSelectedColor(tp.colors[0]);
                            playChimeSound('pop');
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                            isChosen
                              ? 'bg-amber-500 text-white shadow-xs scale-105 ring-1 ring-amber-600 font-black'
                              : 'bg-amber-50/70 hover:bg-amber-100 text-gray-700 border border-amber-200'
                          }`}
                        >
                          <span>{tp.emoji}</span>
                          <span>{tp.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Swatches Grid */}
                <div className="grid grid-cols-5 gap-1.5 pt-1 border-t border-gray-100">
                  {activePalette.colors.map((color) => {
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
                        className={`h-7 sm:h-8 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-gray-900 scale-110 shadow-md ring-2 ring-amber-400'
                            : 'border-white hover:scale-105 shadow-2xs'
                        }`}
                        title={color}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            </>
          )}

          {/* TAB 2: DIGITAL STICKER LIBRARY */}
          {activeTab === 'stickers' && (
            <DigitalStickerLibraryPanel
              onSelectSticker={handleSelectStickerFromLibrary}
              totalPlacedCount={placedStickers.length}
              onClearAllStickers={() => {
                setPlacedStickers([]);
                setActiveStickerId(null);
                playChimeSound('pop');
              }}
            />
          )}

          {/* TAB 3: CUSTOMIZABLE PAGE BORDER PICKER */}
          {activeTab === 'borders' && (
            <div className="bg-white rounded-2xl p-3 border-2 border-amber-200 shadow-xs space-y-2 max-h-80 overflow-y-auto">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">
                Select Page Border:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {BORDER_STYLES.map((b) => {
                  const isSelected = currentBorderStyle === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setCurrentBorderStyle(b.id);
                        playChimeSound('sparkle');
                      }}
                      className={`p-2 rounded-xl border-2 text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/80 shadow-xs ring-2 ring-amber-300'
                          : 'border-gray-200 bg-white hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base select-none">{b.icon}</span>
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {b.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 line-clamp-1">
                        {b.tag}
                      </span>
                    </button>
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

              {/* Save Artwork with Stickers & Border directly into Book */}
              {onSaveArtwork && (
                <button
                  type="button"
                  onClick={handleSaveToBook}
                  className="w-full py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Save Artwork to Coloring Book!</span>
                </button>
              )}

              {/* Download PNG File */}
              <button
                type="button"
                onClick={handleDownloadArt}
                className="w-full py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-600" />
                <span>Download High-Res PNG</span>
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

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {onSaveVoiceAudio && (
                <VoiceRecorderWidget
                  initialAudioUrl={voiceAudioUrl}
                  onSaveAudio={onSaveVoiceAudio}
                  compact={true}
                />
              )}

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
