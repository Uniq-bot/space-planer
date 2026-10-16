import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  FloorPlan,
  Wall,
  Opening,
  Room,
  ToolMode,
  ViewState
} from '../../types/floorplan';
import { ThemeColors } from '../../constants/themes';
import { FURNITURE_CATALOG } from '../../constants/catalog';
import {
  worldToScreen,
  screenToWorld,
  snapToGrid,
  snapAngle,
  pointToSegmentDistance,
  findClosestWall,
  snapToWallEndpoints,
  formatMeasurement
} from '../../utils/geometry';
import { drawCadSymbol } from './drawSymbols';
import { createFloorCanvasPattern, createWallCanvasPattern } from '../../utils/textures';
import { computeMiteredWalls } from '../../utils/wallMitering';

interface FloorCanvasProps {
  plan: FloorPlan;
  onUpdatePlan: (newPlan: FloorPlan) => void;
  tool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  selectedIds: string[];
  onSelectIds: (ids: string[], isToggle?: boolean) => void;
  theme: ThemeColors;
  viewState: ViewState;
  onUpdateViewState: (vs: ViewState | ((prev: ViewState) => ViewState)) => void;
}

export const FloorCanvas: React.FC<FloorCanvasProps> = ({
  plan,
  onUpdatePlan,
  tool,
  selectedIds,
  onSelectIds,
  theme,
  viewState,
  onUpdateViewState
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Smooth lerp state
  const targetViewRef = useRef<ViewState>(viewState);
  const currentViewRef = useRef<ViewState>(viewState);

  useEffect(() => {
    targetViewRef.current = viewState;
  }, [viewState]);

  // Interaction state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });

  // Hover detection
  const [hoveredItem, setHoveredItem] = useState<{
    id: string;
    type: 'wall' | 'opening' | 'symbol' | 'room' | 'rotHandle' | 'p1' | 'p2';
  } | null>(null);

  // Marquee Area Selection Box
  const [marqueeBox, setMarqueeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Touch tracking
  const touchStateRef = useRef<{
    initialDist: number;
    initialZoom: number;
    lastMid: { x: number; y: number };
    isPinching: boolean;
  }>({
    initialDist: 0,
    initialZoom: 1,
    lastMid: { x: 0, y: 0 },
    isPinching: false
  });

  // Spacebar temporary pan
  const [spacePressed, setSpacePressed] = useState(false);

  // Wall drawing state
  const [drawingWallStart, setDrawingWallStart] = useState<{ x: number; y: number } | null>(null);
  const wallChainOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [roomBoxStart, setRoomBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);

  // Multi-item dragging state
  const [draggingItems, setDraggingItems] = useState<{
    type: 'multi' | 'wall_p1' | 'wall_p2' | 'opening';
    id: string; // anchor item id
    startX: number;
    startY: number;
    origPositions: Record<string, { x: number; y: number; x1?: number; y1?: number; x2?: number; y2?: number }>;
  } | null>(null);

  // Rotating furniture
  const [isRotating, setIsRotating] = useState<{ id: string; startAngle: number; origRot: number } | null>(null);

  // Main Render Function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
   
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    console.log(ctx)
    if (!ctx) return;

    const vs = currentViewRef.current;
    const width = canvas.width;
    const height = canvas.height;

    // 1. Clear background
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Grid
    const gridSize = plan.metadata.grid_size || 50;
    const p1 = screenToWorld(0, 0, vs);
    const p2 = screenToWorld(width, height, vs);

    const startX = Math.floor(p1.x / gridSize) * gridSize;
    const endX = Math.ceil(p2.x / gridSize) * gridSize;
    const startY = Math.floor(p1.y / gridSize) * gridSize;
    const endY = Math.ceil(p2.y / gridSize) * gridSize;

    ctx.lineWidth = 1;
    for (let x = startX; x <= endX; x += gridSize) {
      const scr = worldToScreen(x, 0, vs);
      const isMajor = Math.round(x / gridSize) % 4 === 0;
      ctx.strokeStyle = isMajor ? theme.gridMajor : theme.grid;
      ctx.beginPath();
      ctx.moveTo(scr.x, 0);
      ctx.lineTo(scr.x, height);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridSize) {
      const scr = worldToScreen(0, y, vs);
      const isMajor = Math.round(y / gridSize) % 4 === 0;
      ctx.strokeStyle = isMajor ? theme.gridMajor : theme.grid;
      ctx.beginPath();
      ctx.moveTo(0, scr.y);
      ctx.lineTo(width, scr.y);
      ctx.stroke();
    }

    // 3. Draw Room Floor Textures & Labels
    plan.rooms.forEach((room) => {
      const scr = worldToScreen(room.x, room.y, vs);
      const isSel = selectedIds.includes(room.id);
      const isHov = hoveredItem?.id === room.id;

      ctx.save();

      // Render floor texture patch
      const floorMat = room.floorMaterial || 'oak_wood';
      const patCanvas = createFloorCanvasPattern(floorMat);
      const pat = ctx.createPattern(patCanvas, 'repeat');
      if (pat) {
        ctx.save();
        ctx.globalAlpha = isSel ? 0.45 : isHov ? 0.35 : theme.name === 'dark' ? 0.3 : 0.22;
        ctx.fillStyle = pat;

        let rw = 0;
        let rh = 0;
        if (room.width && room.height) {
          // Fit cleanly inside walls (thickness 15cm)
          rw = Math.max(20, room.width - 15) * vs.zoom;
          rh = Math.max(20, room.height - 15) * vs.zoom;
        } else {
          // Find enclosing walls around room.x, room.y
          let leftDist = Infinity;
          let rightDist = Infinity;
          let topDist = Infinity;
          let bottomDist = Infinity;

          plan.walls.forEach((w) => {
            const minX = Math.min(w.x1, w.x2);
            const maxX = Math.max(w.x1, w.x2);
            const minY = Math.min(w.y1, w.y2);
            const maxY = Math.max(w.y1, w.y2);

            // Vertical wall
            if (Math.abs(w.x2 - w.x1) < 8 && minY - 10 <= room.y && room.y <= maxY + 10) {
              if (w.x1 < room.x && room.x - w.x1 < leftDist) leftDist = room.x - w.x1;
              if (w.x1 > room.x && w.x1 - room.x < rightDist) rightDist = w.x1 - room.x;
            }
            // Horizontal wall
            if (Math.abs(w.y2 - w.y1) < 8 && minX - 10 <= room.x && room.x <= maxX + 10) {
              if (w.y1 < room.y && room.y - w.y1 < topDist) topDist = room.y - w.y1;
              if (w.y1 > room.y && w.y1 - room.y < bottomDist) bottomDist = w.y1 - room.y;
            }
          });

          if (leftDist < 1200 && rightDist < 1200 && topDist < 1200 && bottomDist < 1200) {
            rw = Math.max(20, (leftDist + rightDist) - 15) * vs.zoom;
            rh = Math.max(20, (topDist + bottomDist) - 15) * vs.zoom;
          } else if (room.area) {
            const side = Math.sqrt(room.area) * 100;
            rw = Math.max(20, side - 15) * vs.zoom;
            rh = Math.max(20, side - 15) * vs.zoom;
          } else {
            rw = 280 * vs.zoom;
            rh = 240 * vs.zoom;
          }
        }

        ctx.beginPath();
        ctx.roundRect(scr.x - rw / 2, scr.y - rh / 2, rw, rh, 4);
        ctx.fill();

        if (isSel || isHov) {
          ctx.strokeStyle = isSel ? theme.accent : 'rgba(37, 99, 235, 0.5)';
          ctx.lineWidth = isSel ? 2 : 1.5;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }

      // Room Name & Area Badge Pill
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 13px Inter, system-ui, sans-serif';
      const text = room.name;
      const metrics = ctx.measureText(text);
      const pillW = metrics.width + 28;
      const pillH = room.area ? 42 : 28;

      ctx.fillStyle = isSel ? theme.wallFillSel : isHov ? theme.accentFaint : theme.uiBg;
      ctx.strokeStyle = isSel ? theme.accent : isHov ? theme.accent : theme.uiBorder;
      ctx.lineWidth = isSel ? 2 : 1;

      ctx.beginPath();
      ctx.roundRect(scr.x - pillW / 2, scr.y - pillH / 2, pillW, pillH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSel ? theme.accentText : theme.uiText;
      ctx.fillText(text, scr.x, room.area ? scr.y - 7 : scr.y);

      if (room.area) {
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.fillStyle = theme.uiMuted;
        ctx.fillText(`${room.area.toFixed(1)} m²`, scr.x, scr.y + 10);
      }

      ctx.restore();
    });

    // 4. Draw Walls with Textures, Precision Mitered Corners & Seamless Joints
    const miteredMap = computeMiteredWalls(plan.walls);

    plan.walls.forEach((wall) => {
      const isSel = selectedIds.includes(wall.id);
      const isHov = hoveredItem?.id === wall.id;
      const miter = miteredMap.get(wall.id);

      const pA = worldToScreen(wall.x1, wall.y1, vs);
      const pB = worldToScreen(wall.x2, wall.y2, vs);

      // 4 corner vertices in screen coordinates
      const pSL = worldToScreen(miter ? miter.pStartLeft.x : wall.x1, miter ? miter.pStartLeft.y : wall.y1, vs);
      const pEL = worldToScreen(miter ? miter.pEndLeft.x : wall.x2, miter ? miter.pEndLeft.y : wall.y2, vs);
      const pER = worldToScreen(miter ? miter.pEndRight.x : wall.x2, miter ? miter.pEndRight.y : wall.y2, vs);
      const pSR = worldToScreen(miter ? miter.pStartRight.x : wall.x1, miter ? miter.pStartRight.y : wall.y1, vs);

      ctx.save();
      // Draw seamless mitered wall body
      ctx.beginPath();
      ctx.moveTo(pSL.x, pSL.y);
      ctx.lineTo(pEL.x, pEL.y);
      ctx.lineTo(pER.x, pER.y);
      ctx.lineTo(pSR.x, pSR.y);
      ctx.closePath();

      if (isSel) {
        ctx.fillStyle = theme.wallFillSel;
        ctx.fill();
      } else if (isHov) {
        ctx.fillStyle = theme.accentFaint;
        ctx.fill();
      } else if (wall.material && wall.material !== 'clean_white') {
        const wallPatCanvas = createWallCanvasPattern(wall.material);
        const wallPat = ctx.createPattern(wallPatCanvas, 'repeat');
        if (wallPat) {
          ctx.fillStyle = wallPat;
          ctx.fill();
        } else {
          ctx.fillStyle = theme.wallFill;
          ctx.fill();
        }
      } else {
        ctx.fillStyle = theme.wallFill;
        ctx.fill();
      }

      // Stroke outer boundaries cleanly
      ctx.strokeStyle = isSel ? theme.wallSel : isHov ? theme.accent : theme.wall;
      ctx.lineWidth = isSel ? 2.5 : isHov ? 2 : 1.5;
      ctx.lineJoin = 'miter';

      // Left boundary (continuous across corner miters)
      ctx.beginPath();
      ctx.moveTo(pSL.x, pSL.y);
      ctx.lineTo(pEL.x, pEL.y);
      ctx.stroke();

      // Right boundary (continuous across corner miters)
      ctx.beginPath();
      ctx.moveTo(pSR.x, pSR.y);
      ctx.lineTo(pER.x, pER.y);
      ctx.stroke();

      // Stroke perpendicular endcaps ONLY if free ends (not connected to other walls)
      if (!miter || !miter.startIsMitered) {
        ctx.beginPath();
        ctx.moveTo(pSL.x, pSL.y);
        ctx.lineTo(pSR.x, pSR.y);
        ctx.stroke();
      }
      if (!miter || !miter.endIsMitered) {
        ctx.beginPath();
        ctx.moveTo(pEL.x, pEL.y);
        ctx.lineTo(pER.x, pER.y);
        ctx.stroke();
      }

      // Dimension line
      const wallLenCm = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
      if (wallLenCm > 40 && vs.zoom > 0.4) {
        const midX = (pA.x + pB.x) / 2;
        const midY = (pA.y + pB.y) / 2;
        const dx = pB.x - pA.x;
        const dy = pB.y - pA.y;
        const len = Math.hypot(dx, dy) || 1;
        const halfT = ((wall.thickness || 15) * vs.zoom) / 2;
        const nx = (-dy / len) * halfT;
        const ny = (dx / len) * halfT;

        const badgeX = midX + nx * 1.6;
        const badgeY = midY + ny * 1.6;

        ctx.font = '500 11px "JetBrains Mono", monospace';
        const dimStr = formatMeasurement(wallLenCm, plan.metadata.units);
        const m = ctx.measureText(dimStr);

        ctx.fillStyle = theme.paper;
        ctx.fillRect(badgeX - m.width / 2 - 4, badgeY - 7, m.width + 8, 14);

        ctx.fillStyle = isSel ? theme.wallSel : theme.muted;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dimStr, badgeX, badgeY);
      }

      // Endpoint handles
      if (isSel) {
        ctx.fillStyle = theme.wallSel;
        ctx.beginPath();
        ctx.arc(pA.x, pA.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pB.x, pB.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // 5. Draw Openings (Doors & Windows)
    plan.openings.forEach((op) => {
      const hostWall = plan.walls.find((w) => w.id === op.wall_id);
      if (!hostWall) return;

      const isSel = selectedIds.includes(op.id);
      const isHov = hoveredItem?.id === op.id;

      const wx1 = hostWall.x1;
      const wy1 = hostWall.y1;
      const wx2 = hostWall.x2;
      const wy2 = hostWall.y2;
      const wdx = wx2 - wx1;
      const wdy = wy2 - wy1;
      const wallLen = Math.hypot(wdx, wdy) || 1;

      const uX = wdx / wallLen;
      const uY = wdy / wallLen;
      const nX = -uY;
      const nY = uX;

      const centerWorldX = wx1 + uX * (wallLen * op.position);
      const centerWorldY = wy1 + uY * (wallLen * op.position);

      const halfW = (op.width || 90) / 2;
      const p1World = { x: centerWorldX - uX * halfW, y: centerWorldY - uY * halfW };
      const p2World = { x: centerWorldX + uX * halfW, y: centerWorldY + uY * halfW };

      const scrP1 = worldToScreen(p1World.x, p1World.y, vs);
      const scrP2 = worldToScreen(p2World.x, p2World.y, vs);
      const scrCenter = worldToScreen(centerWorldX, centerWorldY, vs);

      const scrThickness = (hostWall.thickness || 15) * vs.zoom;
      const halfT = scrThickness / 2;

      ctx.save();

      // Cutout wall segment
      ctx.fillStyle = theme.paper;
      ctx.beginPath();
      ctx.moveTo(scrP1.x + nX * halfT, scrP1.y + nY * halfT);
      ctx.lineTo(scrP2.x + nX * halfT, scrP2.y + nY * halfT);
      ctx.lineTo(scrP2.x - nX * halfT, scrP2.y - nY * halfT);
      ctx.lineTo(scrP1.x - nX * halfT, scrP1.y - nY * halfT);
      ctx.closePath();
      ctx.fill();

      // Frame jambs
      ctx.strokeStyle = isSel || isHov ? theme.accent : theme.wall;
      ctx.lineWidth = isSel || isHov ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(scrP1.x + nX * halfT, scrP1.y + nY * halfT);
      ctx.lineTo(scrP1.x - nX * halfT, scrP1.y - nY * halfT);
      ctx.moveTo(scrP2.x + nX * halfT, scrP2.y + nY * halfT);
      ctx.lineTo(scrP2.x - nX * halfT, scrP2.y - nY * halfT);
      ctx.stroke();

      if (op.type === 'door') {
        const swingRad = op.width * vs.zoom;
        const hinge = op.swing === 'right' ? scrP2 : scrP1;
        const wallAngle = Math.atan2(wdy, wdx);
        const sign = op.swing === 'right' ? -1 : 1;
        const swingAngle = wallAngle + (sign * Math.PI) / 2;

        ctx.strokeStyle = isSel || isHov ? theme.accent : theme.doorSwing;
        ctx.lineWidth = isSel || isHov ? 2 : 1.25;
        ctx.beginPath();
        if (op.swing === 'right') {
          ctx.arc(hinge.x, hinge.y, swingRad, wallAngle + Math.PI, swingAngle, true);
        } else {
          ctx.arc(hinge.x, hinge.y, swingRad, wallAngle, swingAngle, false);
        }
        ctx.stroke();

        ctx.lineWidth = isSel || isHov ? 2.5 : 2;
        ctx.beginPath();
        ctx.moveTo(hinge.x, hinge.y);
        ctx.lineTo(hinge.x + Math.cos(swingAngle) * swingRad, hinge.y + Math.sin(swingAngle) * swingRad);
        ctx.stroke();
      } else {
        ctx.strokeStyle = isSel || isHov ? theme.accent : theme.windowGlass;
        ctx.lineWidth = isSel || isHov ? 2.5 : 2;
        const gOffset = halfT * 0.35;
        ctx.beginPath();
        ctx.moveTo(scrP1.x + nX * gOffset, scrP1.y + nY * gOffset);
        ctx.lineTo(scrP2.x + nX * gOffset, scrP2.y + nY * gOffset);
        ctx.moveTo(scrP1.x - nX * gOffset, scrP1.y - nY * gOffset);
        ctx.lineTo(scrP2.x - nX * gOffset, scrP2.y - nY * gOffset);
        ctx.stroke();

        if (op.mullion_cols && op.mullion_cols > 1) {
          ctx.beginPath();
          ctx.moveTo(scrCenter.x + nX * halfT, scrCenter.y + nY * halfT);
          ctx.lineTo(scrCenter.x - nX * halfT, scrCenter.y - nY * halfT);
          ctx.stroke();
        }
      }

      ctx.restore();
    });

    // 6. Draw Furniture / Symbols
    plan.symbols.forEach((sym) => {
      const isSel = selectedIds.includes(sym.id);
      const isHov = hoveredItem?.id === sym.id;
      const scr = worldToScreen(sym.x, sym.y, vs);
      const scrW = sym.width * vs.zoom;
      const scrD = sym.depth * vs.zoom;

      ctx.save();
      ctx.translate(scr.x, scr.y);
      ctx.rotate(((sym.rotation || 0) * Math.PI) / 180);

      drawCadSymbol(ctx, sym.type, scrW, scrD, theme);

      // Hover glow outline
      if (isHov && !isSel) {
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(-scrW / 2 - 3, -scrD / 2 - 3, scrW + 6, scrD + 6);
        ctx.setLineDash([]);
      }

      // Selection transform controls
      if (isSel) {
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(-scrW / 2 - 4, -scrD / 2 - 4, scrW + 8, scrD + 8);
        ctx.setLineDash([]);

        // Rotation stalk handle (only show individual rotate stalk when single piece selected)
        if (selectedIds.length === 1) {
          const rotHandleDist = scrD / 2 + 20;
          ctx.beginPath();
          ctx.moveTo(0, -scrD / 2 - 4);
          ctx.lineTo(0, -rotHandleDist);
          ctx.stroke();

          ctx.fillStyle = theme.accent;
          ctx.beginPath();
          ctx.arc(0, -rotHandleDist, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // 4 corner handles
        const handles = [
          [-scrW / 2 - 4, -scrD / 2 - 4],
          [scrW / 2 + 4, -scrD / 2 - 4],
          [scrW / 2 + 4, scrD / 2 + 4],
          [-scrW / 2 - 4, scrD / 2 + 4]
        ];
        ctx.fillStyle = theme.paper;
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1.5;
        handles.forEach(([hx, hy]) => {
          ctx.fillRect(hx - 3, hy - 3, 6, 6);
          ctx.strokeRect(hx - 3, hy - 3, 6, 6);
        });
      }

      ctx.restore();
    });

    // 7. Marquee Area Selection Box
    if (marqueeBox) {
      const pStart = worldToScreen(marqueeBox.x1, marqueeBox.y1, vs);
      const pEnd = worldToScreen(marqueeBox.x2, marqueeBox.y2, vs);

      const mx = Math.min(pStart.x, pEnd.x);
      const my = Math.min(pStart.y, pEnd.y);
      const mw = Math.abs(pEnd.x - pStart.x);
      const mh = Math.abs(pEnd.y - pStart.y);

      ctx.save();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
      ctx.fillRect(mx, my, mw, mh);

      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(mx, my, mw, mh);
      ctx.restore();
    }

    // 8. Active Drawing Previews
    if (drawingWallStart && tool === 'wall') {
      const scrStart = worldToScreen(drawingWallStart.x, drawingWallStart.y, vs);

      // Prioritize snapping directly to existing endpoints
      const snap = snapToWallEndpoints(mouseWorld.x, mouseWorld.y, plan.walls, 25);
      let targetX = mouseWorld.x;
      let targetY = mouseWorld.y;
      let isEndpointSnap = false;

      if (snap.snapped) {
        targetX = snap.x;
        targetY = snap.y;
        isEndpointSnap = true;
      } else {
        const snapped = snapAngle(drawingWallStart.x, drawingWallStart.y, mouseWorld.x, mouseWorld.y);
        targetX = snapToGrid(snapped.x, 25);
        targetY = snapToGrid(snapped.y, 25);
      }

      const scrEnd = worldToScreen(targetX, targetY, vs);

      ctx.save();
      ctx.strokeStyle = isEndpointSnap ? '#10b981' : theme.accent;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(scrStart.x, scrStart.y);
      ctx.lineTo(scrEnd.x, scrEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const distCm = Math.hypot(targetX - drawingWallStart.x, targetY - drawingWallStart.y);
      const midX = (scrStart.x + scrEnd.x) / 2;
      const midY = (scrStart.y + scrEnd.y) / 2 - 16;

      const angleDeg = Math.round((Math.atan2(targetY - drawingWallStart.y, targetX - drawingWallStart.x) * 180) / Math.PI);
      const normAngle = (angleDeg + 360) % 360;
      const badgeStr = `${formatMeasurement(distCm, plan.metadata.units)} (${normAngle}°)`;
      ctx.font = '600 12px "JetBrains Mono", monospace';
      const m = ctx.measureText(badgeStr);

      ctx.fillStyle = isEndpointSnap ? '#10b981' : theme.accent;
      ctx.beginPath();
      ctx.roundRect(midX - m.width / 2 - 6, midY - 10, m.width + 12, 20, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeStr, midX, midY);

      // Snap to Corner Visual Target Ring
      if (isEndpointSnap) {
        ctx.strokeStyle = '#10b981';
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(scrEnd.x, scrEnd.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '600 11px Inter, system-ui, sans-serif';
        const isChainClose =
          wallChainOriginRef.current &&
          Math.hypot(targetX - wallChainOriginRef.current.x, targetY - wallChainOriginRef.current.y) < 5;
        const snapLabel = isChainClose ? 'Close Loop (Join Room)' : 'Snap & Join Corner';
        const sm = ctx.measureText(snapLabel);

        ctx.fillStyle = theme.uiBg;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(scrEnd.x - sm.width / 2 - 6, scrEnd.y - 34, sm.width + 12, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(snapLabel, scrEnd.x, scrEnd.y - 24);
      }

      ctx.restore();
    }

    if (roomBoxStart && tool === 'room') {
      const scrStart = worldToScreen(roomBoxStart.x, roomBoxStart.y, vs);
      const scrEnd = worldToScreen(mouseWorld.x, mouseWorld.y, vs);

      const rx = Math.min(scrStart.x, scrEnd.x);
      const ry = Math.min(scrStart.y, scrEnd.y);
      const rw = Math.abs(scrEnd.x - scrStart.x);
      const rh = Math.abs(scrEnd.y - scrStart.y);

      ctx.save();
      ctx.fillStyle = theme.accentFaint;
      ctx.fillRect(rx, ry, rw, rh);

      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(rx, ry, rw, rh);

      const wCm = Math.abs(mouseWorld.x - roomBoxStart.x);
      const hCm = Math.abs(mouseWorld.y - roomBoxStart.y);
      const areaM2 = (wCm * hCm) / 10000;

      const infoStr = `${formatMeasurement(wCm, plan.metadata.units)} × ${formatMeasurement(hCm, plan.metadata.units)} (${areaM2.toFixed(1)} m²)`;
      ctx.font = '600 12px "JetBrains Mono", monospace';
      const m = ctx.measureText(infoStr);

      ctx.fillStyle = theme.accent;
      ctx.roundRect(rx + rw / 2 - m.width / 2 - 6, ry + rh / 2 - 10, m.width + 12, 20, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(infoStr, rx + rw / 2, ry + rh / 2);
      ctx.restore();
    }

    if ((tool === 'door' || tool === 'window') && !draggingItems) {
      const closest = findClosestWall(plan.walls, mouseWorld.x, mouseWorld.y, 40);
      if (closest) {
        const scr = worldToScreen(closest.projX, closest.projY, vs);
        ctx.save();
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '600 11px Inter, system-ui, sans-serif';
        const label = tool === 'door' ? 'Click to place Door' : 'Click to place Window';
        const m = ctx.measureText(label);
        ctx.fillStyle = theme.uiBg;
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1;
        ctx.roundRect(scr.x - m.width / 2 - 6, scr.y - 28, m.width + 12, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = theme.accentText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, scr.x, scr.y - 18);
        ctx.restore();
      }
    }

    if (measureStart && tool === 'measure') {
      const scrA = worldToScreen(measureStart.x, measureStart.y, vs);
      const scrB = worldToScreen(mouseWorld.x, mouseWorld.y, vs);

      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(scrA.x, scrA.y);
      ctx.lineTo(scrB.x, scrB.y);
      ctx.stroke();

      const dist = Math.hypot(mouseWorld.x - measureStart.x, mouseWorld.y - measureStart.y);
      const midX = (scrA.x + scrB.x) / 2;
      const midY = (scrA.y + scrB.y) / 2 - 14;

      const str = formatMeasurement(dist, plan.metadata.units);
      ctx.font = '700 12px "JetBrains Mono", monospace';
      const m = ctx.measureText(str);

      ctx.fillStyle = theme.accent;
      ctx.roundRect(midX - m.width / 2 - 6, midY - 10, m.width + 12, 20, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(str, midX, midY);
      ctx.restore();
    }
  }, [
    plan,
    theme,
    selectedIds,
    hoveredItem,
    marqueeBox,
    tool,
    drawingWallStart,
    roomBoxStart,
    measureStart,
    mouseWorld,
    draggingItems
  ]);

  // Smooth 60fps lerp loop
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const cur = currentViewRef.current;
      const tgt = targetViewRef.current;

      const dPanX = (tgt.panX - cur.panX) * 0.22;
      const dPanY = (tgt.panY - cur.panY) * 0.22;
      const dZoom = (tgt.zoom - cur.zoom) * 0.22;

      if (Math.abs(dPanX) > 0.01 || Math.abs(dPanY) > 0.01 || Math.abs(dZoom) > 0.0005) {
        currentViewRef.current = {
          panX: cur.panX + dPanX,
          panY: cur.panY + dPanY,
          zoom: cur.zoom + dZoom
        };
        render();
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  // ResizeObserver for instant browser resizing
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);

      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        render();
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [render]);

  useEffect(() => {
    render();
  }, [render]);

  // Smooth wheel & trackpad gestures
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      onUpdateViewState((prev) => {
        const newZoom = Math.max(0.15, Math.min(4.0, prev.zoom * zoomFactor));
        const newPanX = mouseX - (mouseX - prev.panX) * (newZoom / prev.zoom);
        const newPanY = mouseY - (mouseY - prev.panY) * (newZoom / prev.zoom);
        return { panX: newPanX, panY: newPanY, zoom: newZoom };
      });
    } else if (Math.abs(e.deltaX) > 0 && Math.abs(e.deltaY) < 40) {
      onUpdateViewState((prev) => ({
        ...prev,
        panX: prev.panX - e.deltaX * 1.2,
        panY: prev.panY - e.deltaY * 1.2
      }));
    } else {
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      onUpdateViewState((prev) => {
        const newZoom = Math.max(0.15, Math.min(4.0, prev.zoom * zoomFactor));
        const newPanX = mouseX - (mouseX - prev.panX) * (newZoom / prev.zoom);
        const newPanY = mouseY - (mouseY - prev.panY) * (newZoom / prev.zoom);
        return { panX: newPanX, panY: newPanY, zoom: newZoom };
      });
    }
  };

  // Touch Support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const mid = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };

      touchStateRef.current = {
        initialDist: dist,
        initialZoom: targetViewRef.current.zoom,
        lastMid: mid,
        isPinching: true
      };
    } else if (e.touches.length === 1 && (tool === 'pan' || spacePressed)) {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStateRef.current.isPinching) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const mid = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const centerX = mid.x - rect.left;
      const centerY = mid.y - rect.top;

      const scale = dist / (touchStateRef.current.initialDist || 1);
      const newZoom = Math.max(0.15, Math.min(4.0, touchStateRef.current.initialZoom * scale));

      const dMidX = mid.x - touchStateRef.current.lastMid.x;
      const dMidY = mid.y - touchStateRef.current.lastMid.y;
      touchStateRef.current.lastMid = mid;

      onUpdateViewState((prev) => {
        const newPanX = centerX - (centerX - prev.panX) * (newZoom / prev.zoom) + dMidX;
        const newPanY = centerY - (centerY - prev.panY) * (newZoom / prev.zoom) + dMidY;
        return { panX: newPanX, panY: newPanY, zoom: newZoom };
      });
    } else if (e.touches.length === 1 && isPanning) {
      const t = e.touches[0];
      const dx = t.clientX - panStart.x;
      const dy = t.clientY - panStart.y;
      onUpdateViewState((prev) => ({
        ...prev,
        panX: prev.panX + dx,
        panY: prev.panY + dy
      }));
      setPanStart({ x: t.clientX, y: t.clientY });
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current.isPinching = false;
    setIsPanning(false);
  };

  // Helper to start multi-item dragging
  const startDragSelected = (clickedId: string, worldX: number, worldY: number, activeSelected: string[]) => {
    const origs: Record<string, { x: number; y: number; x1?: number; y1?: number; x2?: number; y2?: number }> = {};
    activeSelected.forEach((id) => {
      const sym = plan.symbols.find((s) => s.id === id);
      if (sym) origs[id] = { x: sym.x, y: sym.y };

      const wall = plan.walls.find((w) => w.id === id);
      if (wall) origs[id] = { x: 0, y: 0, x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 };

      const room = plan.rooms.find((r) => r.id === id);
      if (room) origs[id] = { x: room.x, y: room.y };
    });

    setDraggingItems({
      type: 'multi',
      id: clickedId,
      startX: worldX,
      startY: worldY,
      origPositions: origs
    });
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const world = screenToWorld(mouseX, mouseY, currentViewRef.current);
    const isShiftOrCtrl = e.shiftKey || e.ctrlKey || e.metaKey;

    if (tool === 'pan' || spacePressed || e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button !== 0) return;

    // SELECT TOOL: Supports Single & Multi-Selection
    if (tool === 'select') {
      // 1. Rotation handle of a selected piece
      if (selectedIds.length === 1) {
        const selSym = plan.symbols.find((s) => s.id === selectedIds[0]);
        if (selSym) {
          const scr = worldToScreen(selSym.x, selSym.y, currentViewRef.current);
          const rad = ((selSym.rotation || 0) * Math.PI) / 180;
          const rotDist = (selSym.depth * currentViewRef.current.zoom) / 2 + 20;
          const hX = scr.x + Math.sin(rad) * rotDist;
          const hY = scr.y - Math.cos(rad) * rotDist;

          if (Math.hypot(mouseX - hX, mouseY - hY) < 14) {
            setIsRotating({
              id: selSym.id,
              startAngle: Math.atan2(mouseY - scr.y, mouseX - scr.x),
              origRot: selSym.rotation || 0
            });
            return;
          }
        }
      }

      // 2. Check click on symbols/furniture
      for (let i = plan.symbols.length - 1; i >= 0; i--) {
        const sym = plan.symbols[i];
        const halfW = sym.width / 2;
        const halfD = sym.depth / 2;
        const rad = -((sym.rotation || 0) * Math.PI) / 180;
        const dx = world.x - sym.x;
        const dy = world.y - sym.y;
        const localX = Math.cos(rad) * dx - Math.sin(rad) * dy;
        const localY = Math.sin(rad) * dx + Math.cos(rad) * dy;

        if (Math.abs(localX) <= halfW + 4 && Math.abs(localY) <= halfD + 4) {
          if (isShiftOrCtrl) {
            onSelectIds([sym.id], true);
          } else {
            const nextSelected = selectedIds.includes(sym.id) ? selectedIds : [sym.id];
            if (!selectedIds.includes(sym.id)) {
              onSelectIds([sym.id], false);
            }
            startDragSelected(sym.id, world.x, world.y, nextSelected);
          }
          return;
        }
      }

      // 3. Check click on openings (doors / windows)
      for (const op of plan.openings) {
        const hostWall = plan.walls.find((w) => w.id === op.wall_id);
        if (!hostWall) continue;
        const opX = hostWall.x1 + (hostWall.x2 - hostWall.x1) * op.position;
        const opY = hostWall.y1 + (hostWall.y2 - hostWall.y1) * op.position;
        if (Math.hypot(world.x - opX, world.y - opY) < (op.width / 2 + 12)) {
          if (isShiftOrCtrl) {
            onSelectIds([op.id], true);
          } else {
            onSelectIds([op.id], false);
            setDraggingItems({
              type: 'opening',
              id: op.id,
              startX: world.x,
              startY: world.y,
              origPositions: { [op.id]: { x: op.position, y: 0 } }
            });
          }
          return;
        }
      }

      // 4. Check click on walls & endpoints
      for (const wall of plan.walls) {
        // Individual endpoint drag if single wall selected
        if (selectedIds.length === 1 && selectedIds[0] === wall.id) {
          if (Math.hypot(world.x - wall.x1, world.y - wall.y1) < 18) {
            setDraggingItems({
              type: 'wall_p1',
              id: wall.id,
              startX: world.x,
              startY: world.y,
              origPositions: { [wall.id]: { x: 0, y: 0, x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 } }
            });
            return;
          }
          if (Math.hypot(world.x - wall.x2, world.y - wall.y2) < 18) {
            setDraggingItems({
              type: 'wall_p2',
              id: wall.id,
              startX: world.x,
              startY: world.y,
              origPositions: { [wall.id]: { x: 0, y: 0, x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 } }
            });
            return;
          }
        }

        const closest = pointToSegmentDistance(world.x, world.y, wall.x1, wall.y1, wall.x2, wall.y2);
        if (closest.distance <= (wall.thickness || 15) / 2 + 12) {
          if (isShiftOrCtrl) {
            onSelectIds([wall.id], true);
          } else {
            const nextSelected = selectedIds.includes(wall.id) ? selectedIds : [wall.id];
            if (!selectedIds.includes(wall.id)) {
              onSelectIds([wall.id], false);
            }
            startDragSelected(wall.id, world.x, world.y, nextSelected);
          }
          return;
        }
      }

      // 5. Check click on rooms
      for (const room of plan.rooms) {
        const rw = room.area ? Math.sqrt(room.area) * 100 : 380;
        const rh = room.area ? Math.sqrt(room.area) * 100 : 340;
        const inFloor = Math.abs(world.x - room.x) <= rw / 2 && Math.abs(world.y - room.y) <= rh / 2;
        const inBadge = Math.hypot(world.x - room.x, world.y - room.y) < 40;

        if (inFloor || inBadge) {
          if (isShiftOrCtrl) {
            onSelectIds([room.id], true);
          } else {
            const nextSelected = selectedIds.includes(room.id) ? selectedIds : [room.id];
            if (!selectedIds.includes(room.id)) {
              onSelectIds([room.id], false);
            }
            startDragSelected(room.id, world.x, world.y, nextSelected);
          }
          return;
        }
      }

      // 6. Clicked on empty canvas: Start Marquee Area Selection Box
      if (!isShiftOrCtrl) {
        onSelectIds([]);
      }
      setMarqueeBox({ x1: world.x, y1: world.y, x2: world.x, y2: world.y });
      return;
    }

    // WALL TOOL
    if (tool === 'wall') {
      if (!drawingWallStart) {
        const snap = snapToWallEndpoints(world.x, world.y, plan.walls, 25);
        const startX = snap.snapped ? snap.x : snapToGrid(world.x, 25);
        const startY = snap.snapped ? snap.y : snapToGrid(world.y, 25);
        setDrawingWallStart({ x: startX, y: startY });
        wallChainOriginRef.current = { x: startX, y: startY };
      } else {
        const snap = snapToWallEndpoints(world.x, world.y, plan.walls, 25);
        let finalX = world.x;
        let finalY = world.y;
        let isClosingLoop = false;

        if (snap.snapped) {
          finalX = snap.x;
          finalY = snap.y;
          // Check if snapping back to the origin of this wall chain
          if (
            wallChainOriginRef.current &&
            Math.hypot(finalX - wallChainOriginRef.current.x, finalY - wallChainOriginRef.current.y) < 6
          ) {
            isClosingLoop = true;
          }
        } else {
          const snapped = snapAngle(drawingWallStart.x, drawingWallStart.y, world.x, world.y);
          finalX = snapToGrid(snapped.x, 25);
          finalY = snapToGrid(snapped.y, 25);
        }

        if (Math.hypot(finalX - drawingWallStart.x, finalY - drawingWallStart.y) > 20) {
          const newWall: Wall = {
            id: `wall_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            x1: drawingWallStart.x,
            y1: drawingWallStart.y,
            x2: finalX,
            y2: finalY,
            thickness: 15,
            height: 270,
            wallType: 'interior',
            material: 'clean_white'
          };
          onUpdatePlan({
            ...plan,
            walls: [...plan.walls, newWall]
          });

          if (isClosingLoop) {
            setDrawingWallStart(null);
            wallChainOriginRef.current = null;
          } else {
            setDrawingWallStart({ x: finalX, y: finalY });
          }
        }
      }
      return;
    }

    // ROOM TOOL
    if (tool === 'room') {
      if (!roomBoxStart) {
        setRoomBoxStart({ x: snapToGrid(world.x, 25), y: snapToGrid(world.y, 25) });
      } else {
        const x1 = roomBoxStart.x;
        const y1 = roomBoxStart.y;
        const x2 = snapToGrid(world.x, 25);
        const y2 = snapToGrid(world.y, 25);

        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        if (maxX - minX > 50 && maxY - minY > 50) {
          const stamp = Date.now();
          const w1: Wall = { id: `w_${stamp}_1`, x1: minX, y1: minY, x2: maxX, y2: minY, thickness: 15, height: 270, material: 'clean_white' };
          const w2: Wall = { id: `w_${stamp}_2`, x1: maxX, y1: minY, x2: maxX, y2: maxY, thickness: 15, height: 270, material: 'clean_white' };
          const w3: Wall = { id: `w_${stamp}_3`, x1: maxX, y1: maxY, x2: minX, y2: maxY, thickness: 15, height: 270, material: 'clean_white' };
          const w4: Wall = { id: `w_${stamp}_4`, x1: minX, y1: maxY, x2: minX, y2: minY, thickness: 15, height: 270, material: 'clean_white' };

          const roomW = maxX - minX;
          const roomH = maxY - minY;
          const newRoom: Room = {
            id: `room_${stamp}`,
            name: 'New Room',
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            width: roomW,
            height: roomH,
            area: (roomW * roomH) / 10000,
            floorMaterial: 'oak_wood' as const
          };

          onUpdatePlan({
            ...plan,
            walls: [...plan.walls, w1, w2, w3, w4],
            rooms: [...plan.rooms, newRoom]
          });
        }
        setRoomBoxStart(null);
      }
      return;
    }

    // DOOR / WINDOW TOOL
    if (tool === 'door' || tool === 'window') {
      const closest = findClosestWall(plan.walls, world.x, world.y, 40);
      if (closest) {
        const isDoor = tool === 'door';
        const newOpening: Opening = {
          id: `op_${Date.now()}`,
          wall_id: closest.wall.id,
          type: isDoor ? 'door' : 'window',
          position: Math.max(0.1, Math.min(0.9, closest.t)),
          width: isDoor ? 90 : 140,
          height: isDoor ? 210 : 130,
          sill_height: isDoor ? 0 : 90,
          swing: isDoor ? 'left' : 'none'
        };
        onUpdatePlan({
          ...plan,
          openings: [...plan.openings, newOpening]
        });
        onSelectIds([newOpening.id]);
      }
      return;
    }

    // MEASURE TOOL
    if (tool === 'measure') {
      if (!measureStart) {
        setMeasureStart({ x: world.x, y: world.y });
      } else {
        setMeasureStart(null);
      }
      return;
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const world = screenToWorld(mouseX, mouseY, currentViewRef.current);
    setMouseWorld(world);

    // Update Marquee Box
    if (marqueeBox) {
      setMarqueeBox((prev) => (prev ? { ...prev, x2: world.x, y2: world.y } : null));
      return;
    }

    // Panning canvas
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      onUpdateViewState((prev) => ({
        ...prev,
        panX: prev.panX + dx,
        panY: prev.panY + dy
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Rotating furniture
    if (isRotating) {
      const selSym = plan.symbols.find((s) => s.id === isRotating.id);
      if (selSym) {
        const scr = worldToScreen(selSym.x, selSym.y, currentViewRef.current);
        const currAngle = Math.atan2(mouseY - scr.y, mouseX - scr.x);
        let deltaDeg = ((currAngle - isRotating.startAngle) * 180) / Math.PI;
        let newRot = (isRotating.origRot + deltaDeg + 360) % 360;

        if (e.shiftKey) {
          newRot = Math.round(newRot / 15) * 15;
        }

        onUpdatePlan({
          ...plan,
          symbols: plan.symbols.map((s) => (s.id === selSym.id ? { ...s, rotation: Math.round(newRot) } : s))
        });
      }
      return;
    }

    // Dragging Items (Multi or Single)
    if (draggingItems) {
      const dx = world.x - draggingItems.startX;
      const dy = world.y - draggingItems.startY;

      if (draggingItems.type === 'multi') {
        const nextSymbols = plan.symbols.map((s) => {
          const orig = draggingItems.origPositions[s.id];
          if (!orig) return s;
          return {
            ...s,
            x: snapToGrid(orig.x + dx, 10),
            y: snapToGrid(orig.y + dy, 10)
          };
        });

        const nextWalls = plan.walls.map((w) => {
          const orig = draggingItems.origPositions[w.id];
          if (!orig || orig.x1 === undefined) return w;
          return {
            ...w,
            x1: snapToGrid(orig.x1 + dx, 10),
            y1: snapToGrid(orig.y1! + dy, 10),
            x2: snapToGrid(orig.x2! + dx, 10),
            y2: snapToGrid(orig.y2! + dy, 10)
          };
        });

        const nextRooms = plan.rooms.map((r) => {
          const orig = draggingItems.origPositions[r.id];
          if (!orig) return r;
          return {
            ...r,
            x: snapToGrid(orig.x + dx, 10),
            y: snapToGrid(orig.y + dy, 10)
          };
        });

        onUpdatePlan({
          ...plan,
          symbols: nextSymbols,
          walls: nextWalls,
          rooms: nextRooms
        });
      } else if (draggingItems.type === 'wall_p1') {
        const snapped = snapToWallEndpoints(world.x, world.y, plan.walls, 20, draggingItems.id);
        const finalX = snapped.snapped ? snapped.x : snapToGrid(world.x, 10);
        const finalY = snapped.snapped ? snapped.y : snapToGrid(world.y, 10);
        onUpdatePlan({
          ...plan,
          walls: plan.walls.map((w) => (w.id === draggingItems.id ? { ...w, x1: finalX, y1: finalY } : w))
        });
      } else if (draggingItems.type === 'wall_p2') {
        const snapped = snapToWallEndpoints(world.x, world.y, plan.walls, 20, draggingItems.id);
        const finalX = snapped.snapped ? snapped.x : snapToGrid(world.x, 10);
        const finalY = snapped.snapped ? snapped.y : snapToGrid(world.y, 10);
        onUpdatePlan({
          ...plan,
          walls: plan.walls.map((w) => (w.id === draggingItems.id ? { ...w, x2: finalX, y2: finalY } : w))
        });
      } else if (draggingItems.type === 'opening') {
        const op = plan.openings.find((o) => o.id === draggingItems.id);
        if (op) {
          const hostWall = plan.walls.find((w) => w.id === op.wall_id);
          if (hostWall) {
            const { t } = pointToSegmentDistance(world.x, world.y, hostWall.x1, hostWall.y1, hostWall.x2, hostWall.y2);
            onUpdatePlan({
              ...plan,
              openings: plan.openings.map((o) =>
                o.id === draggingItems.id ? { ...o, position: Math.max(0.08, Math.min(0.92, t)) } : o
              )
            });
          }
        }
      }
      return;
    }

    // Hover Detection
    if (tool === 'select') {
      if (selectedIds.length === 1) {
        const selSym = plan.symbols.find((s) => s.id === selectedIds[0]);
        if (selSym) {
          const scr = worldToScreen(selSym.x, selSym.y, currentViewRef.current);
          const rad = ((selSym.rotation || 0) * Math.PI) / 180;
          const rotDist = (selSym.depth * currentViewRef.current.zoom) / 2 + 20;
          const hX = scr.x + Math.sin(rad) * rotDist;
          const hY = scr.y - Math.cos(rad) * rotDist;
          if (Math.hypot(mouseX - hX, mouseY - hY) < 14) {
            setHoveredItem({ id: selSym.id, type: 'rotHandle' });
            return;
          }
        }
        const selWall = plan.walls.find((w) => w.id === selectedIds[0]);
        if (selWall) {
          if (Math.hypot(world.x - selWall.x1, world.y - selWall.y1) < 16) {
            setHoveredItem({ id: selWall.id, type: 'p1' });
            return;
          }
          if (Math.hypot(world.x - selWall.x2, world.y - selWall.y2) < 16) {
            setHoveredItem({ id: selWall.id, type: 'p2' });
            return;
          }
        }
      }

      for (let i = plan.symbols.length - 1; i >= 0; i--) {
        const sym = plan.symbols[i];
        const halfW = sym.width / 2;
        const halfD = sym.depth / 2;
        const rad = -((sym.rotation || 0) * Math.PI) / 180;
        const dx = world.x - sym.x;
        const dy = world.y - sym.y;
        const localX = Math.cos(rad) * dx - Math.sin(rad) * dy;
        const localY = Math.sin(rad) * dx + Math.cos(rad) * dy;
        if (Math.abs(localX) <= halfW + 4 && Math.abs(localY) <= halfD + 4) {
          setHoveredItem({ id: sym.id, type: 'symbol' });
          return;
        }
      }

      for (const op of plan.openings) {
        const hostWall = plan.walls.find((w) => w.id === op.wall_id);
        if (!hostWall) continue;
        const opX = hostWall.x1 + (hostWall.x2 - hostWall.x1) * op.position;
        const opY = hostWall.y1 + (hostWall.y2 - hostWall.y1) * op.position;
        if (Math.hypot(world.x - opX, world.y - opY) < (op.width / 2 + 10)) {
          setHoveredItem({ id: op.id, type: 'opening' });
          return;
        }
      }

      for (const wall of plan.walls) {
        const closest = pointToSegmentDistance(world.x, world.y, wall.x1, wall.y1, wall.x2, wall.y2);
        if (closest.distance <= (wall.thickness || 15) / 2 + 10) {
          setHoveredItem({ id: wall.id, type: 'wall' });
          return;
        }
      }

      for (const room of plan.rooms) {
        const rw = room.area ? Math.sqrt(room.area) * 100 : 380;
        const rh = room.area ? Math.sqrt(room.area) * 100 : 340;
        const inFloor = Math.abs(world.x - room.x) <= rw / 2 && Math.abs(world.y - room.y) <= rh / 2;
        const inBadge = Math.hypot(world.x - room.x, world.y - room.y) < 36;
        if (inFloor || inBadge) {
          setHoveredItem({ id: room.id, type: 'room' });
          return;
        }
      }

      setHoveredItem(null);
    }
  };

  // Mouse Up: Marquee Area Multi-Select
  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    setDraggingItems(null);
    setIsRotating(null);

    if (marqueeBox) {
      const minX = Math.min(marqueeBox.x1, marqueeBox.x2);
      const maxX = Math.max(marqueeBox.x1, marqueeBox.x2);
      const minY = Math.min(marqueeBox.y1, marqueeBox.y2);
      const maxY = Math.max(marqueeBox.y1, marqueeBox.y2);

      if (maxX - minX > 8 || maxY - minY > 8) {
        const isInside = (x: number, y: number) => x >= minX && x <= maxX && y >= minY && y <= maxY;
        const newSelected: string[] = [];

        // All symbols inside or intersecting marquee
        plan.symbols.forEach((s) => {
          if (
            isInside(s.x, s.y) ||
            (s.x + s.width / 2 >= minX && s.x - s.width / 2 <= maxX && s.y + s.depth / 2 >= minY && s.y - s.depth / 2 <= maxY)
          ) {
            newSelected.push(s.id);
          }
        });

        // All walls inside or intersecting marquee
        plan.walls.forEach((w) => {
          if (isInside(w.x1, w.y1) || isInside(w.x2, w.y2)) {
            newSelected.push(w.id);
          }
        });

        // All rooms inside marquee
        plan.rooms.forEach((r) => {
          if (isInside(r.x, r.y)) {
            newSelected.push(r.id);
          }
        });

        if (e.shiftKey || e.ctrlKey) {
          const set = new Set(selectedIds);
          newSelected.forEach((id) => set.add(id));
          onSelectIds(Array.from(set));
        } else {
          onSelectIds(newSelected);
        }
      }

      setMarqueeBox(null);
    }
  };

  const handleDoubleClick = () => {
    setDrawingWallStart(null);
    wallChainOriginRef.current = null;
    setRoomBoxStart(null);
    setMeasureStart(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setDrawingWallStart(null);
    wallChainOriginRef.current = null;
    setRoomBoxStart(null);
    setMeasureStart(null);
  };

  // Drag and drop furniture
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/floorplan-furniture');
    if (!type) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const world = screenToWorld(mouseX, mouseY, currentViewRef.current);

    const catalogItem = FURNITURE_CATALOG.find((item) => item.type === type);
    const newSym = {
      id: `sym_${Date.now()}`,
      type,
      category: catalogItem?.category || 'living',
      x: snapToGrid(world.x, 25),
      y: snapToGrid(world.y, 25),
      width: catalogItem?.width || 100,
      depth: catalogItem?.depth || 60,
      height: catalogItem?.height || 80,
      rotation: 0
    };

    onUpdatePlan({
      ...plan,
      symbols: [...plan.symbols, newSym]
    });
    onSelectIds([newSym.id]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (tool === 'pan' || spacePressed) return 'grab';
    if (tool === 'wall' || tool === 'measure' || tool === 'room') return 'crosshair';

    if (tool === 'select') {
      if (isRotating) return 'grabbing';
      if (hoveredItem?.type === 'rotHandle') return 'grab';
      if (hoveredItem?.type === 'p1' || hoveredItem?.type === 'p2') return 'crosshair';
      if (hoveredItem?.type === 'symbol') return 'move';
      if (hoveredItem?.type === 'wall' || hoveredItem?.type === 'opening' || hoveredItem?.type === 'room') return 'pointer';
      return 'default';
    }

    return 'default';
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        cursor: getCursor()
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
      />
    </div>
  );
};
