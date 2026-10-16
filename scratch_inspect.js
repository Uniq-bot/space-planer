import fs from 'fs';
import path from 'path';

const modalsDir = '/home/bug/sampler/public/modals';
const dirs = fs.readdirSync(modalsDir);

console.log(`Found ${dirs.length} items in ${modalsDir}`);

const summary = [];

for (const dir of dirs) {
  const dirPath = path.join(modalsDir, dir);
  if (!fs.statSync(dirPath).isDirectory()) continue;

  const files = fs.readdirSync(dirPath);
  const gltfFile = files.find(f => f.endsWith('.gltf'));
  const glbFile = files.find(f => f.endsWith('.glb'));

  let info = {
    folder: dir,
    format: gltfFile ? 'gltf' : (glbFile ? 'glb' : 'none'),
    file: gltfFile || glbFile || null,
    subfiles: files
  };

  if (gltfFile) {
    try {
      const gltfContent = JSON.parse(fs.readFileSync(path.join(dirPath, gltfFile), 'utf8'));
      const scene = gltfContent.scenes?.[gltfContent.scene || 0];
      const nodes = gltfContent.nodes || [];
      const meshes = gltfContent.meshes || [];
      const materials = gltfContent.materials?.map((m) => m.name) || [];
      const textures = gltfContent.images?.map((i) => i.uri) || [];

      // Check accessors for positions min/max
      let minBounds = [Infinity, Infinity, Infinity];
      let maxBounds = [-Infinity, -Infinity, -Infinity];

      if (gltfContent.accessors) {
        for (const acc of gltfContent.accessors) {
          if (acc.type === 'VEC3' && acc.min && acc.max) {
            const isPos = meshes.some((m) =>
              m.primitives?.some((p) => p.attributes?.POSITION !== undefined && gltfContent.accessors[p.attributes.POSITION] === acc)
            );
            if (isPos) {
              for (let i = 0; i < 3; i++) {
                minBounds[i] = Math.min(minBounds[i], acc.min[i]);
                maxBounds[i] = Math.max(maxBounds[i], acc.max[i]);
              }
            }
          }
        }
      }

      info = {
        ...info,
        nodesCount: nodes.length,
        meshesCount: meshes.length,
        materials,
        textures,
        minBounds: minBounds[0] !== Infinity ? minBounds : null,
        maxBounds: maxBounds[0] !== -Infinity ? maxBounds : null,
      };
    } catch (err) {
      info.error = err.message;
    }
  }

  summary.push(info);
}

fs.writeFileSync('/home/bug/sampler/scratch_model_summary.json', JSON.stringify(summary, null, 2));
console.log('Saved summary to /home/bug/sampler/scratch_model_summary.json');
