// 2D Algorithmic Maze Generator using Depth-First Search with backtracking
// Generates clean, crisp grid mazes tailored for printable children's coloring books

export interface MazeCell {
  x: number;
  y: number;
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  visited: boolean;
}

export interface MazeGrid {
  cols: number;
  rows: number;
  cells: MazeCell[][];
  start: { x: number; y: number };
  end: { x: number; y: number };
  solutionPath: Array<{ x: number; y: number }>;
}

export function generateMaze(cols: number = 10, rows: number = 10): MazeGrid {
  const cells: MazeCell[][] = [];

  // Initialize cells with all walls up
  for (let r = 0; r < rows; r++) {
    const row: MazeCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        x: c,
        y: r,
        top: true,
        right: true,
        bottom: true,
        left: true,
        visited: false,
      });
    }
    cells.push(row);
  }

  // Recursive DFS with backtracking
  const stack: MazeCell[] = [];
  const startCell = cells[0][0];
  startCell.visited = true;
  stack.push(startCell);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: Array<{ cell: MazeCell; dir: 'top' | 'right' | 'bottom' | 'left' }> = [];

    // Check North
    if (current.y > 0 && !cells[current.y - 1][current.x].visited) {
      neighbors.push({ cell: cells[current.y - 1][current.x], dir: 'top' });
    }
    // Check East
    if (current.x < cols - 1 && !cells[current.y][current.x + 1].visited) {
      neighbors.push({ cell: cells[current.y][current.x + 1], dir: 'right' });
    }
    // Check South
    if (current.y < rows - 1 && !cells[current.y + 1][current.x].visited) {
      neighbors.push({ cell: cells[current.y + 1][current.x], dir: 'bottom' });
    }
    // Check West
    if (current.x > 0 && !cells[current.y][current.x - 1].visited) {
      neighbors.push({ cell: cells[current.y][current.x - 1], dir: 'left' });
    }

    if (neighbors.length > 0) {
      // Pick random neighbor
      const nextIdx = Math.floor(Math.random() * neighbors.length);
      const { cell: nextCell, dir } = neighbors[nextIdx];

      // Knock down wall between current and nextCell
      if (dir === 'top') {
        current.top = false;
        nextCell.bottom = false;
      } else if (dir === 'right') {
        current.right = false;
        nextCell.left = false;
      } else if (dir === 'bottom') {
        current.bottom = false;
        nextCell.top = false;
      } else if (dir === 'left') {
        current.left = false;
        nextCell.right = false;
      }

      nextCell.visited = true;
      stack.push(nextCell);
    } else {
      stack.pop();
    }
  }

  // Open entry and exit
  cells[0][0].top = false; // Start at top-left
  cells[rows - 1][cols - 1].bottom = false; // End at bottom-right

  // Solve maze using BFS to get optimal solution path for kid hints
  const solutionPath = solveMaze(cells, cols, rows);

  return {
    cols,
    rows,
    cells,
    start: { x: 0, y: 0 },
    end: { x: cols - 1, y: rows - 1 },
    solutionPath,
  };
}

function solveMaze(
  cells: MazeCell[][],
  cols: number,
  rows: number
): Array<{ x: number; y: number }> {
  const queue: Array<{ x: number; y: number; path: Array<{ x: number; y: number }> }> = [
    { x: 0, y: 0, path: [{ x: 0, y: 0 }] },
  ];
  const visited = new Set<string>();
  visited.add('0,0');

  while (queue.length > 0) {
    const { x, y, path } = queue.shift()!;

    if (x === cols - 1 && y === rows - 1) {
      return path;
    }

    const current = cells[y][x];

    // North
    if (!current.top && y > 0 && !visited.has(`${x},${y - 1}`)) {
      visited.add(`${x},${y - 1}`);
      queue.push({ x, y: y - 1, path: [...path, { x, y: y - 1 }] });
    }
    // East
    if (!current.right && x < cols - 1 && !visited.has(`${x + 1},${y}`)) {
      visited.add(`${x + 1},${y}`);
      queue.push({ x: x + 1, y, path: [...path, { x: x + 1, y }] });
    }
    // South
    if (!current.bottom && y < rows - 1 && !visited.has(`${x},${y + 1}`)) {
      visited.add(`${x},${y + 1}`);
      queue.push({ x, y: y + 1, path: [...path, { x, y: y + 1 }] });
    }
    // West
    if (!current.left && x > 0 && !visited.has(`${x - 1},${y}`)) {
      visited.add(`${x - 1},${y}`);
      queue.push({ x: x - 1, y, path: [...path, { x: x - 1, y }] });
    }
  }

  return [];
}
