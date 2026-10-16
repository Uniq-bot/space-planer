import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

// Mock minimal browser globals for GLTFLoader in Node
if (typeof window === 'undefined') {
  global.window = global;
  global.self = global;
}

const modalsDir = '/home/bug/sampler/public/modals';
const dirs = fs.readdirSync(modalsDir);

console.log('Testing Three.js in Node...');
console.log('Three version:', THREE.REVISION);
