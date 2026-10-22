import React, { useState, useEffect, useCallback } from 'react';
import {
  FloorPlan,
  ToolMode,
  ThemeName,
  ViewState,
  SymbolItem
} from './types/floorplan';
import { THEMES } from './constants/themes';
import { TEMPLATES } from './constants/templates';
import { FURNITURE_CATALOG } from './constants/catalog';
import { TopBar } from './components/Toolbar/TopBar';
import { LeftSidebar } from './components/Sidebar/LeftSidebar';
import { FloorCanvas } from './components/Canvas2D/FloorCanvas';
import { Walkthrough3D } from './components/Canvas3D/Walkthrough3D';
import { RightInspector } from './components/Inspector/RightInspector';
import { StatusBar } from './components/StatusBar/StatusBar';

export const App: React.FC = () => {
  // Theme state
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('sp.editor.theme') as ThemeName;
    return saved && THEMES[saved] ? saved : 'paper';
  });
  const currentTheme = THEMES[themeName];

  // Plan state & LocalStorage persistence
  const [plan, setPlan] = useState<FloorPlan>(() => {
    try {
      const saved = localStorage.getItem('sp.editor.plan_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return TEMPLATES['studio-apartment']();
  });

  // Undo / Redo history
  const [historyPast, setHistoryPast] = useState<FloorPlan[]>([]);
  const [historyFuture, setHistoryFuture] = useState<FloorPlan[]>([]);

  // View state & Tool state
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [tool, setTool] = useState<ToolMode>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [viewState, setViewState] = useState<ViewState>({
    panX: 140,
    panY: 80,
    zoom: 0.85
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sp.editor.theme', themeName);
      localStorage.setItem('sp.editor.plan_v1', JSON.stringify(plan));
    } catch {
      // storage quota or blocked
    }
  }, [themeName, plan]);

  // Update plan with undo history
  const handleUpdatePlan = useCallback(
    (newPlan: FloorPlan) => {
      setHistoryPast((prev) => [...prev.slice(-25), plan]);
      setHistoryFuture([]);
      setPlan(newPlan);
    },
    [plan]
  );

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, prev.length - 1));
    setHistoryFuture((prev) => [plan, ...prev]);
    setPlan(previous);
  }, [historyPast, plan]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev, plan]);
    setPlan(next);
  }, [historyFuture, plan]);

  // Multi-selection handler
  const handleSelectIds = useCallback((ids: string[], isToggle?: boolean) => {
    if (isToggle) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) {
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }
        return Array.from(next);
      });
    } else {
      setSelectedIds(ids);
    }
  }, []);

  // Delete all currently selected elements
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const set = new Set(selectedIds);
    handleUpdatePlan({
      ...plan,
      walls: plan.walls.filter((w) => !set.has(w.id)),
      openings: plan.openings.filter((o) => !set.has(o.id) && !set.has(o.wall_id)),
      symbols: plan.symbols.filter((s) => !set.has(s.id)),
      rooms: plan.rooms.filter((r) => !set.has(r.id))
    });
    setSelectedIds([]);
  }, [selectedIds, plan, handleUpdatePlan]);

  // Determines a sensible, valid, non-overlapping location within the active plan
  const findSensiblePlacementPosition = (itemWidth: number, itemDepth: number): { x: number; y: number } => {
    let refX = 300;
    let refY = 250;

    if (plan.rooms.length > 0) {
      // Pick the room with the fewest placed symbols to distribute furniture pleasantly
      const roomOccupancies = plan.rooms.map((room) => {
        const rw = room.width || (room.area ? Math.sqrt(room.area) * 100 : 380);
        const rh = room.height || (room.area ? Math.sqrt(room.area) * 100 : 340);
        const count = plan.symbols.filter(
          (s) => Math.abs(s.x - room.x) <= rw / 2 && Math.abs(s.y - room.y) <= rh / 2
        ).length;
        return { room, count };
      });
      roomOccupancies.sort((a, b) => a.count - b.count);
      refX = roomOccupancies[0].room.x;
      refY = roomOccupancies[0].room.y;
    } else if (plan.walls.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      plan.walls.forEach((w) => {
        minX = Math.min(minX, w.x1, w.x2);
        maxX = Math.max(maxX, w.x1, w.x2);
        minY = Math.min(minY, w.y1, w.y2);
        maxY = Math.max(maxY, w.y1, w.y2);
      });
      if (isFinite(minX)) {
        refX = (minX + maxX) / 2;
        refY = (minY + maxY) / 2;
      }
    }

    const startX = Math.round(refX / 25) * 25;
    const startY = Math.round(refY / 25) * 25;

    const candidateOffsets: { dx: number; dy: number }[] = [
      { dx: 0, dy: 0 },
      { dx: 50, dy: 50 },
      { dx: -50, dy: 50 },
      { dx: 50, dy: -50 },
      { dx: -50, dy: -50 },
      { dx: 100, dy: 0 },
      { dx: -100, dy: 0 },
      { dx: 0, dy: 100 },
      { dx: 0, dy: -100 },
      { dx: 100, dy: 100 },
      { dx: -100, dy: 100 },
      { dx: 100, dy: -100 },
      { dx: -100, dy: -100 },
      { dx: 150, dy: 50 },
      { dx: -150, dy: 50 },
      { dx: 50, dy: 150 },
      { dx: -50, dy: 150 }
    ];

    for (const off of candidateOffsets) {
      const candX = startX + off.dx;
      const candY = startY + off.dy;

      const collision = plan.symbols.some((s) => {
        const halfW = (s.width + itemWidth) / 2;
        const halfD = (s.depth + itemDepth) / 2;
        return Math.abs(s.x - candX) < halfW * 0.70 && Math.abs(s.y - candY) < halfD * 0.70;
      });

      if (!collision) {
        return { x: candX, y: candY };
      }
    }

    const lastSym = plan.symbols[plan.symbols.length - 1];
    if (lastSym) {
      return {
        x: Math.round((lastSym.x + 50) / 25) * 25,
        y: Math.round((lastSym.y + 50) / 25) * 25
      };
    }

    return { x: startX, y: startY };
  };

  // Add piece directly from catalog with sensible, non-overlapping positioning
  const handleAddItemDirectly = (type: string) => {
    const catalogItem = FURNITURE_CATALOG.find((item) => item.type === type);
    const w = catalogItem?.width || 120;
    const d = catalogItem?.depth || 60;
    const h = catalogItem?.height || 80;
    const pos = findSensiblePlacementPosition(w, d);

    const newSym: SymbolItem = {
      id: `sym_${Date.now()}`,
      type,
      category: catalogItem?.category || 'living',
      x: pos.x,
      y: pos.y,
      width: w,
      depth: d,
      height: h,
      rotation: 0
    };
    handleUpdatePlan({
      ...plan,
      symbols: [...plan.symbols, newSym]
    });
    setSelectedIds([newSym.id]);
    setTool('select');
  };

  // Export as PNG
  const handleExportPng = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.metadata.name.toLowerCase().replace(/\s+/g, '_')}_floorplan.png`;
    a.click();
  };

  // Export as JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(plan, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.metadata.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString) as FloorPlan;
      if (parsed.walls && Array.isArray(parsed.walls)) {
        handleUpdatePlan(parsed);
        setSelectedIds([]);
      }
    } catch {
      alert('Invalid FloorPlan JSON file format.');
    }
  };

  // Global keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allIds = [
          ...plan.walls.map((w) => w.id),
          ...plan.symbols.map((s) => s.id),
          ...plan.openings.map((o) => o.id),
          ...plan.rooms.map((r) => r.id)
        ];
        setSelectedIds(allIds);
      } else if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if (e.key === 'Escape') {
        setSelectedIds([]);
        if (viewMode === '2D') setTool('select');
      } else if (viewMode === '2D') {
        if (e.key === 'v' || e.key === 'V') {
          setTool('select');
        } else if (e.key === 'h' || e.key === 'H') {
          setTool('pan');
        } else if (e.key === 'w' || e.key === 'W') {
          setTool('wall');
        } else if (e.key === 'r' || e.key === 'R') {
          setTool('room');
        } else if (e.key === 'd' || e.key === 'D') {
          setTool('door');
        } else if (e.key === 'o' || e.key === 'O') {
          setTool('window');
        } else if (e.key === 'm' || e.key === 'M') {
          setTool('measure');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteSelected, plan, viewMode]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        background: currentTheme.paper,
        color: currentTheme.uiText,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* 1. Top Navigation Bar */}
      <TopBar
        plan={plan}
        onUpdatePlan={handleUpdatePlan}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        theme={currentTheme}
        themeName={themeName}
        onChangeTheme={setThemeName}
        viewState={viewState}
        onUpdateViewState={setViewState}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        onExportPng={handleExportPng}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      {/* 2. Main Middle Workspace */}
      <div className="workspace-shell" style={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Left Toolbar & Furniture Catalog */}
        <LeftSidebar
          tool={tool}
          onSelectTool={setTool}
          theme={currentTheme}
          onAddItemDirectly={handleAddItemDirectly}
        />

        {/* Viewport: 2D Canvas or 3D Walkthrough */}
        <main className="workspace-viewport" style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
          {viewMode === '2D' ? (
            <FloorCanvas
              plan={plan}
              onUpdatePlan={handleUpdatePlan}
              tool={tool}
              onSelectTool={setTool}
              selectedIds={selectedIds}
              onSelectIds={handleSelectIds}
              theme={currentTheme}
              viewState={viewState}
              onUpdateViewState={setViewState}
            />
          ) : (
            <Walkthrough3D
              plan={plan}
              onUpdatePlan={handleUpdatePlan}
              theme={currentTheme}
              selectedIds={selectedIds}
              onSelectIds={handleSelectIds}
            />
          )}
        </main>

        {/* Right Inspector Properties Panel */}
        <RightInspector
          plan={plan}
          onUpdatePlan={handleUpdatePlan}
          selectedIds={selectedIds}
          onSelectIds={setSelectedIds}
          onDeselect={() => setSelectedIds([])}
          theme={currentTheme}
        />
      </div>

      {/* 3. Bottom Status Bar */}
      <StatusBar
        tool={tool}
        theme={currentTheme}
        themeName={themeName}
        units={plan.metadata.units}
        zoom={viewState.zoom}
      />
    </div>
  );
};

export default App;
