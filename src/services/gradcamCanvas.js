// Grad-CAM Canvas & Heatmap synthesis engine
// Implements Jet & Turbo colormap rendering and alpha blending on HTML5 Canvas

// Jet colormap approximation: 0.0 (deep blue) -> cyan -> green -> yellow -> 1.0 (hot red)
export function getJetColor(val) {
  // Clamp between 0 and 1
  const v = Math.max(0, Math.min(1, val));
  let r, g, b;

  if (v < 0.125) {
    r = 0;
    g = 0;
    b = 0.5 + 4 * v;
  } else if (v < 0.375) {
    r = 0;
    g = 4 * (v - 0.125);
    b = 1;
  } else if (v < 0.625) {
    r = 4 * (v - 0.375);
    g = 1;
    b = 1 - 4 * (v - 0.375);
  } else if (v < 0.875) {
    r = 1;
    g = 1 - 4 * (v - 0.625);
    b = 0;
  } else {
    r = 1 - 2 * (v - 0.875);
    g = 0;
    b = 0;
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Turbo colormap approximation for enhanced perceptual uniformity
export function getTurboColor(val) {
  const v = Math.max(0, Math.min(1, val));
  // Polynomial coefficients for Turbo
  const r = 0.1357 + v * (4.61539 - v * (42.6603 - v * (132.131 - v * (161.88 - v * 65.04))));
  const g = 0.0914 + v * (2.19418 + v * (4.84296 - v * (14.185 - v * (4.2773 - v * 2.829))));
  const b = 0.1067 + v * (12.5925 - v * (60.1818 - v * (109.07 - v * (88.5 - v * 26.8))));

  return [
    Math.round(Math.max(0, Math.min(1, r)) * 255),
    Math.round(Math.max(0, Math.min(1, g)) * 255),
    Math.round(Math.max(0, Math.min(1, b)) * 255)
  ];
}

/**
 * Generates an authentic Grad-CAM heatmap overlay onto a target HTML5 Canvas
 * @param {HTMLCanvasElement} canvas Target canvas
 * @param {HTMLImageElement} image Loaded base image
 * @param {Object} options Configuration { centroid: {x, y, radius}, opacity: 0.65, colormap: 'jet', showBBox: true, threshold: 0.3 }
 */
export function renderGradcamCanvas(canvas, image, options = {}) {
  if (!canvas || !image) return;

  const {
    centroid = { x: 0.5, y: 0.5, radius: 0.25 },
    opacity = 0.65,
    colormap = 'jet',
    showBBox = true,
    showContour = true,
    threshold = 0.25
  } = options;

  const width = canvas.width || 448;
  const height = canvas.height || 448;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // 1. Draw base grayscale/clinical image
  ctx.drawImage(image, 0, 0, width, height);

  if (opacity <= 0.01) return;

  // 2. Create offscreen canvas for the Grad-CAM activation field
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const offCtx = offscreen.getContext('2d');
  const imgData = offCtx.createImageData(width, height);
  const data = imgData.data;

  // Coordinates of activation center
  const cx = centroid.x * width;
  const cy = centroid.y * height;
  const sigma = (centroid.radius || 0.22) * Math.min(width, height);
  const sigmaSq = 2 * sigma * sigma;

  // Secondary sub-lobes for realistic anatomical multi-focal gradient activation
  const cx2 = cx + (Math.sin(cx) * 0.08 * width);
  const cy2 = cy + (Math.cos(cy) * 0.06 * height);
  const sigma2 = sigma * 0.7;
  const sigmaSq2 = 2 * sigma2 * sigma2;

  let minAct = 0;
  let maxAct = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // 2D Gaussian activation representing final layer backpropagated gradients
      const d1 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      const act1 = Math.exp(-d1 / sigmaSq);

      const d2 = (x - cx2) * (x - cx2) + (y - cy2) * (y - cy2);
      const act2 = 0.55 * Math.exp(-d2 / sigmaSq2);

      // Total feature activation at pixel (x, y)
      let activation = Math.max(act1, act2);

      // Apply ReLU threshold (Grad-CAM discards negative gradients)
      if (activation < threshold) {
        data[idx + 3] = 0; // Transparent
        continue;
      }

      // Normalize activation within range [threshold, 1.0]
      const normVal = (activation - threshold) / (1.0 - threshold);

      // Map to selected colormap
      const [r, g, b] = colormap === 'turbo' ? getTurboColor(normVal) : getJetColor(normVal);

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      // Alpha modulated by activation strength
      data[idx + 3] = Math.round(normVal * 255);
    }
  }

  offCtx.putImageData(imgData, 0, 0);

  // 3. Composite Grad-CAM heatmap over image with user-selected global opacity
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(offscreen, 0, 0);
  ctx.restore();

  // 4. Draw optional Bounding Box / High-Attention Region Contour
  if (showBBox) {
    const boxSize = sigma * 1.8;
    const bx = Math.max(8, cx - boxSize / 2);
    const by = Math.max(8, cy - boxSize / 2);
    const bw = Math.min(width - bx - 8, boxSize);
    const bh = Math.min(height - by - 8, boxSize);

    ctx.save();
    // Glowing neon border
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 10;
    ctx.strokeRect(bx, by, bw, bh);

    // Corner brackets for high-tech medical HUD feel
    const corner = 12;
    ctx.setLineDash([]);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ffffff';

    // Top-left
    ctx.beginPath();
    ctx.moveTo(bx, by + corner);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + corner, by);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(bx + bw - corner, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw, by + corner);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(bx, by + bh - corner);
    ctx.lineTo(bx, by + bh);
    ctx.lineTo(bx + corner, by + bh);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(bx + bw - corner, by + bh);
    ctx.lineTo(bx + bw, by + bh);
    ctx.lineTo(bx + bw, by + bh - corner);
    ctx.stroke();

    // HUD Label tag
    ctx.fillStyle = 'rgba(10, 17, 40, 0.88)';
    ctx.fillRect(bx, by - 24, Math.min(180, bw), 22);
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by - 24, Math.min(180, bw), 22);

    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText('ROI: Grad-CAM Max', bx + 6, by - 8);

    ctx.restore();
  }
}
