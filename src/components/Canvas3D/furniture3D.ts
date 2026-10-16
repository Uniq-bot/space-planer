import * as THREE from 'three';
import { SymbolItem } from '../../types/floorplan';

// Cache shared reusable geometry materials for ultra-smooth 60fps performance
const createFurnitureMaterials = (isSel: boolean) => {
  const selEmissive = isSel ? new THREE.Color(0x2563eb) : new THREE.Color(0x000000);
  const selIntensity = isSel ? 0.35 : 0;

  return {
    wood: new THREE.MeshStandardMaterial({
      color: 0x9a6a42,
      roughness: 0.55,
      metalness: 0.08,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    woodDark: new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.6,
      metalness: 0.05,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    fabric: new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
      metalness: 0.02,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    fabricLight: new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.85,
      metalness: 0.02,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    pillow: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.88,
      metalness: 0.01,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    accentPillow: new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.85,
      metalness: 0.02,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.95,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    darkMetal: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.8,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    porcelain: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.12,
      metalness: 0.08,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.9,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    screen: new THREE.MeshStandardMaterial({
      color: 0x050811,
      roughness: 0.1,
      metalness: 0.85,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    plantPot: new THREE.MeshStandardMaterial({
      color: 0xc2714f, // Terracotta
      roughness: 0.75,
      metalness: 0.05,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    leaf: new THREE.MeshStandardMaterial({
      color: 0x15803d, // Lush green
      roughness: 0.45,
      metalness: 0.05,
      side: THREE.DoubleSide,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    soil: new THREE.MeshStandardMaterial({
      color: 0x271c19,
      roughness: 0.95,
      metalness: 0.0,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    countertop: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.1,
      emissive: selEmissive,
      emissiveIntensity: selIntensity
    }),
    lightGlow: new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0xfef08a,
      emissiveIntensity: 0.8,
      roughness: 0.2
    })
  };
};

/**
 * Builds high-fidelity procedural 3D furniture models
 * with proper architectural proportions, multi-part details, and PBR materials.
 */
import { instantiateFurnitureModel } from './modelLoader';
import { FURNITURE_CATALOG } from '../../constants/catalog';

export function buildFurniture3D(
  sym: SymbolItem,
  isSel: boolean
): { group: THREE.Group; selectables: THREE.Mesh[] } {
  // 1. Dimensions from symbol and catalog (with safe fallbacks)
  const catalogItem = FURNITURE_CATALOG.find((c) => c.type === sym.type);
  const w = Math.max(10, sym.width);
  const d = Math.max(10, sym.depth);
  const h = Math.max(10, sym.height ?? catalogItem?.height ?? 80);
  const hw = w / 2;
  const hd = d / 2;

  // 2. High-Fidelity Custom 3D Model (GLTF / GLB)
  const modelInstance = instantiateFurnitureModel(sym.type, w, h, d, sym.id, isSel);
  if (modelInstance) {
    return modelInstance;
  }

  // 3. Fallback to procedural architectural meshes while model loads or if no model exists
  const group = new THREE.Group();
  const selectables: THREE.Mesh[] = [];
  const mats = createFurnitureMaterials(isSel);

  const addMesh = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { id: sym.id, type: 'symbol' };
    group.add(mesh);
    selectables.push(mesh);
  };

  // Duplicate dimension variables and addMesh function removed – they are defined earlier.

  switch (sym.type) {
    // ------------------------------------------------------------------------
    // 1. BEDS
    // ------------------------------------------------------------------------
    case 'bed_king':
    case 'bed_queen':
    case 'bed_single': {
      // 4 Wooden legs
      const legGeom = new THREE.CylinderGeometry(3, 2.5, 12, 12);
      [
        [-hw + 8, -hd + 8],
        [hw - 8, -hd + 8],
        [-hw + 8, hd - 8],
        [hw - 8, hd - 8]
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, mats.woodDark);
        leg.position.set(lx, 6, lz);
        addMesh(leg);
      });

      // Bed frame platform
      const frameGeom = new THREE.BoxGeometry(w, 14, d);
      const frame = new THREE.Mesh(frameGeom, mats.wood);
      frame.position.set(0, 19, 0);
      addMesh(frame);

      // Headboard
      const headH = 95;
      const hbGeom = new THREE.BoxGeometry(w, headH, 10);
      const hb = new THREE.Mesh(hbGeom, mats.wood);
      hb.position.set(0, headH / 2 + 12, -hd + 5);
      addMesh(hb);

      // Headboard cushion panel
      const hbPanelGeom = new THREE.BoxGeometry(w - 12, headH - 24, 4);
      const hbPanel = new THREE.Mesh(hbPanelGeom, mats.fabric);
      hbPanel.position.set(0, headH / 2 + 18, -hd + 10);
      addMesh(hbPanel);

      // Mattress
      const matW = w - 8;
      const matD = d - 14;
      const matGeom = new THREE.BoxGeometry(matW, 22, matD);
      const mattress = new THREE.Mesh(matGeom, mats.fabricLight);
      mattress.position.set(0, 37, 5);
      addMesh(mattress);

      // Folded Duvet / Comforter
      const duvetD = matD * 0.65;
      const duvetGeom = new THREE.BoxGeometry(matW + 2, 8, duvetD);
      const duvet = new THREE.Mesh(duvetGeom, mats.fabric);
      duvet.position.set(0, 48, 5 + (matD - duvetD) / 2);
      addMesh(duvet);

      // Pillows
      const pillowCount = sym.type === 'bed_single' ? 1 : 2;
      const pw = (matW - (pillowCount + 1) * 8) / pillowCount;
      const pd = Math.min(38, d * 0.22);
      for (let i = 0; i < pillowCount; i++) {
        const px = -matW / 2 + 8 + pw / 2 + i * (pw + 8);
        const pz = -hd + 24;
        const pillowGeom = new THREE.BoxGeometry(pw, 10, pd);
        const pillow = new THREE.Mesh(pillowGeom, mats.pillow);
        pillow.position.set(px, 50, pz);
        pillow.rotation.x = 0.15;
        addMesh(pillow);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 2. SOFAS & ARMCHAIRS
    // ------------------------------------------------------------------------
    case 'sofa_3':
    case 'sofa_2':
    case 'armchair': {
      // 4 Metal / Wood feet
      const footGeom = new THREE.CylinderGeometry(2, 1.5, 10, 10);
      [
        [-hw + 8, -hd + 8],
        [hw - 8, -hd + 8],
        [-hw + 8, hd - 8],
        [hw - 8, hd - 8]
      ].forEach(([fx, fz]) => {
        const foot = new THREE.Mesh(footGeom, mats.darkMetal);
        foot.position.set(fx, 5, fz);
        addMesh(foot);
      });

      // Lower frame base
      const baseH = 14;
      const baseGeom = new THREE.BoxGeometry(w, baseH, d);
      const base = new THREE.Mesh(baseGeom, mats.fabric);
      base.position.set(0, 10 + baseH / 2, 0);
      addMesh(base);

      // Backrest
      const backD = d * 0.26;
      const backH = 52;
      const backGeom = new THREE.BoxGeometry(w, backH, backD);
      const back = new THREE.Mesh(backGeom, mats.fabric);
      back.position.set(0, 24 + backH / 2, -hd + backD / 2);
      addMesh(back);

      // Left & right armrests
      const armW = Math.min(18, w * 0.16);
      const armH = 38;
      const armGeom = new THREE.BoxGeometry(armW, armH, d - 4);
      [-hw + armW / 2, hw - armW / 2].forEach((ax) => {
        const arm = new THREE.Mesh(armGeom, mats.fabric);
        arm.position.set(ax, 24 + armH / 2, 2);
        addMesh(arm);
      });

      // Individual seat cushions
      const cushionCount = sym.type === 'sofa_3' ? 3 : sym.type === 'sofa_2' ? 2 : 1;
      const seatAreaW = w - armW * 2 - 4;
      const cW = seatAreaW / cushionCount;
      const cD = d - backD - 4;
      const cH = 12;

      for (let i = 0; i < cushionCount; i++) {
        const cx = -seatAreaW / 2 + cW / 2 + i * cW;
        const cz = -hd + backD + cD / 2 + 2;
        const cGeom = new THREE.BoxGeometry(cW - 2, cH, cD);
        const cushion = new THREE.Mesh(cGeom, mats.fabric);
        cushion.position.set(cx, 24 + cH / 2, cz);
        addMesh(cushion);
      }

      // Throw pillows on corners
      if (sym.type !== 'armchair') {
        [-seatAreaW / 2 + 10, seatAreaW / 2 - 10].forEach((px, idx) => {
          const tpGeom = new THREE.BoxGeometry(22, 22, 8);
          const tp = new THREE.Mesh(tpGeom, mats.accentPillow);
          tp.position.set(px, 42, -hd + backD + 12);
          tp.rotation.y = idx === 0 ? 0.35 : -0.35;
          tp.rotation.z = idx === 0 ? 0.1 : -0.1;
          addMesh(tp);
        });
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 3. DINING & COFFEE TABLES
    // ------------------------------------------------------------------------
    case 'table_dining_6':
    case 'table_dining_4':
    case 'table_coffee': {
      const isCoffee = sym.type === 'table_coffee';
      const tableH = isCoffee ? 44 : 75;
      const topThick = isCoffee ? 3 : 4;

      // Tabletop
      const topGeom = new THREE.BoxGeometry(w, topThick, d);
      const top = new THREE.Mesh(topGeom, mats.wood);
      top.position.set(0, tableH - topThick / 2, 0);
      addMesh(top);

      // 4 Table legs
      const legThick = isCoffee ? 3 : 5;
      const legGeom = new THREE.BoxGeometry(legThick, tableH - topThick, legThick);
      const legInset = legThick / 2 + 4;
      [
        [-hw + legInset, -hd + legInset],
        [hw - legInset, -hd + legInset],
        [-hw + legInset, hd - legInset],
        [hw - legInset, hd - legInset]
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, mats.woodDark);
        leg.position.set(lx, (tableH - topThick) / 2, lz);
        addMesh(leg);
      });

      // Coffee table lower shelf
      if (isCoffee) {
        const shelfGeom = new THREE.BoxGeometry(w - 12, 2, d - 12);
        const shelf = new THREE.Mesh(shelfGeom, mats.woodDark);
        shelf.position.set(0, 16, 0);
        addMesh(shelf);

        // Magazine on top
        const magGeom = new THREE.BoxGeometry(26, 1, 18);
        const mag = new THREE.Mesh(magGeom, mats.accentPillow);
        mag.position.set(12, tableH + 0.5, 5);
        mag.rotation.y = 0.2;
        addMesh(mag);
      } else {
        // Dining chairs surrounding the table
        const chairsX = sym.type === 'table_dining_6' ? 3 : 2;
        const spacing = w / (chairsX + 1);

        for (let i = 1; i <= chairsX; i++) {
          const cx = -hw + i * spacing;
          // Top chair
          const chairGroupTop = createDiningChairMesh(mats);
          chairGroupTop.position.set(cx, 0, -hd - 12);
          chairGroupTop.rotation.y = 0;
          group.add(chairGroupTop);

          // Bottom chair
          const chairGroupBottom = createDiningChairMesh(mats);
          chairGroupBottom.position.set(cx, 0, hd + 12);
          chairGroupBottom.rotation.y = Math.PI;
          group.add(chairGroupBottom);
        }
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 4. ROUND DINING TABLE
    // ------------------------------------------------------------------------
    case 'table_round_6': {
      const radius = Math.min(hw, hd);
      const tableH = 75;

      // Circular top
      const topGeom = new THREE.CylinderGeometry(radius, radius, 4, 32);
      const top = new THREE.Mesh(topGeom, mats.wood);
      top.position.set(0, tableH - 2, 0);
      addMesh(top);

      // Center pedestal column
      const colGeom = new THREE.CylinderGeometry(8, 12, tableH - 6, 24);
      const col = new THREE.Mesh(colGeom, mats.woodDark);
      col.position.set(0, (tableH - 6) / 2 + 2, 0);
      addMesh(col);

      // Heavy round base plate
      const baseGeom = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 3, 32);
      const base = new THREE.Mesh(baseGeom, mats.darkMetal);
      base.position.set(0, 1.5, 0);
      addMesh(base);

      // 6 surrounding chairs
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const cx = Math.sin(a) * (radius + 16);
        const cz = Math.cos(a) * (radius + 16);
        const chair = createDiningChairMesh(mats);
        chair.position.set(cx, 0, cz);
        chair.rotation.y = a + Math.PI;
        group.add(chair);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 5. INDIVIDUAL DINING CHAIR
    // ------------------------------------------------------------------------
    case 'chair': {
      const chairMesh = createDiningChairMesh(mats);
      group.add(chairMesh);
      break;
    }

    // ------------------------------------------------------------------------
    // 6. TV CONSOLE & MEDIA UNIT
    // ------------------------------------------------------------------------
    case 'tv_unit': {
      const consoleH = 46;
      // Console body
      const bodyGeom = new THREE.BoxGeometry(w, consoleH - 8, d);
      const body = new THREE.Mesh(bodyGeom, mats.wood);
      body.position.set(0, 4 + (consoleH - 8) / 2, 0);
      addMesh(body);

      // 4 Metal legs
      const legGeom = new THREE.CylinderGeometry(1.5, 1, 8, 8);
      [
        [-hw + 6, -hd + 6],
        [hw - 6, -hd + 6],
        [-hw + 6, hd - 6],
        [hw - 6, hd - 6]
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, mats.darkMetal);
        leg.position.set(lx, 4, lz);
        addMesh(leg);
      });

      // Widescreen OLED TV on stand
      const tvW = Math.min(130, w * 0.85);
      const tvH = 68;
      // TV Stand base
      const standBaseGeom = new THREE.BoxGeometry(32, 1.5, 18);
      const standBase = new THREE.Mesh(standBaseGeom, mats.darkMetal);
      standBase.position.set(0, consoleH + 0.75, 0);
      addMesh(standBase);

      // Stand neck
      const neckGeom = new THREE.BoxGeometry(8, 10, 4);
      const neck = new THREE.Mesh(neckGeom, mats.darkMetal);
      neck.position.set(0, consoleH + 6, -2);
      addMesh(neck);

      // TV Screen panel
      const screenGeom = new THREE.BoxGeometry(tvW, tvH, 3);
      const tvScreen = new THREE.Mesh(screenGeom, mats.screen);
      tvScreen.position.set(0, consoleH + 10 + tvH / 2, -2);
      addMesh(tvScreen);

      // Ultra-thin bezel trim
      const bezelGeom = new THREE.BoxGeometry(tvW + 1, tvH + 1, 2.5);
      const bezel = new THREE.Mesh(bezelGeom, mats.darkMetal);
      bezel.position.set(0, consoleH + 10 + tvH / 2, -2.5);
      addMesh(bezel);
      break;
    }

    // ------------------------------------------------------------------------
    // 7. DESK & WORKSTATION
    // ------------------------------------------------------------------------
    case 'desk': {
      const deskH = 75;
      const topThick = 3.5;

      // Desktop surface
      const topGeom = new THREE.BoxGeometry(w, topThick, d);
      const top = new THREE.Mesh(topGeom, mats.wood);
      top.position.set(0, deskH - topThick / 2, 0);
      addMesh(top);

      // Left drawer pedestal cabinet
      const pedW = 38;
      const pedH = deskH - topThick;
      const pedGeom = new THREE.BoxGeometry(pedW, pedH, d - 8);
      const ped = new THREE.Mesh(pedGeom, mats.woodDark);
      ped.position.set(-hw + pedW / 2 + 4, pedH / 2, 0);
      addMesh(ped);

      // Right metal loop leg
      const legW = 5;
      const legGeom = new THREE.BoxGeometry(legW, pedH, d - 8);
      const rightLeg = new THREE.Mesh(legGeom, mats.darkMetal);
      rightLeg.position.set(hw - legW / 2 - 4, pedH / 2, 0);
      addMesh(rightLeg);

      // Modesty back panel
      const modGeom = new THREE.BoxGeometry(w - pedW - 16, 32, 2);
      const mod = new THREE.Mesh(modGeom, mats.darkMetal);
      mod.position.set(hw - (w - pedW - 16) / 2 - 10, deskH - 24, -hd + 6);
      addMesh(mod);

      // Desktop Computer Monitor
      const monW = 56;
      const monH = 34;
      const monStandGeom = new THREE.CylinderGeometry(8, 8, 1, 16);
      const monStand = new THREE.Mesh(monStandGeom, mats.darkMetal);
      monStand.position.set(10, deskH + 0.5, -hd + 16);
      addMesh(monStand);

      const monStemGeom = new THREE.CylinderGeometry(1.5, 1.5, 14, 8);
      const monStem = new THREE.Mesh(monStemGeom, mats.darkMetal);
      monStem.position.set(10, deskH + 7, -hd + 16);
      addMesh(monStem);

      const monGeom = new THREE.BoxGeometry(monW, monH, 2.5);
      const mon = new THREE.Mesh(monGeom, mats.screen);
      mon.position.set(10, deskH + 14 + monH / 2, -hd + 16);
      addMesh(mon);

      // Slim keyboard & mousepad
      const kbGeom = new THREE.BoxGeometry(36, 0.8, 12);
      const kb = new THREE.Mesh(kbGeom, mats.darkMetal);
      kb.position.set(10, deskH + 0.4, 6);
      addMesh(kb);
      break;
    }

    // ------------------------------------------------------------------------
    // 8. ERGONOMIC OFFICE CHAIR
    // ------------------------------------------------------------------------
    case 'office_chair': {
      // 5-Star caster base
      const baseR = 26;
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        const spokeGeom = new THREE.BoxGeometry(baseR, 2.5, 3.5);
        const spoke = new THREE.Mesh(spokeGeom, mats.darkMetal);
        spoke.position.set((Math.cos(a) * baseR) / 2, 4, (Math.sin(a) * baseR) / 2);
        spoke.rotation.y = -a;
        addMesh(spoke);
      }

      // Gas lift cylinder
      const cylGeom = new THREE.CylinderGeometry(2.5, 3, 38, 12);
      const cyl = new THREE.Mesh(cylGeom, mats.chrome);
      cyl.position.set(0, 22, 0);
      addMesh(cyl);

      // Contoured seat cushion
      const seatGeom = new THREE.BoxGeometry(46, 7, 44);
      const seat = new THREE.Mesh(seatGeom, mats.fabric);
      seat.position.set(0, 44, 0);
      addMesh(seat);

      // Mesh backrest
      const backGeom = new THREE.BoxGeometry(42, 50, 4);
      const back = new THREE.Mesh(backGeom, mats.darkMetal);
      back.position.set(0, 72, -18);
      back.rotation.x = -0.12;
      addMesh(back);

      // Armrests
      [-22, 22].forEach((ax) => {
        const postGeom = new THREE.CylinderGeometry(1.5, 1.5, 16, 8);
        const post = new THREE.Mesh(postGeom, mats.darkMetal);
        post.position.set(ax, 52, 0);
        addMesh(post);

        const padGeom = new THREE.BoxGeometry(6, 2, 22);
        const pad = new THREE.Mesh(padGeom, mats.fabric);
        pad.position.set(ax, 60, 2);
        addMesh(pad);
      });
      break;
    }

    // ------------------------------------------------------------------------
    // 9. DRESSER & WARDROBE & BOOKCASE & SIDEBOARD & NIGHTSTAND
    // ------------------------------------------------------------------------
    case 'nightstand': {
      const h = 54;
      const bodyGeom = new THREE.BoxGeometry(w, h - 8, d);
      const body = new THREE.Mesh(bodyGeom, mats.wood);
      body.position.set(0, 4 + (h - 8) / 2, 0);
      addMesh(body);

      // Lamp on top
      const baseGeom = new THREE.CylinderGeometry(5, 6, 2, 16);
      const base = new THREE.Mesh(baseGeom, mats.chrome);
      base.position.set(0, h + 1, 0);
      addMesh(base);

      const stemGeom = new THREE.CylinderGeometry(1, 1, 14, 8);
      const stem = new THREE.Mesh(stemGeom, mats.chrome);
      stem.position.set(0, h + 8, 0);
      addMesh(stem);

      const shadeGeom = new THREE.CylinderGeometry(7, 10, 12, 16);
      const shade = new THREE.Mesh(shadeGeom, mats.lightGlow);
      shade.position.set(0, h + 19, 0);
      addMesh(shade);
      break;
    }

    case 'dresser':
    case 'sideboard': {
      const h = 85;
      const bodyGeom = new THREE.BoxGeometry(w, h - 8, d);
      const body = new THREE.Mesh(bodyGeom, mats.wood);
      body.position.set(0, 4 + (h - 8) / 2, 0);
      addMesh(body);

      // 4 Metal feet
      [
        [-hw + 8, -hd + 8],
        [hw - 8, -hd + 8],
        [-hw + 8, hd - 8],
        [hw - 8, hd - 8]
      ].forEach(([lx, lz]) => {
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.5, 8, 8), mats.darkMetal);
        foot.position.set(lx, 4, lz);
        addMesh(foot);
      });

      // Front drawer/door grooves & handles
      const sections = sym.type === 'dresser' ? 3 : 4;
      const secW = (w - 12) / sections;
      for (let i = 0; i < sections; i++) {
        const sx = -hw + 6 + secW / 2 + i * secW;
        const handleGeom = new THREE.BoxGeometry(10, 1.5, 2);
        const handle = new THREE.Mesh(handleGeom, mats.chrome);
        handle.position.set(sx, h * 0.65, hd + 1);
        addMesh(handle);
      }
      break;
    }

    case 'wardrobe':
    case 'tall_cabinet': {
      const h = 210;
      const bodyGeom = new THREE.BoxGeometry(w, h, d);
      const body = new THREE.Mesh(bodyGeom, mats.wood);
      body.position.set(0, h / 2, 0);
      addMesh(body);

      // Long vertical bar handles
      const handleGeom = new THREE.BoxGeometry(1.5, 45, 2.5);
      [-w * 0.12, w * 0.12].forEach((hx) => {
        const handle = new THREE.Mesh(handleGeom, mats.chrome);
        handle.position.set(hx, h * 0.5, hd + 1.5);
        addMesh(handle);
      });
      break;
    }

    case 'bookcase': {
      const h = 190;
      const thick = 3.5;
      // Left and right uprights
      [-hw + thick / 2, hw - thick / 2].forEach((px) => {
        const sideGeom = new THREE.BoxGeometry(thick, h, d);
        const side = new THREE.Mesh(sideGeom, mats.woodDark);
        side.position.set(px, h / 2, 0);
        addMesh(side);
      });

      // Backboard
      const backGeom = new THREE.BoxGeometry(w - thick * 2, h, 2);
      const back = new THREE.Mesh(backGeom, mats.woodDark);
      back.position.set(0, h / 2, -hd + 1);
      addMesh(back);

      // 5 Shelves with colorful books
      const bookColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];
      for (let i = 0; i < 5; i++) {
        const sy = 8 + i * ((h - 20) / 4);
        const shelfGeom = new THREE.BoxGeometry(w - thick * 2, thick, d);
        const shelf = new THREE.Mesh(shelfGeom, mats.wood);
        shelf.position.set(0, sy, 0);
        addMesh(shelf);

        // Populate row of books on shelves 1, 2, 3
        if (i < 4) {
          let currX = -hw + thick + 4;
          while (currX < hw - thick - 18) {
            const bW = 3 + Math.random() * 4;
            const bH = 18 + Math.random() * 8;
            const bD = d * 0.7;
            const bMat = new THREE.MeshStandardMaterial({
              color: bookColors[Math.floor(Math.random() * bookColors.length)],
              roughness: 0.6
            });
            const bookGeom = new THREE.BoxGeometry(bW, bH, bD);
            const book = new THREE.Mesh(bookGeom, bMat);
            book.position.set(currX + bW / 2, sy + thick / 2 + bH / 2, -hd + bD / 2 + 3);
            addMesh(book);
            currX += bW + 1.5;
          }
        }
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 10. KITCHEN UNITS (COUNTER, SINK, STOVE, FRIDGE)
    // ------------------------------------------------------------------------
    case 'counter':
    case 'counter_sink': {
      const counterH = 90;
      // Base cabinet body with toe kick
      const bodyH = counterH - 4;
      const bodyGeom = new THREE.BoxGeometry(w, bodyH, d - 4);
      const body = new THREE.Mesh(bodyGeom, mats.wood);
      body.position.set(0, bodyH / 2, 2);
      addMesh(body);

      // Countertop surface with 2cm front overhang
      const topGeom = new THREE.BoxGeometry(w, 4, d);
      const top = new THREE.Mesh(topGeom, mats.countertop);
      top.position.set(0, counterH - 2, 0);
      addMesh(top);

      if (sym.type === 'counter_sink') {
        // Stainless steel recessed sink basin
        const sinkW = Math.min(60, w - 24);
        const sinkD = d - 18;
        const sinkGeom = new THREE.BoxGeometry(sinkW, 14, sinkD);
        const sink = new THREE.Mesh(sinkGeom, mats.chrome);
        sink.position.set(0, counterH - 6, 0);
        addMesh(sink);

        // Gooseneck mixer faucet
        const spout = createGooseneckFaucet(mats);
        spout.position.set(0, counterH, -hd + 8);
        group.add(spout);
      }
      break;
    }

    case 'stove': {
      const stoveH = 90;
      // Main stainless steel oven body
      const bodyGeom = new THREE.BoxGeometry(w, stoveH - 4, d);
      const body = new THREE.Mesh(bodyGeom, mats.darkMetal);
      body.position.set(0, (stoveH - 4) / 2, 0);
      addMesh(body);

      // Oven door glass window
      const glassGeom = new THREE.BoxGeometry(w - 12, 36, 1.5);
      const doorGlass = new THREE.Mesh(glassGeom, mats.glass);
      doorGlass.position.set(0, 32, hd + 0.8);
      addMesh(doorGlass);

      // Cooktop surface
      const topGeom = new THREE.BoxGeometry(w, 4, d);
      const top = new THREE.Mesh(topGeom, mats.chrome);
      top.position.set(0, stoveH - 2, 0);
      addMesh(top);

      // 4 Cooktop burner rings
      const bRad = Math.min(hw, hd) * 0.28;
      const bOff = Math.min(hw, hd) * 0.42;
      [
        [-bOff, -bOff],
        [bOff, -bOff],
        [-bOff, bOff],
        [bOff, bOff]
      ].forEach(([bx, bz]) => {
        const burnerGeom = new THREE.CylinderGeometry(bRad, bRad, 1.5, 16);
        const burner = new THREE.Mesh(burnerGeom, mats.darkMetal);
        burner.position.set(bx, stoveH + 0.75, bz);
        addMesh(burner);
      });
      break;
    }

    case 'fridge': {
      const fridgeH = 185;
      // Main refrigerator body
      const bodyGeom = new THREE.BoxGeometry(w, fridgeH, d);
      const body = new THREE.Mesh(bodyGeom, mats.chrome);
      body.position.set(0, fridgeH / 2, 0);
      addMesh(body);

      // Horizontal door split line
      const splitGeom = new THREE.BoxGeometry(w + 0.5, 1.5, 1);
      const split = new THREE.Mesh(splitGeom, mats.darkMetal);
      split.position.set(0, fridgeH * 0.65, hd + 0.6);
      addMesh(split);

      // Vertical handles
      const hTopGeom = new THREE.CylinderGeometry(1.2, 1.2, 42, 8);
      const hTop = new THREE.Mesh(hTopGeom, mats.darkMetal);
      hTop.position.set(hw - 6, fridgeH * 0.65 + 26, hd + 3);
      addMesh(hTop);

      const hBotGeom = new THREE.CylinderGeometry(1.2, 1.2, 32, 8);
      const hBot = new THREE.Mesh(hBotGeom, mats.darkMetal);
      hBot.position.set(hw - 6, fridgeH * 0.65 - 20, hd + 3);
      addMesh(hBot);
      break;
    }

    // ------------------------------------------------------------------------
    // 11. BATHROOM FIXTURES (TOILET, BATHTUB, SINK, SHOWER)
    // ------------------------------------------------------------------------
    case 'toilet': {
      // Ceramic base pedestal
      const baseGeom = new THREE.BoxGeometry(w * 0.65, 38, d * 0.6);
      const base = new THREE.Mesh(baseGeom, mats.porcelain);
      base.position.set(0, 19, 4);
      addMesh(base);

      // Toilet bowl rim
      const bowlGeom = new THREE.CylinderGeometry(w * 0.42, w * 0.36, 12, 24);
      const bowl = new THREE.Mesh(bowlGeom, mats.porcelain);
      bowl.position.set(0, 36, 8);
      addMesh(bowl);

      // Toilet seat & lid
      const seatGeom = new THREE.BoxGeometry(w * 0.82, 3, d * 0.55);
      const seat = new THREE.Mesh(seatGeom, mats.porcelain);
      seat.position.set(0, 43, 8);
      addMesh(seat);

      // Cistern / Tank
      const tankH = 42;
      const tankD = d * 0.32;
      const tankGeom = new THREE.BoxGeometry(w, tankH, tankD);
      const tank = new THREE.Mesh(tankGeom, mats.porcelain);
      tank.position.set(0, 40 + tankH / 2, -hd + tankD / 2);
      addMesh(tank);

      // Chrome dual flush button
      const flushGeom = new THREE.CylinderGeometry(3, 3, 1, 16);
      const flush = new THREE.Mesh(flushGeom, mats.chrome);
      flush.position.set(0, 40 + tankH + 0.5, -hd + tankD / 2);
      addMesh(flush);
      break;
    }

    case 'bathtub': {
      const tubH = 56;
      // Outer porcelain tub shell
      const tubGeom = new THREE.BoxGeometry(w, tubH, d);
      const tub = new THREE.Mesh(tubGeom, mats.porcelain);
      tub.position.set(0, tubH / 2, 0);
      addMesh(tub);

      // Inner hollow cavity
      const innerGeom = new THREE.BoxGeometry(w - 14, 40, d - 14);
      const inner = new THREE.Mesh(innerGeom, mats.fabricLight);
      inner.position.set(0, tubH - 18, 0);
      addMesh(inner);

      // Chrome faucet & mixer tap
      const tap = createGooseneckFaucet(mats);
      tap.position.set(hw - 10, tubH, 0);
      tap.rotation.y = -Math.PI / 2;
      group.add(tap);
      break;
    }

    case 'sink':
    case 'vanity_double': {
      const vanH = 85;
      // Vanity lower cabinet
      const bodyGeom = new THREE.BoxGeometry(w, vanH - 6, d - 4);
      const body = new THREE.Mesh(bodyGeom, mats.wood);
      body.position.set(0, (vanH - 6) / 2 + 4, 2);
      addMesh(body);

      // Vanity stone countertop
      const topGeom = new THREE.BoxGeometry(w, 6, d);
      const top = new THREE.Mesh(topGeom, mats.countertop);
      top.position.set(0, vanH - 3, 0);
      addMesh(top);

      const basins = sym.type === 'vanity_double' ? 2 : 1;
      const bW = w / (basins + 1);

      for (let i = 1; i <= basins; i++) {
        const bx = -hw + i * bW;
        // Undermount porcelain basin
        const basinGeom = new THREE.CylinderGeometry(18, 14, 12, 24);
        const basin = new THREE.Mesh(basinGeom, mats.porcelain);
        basin.position.set(bx, vanH - 5, 2);
        addMesh(basin);

        // Chrome mixer tap
        const tap = createGooseneckFaucet(mats);
        tap.position.set(bx, vanH, -hd + 8);
        group.add(tap);
      }
      break;
    }

    case 'shower': {
      // Shower tray
      const trayGeom = new THREE.BoxGeometry(w, 5, d);
      const tray = new THREE.Mesh(trayGeom, mats.porcelain);
      tray.position.set(0, 2.5, 0);
      addMesh(tray);

      // Chrome drain
      const drainGeom = new THREE.CylinderGeometry(5, 5, 0.5, 16);
      const drain = new THREE.Mesh(drainGeom, mats.chrome);
      drain.position.set(0, 5.3, 0);
      addMesh(drain);

      // Frameless glass enclosure panels
      const glassH = 200;
      const glassThick = 1.2;
      // Front glass wall
      const glassFront = new THREE.Mesh(new THREE.BoxGeometry(w, glassH, glassThick), mats.glass);
      glassFront.position.set(0, glassH / 2 + 5, hd - 1);
      addMesh(glassFront);

      // Side glass wall
      const glassSide = new THREE.Mesh(new THREE.BoxGeometry(glassThick, glassH, d), mats.glass);
      glassSide.position.set(hw - 1, glassH / 2 + 5, 0);
      addMesh(glassSide);

      // Rainfall shower column & showerhead
      const colGeom = new THREE.CylinderGeometry(1.2, 1.2, 180, 8);
      const col = new THREE.Mesh(colGeom, mats.chrome);
      col.position.set(-hw + 8, 100, -hd + 6);
      addMesh(col);

      const headGeom = new THREE.CylinderGeometry(12, 12, 2, 24);
      const head = new THREE.Mesh(headGeom, mats.chrome);
      head.position.set(-hw + 24, 200, -hd + 24);
      addMesh(head);
      break;
    }

    // ------------------------------------------------------------------------
    // 12. POTTED PLANT
    // ------------------------------------------------------------------------
    case 'plant_indoor':
    case 'plant_ficus': {
      const potR = Math.min(hw, hd) * 0.75;
      const potH = 42;

      // Ceramic planter pot
      const potGeom = new THREE.CylinderGeometry(potR, potR * 0.7, potH, 20);
      const pot = new THREE.Mesh(potGeom, mats.plantPot);
      pot.position.set(0, potH / 2, 0);
      addMesh(pot);

      // Soil top surface
      const soilGeom = new THREE.CylinderGeometry(potR * 0.95, potR * 0.95, 2, 20);
      const soil = new THREE.Mesh(soilGeom, mats.soil);
      soil.position.set(0, potH - 1, 0);
      addMesh(soil);

      // Organic radiating leaves
      const leafCount = 9;
      for (let i = 0; i < leafCount; i++) {
        const a = (i * Math.PI * 2) / leafCount;
        const stemH = 30 + Math.random() * 35;

        // Leaf blade geometry
        const leafGeom = new THREE.PlaneGeometry(16, 28);
        const leaf = new THREE.Mesh(leafGeom, mats.leaf);
        leaf.position.set(Math.cos(a) * (potR * 0.6 + 10), potH + stemH * 0.7, Math.sin(a) * (potR * 0.6 + 10));
        leaf.rotation.x = -Math.PI / 3;
        leaf.rotation.y = -a + Math.PI / 2;
        leaf.rotation.z = Math.random() * 0.4 - 0.2;
        addMesh(leaf);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 13. CEILING LIGHT
    // ------------------------------------------------------------------------
    case 'ceiling_light': {
      const r = Math.min(hw, hd);
      // Ceiling canopy plate
      const canopy = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 2, 16), mats.chrome);
      canopy.position.set(0, 268, 0);
      addMesh(canopy);

      // Suspension cable
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 45, 6), mats.darkMetal);
      cable.position.set(0, 245, 0);
      addMesh(cable);

      // Modern drum shade
      const shadeGeom = new THREE.CylinderGeometry(r * 0.85, r, 20, 24);
      const shade = new THREE.Mesh(shadeGeom, mats.fabricLight);
      shade.position.set(0, 215, 0);
      addMesh(shade);

      // Internal glowing bulb
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 16), mats.lightGlow);
      bulb.position.set(0, 212, 0);
      addMesh(bulb);
      break;
    }

    // ------------------------------------------------------------------------
    // 14. WALL OUTLET & SWITCH
    // ------------------------------------------------------------------------
    case 'outlet':
    case 'switch': {
      const plateH = 18;
      const plateW = 12;
      const plateY = sym.type === 'switch' ? 110 : 35;

      const plateGeom = new THREE.BoxGeometry(plateW, plateH, 1.5);
      const plate = new THREE.Mesh(plateGeom, mats.porcelain);
      plate.position.set(0, plateY, 0);
      addMesh(plate);

      const toggleGeom = new THREE.BoxGeometry(4, 7, 2);
      const toggle = new THREE.Mesh(toggleGeom, mats.darkMetal);
      toggle.position.set(0, plateY, 1);
      addMesh(toggle);
      break;
    }

    // ------------------------------------------------------------------------
    // DEFAULT GENERIC MULTI-PART FURNITURE
    // ------------------------------------------------------------------------
    default: {
      const bodyH = 60;
      const genGeom = new THREE.BoxGeometry(w, bodyH, d);
      const genMesh = new THREE.Mesh(genGeom, mats.wood);
      genMesh.position.y = bodyH / 2;
      addMesh(genMesh);
      break;
    }
  }

  // Ensure every mesh in the group (including nested sub-groups like chairs or faucets) is tagged and selectable
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.userData = { id: sym.id, type: 'symbol' };
      if (!selectables.includes(obj as THREE.Mesh)) {
        selectables.push(obj as THREE.Mesh);
      }
    }
  });

  return { group, selectables };
}

// Helper: creates a detailed dining chair
function createDiningChairMesh(mats: ReturnType<typeof createFurnitureMaterials>): THREE.Group {
  const g = new THREE.Group();
  const seatH = 44;
  const chairW = 42;
  const chairD = 42;

  // 4 Legs
  const legGeom = new THREE.CylinderGeometry(1.5, 1, seatH, 8);
  [
    [-chairW / 2 + 4, -chairD / 2 + 4],
    [chairW / 2 - 4, -chairD / 2 + 4],
    [-chairW / 2 + 4, chairD / 2 - 4],
    [chairW / 2 - 4, chairD / 2 - 4]
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeom, mats.woodDark);
    leg.position.set(lx, seatH / 2, lz);
    leg.castShadow = true;
    g.add(leg);
  });

  // Seat cushion
  const seatGeom = new THREE.BoxGeometry(chairW, 4, chairD);
  const seat = new THREE.Mesh(seatGeom, mats.fabric);
  seat.position.set(0, seatH + 2, 0);
  seat.castShadow = true;
  g.add(seat);

  // Backrest uprights & slat
  const backH = 40;
  const backGeom = new THREE.BoxGeometry(chairW - 4, 18, 3);
  const back = new THREE.Mesh(backGeom, mats.wood);
  back.position.set(0, seatH + backH - 9, -chairD / 2 + 3);
  back.castShadow = true;
  g.add(back);

  return g;
}

// Helper: creates a chrome gooseneck faucet
function createGooseneckFaucet(mats: ReturnType<typeof createFurnitureMaterials>): THREE.Group {
  const g = new THREE.Group();

  // Faucet base ring
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 2, 12), mats.chrome);
  base.position.set(0, 1, 0);
  base.castShadow = true;
  g.add(base);

  // Vertical neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 18, 12), mats.chrome);
  neck.position.set(0, 10, 0);
  neck.castShadow = true;
  g.add(neck);

  // Curved horizontal spout
  const spout = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 12), mats.chrome);
  spout.position.set(0, 19, 5);
  spout.castShadow = true;
  g.add(spout);

  return g;
}
