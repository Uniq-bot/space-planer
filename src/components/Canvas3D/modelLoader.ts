import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface CachedModelTemplate {
  scene: THREE.Group;
  originalBox: THREE.Box3;
  originalSize: THREE.Vector3;
  originalCenter: THREE.Vector3;
}

/**
 * Direct mapping from furniture catalog item type to corresponding GLTF/GLB model file path
 * located in public/modals/.
 */
export const MODEL_PATH_MAP: Record<string, string> = {
  // Bedroom
  bed_king: 'modals/king_floor_bed/scene.gltf',
  bed_queen: 'modals/bed/scene.gltf',
  bed_single: 'modals/single_bed_2/scene.gltf',
  nightstand: 'modals/night_stand_lamp/scene.gltf',

  // Living Room
  sofa_3: 'modals/bt-_isola-_triple-_sofa/scene.gltf',
  sofa_2: 'modals/modern_cream_style_double_sofa/scene.gltf',
  armchair: 'modals/arm_chair__furniture/scene.gltf',
  table_coffee: 'modals/coffee_table/scene.gltf',
  tv_unit: 'modals/low_poly_smart_tv_series_6/scene.gltf',
  bookcase: 'modals/bookcase/scene.gltf',
  plant_indoor: 'modals/indoor_plant/scene.gltf',
  plant_ficus: 'modals/indoor_plant (1)/scene.gltf',

  // Dining
  table_dining_6: 'modals/dining_table_6_seater_with_ugly_table_cloth/scene.gltf',
  table_round_6: 'modals/round_table_furniture_model/scene.gltf',
  chair: 'modals/chair/scene.gltf',

  // Kitchen
  counter: 'modals/kitchen_counter/scene.gltf',
  stove: 'modals/gas_stove/scene.gltf',
  fridge: 'modals/house_props__fridge/scene.gltf',
  tall_cabinet: 'modals/kilburn_tall_cabinet/scene.gltf',

  // Bathroom
  toilet: 'modals/toilet/scene.gltf',
  sink: 'modals/sink_and_vanity/scene.gltf',
  bathtub: 'modals/bathtub/scene.gltf',
  shower: 'modals/shower_cabin/scene.gltf',

  // Office
  desk: 'modals/finished_desk_project/scene.gltf',
  office_chair: 'modals/office_chair/scene.gltf',

  // Electrical
  ceiling_light: 'modals/ceiling_light/scene.gltf',
  outlet: 'modals/outlet/scene.gltf'
};

// Cache of loaded model templates keyed by type
const modelCache = new Map<string, CachedModelTemplate>();

// Pending load promises to prevent duplicate downloads
const loadingPromises = new Map<string, Promise<CachedModelTemplate | null>>();

// Shared GLTFLoader instance
const loader = new GLTFLoader();

// Event listeners for when async models load
type ModelLoadListener = (type: string) => void;
const listeners = new Set<ModelLoadListener>();

export function addModelLoadListener(listener: ModelLoadListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyModelLoaded(type: string) {
  listeners.forEach((cb) => {
    try {
      cb(type);
    } catch (e) {
      console.error('Error in model load listener:', e);
    }
  });
}

/**
 * Returns model path for a given type, supporting both explicit map and fallback paths.
 */
export function getModelPathForType(type: string): string | undefined {
  return MODEL_PATH_MAP[type];
}

/**
 * Returns a cached model template if available.
 */
export function getCachedModelTemplate(type: string): CachedModelTemplate | undefined {
  return modelCache.get(type);
}

/**
 * Loads and caches a model for the given furniture type.
 * Calculates bounding box and center once on the template.
 */
export async function loadModel(type: string): Promise<CachedModelTemplate | null> {
  const cached = modelCache.get(type);
  if (cached) return cached;

  const pending = loadingPromises.get(type);
  if (pending) return pending;

  const relativePath = getModelPathForType(type);
  if (!relativePath) {
    return null;
  }

  const loadPromise = (async () => {
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const cleanRel = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
      const url = `${cleanBase}${cleanRel}`;

      const gltf = await loader.loadAsync(url);
      const scene = gltf.scene as THREE.Group;

      // Ensure matrix world is updated for bounding box computation
      scene.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const template: CachedModelTemplate = {
        scene,
        originalBox: box,
        originalSize: size,
        originalCenter: center
      };

      modelCache.set(type, template);
      loadingPromises.delete(type);
      notifyModelLoaded(type);
      return template;
    } catch (err) {
      console.warn(`Failed to load 3D model for furniture type "${type}" (${relativePath}):`, err);
      loadingPromises.delete(type);
      return null;
    }
  })();

  loadingPromises.set(type, loadPromise);
  return loadPromise;
}

/**
 * Preload an array of furniture types or all known types.
 */
export async function preloadModelTypes(types?: string[]): Promise<void> {
  const targetTypes = types || Object.keys(MODEL_PATH_MAP);
  await Promise.all(targetTypes.map((t) => loadModel(t)));
}

/**
 * Clones a cached model template and adjusts its origin, scaling, materials,
 * shadows, and selection tagging.
 */
export function instantiateFurnitureModel(
  type: string,
  targetWidth: number,
  targetHeight: number,
  targetDepth: number,
  symId: string,
  isSel: boolean
): { group: THREE.Group; selectables: THREE.Mesh[] } | null {
  const template = modelCache.get(type);
  if (!template) {
    // Trigger background loading if not already in flight
    loadModel(type);
    return null;
  }

  const clone = template.scene.clone(true);
  const selectables: THREE.Mesh[] = [];

  // 1. Inner offset group: centers the model around (0,0) in X & Z, and places its bottom at y=0
  const inner = new THREE.Group();
  inner.position.set(
    -template.originalCenter.x,
    -template.originalBox.min.y,
    -template.originalCenter.z
  );
  inner.add(clone);

  // 2. Outer wrapper group: handles scale and vertical placement offset if applicable
  const root = new THREE.Group();
  root.add(inner);

  // Specific vertical adjustments for ceiling and wall mounted fixtures
  if (type === 'ceiling_light') {
    // Ceiling light hangs from ceiling (approx 240cm)
    root.position.y = 220;
  } else if (type === 'outlet') {
    // Wall outlet sits 35cm from the floor
    root.position.y = 35;
  }

  // 3. Proportional scaling to match catalog dimensions
  const origW = Math.max(0.001, template.originalSize.x);
  const origH = Math.max(0.001, template.originalSize.y);
  const origD = Math.max(0.001, template.originalSize.z);

  const scaleX = targetWidth / origW;
  const scaleY = targetHeight / origH;
  const scaleZ = targetDepth / origD;

  root.scale.set(scaleX, scaleY, scaleZ);

  // 4. Traverse meshes: enable shadows, tag selection userData, and handle selection highlight
  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { id: symId, type: 'symbol' };
      selectables.push(mesh);

      // Handle selection highlight without destroying original materials or textures
      if (isSel) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => {
            const clonedMat = m.clone();
            if ('emissive' in clonedMat) {
              (clonedMat as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x2563eb);
              (clonedMat as THREE.MeshStandardMaterial).emissiveIntensity = 0.38;
            }
            return clonedMat;
          });
        } else if (mesh.material) {
          const clonedMat = mesh.material.clone();
          if ('emissive' in clonedMat) {
            (clonedMat as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x2563eb);
            (clonedMat as THREE.MeshStandardMaterial).emissiveIntensity = 0.38;
          }
          mesh.material = clonedMat;
        }
      }
    }
  });

  return { group: root, selectables };
}

/**
 * Recursively disposes geometries and materials in an object tree to avoid memory leaks.
 */
export function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
  });
}
