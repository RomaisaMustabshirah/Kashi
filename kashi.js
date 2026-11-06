// =====================================================
//  KASHI — Step 5: breathe, randomize, export
// =====================================================

// ---- 1. Grab the canvas and its 2D drawing context ----
const canvas = document.getElementById("art");
const ctx = canvas.getContext("2d");

// ---- 2. Palettes ----
// bg      : background (the "glaze")
// outline : the dark edge of each strap
// strap   : the inside of each strap
// fills   : [main rosettes, smaller shapes]
const PALETTES = [
  { name: "Multani Kashi", bg: "#f4efe4", outline: "#1b3f8b", strap: "#f4efe4", fills: ["#2e9cc0", "#cfe6ec"] },
  { name: "Lapis Night",   bg: "#0c1633", outline: "#d6a84e", strap: "#0c1633", fills: ["#1f3a7a", "#152a5c"] },
  { name: "Terracotta",    bg: "#ead5b3", outline: "#6e2a14", strap: "#ead5b3", fills: ["#c0623a", "#e2b78a"] },
  { name: "Emerald Court", bg: "#0f3d35", outline: "#f1e3b5", strap: "#0f3d35", fills: ["#1f6b5c", "#175247"] },
  { name: "Ink & Paper",   bg: "#fbfaf6", outline: "#16181d", strap: "#fbfaf6", fills: ["#bdb6a6", "#e4e1d8"] },
  { name: "Rose Marble",   bg: "#f6e7e4", outline: "#5a2a3c", strap: "#f6e7e4", fills: ["#c9707f", "#efcfcf"] },
  { name: "Chaand Raat",   bg: "#E0AA3E", outline: "#151B54", strap: "#0E3A24", fills: ["#AB2330", "#B7410E"] },
];

// ---- 2b. Settings (every slider writes into this object) ----
const settings = {
  tiling: "octagon",     // which tiling to draw (a key of TILINGS)
  theta: 67.5,           // contact angle in degrees (0–90)
  delta: 0,              // ray offset from the edge midpoint (0–1)
  tileSize: 90,          // edge length of each polygon, in pixels
  rotation: 0,           // rotate the whole pattern, in degrees
  strapWidth: 6,         // thickness of the woven straps, in pixels
  palette: 0,            // index into PALETTES
  fill: true,            // colour the star rosettes
  showTiling: false,     // draw the faint polygon skeleton underneath
  breathe: false,        // animate θ gently back and forth
};

// How far θ swings either side when breathing, and how fast (radians per second)
const BREATHE_RANGE = 12;
const BREATHE_SPEED = 0.6;

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

// ---- 5. Hankin's method ----
// Where two rays  p + t*r  and  q + u*s  cross. Returns null if they never meet going forward.
function rayIntersection(p, r, q, s) {
  const cross = r.x * s.y - r.y * s.x;
  const qp = { x: q.x - p.x, y: q.y - p.y };

  if (Math.abs(cross) < 1e-9) {
    // Parallel rays. Special case: they lie on the SAME line and point at each other
    // (happens at one exact angle per polygon, e.g. 45° in a square). They "meet" in the middle.
    const sameLine = Math.abs(qp.x * r.y - qp.y * r.x) < 1e-6;
    const facing = qp.x * r.x + qp.y * r.y > 0;
    if (sameLine && facing) return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    return null;                                       // truly parallel: never meet
  }
  const t = (qp.x * s.y - qp.y * s.x) / cross;         // distance along ray 1
  const u = (qp.x * r.y - qp.y * r.x) / cross;         // distance along ray 2
  if (t <= 0 || u <= 0) return null;                   // they only "meet" behind a start point
  return { x: p.x + t * r.x, y: p.y + t * r.y };
}

// Turn ONE polygon into star-pattern line pieces.
// theta : contact angle in degrees (how steeply rays go inward)
// delta : 0..1, how far the two rays of each edge start apart from the midpoint
function hankinPolygon(points, theta, delta) {
  const n = points.length;
  const th = theta * Math.PI / 180;

  // centre of the polygon — used to know which side is "inside"
  let cx = 0, cy = 0;
  for (const p of points) { cx += p.x; cy += p.y; }
  cx /= n; cy /= n;

  // Step A: two rays per edge
  const edges = [];
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };   // unit vector along the edge
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };       // midpoint

    // inward normal: perpendicular to the edge, pointing toward the centre
    let nrm = { x: -d.y, y: d.x };
    if (nrm.x * (cx - m.x) + nrm.y * (cy - m.y) < 0) nrm = { x: d.y, y: -d.x };

    const off = delta * len / 2;
    edges.push({
      // ray A starts a little toward vertex a, and leans back toward a
      startA: { x: m.x - d.x * off, y: m.y - d.y * off },
      dirA:   { x: -d.x * Math.cos(th) + nrm.x * Math.sin(th),
                y: -d.y * Math.cos(th) + nrm.y * Math.sin(th) },
      // ray B starts a little toward vertex b, and leans toward b
      startB: { x: m.x + d.x * off, y: m.y + d.y * off },
      dirB:   { x: d.x * Math.cos(th) + nrm.x * Math.sin(th),
                y: d.y * Math.cos(th) + nrm.y * Math.sin(th) },
    });
  }

  // Step B: ray B of edge i meets ray A of edge i+1, near the corner they share
  const pieces = [];
  const rosette = [];      // outline of the central star, used for colour fills
  for (let i = 0; i < n; i++) {
    const e1 = edges[i];
    const e2 = edges[(i + 1) % n];
    const hit = rayIntersection(e1.startB, e1.dirB, e2.startA, e2.dirA);
    if (hit) pieces.push([ e1.startB, hit, e2.startA ]);   // a little "V" shape

    // walk around the star: along the edge (A → B), then out to the star point
    rosette.push(e1.startA, e1.startB);
    if (hit) rosette.push(hit);
  }

  // Only keep the rosette if every corner produced a star point
  return { pieces, rosette: pieces.length === n ? rosette : null };
}

// ---- 6. Drawing helpers ----
// Every helper takes the context `c` to draw on. That lets us draw the SAME picture
// on the screen canvas or on a big hidden canvas for exporting.

// Draw a list of points as a line. closed = true joins the last point back to the first.
function drawPath(c, points, closed) {
  c.beginPath();
  c.moveTo(points[0].x, points[0].y);
  for (let k = 1; k < points.length; k++) {
    c.lineTo(points[k].x, points[k].y);
  }
  if (closed) c.closePath();
  c.stroke();
}

// Fill a closed shape
function fillPath(c, points, color) {
  c.beginPath();
  c.moveTo(points[0].x, points[0].y);
  for (let k = 1; k < points.length; k++) c.lineTo(points[k].x, points[k].y);
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

// Put ALL star pieces into ONE path, so we can stroke thousands of lines in a single call
function buildStrapPath(c, allPieces) {
  c.beginPath();
  for (const piece of allPieces) {
    c.moveTo(piece[0].x, piece[0].y);
    for (let k = 1; k < piece.length; k++) c.lineTo(piece[k].x, piece[k].y);
  }
}

// ---- 7. Draw the whole picture ----
// c      : the canvas context to draw on
// width, height : size of the picture in CSS pixels
// theta  : the contact angle to use (may differ from the slider while breathing)
function renderPattern(c, width, height, theta) {
  const pal = PALETTES[settings.palette];

  // Background
  c.fillStyle = pal.bg;
  c.fillRect(0, 0, width, height);

  // Rotate the whole drawing around the centre of the picture
  c.save();
  c.translate(width / 2, height / 2);
  c.rotate(settings.rotation * Math.PI / 180);
  c.translate(-width / 2, -height / 2);

  // Tiling
  const tiling = TILINGS[settings.tiling].make(settings.tileSize);
  const polygons = buildPolygons(tiling, width, height);

  // The polygon with the most sides gets the main fill colour
  const maxSides = Math.max(...tiling.cell.map(shape => shape.length));

  // Run Hankin's method once for every polygon
  const allPieces = [];
  const rosettes = [];
  for (const poly of polygons) {
    const result = hankinPolygon(poly, theta, settings.delta);
    allPieces.push(...result.pieces);
    if (result.rosette) rosettes.push({ shape: result.rosette, sides: poly.length });
  }

  // Layer 1: coloured rosettes
  if (settings.fill) {
    for (const r of rosettes) {
      fillPath(c, r.shape, r.sides === maxSides ? pal.fills[0] : pal.fills[1]);
    }
  }

  // Layer 2: the faint tiling skeleton
  if (settings.showTiling) {
    c.strokeStyle = pal.outline;
    c.globalAlpha = 0.25;
    c.lineWidth = 1;
    for (const poly of polygons) drawPath(c, poly, true);
    c.globalAlpha = 1;
  }

  // Layer 3: straps — a thick dark line, then a thinner light line on top
  c.lineJoin = "round";
  c.lineCap = "round";
  buildStrapPath(c, allPieces);

  c.strokeStyle = pal.outline;
  c.lineWidth = settings.strapWidth + 4;    // 2px of outline on each side
  c.stroke();

  c.strokeStyle = pal.strap;
  c.lineWidth = settings.strapWidth;
  c.stroke();

  c.restore();
}

// The θ we should draw right now: the slider value, plus a gentle wave when breathing
let breatheTime = 0;
function currentTheta() {
  if (!settings.breathe) return settings.theta;
  const t = settings.theta + BREATHE_RANGE * Math.sin(breatheTime);
  return Math.min(89, Math.max(1, t));      // keep it inside the valid 1°–89° range
}

// Draw on the screen
function draw() {
  renderPattern(ctx, canvas.clientWidth, canvas.clientHeight, currentTheta());
}

// ---- 8. Keep the canvas sharp and full-screen ----
function resize() {
  const dpr = window.devicePixelRatio || 1;   // 2 on most phones / retina screens
  canvas.width = canvas.clientWidth * dpr;    // real pixels
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);     // so we can keep drawing in CSS pixels
  draw();
}

// ---- 8b. Breathe animation ----
// requestAnimationFrame calls `animate` before every screen refresh (~60 times a second)
let lastFrame = null;
function animate(now) {
  if (!settings.breathe) { lastFrame = null; return; }   // stop the loop
  if (lastFrame !== null) breatheTime += (now - lastFrame) / 1000 * BREATHE_SPEED;
  lastFrame = now;
  draw();
  requestAnimationFrame(animate);
}

function setBreathe(on) {
  settings.breathe = on;
  breatheButton.classList.toggle("active", on);
  breatheButton.textContent = on ? "Pause" : "Breathe";
  if (on) requestAnimationFrame(animate);
  else draw();                                  // settle back on the slider's θ
}

// ---- 8c. Export a high-resolution PNG ----
const EXPORT_SCALE = 3;   // 3× the screen size — sharp enough to print

function exportPNG() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // A hidden canvas, 3× bigger than the screen
  const big = document.createElement("canvas");
  big.width = width * EXPORT_SCALE;
  big.height = height * EXPORT_SCALE;
  const bigCtx = big.getContext("2d");
  bigCtx.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);

  // Same picture, drawn bigger
  const theta = currentTheta();
  renderPattern(bigCtx, width, height, theta);

  // A file name that records the settings, e.g. kashi-octagon-67.5deg-multani-kashi.png
  const paletteSlug = PALETTES[settings.palette].name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fileName = `kashi-${settings.tiling}-${theta.toFixed(1)}deg-${paletteSlug}.png`;

  // Turn the canvas into a file and click a hidden download link
  big.toBlob(blob => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }, "image/png");
}

// ---- 9. Controls ----
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

// Every control registers a small function that copies `settings` back into the UI.
// Randomize changes `settings` directly, then calls syncControls() to update the panel.
const syncers = [];
function syncControls() {
  for (const sync of syncers) sync();
}
syncers.push(() => { tilingSelect.value = settings.tiling; });

// Connect a slider to a setting, and show its value next to the label
function bindSlider(id, key, format) {
  const slider = document.getElementById(id);
  const output = document.getElementById(id + "-value");
  const sync = () => {
    slider.value = settings[key];
    output.textContent = format(settings[key]);
  };
  sync();
  syncers.push(sync);
  slider.addEventListener("input", () => {
    settings[key] = parseFloat(slider.value);
    output.textContent = format(settings[key]);
    draw();
  });
}
bindSlider("theta", "theta", v => v.toFixed(1) + "°");
bindSlider("delta", "delta", v => v.toFixed(2));
bindSlider("tileSize", "tileSize", v => v + " px");
bindSlider("rotation", "rotation", v => v + "°");
bindSlider("strapWidth", "strapWidth", v => v + " px");

// Connect a checkbox to a true/false setting
function bindCheckbox(id, key) {
  const box = document.getElementById(id);
  const sync = () => { box.checked = settings[key]; };
  sync();
  syncers.push(sync);
  box.addEventListener("change", () => {
    settings[key] = box.checked;
    draw();
  });
}
bindCheckbox("fill", "fill");
bindCheckbox("showTiling", "showTiling");

// Palette swatches: one round button per palette, built from the PALETTES list
const swatchRow = document.getElementById("palettes");
const paletteName = document.getElementById("palette-name");

PALETTES.forEach((pal, index) => {
  const button = document.createElement("button");
  button.className = "swatch";
  button.title = pal.name;
  // three colour bands: background, outline, main fill
  button.style.background =
    `linear-gradient(135deg, ${pal.bg} 0 40%, ${pal.outline} 40% 60%, ${pal.fills[0]} 60% 100%)`;
  button.addEventListener("click", () => selectPalette(index));
  swatchRow.appendChild(button);
});

function showPalette() {
  paletteName.textContent = PALETTES[settings.palette].name;
  [...swatchRow.children].forEach((b, i) => b.classList.toggle("active", i === settings.palette));
}
syncers.push(showPalette);

function selectPalette(index) {
  settings.palette = index;
  showPalette();
  draw();
}
showPalette();

// ---- 10. Randomize ----
// Random number between min and max
const rand = (min, max) => min + Math.random() * (max - min);
// Random item from a list
const pick = list => list[Math.floor(Math.random() * list.length)];

function randomize() {
  settings.tiling = pick(Object.keys(TILINGS));
  settings.theta = Math.round(rand(30, 75) * 2) / 2;           // to the nearest 0.5°
  settings.delta = Math.random() < 0.6 ? 0 : Math.round(rand(0.05, 0.4) * 100) / 100;
  settings.tileSize = Math.round(rand(60, 140));
  settings.rotation = Math.random() < 0.7 ? 0 : Math.round(rand(0, 90));
  settings.strapWidth = Math.round(rand(3, 10) * 2) / 2;
  settings.palette = Math.floor(Math.random() * PALETTES.length);
  settings.fill = Math.random() < 0.75;
  syncControls();
  draw();
}

// ---- 11. Buttons ----
const randomButton = document.getElementById("randomize");
const breatheButton = document.getElementById("breathe");
const exportButton = document.getElementById("export");

randomButton.addEventListener("click", randomize);
breatheButton.addEventListener("click", () => setBreathe(!settings.breathe));
exportButton.addEventListener("click", exportPNG);

// ---- 12. Keyboard shortcuts ----
const panel = document.getElementById("panel");

window.addEventListener("keydown", event => {
  // don't steal keys while the user is using the dropdown
  if (event.target.tagName === "SELECT") return;

  switch (event.key.toLowerCase()) {
    case " ":                                   // Space: breathe on/off
      event.preventDefault();                   // stop the page from scrolling
      setBreathe(!settings.breathe);
      break;
    case "r": randomize(); break;               // R: randomize
    case "e": exportPNG(); break;               // E: export PNG
    case "h": panel.classList.toggle("hidden"); break;   // H: hide panel (for clean videos)
    case "t": settings.showTiling = !settings.showTiling; syncControls(); draw(); break;
    case "f": settings.fill = !settings.fill; syncControls(); draw(); break;
  }
});

window.addEventListener("resize", resize);
resize();