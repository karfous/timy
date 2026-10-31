import React from 'react';
import { ColorPalette } from '../types/timer';
import { PaletteEditor } from '../components/PaletteEditor';

export interface PaletteScreenProps {
  activePalette: ColorPalette;
  customPalettes: ColorPalette[];
  onSelectPalette: (palette: ColorPalette) => void;
  onSaveCustomPalette: (palette: ColorPalette) => void;
  onDeleteCustomPalette: (id: string) => void;
}

export const PaletteScreen: React.FC<PaletteScreenProps> = ({
  activePalette,
  customPalettes,
  onSelectPalette,
  onSaveCustomPalette,
  onDeleteCustomPalette,
}) => {
  return (
    <PaletteEditor
      activePalette={activePalette}
      customPalettes={customPalettes}
      onSelectPalette={onSelectPalette}
      onSaveCustomPalette={onSaveCustomPalette}
      onDeleteCustomPalette={onDeleteCustomPalette}
    />
  );
};

