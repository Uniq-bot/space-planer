import * as THREE from 'three';

export type FloorMaterialType =
  | 'oak_wood'
  | 'herringbone_parquet'
  | 'chevron_walnut'
  | 'marble_tile'
  | 'slate_tile'
  | 'polished_concrete'
  | 'carpet_beige'
  | 'terracotta'
  | 'terrazzo'
  | 'checker_tile';

export type WallMaterialType =
  | 'clean_white'
  | 'warm_cream'
  | 'brick_exposed'
  | 'concrete_raw'
  | 'charcoal_dark'
  | 'sage_green'
  | 'wood_panel'
  | 'plaster_venetian'
  | 'subway_tile'
  | 'modern_wallpaper';

export interface MaterialOption {
  id: string;
  name: string;
  category: 'floor' | 'wall';
  color: string;
  description: string;
}

export interface MaterialPBRConfig {
  unitWidth: number;  // in cm: world width covered by 1 texture tile
  unitHeight: number; // in cm: world height covered by 1 texture tile
  roughness: number;
  metalness: number;
}

export const FLOOR_PBR_CONFIG: Record<FloorMaterialType, MaterialPBRConfig> = {
  oak_wood: { unitWidth: 100, unitHeight: 100, roughness: 0.50, metalness: 0.02 },
  herringbone_parquet: { unitWidth: 60, unitHeight: 60, roughness: 0.45, metalness: 0.02 },
  chevron_walnut: { unitWidth: 70, unitHeight: 70, roughness: 0.42, metalness: 0.02 },
  marble_tile: { unitWidth: 80, unitHeight: 80, roughness: 0.12, metalness: 0.05 },
  slate_tile: { unitWidth: 80, unitHeight: 80, roughness: 0.70, metalness: 0.04 },
  polished_concrete: { unitWidth: 120, unitHeight: 120, roughness: 0.25, metalness: 0.05 },
  carpet_beige: { unitWidth: 50, unitHeight: 50, roughness: 0.95, metalness: 0.0 },
  terracotta: { unitWidth: 60, unitHeight: 60, roughness: 0.75, metalness: 0.02 },
  terrazzo: { unitWidth: 100, unitHeight: 100, roughness: 0.18, metalness: 0.05 },
  checker_tile: { unitWidth: 80, unitHeight: 80, roughness: 0.14, metalness: 0.05 }
};

export const WALL_PBR_CONFIG: Record<WallMaterialType, MaterialPBRConfig> = {
  clean_white: { unitWidth: 100, unitHeight: 100, roughness: 0.85, metalness: 0.01 },
  warm_cream: { unitWidth: 100, unitHeight: 100, roughness: 0.85, metalness: 0.01 },
  brick_exposed: { unitWidth: 60, unitHeight: 40, roughness: 0.82, metalness: 0.02 },
  concrete_raw: { unitWidth: 120, unitHeight: 90, roughness: 0.72, metalness: 0.05 },
  charcoal_dark: { unitWidth: 100, unitHeight: 100, roughness: 0.88, metalness: 0.02 },
  sage_green: { unitWidth: 100, unitHeight: 100, roughness: 0.85, metalness: 0.01 },
  wood_panel: { unitWidth: 60, unitHeight: 100, roughness: 0.55, metalness: 0.02 },
  plaster_venetian: { unitWidth: 100, unitHeight: 100, roughness: 0.58, metalness: 0.02 },
  subway_tile: { unitWidth: 60, unitHeight: 45, roughness: 0.15, metalness: 0.04 },
  modern_wallpaper: { unitWidth: 80, unitHeight: 80, roughness: 0.75, metalness: 0.04 }
};

export const FLOOR_MATERIALS: { id: FloorMaterialType; name: string; color: string; desc: string }[] = [
  { id: 'oak_wood', name: 'Natural Oak Planks', color: '#d4a373', desc: 'Warm natural light oak hardwood flooring' },
  { id: 'herringbone_parquet', name: 'Herringbone Parquet', color: '#c38e58', desc: 'Classic French diagonal parquet pattern' },
  { id: 'chevron_walnut', name: 'Chevron Walnut', color: '#5c3a21', desc: 'Rich dark walnut geometric chevron boards' },
  { id: 'marble_tile', name: 'Carrara White Marble', color: '#f8fafc', desc: 'Polished Italian white marble with grey veins' },
  { id: 'slate_tile', name: 'Charcoal Slate Tile', color: '#334155', desc: 'Textured dark slate stone tiles' },
  { id: 'polished_concrete', name: 'Polished Concrete', color: '#94a3b8', desc: 'Modern industrial minimalist concrete' },
  { id: 'carpet_beige', name: 'Woven Wool Carpet', color: '#e2d9cc', desc: 'Soft cozy textured woven carpet' },
  { id: 'terracotta', name: 'Terracotta Tiles', color: '#c86d51', desc: 'Warm rustic Mediterranean terracotta tiles' },
  { id: 'terrazzo', name: 'Venetian Terrazzo', color: '#e2e8f0', desc: 'Polished composite stone with stone mineral chips' },
  { id: 'checker_tile', name: 'Checkerboard Tile', color: '#1e293b', desc: 'Classic monochrome high-contrast marble tile' }
];

export const WALL_MATERIALS: { id: WallMaterialType; name: string; color: string; desc: string }[] = [
  { id: 'clean_white', name: 'Architectural White', color: '#f8fafc', desc: 'Crisp minimalist interior plaster' },
  { id: 'warm_cream', name: 'Warm Cream', color: '#fef3c7', desc: 'Soft comforting eggshell tone' },
  { id: 'brick_exposed', name: 'Exposed Red Brick', color: '#b91c1c', desc: 'Authentic loft brickwork with mortar' },
  { id: 'concrete_raw', name: 'Board-Formed Concrete', color: '#64748b', desc: 'Architectural cast concrete wall' },
  { id: 'charcoal_dark', name: 'Matte Charcoal', color: '#1e293b', desc: 'Contemporary deep moody accent wall' },
  { id: 'sage_green', name: 'Calm Sage Green', color: '#4d7c0f', desc: 'Organic biophilic soothing green' },
  { id: 'wood_panel', name: 'Vertical Oak Slats', color: '#b45309', desc: 'Scandinavian acoustic wood slat cladding' },
  { id: 'plaster_venetian', name: 'Venetian Plaster', color: '#e2e8f0', desc: 'Artisan troweled lime plaster with gentle sheen' },
  { id: 'subway_tile', name: 'Glazed Subway Tile', color: '#ffffff', desc: 'Gloss white ceramic subway tile with dark grout' },
  { id: 'modern_wallpaper', name: 'Geo Line Wallpaper', color: '#ede9fe', desc: 'Bespoke Scandinavian geometric motif wallpaper' }
];

// Cache procedural canvases to avoid regenerating
const canvasCache = new Map<string, HTMLCanvasElement>();

// Generate 2D pattern Canvas for floor material
export function createFloorCanvasPattern(mat: FloorMaterialType = 'oak_wood'): HTMLCanvasElement {
  if (canvasCache.has(mat)) return canvasCache.get(mat)!;

  const canvas = document.createElement('canvas');
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  switch (mat) {
    case 'oak_wood': {
      ctx.fillStyle = '#d8a979';
      ctx.fillRect(0, 0, size, size);
      // Horizontal wood planks
      const plankH = 32;
      ctx.strokeStyle = '#b88a5d';
      ctx.lineWidth = 1.5;
      for (let y = 0; y < size; y += plankH) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();

        // Staggered vertical joints
        const offset = (y / plankH) % 2 === 0 ? 0 : 64;
        ctx.beginPath();
        ctx.moveTo(offset, y);
        ctx.lineTo(offset, y + plankH);
        ctx.stroke();
        if (offset === 0) {
          ctx.beginPath();
          ctx.moveTo(size / 2, y);
          ctx.lineTo(size / 2, y + plankH);
          ctx.stroke();
        }
      }
      break;
    }

    case 'herringbone_parquet': {
      ctx.fillStyle = '#c59360';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#9c6f40';
      ctx.lineWidth = 1;
      const step = 16;
      for (let x = -size; x < size * 2; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + size, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + size, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
      break;
    }

    case 'chevron_walnut': {
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#3d2412';
      ctx.lineWidth = 1.5;
      const step = 32;
      for (let y = 0; y <= size; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size / 2, y + 16);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.stroke();
      break;
    }

    case 'marble_tile': {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, size / 2, size / 2);
      ctx.strokeRect(size / 2, 0, size / 2, size / 2);
      ctx.strokeRect(0, size / 2, size / 2, size / 2);
      ctx.strokeRect(size / 2, size / 2, size / 2, size / 2);

      // Subtle marble veins
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.bezierCurveTo(30, 45, 60, 20, 110, 90);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(70, 0);
      ctx.bezierCurveTo(90, 40, 50, 70, 80, 128);
      ctx.stroke();
      break;
    }

    case 'slate_tile': {
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, size, size);
      ctx.strokeRect(0, 0, size / 2, size / 2);
      ctx.strokeRect(size / 2, size / 2, size / 2, size / 2);
      break;
    }

    case 'polished_concrete': {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 37) % size;
        const sy = (i * 53) % size;
        ctx.fillRect(sx, sy, 2, 2);
      }
      break;
    }

    case 'carpet_beige': {
      ctx.fillStyle = '#e5ddd0';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(120, 100, 80, 0.15)';
      for (let x = 0; x < size; x += 4) {
        for (let y = 0; y < size; y += 4) {
          if ((x + y) % 8 === 0) ctx.fillRect(x, y, 2, 2);
        }
      }
      break;
    }

    case 'terracotta': {
      ctx.fillStyle = '#c86d51';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#8c3d25';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, size / 2 - 4, size / 2 - 4);
      ctx.strokeRect(size / 2 + 2, 2, size / 2 - 4, size / 2 - 4);
      ctx.strokeRect(2, size / 2 + 2, size / 2 - 4, size / 2 - 4);
      ctx.strokeRect(size / 2 + 2, size / 2 + 2, size / 2 - 4, size / 2 - 4);
      break;
    }

    case 'terrazzo': {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, size, size);
      const chips = ['#334155', '#c2714f', '#94a3b8', '#ffffff', '#b45309'];
      for (let i = 0; i < 60; i++) {
        const cx = (i * 29 + 7) % size;
        const cy = (i * 43 + 13) % size;
        const cRadius = (i % 3) + 1.5;
        ctx.fillStyle = chips[i % chips.length];
        ctx.beginPath();
        ctx.arc(cx, cy, cRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'checker_tile': {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, size / 2, size / 2);
      ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, size, size);
      break;
    }

    default: {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, size, size);
      break;
    }
  }

  canvasCache.set(mat, canvas);
  return canvas;
}

// Generate 2D pattern Canvas for wall material
export function createWallCanvasPattern(mat: WallMaterialType = 'clean_white'): HTMLCanvasElement {
  const cacheKey = `wall_${mat}`;
  if (canvasCache.has(cacheKey)) return canvasCache.get(cacheKey)!;

  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  switch (mat) {
    case 'brick_exposed': {
      ctx.fillStyle = '#a83a2a';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1.5;
      const bH = 16;
      for (let y = 0; y < size; y += bH) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
        const offset = (y / bH) % 2 === 0 ? 0 : 16;
        for (let x = offset; x < size; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + bH);
          ctx.stroke();
        }
      }
      break;
    }

    case 'wood_panel': {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      for (let x = 0; x < size; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
      break;
    }

    case 'concrete_raw': {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(8, 8, 2, 0, Math.PI * 2);
      ctx.arc(size - 8, 8, 2, 0, Math.PI * 2);
      ctx.arc(8, size - 8, 2, 0, Math.PI * 2);
      ctx.arc(size - 8, size - 8, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'subway_tile': {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      const tileH = 16;
      for (let y = 0; y <= size; y += tileH) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
        const offset = (y / tileH) % 2 === 0 ? 0 : 16;
        for (let x = offset; x <= size; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + tileH);
          ctx.stroke();
        }
      }
      break;
    }

    case 'plaster_venetian': {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.beginPath();
      ctx.ellipse(20, 20, 16, 8, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(44, 44, 18, 10, -Math.PI / 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'modern_wallpaper': {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1;
      for (let x = 0; x <= size; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 8, size / 2);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
      break;
    }

    case 'charcoal_dark': {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'warm_cream': {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'sage_green': {
      ctx.fillStyle = '#5c7f55';
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'clean_white':
    default: {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, size, size);
      break;
    }
  }

  canvasCache.set(cacheKey, canvas);
  return canvas;
}

// Three.js Texture generator from procedural canvas with backwards compatibility
const threeTextureCache = new Map<string, THREE.CanvasTexture>();

export function getThreeTexture(type: 'floor' | 'wall', id: string): THREE.CanvasTexture {
  const key = `${type}_${id}`;
  if (threeTextureCache.has(key)) return threeTextureCache.get(key)!;

  const canvas = type === 'floor'
    ? createFloorCanvasPattern(id as FloorMaterialType)
    : createWallCanvasPattern(id as WallMaterialType);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  if (type === 'floor') {
    texture.repeat.set(4, 4);
  } else {
    texture.repeat.set(2, 2);
  }

  threeTextureCache.set(key, texture);
  return texture;
}

/**
 * Creates a physically accurate Three.js PBR material with real-world proportional UV scaling.
 * Textures repeat according to physical dimensions (e.g. cm) without stretching across long walls or rooms.
 */
export function createPBRMaterial(
  type: 'floor' | 'wall',
  id: string,
  widthCm: number,
  heightCm: number,
  options?: {
    transparent?: boolean;
    opacity?: number;
    isSelected?: boolean;
  }
): THREE.MeshStandardMaterial {
  const pbr = type === 'floor'
    ? FLOOR_PBR_CONFIG[id as FloorMaterialType] || FLOOR_PBR_CONFIG['oak_wood']
    : WALL_PBR_CONFIG[id as WallMaterialType] || WALL_PBR_CONFIG['clean_white'];

  const canvas = type === 'floor'
    ? createFloorCanvasPattern(id as FloorMaterialType)
    : createWallCanvasPattern(id as WallMaterialType);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  // Real-world proportional UV scaling (repeat = real-world cm / unit cm)
  const repeatX = Math.max(0.1, widthCm / pbr.unitWidth);
  const repeatY = Math.max(0.1, heightCm / pbr.unitHeight);
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: pbr.roughness,
    metalness: pbr.metalness,
    transparent: options?.transparent || false,
    opacity: options?.opacity ?? 1.0,
    emissive: options?.isSelected ? new THREE.Color(0x2563eb) : new THREE.Color(0x000000),
    emissiveIntensity: options?.isSelected ? 0.35 : 0,
    envMapIntensity: 1.0
  });

  return mat;
}
