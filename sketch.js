// ── Constants ─────────────────────────────────────────────────────────────────
const GRAVITY    = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = -12;
const TERM_VEL   = 16;
const WORLD_W    = 2350;

// ── State ─────────────────────────────────────────────────────────────────────
let player;
let platforms;
let camX = 0;

// Three background light sources positioned across the world.
// Each pulses independently via a sine wave on `phase` + `speed`.
const LIGHT_SOURCES = [
  { x: 200,  y: 0, w: 300, h: 450, phase: 0.0,  speed: 0.038 },
  { x: 850,  y: 0, w: 240, h: 450, phase: 2.1,  speed: 0.055 },
  { x: 1480, y: 0, w: 320, h: 450, phase: 1.4,  speed: 0.031 },
];

// ── Setup ─────────────────────────────────────────────────────────────────────
function setup() {
  createCanvas(800, 450);
  noSmooth();

  player = {
    x: 60, y: 360,
    w: 30, h: 40,
    vx: 0, vy: 0,
    onGround: false
  };

  platforms = [
    { x: 0,    y: 400, w: 400, h: 50 },  // [0] ground – left
    { x: 450,  y: 330, w: 200, h: 20 },  // [1] low step
    { x: 700,  y: 270, w: 180, h: 20 },  // [2] mid-high
    { x: 950,  y: 330, w: 150, h: 20 },  // [3] back down
    { x: 1150, y: 230, w: 200, h: 20 },  // [4] highest point
    { x: 1400, y: 350, w: 180, h: 20 },  // [5] descent step
    { x: 1550, y: 400, w: 800, h: 50 },  // [6] ground – right
  ];
}

// ── Main Loop ─────────────────────────────────────────────────────────────────
function draw() {
  // Near-black base — not sky blue, not a tinted screen
  background(18, 16, 22);

  updatePlayer();
  updateCamera();

  // World-space layer (scrolls with camera)
  push();
  translate(-camX, 0);
  drawLights();      // harsh glare columns behind everything
  drawPlatforms();   // faint, low-opacity surfaces
  drawPlayer();
  pop();

  // Screen-space layer (fixed to canvas, drawn last)
  drawVignette();
}

// ── Physics & Collision ───────────────────────────────────────────────────────
function updatePlayer() {
  player.vx = 0;
  if (keyIsDown(LEFT_ARROW))  player.vx = -MOVE_SPEED;
  if (keyIsDown(RIGHT_ARROW)) player.vx =  MOVE_SPEED;

  player.vy += GRAVITY;
  if (player.vy > TERM_VEL) player.vy = TERM_VEL;

  player.onGround = false;

  // Horizontal move → resolve
  player.x += player.vx;
  for (let p of platforms) {
    if (overlaps(player, p)) {
      player.x  = player.vx > 0 ? p.x - player.w : p.x + p.w;
      player.vx = 0;
    }
  }
  player.x = constrain(player.x, 0, WORLD_W - player.w);

  // Vertical move → resolve
  player.y += player.vy;
  for (let p of platforms) {
    if (overlaps(player, p)) {
      if (player.vy > 0) { player.y = p.y - player.h; player.onGround = true; }
      else               { player.y = p.y + p.h; }
      player.vy = 0;
    }
  }

  if (player.y > height + 200) {
    player.x = 60; player.y = 360; player.vy = 0;
  }
}

function keyPressed() {
  if (keyCode === UP_ARROW && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
  }
}

function overlaps(a, b) {
  return a.x       < b.x + b.w &&
         a.x + a.w > b.x       &&
         a.y       < b.y + b.h &&
         a.y + a.h > b.y;
}

// ── Camera ────────────────────────────────────────────────────────────────────
function updateCamera() {
  camX = constrain(player.x - width / 3, 0, WORLD_W - width);
}

// ── Visual Effects ────────────────────────────────────────────────────────────

// Harsh background light columns — each pulses at its own rate and phase.
// They sit behind the platforms, creating competing glare that washes out
// the already-faint platform shapes.
function drawLights() {
  noStroke();
  for (let l of LIGHT_SOURCES) {
    // alpha oscillates between ~28 and ~100 (11%–39% opacity)
    let a = map(sin(frameCount * l.speed + l.phase), -1, 1, 28, 100);
    fill(255, 248, 210, a);  // warm white-yellow
    rect(l.x, l.y, l.w, l.h);
  }
}

// Platforms rendered at ~0.24 opacity — barely visible against the dark ground.
function drawPlatforms() {
  noStroke();
  fill(80, 140, 60, 62);   // 62/255 ≈ 0.24
  for (let p of platforms) {
    rect(p.x, p.y, p.w, p.h);
  }
}

// Player stays fully opaque — it's the world that's hard to read, not the character.
function drawPlayer() {
  noStroke();
  fill(220, 80, 80);
  rect(player.x, player.y, player.w, player.h);
}

// Permanent dark radial vignette drawn in screen space using a canvas gradient.
// Inner radius is kept small so the darkness encroaches well into the play area.
function drawVignette() {
  let ctx = drawingContext;
  let cx = width  / 2;
  let cy = height / 2;

  // Two-stop radial gradient: transparent center → opaque dark edge
  let grad = ctx.createRadialGradient(cx, cy, height * 0.1, cx, cy, height * 0.82);
  grad.addColorStop(0,   'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
  grad.addColorStop(1,   'rgba(0, 0, 0, 0.9)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}
