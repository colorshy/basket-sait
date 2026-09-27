import * as THREE from 'three';

/**
 * Creates high-fidelity PBR textures for the authentic Molten-style basketball
 * based on the user's reference photograph:
 * - Rich burnt caramel / horween orange leather panels
 * - Iconic curved cream / off-white accent bands
 * - Recessed black rubber seam channels
 * - Micro-pebble tactile grain with normal / roughness variations
 */
export function createAuthenticBasketballTextures() {
  const width = 2048;
  const height = 1024;

  // 1. BUMP / HEIGHT MAP
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d');

  // Fill mid-grey (neutral elevation)
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);

  // Micro-pebble generation
  const pebbleRadius = 3.6;
  const stepX = 6.2;
  const stepY = 6.2;

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const jx = (Math.random() - 0.5) * 2.0;
      const jy = (Math.random() - 0.5) * 2.0;
      const r = pebbleRadius * (0.8 + Math.random() * 0.4);

      const grad = bCtx.createRadialGradient(
        x + jx, y + jy, 0,
        x + jx, y + jy, r
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.65, '#999999');
      grad.addColorStop(1, '#505050');

      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(x + jx, y + jy, r, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  // Micro-surface noise
  const bumpImg = bCtx.getImageData(0, 0, width, height);
  const bData = bumpImg.data;
  for (let i = 0; i < bData.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    bData[i] = Math.min(255, Math.max(0, bData[i] + n));
    bData[i + 1] = Math.min(255, Math.max(0, bData[i + 1] + n));
    bData[i + 2] = Math.min(255, Math.max(0, bData[i + 2] + n));
  }
  bCtx.putImageData(bumpImg, 0, 0);

  // 2. COLOR / DIFFUSE MAP (Exact Molten colorway from photo)
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const cCtx = colorCanvas.getContext('2d');

  // Base Burnt Terracotta / Leather Orange
  const leatherGrad = cCtx.createLinearGradient(0, 0, width, height);
  leatherGrad.addColorStop(0, '#BA5526');
  leatherGrad.addColorStop(0.3, '#A8451B');
  leatherGrad.addColorStop(0.7, '#C25D2D');
  leatherGrad.addColorStop(1, '#9C3E14');
  cCtx.fillStyle = leatherGrad;
  cCtx.fillRect(0, 0, width, height);

  // Draw the iconic Molten-style curved cream bands
  cCtx.fillStyle = '#E6DCBA';
  cCtx.strokeStyle = '#222222';
  cCtx.lineWidth = 14;

  // We draw two wide undulating wave bands representing the FIBA 12-panel cream accents
  const drawCreamBand = (offsetY, amp) => {
    cCtx.beginPath();
    cCtx.moveTo(0, offsetY);
    for (let x = 0; x <= width; x += 20) {
      const y = offsetY + Math.sin((x / width) * Math.PI * 4) * amp;
      cCtx.lineTo(x, y);
    }
    cCtx.lineTo(width, offsetY + 110);
    for (let x = width; x >= 0; x -= 20) {
      const y = offsetY + 110 + Math.sin((x / width) * Math.PI * 4) * amp;
      cCtx.lineTo(x, y);
    }
    cCtx.closePath();
    cCtx.fillStyle = '#E5DAC0';
    cCtx.fill();

    // Weathering & shadow along cream band edges
    cCtx.strokeStyle = 'rgba(60, 30, 10, 0.4)';
    cCtx.lineWidth = 4;
    cCtx.stroke();
  };

  drawCreamBand(240, 65);
  drawCreamBand(680, -65);

  // Overlay the micro-pebble texture onto color canvas
  cCtx.globalAlpha = 0.28;
  cCtx.drawImage(bumpCanvas, 0, 0);
  cCtx.globalAlpha = 1.0;

  // Draw the Recessed Black Rubber Channel Seams (Standard Basketball Seam Topology)
  cCtx.strokeStyle = '#121214';
  cCtx.lineWidth = 12;
  cCtx.lineCap = 'round';
  cCtx.lineJoin = 'round';

  // Equator seam
  cCtx.beginPath();
  cCtx.moveTo(0, height / 2);
  cCtx.lineTo(width, height / 2);
  cCtx.stroke();

  // Vertical meridians
  for (let col = 1; col <= 4; col++) {
    const x = (width / 4) * col - (width / 8);
    cCtx.beginPath();
    cCtx.moveTo(x, 0);
    cCtx.lineTo(x, height);
    cCtx.stroke();
  }

  // Curved ribs (the two signature side-arches)
  cCtx.beginPath();
  for (let x = 0; x <= width; x += 15) {
    const y = height / 2 + Math.sin((x / width) * Math.PI * 2) * (height * 0.38);
    if (x === 0) cCtx.moveTo(x, y);
    else cCtx.lineTo(x, y);
  }
  cCtx.stroke();

  cCtx.beginPath();
  for (let x = 0; x <= width; x += 15) {
    const y = height / 2 - Math.sin((x / width) * Math.PI * 2) * (height * 0.38);
    if (x === 0) cCtx.moveTo(x, y);
    else cCtx.lineTo(x, y);
  }
  cCtx.stroke();

  // Subtle engraved brand imprint in center panel
  cCtx.save();
  cCtx.font = 'bold 36px "Space Grotesk", sans-serif';
  cCtx.fillStyle = 'rgba(40, 20, 10, 0.65)';
  cCtx.textAlign = 'center';
  cCtx.letterSpacing = '6px';
  cCtx.fillText('KNTIC // 01', width * 0.38, height * 0.48);
  cCtx.restore();

  // Also depress the seam channels into the bump map so they appear physically indented
  bCtx.strokeStyle = '#101010';
  bCtx.lineWidth = 16;
  bCtx.beginPath();
  bCtx.moveTo(0, height / 2);
  bCtx.lineTo(width, height / 2);
  bCtx.stroke();

  for (let col = 1; col <= 4; col++) {
    const x = (width / 4) * col - (width / 8);
    bCtx.beginPath();
    bCtx.moveTo(x, 0);
    bCtx.lineTo(x, height);
    bCtx.stroke();
  }

  bCtx.beginPath();
  for (let x = 0; x <= width; x += 15) {
    const y = height / 2 + Math.sin((x / width) * Math.PI * 2) * (height * 0.38);
    if (x === 0) bCtx.moveTo(x, y);
    else bCtx.lineTo(x, y);
  }
  bCtx.stroke();

  bCtx.beginPath();
  for (let x = 0; x <= width; x += 15) {
    const y = height / 2 - Math.sin((x / width) * Math.PI * 2) * (height * 0.38);
    if (x === 0) bCtx.moveTo(x, y);
    else bCtx.lineTo(x, y);
  }
  bCtx.stroke();

  // 3. ROUGHNESS MAP
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width / 2;
  roughCanvas.height = height / 2;
  const rCtx = roughCanvas.getContext('2d');
  rCtx.fillStyle = '#b0b0b0'; // matte baseline
  rCtx.fillRect(0, 0, width / 2, height / 2);
  rCtx.globalAlpha = 0.35;
  rCtx.drawImage(bumpCanvas, 0, 0, width / 2, height / 2);

  // Convert to Three.js textures
  const colorTexture = new THREE.CanvasTexture(colorCanvas);
  colorTexture.wrapS = THREE.RepeatWrapping;
  colorTexture.wrapT = THREE.ClampToEdgeWrapping;

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.ClampToEdgeWrapping;

  const roughTexture = new THREE.CanvasTexture(roughCanvas);
  roughTexture.wrapS = THREE.RepeatWrapping;
  roughTexture.wrapT = THREE.ClampToEdgeWrapping;

  return { colorTexture, bumpTexture, roughTexture };
}
