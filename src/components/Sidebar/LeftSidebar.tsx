import React, { useState } from 'react';
import { ToolMode, FurnitureCatalogItem } from '../../types/floorplan';
import { ThemeColors } from '../../constants/themes';
import { FURNITURE_CATALOG } from '../../constants/catalog';
import {
  MousePointer,
  Hand,
  PenTool,
  Square,
  DoorOpen,
  Maximize,
  Ruler,
  Armchair,
  Search,
  ChevronLeft
} from 'lucide-react';

interface LeftSidebarProps {
  tool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  theme: ThemeColors;
  onAddItemDirectly: (type: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  tool,
  onSelectTool,
  theme,
  onAddItemDirectly
}) => {
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tools: { id: ToolMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Select & Move', icon: <MousePointer size={18} />, shortcut: 'V' },
    { id: 'pan', label: 'Hand / Pan Tool', icon: <Hand size={18} />, shortcut: 'H' },
    { id: 'wall', label: 'Draw Wall', icon: <PenTool size={18} />, shortcut: 'W' },
    { id: 'room', label: 'Room Box', icon: <Square size={18} />, shortcut: 'R' },
    { id: 'door', label: 'Place Door', icon: <DoorOpen size={18} />, shortcut: 'D' },
    { id: 'window', label: 'Place Window', icon: <Maximize size={18} />, shortcut: 'O' },
    { id: 'measure', label: 'Tape Measure', icon: <Ruler size={18} />, shortcut: 'M' }
  ];

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'living', label: 'Living' },
    { id: 'bedroom', label: 'Bedroom' },
    { id: 'dining', label: 'Dining' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'bathroom', label: 'Bath' },
    { id: 'office', label: 'Office' },
    { id: 'electrical', label: 'Electrical' }
  ];

  const filteredCatalog = FURNITURE_CATALOG.filter((item) => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleDragStart = (e: React.DragEvent, item: FurnitureCatalogItem) => {
    e.dataTransfer.setData('application/floorplan-furniture', item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside
      className="left-sidebar"
      style={{
        display: 'flex',
        height: '100%',
        zIndex: 40,
        userSelect: 'none',
        transition: 'background 0.2s ease, border-color 0.2s ease'
      }}
    >
      {/* 1. Primary Tool Icon Rail */}
      <div
        style={{
          width: 54,
          background: theme.uiBg,
          borderRight: `1px solid ${theme.uiBorder}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: 8
        }}
      >
        {tools.map((t) => {
          const isActive = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                border: 'none',
                background: isActive ? theme.accent : 'transparent',
                color: isActive ? '#ffffff' : theme.uiMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 6px rgba(37,99,235,0.3)' : 'none'
              }}
            >
              {t.icon}
            </button>
          );
        })}

        <div style={{ width: 28, height: 1, background: theme.uiBorder, margin: '6px 0' }} />

        {/* Catalog Drawer Toggle */}
        <button
          onClick={() => setCatalogOpen(!catalogOpen)}
          title="Toggle Furniture Library"
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            border: 'none',
            background: catalogOpen ? theme.accentFaint : 'transparent',
            color: catalogOpen ? theme.accent : theme.uiMuted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Armchair size={18} />
        </button>
      </div>

      {/* 2. Furniture Catalog Expandable Drawer */}
      {catalogOpen && (
        <div
          style={{
            width: 250,
            background: theme.uiBg,
            borderRight: `1px solid ${theme.uiBorder}`,
            display: 'flex',
            flexDirection: 'column',
            color: theme.uiText
          }}
        >
          <div style={{ padding: '12px 14px 8px 14px', borderBottom: `1px solid ${theme.uiBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Furniture Library
              </span>
              <button
                onClick={() => setCatalogOpen(false)}
                style={{ background: 'transparent', border: 'none', color: theme.uiMuted, cursor: 'pointer' }}
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: theme.name === 'dark' ? '#1e293b' : '#f1f5f9',
                borderRadius: 6,
                padding: '4px 8px',
                border: `1px solid ${theme.uiBorder}`
              }}
            >
              <Search size={14} color={theme.uiMuted} style={{ marginRight: 6 }} />
              <input
                type="text"
                placeholder="Search pieces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  color: theme.uiText,
                  fontSize: 12,
                  width: '100%'
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 4,
              overflowX: 'auto',
              padding: '8px 12px',
              borderBottom: `1px solid ${theme.uiBorder}`,
              scrollbarWidth: 'none'
            }}
          >
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                style={{
                  border: 'none',
                  background: activeCategory === c.id ? theme.accent : 'transparent',
                  color: activeCategory === c.id ? '#fff' : theme.uiMuted,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            {filteredCatalog.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: theme.uiMuted, fontSize: 12 }}>
                No items found
              </div>
            ) : (
              filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onClick={() => onAddItemDirectly(item.type)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${theme.uiBorder}`,
                    background: theme.name === 'dark' ? '#131f2e' : '#fafafa',
                    cursor: 'grab',
                    transition: 'all 0.15s ease'
                  }}
                  title="Drag onto canvas or click to add"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{item.name}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        color: theme.uiMuted,
                        background: theme.uiBorder,
                        padding: '1px 5px',
                        borderRadius: 3
                      }}
                    >
                      {item.width}×{item.depth}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: theme.uiMuted, marginTop: 2, textTransform: 'capitalize' }}>
                    {item.category} • Drag or click to place
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
