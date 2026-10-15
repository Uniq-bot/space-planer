import React, { useState } from 'react';
import {
  FloorPlan,
  ThemeName,
  UnitType,
  ViewState
} from '../../types/floorplan';
import { ThemeColors } from '../../constants/themes';
import { TEMPLATES } from '../../constants/templates';
import {
  Eye,
  Box,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FolderOpen,
  Download,
  FileJson,
  Sun,
  Moon,
  Scroll,
  PlusCircle,
  HelpCircle
} from 'lucide-react';

interface TopBarProps {
  plan: FloorPlan;
  onUpdatePlan: (plan: FloorPlan) => void;
  viewMode: '2D' | '3D';
  onToggleViewMode: (mode: '2D' | '3D') => void;
  theme: ThemeColors;
  themeName: ThemeName;
  onChangeTheme: (theme: ThemeName) => void;
  viewState: ViewState;
  onUpdateViewState: (vs: ViewState | ((prev: ViewState) => ViewState)) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExportPng: () => void;
  onExportJson: () => void;
  onImportJson: (jsonString: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  plan,
  onUpdatePlan,
  viewMode,
  onToggleViewMode,
  theme,
  themeName,
  onChangeTheme,
  viewState,
  onUpdateViewState,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExportPng,
  onExportJson,
  onImportJson
}) => {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleUnitChange = (units: UnitType) => {
    onUpdatePlan({
      ...plan,
      metadata: { ...plan.metadata, units }
    });
  };

  const handleLoadTemplate = (key: string) => {
    const tplGen = TEMPLATES[key];
    if (tplGen) {
      onUpdatePlan(tplGen());
      onUpdateViewState({ panX: 120, panY: 100, zoom: 0.85 });
      setShowTemplateModal(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportJson(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header
      style={{
        height: 52,
        background: theme.uiBg,
        borderBottom: `1px solid ${theme.uiBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        color: theme.uiText,
        userSelect: 'none',
        zIndex: 50
      }}
      className="topbar"
    >
      {/* Left: Brand & Title & View Toggle */}
      <div className="topbar-group topbar-primary" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 16,
              boxShadow: '0 2px 4px rgba(37,99,235,0.3)'
            }}
          >
            📐
          </div>
          <span style={{ letterSpacing: -0.3 }}>EkPlanner</span>
          <span style={{ fontSize: 11, padding: '2px 6px', background: theme.accentFaint, color: theme.accent, borderRadius: 4, fontWeight: 600 }}>
            STUDIO
          </span>
        </div>

        {/* 2D / 3D Dual Mode Switcher */}
        <div
          style={{
            display: 'flex',
            background: theme.name === 'dark' ? '#1e293b' : '#f1f5f9',
            padding: 3,
            borderRadius: 8,
            border: `1px solid ${theme.uiBorder}`
          }}
        >
          <button
            onClick={() => onToggleViewMode('2D')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === '2D' ? theme.accent : 'transparent',
              color: viewMode === '2D' ? '#fff' : theme.uiMuted,
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Eye size={14} /> 2D Editor
          </button>
          <button
            onClick={() => onToggleViewMode('3D')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === '3D' ? theme.accent : 'transparent',
              color: viewMode === '3D' ? '#fff' : theme.uiMuted,
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Box size={14} /> 3D Walkthrough
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="topbar-history" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            style={{
              padding: 6,
              borderRadius: 6,
              border: `1px solid ${theme.uiBorder}`,
              background: 'transparent',
              color: canUndo ? theme.uiText : theme.uiMuted,
              cursor: canUndo ? 'pointer' : 'default',
              opacity: canUndo ? 1 : 0.4
            }}
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            style={{
              padding: 6,
              borderRadius: 6,
              border: `1px solid ${theme.uiBorder}`,
              background: 'transparent',
              color: canRedo ? theme.uiText : theme.uiMuted,
              cursor: canRedo ? 'pointer' : 'default',
              opacity: canRedo ? 1 : 0.4
            }}
          >
            <Redo2 size={15} />
          </button>
        </div>
      </div>

      {/* Center: Zoom & View controls */}
      <div className="topbar-group topbar-view-controls" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => onUpdateViewState((vs) => ({ ...vs, zoom: Math.max(0.2, vs.zoom * 0.85) }))}
          title="Zoom Out"
          style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, cursor: 'pointer' }}
        >
          <ZoomOut size={14} />
        </button>

        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 48, textAlign: 'center', fontFamily: 'monospace' }}>
          {Math.round(viewState.zoom * 100)}%
        </span>

        <button
          onClick={() => onUpdateViewState((vs) => ({ ...vs, zoom: Math.min(3.5, vs.zoom * 1.15) }))}
          title="Zoom In"
          style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, cursor: 'pointer' }}
        >
          <ZoomIn size={14} />
        </button>

        <button
          onClick={() => onUpdateViewState({ panX: 120, panY: 100, zoom: 0.85 })}
          title="Reset View / Fit to Screen"
          style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, cursor: 'pointer' }}
        >
          <Maximize2 size={14} />
        </button>

        <div style={{ height: 18, width: 1, background: theme.uiBorder, margin: '0 4px' }} />

        {/* Units Selector */}
        <div style={{ display: 'flex', background: theme.name === 'dark' ? '#1e293b' : '#f1f5f9', padding: 2, borderRadius: 6 }}>
          {(['cm', 'm', 'ft'] as UnitType[]).map((u) => (
            <button
              key={u}
              onClick={() => handleUnitChange(u)}
              style={{
                border: 'none',
                background: plan.metadata.units === u ? theme.uiBg : 'transparent',
                color: plan.metadata.units === u ? theme.accent : theme.uiMuted,
                fontWeight: 600,
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                boxShadow: plan.metadata.units === u ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {u.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Templates, Theme, Export */}
      <div className="topbar-group topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Templates Button */}
        <button
          onClick={() => setShowTemplateModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            border: `1px solid ${theme.uiBorder}`,
            background: 'transparent',
            color: theme.uiText,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <FolderOpen size={14} /> Sample Plans
        </button>

        {/* Theme Switcher (Light, Paper, Dark) */}
        <div style={{ display: 'flex', background: theme.name === 'dark' ? '#1e293b' : '#f1f5f9', padding: 2, borderRadius: 6 }}>
          <button
            onClick={() => onChangeTheme('light')}
            title="Light Theme"
            style={{
              border: 'none',
              background: themeName === 'light' ? theme.uiBg : 'transparent',
              color: themeName === 'light' ? '#2563eb' : theme.uiMuted,
              padding: '4px 6px',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            <Sun size={14} />
          </button>
          <button
            onClick={() => onChangeTheme('paper')}
            title="Paper / Blueprint Theme"
            style={{
              border: 'none',
              background: themeName === 'paper' ? theme.uiBg : 'transparent',
              color: themeName === 'paper' ? '#2c5e91' : theme.uiMuted,
              padding: '4px 6px',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            <Scroll size={14} />
          </button>
          <button
            onClick={() => onChangeTheme('dark')}
            title="Dark Theme"
            style={{
              border: 'none',
              background: themeName === 'dark' ? theme.uiBg : 'transparent',
              color: themeName === 'dark' ? '#8fb3da' : theme.uiMuted,
              padding: '4px 6px',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            <Moon size={14} />
          </button>
        </div>

        {/* Export / Import Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={onExportPng}
            title="Export High-Res PNG"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${theme.uiBorder}`,
              background: 'transparent',
              color: theme.uiText,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Download size={13} /> PNG
          </button>

          <button
            onClick={onExportJson}
            title="Save Project as JSON"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${theme.uiBorder}`,
              background: 'transparent',
              color: theme.uiText,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <FileJson size={13} /> Save
          </button>

          <label
            title="Import Plan JSON"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${theme.uiBorder}`,
              background: 'transparent',
              color: theme.uiText,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <PlusCircle size={13} style={{ marginRight: 4 }} /> Open
            <input type="file" accept=".json" onChange={handleFileImport} style={{ display: 'none' }} />
          </label>

          <button
            onClick={() => setShowHelpModal(true)}
            title="Help & Shortcuts"
            style={{
              padding: 6,
              borderRadius: 6,
              border: `1px solid ${theme.uiBorder}`,
              background: 'transparent',
              color: theme.uiMuted,
              cursor: 'pointer'
            }}
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </div>

      {/* Sample Plans Modal */}
      {showTemplateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            style={{
              background: theme.uiBg,
              border: `1px solid ${theme.uiBorder}`,
              borderRadius: 12,
              padding: 24,
              width: 520,
              maxWidth: '90vw',
              color: theme.uiText,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Choose a Floor Plan Template</h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, color: theme.uiMuted, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: 13, color: theme.uiMuted }}>
              Start your project from verified architectural plans reverse-engineered from SpacePlanner:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                onClick={() => handleLoadTemplate('studio-apartment')}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  border: `1px solid ${theme.uiBorder}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: theme.accent, marginBottom: 4 }}>
                  🏢 Studio Apartment (5.0m × 6.4m)
                </div>
                <div style={{ fontSize: 12, color: theme.uiMuted }}>
                  A compact open-plan studio layout with combined living and sleeping area, kitchenette, and private bathroom.
                </div>
              </div>

              <div
                onClick={() => handleLoadTemplate('one-bedroom-apartment')}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  border: `1px solid ${theme.uiBorder}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: theme.accent, marginBottom: 4 }}>
                  🏠 One Bedroom Apartment (7.6m × 6.0m)
                </div>
                <div style={{ fontSize: 12, color: theme.uiMuted }}>
                  Practical layout featuring an isolated master bedroom, spacious living room, open kitchen, and full bathroom.
                </div>
              </div>

              <div
                onClick={() => handleLoadTemplate('two-bedroom-suite')}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  border: `1px solid ${theme.uiBorder}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: theme.accent, marginBottom: 4 }}>
                  🏡 Two Bedroom Suite (9.0m × 7.0m)
                </div>
                <div style={{ fontSize: 12, color: theme.uiMuted }}>
                  Spacious family plan with master bedroom, second bedroom/home office, dining area, and dedicated bathroom.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help & Shortcuts Modal */}
      {showHelpModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
          onClick={() => setShowHelpModal(false)}
        >
          <div
            style={{
              background: theme.uiBg,
              border: `1px solid ${theme.uiBorder}`,
              borderRadius: 12,
              padding: 24,
              width: 500,
              maxWidth: '90vw',
              color: theme.uiText,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Keyboard Shortcuts & Tips</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, color: theme.uiMuted, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><b>V</b> - Select Tool</div>
              <div><b>W</b> - Draw Walls</div>
              <div><b>R</b> - Drag Room Rectangle</div>
              <div><b>D</b> - Insert Door</div>
              <div><b>O</b> - Insert Window</div>
              <div><b>M</b> - Measure Tape</div>
              <div><b>Delete / Backspace</b> - Delete</div>
              <div><b>Esc</b> - Cancel / Deselect</div>
              <div><b>Shift + Drag Rotate</b> - 15° Snap</div>
              <div><b>Wheel</b> - Zoom Canvas</div>
              <div><b>Space + Drag</b> - Pan View</div>
              <div><b>3D View</b> - Walk with WASD</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
