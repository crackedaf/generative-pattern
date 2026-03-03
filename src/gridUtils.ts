/**
 * Shared grid snapping helpers.
 */

export interface SnappedGrid {
    cols: number;
    rows: number;
    renderWidth: number;
    renderHeight: number;
    offsetX: number;
    offsetY: number;
}

/**
 * Clamps and normalizes a cell size for pixel-perfect rendering.
 */
export function normalizeCellSize(cellSize: number): number {
    return Math.max(1, Math.floor(cellSize));
}

/**
 * Computes snapped grid dimensions and integer offsets centered in the canvas.
 */
export function computeSnappedGrid(width: number, height: number, cellSize: number): SnappedGrid {
    const normalizedCellSize = normalizeCellSize(cellSize);
    const cols = Math.floor(width / normalizedCellSize);
    const rows = Math.floor(height / normalizedCellSize);
    const renderWidth = cols * normalizedCellSize;
    const renderHeight = rows * normalizedCellSize;
    const offsetX = Math.floor((width - renderWidth) / 2);
    const offsetY = Math.floor((height - renderHeight) / 2);

    return {
        cols,
        rows,
        renderWidth,
        renderHeight,
        offsetX,
        offsetY,
    };
}
