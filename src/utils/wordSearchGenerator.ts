// Themed Word Search Puzzle Generator for Children's Activity Pages

export interface WordPlacement {
  word: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  dir: { dx: number; dy: number };
}

export interface WordSearchResult {
  grid: string[][];
  words: string[];
  placements: WordPlacement[];
  size: number;
}

// Generate themed word list based on common children's book topics and child's name
export function getWordsForTheme(theme: string, childName?: string): string[] {
  const t = (theme || '').toLowerCase();
  const cleanName = (childName || '').toUpperCase().replace(/[^A-Z]/g, '');

  let themeWords: string[] = [];

  if (t.includes('dino') || t.includes('jurassic')) {
    themeWords = ['DINO', 'T-REX', 'ROAR', 'FOSSIL', 'EGGS', 'TAIL', 'JUNGLE', 'TRACKS'];
  } else if (t.includes('space') || t.includes('galaxy') || t.includes('planet')) {
    themeWords = ['SPACE', 'ROCKET', 'STARS', 'MOON', 'COMET', 'ALIEN', 'ORBIT', 'SOLAR'];
  } else if (t.includes('ocean') || t.includes('sea') || t.includes('underwater')) {
    themeWords = ['OCEAN', 'FISH', 'WHALE', 'CORAL', 'SHARK', 'SHELL', 'WAVES', 'DIVER'];
  } else if (t.includes('magic') || t.includes('fairy') || t.includes('wizard') || t.includes('unicorn')) {
    themeWords = ['MAGIC', 'WAND', 'FAIRY', 'SPELL', 'WINGS', 'CASTLE', 'SPARKLE', 'CROWN'];
  } else if (t.includes('animal') || t.includes('safari') || t.includes('zoo')) {
    themeWords = ['LION', 'ZEBRA', 'TIGER', 'PANDA', 'BEAR', 'SAFARI', 'FOREST', 'PAWS'];
  } else if (t.includes('vehicle') || t.includes('car') || t.includes('train') || t.includes('truck')) {
    themeWords = ['TRAIN', 'TRUCK', 'WHEELS', 'MOTOR', 'TRACK', 'DRIVE', 'RACE', 'FAST'];
  } else {
    themeWords = ['STORY', 'COLOR', 'MAGIC', 'HAPPY', 'SMILE', 'FRIEND', 'DREAM', 'ADVENTURE'];
  }

  // Sanitize words (letters only, uppercase, length 3 to 7)
  const sanitized = themeWords
    .map((w) => w.toUpperCase().replace(/[^A-Z]/g, ''))
    .filter((w) => w.length >= 3 && w.length <= 8);

  const finalWords: string[] = [];
  if (cleanName && cleanName.length >= 3 && cleanName.length <= 8) {
    finalWords.push(cleanName);
  }

  for (const w of sanitized) {
    if (!finalWords.includes(w) && finalWords.length < 6) {
      finalWords.push(w);
    }
  }

  return finalWords.length >= 4 ? finalWords : ['COLOR', 'MAGIC', 'STORY', 'STAR', 'SMILE'];
}

export function generateWordSearch(
  words: string[],
  size: number = 8
): WordSearchResult {
  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => '')
  );

  const directions = [
    { dx: 1, dy: 0 }, // Horizontal left-to-right
    { dx: 0, dy: 1 }, // Vertical top-to-bottom
    { dx: 1, dy: 1 }, // Diagonal down-right
  ];

  const placements: WordPlacement[] = [];
  const placedWords: string[] = [];

  for (const word of words) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 100) {
      attempts++;
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const maxStartX = dir.dx === 0 ? size : size - (word.length - 1) * dir.dx;
      const maxStartY = dir.dy === 0 ? size : size - (word.length - 1) * dir.dy;

      if (maxStartX <= 0 || maxStartY <= 0) continue;

      const startX = Math.floor(Math.random() * maxStartX);
      const startY = Math.floor(Math.random() * maxStartY);

      // Check collision
      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const x = startX + i * dir.dx;
        const y = startY + i * dir.dy;
        if (grid[y][x] !== '' && grid[y][x] !== word[i]) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          const x = startX + i * dir.dx;
          const y = startY + i * dir.dy;
          grid[y][x] = word[i];
        }
        placements.push({
          word,
          start: { x: startX, y: startY },
          end: {
            x: startX + (word.length - 1) * dir.dx,
            y: startY + (word.length - 1) * dir.dy,
          },
          dir,
        });
        placedWords.push(word);
        placed = true;
      }
    }
  }

  // Fill remaining cells with random uppercase letters
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return {
    grid,
    words: placedWords,
    placements,
    size,
  };
}
