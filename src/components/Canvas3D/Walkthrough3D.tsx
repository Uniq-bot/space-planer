import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FloorPlan, Wall, Opening, SymbolItem, Room } from '../../types/floorplan';
import { ThemeColors } from '../../constants/themes';
import { createPBRMaterial, WALL_MATERIALS, FLOOR_MATERIALS, WallMaterialType, FloorMaterialType } from '../../utils/textures';
import { getArchitecturalEnvironment, disposeEnvironment } from '../../utils/pbrEnvironment';
import { FURNITURE_CATALOG } from '../../constants/catalog';
import { buildFurniture3D } from './furniture3D';
import {
  preloadModelTypes,
  addModelLoadListener,
  disposeHierarchy
} from './modelLoader';

export const DEFAULT_LOOK_SENSITIVITY = 0.0022;

export interface TargetedObjectInfo {
  id: string;
  type: 'symbol' | 'wall' | 'room' | 'opening';
  name: string;
  materialName?: string;
  width?: number;
  depth?: number;
  rotation?: number;
  sym?: SymbolItem;
  wall?: Wall;
  room?: Room;
  op?: Opening;
}

export interface CarryingItemInfo {
  symId: string;
  type: string;
  name: string;
  width: number;
  depth: number;
  currentX: number;
  currentY: number;
  currentRot: number;
  origX: number;
  origY: number;
  origRot: number;
}

interface Walkthrough3DProps {
  plan: FloorPlan;
  onUpdatePlan?: (newPlan: FloorPlan) => void;
  theme: ThemeColors;
  selectedIds: string[];
  onSelectIds: (ids: string[], isToggle?: boolean) => void;
  mouseSensitivity?: number;
}

export const Walkthrough3D: React.FC<Walkthrough3DProps> = ({
  plan,
  onUpdatePlan,
  theme,
  selectedIds,
  onSelectIds,
  mouseSensitivity = DEFAULT_LOOK_SENSITIVITY
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'firstPerson'>('orbit');
  const [seeThroughWalls, setSeeThroughWalls] = useState<boolean>(false);
  const [modelVersion, setModelVersion] = useState(0);
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);

  // First-Person Interactive Targeting & Carrying State
  const [targetedItem, setTargetedItem] = useState<TargetedObjectInfo | null>(null);
  const [carryingItem, setCarryingItem] = useState<CarryingItemInfo | null>(null);

  // Persistent Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const planGroupRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const selectableMeshesRef = useRef<THREE.Mesh[]>([]);
  const placementGuideRef = useRef<THREE.Mesh | null>(null);

  // Synchronous State Refs
  const cameraModeRef = useRef<'orbit' | 'firstPerson'>(cameraMode);
  const selectedIdsRef = useRef<string[]>(selectedIds);
  const onSelectIdsRef = useRef(onSelectIds);
  const onUpdatePlanRef = useRef(onUpdatePlan);
  const planRef = useRef<FloorPlan>(plan);
  const isPointerLockedRef = useRef<boolean>(false);
  const sensitivityRef = useRef<number>(mouseSensitivity);
  const targetedItemRef = useRef<TargetedObjectInfo | null>(null);
  const carryingItemRef = useRef<CarryingItemInfo | null>(null);
  const lastTargetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onSelectIdsRef.current = onSelectIds;
  }, [onSelectIds]);

  useEffect(() => {
    onUpdatePlanRef.current = onUpdatePlan;
  }, [onUpdatePlan]);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    sensitivityRef.current = mouseSensitivity;
  }, [mouseSensitivity]);

  // First-person state with stable yaw, pitch, and direct responsive key tracking
  const fpState = useRef({
    pos: new THREE.Vector3(260, 160, 260),
    pitch: 0,
    yaw: 0,
    keys: { forward: false, backward: false, left: false, right: false, shift: false }
  });

  const clickStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPlanRef = useRef(plan);
  const initialThemeRef = useRef(theme);

  // Preload 3D models for furniture present in the floor plan
  useEffect(() => {
    const types = Array.from(new Set(plan.symbols.map((s) => s.type)));
    preloadModelTypes(types);
  }, [plan.symbols]);

  // Subscribe to background model loads to update furniture meshes smoothly without camera resets
  useEffect(() => {
    return addModelLoadListener(() => {
      setModelVersion((v) => v + 1);
    });
  }, []);

  // 1. Core Scene, Renderer, Camera, and Controls Initialization (Runs ONCE on mount)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const initPlan = initialPlanRef.current;
    const initTheme = initialThemeRef.current;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(initTheme.name === 'dark' ? 0x0f172a : 0xf4f2ec);

    // 2. Camera setup
    const rect = container.getBoundingClientRect();
    const w = rect.width || container.clientWidth || 800;
    const h = rect.height || container.clientHeight || 600;
    const aspect = w / h;
    const camera = new THREE.PerspectiveCamera(50, aspect, 1, 8000);
    cameraRef.current = camera;

    // Compute floor plan bounding box to set initial camera framing
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    initPlan.walls.forEach((wall) => {
      minX = Math.min(minX, wall.x1, wall.x2);
      maxX = Math.max(maxX, wall.x1, wall.x2);
      minY = Math.min(minY, wall.y1, wall.y2);
      maxY = Math.max(maxY, wall.y1, wall.y2);
    });
    const centerX = isFinite(minX) ? (minX + maxX) / 2 : 300;
    const centerY = isFinite(minY) ? (minY + maxY) / 2 : 300;
    const initialSpan = Math.max(maxX - minX, maxY - minY, 600);

    camera.position.set(centerX + initialSpan * 0.6, Math.max(500, initialSpan * 0.75), centerY + initialSpan * 0.85);

    // 3. Renderer with Cinematic ACESFilmic Tone Mapping and sRGB color space
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.10;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Smooth OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 20;
    controls.maxDistance = 6000;
    controls.target.set(centerX, 40, centerY);
    controls.enabled = cameraModeRef.current === 'orbit';
    controls.update();

    // 5. PMREM Environment Lighting
    const envTexture = getArchitecturalEnvironment(renderer);
    scene.environment = envTexture;
    scene.environmentIntensity = 0.90;

    // 6. Lighting
    const ambientLight = new THREE.AmbientLight(0xfff7ee, 0.55);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.40);
    hemiLight.position.set(0, 1500, 0);
    scene.add(hemiLight);

    const shadowRadius = initialSpan * 0.75 + 150;
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.25);
    sunLightRef.current = sunLight;
    sunLight.position.set(centerX + 650, 1400, centerY + 550);
    sunLight.target.position.set(centerX, 0, centerY);
    scene.add(sunLight.target);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 4000;
    sunLight.shadow.camera.left = -shadowRadius;
    sunLight.shadow.camera.right = shadowRadius;
    sunLight.shadow.camera.top = shadowRadius;
    sunLight.shadow.camera.bottom = -shadowRadius;
    sunLight.shadow.bias = -0.0001;
    sunLight.shadow.normalBias = 0.025;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.40);
    fillLight.position.set(centerX - 600, 1100, centerY - 500);
    scene.add(fillLight);

    // 7. Ground grid plane
    const gridHelper = new THREE.GridHelper(4000, 80, 0x94a3b8, 0xd8d6cf);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // 8. Visual Placement Guide Ring on Floor for First-Person Carrying
    const guideGeom = new THREE.RingGeometry(35, 42, 32);
    guideGeom.rotateX(-Math.PI / 2);
    const guideMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    const placementGuide = new THREE.Mesh(guideGeom, guideMat);
    placementGuide.position.set(0, 0.4, 0);
    placementGuide.visible = false;
    placementGuideRef.current = placementGuide;
    scene.add(placementGuide);

    // 9. Container Group for all plan geometry (walls, floors, furniture)
    const planGroup = new THREE.Group();
    planGroupRef.current = planGroup;
    scene.add(planGroup);

    // 10. Center Raycaster for First-Person Crosshair Targeting
    const centerRaycaster = new THREE.Raycaster();
    centerRaycaster.far = 800; // 8 meters reach

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const floorHit = new THREE.Vector3();

    // 11. Continuous Animation Loop with Real-Time First-Person Game Interaction
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (cameraModeRef.current === 'orbit') {
        controls.update();
      } else {
        const fp = fpState.current;
        // Horizontal movement vectors
        const fwdX = -Math.sin(fp.yaw);
        const fwdZ = -Math.cos(fp.yaw);
        const rgtX = Math.cos(fp.yaw);
        const rgtZ = -Math.sin(fp.yaw);

        let moveX = 0;
        let moveZ = 0;

        if (fp.keys.forward) { moveX += fwdX; moveZ += fwdZ; }
        if (fp.keys.backward) { moveX -= fwdX; moveZ -= fwdZ; }
        if (fp.keys.left) { moveX -= rgtX; moveZ -= rgtZ; }
        if (fp.keys.right) { moveX += rgtX; moveZ += rgtZ; }

        const moveLen = Math.hypot(moveX, moveZ);
        if (moveLen > 0.0001) {
          const speed = fp.keys.shift ? 7.0 : 4.0;
          fp.pos.x += (moveX / moveLen) * speed;
          fp.pos.z += (moveZ / moveLen) * speed;
        }

        camera.position.copy(fp.pos);

        const cosP = Math.cos(fp.pitch);
        const sinP = Math.sin(fp.pitch);
        const lookX = -Math.sin(fp.yaw) * cosP;
        const lookY = sinP;
        const lookZ = -Math.cos(fp.yaw) * cosP;

        camera.lookAt(fp.pos.x + lookX, fp.pos.y + lookY, fp.pos.z + lookZ);

        // --- FIRST PERSON CROSSHAIR INTERACTION & CARRYING UPDATE ---
        centerRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

        const carried = carryingItemRef.current;
        if (carried) {
          // Calculate ground projection point in front of player
          const hit = centerRaycaster.ray.intersectPlane(floorPlane, floorHit);
          const distToHit = hit ? Math.hypot(floorHit.x - fp.pos.x, floorHit.z - fp.pos.z) : 9999;

          let placeX: number;
          let placeZ: number;

          if (hit && distToHit >= 80 && distToHit <= 550 && centerRaycaster.ray.direction.y < -0.05) {
            placeX = floorHit.x;
            placeZ = floorHit.z;
          } else {
            placeX = fp.pos.x + fwdX * 220;
            placeZ = fp.pos.z + fwdZ * 220;
          }

          // Snap to clean 10cm grid
          placeX = Math.round(placeX / 10) * 10;
          placeZ = Math.round(placeZ / 10) * 10;

          carried.currentX = placeX;
          carried.currentY = placeZ;

          // Move the carried furniture group in Three.js scene in real-time
          const symGroup = planGroup.children.find(
            (c) => c.userData?.id === carried.symId && c.userData?.type === 'symbolGroup'
          );
          if (symGroup) {
            symGroup.position.set(placeX, 0, placeZ);
            symGroup.rotation.y = -((carried.currentRot * Math.PI) / 180);
          }

          // Update placement guide ring
          if (placementGuideRef.current) {
            placementGuideRef.current.visible = true;
            placementGuideRef.current.position.set(placeX, 0.4, placeZ);
          }
        } else {
          if (placementGuideRef.current) {
            placementGuideRef.current.visible = false;
          }

          // Perform raycasting against interactive objects
          const hits = centerRaycaster.intersectObjects(selectableMeshesRef.current, false);
          let nextTarget: TargetedObjectInfo | null = null;

          if (hits.length > 0) {
            const hitMesh = hits[0].object as THREE.Mesh;
            let curr: THREE.Object3D | null = hitMesh;
            let foundId: string | null = null;
            let foundType: string | null = null;

            while (curr && curr !== scene) {
              if (curr.userData && curr.userData.id) {
                foundId = curr.userData.id;
                foundType = curr.userData.type;
                break;
              }
              curr = curr.parent;
            }

            if (foundId && planRef.current) {
              const p = planRef.current;
              if (foundType === 'symbol' || foundType === 'symbolGroup') {
                const sym = p.symbols.find((s) => s.id === foundId);
                if (sym) {
                  const cat = FURNITURE_CATALOG.find((c) => c.type === sym.type);
                  nextTarget = {
                    id: sym.id,
                    type: 'symbol',
                    name: cat?.name || sym.type.replace(/_/g, ' '),
                    width: sym.width,
                    depth: sym.depth,
                    rotation: sym.rotation || 0,
                    sym
                  };
                }
              } else if (foundType === 'wall') {
                const wall = p.walls.find((w) => w.id === foundId);
                if (wall) {
                  const mat = WALL_MATERIALS.find((m) => m.id === (wall.material || 'clean_white'));
                  nextTarget = {
                    id: wall.id,
                    type: 'wall',
                    name: 'Wall',
                    materialName: mat?.name || 'Architectural White',
                    wall
                  };
                }
              } else if (foundType === 'room') {
                const room = p.rooms.find((r) => r.id === foundId);
                if (room) {
                  const mat = FLOOR_MATERIALS.find((m) => m.id === (room.floorMaterial || 'oak_wood'));
                  nextTarget = {
                    id: room.id,
                    type: 'room',
                    name: room.name || 'Room Floor',
                    materialName: mat?.name || 'Natural Oak Planks',
                    room
                  };
                }
              } else if (foundType === 'opening') {
                const op = p.openings.find((o) => o.id === foundId);
                if (op) {
                  nextTarget = {
                    id: op.id,
                    type: 'opening',
                    name: op.type === 'door' ? 'Door Opening' : 'Window Opening',
                    op
                  };
                }
              }
            }
          }

          const targetKey = nextTarget ? `${nextTarget.type}_${nextTarget.id}` : null;
          if (targetKey !== lastTargetKeyRef.current) {
            lastTargetKeyRef.current = targetKey;
            targetedItemRef.current = nextTarget;
            setTargetedItem(nextTarget);
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // 12. Responsive ResizeObserver
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const r = container.getBoundingClientRect();
      const newW = Math.round(r.width);
      const newH = Math.round(r.height);
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // 13. Pointer Lock, Mouse & Keyboard Event Handlers
    const raycaster = new THREE.Raycaster();
    const dom = renderer.domElement;

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === dom;
      setIsPointerLocked(locked);
      isPointerLockedRef.current = locked;
      if (!locked) {
        const k = fpState.current.keys;
        k.forward = false;
        k.backward = false;
        k.left = false;
        k.right = false;
        k.shift = false;
      }
    };

    const handlePointerLockError = () => {
      setIsPointerLocked(false);
      isPointerLockedRef.current = false;
    };

    // First-Person Interactive Action Functions
    const executeDropCarriedItem = () => {
      const carried = carryingItemRef.current;
      if (carried && onUpdatePlanRef.current && planRef.current) {
        onUpdatePlanRef.current({
          ...planRef.current,
          symbols: planRef.current.symbols.map((s) =>
            s.id === carried.symId
              ? { ...s, x: carried.currentX, y: carried.currentY, rotation: carried.currentRot }
              : s
          )
        });
        onSelectIdsRef.current([carried.symId]);
        setCarryingItem(null);
        carryingItemRef.current = null;
        if (placementGuideRef.current) placementGuideRef.current.visible = false;
      }
    };

    const cancelCarriedItem = () => {
      const carried = carryingItemRef.current;
      if (carried) {
        const symGroup = planGroup.children.find(
          (c) => c.userData?.id === carried.symId && c.userData?.type === 'symbolGroup'
        );
        if (symGroup) {
          symGroup.position.set(carried.origX, 0, carried.origY);
          symGroup.rotation.y = -((carried.origRot * Math.PI) / 180);
        }
        setCarryingItem(null);
        carryingItemRef.current = null;
        if (placementGuideRef.current) placementGuideRef.current.visible = false;
      }
    };

    const startCarryingItem = (sym: SymbolItem) => {
      const cat = FURNITURE_CATALOG.find((c) => c.type === sym.type);
      const info: CarryingItemInfo = {
        symId: sym.id,
        type: sym.type,
        name: cat?.name || sym.type.replace(/_/g, ' '),
        width: sym.width,
        depth: sym.depth,
        currentX: sym.x,
        currentY: sym.y,
        currentRot: sym.rotation || 0,
        origX: sym.x,
        origY: sym.y,
        origRot: sym.rotation || 0
      };
      carryingItemRef.current = info;
      setCarryingItem(info);
      onSelectIdsRef.current([sym.id]);
    };

    const rotateItemAction = (stepDeg = 45) => {
      const carried = carryingItemRef.current;
      if (carried) {
        carried.currentRot = Math.round((carried.currentRot + stepDeg + 360) % 360);
        setCarryingItem({ ...carried });
        return;
      }

      const targeted = targetedItemRef.current;
      if (targeted && targeted.type === 'symbol' && targeted.sym && onUpdatePlanRef.current && planRef.current) {
        const nextRot = Math.round(((targeted.sym.rotation || 0) + stepDeg + 360) % 360);
        onUpdatePlanRef.current({
          ...planRef.current,
          symbols: planRef.current.symbols.map((s) =>
            s.id === targeted.id ? { ...s, rotation: nextRot } : s
          )
        });
        onSelectIdsRef.current([targeted.id]);
      }
    };

    const cycleMaterialAction = () => {
      const targeted = targetedItemRef.current;
      if (!targeted || !onUpdatePlanRef.current || !planRef.current) return;

      if (targeted.type === 'wall' && targeted.wall) {
        const currMat = (targeted.wall.material || 'clean_white') as WallMaterialType;
        const idx = WALL_MATERIALS.findIndex((m) => m.id === currMat);
        const nextMat = WALL_MATERIALS[(idx + 1) % WALL_MATERIALS.length].id;
        onUpdatePlanRef.current({
          ...planRef.current,
          walls: planRef.current.walls.map((w) =>
            w.id === targeted.id ? { ...w, material: nextMat } : w
          )
        });
        onSelectIdsRef.current([targeted.id]);
      } else if (targeted.type === 'room' && targeted.room) {
        const currMat = (targeted.room.floorMaterial || 'oak_wood') as FloorMaterialType;
        const idx = FLOOR_MATERIALS.findIndex((m) => m.id === currMat);
        const nextMat = FLOOR_MATERIALS[(idx + 1) % FLOOR_MATERIALS.length].id;
        onUpdatePlanRef.current({
          ...planRef.current,
          rooms: planRef.current.rooms.map((r) =>
            r.id === targeted.id ? { ...r, floorMaterial: nextMat } : r
          )
        });
        onSelectIdsRef.current([targeted.id]);
      }
    };

    const deleteTargetedAction = () => {
      const targeted = targetedItemRef.current;
      if (!targeted || !onUpdatePlanRef.current || !planRef.current) return;
      const id = targeted.id;
      onUpdatePlanRef.current({
        ...planRef.current,
        symbols: planRef.current.symbols.filter((s) => s.id !== id),
        walls: planRef.current.walls.filter((w) => w.id !== id),
        rooms: planRef.current.rooms.filter((r) => r.id !== id),
        openings: planRef.current.openings.filter((o) => o.id !== id && o.wall_id !== id)
      });
      onSelectIdsRef.current([]);
      targetedItemRef.current = null;
      setTargetedItem(null);
    };

    const duplicateTargetedAction = () => {
      const targeted = targetedItemRef.current;
      if (!targeted || targeted.type !== 'symbol' || !targeted.sym || !onUpdatePlanRef.current || !planRef.current) return;
      const s = targeted.sym;
      const newId = `sym_${Date.now()}`;
      const newSym: SymbolItem = {
        ...s,
        id: newId,
        x: s.x + 30,
        y: s.y + 30
      };
      onUpdatePlanRef.current({
        ...planRef.current,
        symbols: [...planRef.current.symbols, newSym]
      });
      onSelectIdsRef.current([newId]);
      startCarryingItem(newSym);
    };

    const handleMouseDown = (e: MouseEvent) => {
      clickStartRef.current = { x: e.clientX, y: e.clientY };

      if (cameraModeRef.current === 'firstPerson') {
        if (!isPointerLockedRef.current) {
          if (e.button === 0) {
            try {
              const res = dom.requestPointerLock() as any;
              if (res && typeof res.catch === 'function') res.catch(() => {});
            } catch {}
          }
        } else {
          // In pointer lock: Left click = Interact / Grab / Place
          if (e.button === 0) {
            if (carryingItemRef.current) {
              executeDropCarriedItem();
            } else if (targetedItemRef.current) {
              const target = targetedItemRef.current;
              if (target.type === 'symbol' && target.sym) {
                startCarryingItem(target.sym);
              } else {
                onSelectIdsRef.current([target.id]);
              }
            }
          } else if (e.button === 2) {
            // Right click = Cancel carry or Deselect
            if (carryingItemRef.current) {
              cancelCarriedItem();
            } else {
              onSelectIdsRef.current([]);
            }
          }
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (cameraModeRef.current === 'firstPerson') {
        if (isPointerLockedRef.current) {
          const sens = sensitivityRef.current;
          const mx = e.movementX ?? (e as any).mozMovementX ?? (e as any).webkitMovementX ?? 0;
          const my = e.movementY ?? (e as any).mozMovementY ?? (e as any).webkitMovementY ?? 0;

          fpState.current.yaw -= mx * sens;
          const maxPitch = Math.PI * 0.48; // ~86.4 degrees
          fpState.current.pitch = Math.max(-maxPitch, Math.min(maxPitch, fpState.current.pitch - my * sens));
        }
      } else if (cameraModeRef.current === 'orbit') {
        const r = dom.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          const mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
          const mouseY = -((e.clientY - r.top) / r.height) * 2 + 1;
          raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
          const hits = raycaster.intersectObjects(selectableMeshesRef.current, false);
          dom.style.cursor = hits.length > 0 ? 'pointer' : 'default';
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - clickStartRef.current.x, e.clientY - clickStartRef.current.y);
      if (dist < 6 && cameraModeRef.current === 'orbit') {
        const r = dom.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;
        const mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
        const mouseY = -((e.clientY - r.top) / r.height) * 2 + 1;

        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
        const intersects = raycaster.intersectObjects(selectableMeshesRef.current, false);
        const isShiftOrCtrl = e.shiftKey || e.ctrlKey || e.metaKey;

        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;
          let curr: THREE.Object3D | null = hitMesh;
          let foundId: string | null = null;
          while (curr && curr !== scene) {
            if (curr.userData && curr.userData.id) {
              foundId = curr.userData.id;
              break;
            }
            curr = curr.parent;
          }
          if (foundId) {
            onSelectIdsRef.current([foundId], isShiftOrCtrl);
            return;
          }
        } else if (!isShiftOrCtrl) {
          onSelectIdsRef.current([]);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (cameraModeRef.current === 'firstPerson') {
        e.preventDefault();
        const step = e.deltaY > 0 ? 15 : -15;
        rotateItemAction(step);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (cameraModeRef.current === 'firstPerson') {
        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
          fpState.current.keys.forward = true;
        } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
          fpState.current.keys.backward = true;
        } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
          fpState.current.keys.left = true;
        } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
          fpState.current.keys.right = true;
        } else if (e.key === 'Shift') {
          fpState.current.keys.shift = true;
        } else if (e.key === 'e' || e.key === 'E') {
          // [E] Interact / Grab / Place
          if (carryingItemRef.current) {
            executeDropCarriedItem();
          } else if (targetedItemRef.current) {
            const target = targetedItemRef.current;
            if (target.type === 'symbol' && target.sym) {
              startCarryingItem(target.sym);
            } else {
              onSelectIdsRef.current([target.id]);
            }
          }
        } else if (e.key === 'r' || e.key === 'R') {
          // [R] Rotate 45 degrees
          rotateItemAction(e.shiftKey ? -45 : 45);
        } else if (e.key === 'm' || e.key === 'M') {
          // [M] Quick Cycle Material
          cycleMaterialAction();
        } else if (e.key === 'c' || e.key === 'C') {
          // [C] Duplicate
          duplicateTargetedAction();
        } else if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'x' || e.key === 'X') {
          // [Del / X] Delete targeted
          deleteTargetedAction();
        } else if (e.key === 'Escape') {
          if (carryingItemRef.current) {
            cancelCarriedItem();
          }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          if (isPointerLockedRef.current) {
            if (document.pointerLockElement) {
              try { document.exitPointerLock(); } catch {}
            }
          } else {
            try {
              const res = dom.requestPointerLock() as any;
              if (res && typeof res.catch === 'function') res.catch(() => {});
            } catch {}
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (cameraModeRef.current === 'firstPerson') {
        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
          fpState.current.keys.forward = false;
        } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
          fpState.current.keys.backward = false;
        } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
          fpState.current.keys.left = false;
        } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
          fpState.current.keys.right = false;
        } else if (e.key === 'Shift') {
          fpState.current.keys.shift = false;
        }
      }
    };

    const handleBlur = () => {
      const k = fpState.current.keys;
      k.forward = false;
      k.backward = false;
      k.left = false;
      k.right = false;
      k.shift = false;
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (cameraModeRef.current === 'firstPerson') {
        e.preventDefault();
      }
    };

    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });
    dom.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
      dom.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);

      if (document.pointerLockElement === dom) {
        try { document.exitPointerLock(); } catch {}
      }

      controls.dispose();
      disposeHierarchy(scene);
      renderer.dispose();
      disposeEnvironment();
      controlsRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      sceneRef.current = null;
      planGroupRef.current = null;
    };
  }, []); // Run ONCE on mount

  // 2. Rebuild Plan Content in planGroup without recreating Renderer, Camera, or OrbitControls
  useEffect(() => {
    const planGroup = planGroupRef.current;
    if (!planGroup) return;

    // Dispose existing transient geometries & materials in planGroup (preserves GLTF templates)
    disposeHierarchy(planGroup);
    planGroup.clear();
    selectableMeshesRef.current = [];

    // Base materials with physical reflectance
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.38,
      roughness: 0.04,
      metalness: 0.05,
      envMapIntensity: 1.2
    });

    const woodFurnitureMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.50,
      metalness: 0.02,
      envMapIntensity: 1.0
    });

    // Build Walls & Openings in 3D with Proportional Texture Scaling
    plan.walls.forEach((wall: Wall) => {
      const isSel = selectedIdsRef.current.includes(wall.id);
      const p1 = new THREE.Vector2(wall.x1, wall.y1);
      const p2 = new THREE.Vector2(wall.x2, wall.y2);
      const dir = new THREE.Vector2().subVectors(p2, p1);
      const wallLen = dir.length();
      if (wallLen < 1) return;

      const angle = Math.atan2(dir.y, dir.x);
      const wallHeight = wall.height || 270;
      const thickness = wall.thickness || 15;

      const wallOpenings = plan.openings.filter((o: Opening) => o.wall_id === wall.id);

      if (wallOpenings.length === 0) {
        const wallMat = createPBRMaterial('wall', wall.material || 'clean_white', wallLen, wallHeight, {
          transparent: seeThroughWalls,
          opacity: seeThroughWalls ? 0.35 : 1.0,
          isSelected: isSel
        });

        const geom = new THREE.BoxGeometry(wallLen, wallHeight, thickness);
        const mesh = new THREE.Mesh(geom, wallMat);
        mesh.castShadow = !seeThroughWalls;
        mesh.receiveShadow = true;
        mesh.userData = { id: wall.id, type: 'wall' };

        const mid = new THREE.Vector2().addVectors(p1, p2).multiplyScalar(0.5);
        mesh.position.set(mid.x, wallHeight / 2, mid.y);
        mesh.rotation.y = -angle;
        planGroup.add(mesh);
        selectableMeshesRef.current.push(mesh);
      } else {
        const wallSubGroup = new THREE.Group();
        const sortedOps = [...wallOpenings].sort((a, b) => a.position - b.position);
        let currOffset = 0;

        sortedOps.forEach((op) => {
          const opPos = op.position * wallLen;
          const halfOpW = (op.width || 90) / 2;
          const opStart = Math.max(0, opPos - halfOpW);
          const opEnd = Math.min(wallLen, opPos + halfOpW);

          if (opStart > currOffset) {
            const segLen = opStart - currOffset;
            const segMat = createPBRMaterial('wall', wall.material || 'clean_white', segLen, wallHeight, {
              transparent: seeThroughWalls,
              opacity: seeThroughWalls ? 0.35 : 1.0,
              isSelected: isSel
            });
            const segGeom = new THREE.BoxGeometry(segLen, wallHeight, thickness);
            const segMesh = new THREE.Mesh(segGeom, segMat);
            segMesh.castShadow = !seeThroughWalls;
            segMesh.receiveShadow = true;
            segMesh.userData = { id: wall.id, type: 'wall' };
            segMesh.position.set(currOffset + segLen / 2, wallHeight / 2, 0);
            wallSubGroup.add(segMesh);
            selectableMeshesRef.current.push(segMesh);
          }

          const opH = op.height || 210;
          const lintelH = Math.max(0, wallHeight - (op.sill_height || 0) - opH);
          if (lintelH > 0) {
            const lintelW = opEnd - opStart;
            const lintelMat = createPBRMaterial('wall', wall.material || 'clean_white', lintelW, lintelH, {
              transparent: seeThroughWalls,
              opacity: seeThroughWalls ? 0.35 : 1.0,
              isSelected: isSel
            });
            const lintelGeom = new THREE.BoxGeometry(lintelW, lintelH, thickness);
            const lintelMesh = new THREE.Mesh(lintelGeom, lintelMat);
            lintelMesh.userData = { id: wall.id, type: 'wall' };
            lintelMesh.position.set((opStart + opEnd) / 2, wallHeight - lintelH / 2, 0);
            wallSubGroup.add(lintelMesh);
            selectableMeshesRef.current.push(lintelMesh);
          }

          if (op.type === 'window' && (op.sill_height || 0) > 0) {
            const sillH = op.sill_height || 90;
            const sillW = opEnd - opStart;
            const sillMat = createPBRMaterial('wall', wall.material || 'clean_white', sillW, sillH, {
              transparent: seeThroughWalls,
              opacity: seeThroughWalls ? 0.35 : 1.0,
              isSelected: isSel
            });
            const sillGeom = new THREE.BoxGeometry(sillW, sillH, thickness);
            const sillMesh = new THREE.Mesh(sillGeom, sillMat);
            sillMesh.userData = { id: wall.id, type: 'wall' };
            sillMesh.position.set((opStart + opEnd) / 2, sillH / 2, 0);
            wallSubGroup.add(sillMesh);
            selectableMeshesRef.current.push(sillMesh);
          }

          if (op.type === 'door') {
            const doorGeom = new THREE.BoxGeometry(opEnd - opStart - 2, opH - 2, 4);
            const doorMesh = new THREE.Mesh(doorGeom, woodFurnitureMat);
            doorMesh.userData = { id: op.id, type: 'opening' };
            doorMesh.position.set((opStart + opEnd) / 2, opH / 2, 0);
            doorMesh.castShadow = true;
            wallSubGroup.add(doorMesh);
            selectableMeshesRef.current.push(doorMesh);
          } else {
            const glassGeom = new THREE.BoxGeometry(opEnd - opStart - 2, opH - 2, 2);
            const windowGlassMesh = new THREE.Mesh(glassGeom, glassMat);
            windowGlassMesh.userData = { id: op.id, type: 'opening' };
            windowGlassMesh.position.set((opStart + opEnd) / 2, (op.sill_height || 0) + opH / 2, 0);
            wallSubGroup.add(windowGlassMesh);
            selectableMeshesRef.current.push(windowGlassMesh);
          }

          currOffset = opEnd;
        });

        if (currOffset < wallLen) {
          const segLen = wallLen - currOffset;
          const segMat = createPBRMaterial('wall', wall.material || 'clean_white', segLen, wallHeight, {
            transparent: seeThroughWalls,
            opacity: seeThroughWalls ? 0.35 : 1.0,
            isSelected: isSel
          });
          const segGeom = new THREE.BoxGeometry(segLen, wallHeight, thickness);
          const segMesh = new THREE.Mesh(segGeom, segMat);
          segMesh.castShadow = !seeThroughWalls;
          segMesh.receiveShadow = true;
          segMesh.userData = { id: wall.id, type: 'wall' };
          segMesh.position.set(currOffset + segLen / 2, wallHeight / 2, 0);
          wallSubGroup.add(segMesh);
          selectableMeshesRef.current.push(segMesh);
        }

        wallSubGroup.position.set(p1.x, 0, p1.y);
        wallSubGroup.rotation.y = -angle;
        planGroup.add(wallSubGroup);
      }
    });

    // Corner & Bend Junction Pillars (Seals corner seams with matched wall finish)
    const junctionClusters: {
      x: number;
      y: number;
      maxThickness: number;
      maxHeight: number;
      material: string;
      wallIds: string[];
    }[] = [];

    plan.walls.forEach((w) => {
      [
        { x: w.x1, y: w.y1 },
        { x: w.x2, y: w.y2 }
      ].forEach((pt) => {
        let found = junctionClusters.find((jc) => Math.hypot(jc.x - pt.x, jc.y - pt.y) <= 6);
        if (!found) {
          found = {
            x: pt.x,
            y: pt.y,
            maxThickness: w.thickness || 15,
            maxHeight: w.height || 270,
            material: w.material || 'clean_white',
            wallIds: []
          };
          junctionClusters.push(found);
        }
        if (!found.wallIds.includes(w.id)) {
          found.wallIds.push(w.id);
          found.maxThickness = Math.max(found.maxThickness, w.thickness || 15);
          found.maxHeight = Math.max(found.maxHeight, w.height || 270);
        }
      });
    });

    junctionClusters
      .filter((jc) => jc.wallIds.length >= 2)
      .forEach((jc) => {
        const isAnySel = jc.wallIds.some((wid) => selectedIdsRef.current.includes(wid));
        const pillarMat = createPBRMaterial('wall', (jc.material as any) || 'clean_white', jc.maxThickness, jc.maxHeight, {
          transparent: seeThroughWalls,
          opacity: seeThroughWalls ? 0.35 : 1.0,
          isSelected: isAnySel
        });

        const pillarGeom = new THREE.BoxGeometry(jc.maxThickness, jc.maxHeight, jc.maxThickness);
        const pillarMesh = new THREE.Mesh(pillarGeom, pillarMat);
        pillarMesh.position.set(jc.x, jc.maxHeight / 2, jc.y);
        pillarMesh.castShadow = !seeThroughWalls;
        pillarMesh.receiveShadow = true;
        pillarMesh.userData = { id: jc.wallIds[0], type: 'wall' };
        planGroup.add(pillarMesh);
        selectableMeshesRef.current.push(pillarMesh);
      });

    // Build Room Floor Slabs with Physical PBR and Non-Distorting UVs
    plan.rooms.forEach((room) => {
      const isSel = selectedIdsRef.current.includes(room.id);
      let floorW = 420;
      let floorH = 380;
      if (room.width && room.height) {
        floorW = Math.max(20, room.width - 15);
        floorH = Math.max(20, room.height - 15);
      } else if (room.area) {
        const side = Math.sqrt(room.area) * 100;
        floorW = Math.max(20, side - 15);
        floorH = Math.max(20, side - 15);
      }

      const floorMat = createPBRMaterial('floor', room.floorMaterial || 'oak_wood', floorW, floorH, {
        isSelected: isSel
      });

      const floorGeom = new THREE.BoxGeometry(floorW, 2, floorH);
      const floorMesh = new THREE.Mesh(floorGeom, floorMat);
      floorMesh.position.set(room.x, 1, room.y);
      floorMesh.receiveShadow = true;
      floorMesh.userData = { id: room.id, type: 'room' };
      planGroup.add(floorMesh);
      selectableMeshesRef.current.push(floorMesh);
    });

    // Build High-Fidelity 3D Furniture (Selectable & Raycastable)
    plan.symbols.forEach((sym: SymbolItem) => {
      const isSel = selectedIdsRef.current.includes(sym.id);
      const { group: symGroup, selectables } = buildFurniture3D(sym, isSel);
      symGroup.userData = { id: sym.id, type: 'symbolGroup' };
      symGroup.position.set(sym.x, 0, sym.y);
      symGroup.rotation.y = -((sym.rotation || 0) * Math.PI) / 180;
      planGroup.add(symGroup);
      selectables.forEach((m) => selectableMeshesRef.current.push(m));

      // Dynamic warm accent point lights for luminaire symbols
      if (sym.type === 'ceiling_light') {
        const pLight = new THREE.PointLight(0xfffaed, 0.9, 450, 1.3);
        pLight.position.set(sym.x, 215, sym.y);
        planGroup.add(pLight);
      } else if (sym.type === 'nightstand') {
        const pLight = new THREE.PointLight(0xffedd5, 0.55, 220, 1.5);
        pLight.position.set(sym.x, 65, sym.y);
        planGroup.add(pLight);
      }
    });

    // Update sunlight target position dynamically to match plan bounds
    if (sunLightRef.current && sceneRef.current) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      plan.walls.forEach((wall) => {
        minX = Math.min(minX, wall.x1, wall.x2);
        maxX = Math.max(maxX, wall.x1, wall.x2);
        minY = Math.min(minY, wall.y1, wall.y2);
        maxY = Math.max(maxY, wall.y1, wall.y2);
      });
      if (isFinite(minX)) {
        const cX = (minX + maxX) / 2;
        const cY = (minY + maxY) / 2;
        sunLightRef.current.position.set(cX + 650, 1400, cY + 550);
        sunLightRef.current.target.position.set(cX, 0, cY);
      }
    }
  }, [plan, seeThroughWalls, modelVersion]); // Camera and controls are completely preserved!

  // 3. Selection Highlight In-Place without rebuilding scene or resetting camera
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
    selectableMeshesRef.current.forEach((mesh) => {
      const id = mesh.userData?.id;
      if (!id) return;
      const isSel = selectedIds.includes(id);
      const selColor = isSel ? new THREE.Color(0x2563eb) : new THREE.Color(0x000000);
      const selIntensity = isSel ? 0.38 : 0;

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => {
          if ('emissive' in m) {
            (m as THREE.MeshStandardMaterial).emissive.copy(selColor);
            (m as THREE.MeshStandardMaterial).emissiveIntensity = selIntensity;
          }
        });
      } else if (mesh.material && 'emissive' in mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).emissive.copy(selColor);
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = selIntensity;
      }
    });
  }, [selectedIds]);

  // 4. Update Scene Background Color In-Place when Theme Changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(theme.name === 'dark' ? 0x0f172a : 0xf4f2ec);
    }
  }, [theme]);

  // 5. Camera Mode Toggle without jumping or camera snapping
  useEffect(() => {
    cameraModeRef.current = cameraMode;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (cameraMode === 'orbit') {
      if (document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch {}
      }
      isPointerLockedRef.current = false;

      controls.enabled = true;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      controls.target.copy(camera.position).addScaledVector(dir, 350);
      controls.update();

      if (placementGuideRef.current) placementGuideRef.current.visible = false;
      carryingItemRef.current = null;
      targetedItemRef.current = null;
    } else {
      controls.enabled = false;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      fpState.current.yaw = Math.atan2(-dir.x, -dir.z);
      fpState.current.pitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y)));

      if (camera.position.y > 280) {
        fpState.current.pos.set(camera.position.x, 160, camera.position.z);
        camera.position.copy(fpState.current.pos);
      } else {
        fpState.current.pos.copy(camera.position);
      }

      const k = fpState.current.keys;
      k.forward = false;
      k.backward = false;
      k.left = false;
      k.right = false;
      k.shift = false;
    }
  }, [cameraMode]);

  const kbdStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '2px 6px',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: 10,
    fontFamily: 'monospace',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: '#ffffff'
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating 3D HUD Controls */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 8,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 500,
          zIndex: 10
        }}
      >
        <button
          onClick={() => {
            const nextMode = cameraMode === 'orbit' ? 'firstPerson' : 'orbit';
            if (nextMode === 'orbit') {
              setCarryingItem(null);
              setTargetedItem(null);
            }
            setCameraMode(nextMode);
          }}
          style={{
            background: cameraMode === 'orbit' ? '#2563eb' : '#334155',
            color: '#fff',
            border: 'none',
            padding: '5px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'background 0.15s ease'
          }}
        >
          {cameraMode === 'orbit' ? '🔭 Orbit Mode' : '🚶 First Person Walk'}
        </button>

        <button
          onClick={() => setSeeThroughWalls(!seeThroughWalls)}
          style={{
            background: seeThroughWalls ? '#2563eb' : '#334155',
            color: '#fff',
            border: 'none',
            padding: '5px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'background 0.15s ease'
          }}
        >
          {seeThroughWalls ? '👁️ Walls: Transparent' : '🧱 Walls: Solid'}
        </button>
      </div>

      {/* First-Person Mode HUD & Interactive Gaming Prompts */}
      {cameraMode === 'firstPerson' && (
        <>
          {/* Interactive Entry Banner when not pointer locked */}
          {!isPointerLocked ? (
            <div
              onClick={() => {
                const dom = rendererRef.current?.domElement;
                if (dom) {
                  try {
                    const res = dom.requestPointerLock() as any;
                    if (res && typeof res.catch === 'function') res.catch(() => {});
                  } catch {}
                }
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(15, 23, 42, 0.92)',
                backdropFilter: 'blur(10px)',
                padding: '18px 30px',
                borderRadius: 14,
                color: '#ffffff',
                textAlign: 'center',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                cursor: 'pointer',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.2)',
                userSelect: 'none',
                zIndex: 25
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#38bdf8' }}>
                🎮 Click to Enter Interactive Walk Mode
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.6 }}>
                Walk: <b>W A S D</b> (Shift to sprint) • Look: <b>Mouse</b><br />
                Grab & Move Furniture: <b>E / Left Click</b> • Rotate: <b>R / Wheel</b><br />
                Cycle Wall/Floor Finish: <b>M</b> • Delete: <b>Del</b> • Exit: <b>Esc</b>
              </div>
            </div>
          ) : (
            <>
              {/* Dynamic Game Crosshair Reticle */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  zIndex: 20
                }}
              >
                {carryingItem ? (
                  // Carrying Active State (Cyan Target Ring)
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '2px dashed #38bdf8',
                      boxShadow: '0 0 10px rgba(56, 189, 248, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#38bdf8' }} />
                  </div>
                ) : targetedItem ? (
                  // Targeting Interactive Object
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: '2px solid #38bdf8',
                      boxShadow: '0 0 8px rgba(56, 189, 248, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ffffff' }} />
                  </div>
                ) : (
                  // Default Minimal Reticle
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.85)',
                      boxShadow: '0 0 4px rgba(0, 0, 0, 0.8)'
                    }}
                  />
                )}
              </div>

              {/* Dynamic In-Game Action Tooltip attached near Crosshair */}
              {carryingItem ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(50% + 28px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.90)',
                    backdropFilter: 'blur(8px)',
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: '1px solid #38bdf8',
                    color: '#ffffff',
                    fontSize: 12,
                    textAlign: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    pointerEvents: 'none',
                    zIndex: 20
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700, color: '#38bdf8' }}>
                    <span>📦 Carrying:</span>
                    <span>{carryingItem.name}</span>
                    <span style={{ fontSize: 11, opacity: 0.75, fontFamily: 'monospace' }}>
                      ({carryingItem.currentRot}°)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, opacity: 0.95 }}>
                    <span><kbd style={kbdStyle}>Click / E</kbd> Place on Floor</span>
                    <span><kbd style={kbdStyle}>R / Wheel</kbd> Rotate</span>
                    <span><kbd style={kbdStyle}>Right Click / Esc</kbd> Cancel</span>
                  </div>
                </div>
              ) : targetedItem ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(50% + 28px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.88)',
                    backdropFilter: 'blur(8px)',
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: '1px solid rgba(56, 189, 248, 0.5)',
                    color: '#ffffff',
                    fontSize: 12,
                    textAlign: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    pointerEvents: 'none',
                    zIndex: 20
                  }}
                >
                  {targetedItem.type === 'symbol' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}>
                        <span>🛋️ {targetedItem.name}</span>
                        <span style={{ fontSize: 11, opacity: 0.7, fontFamily: 'monospace' }}>
                          {targetedItem.width}×{targetedItem.depth} cm
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11 }}>
                        <span><kbd style={kbdStyle}>Click / E</kbd> Pick Up</span>
                        <span><kbd style={kbdStyle}>R</kbd> Rotate</span>
                        <span><kbd style={kbdStyle}>C</kbd> Clone</span>
                        <span><kbd style={kbdStyle}>Del</kbd> Delete</span>
                      </div>
                    </>
                  )}

                  {targetedItem.type === 'wall' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}>
                        <span>🧱 {targetedItem.name}</span>
                        <span style={{ fontSize: 11, opacity: 0.75, color: '#38bdf8' }}>
                          [{targetedItem.materialName}]
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11 }}>
                        <span><kbd style={kbdStyle}>Click</kbd> Select</span>
                        <span><kbd style={kbdStyle}>M</kbd> Cycle Finish</span>
                        <span><kbd style={kbdStyle}>Del</kbd> Delete</span>
                      </div>
                    </>
                  )}

                  {targetedItem.type === 'room' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}>
                        <span>🪵 {targetedItem.name}</span>
                        <span style={{ fontSize: 11, opacity: 0.75, color: '#38bdf8' }}>
                          [{targetedItem.materialName}]
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11 }}>
                        <span><kbd style={kbdStyle}>Click</kbd> Select Room</span>
                        <span><kbd style={kbdStyle}>M</kbd> Cycle Floor</span>
                      </div>
                    </>
                  )}

                  {targetedItem.type === 'opening' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}>
                        <span>{targetedItem.name.includes('Door') ? '🚪' : '🪟'} {targetedItem.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11 }}>
                        <span><kbd style={kbdStyle}>Click</kbd> Select</span>
                        <span><kbd style={kbdStyle}>Del</kbd> Delete</span>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {/* Bottom Quick Reference Bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(6px)',
                  padding: '6px 18px',
                  borderRadius: 20,
                  color: '#ffffff',
                  fontSize: 11,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  pointerEvents: 'none',
                  zIndex: 15,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center'
                }}
              >
                <span>Move: <b>W A S D</b> (Shift to sprint)</span>
                <span>•</span>
                <span>Aim & Click to interact</span>
                <span>•</span>
                <span>Press <b>Tab</b> or <b>Esc</b> to release cursor</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
