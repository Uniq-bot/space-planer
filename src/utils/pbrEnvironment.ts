import * as THREE from 'three';

let cachedRenderTarget: THREE.WebGLRenderTarget | null = null;
let cachedEnvTexture: THREE.Texture | null = null;
let currentRenderer: THREE.WebGLRenderer | null = null;

/**
 * Creates or retrieves a balanced architectural studio/sky PMREM environment map.
 * Provides natural diffuse irradiance and crisp specular reflections for all PBR materials
 * (glass, chrome, mirrors, polished marble, and glTF models).
 */
export function getArchitecturalEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  if (cachedEnvTexture && currentRenderer === renderer) {
    return cachedEnvTexture;
  }

  // Dispose previous render target and texture if renderer changed
  disposeEnvironment();
  currentRenderer = renderer;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Natural architectural sky-to-horizon-to-ground gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0.0, '#f1f5f9'); // Clean skylight / ceiling zenith
  grad.addColorStop(0.35, '#e2e8f0'); // Ambient sky blue-grey
  grad.addColorStop(0.48, '#cbd5e1'); // Horizon neutral
  grad.addColorStop(0.50, '#e2e8f0'); // Subtle warm interior wall bounce line
  grad.addColorStop(0.52, '#94a3b8'); // Warm floor line
  grad.addColorStop(0.80, '#475569'); // Mid tone ambient ground
  grad.addColorStop(1.0, '#334155'); // Deep floor tone for contrast
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Primary large architectural window softbox (adds realistic reflections on chrome & glass)
  const windowGrad1 = ctx.createLinearGradient(200, 80, 440, 220);
  windowGrad1.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  windowGrad1.addColorStop(0.7, 'rgba(240, 246, 255, 0.85)');
  windowGrad1.addColorStop(1, 'rgba(220, 235, 255, 0.4)');
  ctx.fillStyle = windowGrad1;
  ctx.fillRect(200, 80, 240, 140);

  // Window mullion bars for architectural reflection details
  ctx.fillStyle = 'rgba(71, 85, 105, 0.4)';
  ctx.fillRect(318, 80, 4, 140);
  ctx.fillRect(200, 148, 240, 4);

  // 3. Secondary warm accent window / luminaire bounce
  const windowGrad2 = ctx.createLinearGradient(720, 100, 880, 200);
  windowGrad2.addColorStop(0, 'rgba(255, 250, 235, 0.88)');
  windowGrad2.addColorStop(1, 'rgba(254, 243, 199, 0.3)');
  ctx.fillStyle = windowGrad2;
  ctx.fillRect(720, 100, 160, 100);

  const envTexture = new THREE.CanvasTexture(canvas);
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  envTexture.colorSpace = THREE.SRGBColorSpace;

  cachedRenderTarget = pmremGenerator.fromEquirectangular(envTexture);
  cachedEnvTexture = cachedRenderTarget.texture;

  pmremGenerator.dispose();
  envTexture.dispose();

  return cachedEnvTexture;
}

export function disposeEnvironment() {
  if (cachedRenderTarget) {
    cachedRenderTarget.dispose();
    cachedRenderTarget = null;
  }
  if (cachedEnvTexture) {
    cachedEnvTexture.dispose();
    cachedEnvTexture = null;
  }
  currentRenderer = null;
}
