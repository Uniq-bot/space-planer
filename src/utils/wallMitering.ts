import { Wall } from '../types/floorplan';

export interface MiteredWall {
  wall: Wall;
  // 4 corner vertices in world coordinates
  pStartLeft: { x: number; y: number };
  pEndLeft: { x: number; y: number };
  pEndRight: { x: number; y: number };
  pStartRight: { x: number; y: number };
  startIsMitered: boolean;
  endIsMitered: boolean;
}

export interface JunctionInfo {
  x: number;
  y: number;
  connections: {
    wallId: string;
    isStart: boolean;
  }[];
}

// Intersect two 2D lines: P1 + t * D1 and P2 + s * D2
function intersectLines(
  p1: { x: number; y: number },
  d1: { x: number; y: number },
  p2: { x: number; y: number },
  d2: { x: number; y: number }
): { x: number; y: number } | null {
  const det = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(det) < 1e-4) return null; // Parallel or collinear

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const t = (dx * d2.y - dy * d2.x) / det;

  return {
    x: p1.x + t * d1.x,
    y: p1.y + t * d1.y
  };
}

/**
 * Computes exact mitered corner polygons for all walls in a floor plan.
 * Each wall is bounded by a Left line and a Right line. At junctions,
 * edge lines intersect to form seamless, razor-clean mitered corners.
 */
export function computeMiteredWalls(walls: Wall[], snapDist = 10): Map<string, MiteredWall> {
  const result = new Map<string, MiteredWall>();
  if (!walls || walls.length === 0) return result;

  // 1. Group endpoints into junctions within snapDist
  const junctions: JunctionInfo[] = [];

  const findOrCreateJunction = (x: number, y: number): JunctionInfo => {
    for (const j of junctions) {
      if (Math.hypot(j.x - x, j.y - y) <= snapDist) {
        return j;
      }
    }
    const newJ: JunctionInfo = { x, y, connections: [] };
    junctions.push(newJ);
    return newJ;
  };

  walls.forEach((w) => {
    const jStart = findOrCreateJunction(w.x1, w.y1);
    jStart.connections.push({ wallId: w.id, isStart: true });

    const jEnd = findOrCreateJunction(w.x2, w.y2);
    jEnd.connections.push({ wallId: w.id, isStart: false });
  });

  // 2. Initialize default perpendicular endpoints for all walls
  walls.forEach((w) => {
    const dx = w.x2 - w.x1;
    const dy = w.y2 - w.y1;
    const len = Math.hypot(dx, dy) || 1;
    const halfT = (w.thickness || 15) / 2;
    const nx = (-dy / len) * halfT;
    const ny = (dx / len) * halfT;

    result.set(w.id, {
      wall: w,
      pStartLeft: { x: w.x1 + nx, y: w.y1 + ny },
      pEndLeft: { x: w.x2 + nx, y: w.y2 + ny },
      pEndRight: { x: w.x2 - nx, y: w.y2 - ny },
      pStartRight: { x: w.x1 - nx, y: w.y1 - ny },
      startIsMitered: false,
      endIsMitered: false
    });
  });

  // 3. Process each junction to compute precise miter joins
  junctions.forEach((j) => {
    if (j.connections.length === 2) {
      const c1 = j.connections[0];
      const c2 = j.connections[1];
      const m1 = result.get(c1.wallId);
      const m2 = result.get(c2.wallId);
      if (!m1 || !m2) return;

      const w1 = m1.wall;
      const w2 = m2.wall;

      const d1x = w1.x2 - w1.x1;
      const d1y = w1.y2 - w1.y1;
      const len1 = Math.hypot(d1x, d1y) || 1;
      const u1 = { x: d1x / len1, y: d1y / len1 };
      const h1 = (w1.thickness || 15) / 2;
      const n1 = { x: -u1.y * h1, y: u1.x * h1 };

      const d2x = w2.x2 - w2.x1;
      const d2y = w2.y2 - w2.y1;
      const len2 = Math.hypot(d2x, d2y) || 1;
      const u2 = { x: d2x / len2, y: d2y / len2 };
      const h2 = (w2.thickness || 15) / 2;
      const n2 = { x: -u2.y * h2, y: u2.x * h2 };

      // Flow direction relative to junction:
      // flow = +1 if traveling INTO junction (i.e. junction is the end of the wall)
      // flow = -1 if traveling AWAY from junction (i.e. junction is the start of the wall)
      const flow1 = c1.isStart ? -1 : 1;
      const flow2 = c2.isStart ? 1 : -1;

      // 4 boundary lines
      const p1L = { x: w1.x1 + n1.x, y: w1.y1 + n1.y };
      const p1R = { x: w1.x1 - n1.x, y: w1.y1 - n1.y };

      const p2L = { x: w2.x1 + n2.x, y: w2.y1 + n2.y };
      const p2R = { x: w2.x1 - n2.x, y: w2.y1 - n2.y };

      // Check collinearity
      const cross = u1.x * u2.y - u1.y * u2.x;
      if (Math.abs(cross) < 0.05) {
        // Nearly collinear / straight continuation: join cleanly
        if (c1.isStart) {
          m1.startIsMitered = true;
        } else {
          m1.endIsMitered = true;
        }
        if (c2.isStart) {
          m2.startIsMitered = true;
        } else {
          m2.endIsMitered = true;
        }
        return;
      }

      let ptLeft: { x: number; y: number } | null = null;
      let ptRight: { x: number; y: number } | null = null;

      if (flow1 * flow2 > 0) {
        // Both walls have the same flow through junction:
        // Left connects to Left, Right connects to Right
        ptLeft = intersectLines(p1L, u1, p2L, u2);
        ptRight = intersectLines(p1R, u1, p2R, u2);
      } else {
        // Opposite flow:
        // Left connects to Right, Right connects to Left
        ptLeft = intersectLines(p1L, u1, p2R, u2);
        ptRight = intersectLines(p1R, u1, p2L, u2);
      }

      if (!ptLeft || !ptRight) return;

      // Clamp miter distance to avoid extreme spikes on needle-sharp angles
      const maxDist = Math.max(h1, h2) * 3;
      const clampPoint = (pt: { x: number; y: number }) => {
        const dist = Math.hypot(pt.x - j.x, pt.y - j.y);
        if (dist > maxDist) {
          return {
            x: j.x + ((pt.x - j.x) / dist) * maxDist,
            y: j.y + ((pt.y - j.y) / dist) * maxDist
          };
        }
        return pt;
      };

      ptLeft = clampPoint(ptLeft);
      ptRight = clampPoint(ptRight);

      // Assign to Wall 1
      if (c1.isStart) {
        m1.pStartLeft = ptLeft;
        m1.pStartRight = ptRight;
        m1.startIsMitered = true;
      } else {
        m1.pEndLeft = ptLeft;
        m1.pEndRight = ptRight;
        m1.endIsMitered = true;
      }

      // Assign to Wall 2
      if (flow1 * flow2 > 0) {
        if (c2.isStart) {
          m2.pStartLeft = ptLeft;
          m2.pStartRight = ptRight;
          m2.startIsMitered = true;
        } else {
          m2.pEndLeft = ptLeft;
          m2.pEndRight = ptRight;
          m2.endIsMitered = true;
        }
      } else {
        // Reversed flow: left/right swapped on wall 2
        if (c2.isStart) {
          m2.pStartLeft = ptRight;
          m2.pStartRight = ptLeft;
          m2.startIsMitered = true;
        } else {
          m2.pEndLeft = ptRight;
          m2.pEndRight = ptLeft;
          m2.endIsMitered = true;
        }
      }
    } else if (j.connections.length > 2) {
      // 3 or more walls meeting (T-junction, X-junction)
      j.connections.forEach((c) => {
        const m = result.get(c.wallId);
        if (!m) return;
        if (c.isStart) {
          m.startIsMitered = true;
        } else {
          m.endIsMitered = true;
        }
      });
    }
  });

  return result;
}
