/**
 * Generative Pattern Application
 * Main entry point
 */

import './style.css';
import type { PatternSettings, BrushSettings } from './types';
import { queueRender } from './renderer';
import { initUI, setBrushColor } from './ui';
import {
  initPixelEditor,
  updateEditorSettings,
  updateBrush,
  updateOverrides,
  setEditMode,
  clearOverrides as clearEditorOverrides
} from './pixelEditor';
import { exportPNG, exportSVG } from './exporter';
import { replaceColorGlobal } from './colorReplacer';

// Application state
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let settings: PatternSettings;
let overrides: Map<string, string> = new Map();
const MIN_CANVAS_ZOOM = 0.25;
const MAX_CANVAS_ZOOM = 4;

function getCanvasZoom(zoom: number | undefined): number {
  const normalizedZoom = Number.isFinite(zoom) ? Number(zoom) : 1;
  return Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, normalizedZoom));
}

/**
 * Initializes the canvas element
 */
function initCanvas(): void {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to get canvas 2D context');
  }

  ctx = context;
}

/**
 * Resizes canvas to match settings
 */
function resizeCanvas(): void {
  canvas.width = settings.width;
  canvas.height = settings.height;

  // Update canvas display size for responsive layout
  const container = document.getElementById('canvas-container');
  if (container) {
    const maxWidth = container.clientWidth - 40;
    const maxHeight = window.innerHeight - 100;

    const scale = Math.min(
      maxWidth / settings.width,
      maxHeight / settings.height,
      1 // Don't scale up
    );
    const zoom = getCanvasZoom(settings.zoom);
    const displayScale = scale * zoom;

    canvas.style.width = `${settings.width * displayScale}px`;
    canvas.style.height = `${settings.height * displayScale}px`;
  }
}

/**
 * Renders the pattern with current settings
 */
function render(): void {
  resizeCanvas();
  queueRender(ctx, settings, overrides);
}

/**
 * Handles settings changes from UI
 */
function handleSettingsChange(newSettings: PatternSettings): void {
  settings = newSettings;
  updateEditorSettings(settings);
  render();
}

/**
 * Handles brush changes from UI
 */
function handleBrushChange(brush: BrushSettings): void {
  updateBrush(brush);
}

/**
 * Handles edit mode toggle
 */
function handleEditModeChange(enabled: boolean): void {
  setEditMode(enabled);
}

/**
 * Handles regeneration (new random seed)
 */
function handleRegenerate(): void {
  const newSeed = Math.floor(Math.random() * 1000000);
  settings = { ...settings, seed: newSeed };

  // Update seed input in UI
  const seedInput = document.getElementById('seed') as HTMLInputElement;
  if (seedInput) {
    seedInput.value = String(newSeed);
  }

  render();
}

/**
 * Handles PNG export
 */
async function handleExportPNG(): Promise<void> {
  try {
    await exportPNG(canvas, settings, overrides);
  } catch (error) {
    console.error('PNG export failed:', error);
    alert('PNG export failed. See console for details.');
  }
}

/**
 * Handles SVG export
 */
async function handleExportSVG(): Promise<void> {
  try {
    await exportSVG(settings, overrides);
  } catch (error) {
    console.error('SVG export failed:', error);
    alert('SVG export failed. See console for details.');
  }
}

/**
 * Handles clearing all manual overrides
 */
function handleClearOverrides(): void {
  overrides = clearEditorOverrides();
  updateOverrides(overrides);
  render();
}

/**
 * Handles color replacement
 */
function handleColorReplace(from: string, to: string): void {
  overrides = replaceColorGlobal(settings, overrides, from, to);
  updateOverrides(overrides);
  render();
}

/**
 * Handles cell edits from pixel editor
 */
function handleCellEdit(newOverrides: Map<string, string>): void {
  overrides = newOverrides;
  render();
}

/**
 * Handles eyedropper color pick
 */
function handleColorPick(color: string): void {
  setBrushColor(color);
}

/**
 * Main application initialization
 */
function main(): void {
  // Initialize canvas
  initCanvas();

  // Initialize UI and get initial settings
  settings = initUI({
    onSettingsChange: handleSettingsChange,
    onBrushChange: handleBrushChange,
    onEditModeChange: handleEditModeChange,
    onRegenerate: handleRegenerate,
    onExportPNG: handleExportPNG,
    onExportSVG: handleExportSVG,
    onClearOverrides: handleClearOverrides,
    onColorReplace: handleColorReplace,
  });

  // Initialize pixel editor
  initPixelEditor(
    canvas,
    settings,
    overrides,
    { size: 1, color: '#ffffff' },
    handleCellEdit,
    handleColorPick
  );

  // Handle window resize
  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  // Initial render
  render();

  console.log('Generative Pattern v1.0 initialized');
  console.log('Keyboard shortcuts:');
  console.log('  Ctrl+S: Export PNG');
  console.log('  Ctrl+Shift+S: Export SVG');
  console.log('  R: Regenerate with new seed');
  console.log('  E: Toggle edit mode');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
