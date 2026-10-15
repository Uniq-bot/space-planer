import { ViewState, Wall, UnitType } from '../types/floorplan';

// Coordinate transforms
export function worldToScreen(x: number, y: number, viewState: ViewState): { x: number; y: number } {
  return {
    x: x * viewState.zoom + viewState.panX,
    y: y * viewState.zoom + viewState.panY
  };
}

export function screenToWorld(screenX: number, screenY: number, viewState: ViewState): { x: number; y: number } {
  return {
    x: (screenX - viewState.panX) / viewState.zoom,
    y: (screenY - viewState.panY) / viewState.zoom
  };
}

// Snapping to grid
export function snapToGrid(value: number, gridSize: number, enabled = true): number {
  if (!enabled || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

// Angle snapping (e.g. 0, 45, 90, 135, 180...)
export function snapAngle(x1: number, y1: number, x2: number, y2: number, snapThresholdDeg = 5): { x: number; y: number; angleDeg: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 1e-4) return { x: x2, y: y2, angleDeg: 0 };

  let angle = Math.atan2(dy, dx);
  let angleDeg = (angle * 180) / Math.PI;
  if (angleDeg < 0) angleDeg += 360;

  // Snapping targets: every 45 degrees
  const step = 45;
  const nearest = Math.round(angleDeg / step) * step;
  if (Math.abs(angleDeg - nearest) <= snapThresholdDeg || Math.abs(angleDeg - nearest) >= 360 - snapThresholdDeg) {
    const snappedRad = ((nearest % 360) * Math.PI) / 180;
    return {
      x: x1 + Math.cos(snappedRad) * length,
      y: y1 + Math.sin(snappedRad) * length,
      angleDeg: nearest % 360
    };
  }

  return { x: x2, y: y2, angleDeg: Math.round(angleDeg) };
}

// Distance from point to line segment
export function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { distance: number; t: number; projX: number; projY: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-6) {
    return {
      distance: Math.hypot(px - x1, py - y1),
      t: 0,
      projX: x1,
      projY: y1
    };
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const distance = Math.hypot(px - projX, py - projY);

  return { distance, t, projX, projY };
}

// Find closest wall to click/hover point
export function findClosestWall(
  walls: Wall[],
  worldX: number,
  worldY: number,
  maxDistance = 25
): { wall: Wall; t: number; projX: number; projY: number } | null {
  let closest: { wall: Wall; t: number; projX: number; projY: number } | null = null;
  let minDistance = maxDistance;

  for (const wall of walls) {
    const { distance, t, projX, projY } = pointToSegmentDistance(
      worldX,
      worldY,
      wall.x1,
      wall.y1,
      wall.x2,
      wall.y2
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = { wall, t, projX, projY };
    }
  }

  return closest;
}

// Snap point to existing wall endpoints
export function snapToWallEndpoints(
  worldX: number,
  worldY: number,
  walls: Wall[],
  threshold = 20,
  excludeWallId?: string
): { x: number; y: number; snapped: boolean } {
  for (const wall of walls) {
    if (wall.id === excludeWallId) continue;
    if (Math.hypot(worldX - wall.x1, worldY - wall.y1) <= threshold) {
      return { x: wall.x1, y: wall.y1, snapped: true };
    }
    if (Math.hypot(worldX - wall.x2, worldY - wall.y2) <= threshold) {
      return { x: wall.x2, y: wall.y2, snapped: true };
    }
  }
  return { x: worldX, y: worldY, snapped: false };
}

// Format measurement value based on current unit
export function formatMeasurement(cmValue: number, unit: UnitType = 'cm'): string {
  if (unit === 'm') {
    const m = cmValue / 100;
    return `${m.toFixed(2)} m`;
  }
  if (unit === 'ft') {
    const totalInches = cmValue / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}′-` + `${inches}″`;
  }
  return `${Math.round(cmValue)} cm`;
}

// Generate wall polygon 4 points [p1, p2, p3, p4]
export function getWallPolygon(wall: Wall): { x: number; y: number }[] {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy) || 1;
  const halfT = (wall.thickness || 15) / 2;

  // Perpendicular normal vector
  const nx = (-dy / len) * halfT;
  const ny = (dx / len) * halfT;

  return [
    { x: wall.x1 + nx, y: wall.y1 + ny },
    { x: wall.x2 + nx, y: wall.y2 + ny },
    { x: wall.x2 - nx, y: wall.y2 - ny },
    { x: wall.x1 - nx, y: wall.y1 - ny }
  ];
}
