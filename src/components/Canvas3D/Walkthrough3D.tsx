import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FloorPlan, Wall, Opening, SymbolItem } from '../../types/floorplan';
import { ThemeColors } from '../../constants/themes';
import { getThreeTexture } from '../../utils/textures';
import { buildFurniture3D } from './furniture3D';

interface Walkthrough3DProps {
  plan: FloorPlan;
  theme: ThemeColors;
  selectedIds: string[];
  onSelectIds: (ids: string[], isToggle?: boolean) => void;
}

export const Walkthrough3D: React.FC<Walkthrough3DProps> = ({
  plan,
  theme,
  selectedIds,
  onSelectIds
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'firstPerson'>('orbit');
  const [seeThroughWalls, setSeeThroughWalls] = useState<boolean>(false);

  // References
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const selectableMeshesRef = useRef<THREE.Mesh[]>([]);

  // First-person state with velocity damping
  const fpState = useRef({
    pos: new THREE.Vector3(260, 160, 260),
    vel: new THREE.Vector3(),
    pitch: 0,
    yaw: 0,
    keys: { forward: false, backward: false, left: false, right: false },
    isDraggingLook: false,
    prevMouse: { x: 0, y: 0 }
  });

  const clickStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    selectableMeshesRef.current = [];

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.name === 'dark' ? 0x0f172a : 0xf4f2ec);

    // 2. Camera setup
    const rect = container.getBoundingClientRect();
    const w = rect.width || container.clientWidth || 800;
    const h = rect.height || container.clientHeight || 600;
    const aspect = w / h;
    const camera = new THREE.PerspectiveCamera(50, aspect, 1, 8000);
    cameraRef.current = camera;
    camera.position.set(450, 600, 750);

    // 3. Renderer with Cinematic Tone Mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
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
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 60;
    controls.maxDistance = 2800;
    controls.target.set(300, 60, 300);
    controls.update();

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.75);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.45);
    hemiLight.position.set(0, 1500, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 0.95);
    sunLight.position.set(900, 1400, 700);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 4500;
    sunLight.shadow.camera.left = -1400;
    sunLight.shadow.camera.right = 1400;
    sunLight.shadow.camera.top = 1400;
    sunLight.shadow.camera.bottom = -1400;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // 6. Ground grid plane
    const gridHelper = new THREE.GridHelper(3600, 72, 0x94a3b8, 0xd8d6cf);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // 7. Base Materials
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.42,
      roughness: 0.05,
      metalness: 0.95
    });

    const woodFurnitureMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.55,
      metalness: 0.08
    });

    const fabricMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.92,
      metalness: 0.02
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.85
    });

    const whitePorcelainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.1
    });

    // 8. Build Walls & Openings in 3D (Selectable!)
    plan.walls.forEach((wall: Wall) => {
      const isSel = selectedIds.includes(wall.id);
      const p1 = new THREE.Vector2(wall.x1, wall.y1);
      const p2 = new THREE.Vector2(wall.x2, wall.y2);
      const dir = new THREE.Vector2().subVectors(p2, p1);
      const wallLen = dir.length();
      if (wallLen < 1) return;

      const angle = Math.atan2(dir.y, dir.x);
      const wallHeight = wall.height || 270;
      const thickness = wall.thickness || 15;

      const wallTex = getThreeTexture('wall', wall.material || 'clean_white');
      const wallMat = new THREE.MeshStandardMaterial({
        map: wallTex,
        roughness: 0.82,
        metalness: 0.05,
        transparent: seeThroughWalls,
        opacity: seeThroughWalls ? 0.35 : 1.0,
        emissive: isSel ? new THREE.Color(0x2563eb) : new THREE.Color(0x000000),
        emissiveIntensity: isSel ? 0.28 : 0
      });

      const wallOpenings = plan.openings.filter((o: Opening) => o.wall_id === wall.id);

      if (wallOpenings.length === 0) {
        const geom = new THREE.BoxGeometry(wallLen, wallHeight, thickness);
        const mesh = new THREE.Mesh(geom, wallMat);
        mesh.castShadow = !seeThroughWalls;
        mesh.receiveShadow = true;
        mesh.userData = { id: wall.id, type: 'wall' };

        const mid = new THREE.Vector2().addVectors(p1, p2).multiplyScalar(0.5);
        mesh.position.set(mid.x, wallHeight / 2, mid.y);
        mesh.rotation.y = -angle;
        scene.add(mesh);
        selectableMeshesRef.current.push(mesh);
      } else {
        const wallGroup = new THREE.Group();
        const sortedOps = [...wallOpenings].sort((a, b) => a.position - b.position);
        let currOffset = 0;

        sortedOps.forEach((op) => {
          const opPos = op.position * wallLen;
          const halfOpW = (op.width || 90) / 2;
          const opStart = Math.max(0, opPos - halfOpW);
          const opEnd = Math.min(wallLen, opPos + halfOpW);

          if (opStart > currOffset) {
            const segLen = opStart - currOffset;
            const segGeom = new THREE.BoxGeometry(segLen, wallHeight, thickness);
            const segMesh = new THREE.Mesh(segGeom, wallMat);
            segMesh.castShadow = !seeThroughWalls;
            segMesh.receiveShadow = true;
            segMesh.userData = { id: wall.id, type: 'wall' };
            segMesh.position.set(currOffset + segLen / 2, wallHeight / 2, 0);
            wallGroup.add(segMesh);
            selectableMeshesRef.current.push(segMesh);
          }

          const opH = op.height || 210;
          const lintelH = Math.max(0, wallHeight - (op.sill_height || 0) - opH);
          if (lintelH > 0) {
            const lintelGeom = new THREE.BoxGeometry(opEnd - opStart, lintelH, thickness);
            const lintelMesh = new THREE.Mesh(lintelGeom, wallMat);
            lintelMesh.userData = { id: wall.id, type: 'wall' };
            lintelMesh.position.set((opStart + opEnd) / 2, wallHeight - lintelH / 2, 0);
            wallGroup.add(lintelMesh);
            selectableMeshesRef.current.push(lintelMesh);
          }

          if (op.type === 'window' && (op.sill_height || 0) > 0) {
            const sillH = op.sill_height || 90;
            const sillGeom = new THREE.BoxGeometry(opEnd - opStart, sillH, thickness);
            const sillMesh = new THREE.Mesh(sillGeom, wallMat);
            sillMesh.userData = { id: wall.id, type: 'wall' };
            sillMesh.position.set((opStart + opEnd) / 2, sillH / 2, 0);
            wallGroup.add(sillMesh);
            selectableMeshesRef.current.push(sillMesh);
          }

          if (op.type === 'door') {
            const doorGeom = new THREE.BoxGeometry(opEnd - opStart - 2, opH - 2, 4);
            const doorMesh = new THREE.Mesh(doorGeom, woodFurnitureMat);
            doorMesh.userData = { id: op.id, type: 'opening' };
            doorMesh.position.set((opStart + opEnd) / 2, opH / 2, 0);
            doorMesh.castShadow = true;
            wallGroup.add(doorMesh);
            selectableMeshesRef.current.push(doorMesh);
          } else {
            const glassGeom = new THREE.BoxGeometry(opEnd - opStart - 2, opH - 2, 2);
            const glassMesh = new THREE.Mesh(glassGeom, glassMat);
            glassMesh.userData = { id: op.id, type: 'opening' };
            glassMesh.position.set((opStart + opEnd) / 2, (op.sill_height || 0) + opH / 2, 0);
            wallGroup.add(glassMesh);
            selectableMeshesRef.current.push(glassMesh);
          }

          currOffset = opEnd;
        });

        if (currOffset < wallLen) {
          const segLen = wallLen - currOffset;
          const segGeom = new THREE.BoxGeometry(segLen, wallHeight, thickness);
          const segMesh = new THREE.Mesh(segGeom, wallMat);
          segMesh.castShadow = !seeThroughWalls;
          segMesh.receiveShadow = true;
          segMesh.userData = { id: wall.id, type: 'wall' };
          segMesh.position.set(currOffset + segLen / 2, wallHeight / 2, 0);
          wallGroup.add(segMesh);
          selectableMeshesRef.current.push(segMesh);
        }

        wallGroup.position.set(p1.x, 0, p1.y);
        wallGroup.rotation.y = -angle;
        scene.add(wallGroup);
      }
    });

    // 8b. Precision 3D Corner & Bend Junction Pillars (Seals all corner gaps, rectangles, and wall bends!)
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
        const isAnySel = jc.wallIds.some((wid) => selectedIds.includes(wid));
        const jcTex = getThreeTexture('wall', (jc.material as any) || 'clean_white');
        const jcMat = new THREE.MeshStandardMaterial({
          map: jcTex,
          roughness: 0.82,
          metalness: 0.05,
          transparent: seeThroughWalls,
          opacity: seeThroughWalls ? 0.35 : 1.0,
          emissive: isAnySel ? new THREE.Color(0x2563eb) : new THREE.Color(0x000000),
          emissiveIntensity: isAnySel ? 0.28 : 0
        });

        const pillarGeom = new THREE.BoxGeometry(jc.maxThickness, jc.maxHeight, jc.maxThickness);
        const pillarMesh = new THREE.Mesh(pillarGeom, jcMat);
        pillarMesh.position.set(jc.x, jc.maxHeight / 2, jc.y);
        pillarMesh.castShadow = !seeThroughWalls;
        pillarMesh.receiveShadow = true;
        pillarMesh.userData = { id: jc.wallIds[0], type: 'wall' };
        scene.add(pillarMesh);
        selectableMeshesRef.current.push(pillarMesh);
      });

    // 9. Build Room Floor Slabs (Selectable!)
    plan.rooms.forEach((room) => {
      const isSel = selectedIds.includes(room.id);
      const floorTex = getThreeTexture('floor', room.floorMaterial || 'oak_wood');
      const floorMat = new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.45,
        metalness: 0.05,
        emissive: isSel ? new THREE.Color(0x2563eb) : new THREE.Color(0x000000),
        emissiveIntensity: isSel ? 0.25 : 0
      });

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

      const floorGeom = new THREE.BoxGeometry(floorW, 2, floorH);
      const floorMesh = new THREE.Mesh(floorGeom, floorMat);
      floorMesh.position.set(room.x, 1, room.y);
      floorMesh.receiveShadow = true;
      floorMesh.userData = { id: room.id, type: 'room' };
      scene.add(floorMesh);
      selectableMeshesRef.current.push(floorMesh);
    });

    // 10. Build High-Fidelity 3D Furniture (Selectable & Raycastable)
    plan.symbols.forEach((sym: SymbolItem) => {
      const isSel = selectedIds.includes(sym.id);
      const { group: symGroup, selectables } = buildFurniture3D(sym, isSel);
      symGroup.position.set(sym.x, 0, sym.y);
      symGroup.rotation.y = -((sym.rotation || 0) * Math.PI) / 180;
      scene.add(symGroup);
      selectables.forEach((m) => selectableMeshesRef.current.push(m));
    });

    // 11. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (cameraMode === 'orbit') {
        controls.update();
      } else {
        const fp = fpState.current;
        const forward = new THREE.Vector3(-Math.sin(fp.yaw), 0, -Math.cos(fp.yaw));
        const right = new THREE.Vector3(Math.cos(fp.yaw), 0, -Math.sin(fp.yaw));

        const targetVel = new THREE.Vector3();
        const walkSpeed = 5;

        if (fp.keys.forward) targetVel.add(forward.clone().multiplyScalar(walkSpeed));
        if (fp.keys.backward) targetVel.add(forward.clone().multiplyScalar(-walkSpeed));
        if (fp.keys.left) targetVel.add(right.clone().multiplyScalar(-walkSpeed));
        if (fp.keys.right) targetVel.add(right.clone().multiplyScalar(walkSpeed));

        fp.vel.lerp(targetVel, 0.2);
        fp.pos.add(fp.vel);

        camera.position.copy(fp.pos);
        const lookDir = new THREE.Vector3(
          -Math.sin(fp.yaw) * Math.cos(fp.pitch),
          Math.sin(fp.pitch),
          -Math.cos(fp.yaw) * Math.cos(fp.pitch)
        );
        camera.lookAt(fp.pos.clone().add(lookDir));
      }

      renderer.render(scene, camera);
    };

    animate();

    // 12. ResizeObserver
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

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // 13. Raycaster for Multi-Select in 3D
    const raycaster = new THREE.Raycaster();
    const dom = renderer.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      clickStartRef.current = { x: e.clientX, y: e.clientY };

      if (cameraMode === 'firstPerson' && e.button === 0) {
        fpState.current.isDraggingLook = true;
        fpState.current.prevMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (cameraMode === 'firstPerson' && fpState.current.isDraggingLook) {
        const dx = e.clientX - fpState.current.prevMouse.x;
        const dy = e.clientY - fpState.current.prevMouse.y;
        fpState.current.yaw -= dx * 0.004;
        fpState.current.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, fpState.current.pitch - dy * 0.004));
        fpState.current.prevMouse = { x: e.clientX, y: e.clientY };
      } else if (cameraMode === 'orbit') {
        const rect = dom.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
        const hits = raycaster.intersectObjects(selectableMeshesRef.current, false);
        dom.style.cursor = hits.length > 0 ? 'pointer' : 'default';
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      fpState.current.isDraggingLook = false;

      const dist = Math.hypot(e.clientX - clickStartRef.current.x, e.clientY - clickStartRef.current.y);
      if (dist < 6 && cameraMode === 'orbit') {
        const rect = dom.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
        const intersects = raycaster.intersectObjects(selectableMeshesRef.current, false);
        const isShiftOrCtrl = e.shiftKey || e.ctrlKey || e.metaKey;

        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;
          if (hitMesh.userData && hitMesh.userData.id) {
            onSelectIds([hitMesh.userData.id], isShiftOrCtrl);
            return;
          }
        } else if (!isShiftOrCtrl) {
          onSelectIds([]);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (cameraMode === 'firstPerson') {
        if (e.key === 'w' || e.key === 'ArrowUp') fpState.current.keys.forward = true;
        if (e.key === 's' || e.key === 'ArrowDown') fpState.current.keys.backward = true;
        if (e.key === 'a' || e.key === 'ArrowLeft') fpState.current.keys.left = true;
        if (e.key === 'd' || e.key === 'ArrowRight') fpState.current.keys.right = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (cameraMode === 'firstPerson') {
        if (e.key === 'w' || e.key === 'ArrowUp') fpState.current.keys.forward = false;
        if (e.key === 's' || e.key === 'ArrowDown') fpState.current.keys.backward = false;
        if (e.key === 'a' || e.key === 'ArrowLeft') fpState.current.keys.left = false;
        if (e.key === 'd' || e.key === 'ArrowRight') fpState.current.keys.right = false;
      }
    };

    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      controls.dispose();
      renderer.dispose();
    };
  }, [plan, theme, selectedIds, cameraMode, seeThroughWalls, onSelectIds]);

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
            if (controlsRef.current) {
              controlsRef.current.enabled = nextMode === 'orbit';
            }
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

      {cameraMode === 'firstPerson' && (
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
            pointerEvents: 'none'
          }}
        >
          Move: <b>W A S D</b> or <b>Arrow Keys</b> | Look: <b>Drag Mouse</b>
        </div>
      )}
    </div>
  );
};
