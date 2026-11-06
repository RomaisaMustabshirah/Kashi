// =====================================================
//  KASHI — Step 1: draw a tiling
// =====================================================

// ---- 1. Grab the canvas and its 2D drawing context ----
const canvas = document.getElementById("art");
const ctx = canvas.getContext("2d");

// ---- 2. Settings we will turn into sliders later ----
const settings = {
  tileSize: 90,          // edge length of each polygon, in pixels
  background: "#f4efe4", // warm off-white, like glazed tile
  lineColor: "#1b3f8b",  // Multani cobalt blue
};

// ---- 3. Tilings ----
// Every tiling is described the same way:
//   v1, v2 : two "lattice vectors" — how far to step to the next copy
//   cell   : the polygon(s) that make up ONE copy
// Repeating the cell at every i*v1 + j*v2 covers the whole plane.
const TILINGS = {
  square(a) {
    return {
      v1: { x: a, y: 0 },
      v2: { x: 0, y: a },
      cell: [
        [ { x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: a }, { x: 0, y: a } ],
      ],
    };
  },
};

// ---- 4. Repeat the cell across the screen ----
function buildPolygons(tiling, width, height) {
  const { v1, v2, cell } = tiling;
  const cx = width / 2;
  const cy = height / 2;

  // How far from the centre we need to cover (half the screen diagonal + a margin)
  const len1 = Math.hypot(v1.x, v1.y);
  const len2 = Math.hypot(v2.x, v2.y);
  const reach = Math.hypot(width, height) / 2 + 2 * Math.max(len1, len2);

  // How many steps in each direction are enough to get that far
  const n = Math.ceil(reach / (Math.min(len1, len2) * 0.5)) + 1;

  const polygons = [];
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      // Position of this copy of the cell
      const ox = cx + i * v1.x + j * v2.x;
      const oy = cy + i * v1.y + j * v2.y;

      // Skip copies that are far off-screen
      if (Math.hypot(ox - cx, oy - cy) > reach) continue;

      // Move every polygon of the cell to this position
      for (const shape of cell) {
        polygons.push(shape.map(p => ({ x: p.x + ox, y: p.y + oy })));
      }
    }
  }
  return polygons;
}

// ---- 5. Draw one polygon as a closed outline ----
function drawPolygon(points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let k = 1; k < points.length; k++) {
    ctx.lineTo(points[k].x, points[k].y);
  }
  ctx.closePath();
  ctx.stroke();
}

// ---- 6. Draw the whole picture ----
function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // Background
  ctx.fillStyle = settings.background;
  ctx.fillRect(0, 0, width, height);

  // Tiling
  const tiling = TILINGS.square(settings.tileSize);
  const polygons = buildPolygons(tiling, width, height);

  ctx.strokeStyle = settings.lineColor;
  ctx.lineWidth = 1.5;
  for (const poly of polygons) drawPolygon(poly);
}

// ---- 7. Keep the canvas sharp and full-screen ----
function resize() {
  const dpr = window.devicePixelRatio || 1;   // 2 on most phones / retina screens
  canvas.width = canvas.clientWidth * dpr;    // real pixels
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);     // so we can keep drawing in CSS pixels
  draw();
}

window.addEventListener("resize", resize);
resize();