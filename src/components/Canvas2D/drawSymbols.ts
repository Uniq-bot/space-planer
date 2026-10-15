import { ThemeColors } from '../../constants/themes';

// Helper: draw rounded rectangle
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 4
) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Helper: draw dining chair tucked around table perimeter
function drawTuckedChair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  chairW: number,
  chairD: number,
  angleRad: number,
  theme: ThemeColors
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);

  const hw = chairW / 2;
  const hd = chairD / 2;

  // Seat cushion
  roundRect(ctx, -hw, -hd, chairW, chairD, 3);
  ctx.fillStyle = theme.symbolFill;
  ctx.fill();
  ctx.strokeStyle = theme.symbolStroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Curved backrest at outer edge
  ctx.beginPath();
  ctx.moveTo(-hw + 2, hd);
  ctx.quadraticCurveTo(0, hd + 3, hw - 2, hd);
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.restore();
}

/**
 * High-fidelity 2D CAD architectural sprite renderer.
 * Accurately renders every furniture catalog item with standard CAD conventions,
 * clean lines, and responsive theme styling.
 */
export function drawCadSymbol(
  ctx: CanvasRenderingContext2D,
  type: string,
  w: number,
  d: number,
  theme: ThemeColors
) {
  ctx.save();
  ctx.fillStyle = theme.symbolFill;
  ctx.strokeStyle = theme.symbolStroke;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const hw = w / 2;
  const hd = d / 2;

  switch (type) {
    // ------------------------------------------------------------------------
    // 1. BEDS
    // ------------------------------------------------------------------------
    case 'bed_king':
    case 'bed_queen':
    case 'bed_single': {
      // Outer mattress & frame
      roundRect(ctx, -hw, -hd, w, d, 6);
      ctx.fill();
      ctx.stroke();

      // Headboard at the top (wall side)
      ctx.fillStyle = theme.symbolStroke;
      roundRect(ctx, -hw, -hd, w, 8, 2);
      ctx.fill();
      ctx.fillStyle = theme.symbolFill;

      // Folded duvet / comforter line
      const duvetY = -hd + d * 0.42;
      ctx.beginPath();
      ctx.moveTo(-hw + 6, duvetY);
      ctx.lineTo(hw - 6, duvetY);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Fold-over sheet cuff lip
      ctx.beginPath();
      ctx.moveTo(-hw + 8, duvetY + 8);
      ctx.lineTo(hw - 8, duvetY + 8);
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1.25;

      // Diagonal duvet tuck creases at foot of bed
      ctx.beginPath();
      ctx.moveTo(-hw + 14, hd - 6);
      ctx.lineTo(-hw + 26, hd - 18);
      ctx.moveTo(hw - 14, hd - 6);
      ctx.lineTo(hw - 26, hd - 18);
      ctx.lineWidth = 0.75;
      ctx.stroke();
      ctx.lineWidth = 1.25;

      // Sleeping Pillows
      const isSingle = type === 'bed_single';
      const pillowCount = isSingle ? 1 : 2;
      const pGap = 8;
      const pW = (w - (pillowCount + 1) * pGap) / pillowCount;
      const pD = Math.min(36, d * 0.22);

      for (let i = 0; i < pillowCount; i++) {
        const px = -hw + pGap + i * (pW + pGap);
        const py = -hd + 14;

        // Base pillow
        roundRect(ctx, px, py, pW, pD, 5);
        ctx.fillStyle = theme.paper;
        ctx.fill();
        ctx.stroke();

        // Accent sham pillow on top (for King & Queen)
        if (!isSingle) {
          const shamW = pW * 0.75;
          const shamD = pD * 0.65;
          roundRect(ctx, px + (pW - shamW) / 2, py + pD - shamD + 4, shamW, shamD, 3);
          ctx.fillStyle = theme.symbolFill;
          ctx.fill();
          ctx.stroke();
        }
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 2. NIGHTSTAND & BEDSIDE TABLE
    // ------------------------------------------------------------------------
    case 'nightstand': {
      // Table top surface
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      // Drawer front pull edge
      ctx.beginPath();
      ctx.moveTo(-hw + 4, hd - 6);
      ctx.lineTo(hw - 4, hd - 6);
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // Centered drawer knob
      ctx.beginPath();
      ctx.arc(0, hd - 6, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = theme.symbolStroke;
      ctx.fill();

      // Bedside table lamp (circle with inner bulb)
      const lampR = Math.min(hw, hd) * 0.42;
      ctx.beginPath();
      ctx.arc(0, -hd + lampR + 6, lampR, 0, Math.PI * 2);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -hd + lampR + 6, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = theme.symbolStroke;
      ctx.fill();
      break;
    }

    // ------------------------------------------------------------------------
    // 3. DRESSER & CHEST OF DRAWERS
    // ------------------------------------------------------------------------
    case 'dresser': {
      // Cabinet perimeter
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      // 3 Drawer horizontal partition lines
      const drawerCount = 3;
      const rowD = (d - 8) / drawerCount;
      for (let i = 1; i < drawerCount; i++) {
        const dy = -hd + 4 + i * rowD;
        ctx.beginPath();
        ctx.moveTo(-hw + 6, dy);
        ctx.lineTo(hw - 6, dy);
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }

      // Dual pull handles on each drawer
      for (let i = 0; i < drawerCount; i++) {
        const dy = -hd + 4 + i * rowD + rowD / 2;
        [-hw * 0.4, hw * 0.4].forEach((hx) => {
          roundRect(ctx, hx - 5, dy - 1.5, 10, 3, 1.5);
          ctx.fillStyle = theme.symbolStroke;
          ctx.fill();
        });
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 4. WARDROBE & CLOSET
    // ------------------------------------------------------------------------
    case 'wardrobe': {
      // Outer closet casing
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      // Sliding / bi-fold door split line down the center
      ctx.beginPath();
      ctx.moveTo(0, -hd);
      ctx.lineTo(0, hd);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Interior clothes hanging rail
      ctx.beginPath();
      ctx.moveTo(-hw + 8, 0);
      ctx.lineTo(hw - 8, 0);
      ctx.lineWidth = 0.75;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Top-down clothes hangers along rail
      const hangerCount = Math.max(3, Math.floor(w / 28));
      const hgSpacing = (w - 24) / (hangerCount + 1);
      ctx.lineWidth = 0.8;
      for (let i = 1; i <= hangerCount; i++) {
        const hx = -hw + 12 + i * hgSpacing;
        ctx.beginPath();
        ctx.moveTo(hx, -8);
        ctx.lineTo(hx - 6, 8);
        ctx.lineTo(hx + 6, 8);
        ctx.closePath();
        ctx.stroke();
      }

      // Vertical door handles on front
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-4, hd - 4);
      ctx.lineTo(-4, hd - 16);
      ctx.moveTo(4, hd - 4);
      ctx.lineTo(4, hd - 16);
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------------------
    // 5. SOFAS & ARMCHAIRS
    // ------------------------------------------------------------------------
    case 'sofa_3':
    case 'sofa_2':
    case 'armchair': {
      // Base frame
      roundRect(ctx, -hw, -hd, w, d, 8);
      ctx.fill();
      ctx.stroke();

      // Backrest
      const backD = d * 0.25;
      roundRect(ctx, -hw + 6, -hd + 4, w - 12, backD, 4);
      ctx.fill();
      ctx.stroke();

      // Left & right armrests
      const armW = Math.min(18, w * 0.16);
      roundRect(ctx, -hw + 4, -hd + 6, armW, d - 12, 4);
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, hw - armW - 4, -hd + 6, armW, d - 12, 4);
      ctx.fill();
      ctx.stroke();

      // Seat cushions
      const cushionCount = type === 'sofa_3' ? 3 : type === 'sofa_2' ? 2 : 1;
      const seatStartX = -hw + armW + 6;
      const seatW = (w - (armW * 2) - 16) / cushionCount;
      const seatD = d - backD - 14;
      for (let i = 0; i < cushionCount; i++) {
        const cx = seatStartX + i * seatW + 1;
        const cy = -hd + backD + 8;
        roundRect(ctx, cx, cy, seatW - 2, seatD, 4);
        ctx.fillStyle = theme.paper;
        ctx.fill();
        ctx.stroke();
      }

      // Cozy angled throw pillows in corners (for 2-seater and 3-seater)
      if (type !== 'armchair') {
        const pSize = Math.min(16, armW * 1.1);
        // Left throw pillow (rotated 25 deg)
        ctx.save();
        ctx.translate(-hw + armW + 8, -hd + backD + 8);
        ctx.rotate(0.4);
        roundRect(ctx, -pSize / 2, -pSize / 2, pSize, pSize, 3);
        ctx.fillStyle = theme.accent;
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Right throw pillow (rotated -25 deg)
        ctx.save();
        ctx.translate(hw - armW - 8, -hd + backD + 8);
        ctx.rotate(-0.4);
        roundRect(ctx, -pSize / 2, -pSize / 2, pSize, pSize, 3);
        ctx.fillStyle = theme.accent;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 6. COFFEE TABLE
    // ------------------------------------------------------------------------
    case 'table_coffee': {
      roundRect(ctx, -hw, -hd, w, d, 6);
      ctx.fill();
      ctx.stroke();

      // Beveled inner rim
      ctx.lineWidth = 0.75;
      roundRect(ctx, -hw + 4, -hd + 4, w - 8, d - 8, 3);
      ctx.stroke();

      // Tabletop coffee table art book / magazines
      ctx.lineWidth = 0.9;
      roundRect(ctx, -hw + 14, -hd + 10, w * 0.28, d * 0.45, 2);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.stroke();

      // Coaster / cup circle
      ctx.beginPath();
      ctx.arc(hw - 18, 0, 6, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------------------
    // 7. TV UNIT & MEDIA CONSOLE
    // ------------------------------------------------------------------------
    case 'tv_unit': {
      // Low media credenza
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      // Left & right storage cabinet divisions
      const sideSecW = w * 0.28;
      ctx.beginPath();
      ctx.moveTo(-hw + sideSecW, -hd);
      ctx.lineTo(-hw + sideSecW, hd);
      ctx.moveTo(hw - sideSecW, -hd);
      ctx.lineTo(hw - sideSecW, hd);
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // Ultra-thin OLED TV screen panel (centered line at back)
      const tvW = w * 0.82;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-tvW / 2, -hd + 5);
      ctx.lineTo(tvW / 2, -hd + 5);
      ctx.stroke();

      // TV stand foot plate
      ctx.lineWidth = 1;
      roundRect(ctx, -14, -hd + 3, 28, 6, 2);
      ctx.fillStyle = theme.symbolStroke;
      ctx.fill();

      // Slim soundbar speaker bar in front of TV
      const sbW = tvW * 0.6;
      roundRect(ctx, -sbW / 2, -hd + 14, sbW, 5, 2);
      ctx.fillStyle = theme.symbolStroke;
      ctx.fill();
      break;
    }

    // ------------------------------------------------------------------------
    // 8. BOOKCASE & SHELVING
    // ------------------------------------------------------------------------
    case 'bookcase': {
      roundRect(ctx, -hw, -hd, w, d, 3);
      ctx.fill();
      ctx.stroke();

      // Vertical partition uprights
      const uprightCount = 2;
      const colW = (w - 12) / (uprightCount + 1);
      for (let i = 1; i <= uprightCount; i++) {
        const ux = -hw + 6 + i * colW;
        ctx.beginPath();
        ctx.moveTo(ux, -hd);
        ctx.lineTo(ux, hd);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Rows of books viewed from above (alternating thicknesses)
      let bx = -hw + 6;
      ctx.lineWidth = 0.75;
      while (bx < hw - 8) {
        const bW = 4 + ((Math.abs(Math.sin(bx)) * 10) % 5);
        const bD = d * (0.65 + (Math.abs(Math.cos(bx)) * 0.25));
        roundRect(ctx, bx, -hd + 2, bW, bD, 1);
        ctx.fillStyle = theme.paper;
        ctx.fill();
        ctx.stroke();
        bx += bW + 2;
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 9. DINING TABLES (RECTANGULAR & ROUND)
    // ------------------------------------------------------------------------
    case 'table_dining_6':
    case 'table_dining_4': {
      // Dining table top
      roundRect(ctx, -hw, -hd, w, d, 6);
      ctx.fill();
      ctx.stroke();

      // Subtle inner rim line
      ctx.lineWidth = 0.75;
      roundRect(ctx, -hw + 4, -hd + 4, w - 8, d - 8, 3);
      ctx.stroke();

      const chairsPerRow = type === 'table_dining_6' ? 3 : 2;
      const spacing = w / (chairsPerRow + 1);
      const chairW = Math.min(36, spacing * 0.78);
      const chairD = 28;

      // Draw tucked chairs along top and bottom edges
      for (let i = 1; i <= chairsPerRow; i++) {
        const cx = -hw + i * spacing;

        // Top chair (facing down towards table)
        drawTuckedChair(ctx, cx, -hd - chairD / 2 + 6, chairW, chairD, Math.PI, theme);

        // Bottom chair (facing up towards table)
        drawTuckedChair(ctx, cx, hd + chairD / 2 - 6, chairW, chairD, 0, theme);

        // Place settings: dinner plate & smaller bread plate
        ctx.beginPath();
        ctx.arc(cx, -hd + 16, 7, 0, Math.PI * 2);
        ctx.fillStyle = theme.paper;
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, hd - 16, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'table_round_6': {
      const r = Math.min(hw, hd);

      // 6 Tucked chairs arranged radially
      const chairW = 32;
      const chairD = 26;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const cx = Math.cos(angle) * (r + chairD / 2 - 6);
        const cy = Math.sin(angle) * (r + chairD / 2 - 6);
        drawTuckedChair(ctx, cx, cy, chairW, chairD, angle - Math.PI / 2, theme);
      }

      // Circular table top
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = theme.symbolFill;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center decorative bowl / lazy susan
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // 6 Plates around circumference
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = Math.cos(angle) * (r - 16);
        const py = Math.sin(angle) * (r - 16);
        ctx.beginPath();
        ctx.arc(px, py, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = theme.paper;
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 10. DINING CHAIR (INDIVIDUAL)
    // ------------------------------------------------------------------------
    case 'chair': {
      // Seat cushion
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      // Curved slatted backrest at top
      ctx.beginPath();
      ctx.moveTo(-hw + 3, -hd + 6);
      ctx.quadraticCurveTo(0, -hd + 2, hw - 3, -hd + 6);
      ctx.lineWidth = 3;
      ctx.stroke();

      // Backrest support struts
      ctx.lineWidth = 1;
      [-hw * 0.4, 0, hw * 0.4].forEach((sx) => {
        ctx.beginPath();
        ctx.moveTo(sx, -hd + 4);
        ctx.lineTo(sx, -hd + 12);
        ctx.stroke();
      });
      break;
    }

    // ------------------------------------------------------------------------
    // 11. SIDEBOARD & BUFFET CREDENZA
    // ------------------------------------------------------------------------
    case 'sideboard': {
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      // 4 cabinet sections
      const secCount = 4;
      const secW = (w - 8) / secCount;
      for (let i = 1; i < secCount; i++) {
        const sx = -hw + 4 + i * secW;
        ctx.beginPath();
        ctx.moveTo(sx, -hd + 2);
        ctx.lineTo(sx, hd - 2);
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }

      // Modern horizontal bar handles
      for (let i = 0; i < secCount; i++) {
        const sx = -hw + 4 + i * secW + secW / 2;
        roundRect(ctx, sx - 6, hd - 6, 12, 2.5, 1);
        ctx.fillStyle = theme.symbolStroke;
        ctx.fill();
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 12. KITCHEN COUNTER & SINK
    // ------------------------------------------------------------------------
    case 'counter':
    case 'counter_sink': {
      roundRect(ctx, -hw, -hd, w, d, 3);
      ctx.fill();
      ctx.stroke();

      // Front overhang counter bevel line
      ctx.beginPath();
      ctx.moveTo(-hw, hd - 4);
      ctx.lineTo(hw, hd - 4);
      ctx.lineWidth = 0.75;
      ctx.stroke();

      if (type === 'counter_sink') {
        // Under-mount rectangular sink basin
        const basinW = Math.min(56, w - 24);
        const basinD = d - 22;
        roundRect(ctx, -basinW / 2, -hd + 8, basinW, basinD, 4);
        ctx.fillStyle = theme.paper;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Strainer drain hole
        ctx.beginPath();
        ctx.arc(0, -hd + 8 + basinD / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = theme.symbolStroke;
        ctx.fill();

        // Chrome gooseneck faucet spout circle with mixer lever
        ctx.beginPath();
        ctx.arc(0, -hd + 14, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -hd + 14);
        ctx.lineTo(0, -hd + 24);
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Fluted draining board grooves on left
        if (w >= 90) {
          ctx.lineWidth = 0.75;
          for (let i = 0; i < 4; i++) {
            const gx = -hw + 14 + i * 5;
            ctx.beginPath();
            ctx.moveTo(gx, -hd + 12);
            ctx.lineTo(gx, -hd + 12 + basinD - 8);
            ctx.stroke();
          }
        }
      } else {
        // Cabinet door division lines on base counter
        ctx.beginPath();
        ctx.moveTo(0, -hd + 4);
        ctx.lineTo(0, hd - 6);
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 13. STOVE & RANGE COOKER
    // ------------------------------------------------------------------------
    case 'stove': {
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      // 4 Cooktop burners (2 large, 2 medium)
      const bRadLarge = Math.min(hw, hd) * 0.26;
      const bRadSmall = Math.min(hw, hd) * 0.20;
      const bOffset = Math.min(hw, hd) * 0.42;

      const burnerConfigs = [
        [-bOffset, -bOffset + 4, bRadLarge],
        [bOffset, -bOffset + 4, bRadSmall],
        [-bOffset, bOffset - 4, bRadSmall],
        [bOffset, bOffset - 4, bRadLarge]
      ];

      burnerConfigs.forEach(([bx, by, rad]) => {
        // Outer burner ring
        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fillStyle = theme.paper;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Inner flame cap
        ctx.beginPath();
        ctx.arc(bx, by, rad * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = theme.symbolStroke;
        ctx.fill();

        // Cast-iron trivet cross grate
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(bx - rad - 2, by);
        ctx.lineTo(bx + rad + 2, by);
        ctx.moveTo(bx, by - rad - 2);
        ctx.lineTo(bx, by + rad + 2);
        ctx.stroke();
      });

      // Front control knob strip
      const knobY = hd - 6;
      for (let i = 0; i < 4; i++) {
        const kx = -hw + 14 + i * ((w - 28) / 3);
        ctx.beginPath();
        ctx.arc(kx, knobY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = theme.symbolStroke;
        ctx.fill();
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 14. REFRIGERATOR
    // ------------------------------------------------------------------------
    case 'fridge': {
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      // French door vertical split line
      ctx.beginPath();
      ctx.moveTo(0, -hd);
      ctx.lineTo(0, hd - 4);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bottom freezer drawer division
      ctx.beginPath();
      ctx.moveTo(-hw, hd * 0.35);
      ctx.lineTo(hw, hd * 0.35);
      ctx.stroke();

      // Heavy vertical door handles
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-3, -hd + 10);
      ctx.lineTo(-3, hd * 0.25);
      ctx.moveTo(3, -hd + 10);
      ctx.lineTo(3, hd * 0.25);
      ctx.stroke();

      // Rear heat-sink ventilation grill dashes
      ctx.lineWidth = 0.75;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(-hw + 6, -hd + 3);
      ctx.lineTo(hw - 6, -hd + 3);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }

    // ------------------------------------------------------------------------
    // 15. TALL PANTRY CABINET
    // ------------------------------------------------------------------------
    case 'tall_cabinet': {
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      // Architectural diagonal X cross denoting tall unit
      ctx.lineWidth = 0.75;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(-hw, -hd);
      ctx.lineTo(hw, hd);
      ctx.moveTo(hw, -hd);
      ctx.lineTo(-hw, hd);
      ctx.stroke();
      ctx.setLineDash([]);

      // Split doors with handles
      ctx.beginPath();
      ctx.moveTo(0, -hd);
      ctx.lineTo(0, hd);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-4, hd - 6);
      ctx.lineTo(-4, hd - 20);
      ctx.moveTo(4, hd - 6);
      ctx.lineTo(4, hd - 20);
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------------------
    // 16. TOILET (WATER CLOSET)
    // ------------------------------------------------------------------------
    case 'toilet': {
      // Cistern/tank at back (top)
      const tankD = d * 0.32;
      roundRect(ctx, -hw + 3, -hd + 2, w - 6, tankD, 4);
      ctx.fill();
      ctx.stroke();

      // Dual flush chrome push-button
      ctx.beginPath();
      ctx.arc(0, -hd + tankD / 2 + 2, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -hd + 4);
      ctx.lineTo(0, -hd + tankD);
      ctx.lineWidth = 0.75;
      ctx.stroke();
      ctx.lineWidth = 1.5;

      // Elongated bowl outer rim
      const bowlCenterY = -hd + tankD + (d - tankD) * 0.48;
      const bowlRadX = (w - 10) / 2;
      const bowlRadY = (d - tankD) * 0.46;
      ctx.beginPath();
      ctx.ellipse(0, bowlCenterY, bowlRadX, bowlRadY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner bowl water reservoir
      ctx.beginPath();
      ctx.ellipse(0, bowlCenterY + 4, bowlRadX * 0.65, bowlRadY * 0.62, 0, 0, Math.PI * 2);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.stroke();

      // Drain hole
      ctx.beginPath();
      ctx.arc(0, bowlCenterY + 8, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = theme.symbolStroke;
      ctx.fill();
      break;
    }

    // ------------------------------------------------------------------------
    // 17. BATHTUB
    // ------------------------------------------------------------------------
    case 'bathtub': {
      // Outer tub rim
      roundRect(ctx, -hw, -hd, w, d, 8);
      ctx.fill();
      ctx.stroke();

      // Deep contoured inner soaking well
      roundRect(ctx, -hw + 8, -hd + 8, w - 16, d - 16, 18);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.stroke();

      // Drain hole & chrome stopper
      const drainX = hw - 22;
      ctx.beginPath();
      ctx.arc(drainX, 0, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = theme.symbolStroke;
      ctx.fill();

      // Mixer faucet with spout and dual taps
      ctx.beginPath();
      ctx.moveTo(hw - 6, -8);
      ctx.lineTo(hw - 6, 8);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hw - 6, 0);
      ctx.lineTo(hw - 14, 0);
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------------------
    // 18. BATHROOM SINK & DOUBLE VANITY
    // ------------------------------------------------------------------------
    case 'sink':
    case 'vanity_double': {
      // Counter top
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      const basins = type === 'vanity_double' ? 2 : 1;
      const bSpacing = w / (basins + 1);

      for (let i = 1; i <= basins; i++) {
        const cx = -hw + i * bSpacing;
        const bRadX = Math.min(22, (w / basins) * 0.32);
        const bRadY = Math.min(16, d * 0.32);

        // Ceramic oval basin
        ctx.beginPath();
        ctx.ellipse(cx, 0, bRadX, bRadY, 0, 0, Math.PI * 2);
        ctx.fillStyle = theme.paper;
        ctx.fill();
        ctx.stroke();

        // Chrome pop-up drain
        ctx.beginPath();
        ctx.arc(cx, 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = theme.symbolStroke;
        ctx.fill();

        // Mixer faucet at back of basin
        ctx.beginPath();
        ctx.arc(cx, -hd + 9, 3.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, -hd + 9);
        ctx.lineTo(cx, -hd + 16);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 19. WALK-IN SHOWER
    // ------------------------------------------------------------------------
    case 'shower': {
      // Shower tray enclosure
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      // Diagonal drainage grade lines
      ctx.beginPath();
      ctx.moveTo(-hw, -hd);
      ctx.lineTo(0, 0);
      ctx.moveTo(hw, -hd);
      ctx.lineTo(0, 0);
      ctx.moveTo(-hw, hd);
      ctx.lineTo(0, 0);
      ctx.moveTo(hw, hd);
      ctx.lineTo(0, 0);
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // Central square drain grate
      roundRect(ctx, -6, -6, 12, 12, 2);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Rainfall showerhead overhead arm symbol
      ctx.beginPath();
      ctx.arc(-hw + 14, 0, 8, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-hw, 0);
      ctx.lineTo(-hw + 14, 0);
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------------------
    // 20. WORKSTATION DESK
    // ------------------------------------------------------------------------
    case 'desk': {
      // Desktop surface
      roundRect(ctx, -hw, -hd, w, d, 5);
      ctx.fill();
      ctx.stroke();

      // Curved ultra-wide monitor screen (top wall side)
      const monW = Math.min(70, w * 0.55);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-monW / 2, -hd + 16);
      ctx.quadraticCurveTo(0, -hd + 14, monW / 2, -hd + 16);
      ctx.stroke();

      // Monitor stand base
      roundRect(ctx, -9, -hd + 8, 18, 6, 2);
      ctx.fillStyle = theme.symbolStroke;
      ctx.fill();

      // Slim keyboard
      const kbW = 42;
      const kbD = 15;
      roundRect(ctx, -kbW / 2, hd - kbD - 12, kbW, kbD, 2);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.stroke();

      // Keyboard spacebar line
      ctx.beginPath();
      ctx.moveTo(-10, hd - 16);
      ctx.lineTo(10, hd - 16);
      ctx.stroke();

      // Mousepad & mouse
      const padW = 16;
      const padD = 20;
      roundRect(ctx, kbW / 2 + 8, hd - padD - 10, padW, padD, 3);
      ctx.fillStyle = theme.symbolFill;
      ctx.fill();
      ctx.stroke();

      // Mouse
      roundRect(ctx, kbW / 2 + 12, hd - 24, 8, 12, 3);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.stroke();

      // Cable management grommet hole on corner
      ctx.beginPath();
      ctx.arc(hw - 16, -hd + 16, 4, 0, Math.PI * 2);
      ctx.fillStyle = theme.symbolStroke;
      ctx.fill();
      break;
    }

    // ------------------------------------------------------------------------
    // 21. ERGONOMIC OFFICE CHAIR
    // ------------------------------------------------------------------------
    case 'office_chair': {
      // 5-Star caster base spokes
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const sx = Math.cos(a) * (hw - 4);
        const sy = Math.sin(a) * (hd - 4);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        // Caster wheel
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = theme.symbolStroke;
        ctx.fill();
      }

      // Contoured seat cushion
      roundRect(ctx, -hw + 8, -hd + 8, w - 16, d - 16, 8);
      ctx.fillStyle = theme.symbolFill;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Ergonomic mesh backrest at rear
      roundRect(ctx, -hw + 10, -hd + 4, w - 20, 8, 4);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.stroke();

      // Left & right adjustable armrests
      roundRect(ctx, -hw + 4, -6, 5, 16, 2);
      ctx.fillStyle = theme.symbolStroke;
      ctx.fill();
      roundRect(ctx, hw - 9, -6, 5, 16, 2);
      ctx.fill();
      break;
    }

    // ------------------------------------------------------------------------
    // 22. POTTED PLANT
    // ------------------------------------------------------------------------
    case 'plant_indoor': {
      const pr = Math.min(hw, hd);

      // Outer planter pot rim
      ctx.beginPath();
      ctx.arc(0, 0, pr * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Potting soil inner circle
      ctx.beginPath();
      ctx.arc(0, 0, pr * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = theme.symbolStroke;
      ctx.fill();

      // Organic radiating leaves with midrib veins
      const leafCount = 9;
      for (let i = 0; i < leafCount; i++) {
        const a = (i * Math.PI * 2) / leafCount;
        const len = pr * 0.95;
        const lx = Math.cos(a) * len;
        const ly = Math.sin(a) * len;

        // Leaf outline (smooth curve outward)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
          Math.cos(a + 0.3) * (len * 0.65),
          Math.sin(a + 0.3) * (len * 0.65),
          lx,
          ly
        );
        ctx.quadraticCurveTo(
          Math.cos(a - 0.25) * (len * 0.65),
          Math.sin(a - 0.25) * (len * 0.65),
          0,
          0
        );
        ctx.fillStyle = theme.symbolFill;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();

        // Central leaf vein
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(lx, ly);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 23. CEILING LIGHT
    // ------------------------------------------------------------------------
    case 'ceiling_light': {
      const r = Math.min(hw, hd) * 0.9;

      // Outer luminaire fixture circle
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = theme.symbolFill;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 4 Radial architectural cross tick marks
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.moveTo(0, -r);
      ctx.lineTo(0, r);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Inner glowing lamp core
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = theme.symbolStroke;
      ctx.fill();
      break;
    }

    // ------------------------------------------------------------------------
    // 24. DUPLEX WALL OUTLET
    // ------------------------------------------------------------------------
    case 'outlet': {
      // Wall plate
      roundRect(ctx, -hw, -hd, w, d, 2);
      ctx.fill();
      ctx.stroke();

      // Duplex receptacle circle
      const r = Math.min(hw, hd) * 0.75;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.stroke();

      // Dual parallel plug blade slots
      ctx.fillStyle = theme.symbolStroke;
      roundRect(ctx, -4, -5, 2, 6, 1);
      ctx.fill();
      roundRect(ctx, 2, -5, 2, 6, 1);
      ctx.fill();

      // Ground pin dot
      ctx.beginPath();
      ctx.arc(0, 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ------------------------------------------------------------------------
    // 25. WALL LIGHT SWITCH
    // ------------------------------------------------------------------------
    case 'switch': {
      // Switch face plate
      roundRect(ctx, -hw, -hd, w, d, 2);
      ctx.fill();
      ctx.stroke();

      // Architectural 'S' light switch symbol
      ctx.font = `bold ${Math.floor(d * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.symbolStroke;
      ctx.fillText('S', 0, 0);
      break;
    }

    // ------------------------------------------------------------------------
    // DEFAULT ARCHITECTURAL SYMBOL
    // ------------------------------------------------------------------------
    default: {
      roundRect(ctx, -hw, -hd, w, d, 4);
      ctx.fill();
      ctx.stroke();

      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(-hw, -hd);
      ctx.lineTo(hw, hd);
      ctx.moveTo(hw, -hd);
      ctx.lineTo(-hw, hd);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}
