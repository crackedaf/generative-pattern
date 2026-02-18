/**
 * Pixel editor for manual cell editing
 */

import type { PatternSettings, BrushSettings } from './types';
import { getGridDimensions, getCellKey, getColorAtCell } from './renderer';

/** Callback for when a cell is edited */
export type OnCellEdit = (overrides: Map<string, string>) => void;

/** Callback for eyedropper color pick */
export type OnColorPick = (color: string) => void;

/**
 * Editor state
 */
interface EditorState {
    canvas: HTMLCanvasElement;
    settings: PatternSettings;
    overrides: Map<string, string>;
    brush: BrushSettings;
    editMode: boolean;
    onEdit: OnCellEdit;
    onColorPick: OnColorPick;
    isDrawing: boolean;
}

let editorState: EditorState | null = null;

/**
 * Converts mouse/touch coordinates to canvas coordinates
 */
function getCanvasCoords(
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number
): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
    };
}

/**
 * Converts canvas coordinates to cell row/col
 */
export function getCellFromCoords(
    x: number,
    y: number,
    cellSize: number
): { row: number; col: number } {
    return {
        row: Math.floor(y / cellSize),
        col: Math.floor(x / cellSize),
    };
}

/**
 * Gets all cells within the brush radius
 */
function getCellsInBrush(
    centerRow: number,
    centerCol: number,
    brushSize: number,
    rows: number,
    cols: number
): Array<{ row: number; col: number }> {
    const cells: Array<{ row: number; col: number }> = [];
    const radius = Math.floor(brushSize / 2);

    for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
            const row = centerRow + dr;
            const col = centerCol + dc;

            // Check bounds
            if (row >= 0 && row < rows && col >= 0 && col < cols) {
                // Check if within circular brush (optional, square by default)
                // For circular: if (dr * dr + dc * dc <= radius * radius)
                cells.push({ row, col });
            }
        }
    }

    return cells;
}

/**
 * Applies brush stroke at the given position
 */
function applyBrush(
    x: number,
    y: number,
    state: EditorState
): void {
    const { row, col } = getCellFromCoords(x, y, state.settings.cellSize);
    const { rows, cols } = getGridDimensions(state.settings);

    // Get all cells affected by brush
    const cells = getCellsInBrush(row, col, state.brush.size, rows, cols);

    // Apply color to all cells
    for (const cell of cells) {
        const key = getCellKey(cell.row, cell.col);
        state.overrides.set(key, state.brush.color);
    }

    // Trigger callback
    state.onEdit(state.overrides);
}

/**
 * Picks the color at the given position (eyedropper)
 */
function pickColor(
    x: number,
    y: number,
    state: EditorState
): void {
    const { row, col } = getCellFromCoords(x, y, state.settings.cellSize);
    const color = getColorAtCell(row, col, state.settings, state.overrides);
    state.onColorPick(color);
}

/**
 * Mouse/touch event handlers
 */
function handlePointerDown(e: PointerEvent): void {
    if (!editorState || !editorState.editMode) return;

    e.preventDefault();
    editorState.isDrawing = true;

    const { x, y } = getCanvasCoords(editorState.canvas, e.clientX, e.clientY);

    if (e.shiftKey) {
        // Eyedropper mode
        pickColor(x, y, editorState);
    } else {
        // Paint mode
        applyBrush(x, y, editorState);
    }
}

function handlePointerMove(e: PointerEvent): void {
    if (!editorState || !editorState.editMode || !editorState.isDrawing) return;
    if (e.shiftKey) return; // Don't drag with eyedropper

    e.preventDefault();
    const { x, y } = getCanvasCoords(editorState.canvas, e.clientX, e.clientY);
    applyBrush(x, y, editorState);
}

function handlePointerUp(): void {
    if (!editorState) return;
    editorState.isDrawing = false;
}

/**
 * Initializes the pixel editor for a canvas
 */
export function initPixelEditor(
    canvas: HTMLCanvasElement,
    settings: PatternSettings,
    overrides: Map<string, string>,
    brush: BrushSettings,
    onEdit: OnCellEdit,
    onColorPick: OnColorPick
): void {
    // Clean up previous editor if any
    destroyPixelEditor();

    editorState = {
        canvas,
        settings,
        overrides,
        brush,
        editMode: false,
        onEdit,
        onColorPick,
        isDrawing: false,
    };

    // Add event listeners
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);

    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

/**
 * Destroys the pixel editor and removes event listeners
 */
export function destroyPixelEditor(): void {
    if (!editorState) return;

    const { canvas } = editorState;
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointerleave', handlePointerUp);

    editorState = null;
}

/**
 * Updates editor settings
 */
export function updateEditorSettings(settings: PatternSettings): void {
    if (editorState) {
        editorState.settings = settings;
    }
}

/**
 * Updates brush settings
 */
export function updateBrush(brush: BrushSettings): void {
    if (editorState) {
        editorState.brush = brush;
    }
}

/**
 * Updates overrides reference
 */
export function updateOverrides(overrides: Map<string, string>): void {
    if (editorState) {
        editorState.overrides = overrides;
    }
}

/**
 * Toggles edit mode on/off
 */
export function setEditMode(enabled: boolean): void {
    if (editorState) {
        editorState.editMode = enabled;
        editorState.canvas.style.cursor = enabled ? 'crosshair' : 'default';
    }
}

/**
 * Gets current edit mode state
 */
export function isEditModeEnabled(): boolean {
    return editorState?.editMode ?? false;
}

/**
 * Clears all manual overrides
 */
export function clearOverrides(): Map<string, string> {
    if (editorState) {
        editorState.overrides.clear();
        editorState.onEdit(editorState.overrides);
    }
    return new Map();
}
