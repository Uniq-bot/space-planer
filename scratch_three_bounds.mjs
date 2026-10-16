import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

// Mock minimal browser globals for Three in Node
global.window = global;
global.self = global;
global.document = {
  createElement: () => ({ setAttribute: () => {}, style: {} }),
  createElementNS: () => ({ setAttribute: () => {}, style: {} })
};

const modalsDir = '/home/bug/sampler/public/modals';
const dirs = fs.readdirSync(modalsDir);

// Override FileLoader to read files from disk
THREE.FileLoader.prototype.load = function (url, onLoad, onProgress, onError) {
  try {
    let cleanPath = url.replace(/^file:\/\//, '');
    const data = fs.readFileSync(cleanPath);
    if (this.responseType === 'arraybuffer') {
      const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      setTimeout(() => onLoad(ab), 0);
    } else {
      setTimeout(() => onLoad(data.toString('utf8')), 0);
    }
  } catch (err) {
    if (onError) onError(err);
  }
};

const loader = new GLTFLoader();

async function checkModels() {
  const results = [];
  for (const dir of dirs) {
    const dirPath = path.join(modalsDir, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;
    const gltfPath = path.join(dirPath, 'scene.gltf');
    if (!fs.existsSync(gltfPath)) continue;

    try {
      const gltfContent = fs.readFileSync(gltfPath, 'utf8');
      await new Promise((resolve) => {
        loader.parse(
          gltfContent,
          `${dirPath}/`,
          (gltf) => {
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);
            results.push({
              folder: dir,
              success: true,
              size: { x: +size.x.toFixed(3), y: +size.y.toFixed(3), z: +size.z.toFixed(3) },
              min: { x: +box.min.x.toFixed(3), y: +box.min.y.toFixed(3), z: +box.min.z.toFixed(3) },
              max: { x: +box.max.x.toFixed(3), y: +box.max.y.toFixed(3), z: +box.max.z.toFixed(3) },
              center: { x: +center.x.toFixed(3), y: +center.y.toFixed(3), z: +center.z.toFixed(3) }
            });
            resolve();
          },
          (err) => {
            results.push({ folder: dir, success: false, error: err.message });
            resolve();
          }
        );
      });
    } catch (e) {
      results.push({ folder: dir, success: false, error: e.message });
    }
  }
  fs.writeFileSync('/home/bug/sampler/model_bounds_report.json', JSON.stringify(results, null, 2));
  console.log('Results saved to model_bounds_report.json. Processed:', results.length);
}

checkModels();
