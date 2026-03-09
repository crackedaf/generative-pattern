/**
 * Core type definitions for the Generative Pattern application
 */

/** Active generator strategy */
export type GeneratorType = 'grid' | 'brick';

/** Brick texture style variants */
export type BrickStyle = 'RedBrick' | 'MossyBrick';

/** Brick interior texture mode */
export type BrickTextureMode = 'solid' | 'singlePreset' | 'randomPreset';

/** A moss patch rendered on a brick face */
export interface MossPatch {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string; // hex
}

/** A subtle crack line rendered inside a brick */
export interface BrickCrack {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Computed brick cell ready for rendering */
export interface BrickCell {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string; // hex
  mossPatchs: MossPatch[];
  cracks: BrickCrack[];
  texturePreset?: Preset;
  textureSeed?: number;
}

/** Settings specific to the brick pattern generator */
export interface BrickSettings {
  brickStyle: BrickStyle;
  /** px — clamped to ≥ 5 */
  brickWidth: number;
  /** px — clamped to ≥ 5 */
  brickHeight: number;
  /** px — clamped to < brickWidth */
  mortarThickness: number;
  /** 0–1 — only used when brickStyle = MossyBrick */
  mossDensity: number;
  /** Base hex colour for bricks */
  brickBaseColor: string;
  /** Hex colour for mortar joints */
  mortarColor: string;
  /** 0–1 — strength of per-brick colour deviation */
  brickVariation: number;
  /** Render subtle deterministic crack lines */
  showCracks: boolean;
  /** Skip moss patches under 3 px for smaller SVG output */
  optimizeSVG: boolean;
  /** Brick texture fill mode */
  brickTextureMode: BrickTextureMode;
  /** Selected preset name when brickTextureMode = 'singlePreset' */
  texturePresetName: string;
  /** Randomize texture preset assignment per brick when supported by mode */
  textureRandomizePerBrick: boolean;
  /** Scale multiplier for texture rendering (0.1-2.0) */
  textureScale: number;
  /** Rotation angle in degrees for texture rendering */
  textureRotation: number;
}

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

export interface WaveLayer {
  amplitude: number;
  frequency: number;
  phase: number;
  influence: number; // 0-1 strength
}

export interface WaveDistortionSettings {
  enabled: boolean;
  waves: WaveLayer[];
}

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
  /** 0-1 blend strength for gradient cell mode (0 = base, 1 = full blend) */
  gradientBlendFactor: number;
  waveDistortion?: WaveDistortionSettings;
  /** Active generator strategy — defaults to 'grid' */
  generator?: GeneratorType;
  /** Required when generator === 'brick' */
  brickSettings?: BrickSettings;
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
  /** Optional 0-1 gradient blend strength */
  gradientBlendFactor?: number;
  waveDistortion?: WaveDistortionSettings;
  /** Set to 'brick' for brick presets */
  generator?: GeneratorType;
  /** Required when generator === 'brick' */
  brickSettings?: BrickSettings;
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
  gradientBlendFactor: 1,
  waveDistortion: {
    enabled: false,
    waves: [],
  },
};

/** Default brush settings */
export const DEFAULT_BRUSH: BrushSettings = {
  size: 1,
  color: '#ffffff',
};
