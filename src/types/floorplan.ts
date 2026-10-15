import { FloorMaterialType, WallMaterialType } from '../utils/textures';

export type UnitType = 'cm' | 'm' | 'ft';

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number; // in cm
  height: number;    // in cm
  wallType?: 'interior' | 'exterior' | 'partition';
  material?: WallMaterialType;
}

export type SwingType = 'left' | 'right' | 'double' | 'pocket' | 'none';

export interface Opening {
  id: string;
  wall_id: string;
  type: 'door' | 'window';
  position: number; // 0.0 to 1.0 along wall vector
  width: number;    // in cm
  height: number;   // in cm
  sill_height?: number; // in cm (for windows)
  swing: SwingType;
  mirror?: boolean;
  mullion_cols?: number;
}

export interface SymbolItem {
  id: string;
  type: string;
  category: string;
  x: number; // center x in cm
  y: number; // center y in cm
  width: number;  // in cm
  depth: number;  // in cm
  rotation: number; // in degrees (0 - 360)
  label?: string;
  color?: string;
  material?: string;
}

export interface Room {
  id: string;
  name: string;
  x: number; // label x in cm
  y: number; // label y in cm
  width?: number; // room width in cm
  height?: number; // room height in cm
  area?: number; // in square meters
  floorMaterial?: FloorMaterialType;
}

export interface FloorPlan {
  walls: Wall[];
  openings: Opening[];
  symbols: SymbolItem[];
  rooms: Room[];
  metadata: {
    name: string;
    units: UnitType;
    grid_size: number;
    scale: number;
  };
}

export type ToolMode = 'select' | 'pan' | 'wall' | 'room' | 'door' | 'window' | 'measure';

export type ThemeName = 'light' | 'paper' | 'dark';

export interface ViewState {
  panX: number;
  panY: number;
  zoom: number; // 1 = 100%
}

export interface FurnitureCatalogItem {
  id: string;
  type: string;
  name: string;
  category: 'living' | 'bedroom' | 'dining' | 'kitchen' | 'bathroom' | 'office' | 'decor' | 'electrical';
  width: number;
  depth: number;
  height: number;
  keywords: string;
}
