// =====================================================
//  KASHI — Step 2: six tilings + a picker
// =====================================================

// ---- 1. Grab the canvas and its 2D drawing context ----
const canvas = document.getElementById("art");
const ctx = canvas.getContext("2d");

// ---- 2. Settings we will turn into sliders later ----
const settings = {
  tileSize: 90,          // edge length of each polygon, in pixels
  background: "#f4efe4", // warm off-white, like glazed tile
  lineColor: "#1b3f8b",  // Multani cobalt blue
  tiling: "square",      // which tiling to draw (a key of TILINGS)
};

// ---- 3. Tilings ----
// Every tiling is described the same way:
//   v1, v2 : two "lattice vectors" — how far to step to the next copy
//   cell   : the polygon(s) that make up ONE copy
// Repeating the cell at every i*v1 + j*v2 covers the whole plane.

// ---- helper: regular polygon with n sides, centre (cx,cy), circumradius r, first vertex at angle startDeg ----
function regularPolygon(n, cx, cy, r, startDeg) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const ang = (startDeg + (360 / n) * k) * Math.PI / 180;
    pts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }
  return pts;
}

const SQRT3 = Math.sqrt(3);
const SQRT2 = Math.sqrt(2);

const TILINGS = {
  // 4.4.4.4 — squares
  square: {
    label: "Square (4.4.4.4)",
    make(a) {
      return {
        v1: { x: a, y: 0 },
        v2: { x: 0, y: a },
        cell: [
          [ { x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: a }, { x: 0, y: a } ],
        ],
      };
    },
  },

  // 6.6.6 — hexagons (pointy-top)
  hexagon: {
    label: "Hexagon (6.6.6)",
    make(a) {
      return {
        v1: { x: SQRT3 * a, y: 0 },
        v2: { x: SQRT3 * a / 2, y: 1.5 * a },
        cell: [ regularPolygon(6, 0, 0, a, 30) ],
      };
    },
  },

  // 3.3.3.3.3.3 — triangles (one pointing up, one pointing down per cell)
  triangle: {
    label: "Triangle (3.3.3.3.3.3)",
    make(a) {
      const h = SQRT3 / 2 * a;
      return {
        v1: { x: a, y: 0 },
        v2: { x: a / 2, y: h },
        cell: [
          [ { x: 0, y: 0 }, { x: a, y: 0 }, { x: a / 2, y: h } ],
          [ { x: a, y: 0 }, { x: 1.5 * a, y: h }, { x: a / 2, y: h } ],
        ],
      };
    },
  },

  // 4.8.8 — octagons + squares
  octagon: {
    label: "Octagon & Square (4.8.8)",
    make(a) {
      const w = a * (1 + SQRT2);              // distance between octagon centres
      const R = a / (2 * Math.sin(Math.PI / 8)); // octagon circumradius
      const d = a / SQRT2;                    // half-diagonal of the small square
      return {
        v1: { x: w, y: 0 },
        v2: { x: 0, y: w },
        cell: [
          regularPolygon(8, 0, 0, R, 22.5),
          [ { x: w / 2, y: w / 2 - d }, { x: w / 2 + d, y: w / 2 },
            { x: w / 2, y: w / 2 + d }, { x: w / 2 - d, y: w / 2 } ],
        ],
      };
    },
  },

  // 3.6.3.6 — hexagons + triangles (kagome / trihexagonal)
  kagome: {
    label: "Hexagon & Triangle (3.6.3.6)",
    make(a) {
      const h = SQRT3 / 2 * a;
      return {
        v1: { x: 2 * a, y: 0 },
        v2: { x: a, y: SQRT3 * a },
        cell: [
          regularPolygon(6, 0, 0, a, 0),
          [ { x: a, y: 0 }, { x: 1.5 * a, y: h }, { x: 0.5 * a, y: h } ],
          [ { x: -0.5 * a, y: h }, { x: 0.5 * a, y: h }, { x: 0, y: SQRT3 * a } ],
        ],
      };
    },
  },

  // 3.4.6.4 — hexagons + squares + triangles (rhombitrihexagonal)
  rhombi: {
    label: "Hexagon, Square & Triangle (3.4.6.4)",
    make(a) {
      const d = a * (SQRT3 + 1);             // distance between hexagon centres
      const dir = deg => ({ x: Math.cos(deg * Math.PI / 180), y: Math.sin(deg * Math.PI / 180) });
      const hexV = deg => ({ x: a * dir(deg).x, y: a * dir(deg).y });
      const add = (p, n) => ({ x: p.x + a * n.x, y: p.y + a * n.y });

      // a square sitting on the hexagon edge that faces direction `phi`
      const squareOn = phi => {
        const p1 = hexV(phi - 30), p2 = hexV(phi + 30), n = dir(phi);
        return [ p1, p2, add(p2, n), add(p1, n) ];
      };
      // a triangle in the gap at hexagon vertex `v`, between the squares facing `phiA` and `phiB`
      const triangleAt = (v, phiA, phiB) => {
        const V = hexV(v);
        return [ V, add(V, dir(phiA)), add(V, dir(phiB)) ];
      };

      return {
        v1: { x: d * Math.cos(Math.PI / 6), y: d * Math.sin(Math.PI / 6) },
        v2: { x: 0, y: d },
        cell: [
          regularPolygon(6, 0, 0, a, 0),
          squareOn(30), squareOn(90), squareOn(150),
          triangleAt(60, 30, 90),
          triangleAt(120, 90, 150),
        ],
      };
    },
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
  const tiling = TILINGS[settings.tiling].make(settings.tileSize);
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

// ---- 8. The tiling picker ----
const tilingSelect = document.getElementById("tiling");

// Fill the dropdown from the TILINGS object, so new tilings appear automatically
for (const [key, t] of Object.entries(TILINGS)) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = t.label;
  tilingSelect.appendChild(option);
}
tilingSelect.value = settings.tiling;

tilingSelect.addEventListener("change", () => {
  settings.tiling = tilingSelect.value;
  draw();
});

window.addEventListener("resize", resize);
resize();