import React, { useState } from 'react';
import { Palette, Check, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { ColorPalette } from '../types/timer';
import { DEFAULT_PALETTES } from '../services/storage';
import { Card } from './Card';
import { Heading } from './Heading';

interface PaletteEditorProps {
  activePalette: ColorPalette;
  customPalettes: ColorPalette[];
  onSelectPalette: (palette: ColorPalette) => void;
  onSaveCustomPalette: (palette: ColorPalette) => void;
  onDeleteCustomPalette: (id: string) => void;
}

const COLOR_FIELDS: Array<{
  key: keyof Pick<
    ColorPalette,
    | 'bgPrimary'
    | 'bgSurface'
    | 'textPrimary'
    | 'textMuted'
    | 'accentPrimary'
    | 'accentBreak'
    | 'accentWarn'
  >;
  label: string;
  hint: string;
}> = [
  { key: 'bgPrimary', label: 'Background', hint: 'Main canvas color' },
  { key: 'bgSurface', label: 'Surface / Card', hint: 'Elevated panels & dials' },
  { key: 'textPrimary', label: 'Primary Text', hint: 'Digits & headings' },
  { key: 'textMuted', label: 'Secondary Text', hint: 'Captions & labels' },
  { key: 'accentPrimary', label: 'Work Accent', hint: 'Work phase & outer ring' },
  { key: 'accentBreak', label: 'Break Accent', hint: 'Rest phase & inner ring' },
  { key: 'accentWarn', label: '5s Warning', hint: 'Last 5s countdown alert' },
];

export const PaletteEditor: React.FC<PaletteEditorProps> = ({
  activePalette,
  customPalettes,
  onSelectPalette,
  onSaveCustomPalette,
  onDeleteCustomPalette,
}) => {
  const [draft, setDraft] = useState<ColorPalette>(activePalette);
  const [customName, setCustomName] = useState<string>(
    activePalette.isCustom ? activePalette.name : 'My Custom Theme'
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSelectPreset = (palette: ColorPalette) => {
    setDraft(palette);
    if (palette.isCustom) {
      setCustomName(palette.name);
    }
    onSelectPalette(palette);
  };

  const handleColorChange = (
    key: (typeof COLOR_FIELDS)[number]['key'],
    value: string
  ) => {
    const updated: ColorPalette = {
      ...draft,
      [key]: value,
      isCustom: true,
    };
    setDraft(updated);
    onSelectPalette(updated);
  };

  const handleSavePalette = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customName.trim() || 'Custom Palette';
    const existingCustom = customPalettes.find(
      (p) => p.name.toLowerCase() === cleanName.toLowerCase()
    );
    const newPalette: ColorPalette = {
      ...draft,
      id: existingCustom?.id ?? `custom-${Date.now()}`,
      name: cleanName,
      isCustom: true,
    };
    setDraft(newPalette);
    onSaveCustomPalette(newPalette);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleResetDefault = () => {
    const obsidian = DEFAULT_PALETTES[0];
    setDraft(obsidian);
    onSelectPalette(obsidian);
  };

  const allPalettes = [...DEFAULT_PALETTES, ...customPalettes];

  return (
    <Card
      as="section"
      variant="surface"
      className="panel-section"
      aria-label="Color Palette Editor"
    >
      <Heading
        level={2}
        size="lg"
        icon={<Palette size={18} strokeWidth={1.6} />}
        title="Color Palette & Theme"
        subtitle="Customize colors in real time and save your palette to localStorage."
        className="section-header"
        titleClassName="section-title"
        actions={
          <button
            type="button"
            className="btn-ghost small"
            onClick={handleResetDefault}
            title="Reset to default dark mode"
          >
            <RotateCcw size={14} strokeWidth={1.6} />
            <span>Reset Default</span>
          </button>
        }
      />

      {/* Saved & Preset Palettes Grid */}
      <div className="palettes-grid">
        {allPalettes.map((palette) => {
          const isSelected = activePalette.id === palette.id;
          return (
            <Card
              key={palette.id}
              variant="item"
              interactive
              selected={isSelected}
              className="palette-preset-card"
              onClick={() => handleSelectPreset(palette)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectPreset(palette);
                }
              }}
            >
              <div className="palette-swatches">
                <span style={{ backgroundColor: palette.bgPrimary }} />
                <span style={{ backgroundColor: palette.bgSurface }} />
                <span style={{ backgroundColor: palette.accentPrimary }} />
                <span style={{ backgroundColor: palette.accentBreak }} />
                <span style={{ backgroundColor: palette.accentWarn }} />
              </div>
              <div className="palette-card-meta">
                <span className="palette-name">{palette.name}</span>
                {palette.isCustom && (
                  <button
                    type="button"
                    className="delete-palette-btn"
                    aria-label={`Delete ${palette.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCustomPalette(palette.id);
                    }}
                  >
                    <Trash2 size={13} strokeWidth={1.6} />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Live Color Editor */}
      <form className="custom-palette-form" onSubmit={handleSavePalette}>
        <Heading
          level={3}
          size="sm"
          title="Live Palette Editor"
          titleClassName="subsection-title"
        />
        <div className="color-pickers-grid">
          {COLOR_FIELDS.map((field) => (
            <Card
              as="label"
              key={field.key}
              variant="control"
              className="color-picker-item"
            >
              <div className="color-picker-info">
                <span className="color-field-label">{field.label}</span>
                <span className="color-field-hint">{field.hint}</span>
              </div>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={draft[field.key]}
                  onChange={(e) => handleColorChange(field.key, e.target.value)}
                  className="native-color-input"
                  aria-label={field.label}
                />
                <input
                  type="text"
                  value={draft[field.key]}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      handleColorChange(field.key, val);
                    }
                  }}
                  className="hex-code-input"
                  aria-label={`${field.label} hex code`}
                />
              </div>
            </Card>
          ))}
        </div>

        <div className="save-palette-bar">
          <input
            type="text"
            className="text-input"
            placeholder="Palette name (e.g. Cyber Forest)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            aria-label="Custom palette name"
          />
          <button type="submit" className="btn-solid save-palette-btn">
            {savedNotice ? (
              <>
                <Check size={16} strokeWidth={1.8} />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Plus size={16} strokeWidth={1.8} />
                <span>Save Palette</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Card>
  );
};
