import React from 'react';
import { ToolMode, ThemeName, UnitType } from '../../types/floorplan';
import { ThemeColors } from '../../constants/themes';

interface StatusBarProps {
  tool: ToolMode;
  theme: ThemeColors;
  themeName: ThemeName;
  units: UnitType;
  zoom: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  tool,
  theme,
  themeName,
  units,
  zoom
}) => {
  const getToolHint = () => {
    switch (tool) {
      case 'select':
        return 'Select: Click to select. Drag to move. Use top stalk handle to rotate.';
      case 'pan':
        return 'Hand Tool: Click and drag anywhere to pan. Mouse wheel or pinch to zoom.';
      case 'wall':
        return 'Wall Tool: Click start point → Click endpoint. Double-click or Esc to finish chain.';
      case 'room':
        return 'Room Box: Click and drag to create a rectangular 4-wall room.';
      case 'door':
        return 'Door Tool: Hover over any wall to snap preview, then click to place.';
      case 'window':
        return 'Window Tool: Hover over any wall to snap preview, then click to place.';
      case 'measure':
        return 'Tape Measure: Click start point → Click endpoint to measure clearance.';
    }
  };

  return (
    <footer
      style={{
        height: 28,
        background: theme.uiBg,
        borderTop: `1px solid ${theme.uiBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        color: theme.uiMuted,
        fontSize: 11,
        userSelect: 'none',
        zIndex: 50,
        transition: 'background 0.2s ease, border-color 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 600, color: theme.uiText }}>
          {getToolHint()}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>Level: <b>Ground Floor</b></span>
        <span>Units: <b>{units.toUpperCase()}</b></span>
        <span>Theme: <b>{themeName.toUpperCase()}</b></span>
        <span>Zoom: <b>{Math.round(zoom * 100)}%</b></span>
        <span style={{ color: theme.accent, fontWeight: 600 }}>● Ready</span>
      </div>
    </footer>
  );
};
