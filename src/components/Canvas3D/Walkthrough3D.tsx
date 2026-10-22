import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FloorPlan, Wall, Opening, SymbolItem } from '../../types/floorplan';
import { ThemeColors } from '../../constants/themes';
import { createPBRMaterial } from '../../utils/textures';
import { getArchitecturalEnvironment, disposeEnvironment } from '../../utils/pbrEnvironment';
import { buildFurniture3D } from './furniture3D';
import {
  preloadModelTypes,
  addModelLoadListener,
  disposeHierarchy
} from './modelLoader';

export const DEFAULT_LOOK_SENSITIVITY = 0.0022;

interface Walkthrough3DProps {
  plan: FloorPlan;
  theme: ThemeColors;
  selectedIds: string[];
  onSelectIds: (ids: string[], isToggle?: boolean) => void;
  mouseSensitivity?: number;
}

export const Walkthrough3D: React.FC<Walkthrough3DProps> = ({
  plan,
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

  // Persistent Three.js Core Refs (created once, preserved across updates)
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const planGroupRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const selectableMeshesRef = useRef<THREE.Mesh[]>([]);

  // Synchronous State Refs to prevent stale callbacks and unwanted effect triggers
  const cameraModeRef = useRef<'orbit' | 'firstPerson'>(cameraMode);
  const selectedIdsRef = useRef<string[]>(selectedIds);
  const onSelectIdsRef = useRef(onSelectIds);
  const isPointerLockedRef = useRef<boolean>(false);
  const sensitivityRef = useRef<number>(mouseSensitivity);

  useEffect(() => {
    onSelectIdsRef.current = onSelectIds;
  }, [onSelectIds]);

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

    // 4. Smooth OrbitControls with damping, zooming, panning, and rotation enabled
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

    // 5. High-Fidelity PMREM Environment Lighting for Realistic PBR Reflections
    const envTexture = getArchitecturalEnvironment(renderer);
    scene.environment = envTexture;
    scene.environmentIntensity = 0.90;

    // 6. Balanced Multi-Source Architectural Lighting
    const ambientLight = new THREE.AmbientLight(0xfff7ee, 0.55);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.40);
    hemiLight.position.set(0, 1500, 0);
    scene.add(hemiLight);

    // Primary warm sunlight with soft contact shadows
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

    // Secondary soft sky fill light from opposite angle to reveal details
    const fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.40);
    fillLight.position.set(centerX - 600, 1100, centerY - 500);
    scene.add(fillLight);

    // 7. Ground grid plane
    const gridHelper = new THREE.GridHelper(4000, 80, 0x94a3b8, 0xd8d6cf);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // 8. Container Group for all plan geometry (walls, floors, furniture)
    const planGroup = new THREE.Group();
    planGroupRef.current = planGroup;
    scene.add(planGroup);

    // 9. Continuous Animation Loop (Synchronized & direct response, zero input lag)
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (cameraModeRef.current === 'orbit') {
        controls.update();
      } else {
        const fp = fpState.current;
        // Direction vectors strictly parallel to ground (no unexpected vertical drift)
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
          const speed = fp.keys.shift ? 7.0 : 4.0; // cm per frame
          fp.pos.x += (moveX / moveLen) * speed;
          fp.pos.z += (moveZ / moveLen) * speed;
        }

        // Camera position remains locked to eye height
        camera.position.copy(fp.pos);

        // Direction strictly clamped to prevent camera flipping
        const cosP = Math.cos(fp.pitch);
        const sinP = Math.sin(fp.pitch);
        const lookX = -Math.sin(fp.yaw) * cosP;
        const lookY = sinP;
        const lookZ = -Math.cos(fp.yaw) * cosP;

        camera.lookAt(fp.pos.x + lookX, fp.pos.y + lookY, fp.pos.z + lookZ);
      }

      renderer.render(scene, camera);
    };
    animate();

    // 10. Responsive ResizeObserver
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const rect = container.getBoundingClientRect();
      const newW = Math.round(rect.width);
      const newH = Math.round(rect.height);
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // 11. Pointer Lock, Mouse & Keyboard Event Handlers
    const raycaster = new THREE.Raycaster();
    const dom = renderer.domElement;

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === dom;
      setIsPointerLocked(locked);
      isPointerLockedRef.current = locked;
      if (!locked) {
        // Reset keys on lock release (Escape or blur)
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

    const handleMouseDown = (e: MouseEvent) => {
      clickStartRef.current = { x: e.clientX, y: e.clientY };

      if (cameraModeRef.current === 'firstPerson' && e.button === 0) {
        if (!isPointerLockedRef.current) {
          try {
            const res = dom.requestPointerLock() as any;
            if (res && typeof res.catch === 'function') {
              res.catch(() => {});
            }
          } catch {
            // Pointer lock not permitted in this context
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

          // Stable yaw & pitch deltas
          fpState.current.yaw -= mx * sens;
          const maxPitch = Math.PI * 0.48; // ~86.4 degrees to prevent flipping/gimbal lock
          fpState.current.pitch = Math.max(-maxPitch, Math.min(maxPitch, fpState.current.pitch - my * sens));
        }
      } else if (cameraModeRef.current === 'orbit') {
        const rect = dom.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
          const hits = raycaster.intersectObjects(selectableMeshesRef.current, false);
          dom.style.cursor = hits.length > 0 ? 'pointer' : 'default';
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - clickStartRef.current.x, e.clientY - clickStartRef.current.y);
      if (dist < 6 && cameraModeRef.current === 'orbit') {
        const rect = dom.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

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

    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);

      if (document.pointerLockElement === dom) {
        try {
          document.exitPointerLock();
        } catch {}
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
      // Exit pointer lock if active (pointerlockchange event will update state)
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
    } else {
      controls.enabled = false;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      fpState.current.yaw = Math.atan2(-dir.x, -dir.z);
      fpState.current.pitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y)));

      // If user was viewing from high aerial camera, place at natural eye height
      if (camera.position.y > 280) {
        fpState.current.pos.set(camera.position.x, 160, camera.position.z);
        camera.position.copy(fpState.current.pos);
      } else {
        fpState.current.pos.copy(camera.position);
      }

      // Reset movement keys
      const k = fpState.current.keys;
      k.forward = false;
      k.backward = false;
      k.left = false;
      k.right = false;
      k.shift = false;
    }
  }, [cameraMode]);

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

      {/* First-Person Mode HUD & Prompt */}
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
                background: 'rgba(15, 23, 42, 0.90)',
                backdropFilter: 'blur(10px)',
                padding: '16px 28px',
                borderRadius: 12,
                color: '#ffffff',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                userSelect: 'none',
                zIndex: 20
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                🖱️ Click to Enter Mouse Look
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Move: <b>W A S D</b> (Shift to sprint) • Look: <b>Mouse</b> • Exit: <b>Esc</b>
              </div>
            </div>
          ) : (
            <>
              {/* Subtle Central Reticle */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 0 4px rgba(0, 0, 0, 0.6)',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  zIndex: 15
                }}
              />
              {/* Bottom active pill */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(6px)',
                  padding: '8px 18px',
                  borderRadius: 20,
                  color: '#ffffff',
                  fontSize: 12,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  pointerEvents: 'none',
                  zIndex: 15
                }}
              >
                Mouse Look Active • Press <b>Esc</b> to release cursor • Move: <b>W A S D</b>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
