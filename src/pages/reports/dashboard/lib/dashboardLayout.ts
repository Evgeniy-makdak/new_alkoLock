import type { DashboardCell, DashboardLayout, DashboardLayoutPreset } from '../types';

function createCellId(): string {
  return `cell-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyCells(rows: number, cols: number): DashboardCell[] {
  const cells: DashboardCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push({ id: createCellId(), row, col, widget: null });
    }
  }
  return cells;
}

export function createDashboardLayout(
  preset: DashboardLayoutPreset,
  rows = 2,
  cols = 2,
): DashboardLayout {
  const safeRows = Math.max(1, Math.min(6, Math.floor(rows) || 1));
  const safeCols = Math.max(1, Math.min(6, Math.floor(cols) || 1));
  if (preset === 'fixed_2x2') {
    return { preset, rows: 2, cols: 2, cells: createEmptyCells(2, 2) };
  }
  return { preset: 'custom', rows: safeRows, cols: safeCols, cells: createEmptyCells(safeRows, safeCols) };
}

/** Пересоздаёт сетку, сохраняя виджеты по координатам (row,col), где возможно. */
export function resizeDashboardLayout(
  layout: DashboardLayout,
  nextRows: number,
  nextCols: number,
  preset: DashboardLayoutPreset = 'custom',
): DashboardLayout {
  const rows = Math.max(1, Math.min(6, Math.floor(nextRows) || 1));
  const cols = Math.max(1, Math.min(6, Math.floor(nextCols) || 1));
  const byKey = new Map(layout.cells.map((cell) => [`${cell.row}:${cell.col}`, cell] as const));
  const cells: DashboardCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const prev = byKey.get(`${row}:${col}`);
      cells.push({
        id: prev?.id ?? createCellId(),
        row,
        col,
        widget: prev?.widget ?? null,
      });
    }
  }
  return { preset, rows, cols, cells };
}

export function findDashboardCell(layout: DashboardLayout, cellId: string): DashboardCell | undefined {
  return layout.cells.find((cell) => cell.id === cellId);
}
