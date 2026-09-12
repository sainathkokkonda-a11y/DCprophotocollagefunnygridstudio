let images = [];
let activeIndex = 0;
const canvas = document.getElementById('pro-canvas');
const ctx = canvas.getContext('2d');

let isDragging = false;
let startX, startY;
let layoutSlots = [];

function handleImageUpload(e) {
  const files = Array.from(e.target.files).slice(0, 9);
  if (files.length === 0) return;

  images = [];
  const photoSelect = document.getElementById('active-photo');
  photoSelect.innerHTML = '';

  let loaded = 0;
  files.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = function(evt) {
      const img = new Image();
      img.onload = function() {
        images[idx] = {
          img: img,
          offsetX: 0,
          offsetY: 0,
          zoom: 1,
          brightness: 100,
          contrast: 100,
          grayscale: 0,
          sepia: 0,
          blur: 0
        };
        loaded++;

        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `Photo ${idx + 1}`;
        photoSelect.appendChild(opt);

        if (loaded === files.length) {
          document.getElementById('preview-section').style.display = 'block';
          document.getElementById('adjust-controls').style.display = 'block';
          activeIndex = 0;
          syncControlsWithActivePhoto();
          renderCollage();
        }
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderCollage() {
  if (images.length === 0) return;

  const ratio = document.getElementById('pro-ratio').value;
  const layout = document.getElementById('pro-layout').value;
  const gap = parseInt(document.getElementById('border-gap').value);
  const radius = parseInt(document.getElementById('corner-radius').value);
  const borderColor = document.getElementById('border-color').value;

  let w = 1200, h = 1200;
  if (ratio === '9:16') h = 2133;
  else if (ratio === '4:5') h = 1500;
  else if (ratio === '16:9') h = 675;

  canvas.width = w;
  canvas.height = h;

  ctx.fillStyle = borderColor;
  ctx.fillRect(0, 0, w, h);

  layoutSlots = getLayoutSlots(layout, w, h, gap);

  // Special Creative Layout Renders
  if (layout === 'polaroid-stack') {
    drawPolaroidStackLayout(w, h, borderColor);
  } 
  else if (layout === 'heart-center') {
    drawCenterShapeLayout(w, h, gap, radius, 'heart');
  }
  else if (layout === 'circle-center') {
    drawCenterShapeLayout(w, h, gap, radius, 'circle');
  }
  else {
    // Standard Grids & Comic
    layoutSlots.forEach((slot, i) => {
      if (images[i]) {
        drawInteractiveImage(images[i], slot.x, slot.y, slot.w, slot.h, radius, i === activeIndex);
      }
    });
  }

  renderWatermark(w, h);
}

function getLayoutSlots(layout, w, h, gap) {
  let slots = [];
  if (layout === '2-grid') {
    let hw = (w - gap) / 2;
    slots = [{x: 0, y: 0, w: hw, h: h}, {x: hw + gap, y: 0, w: hw, h: h}];
  } else if (layout === '3-grid') {
    let hw = (w - gap) / 2, hh = (h - gap) / 2;
    slots = [{x: 0, y: 0, w: hw, h: h}, {x: hw + gap, y: 0, w: hw, h: hh}, {x: hw + gap, y: hh + gap, w: hw, h: hh}];
  } else if (layout === '4-grid') {
    let hw = (w - gap) / 2, hh = (h - gap) / 2;
    slots = [
      {x: 0, y: 0, w: hw, h: hh}, {x: hw + gap, y: 0, w: hw, h: hh},
      {x: 0, y: hh + gap, w: hw, h: hh}, {x: hw + gap, y: hh + gap, w: hw, h: hh}
    ];
  } else if (layout === '6-grid') {
    let cw = (w - 2 * gap) / 3, ch = (h - gap) / 2;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        slots.push({x: c * (cw + gap), y: r * (ch + gap), w: cw, h: ch});
      }
    }
  } else if (layout === '9-grid') {
    let cw = (w - 2 * gap) / 3, ch = (h - 2 * gap) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        slots.push({x: c * (cw + gap), y: r * (ch + gap), w: cw, h: ch});
      }
    }
  } else if (layout === 'comic-grid') {
    let w1 = (w - gap) * 0.6, w2 = (w - gap) * 0.4;
    let h1 = (h - gap) * 0.5;
    slots = [
      {x: 0, y: 0, w: w1, h: h1},
      {x: w1 + gap, y: 0, w: w2, h: h},
      {x: 0, y: h1 + gap, w: w1, h: h1}
    ];
  } else if (layout === 'heart-center' || layout === 'circle-center' || layout === 'polaroid-stack') {
    let hw = (w - gap) / 2, hh = (h - gap) / 2;
    slots = [
      {x: 0, y: 0, w: hw, h: hh}, {x: hw + gap, y: 0, w: hw, h: hh},
      {x: 0, y: hh + gap, w: hw, h: hh}, {x: hw + gap, y: hh + gap, w: hw, h: hh}
    ];
  }
  return slots;
}

function drawInteractiveImage(item, x, y, width, height, r, isActive) {
  ctx.save();
  ctx.filter = `brightness(${item.brightness}%) contrast(${item.contrast}%) grayscale(${item.grayscale}%) sepia(${item.sepia}%) blur(${item.blur}px)`;

  if (r > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, r);
    ctx.clip();
  }

  const img = item.img;
  const zoom = item.zoom;
  const imgRatio = img.width / img.height;
  const targetRatio = width / height;

  let sw, sh;
  if (imgRatio > targetRatio) {
    sh = img.height / zoom;
    sw = (img.height * targetRatio) / zoom;
  } else {
    sw = img.width / zoom;
    sh = (img.width / targetRatio) / zoom;
  }

  let sx = (img.width - sw) / 2 + item.offsetX;
  let sy = (img.height - sh) / 2 + item.offsetY;

  ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
  ctx.restore();

  if (isActive) {
    ctx.save();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1565c0';
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }
}

function drawPolaroidStackLayout(w, h, bgColor) {
  const cardW = w * 0.42;
  const cardH = h * 0.45;
  const pos = [
    { x: w * 0.05, y: h * 0.04, angle: -0.06 },
    { x: w * 0.52, y: h * 0.04, angle: 0.06 },
    { x: w * 0.05, y: h * 0.5, angle: 0.05 },
    { x: w * 0.52, y: h * 0.5, angle: -0.05 }
  ];

  images.forEach((item, i) => {
    if (i > 3) return;
    const p = pos[i];

    ctx.save();
    ctx.translate(p.x + cardW / 2, p.y + cardH / 2);
    ctx.rotate(p.angle);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 12;
    ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

    ctx.shadowColor = 'transparent';
    drawInteractiveImage(item, -cardW / 2 + 15, -cardH / 2 + 15, cardW - 30, cardH - 80, 0, i === activeIndex);

    ctx.restore();
  });
}

function drawCenterShapeLayout(w, h, gap, r, shapeType) {
  const hw = (w - gap) / 2;
  const hh = (h - gap) / 2;
  const baseSlots = [
    {x: 0, y: 0, w: hw, h: hh}, {x: hw + gap, y: 0, w: hw, h: hh},
    {x: 0, y: hh + gap, w: hw, h: hh}, {x: hw + gap, y: hh + gap, w: hw, h: hh}
  ];

  baseSlots.forEach((slot, i) => {
    if (images[i]) {
      drawInteractiveImage(images[i], slot.x, slot.y, slot.w, slot.h, r, i === activeIndex);
    }
  });

  if (images[0]) {
    const centerImg = images[0];
    const size = Math.min(w, h) * 0.4;
    const cx = w / 2;
    const cy = h / 2;

    ctx.save();
    ctx.beginPath();

    if (shapeType === 'circle') {
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    } else if (shapeType === 'heart') {
      let topCurveHeight = size * 0.3;
      ctx.moveTo(cx, cy + size * 0.35);
      ctx.bezierCurveTo(cx, cy + size * 0.3, cx - size * 0.5, cy, cx - size * 0.5, cy - topCurveHeight);
      ctx.bezierCurveTo(cx - size * 0.5, cy - size * 0.5, cx, cy - size * 0.5, cx, cy - topCurveHeight + 20);
      ctx.bezierCurveTo(cx, cy - size * 0.5, cx + size * 0.5, cy - size * 0.5, cx + size * 0.5, cy - topCurveHeight);
      ctx.bezierCurveTo(cx + size * 0.5, cy, cx, cy + size * 0.3, cx, cy + size * 0.35);
    }

    ctx.closePath();
    ctx.lineWidth = 12;
    ctx.strokeStyle = document.getElementById('border-color').value;
    ctx.stroke();
    ctx.clip();

    drawInteractiveImage(centerImg, cx - size / 2, cy - size / 2, size, size, 0, activeIndex === 0);
    ctx.restore();
  }
}

function syncControlsWithActivePhoto() {
  const item = images[activeIndex];
  if (!item) return;
  document.getElementById('active-photo').value = activeIndex;
  document.getElementById('filter-brightness').value = item.brightness;
  document.getElementById('filter-contrast').value = item.contrast;
  document.getElementById('filter-grayscale').value = item.grayscale;
  document.getElementById('filter-sepia').value = item.sepia;
  document.getElementById('filter-blur').value = item.blur;
}

function onActivePhotoChange() {
  activeIndex = parseInt(document.getElementById('active-photo').value);
  syncControlsWithActivePhoto();
  renderCollage();
}

function updateActiveFilter() {
  const item = images[activeIndex];
  if (!item) return;
  item.brightness = document.getElementById('filter-brightness').value;
  item.contrast = document.getElementById('filter-contrast').value;
  item.grayscale = document.getElementById('filter-grayscale').value;
  item.sepia = document.getElementById('filter-sepia').value;
  item.blur = document.getElementById('filter-blur').value;
  renderCollage();
}

function adjustZoom(amount) {
  const item = images[activeIndex];
  if (!item) return;
  item.zoom = Math.max(0.5, Math.min(3.0, item.zoom + amount));
  renderCollage();
}

function resetActivePhoto() {
  const item = images[activeIndex];
  if (!item) return;
  item.offsetX = 0;
  item.offsetY = 0;
  item.zoom = 1;
  item.brightness = 100;
  item.contrast = 100;
  item.grayscale = 0;
  item.sepia = 0;
  item.blur = 0;
  syncControlsWithActivePhoto();
  renderCollage();
}

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function startDrag(e) {
  const p = getCanvasPos(e);
  
  layoutSlots.forEach((slot, idx) => {
    if (p.x >= slot.x && p.x <= slot.x + slot.w && p.y >= slot.y && p.y <= slot.y + slot.h) {
      if (images[idx]) {
        activeIndex = idx;
        syncControlsWithActivePhoto();
      }
    }
  });

  isDragging = true;
  startX = p.x;
  startY = p.y;
  renderCollage();
}

function moveDrag(e) {
  if (!isDragging) return;
  const p = getCanvasPos(e);
  const dx = (p.x - startX);
  const dy = (p.y - startY);

  const item = images[activeIndex];
  if (item) {
    item.offsetX -= dx * 0.8;
    item.offsetY -= dy * 0.8;
    renderCollage();
  }
  startX = p.x;
  startY = p.y;
}

function stopDrag() { isDragging = false; }

canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('mousemove', moveDrag);
canvas.addEventListener('mouseup', stopDrag);

canvas.addEventListener('touchstart', startDrag);
canvas.addEventListener('touchmove', moveDrag);
canvas.addEventListener('touchend', stopDrag);

function renderWatermark(w, h) {
  const text = document.getElementById('watermark-text').value.trim();
  if (!text) return;
  ctx.save();
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 6;
  ctx.textAlign = 'right';
  ctx.fillText(text, w - 30, h - 30);
  ctx.restore();
}

function downloadCollage() {
  const link = document.createElement('a');
  link.download = 'pro_photo_collage.jpg';
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
}
