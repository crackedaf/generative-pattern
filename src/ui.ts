/**
 * UI controller - manages all control panel interactions
 */

import type { PatternSettings, BrushSettings, Palette, Preset, GradientDirection } from './types';
import { DEFAULT_SETTINGS, DEFAULT_BRUSH, MAX_COLORS, MAX_BRUSH_SIZE, MIN_BRUSH_SIZE, MAX_CANVAS_PIXELS } from './types';
import { PRESETS } from './presets';
import { isValidHex, safeColor } from './gradient';
import { parseSeed } from './rng';

/** LocalStorage keys */
const STORAGE_PALETTES = 'generative-pattern-palettes';
const STORAGE_SETTINGS = 'generative-pattern-settings';

/** Debounce timer */
let debounceTimer: number | null = null;

/**
 * UI State and callbacks
 */
interface UIState {
    settings: PatternSettings;
    brush: BrushSettings;
    editMode: boolean;
    onSettingsChange: (settings: PatternSettings) => void;
    onBrushChange: (brush: BrushSettings) => void;
    onEditModeChange: (enabled: boolean) => void;
    onRegenerate: () => void;
    onExportPNG: () => void;
    onExportSVG: () => void;
    onClearOverrides: () => void;
    onColorReplace: (from: string, to: string) => void;
}

let uiState: UIState | null = null;

/**
 * Debounced callback
 */
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
    return ((...args: unknown[]) => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = window.setTimeout(() => fn(...args), delay);
    }) as T;
}

/**
 * Gets an element by ID with type safety
 */
function getElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error(`Element not found: ${id}`);
    }
    return el as T;
}

/**
 * Creates a color picker item element
 */
function createColorItem(index: number, color: string): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'color-item';
    item.dataset.index = String(index);
    item.draggable = true;

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = safeColor(color);
    picker.className = 'color-picker';
    picker.setAttribute('aria-label', `Color ${index + 1}`);

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.value = safeColor(color).toUpperCase();
    hexInput.className = 'color-hex';
    hexInput.maxLength = 7;
    hexInput.setAttribute('aria-label', `Color ${index + 1} hex value`);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'color-remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Remove color ${index + 1}`);

    // Event handlers
    picker.addEventListener('input', () => {
        hexInput.value = picker.value.toUpperCase();
        updateColorAtIndex(index, picker.value);
    });

    hexInput.addEventListener('input', () => {
        if (isValidHex(hexInput.value)) {
            picker.value = safeColor(hexInput.value);
            updateColorAtIndex(index, hexInput.value);
            hexInput.classList.remove('invalid');
        } else {
            hexInput.classList.add('invalid');
        }
    });

    removeBtn.addEventListener('click', () => {
        removeColorAtIndex(index);
    });

    // Drag and drop
    item.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', String(index));
        item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const fromIndex = parseInt(e.dataTransfer?.getData('text/plain') || '-1', 10);
        const toIndex = index;
        if (fromIndex >= 0 && fromIndex !== toIndex) {
            reorderColors(fromIndex, toIndex);
        }
    });

    item.appendChild(picker);
    item.appendChild(hexInput);
    item.appendChild(removeBtn);

    return item;
}

/**
 * Updates color at given index
 */
function updateColorAtIndex(index: number, color: string): void {
    if (!uiState) return;

    const newColors = [...uiState.settings.colors];
    newColors[index] = safeColor(color);

    uiState.settings = { ...uiState.settings, colors: newColors };
    uiState.onSettingsChange(uiState.settings);
}

/**
 * Removes color at given index
 */
function removeColorAtIndex(index: number): void {
    if (!uiState) return;
    if (uiState.settings.colors.length <= 2) {
        alert('Minimum 2 colors required');
        return;
    }

    const newColors = uiState.settings.colors.filter((_, i) => i !== index);
    uiState.settings = { ...uiState.settings, colors: newColors };

    renderColorList();
    uiState.onSettingsChange(uiState.settings);
}

/**
 * Reorders colors (drag and drop)
 */
function reorderColors(from: number, to: number): void {
    if (!uiState) return;

    const newColors = [...uiState.settings.colors];
    const [moved] = newColors.splice(from, 1);
    newColors.splice(to, 0, moved);

    uiState.settings = { ...uiState.settings, colors: newColors };

    renderColorList();
    uiState.onSettingsChange(uiState.settings);
}

/**
 * Renders the color list
 */
function renderColorList(): void {
    if (!uiState) return;

    const container = getElement<HTMLDivElement>('color-list');
    container.innerHTML = '';

    uiState.settings.colors.forEach((color, index) => {
        container.appendChild(createColorItem(index, color));
    });

    // Update add button state
    const addBtn = getElement<HTMLButtonElement>('add-color');
    addBtn.disabled = uiState.settings.colors.length >= MAX_COLORS;
}

/**
 * Adds a new color to the palette
 */
function addColor(): void {
    if (!uiState) return;
    if (uiState.settings.colors.length >= MAX_COLORS) return;

    // Add a new color (choose a reasonable default)
    const lastColor = uiState.settings.colors[uiState.settings.colors.length - 1];
    const newColors = [...uiState.settings.colors, lastColor || '#808080'];

    uiState.settings = { ...uiState.settings, colors: newColors };

    renderColorList();
    uiState.onSettingsChange(uiState.settings);
}

/**
 * Loads a preset
 */
function loadPreset(preset: Preset): void {
    if (!uiState) return;

    uiState.settings = {
        ...uiState.settings,
        colors: [...preset.colors],
        seed: preset.seed,
        cellSize: preset.cellSize,
        direction: preset.direction,
        randomness: preset.randomness,
    };

    syncUIToSettings();
    uiState.onSettingsChange(uiState.settings);
}

/**
 * Syncs all UI controls to current settings
 */
function syncUIToSettings(): void {
    if (!uiState) return;

    const { settings, brush, editMode } = uiState;

    // Canvas size
    getElement<HTMLInputElement>('width').value = String(settings.width);
    getElement<HTMLInputElement>('height').value = String(settings.height);
    getElement<HTMLInputElement>('cell-size').value = String(settings.cellSize);
    getElement<HTMLSpanElement>('cell-size-value').textContent = String(settings.cellSize);

    // Gradient
    const directionSelect = getElement<HTMLSelectElement>('direction');
    directionSelect.value = settings.direction;

    // Randomness
    getElement<HTMLInputElement>('randomness').value = String(settings.randomness);
    getElement<HTMLSpanElement>('randomness-value').textContent = settings.randomness.toFixed(2);

    // Seed
    getElement<HTMLInputElement>('seed').value = String(settings.seed);

    // Symmetry
    getElement<HTMLInputElement>('symmetry-h').checked = settings.symmetry.horizontal;
    getElement<HTMLInputElement>('symmetry-v').checked = settings.symmetry.vertical;

    // Cell color mode
    getElement<HTMLInputElement>('mode-solid').checked = settings.cellColorMode === 'solid';
    getElement<HTMLInputElement>('mode-gradient').checked = settings.cellColorMode === 'gradient';

    // Brush
    getElement<HTMLInputElement>('brush-size').value = String(brush.size);
    getElement<HTMLSpanElement>('brush-size-value').textContent = String(brush.size);
    getElement<HTMLInputElement>('brush-color').value = brush.color;

    // Edit mode
    getElement<HTMLInputElement>('edit-mode').checked = editMode;

    // Colors
    renderColorList();
}

/**
 * Loads palettes from localStorage
 */
function loadSavedPalettes(): Palette[] {
    try {
        const data = localStorage.getItem(STORAGE_PALETTES);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Saves palettes to localStorage
 */
function savePalettes(palettes: Palette[]): void {
    localStorage.setItem(STORAGE_PALETTES, JSON.stringify(palettes));
}

/**
 * Renders saved palettes dropdown
 */
function renderSavedPalettes(): void {
    const select = getElement<HTMLSelectElement>('saved-palettes');
    const palettes = loadSavedPalettes();

    // Clear existing options (keep first placeholder)
    while (select.options.length > 1) {
        select.remove(1);
    }

    palettes.forEach((palette, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = palette.name;
        select.appendChild(option);
    });
}

/**
 * Saves current palette
 */
function saveCurrentPalette(): void {
    if (!uiState) return;

    const name = prompt('Enter palette name:');
    if (!name) return;

    const palettes = loadSavedPalettes();
    palettes.push({
        name,
        colors: [...uiState.settings.colors],
        createdAt: Date.now(),
    });

    savePalettes(palettes);
    renderSavedPalettes();
}

/**
 * Loads a saved palette
 */
function loadSavedPalette(index: number): void {
    if (!uiState) return;

    const palettes = loadSavedPalettes();
    if (index < 0 || index >= palettes.length) return;

    uiState.settings = {
        ...uiState.settings,
        colors: [...palettes[index].colors],
    };

    renderColorList();
    uiState.onSettingsChange(uiState.settings);
}

/**
 * Initializes the UI
 */
export function initUI(callbacks: {
    onSettingsChange: (settings: PatternSettings) => void;
    onBrushChange: (brush: BrushSettings) => void;
    onEditModeChange: (enabled: boolean) => void;
    onRegenerate: () => void;
    onExportPNG: () => void;
    onExportSVG: () => void;
    onClearOverrides: () => void;
    onColorReplace: (from: string, to: string) => void;
}): PatternSettings {
    // Load saved settings or use defaults
    let initialSettings: PatternSettings;
    try {
        const saved = localStorage.getItem(STORAGE_SETTINGS);
        initialSettings = saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
    } catch {
        initialSettings = { ...DEFAULT_SETTINGS };
    }

    uiState = {
        settings: initialSettings,
        brush: { ...DEFAULT_BRUSH },
        editMode: false,
        ...callbacks,
    };

    // Debounced settings change handler
    const debouncedSettingsChange = debounce((settings: PatternSettings) => {
        localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
        callbacks.onSettingsChange(settings);
    }, 100);

    // Canvas size inputs
    const widthInput = getElement<HTMLInputElement>('width');
    const heightInput = getElement<HTMLInputElement>('height');

    const handleSizeChange = () => {
        const width = Math.max(1, Math.min(4096, parseInt(widthInput.value, 10) || 512));
        const height = Math.max(1, Math.min(4096, parseInt(heightInput.value, 10) || 512));

        // Check total pixels
        if (width * height > MAX_CANVAS_PIXELS) {
            getElement<HTMLSpanElement>('size-warning').textContent =
                `Warning: ${(width * height).toLocaleString()} pixels exceeds limit`;
            getElement<HTMLSpanElement>('size-warning').style.display = 'block';
        } else {
            getElement<HTMLSpanElement>('size-warning').style.display = 'none';
        }

        uiState!.settings = { ...uiState!.settings, width, height };
        debouncedSettingsChange(uiState!.settings);
    };

    widthInput.addEventListener('input', handleSizeChange);
    heightInput.addEventListener('input', handleSizeChange);

    // Cell size slider
    const cellSizeInput = getElement<HTMLInputElement>('cell-size');
    cellSizeInput.addEventListener('input', () => {
        const cellSize = parseInt(cellSizeInput.value, 10);
        getElement<HTMLSpanElement>('cell-size-value').textContent = String(cellSize);
        uiState!.settings = { ...uiState!.settings, cellSize };
        debouncedSettingsChange(uiState!.settings);
    });

    // Direction select
    const directionSelect = getElement<HTMLSelectElement>('direction');
    directionSelect.addEventListener('change', () => {
        uiState!.settings = {
            ...uiState!.settings,
            direction: directionSelect.value as GradientDirection
        };
        callbacks.onSettingsChange(uiState!.settings);
    });

    // Randomness slider
    const randomnessInput = getElement<HTMLInputElement>('randomness');
    randomnessInput.addEventListener('input', () => {
        const randomness = parseFloat(randomnessInput.value);
        getElement<HTMLSpanElement>('randomness-value').textContent = randomness.toFixed(2);
        uiState!.settings = { ...uiState!.settings, randomness };
        debouncedSettingsChange(uiState!.settings);
    });

    // Seed input
    const seedInput = getElement<HTMLInputElement>('seed');
    seedInput.addEventListener('input', () => {
        const seed = parseSeed(seedInput.value);
        uiState!.settings = { ...uiState!.settings, seed };
        debouncedSettingsChange(uiState!.settings);
    });

    // Symmetry checkboxes
    getElement<HTMLInputElement>('symmetry-h').addEventListener('change', (e) => {
        uiState!.settings = {
            ...uiState!.settings,
            symmetry: {
                ...uiState!.settings.symmetry,
                horizontal: (e.target as HTMLInputElement).checked,
            },
        };
        callbacks.onSettingsChange(uiState!.settings);
    });

    getElement<HTMLInputElement>('symmetry-v').addEventListener('change', (e) => {
        uiState!.settings = {
            ...uiState!.settings,
            symmetry: {
                ...uiState!.settings.symmetry,
                vertical: (e.target as HTMLInputElement).checked,
            },
        };
        callbacks.onSettingsChange(uiState!.settings);
    });

    // Cell color mode
    getElement<HTMLInputElement>('mode-solid').addEventListener('change', () => {
        uiState!.settings = { ...uiState!.settings, cellColorMode: 'solid' };
        callbacks.onSettingsChange(uiState!.settings);
    });

    getElement<HTMLInputElement>('mode-gradient').addEventListener('change', () => {
        uiState!.settings = { ...uiState!.settings, cellColorMode: 'gradient' };
        callbacks.onSettingsChange(uiState!.settings);
    });

    // Add color button
    getElement<HTMLButtonElement>('add-color').addEventListener('click', addColor);

    // Preset select
    const presetSelect = getElement<HTMLSelectElement>('presets');
    PRESETS.forEach((preset, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = preset.name;
        presetSelect.appendChild(option);
    });

    presetSelect.addEventListener('change', () => {
        const index = parseInt(presetSelect.value, 10);
        if (index >= 0 && index < PRESETS.length) {
            loadPreset(PRESETS[index]);
        }
        presetSelect.value = ''; // Reset to placeholder
    });

    // Saved palettes
    renderSavedPalettes();

    getElement<HTMLButtonElement>('save-palette').addEventListener('click', saveCurrentPalette);

    getElement<HTMLSelectElement>('saved-palettes').addEventListener('change', (e) => {
        const index = parseInt((e.target as HTMLSelectElement).value, 10);
        if (index >= 0) {
            loadSavedPalette(index);
        }
        (e.target as HTMLSelectElement).value = '';
    });

    // Brush controls
    const brushSizeInput = getElement<HTMLInputElement>('brush-size');
    brushSizeInput.addEventListener('input', () => {
        const size = Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, parseInt(brushSizeInput.value, 10)));
        getElement<HTMLSpanElement>('brush-size-value').textContent = String(size);
        uiState!.brush = { ...uiState!.brush, size };
        callbacks.onBrushChange(uiState!.brush);
    });

    const brushColorInput = getElement<HTMLInputElement>('brush-color');
    brushColorInput.addEventListener('input', () => {
        uiState!.brush = { ...uiState!.brush, color: brushColorInput.value };
        callbacks.onBrushChange(uiState!.brush);
    });

    // Edit mode toggle
    getElement<HTMLInputElement>('edit-mode').addEventListener('change', (e) => {
        uiState!.editMode = (e.target as HTMLInputElement).checked;
        callbacks.onEditModeChange(uiState!.editMode);
    });

    // Action buttons
    getElement<HTMLButtonElement>('regenerate').addEventListener('click', callbacks.onRegenerate);
    getElement<HTMLButtonElement>('export-png').addEventListener('click', callbacks.onExportPNG);
    getElement<HTMLButtonElement>('export-svg').addEventListener('click', callbacks.onExportSVG);
    getElement<HTMLButtonElement>('clear-overrides').addEventListener('click', callbacks.onClearOverrides);

    // Color replace
    getElement<HTMLButtonElement>('apply-replace').addEventListener('click', () => {
        const from = getElement<HTMLInputElement>('replace-from').value;
        const to = getElement<HTMLInputElement>('replace-to').value;
        if (isValidHex(from) && isValidHex(to)) {
            callbacks.onColorReplace(from, to);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S = Export PNG
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
            e.preventDefault();
            callbacks.onExportPNG();
        }
        // Ctrl/Cmd + X = Export SVG
        if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
            e.preventDefault();
            callbacks.onExportSVG();
        }
        // R = Regenerate with new seed
        if (e.key === 'r' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
            callbacks.onRegenerate();
        }
        // E = Toggle edit mode
        if (e.key === 'e' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
            const editModeInput = getElement<HTMLInputElement>('edit-mode');
            editModeInput.checked = !editModeInput.checked;
            editModeInput.dispatchEvent(new Event('change'));
        }
    });

    // Initial sync
    syncUIToSettings();

    return initialSettings;
}

/**
 * Updates brush color from eyedropper
 */
export function setBrushColor(color: string): void {
    if (!uiState) return;

    uiState.brush = { ...uiState.brush, color: safeColor(color) };
    getElement<HTMLInputElement>('brush-color').value = uiState.brush.color;
    uiState.onBrushChange(uiState.brush);
}

/**
 * Gets current settings
 */
export function getSettings(): PatternSettings {
    return uiState?.settings ?? DEFAULT_SETTINGS;
}

/**
 * Gets current brush settings
 */
export function getBrush(): BrushSettings {
    return uiState?.brush ?? DEFAULT_BRUSH;
}
