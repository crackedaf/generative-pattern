/**
 * UI controller - manages all control panel interactions
 */

import type {
    BrickSettings,
    BrickStyle,
    BrickTextureMode,
    BrushSettings,
    GradientDirection,
    Palette,
    PatternSettings,
    Preset,
    WaveDistortionSettings,
    WaveLayer,
} from './types';
import { DEFAULT_SETTINGS, DEFAULT_BRUSH, MAX_COLORS, MAX_BRUSH_SIZE, MIN_BRUSH_SIZE, MAX_CANVAS_PIXELS } from './types';
import { PRESETS } from './presets';
import { isValidHex, safeColor } from './gradient';
import { parseSeed } from './rng';

/** LocalStorage keys */
const STORAGE_PALETTES = 'generative-pattern-palettes';
const STORAGE_SETTINGS = 'generative-pattern-settings';

/** Debounce timer */
let debounceTimer: number | null = null;
const DEFAULT_TEXTURE_PRESET_NAME = PRESETS.find(p => p.generator !== 'brick')?.name ?? PRESETS[0]?.name ?? '';
const MAX_WAVE_LAYERS = 10;
const MIN_CANVAS_ZOOM = 0.25;
const MAX_CANVAS_ZOOM = 4;
let debouncedSettingsEmitter: ((settings: PatternSettings) => void) | null = null;
const DEFAULT_WAVE_LAYER: WaveLayer = {
    amplitude: 20,
    frequency: 0.02,
    phase: 0,
    influence: 1,
};

function clampCanvasZoom(value: number): number {
    if (!Number.isFinite(value)) {
        return DEFAULT_SETTINGS.zoom ?? 1;
    }
    return Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, value));
}

function formatCanvasZoom(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function clampGradientBlendFactor(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function clampWaveInfluence(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function normalizeWaveLayer(layer?: Partial<WaveLayer>): WaveLayer {
    return {
        amplitude: Number.isFinite(layer?.amplitude) ? Number(layer!.amplitude) : DEFAULT_WAVE_LAYER.amplitude,
        frequency: Number.isFinite(layer?.frequency) ? Number(layer!.frequency) : DEFAULT_WAVE_LAYER.frequency,
        phase: Number.isFinite(layer?.phase) ? Number(layer!.phase) : DEFAULT_WAVE_LAYER.phase,
        influence: clampWaveInfluence(
            Number.isFinite(layer?.influence) ? Number(layer!.influence) : DEFAULT_WAVE_LAYER.influence
        ),
    };
}

function normalizeWaveDistortionSettings(settings?: WaveDistortionSettings): WaveDistortionSettings {
    return {
        enabled: settings?.enabled === true,
        waves: Array.isArray(settings?.waves)
            ? settings!.waves.slice(0, MAX_WAVE_LAYERS).map(wave => normalizeWaveLayer(wave))
            : [],
    };
}

function emitDebouncedSettingsChange(): void {
    if (!uiState || !debouncedSettingsEmitter) return;
    debouncedSettingsEmitter(uiState.settings);
}

function withBrickTextureDefaults(brickSettings: BrickSettings): BrickSettings {
    return {
        ...brickSettings,
        brickTextureMode: brickSettings.brickTextureMode ?? 'solid',
        texturePresetName: brickSettings.texturePresetName ?? DEFAULT_TEXTURE_PRESET_NAME,
        textureRandomizePerBrick: brickSettings.textureRandomizePerBrick ?? false,
        textureScale: brickSettings.textureScale ?? 1,
        textureRotation: brickSettings.textureRotation ?? 0,
    };
}

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
type PresetMode = 'grid' | 'brick';

function getPresetModeFromSettings(settings: PatternSettings): PresetMode {
    return settings.generator === 'brick' ? 'brick' : 'grid';
}

function getPresetModeFromPreset(preset: Preset): PresetMode {
    return preset.generator === 'brick' ? 'brick' : 'grid';
}

function setPresetModeToggle(mode: PresetMode): void {
    const toggle = document.getElementById('preset-mode-toggle') as HTMLButtonElement | null;
    if (!toggle) return;
    toggle.dataset.mode = mode;
    toggle.textContent = mode === 'brick' ? 'Brick Presets' : 'Grid Presets';
    toggle.setAttribute('aria-pressed', mode === 'brick' ? 'true' : 'false');
}

function getPresetModeFromToggle(): PresetMode {
    const toggle = document.getElementById('preset-mode-toggle') as HTMLButtonElement | null;
    return toggle?.dataset.mode === 'brick' ? 'brick' : 'grid';
}

function renderPresetOptions(mode: PresetMode): void {
    const presetSelect = document.getElementById('presets') as HTMLSelectElement | null;
    if (!presetSelect) return;

    presetSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = mode === 'brick' ? 'Select brick preset...' : 'Select preset...';
    presetSelect.appendChild(placeholder);

    PRESETS.forEach((preset, index) => {
        const presetMode = getPresetModeFromPreset(preset);
        if (presetMode !== mode) return;

        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = preset.name;
        presetSelect.appendChild(option);
    });
}

/**
 * Debounced callback
 */
function debounce<T extends (...args: never[]) => void>(fn: T, delay: number): T {
    return ((...args: never[]) => {
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
 * Shows or hides the brick controls panel and enables/disables all inputs inside it.
 */
function setBrickControlsVisible(visible: boolean): void {
    const section = document.getElementById('brick-controls');
    if (!section) return;
    section.style.display = visible ? 'block' : 'none';

    // Enable/disable every form element inside the section
    const inputs = section.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select');
    inputs.forEach(el => { el.disabled = !visible; });

    // Moss density row is only shown when MossyBrick is selected
    if (visible && uiState?.settings.brickSettings) {
        syncMossDensityRow(uiState.settings.brickSettings.brickStyle);
        syncTexturePresetRow(uiState.settings.brickSettings.brickTextureMode);
    }
}

/**
 * Shows/hides the moss density slider based on brick style.
 */
function syncMossDensityRow(style: string): void {
    const row = document.getElementById('moss-density-row');
    const input = document.getElementById('moss-density') as HTMLInputElement | null;
    if (row) row.style.display = style === 'MossyBrick' ? 'flex' : 'none';
    if (input) input.disabled = style !== 'MossyBrick';
}

function syncTexturePresetRow(mode: BrickTextureMode): void {
    const row = document.getElementById('brick-texture-preset-row');
    const select = document.getElementById('brick-texture-preset') as HTMLSelectElement | null;
    const visible = mode === 'singlePreset';
    if (row) row.style.display = visible ? 'flex' : 'none';
    if (select) select.disabled = !visible;
}

function syncGradientFactorControl(mode: PatternSettings['cellColorMode']): void {
    const input = document.getElementById('gradient-factor') as HTMLInputElement | null;
    if (input) {
        input.disabled = mode !== 'gradient';
    }
}

function getCurrentWaveSettings(): WaveDistortionSettings {
    return normalizeWaveDistortionSettings(uiState?.settings.waveDistortion);
}

function updateWaveSettings(next: WaveDistortionSettings): void {
    if (!uiState) return;
    uiState.settings = {
        ...uiState.settings,
        waveDistortion: normalizeWaveDistortionSettings(next),
    };
    renderWaveLayers();
    emitDebouncedSettingsChange();
}

function updateWaveLayer(index: number, patch: Partial<WaveLayer>): void {
    const current = getCurrentWaveSettings();
    if (index < 0 || index >= current.waves.length) return;
    const waves = [...current.waves];
    waves[index] = normalizeWaveLayer({ ...waves[index], ...patch });
    updateWaveSettings({ ...current, waves });
}

function removeWaveLayer(index: number): void {
    const current = getCurrentWaveSettings();
    if (index < 0 || index >= current.waves.length) return;
    const waves = current.waves.filter((_, waveIndex) => waveIndex !== index);
    updateWaveSettings({ ...current, waves });
}

function renderWaveControlRow(options: {
    parent: HTMLElement;
    id: string;
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    valueFormatter: (value: number) => string;
    onInput: (value: number) => void;
    disabled: boolean;
}): void {
    const row = document.createElement('div');
    row.className = 'wave-row';

    const label = document.createElement('label');
    label.setAttribute('for', options.id);
    label.textContent = options.label;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = options.id;
    slider.min = String(options.min);
    slider.max = String(options.max);
    slider.step = String(options.step);
    slider.value = String(options.value);
    slider.disabled = options.disabled;

    const value = document.createElement('span');
    value.className = 'slider-value';
    value.textContent = options.valueFormatter(options.value);

    slider.addEventListener('input', () => {
        const nextValue = parseFloat(slider.value);
        value.textContent = options.valueFormatter(nextValue);
        options.onInput(nextValue);
    });

    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(value);
    options.parent.appendChild(row);
}

function renderWaveLayers(): void {
    if (!uiState) return;

    const container = document.getElementById('wave-layers') as HTMLDivElement | null;
    const enableInput = document.getElementById('wave-distortion-enabled') as HTMLInputElement | null;
    const addButton = document.getElementById('add-wave') as HTMLButtonElement | null;
    if (!container || !enableInput || !addButton) return;

    const waveSettings = getCurrentWaveSettings();
    const controlsEnabled = waveSettings.enabled;

    enableInput.checked = controlsEnabled;
    addButton.disabled = !controlsEnabled || waveSettings.waves.length >= MAX_WAVE_LAYERS;
    container.innerHTML = '';
    container.style.opacity = controlsEnabled ? '1' : '0.6';

    waveSettings.waves.forEach((wave, index) => {
        const waveLayer = document.createElement('div');
        waveLayer.className = 'wave-layer';

        const header = document.createElement('div');
        header.className = 'wave-layer-header';

        const title = document.createElement('span');
        title.className = 'wave-layer-title';
        title.textContent = `Wave ${index + 1}`;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'wave-remove';
        removeButton.textContent = '×';
        removeButton.disabled = !controlsEnabled;
        removeButton.setAttribute('aria-label', `Remove wave ${index + 1}`);
        removeButton.addEventListener('click', () => {
            removeWaveLayer(index);
        });

        header.appendChild(title);
        header.appendChild(removeButton);
        waveLayer.appendChild(header);

        renderWaveControlRow({
            parent: waveLayer,
            id: `wave-${index}-amplitude`,
            label: 'Amplitude',
            min: 0,
            max: 100,
            step: 1,
            value: wave.amplitude,
            valueFormatter: value => value.toFixed(0),
            onInput: value => updateWaveLayer(index, { amplitude: value }),
            disabled: !controlsEnabled,
        });

        renderWaveControlRow({
            parent: waveLayer,
            id: `wave-${index}-frequency`,
            label: 'Frequency',
            min: 0,
            max: 0.2,
            step: 0.001,
            value: wave.frequency,
            valueFormatter: value => value.toFixed(3),
            onInput: value => updateWaveLayer(index, { frequency: value }),
            disabled: !controlsEnabled,
        });

        renderWaveControlRow({
            parent: waveLayer,
            id: `wave-${index}-phase`,
            label: 'Phase',
            min: -6.28,
            max: 6.28,
            step: 0.01,
            value: wave.phase,
            valueFormatter: value => value.toFixed(2),
            onInput: value => updateWaveLayer(index, { phase: value }),
            disabled: !controlsEnabled,
        });

        renderWaveControlRow({
            parent: waveLayer,
            id: `wave-${index}-influence`,
            label: 'Influence',
            min: 0,
            max: 1,
            step: 0.01,
            value: wave.influence,
            valueFormatter: value => value.toFixed(2),
            onInput: value => updateWaveLayer(index, { influence: clampWaveInfluence(value) }),
            disabled: !controlsEnabled,
        });

        container.appendChild(waveLayer);
    });
}

/**
 * Loads a preset
 */
function loadPreset(preset: Preset): void {
    if (!uiState) return;

    const mode = getPresetModeFromPreset(preset);
    setPresetModeToggle(mode);
    renderPresetOptions(mode);

    if (preset.generator === 'brick' && preset.brickSettings) {
        // Brick preset
        uiState.settings = {
            ...uiState.settings,
            colors: [...preset.colors],
            seed: preset.seed,
            cellSize: preset.cellSize,
            direction: preset.direction,
            randomness: preset.randomness,
            gradientBlendFactor: clampGradientBlendFactor(
                preset.gradientBlendFactor ?? DEFAULT_SETTINGS.gradientBlendFactor
            ),
            waveDistortion: normalizeWaveDistortionSettings(
                preset.waveDistortion ?? DEFAULT_SETTINGS.waveDistortion
            ),
            generator: 'brick',
            brickSettings: withBrickTextureDefaults({ ...preset.brickSettings }),
        };
        setBrickControlsVisible(true);
    } else {
        // Standard grid preset — clear brick state
        uiState.settings = {
            ...uiState.settings,
            colors: [...preset.colors],
            seed: preset.seed,
            cellSize: preset.cellSize,
            direction: preset.direction,
            randomness: preset.randomness,
            gradientBlendFactor: clampGradientBlendFactor(
                preset.gradientBlendFactor ?? DEFAULT_SETTINGS.gradientBlendFactor
            ),
            waveDistortion: normalizeWaveDistortionSettings(
                preset.waveDistortion ?? DEFAULT_SETTINGS.waveDistortion
            ),
            generator: 'grid',
            brickSettings: undefined,
        };
        setBrickControlsVisible(false);
    }

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
    const zoom = clampCanvasZoom(settings.zoom ?? DEFAULT_SETTINGS.zoom ?? 1);
    getElement<HTMLInputElement>('zoom').value = zoom.toFixed(2);
    getElement<HTMLSpanElement>('zoom-value').textContent = formatCanvasZoom(zoom);

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
    const gradientFactor = clampGradientBlendFactor(
        settings.gradientBlendFactor ?? DEFAULT_SETTINGS.gradientBlendFactor
    );
    getElement<HTMLInputElement>('gradient-factor').value = gradientFactor.toFixed(2);
    getElement<HTMLSpanElement>('gradient-factor-value').textContent = gradientFactor.toFixed(2);
    syncGradientFactorControl(settings.cellColorMode);

    const waveDistortion = normalizeWaveDistortionSettings(settings.waveDistortion);
    getElement<HTMLInputElement>('wave-distortion-enabled').checked = waveDistortion.enabled;
    renderWaveLayers();

    // Brush
    getElement<HTMLInputElement>('brush-size').value = String(brush.size);
    getElement<HTMLSpanElement>('brush-size-value').textContent = String(brush.size);
    getElement<HTMLInputElement>('brush-color').value = brush.color;

    // Edit mode
    getElement<HTMLInputElement>('edit-mode').checked = editMode;

    // Brick controls
    if (settings.generator === 'brick' && settings.brickSettings) {
        const bs = withBrickTextureDefaults(settings.brickSettings);
        (document.getElementById('brick-style') as HTMLSelectElement).value = bs.brickStyle;
        (document.getElementById('brick-texture-mode') as HTMLSelectElement).value = bs.brickTextureMode;
        (document.getElementById('brick-texture-preset') as HTMLSelectElement).value = bs.texturePresetName;
        (document.getElementById('brick-randomize-per-brick') as HTMLInputElement).checked = bs.textureRandomizePerBrick;
        (document.getElementById('brick-texture-scale') as HTMLInputElement).value = String(bs.textureScale);
        (document.getElementById('brick-texture-scale-value') as HTMLSpanElement).textContent = bs.textureScale.toFixed(2);
        (document.getElementById('brick-texture-rotation') as HTMLInputElement).value = String(bs.textureRotation);
        (document.getElementById('brick-texture-rotation-value') as HTMLSpanElement).textContent = `${Math.round(bs.textureRotation)}°`;
        (document.getElementById('brick-width') as HTMLInputElement).value = String(bs.brickWidth);
        (document.getElementById('brick-width-value') as HTMLSpanElement).textContent = `${bs.brickWidth}px`;
        (document.getElementById('brick-height') as HTMLInputElement).value = String(bs.brickHeight);
        (document.getElementById('brick-height-value') as HTMLSpanElement).textContent = `${bs.brickHeight}px`;
        (document.getElementById('mortar-thickness') as HTMLInputElement).value = String(bs.mortarThickness);
        (document.getElementById('mortar-thickness-value') as HTMLSpanElement).textContent = String(bs.mortarThickness);
        (document.getElementById('brick-variation') as HTMLInputElement).value = String(bs.brickVariation);
        (document.getElementById('brick-variation-value') as HTMLSpanElement).textContent = bs.brickVariation.toFixed(2);
        (document.getElementById('moss-density') as HTMLInputElement).value = String(bs.mossDensity);
        (document.getElementById('moss-density-value') as HTMLSpanElement).textContent = bs.mossDensity.toFixed(2);
        (document.getElementById('brick-base-color') as HTMLInputElement).value = bs.brickBaseColor;
        (document.getElementById('mortar-color') as HTMLInputElement).value = bs.mortarColor;
        (document.getElementById('show-cracks') as HTMLInputElement).checked = bs.showCracks;
        (document.getElementById('optimize-svg') as HTMLInputElement).checked = bs.optimizeSVG;
        syncMossDensityRow(bs.brickStyle);
        syncTexturePresetRow(bs.brickTextureMode);
    }

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

    if (initialSettings.generator === 'brick' && initialSettings.brickSettings) {
        initialSettings = {
            ...initialSettings,
            brickSettings: withBrickTextureDefaults(initialSettings.brickSettings),
        };
    }

    initialSettings = {
        ...initialSettings,
        zoom: clampCanvasZoom(Number(initialSettings.zoom ?? DEFAULT_SETTINGS.zoom ?? 1)),
        gradientBlendFactor: clampGradientBlendFactor(
            Number(initialSettings.gradientBlendFactor ?? DEFAULT_SETTINGS.gradientBlendFactor)
        ),
        waveDistortion: normalizeWaveDistortionSettings(initialSettings.waveDistortion),
    };

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
    debouncedSettingsEmitter = debouncedSettingsChange;

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

    // Canvas zoom slider
    const zoomInput = getElement<HTMLInputElement>('zoom');
    zoomInput.addEventListener('input', () => {
        const zoom = clampCanvasZoom(parseFloat(zoomInput.value));
        getElement<HTMLSpanElement>('zoom-value').textContent = formatCanvasZoom(zoom);
        uiState!.settings = { ...uiState!.settings, zoom };
        callbacks.onSettingsChange(uiState!.settings);
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

    // Gradient blend factor slider
    const gradientFactorInput = getElement<HTMLInputElement>('gradient-factor');
    gradientFactorInput.addEventListener('input', () => {
        const gradientBlendFactor = clampGradientBlendFactor(parseFloat(gradientFactorInput.value));
        getElement<HTMLSpanElement>('gradient-factor-value').textContent = gradientBlendFactor.toFixed(2);
        uiState!.settings = { ...uiState!.settings, gradientBlendFactor };
        debouncedSettingsChange(uiState!.settings);
    });

    // Wave distortion controls
    const waveEnabledInput = getElement<HTMLInputElement>('wave-distortion-enabled');
    waveEnabledInput.addEventListener('change', () => {
        const current = getCurrentWaveSettings();
        updateWaveSettings({
            ...current,
            enabled: waveEnabledInput.checked,
        });
    });

    const addWaveButton = getElement<HTMLButtonElement>('add-wave');
    addWaveButton.addEventListener('click', () => {
        const current = getCurrentWaveSettings();
        if (current.waves.length >= MAX_WAVE_LAYERS) {
            return;
        }

        const waves = [...current.waves, { ...DEFAULT_WAVE_LAYER }];
        updateWaveSettings({
            ...current,
            enabled: true,
            waves,
        });
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
        syncGradientFactorControl('solid');
        callbacks.onSettingsChange(uiState!.settings);
    });

    getElement<HTMLInputElement>('mode-gradient').addEventListener('change', () => {
        uiState!.settings = { ...uiState!.settings, cellColorMode: 'gradient' };
        syncGradientFactorControl('gradient');
        callbacks.onSettingsChange(uiState!.settings);
    });

    // Add color button
    getElement<HTMLButtonElement>('add-color').addEventListener('click', addColor);

    // Preset select
    const presetSelect = getElement<HTMLSelectElement>('presets');
    const presetModeToggle = getElement<HTMLButtonElement>('preset-mode-toggle');
    const initialPresetMode = getPresetModeFromSettings(initialSettings);
    setPresetModeToggle(initialPresetMode);
    renderPresetOptions(initialPresetMode);

    presetModeToggle.addEventListener('click', () => {
        const mode = getPresetModeFromToggle() === 'brick' ? 'grid' : 'brick';
        setPresetModeToggle(mode);
        renderPresetOptions(mode);
        presetSelect.value = '';
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

    // Brick controls
    initBrickControls(debouncedSettingsChange);

    // Initial sync
    syncUIToSettings();

    return initialSettings;
}

/**
 * Wires all brick control inputs to update brickSettings on uiState.
 * Called once from initUI().
 */
function initBrickControls(onChange: (s: PatternSettings) => void): void {
    const section = document.getElementById('brick-controls');
    if (!section) return;

    /** Helper: apply a partial update and emit */
    function updateBs(patch: Partial<BrickSettings>): void {
        if (!uiState || !uiState.settings.brickSettings) return;
        uiState.settings = {
            ...uiState.settings,
            brickSettings: withBrickTextureDefaults({ ...uiState.settings.brickSettings, ...patch }),
        };
        onChange(uiState.settings);
    }

    const texturePresetSelect = document.getElementById('brick-texture-preset') as HTMLSelectElement;
    if (texturePresetSelect && texturePresetSelect.options.length === 0) {
        PRESETS.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.name;
            option.textContent = preset.name;
            texturePresetSelect.appendChild(option);
        });
    }

    // Style selector
    const styleEl = document.getElementById('brick-style') as HTMLSelectElement;
    styleEl?.addEventListener('change', () => {
        const style = styleEl.value as BrickStyle;
        updateBs({ brickStyle: style });
        syncMossDensityRow(style);
    });

    // Texture mode selector
    const textureModeEl = document.getElementById('brick-texture-mode') as HTMLSelectElement;
    textureModeEl?.addEventListener('change', () => {
        const mode = textureModeEl.value as BrickTextureMode;
        updateBs({ brickTextureMode: mode });
        syncTexturePresetRow(mode);
    });

    // Texture preset selector
    texturePresetSelect?.addEventListener('change', () => {
        updateBs({ texturePresetName: texturePresetSelect.value });
    });

    // Randomize per brick
    const randomizeTextureEl = document.getElementById('brick-randomize-per-brick') as HTMLInputElement;
    randomizeTextureEl?.addEventListener('change', () => {
        updateBs({ textureRandomizePerBrick: randomizeTextureEl.checked });
    });

    // Texture scale
    const textureScaleEl = document.getElementById('brick-texture-scale') as HTMLInputElement;
    textureScaleEl?.addEventListener('input', () => {
        const value = parseFloat(textureScaleEl.value);
        (document.getElementById('brick-texture-scale-value') as HTMLSpanElement).textContent = value.toFixed(2);
        updateBs({ textureScale: value });
    });

    // Texture rotation
    const textureRotationEl = document.getElementById('brick-texture-rotation') as HTMLInputElement;
    textureRotationEl?.addEventListener('input', () => {
        const value = parseInt(textureRotationEl.value, 10);
        (document.getElementById('brick-texture-rotation-value') as HTMLSpanElement).textContent = `${value}°`;
        updateBs({ textureRotation: value });
    });

    // Brick width
    const bwEl = document.getElementById('brick-width') as HTMLInputElement;
    bwEl?.addEventListener('input', () => {
        const v = parseInt(bwEl.value, 10);
        (document.getElementById('brick-width-value') as HTMLSpanElement).textContent = `${v}px`;
        updateBs({ brickWidth: v });
    });

    // Brick height
    const bhEl = document.getElementById('brick-height') as HTMLInputElement;
    bhEl?.addEventListener('input', () => {
        const v = parseInt(bhEl.value, 10);
        (document.getElementById('brick-height-value') as HTMLSpanElement).textContent = `${v}px`;
        updateBs({ brickHeight: v });
    });

    // Mortar thickness
    const mtEl = document.getElementById('mortar-thickness') as HTMLInputElement;
    mtEl?.addEventListener('input', () => {
        const v = parseInt(mtEl.value, 10);
        (document.getElementById('mortar-thickness-value') as HTMLSpanElement).textContent = String(v);
        updateBs({ mortarThickness: v });
    });

    // Brick variation
    const bvEl = document.getElementById('brick-variation') as HTMLInputElement;
    bvEl?.addEventListener('input', () => {
        const v = parseFloat(bvEl.value);
        (document.getElementById('brick-variation-value') as HTMLSpanElement).textContent = v.toFixed(2);
        updateBs({ brickVariation: v });
    });

    // Moss density
    const mdEl = document.getElementById('moss-density') as HTMLInputElement;
    mdEl?.addEventListener('input', () => {
        const v = parseFloat(mdEl.value);
        (document.getElementById('moss-density-value') as HTMLSpanElement).textContent = v.toFixed(2);
        updateBs({ mossDensity: v });
    });

    // Brick base color
    const bbcEl = document.getElementById('brick-base-color') as HTMLInputElement;
    bbcEl?.addEventListener('input', () => updateBs({ brickBaseColor: bbcEl.value }));

    // Mortar color
    const mcEl = document.getElementById('mortar-color') as HTMLInputElement;
    mcEl?.addEventListener('input', () => updateBs({ mortarColor: mcEl.value }));

    // Show cracks checkbox
    const scEl = document.getElementById('show-cracks') as HTMLInputElement;
    scEl?.addEventListener('change', () => updateBs({ showCracks: scEl.checked }));

    // Optimize SVG checkbox
    const osEl = document.getElementById('optimize-svg') as HTMLInputElement;
    osEl?.addEventListener('change', () => updateBs({ optimizeSVG: osEl.checked }));
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
