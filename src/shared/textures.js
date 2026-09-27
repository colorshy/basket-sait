import * as THREE from 'three';

// Generate procedural PBR textures for realistic basketball leather
export function createBasketballTextures() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 1. Base pebble pattern generator for bump map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 1024;
  bumpCanvas.height = 1024;
  const bCtx = bumpCanvas.getContext('2d');

  // Fill neutral grey
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 1024, 1024);

  // Micro-pebbles grid with jitter
  const pebbleSize = 5;
  const spacing = 7.5;
  bCtx.fillStyle = '#ffffff';

  for (let y = 0; y < 1024; y += spacing) {
    for (let x = 0; x < 1024; x += spacing) {
      const offsetX = (Math.random() - 0.5) * 2;
      const offsetY = (Math.random() - 0.5) * 2;
      const radius = (pebbleSize / 2) * (0.8 + Math.random() * 0.4);

      const grad = bCtx.createRadialGradient(
        x + offsetX, y + offsetY, 0,
        x + offsetX, y + offsetY, radius
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.7, '#a0a0a0');
      grad.addColorStop(1, '#606060');

      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  // Micro-surface noise
  const bumpImageData = bCtx.getImageData(0, 0, 1024, 1024);
  const data = bumpImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  bCtx.putImageData(bumpImageData, 0, 0);

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.RepeatWrapping;
  bumpTexture.repeat.set(4, 4);

  // 2. Color texture generators for different leather finishes
  function createColorTexture(baseHex, pebbleHighlightHex) {
    const cCanvas = document.createElement('canvas');
    cCanvas.width = 1024;
    cCanvas.height = 1024;
    const cCtx = cCanvas.getContext('2d');

    // Base fill
    cCtx.fillStyle = baseHex;
    cCtx.fillRect(0, 0, 1024, 1024);

    // Overlay subtle grain
    cCtx.globalAlpha = 0.35;
    cCtx.drawImage(bumpCanvas, 0, 0);
    cCtx.globalAlpha = 1.0;

    // Tint blend
    cCtx.globalCompositeOperation = 'multiply';
    cCtx.fillStyle = baseHex;
    cCtx.fillRect(0, 0, 1024, 1024);
    cCtx.globalCompositeOperation = 'source-over';

    const tex = new THREE.CanvasTexture(cCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }

  // 3. Roughness texture
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rCtx = roughCanvas.getContext('2d');
  rCtx.fillStyle = '#b0b0b0'; // matte leather
  rCtx.fillRect(0, 0, 512, 512);
  rCtx.globalAlpha = 0.2;
  rCtx.drawImage(bumpCanvas, 0, 0, 512, 512);
  const roughTexture = new THREE.CanvasTexture(roughCanvas);
  roughTexture.wrapS = THREE.RepeatWrapping;
  roughTexture.wrapT = THREE.RepeatWrapping;
  roughTexture.repeat.set(3, 3);

  return {
    bumpTexture,
    roughTexture,
    orangeTexture: createColorTexture('#C84B1E', '#E0622C'),
    blackTexture: createColorTexture('#1A1A1A', '#2C2C2C'),
    terracottaTexture: createColorTexture('#B24522', '#D05830'),
    parchmentTexture: createColorTexture('#E8E3D8', '#F5F1E8'),
    graphiteTexture: createColorTexture('#323438', '#4A4D54')
  };
}
