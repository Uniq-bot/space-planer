import React from 'react';
import {
  FloorPlan,
  Wall,
  Opening,
  SymbolItem,
  Room
} from '../../types/floorplan';
import { ThemeColors } from '../../constants/themes';
import { FLOOR_MATERIALS, WALL_MATERIALS, FloorMaterialType, WallMaterialType } from '../../utils/textures';
import { Trash2, RotateCw, X } from 'lucide-react';

interface RightInspectorProps {
  plan: FloorPlan;
  onUpdatePlan: (plan: FloorPlan) => void;
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  onDeselect: () => void;
  theme: ThemeColors;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  plan,
  onUpdatePlan,
  selectedIds,
  onSelectIds,
  onDeselect,
  theme
}) => {
  // If single item selected, find it
  const singleId = selectedIds.length === 1 ? selectedIds[0] : null;
  const selectedWall = singleId ? plan.walls.find((w) => w.id === singleId) : null;
  const selectedOpening = singleId ? plan.openings.find((o) => o.id === singleId) : null;
  const selectedSymbol = singleId ? plan.symbols.find((s) => s.id === singleId) : null;
  const selectedRoom = singleId ? plan.rooms.find((r) => r.id === singleId) : null;

  // Filter all selected items for multi-selection panel
  const selectedWalls = plan.walls.filter((w) => selectedIds.includes(w.id));
  const selectedOpenings = plan.openings.filter((o) => selectedIds.includes(o.id));
  const selectedSymbols = plan.symbols.filter((s) => selectedIds.includes(s.id));
  const selectedRooms = plan.rooms.filter((r) => selectedIds.includes(r.id));

  const handleDeleteSingle = () => {
    if (!singleId) return;
    onUpdatePlan({
      ...plan,
      walls: plan.walls.filter((w) => w.id !== singleId),
      openings: plan.openings.filter((o) => o.id !== singleId && o.wall_id !== singleId),
      symbols: plan.symbols.filter((s) => s.id !== singleId),
      rooms: plan.rooms.filter((r) => r.id !== singleId)
    });
    onDeselect();
  };

  const handleDeleteBatch = () => {
    if (selectedIds.length === 0) return;
    const set = new Set(selectedIds);
    onUpdatePlan({
      ...plan,
      walls: plan.walls.filter((w) => !set.has(w.id)),
      openings: plan.openings.filter((o) => !set.has(o.id) && !set.has(o.wall_id)),
      symbols: plan.symbols.filter((s) => !set.has(s.id)),
      rooms: plan.rooms.filter((r) => !set.has(r.id))
    });
    onDeselect();
  };

  const handleRemoveFromSelection = (idToRemove: string) => {
    onSelectIds(selectedIds.filter((id) => id !== idToRemove));
  };

  const handleBatchRotate = (deg: number) => {
    const symbolSet = new Set(selectedSymbols.map((s) => s.id));
    onUpdatePlan({
      ...plan,
      symbols: plan.symbols.map((s) =>
        symbolSet.has(s.id) ? { ...s, rotation: ((s.rotation || 0) + deg) % 360 } : s
      )
    });
  };

  const handleBatchWallThickness = (thickness: number) => {
    const wallSet = new Set(selectedWalls.map((w) => w.id));
    onUpdatePlan({
      ...plan,
      walls: plan.walls.map((w) => (wallSet.has(w.id) ? { ...w, thickness } : w))
    });
  };

  const handleBatchWallHeight = (height: number) => {
    const wallSet = new Set(selectedWalls.map((w) => w.id));
    onUpdatePlan({
      ...plan,
      walls: plan.walls.map((w) => (wallSet.has(w.id) ? { ...w, height } : w))
    });
  };

  const handleBatchWallMaterial = (material: WallMaterialType) => {
    const wallSet = new Set(selectedWalls.map((w) => w.id));
    onUpdatePlan({
      ...plan,
      walls: plan.walls.map((w) => (wallSet.has(w.id) ? { ...w, material } : w))
    });
  };

  const handleBatchRoomFloor = (floorMaterial: FloorMaterialType) => {
    const roomSet = new Set(selectedRooms.map((r) => r.id));
    onUpdatePlan({
      ...plan,
      rooms: plan.rooms.map((r) => (roomSet.has(r.id) ? { ...r, floorMaterial } : r))
    });
  };

  const updateWall = (updates: Partial<Wall>) => {
    if (!selectedWall) return;
    onUpdatePlan({
      ...plan,
      walls: plan.walls.map((w) => (w.id === selectedWall.id ? { ...w, ...updates } : w))
    });
  };

  const updateOpening = (updates: Partial<Opening>) => {
    if (!selectedOpening) return;
    onUpdatePlan({
      ...plan,
      openings: plan.openings.map((o) => (o.id === selectedOpening.id ? { ...o, ...updates } : o))
    });
  };

  const updateSymbol = (updates: Partial<SymbolItem>) => {
    if (!selectedSymbol) return;
    onUpdatePlan({
      ...plan,
      symbols: plan.symbols.map((s) => (s.id === selectedSymbol.id ? { ...s, ...updates } : s))
    });
  };

  const updateRoom = (updates: Partial<Room>) => {
    if (!selectedRoom) return;
    onUpdatePlan({
      ...plan,
      rooms: plan.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, ...updates } : r))
    });
  };

  const totalFloorArea = plan.rooms.reduce((acc, r) => acc + (r.area || 0), 0);

  return (
    <aside
      style={{
        width: 280,
        background: theme.uiBg,
        borderLeft: `1px solid ${theme.uiBorder}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
        color: theme.uiText,
        overflowY: 'auto',
        userSelect: 'none',
        zIndex: 40,
        transition: 'background 0.2s ease, border-color 0.2s ease'
      }}
    >
      {/* 1. WALL PROPERTIES & TEXTURES */}
      {selectedWall && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Wall Properties
            </span>
            <button
              onClick={handleDeleteSingle}
              title="Delete Wall"
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
            <div>
              <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Length</label>
              <input
                type="text"
                readOnly
                value={`${Math.round(Math.hypot(selectedWall.x2 - selectedWall.x1, selectedWall.y2 - selectedWall.y1))} cm`}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Thickness (cm)</label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={selectedWall.thickness || 15}
                  onChange={(e) => updateWall({ thickness: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, fontSize: 12 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Height (cm)</label>
                <input
                  type="number"
                  min="200"
                  max="500"
                  value={selectedWall.height || 270}
                  onChange={(e) => updateWall({ height: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, fontSize: 12 }}
                />
              </div>
            </div>

            {/* Wall Texture Options */}
            <div style={{ marginTop: 6 }}>
              <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 8, fontWeight: 600 }}>
                Wall Finish & Texture
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {WALL_MATERIALS.map((wm) => {
                  const isActive = (selectedWall.material || 'clean_white') === wm.id;
                  return (
                    <button
                      key={wm.id}
                      onClick={() => updateWall({ material: wm.id as WallMaterialType })}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: `1px solid ${isActive ? theme.accent : theme.uiBorder}`,
                        background: isActive ? theme.accentFaint : 'transparent',
                        color: theme.uiText,
                        fontSize: 11,
                        fontWeight: isActive ? 600 : 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          background: wm.color,
                          border: '1px solid rgba(0,0,0,0.15)',
                          flexShrink: 0
                        }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {wm.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. OPENING PROPERTIES */}
      {selectedOpening && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {selectedOpening.type === 'door' ? 'Door Properties' : 'Window Properties'}
            </span>
            <button
              onClick={handleDeleteSingle}
              title="Delete Opening"
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
            <div>
              <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Width (cm)</label>
              <input
                type="number"
                min="40"
                max="300"
                value={selectedOpening.width}
                onChange={(e) => updateOpening({ width: Number(e.target.value) })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Height (cm)</label>
              <input
                type="number"
                min="50"
                max="280"
                value={selectedOpening.height}
                onChange={(e) => updateOpening({ height: Number(e.target.value) })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, fontSize: 12 }}
              />
            </div>

            {selectedOpening.type === 'door' ? (
              <div>
                <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Swing Direction</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['left', 'right'] as const).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => updateOpening({ swing: dir })}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 6,
                        border: `1px solid ${theme.uiBorder}`,
                        background: selectedOpening.swing === dir ? theme.accent : 'transparent',
                        color: selectedOpening.swing === dir ? '#fff' : theme.uiText,
                        cursor: 'pointer',
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Sill Height (cm)</label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={selectedOpening.sill_height || 90}
                  onChange={(e) => updateOpening({ sill_height: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, fontSize: 12 }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. FURNITURE PROPERTIES */}
      {selectedSymbol && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Piece Properties
            </span>
            <button
              onClick={handleDeleteSingle}
              title="Delete Piece"
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
            <div>
              <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Type</label>
              <input
                type="text"
                readOnly
                value={selectedSymbol.type.replace(/_/g, ' ')}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, fontSize: 12, textTransform: 'capitalize' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Width (cm)</label>
                <input
                  type="number"
                  min="20"
                  max="500"
                  value={selectedSymbol.width}
                  onChange={(e) => updateSymbol({ width: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, fontSize: 12 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Depth (cm)</label>
                <input
                  type="number"
                  min="20"
                  max="500"
                  value={selectedSymbol.depth}
                  onChange={(e) => updateSymbol({ depth: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, fontSize: 12 }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ color: theme.uiMuted }}>Rotation</label>
                <span style={{ fontWeight: 600 }}>{selectedSymbol.rotation || 0}°</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => updateSymbol({ rotation: ((selectedSymbol.rotation || 0) + 45) % 360 })}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '6px 0',
                    borderRadius: 6,
                    border: `1px solid ${theme.uiBorder}`,
                    background: 'transparent',
                    color: theme.uiText,
                    cursor: 'pointer'
                  }}
                >
                  <RotateCw size={13} /> +45°
                </button>
                <button
                  onClick={() => updateSymbol({ rotation: ((selectedSymbol.rotation || 0) + 90) % 360 })}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '6px 0',
                    borderRadius: 6,
                    border: `1px solid ${theme.uiBorder}`,
                    background: 'transparent',
                    color: theme.uiText,
                    cursor: 'pointer'
                  }}
                >
                  <RotateCw size={13} /> +90°
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. ROOM PROPERTIES & FLOOR TEXTURES */}
      {selectedRoom && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Room Properties
            </span>
            <button
              onClick={handleDeleteSingle}
              title="Delete Room"
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
            <div>
              <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Room Name</label>
              <input
                type="text"
                value={selectedRoom.name}
                onChange={(e) => updateRoom({ name: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${theme.uiBorder}`, background: 'transparent', color: theme.uiText, fontSize: 12 }}
              />
            </div>

            {selectedRoom.area && (
              <div>
                <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 4 }}>Area</label>
                <div style={{ fontWeight: 700, fontSize: 15, color: theme.accent }}>{selectedRoom.area.toFixed(1)} m²</div>
              </div>
            )}

            {/* Interactive Floor Texture Selector */}
            <div style={{ marginTop: 6 }}>
              <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 8, fontWeight: 600 }}>
                Floor Texture & Material
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {FLOOR_MATERIALS.map((fm) => {
                  const isActive = (selectedRoom.floorMaterial || 'oak_wood') === fm.id;
                  return (
                    <button
                      key={fm.id}
                      onClick={() => updateRoom({ floorMaterial: fm.id as FloorMaterialType })}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: `1px solid ${isActive ? theme.accent : theme.uiBorder}`,
                        background: isActive ? theme.accentFaint : 'transparent',
                        color: theme.uiText,
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: fm.color,
                          border: '1px solid rgba(0,0,0,0.2)',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: isActive ? 700 : 600, color: isActive ? theme.accentText : theme.uiText }}>
                          {fm.name}
                        </div>
                        <div style={{ fontSize: 10, color: theme.uiMuted, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {fm.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MULTI-SELECTION PANEL */}
      {selectedIds.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Multi-Selection
                </span>
                <span
                  style={{
                    background: theme.accent,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 10
                  }}
                >
                  {selectedIds.length}
                </span>
              </div>
              <div style={{ fontSize: 11, color: theme.uiMuted, marginTop: 2 }}>
                {[
                  selectedSymbols.length ? `${selectedSymbols.length} Furniture` : null,
                  selectedWalls.length ? `${selectedWalls.length} Wall${selectedWalls.length > 1 ? 's' : ''}` : null,
                  selectedRooms.length ? `${selectedRooms.length} Room${selectedRooms.length > 1 ? 's' : ''}` : null,
                  selectedOpenings.length ? `${selectedOpenings.length} Opening${selectedOpenings.length > 1 ? 's' : ''}` : null
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            <button
              onClick={handleDeleteBatch}
              title="Delete all selected elements"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '5px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600
              }}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>

          {/* Quick Deselect All button */}
          <button
            onClick={onDeselect}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${theme.uiBorder}`,
              background: 'transparent',
              color: theme.uiMuted,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 500
            }}
          >
            Clear Selection (Esc)
          </button>

          {/* Batch Furniture Rotation */}
          {selectedSymbols.length > 0 && (
            <div style={{ borderTop: `1px solid ${theme.uiBorder}`, paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.uiMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Rotate Furniture ({selectedSymbols.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <button
                  onClick={() => handleBatchRotate(45)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '6px 0',
                    borderRadius: 6,
                    border: `1px solid ${theme.uiBorder}`,
                    background: 'transparent',
                    color: theme.uiText,
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  <RotateCw size={12} /> +45°
                </button>
                <button
                  onClick={() => handleBatchRotate(90)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '6px 0',
                    borderRadius: 6,
                    border: `1px solid ${theme.uiBorder}`,
                    background: 'transparent',
                    color: theme.uiText,
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  <RotateCw size={12} /> +90°
                </button>
                <button
                  onClick={() => handleBatchRotate(180)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '6px 0',
                    borderRadius: 6,
                    border: `1px solid ${theme.uiBorder}`,
                    background: 'transparent',
                    color: theme.uiText,
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  <RotateCw size={12} /> 180°
                </button>
              </div>
            </div>
          )}

          {/* Batch Wall Properties & Finishes */}
          {selectedWalls.length > 0 && (
            <div style={{ borderTop: `1px solid ${theme.uiBorder}`, paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.uiMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Batch Walls ({selectedWalls.length})
              </div>

              {/* Quick Wall Thickness */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', color: theme.uiMuted, fontSize: 11, marginBottom: 4 }}>
                  Set Thickness (cm)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                  {[10, 15, 20, 25].map((th) => (
                    <button
                      key={th}
                      onClick={() => handleBatchWallThickness(th)}
                      style={{
                        padding: '4px 0',
                        borderRadius: 4,
                        border: `1px solid ${theme.uiBorder}`,
                        background: 'transparent',
                        color: theme.uiText,
                        fontSize: 11,
                        cursor: 'pointer'
                      }}
                    >
                      {th}cm
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Wall Height */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', color: theme.uiMuted, fontSize: 11, marginBottom: 4 }}>
                  Set Height (cm)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                  {[240, 270, 300].map((ht) => (
                    <button
                      key={ht}
                      onClick={() => handleBatchWallHeight(ht)}
                      style={{
                        padding: '4px 0',
                        borderRadius: 4,
                        border: `1px solid ${theme.uiBorder}`,
                        background: 'transparent',
                        color: theme.uiText,
                        fontSize: 11,
                        cursor: 'pointer'
                      }}
                    >
                      {ht}cm
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Wall Texture Finish */}
              <div>
                <label style={{ display: 'block', color: theme.uiMuted, fontSize: 11, marginBottom: 6 }}>
                  Set Wall Finish (All Selected)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {WALL_MATERIALS.map((wm) => (
                    <button
                      key={wm.id}
                      onClick={() => handleBatchWallMaterial(wm.id as WallMaterialType)}
                      style={{
                        padding: '5px 6px',
                        borderRadius: 5,
                        border: `1px solid ${theme.uiBorder}`,
                        background: 'transparent',
                        color: theme.uiText,
                        fontSize: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          background: wm.color,
                          border: '1px solid rgba(0,0,0,0.15)',
                          flexShrink: 0
                        }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {wm.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Batch Rooms Floor Finish */}
          {selectedRooms.length > 0 && (
            <div style={{ borderTop: `1px solid ${theme.uiBorder}`, paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.uiMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Batch Room Floors ({selectedRooms.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {FLOOR_MATERIALS.map((fm) => (
                  <button
                    key={fm.id}
                    onClick={() => handleBatchRoomFloor(fm.id as FloorMaterialType)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: `1px solid ${theme.uiBorder}`,
                      background: 'transparent',
                      color: theme.uiText,
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        background: fm.color,
                        border: '1px solid rgba(0,0,0,0.2)',
                        flexShrink: 0
                      }}
                    />
                    <span style={{ fontWeight: 600 }}>{fm.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Elements List */}
          <div style={{ borderTop: `1px solid ${theme.uiBorder}`, paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.uiMuted, textTransform: 'uppercase', marginBottom: 8 }}>
              Selected Elements ({selectedIds.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
              {selectedSymbols.map((sym) => (
                <div
                  key={sym.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: 5,
                    background: 'rgba(0,0,0,0.03)',
                    fontSize: 11
                  }}
                >
                  <span
                    onClick={() => onSelectIds([sym.id])}
                    style={{ cursor: 'pointer', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title="Click to select only this piece"
                  >
                    🪑 {sym.type.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => handleRemoveFromSelection(sym.id)}
                    style={{ background: 'transparent', border: 'none', color: theme.uiMuted, cursor: 'pointer', padding: 2 }}
                    title="Remove from selection"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {selectedWalls.map((wall, idx) => (
                <div
                  key={wall.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: 5,
                    background: 'rgba(0,0,0,0.03)',
                    fontSize: 11
                  }}
                >
                  <span
                    onClick={() => onSelectIds([wall.id])}
                    style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title="Click to select only this wall"
                  >
                    🧱 Wall {idx + 1} ({Math.round(Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1))}cm)
                  </span>
                  <button
                    onClick={() => handleRemoveFromSelection(wall.id)}
                    style={{ background: 'transparent', border: 'none', color: theme.uiMuted, cursor: 'pointer', padding: 2 }}
                    title="Remove from selection"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {selectedRooms.map((room) => (
                <div
                  key={room.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: 5,
                    background: 'rgba(0,0,0,0.03)',
                    fontSize: 11
                  }}
                >
                  <span
                    onClick={() => onSelectIds([room.id])}
                    style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title="Click to select only this room"
                  >
                    🏠 {room.name || 'Room'} ({room.area?.toFixed(1) || 0} m²)
                  </span>
                  <button
                    onClick={() => handleRemoveFromSelection(room.id)}
                    style={{ background: 'transparent', border: 'none', color: theme.uiMuted, cursor: 'pointer', padding: 2 }}
                    title="Remove from selection"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {selectedOpenings.map((op) => (
                <div
                  key={op.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: 5,
                    background: 'rgba(0,0,0,0.03)',
                    fontSize: 11
                  }}
                >
                  <span
                    onClick={() => onSelectIds([op.id])}
                    style={{ cursor: 'pointer', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title="Click to select only this opening"
                  >
                    🚪 {op.type} ({op.width}cm)
                  </span>
                  <button
                    onClick={() => handleRemoveFromSelection(op.id)}
                    style={{ background: 'transparent', border: 'none', color: theme.uiMuted, cursor: 'pointer', padding: 2 }}
                    title="Remove from selection"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. DEFAULT PROJECT OVERVIEW (WHEN NOTHING SELECTED) */}
      {selectedIds.length === 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
            Project Details
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${theme.uiBorder}` }}>
              <span style={{ color: theme.uiMuted }}>Plan Name</span>
              <span style={{ fontWeight: 600 }}>{plan.metadata.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${theme.uiBorder}` }}>
              <span style={{ color: theme.uiMuted }}>Total Walls</span>
              <span style={{ fontWeight: 600 }}>{plan.walls.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${theme.uiBorder}` }}>
              <span style={{ color: theme.uiMuted }}>Doors & Windows</span>
              <span style={{ fontWeight: 600 }}>{plan.openings.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${theme.uiBorder}` }}>
              <span style={{ color: theme.uiMuted }}>Furniture Placed</span>
              <span style={{ fontWeight: 600 }}>{plan.symbols.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${theme.uiBorder}` }}>
              <span style={{ color: theme.uiMuted }}>Rooms Configured</span>
              <span style={{ fontWeight: 600 }}>{plan.rooms.length}</span>
            </div>
            {totalFloorArea > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${theme.uiBorder}` }}>
                <span style={{ color: theme.uiMuted }}>Estimated Area</span>
                <span style={{ fontWeight: 700, color: theme.accent }}>{totalFloorArea.toFixed(1)} m²</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <label style={{ display: 'block', color: theme.uiMuted, marginBottom: 8, fontWeight: 600, fontSize: 12 }}>
              Multi-Select & Textures
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: theme.uiMuted, lineHeight: 1.5 }}>
              <div>• <b>Shift + Click</b> or <b>Ctrl + Click</b> on any element to add/remove it from selection.</div>
              <div>• <b>Drag a Box (Marquee)</b> on empty canvas to multi-select items inside it.</div>
              <div>• Drag any selected element to <b>move the entire group</b> together.</div>
              <div>• Press <b>Delete</b> or <b>Backspace</b> to remove all selected items at once.</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
