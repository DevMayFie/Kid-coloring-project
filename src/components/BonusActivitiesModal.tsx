import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Sparkles,
  Compass,
  Scissors,
  Palette,
  Search,
  Check,
  RefreshCw,
  HelpCircle,
  Award,
} from 'lucide-react';
import { ColoringBook } from '../types';
import { generateMaze, MazeGrid } from '../utils/mazeGenerator';
import { generateWordSearch, getWordsForTheme, WordSearchResult } from '../utils/wordSearchGenerator';
import { playChimeSound } from '../utils/kidAudio';
import { escapeHtml } from '../utils/security';
import confetti from 'canvas-confetti';

interface BonusActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: ColoringBook;
}

type ActivityTab = 'maze' | 'crafts' | 'colorlab' | 'wordsearch';

export const BonusActivitiesModal: React.FC<BonusActivitiesModalProps> = ({
  isOpen,
  onClose,
  book,
}) => {
  const [activeTab, setActiveTab] = useState<ActivityTab>('maze');

  // Maze State
  const [mazeDifficulty, setMazeDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [maze, setMaze] = useState<MazeGrid>(() => generateMaze(8, 8));
  const [showMazeSolution, setShowMazeSolution] = useState(false);
  const mazeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Word Search State
  const [wordSearch, setWordSearch] = useState<WordSearchResult>(() => {
    const words = getWordsForTheme(book.theme, book.childName);
    return generateWordSearch(words, 8);
  });
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [showWordSearchSolution, setShowWordSearchSolution] = useState(false);

  // Crafts preview ref
  const craftCanvasRef = useRef<HTMLCanvasElement>(null);

  // Color Lab preview ref
  const labCanvasRef = useRef<HTMLCanvasElement>(null);

  // Regenerate maze when difficulty changes
  useEffect(() => {
    const size = mazeDifficulty === 'easy' ? 8 : mazeDifficulty === 'medium' ? 12 : 16;
    setMaze(generateMaze(size, size));
    setShowMazeSolution(false);
  }, [mazeDifficulty]);

  // Render Maze onto Canvas
  useEffect(() => {
    if (activeTab !== 'maze') return;
    const canvas = mazeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600;
    const height = 600;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const padding = 40;
    const mazeW = width - padding * 2;
    const mazeH = height - padding * 2;
    const cellW = mazeW / maze.cols;
    const cellH = mazeH / maze.rows;

    // Optional Solution Path
    if (showMazeSolution && maze.solutionPath.length > 0) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = Math.max(3, cellW * 0.28);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      maze.solutionPath.forEach((pt, idx) => {
        const cx = padding + pt.x * cellW + cellW / 2;
        const cy = padding + pt.y * cellH + cellH / 2;
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
    }

    // Draw Maze Walls with thick black outlines
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = mazeDifficulty === 'easy' ? 4.5 : mazeDifficulty === 'medium' ? 3.5 : 2.5;
    ctx.lineCap = 'square';

    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        const cell = maze.cells[r][c];
        const x = padding + c * cellW;
        const y = padding + r * cellH;

        if (cell.top) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellW, y);
          ctx.stroke();
        }
        if (cell.right) {
          ctx.beginPath();
          ctx.moveTo(x + cellW, y);
          ctx.lineTo(x + cellW, y + cellH);
          ctx.stroke();
        }
        if (cell.bottom) {
          ctx.beginPath();
          ctx.moveTo(x, y + cellH);
          ctx.lineTo(x + cellW, y + cellH);
          ctx.stroke();
        }
        if (cell.left) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + cellH);
          ctx.stroke();
        }
      }
    }

    // Outer border with Start and Finish openings
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 16px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`START (${book.childName})`, padding + cellW / 2, padding - 10);

    ctx.fillStyle = '#EF4444';
    ctx.textBaseline = 'top';
    ctx.fillText('FINISH!', padding + (maze.cols - 0.5) * cellW, height - padding + 10);

    // Cute start and finish icon stamps
    ctx.font = `${Math.min(cellW * 0.8, 30)}px "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚀', padding + cellW / 2, padding + cellH / 2);
    ctx.fillText('⭐', padding + (maze.cols - 0.5) * cellW, padding + (maze.rows - 0.5) * cellH);
  }, [activeTab, maze, showMazeSolution, mazeDifficulty, book.childName]);

  // Handle word toggle in word search
  const handleToggleWord = (word: string) => {
    if (foundWords.includes(word)) {
      setFoundWords(foundWords.filter((w) => w !== word));
    } else {
      const next = [...foundWords, word];
      setFoundWords(next);
      playChimeSound('sparkle');
      if (next.length === wordSearch.words.length) {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
        playChimeSound('fanfare');
      }
    }
  };

  // 1-Click PNG Download of current active activity
  const handleDownloadActivityPng = (title: string, canvasElement: HTMLCanvasElement | null) => {
    if (!canvasElement) return;
    try {
      const link = document.createElement('a');
      link.download = `${book.childName || 'kid'}-${title.toLowerCase().replace(/\s+/g, '-')}-activity.png`;
      link.href = canvasElement.toDataURL('image/png');
      link.click();
      playChimeSound('magic');
    } catch (e) {
      console.error('PNG download error:', e);
    }
  };

  // 1-Click Direct Print for the current activity
  const handlePrintActivity = () => {
    const printContent = document.getElementById('printable-activity-sheet');
    if (!printContent) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(book.childName)}'s Activity Sheet</title>
          <style>
            @page { size: letter portrait; margin: 12mm; }
            body { font-family: 'Fredoka', 'Segoe UI', Arial, sans-serif; text-align: center; color: #1e293b; margin: 0; padding: 10px; }
            h1 { font-size: 24px; margin-bottom: 4px; color: #d97706; }
            p { font-size: 13px; color: #4b5563; margin-top: 0; }
            .canvas-container img { max-width: 90%; height: auto; border: 2px solid #000; border-radius: 8px; }
            .instructions { margin-top: 15px; font-size: 12px; font-weight: bold; color: #64748b; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    // Direct print using clean sandboxed iframe without popup windows
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();
      printFrame.contentWindow?.focus();
      setTimeout(() => {
        try {
          printFrame.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print warning:', e);
        }
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 3000);
      }, 500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border-2 border-amber-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  Bonus Activity &amp; Craft Center
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white">
                  For {book.childName}
                </span>
              </div>
              <p className="text-xs text-white/90">
                Puzzles, cut-out crafts, and color experiments matching {book.theme}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-2 sm:p-3 bg-amber-50/70 border-b border-amber-200 overflow-x-auto shrink-0">
          {[
            { id: 'maze', label: 'Maze Adventure', icon: Compass, color: 'text-amber-800' },
            { id: 'crafts', label: 'Cut-Out Crafts', icon: Scissors, color: 'text-orange-800' },
            { id: 'colorlab', label: 'Color Lab', icon: Palette, color: 'text-pink-800' },
            { id: 'wordsearch', label: 'Word Search', icon: Search, color: 'text-indigo-800' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as ActivityTab);
                  playChimeSound('click');
                }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-xs scale-102'
                    : 'bg-white hover:bg-amber-100/70 text-gray-700 border border-amber-200/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#faf8f5]">
          {/* TAB 1: MAZE ADVENTURE */}
          {activeTab === 'maze' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span>Themed Printable Maze</span>
                    <span className="text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Help {book.childName} Reach the Goal!
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500">
                    Thick black outlines perfect for crayons or pencil pathfinding.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Difficulty selector */}
                  <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-200 text-xs">
                    {(['easy', 'medium', 'hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setMazeDifficulty(diff)}
                        className={`px-2.5 py-1 rounded-lg font-semibold capitalize cursor-pointer transition-colors ${
                          mazeDifficulty === diff
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>

                  {/* Regenerate Button */}
                  <button
                    onClick={() => {
                      const size = mazeDifficulty === 'easy' ? 8 : mazeDifficulty === 'medium' ? 12 : 16;
                      setMaze(generateMaze(size, size));
                      setShowMazeSolution(false);
                      playChimeSound('pop');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 border border-gray-300 text-gray-700 text-xs font-bold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>New Maze</span>
                  </button>

                  {/* Show Solution Toggle */}
                  <button
                    onClick={() => setShowMazeSolution(!showMazeSolution)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      showMazeSolution
                        ? 'bg-amber-100 text-amber-900 border-amber-400'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-amber-50'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>{showMazeSolution ? 'Hide Solution' : 'Show Solution'}</span>
                  </button>
                </div>
              </div>

              {/* Printable Canvas Display */}
              <div
                id="printable-activity-sheet"
                className="bg-white p-6 rounded-2xl border-2 border-gray-900 shadow-md flex flex-col items-center justify-center max-w-lg mx-auto"
              >
                <div className="text-center mb-3">
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                    ★ {book.childName}'s {book.theme} Maze ★
                  </h2>
                  <p className="text-xs text-gray-600">
                    Guide the rocket from START to the ⭐ FINISH without hitting any walls!
                  </p>
                </div>

                <div className="w-full max-w-[420px] aspect-square rounded-xl overflow-hidden border-2 border-gray-900 bg-white shadow-inner flex items-center justify-center">
                  <canvas ref={mazeCanvasRef} className="w-full h-full object-contain" />
                </div>

                <div className="mt-4 flex items-center justify-between w-full max-w-[420px] text-[11px] text-gray-500 border-t border-gray-200 pt-2 font-medium">
                  <span>Theme: {book.theme}</span>
                  <span>ColorCraft Kids Activity Center</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => handleDownloadActivityPng('Maze', mazeCanvasRef.current)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-bold transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-600" />
                  <span>Download Maze PNG</span>
                </button>
                <button
                  onClick={handlePrintActivity}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Maze Now</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CUT-OUT CRAFTS */}
          {activeTab === 'crafts' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <span>Printable Cut-Out Crafts</span>
                  <span className="text-[11px] font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                    Scissors &amp; Paper Fun
                  </span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Color in the patterns, then cut along the dashed lines (✂) to make custom bookmarks and a bedroom door hanger!
                </p>
              </div>

              {/* Printable Craft Preview */}
              <div className="bg-white p-6 rounded-2xl border-2 border-gray-900 shadow-md max-w-2xl mx-auto space-y-6">
                <div className="text-center border-b-2 border-gray-900 pb-3">
                  <h3 className="text-lg font-black text-gray-900 uppercase">
                    ✂ {book.childName}'s DIY Bookmarks &amp; Door Hanger ✂
                  </h3>
                  <p className="text-xs text-gray-500">
                    Step 1: Color the art • Step 2: Ask an adult to help cut along the dashed lines!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Bookmark 1 */}
                  <div className="border-2 border-dashed border-gray-800 rounded-xl p-4 flex flex-col items-center justify-between text-center relative bg-amber-50/30 min-h-[280px]">
                    <div className="absolute -top-3 bg-white px-2 text-[10px] font-bold text-gray-500 flex items-center gap-1">
                      <Scissors className="w-3 h-3" /> Cut Bookmark
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 border-gray-700 mb-2 mt-1" title="Punch ribbon hole here" />
                    <div>
                      <div className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        ★ {book.childName}'s ★
                      </div>
                      <div className="text-[11px] font-bold text-amber-700">Reading Adventure</div>
                    </div>
                    {/* Colorable pattern */}
                    <div className="my-3 space-y-2 w-full px-2">
                      <div className="h-10 border border-gray-800 rounded-lg flex items-center justify-center font-bold text-lg">
                        🚀 ⭐ 🪐
                      </div>
                      <div className="h-10 border border-gray-800 rounded-lg flex items-center justify-center font-bold text-lg">
                        🦖 🌿 🦕
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-600 font-bold border-t border-gray-400 pt-2 w-full">
                      "I Love Reading!"
                    </div>
                  </div>

                  {/* Bookmark 2 */}
                  <div className="border-2 border-dashed border-gray-800 rounded-xl p-4 flex flex-col items-center justify-between text-center relative bg-orange-50/30 min-h-[280px]">
                    <div className="absolute -top-3 bg-white px-2 text-[10px] font-bold text-gray-500 flex items-center gap-1">
                      <Scissors className="w-3 h-3" /> Cut Bookmark
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 border-gray-700 mb-2 mt-1" />
                    <div>
                      <div className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        Coloring Champion
                      </div>
                      <div className="text-[11px] font-bold text-orange-700">Official Bookmark</div>
                    </div>
                    {/* Colorable stars */}
                    <div className="my-3 flex flex-col gap-2 items-center justify-center text-xl">
                      <span>🎨 ✨ 🖍️</span>
                      <span className="text-xs font-bold text-gray-700">Master Artist</span>
                    </div>
                    <div className="text-[10px] text-gray-600 font-bold border-t border-gray-400 pt-2 w-full">
                      Page Marker
                    </div>
                  </div>

                  {/* Door Hanger */}
                  <div className="border-2 border-dashed border-gray-800 rounded-t-3xl rounded-b-xl p-4 flex flex-col items-center justify-between text-center relative bg-blue-50/30 min-h-[280px]">
                    <div className="absolute -top-3 bg-white px-2 text-[10px] font-bold text-gray-500 flex items-center gap-1">
                      <Scissors className="w-3 h-3" /> Door Hanger
                    </div>
                    {/* Door knob hole */}
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-800 flex items-center justify-center text-[9px] font-bold text-gray-400 my-1">
                      Cut Hole
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-900 uppercase">SHHH!</div>
                      <div className="text-[11px] font-bold text-blue-700">
                        {book.childName} is Coloring!
                      </div>
                    </div>
                    <div className="text-2xl my-2">🖍️ 🎨 ✨</div>
                    <div className="text-[10px] text-gray-700 font-bold border-t border-gray-400 pt-2 w-full">
                      Artists at Work
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={handlePrintActivity}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Cut-Out Crafts</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: COLOR MIXING LAB */}
          {activeTab === 'colorlab' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <span>Color Mixing Laboratory</span>
                  <span className="text-[11px] font-medium text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full">
                    Hands-On Color Science
                  </span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Discover how primary colors blend into brand new magic colors! Kids can color in the formula bubbles.
                </p>
              </div>

              {/* Printable Color Lab Page */}
              <div className="bg-white p-6 rounded-2xl border-2 border-gray-900 shadow-md max-w-xl mx-auto space-y-6">
                <div className="text-center border-b-2 border-gray-900 pb-3">
                  <h3 className="text-lg font-black text-gray-900 uppercase">
                    ★ {book.childName}'s Color Mixing Lab ★
                  </h3>
                  <p className="text-xs text-gray-600">
                    Use your red, yellow, and blue crayons to discover how colors mix!
                  </p>
                </div>

                {/* Mixing Formulas */}
                <div className="space-y-4">
                  {[
                    { c1: '🔴 RED', c2: '🟡 YELLOW', result: '🟠 ORANGE', note: 'Like warm sunshine and bright pumpkins!' },
                    { c1: '🔵 BLUE', c2: '🟡 YELLOW', result: '🟢 GREEN', note: 'Like tree frogs and fresh jungle leaves!' },
                    { c1: '🔴 RED', c2: '🔵 BLUE', result: '🟣 PURPLE', note: 'Like ripe grapes and twilight magic!' },
                    { c1: '⚪ WHITE', c2: '🔴 RED', result: '🌸 PINK', note: 'Like cotton candy and rosy cheeks!' },
                  ].map((formula, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border-2 border-gray-800 bg-amber-50/30 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 text-xs font-black">
                        <span className="px-2 py-1 bg-white border border-gray-300 rounded-lg">{formula.c1}</span>
                        <span className="text-gray-500 font-bold">+</span>
                        <span className="px-2 py-1 bg-white border border-gray-300 rounded-lg">{formula.c2}</span>
                        <span className="text-gray-500 font-bold">=</span>
                        <span className="px-2.5 py-1 bg-amber-200 border-2 border-amber-600 rounded-lg text-amber-950 font-black">
                          {formula.result}
                        </span>
                      </div>
                      <div className="hidden sm:block text-[11px] text-gray-500 italic max-w-[160px] text-right">
                        {formula.note}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Practice Swatch Circles */}
                <div className="border-t-2 border-gray-900 pt-4">
                  <div className="text-xs font-bold text-gray-800 mb-2 text-center uppercase tracking-wider">
                    My Color Swatch Test Bubbles (Color Inside!)
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {['Favorite Color', 'My Super Blue', 'Sunny Glow', 'Secret Blend'].map((label, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full border-2 border-gray-800 border-dashed flex items-center justify-center bg-gray-50 text-[10px] text-gray-400">
                          Color Me!
                        </div>
                        <span className="text-[10px] font-bold text-gray-700 mt-1">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={handlePrintActivity}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Color Lab Page</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: WORD SEARCH */}
          {activeTab === 'wordsearch' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span>Story Word Search Puzzle</span>
                    <span className="text-[11px] font-medium text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {wordSearch.words.length} Themed Words to Find
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500">
                    Find the hidden words across the grid horizontally, vertically, or diagonally!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const words = getWordsForTheme(book.theme, book.childName);
                      setWordSearch(generateWordSearch(words, 8));
                      setFoundWords([]);
                      setShowWordSearchSolution(false);
                      playChimeSound('pop');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 border border-gray-300 text-gray-700 text-xs font-bold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>New Puzzle</span>
                  </button>
                  <button
                    onClick={() => setShowWordSearchSolution(!showWordSearchSolution)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      showWordSearchSolution
                        ? 'bg-indigo-100 text-indigo-900 border-indigo-400'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-700" />
                    <span>{showWordSearchSolution ? 'Hide Hints' : 'Show Hints'}</span>
                  </button>
                </div>
              </div>

              {/* Puzzle Display */}
              <div className="bg-white p-6 rounded-2xl border-2 border-gray-900 shadow-md max-w-lg mx-auto space-y-5">
                <div className="text-center">
                  <h3 className="text-lg font-black text-gray-900 uppercase">
                    ★ {book.childName}'s {book.theme} Word Search ★
                  </h3>
                  <p className="text-xs text-gray-600">
                    Circle each word as you find it!
                  </p>
                </div>

                {/* Letter Grid */}
                <div className="inline-block mx-auto bg-amber-50/50 p-3 rounded-2xl border-2 border-gray-800">
                  <div
                    className="grid gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${wordSearch.size}, minmax(0, 1fr))`,
                    }}
                  >
                    {wordSearch.grid.map((row, rIdx) =>
                      row.map((letter, cIdx) => {
                        const isSolutionCell =
                          showWordSearchSolution &&
                          wordSearch.placements.some((p) => {
                            const inX =
                              p.dir.dx === 0
                                ? cIdx === p.start.x
                                : (cIdx - p.start.x) / p.dir.dx >= 0 &&
                                  (cIdx - p.start.x) / p.dir.dx < p.word.length &&
                                  (rIdx - p.start.y) === ((cIdx - p.start.x) / p.dir.dx) * p.dir.dy;
                            return inX;
                          });

                        return (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base border transition-colors select-none ${
                              isSolutionCell
                                ? 'bg-amber-200 border-amber-500 text-amber-950 font-black'
                                : 'bg-white border-gray-200 text-gray-800 hover:bg-amber-100/60'
                            }`}
                          >
                            {letter}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Word Bank */}
                <div className="border-t-2 border-gray-200 pt-3">
                  <div className="text-xs font-bold text-gray-700 uppercase mb-2 text-center">
                    Word Bank (Click to Check Off)
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {wordSearch.words.map((w) => {
                      const isFound = foundWords.includes(w);
                      return (
                        <button
                          key={w}
                          onClick={() => handleToggleWord(w)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isFound
                              ? 'bg-emerald-100 text-emerald-800 line-through border border-emerald-300'
                              : 'bg-gray-100 text-gray-800 hover:bg-indigo-50 border border-gray-300'
                          }`}
                        >
                          {isFound && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{w}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={handlePrintActivity}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Word Search</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
