/**
 * Core type definitions for the Generative Pattern application
 */

/** RGB color representation with values 0-255 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Color stop for gradient with position 0-1 */
export interface ColorStop {
  color: string; // hex color
  position: number; // 0-1
}

/** Gradient direction options */
export type GradientDirection = 
  | 'top-bottom'
  | 'bottom-top'
  | 'left-right'
  | 'right-left';

/** Per-cell color rendering mode */
export type CellColorMode = 'solid' | 'gradient';

/** Manual cell override for pixel editing */
export interface CellOverride {
  row: number;
  col: number;
  color: string; // hex color
}

/** Brush settings for pixel editing */
export interface BrushSettings {
  size: number; // 1-32 cells
  color: string; // hex color
}

/** Symmetry mode options */
export interface SymmetrySettings {
  horizontal: boolean;
  vertical: boolean;
}

/** Complete pattern generation settings */
export interface PatternSettings {
  width: number;
  height: number;
  cellSize: number;
  colors: string[]; // hex colors, up to 20
  direction: GradientDirection;
  randomness: number; // 0-1
  seed: number;
  symmetry: SymmetrySettings;
  tileMode: boolean;
  cellColorMode: CellColorMode;
}

/** Saved palette for localStorage */
export interface Palette {
  name: string;
  colors: string[];
  createdAt: number;
}

/** Preset configuration with all settings */
export interface Preset {
  name: string;
  colors: string[];
  seed: number;
  cellSize: number;
  direction: GradientDirection;
  randomness: number;
}

/** Application state */
export interface AppState {
  settings: PatternSettings;
  overrides: Map<string, string>; // "row,col" -> hex color
  brush: BrushSettings;
  editMode: boolean;
  savedPalettes: Palette[];
}

/** Maximum canvas dimension in total pixels */
export const MAX_CANVAS_PIXELS = 1_048_576;

/** Maximum number of colors in palette */
export const MAX_COLORS = 20;

/** Brush size range */
export const MIN_BRUSH_SIZE = 1;
export const MAX_BRUSH_SIZE = 32;

/** Default pattern settings */
export const DEFAULT_SETTINGS: PatternSettings = {
  width: 512,
  height: 512,
  cellSize: 16,
  colors: ['#0ff', '#f0f', '#ff0'],
  direction: 'top-bottom',
  randomness: 0,
  seed: 42,
  symmetry: { horizontal: false, vertical: false },
  tileMode: false,
  cellColorMode: 'solid',
};

/** Default brush settings */
export const DEFAULT_BRUSH: BrushSettings = {
  size: 1,
  color: '#ffffff',
};
