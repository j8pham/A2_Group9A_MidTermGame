// ── Constants ─────────────────────────────────────────────────────────────────
const GRAVITY    = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = -12;
const TERM_VEL   = 16;
const WORLD_W    = 2350;

const FOCUS_RADIUS          = 200;
const FOCUS_FADE_FRAMES     = 90;   // 1.5 s at 60 fps
const FOCUS_COOLDOWN_FRAMES = 210;  // 3.5 s at 60 fps

// ── State ─────────────────────────────────────────────────────────────────────
let player;
let platforms;
let camX = 0;

// Focus mechanic
let focusActive   = false; // F is held and focus is engaged
let focusFade     = 0;     // 0..1 — drives highlight alpha; decays to 0 after release
let focusCooldown = 0;     // frames until Focus is usable again
let prevFocusKey  = false; // F-key state last frame, for press-edge detection

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
  background(18, 16, 22);

  updateFocus();
  updatePlayer();
  updateCamera();

  push();
  translate(-camX, 0);
  drawLights();
  drawPlatforms();
  drawPlayer();
  drawFocusIndicator();
  pop();

  drawVignette();
}

// ── Focus Mechanic ────────────────────────────────────────────────────────────
function updateFocus() {
  let fHeld = keyIsDown(70); // F key

  // Activate on press edge, only when off cooldown
  if (fHeld && !prevFocusKey && focusCooldown === 0) {
    focusActive = true;
  }

  // Deactivate on release — immediately start fade and cooldown
  if (!fHeld && focusActive) {
    focusActive   = false;
    focusCooldown = FOCUS_COOLDOWN_FRAMES;
  }

  // While active keep fade pinned at 1; otherwise decay toward 0
  if (focusActive) {
    focusFade = 1.0;
  } else {
    focusFade = max(0, focusFade - 1 / FOCUS_FADE_FRAMES);
  }

  if (focusCooldown > 0) focusCooldown--;

  prevFocusKey = fHeld;
}

// ── Physics & Collision ───────────────────────────────────────────────────────
function updatePlayer() {
  // 30% speed while focus is engaged
  let speed = focusActive ? MOVE_SPEED * 0.3 : MOVE_SPEED;

  player.vx = 0;
  if (keyIsDown(LEFT_ARROW))  player.vx = -speed;
  if (keyIsDown(RIGHT_ARROW)) player.vx =  speed;

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

// ── Drawing ───────────────────────────────────────────────────────────────────
function drawLights() {
  noStroke();
  for (let l of LIGHT_SOURCES) {
    let a = map(sin(frameCount * l.speed + l.phase), -1, 1, 28, 100);
    fill(255, 248, 210, a);
    rect(l.x, l.y, l.w, l.h);
  }
}

function drawPlatforms() {
  let pcx = player.x + player.w / 2;
  let pcy = player.y + player.h / 2;

  for (let p of platforms) {
    // How much this platform is highlighted (0 = none, 1 = full)
    let hi = 0;
    if (focusFade > 0) {
      let d = distToRect(pcx, pcy, p.x, p.y, p.w, p.h);
      if (d <= FOCUS_RADIUS) hi = focusFade;
    }

    // Fill: lerp from dim (~0.24 opacity) to fully opaque
    fill(80, 140, 60, lerp(62, 255, hi));

    // Outline: faint cyan neon, fades with hi
    if (hi > 0) {
      stroke(0, 255, 240, hi * 160);
      strokeWeight(1.5);
    } else {
      noStroke();
    }

    rect(p.x, p.y, p.w, p.h);
  }
  noStroke();
}

function drawPlayer() {
  noStroke();
  fill(220, 80, 80);
  rect(player.x, player.y, player.w, player.h);
}

// Small circle below the player: grey when Focus is on cooldown, cyan when ready.
function drawFocusIndicator() {
  let cx = player.x + player.w / 2;
  let cy = player.y + player.h + 10;

  noStroke();
  fill(focusCooldown > 0 ? color(85, 85, 95) : color(0, 255, 240));
  ellipse(cx, cy, 8, 8);
}

// Permanent dark radial vignette (screen-space, drawn after world)
function drawVignette() {
  let ctx = drawingContext;
  let cx = width / 2, cy = height / 2;
  let g = ctx.createRadialGradient(cx, cy, height * 0.1, cx, cy, height * 0.82);
  g.addColorStop(0,   'rgba(0,0,0,0)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.45)');
  g.addColorStop(1,   'rgba(0,0,0,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

// Shortest distance from point (px,py) to axis-aligned rect
function distToRect(px, py, rx, ry, rw, rh) {
  let dx = max(rx - px, 0, px - (rx + rw));
  let dy = max(ry - py, 0, py - (ry + rh));
  return sqrt(dx * dx + dy * dy);
}
