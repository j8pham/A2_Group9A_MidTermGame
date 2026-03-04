// ── Constants ─────────────────────────────────────────────────────────────────
const GRAVITY    = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = -12;
const TERM_VEL   = 16;
const WORLD_W    = 2350;

const FOCUS_RADIUS          = 200;
const FOCUS_FADE_FRAMES     = 90;   // 1.5 s
const FOCUS_COOLDOWN_FRAMES = 210;  // 3.5 s

// Intro sequence timings (frames at 60 fps)
const INTRO_NORMAL_F = 120; // 2.0 s — full vision, free movement
const INTRO_SHAKE_F  = 30;  // 0.5 s — screen shake
const INTRO_FLASH_F  = 30;  // 0.5 s — white flash fade-out

// ── State ─────────────────────────────────────────────────────────────────────
let player;
let platforms;
let camX = 0;

let gameState  = "start"; // "start" | "intro" | "play"
let introTimer = 0;

let focusActive   = false;
let focusFade     = 0;
let focusCooldown = 0;
let prevFocusKey  = false;

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
  if (gameState === "start") {
    drawStartScreen();
    return;
  }

  // Physics runs in both "intro" and "play"
  updatePlayer();
  updateCamera();

  if (gameState === "intro") {
    introTimer++;
    drawIntroScene();
    if (introTimer >= INTRO_NORMAL_F + INTRO_SHAKE_F + INTRO_FLASH_F) {
      gameState = "play";
    }
    return;
  }

  // ── "play" — permanent low vision, no way back ──
  updateFocus();
  background(18, 16, 22);
  push();
  translate(-camX, 0);
  drawLights();
  drawPlatforms();
  drawPlayer();
  drawFocusIndicator();
  pop();
  drawVignette();
}

// ── Start Screen ──────────────────────────────────────────────────────────────
function drawStartScreen() {
  background(18, 16, 22);

  textAlign(CENTER, CENTER);
  noStroke();

  // Title
  textSize(72);
  textStyle(BOLD);
  fill(255);
  text("FOCUS", width / 2, height / 2 - 72);

  // Cyan rule beneath title
  stroke(0, 255, 240, 70);
  strokeWeight(1);
  line(width / 2 - 130, height / 2 - 28, width / 2 + 130, height / 2 - 28);
  noStroke();

  // Tagline
  textSize(13);
  textStyle(NORMAL);
  fill(130, 130, 145);
  text("vision is a limited resource", width / 2, height / 2 + 2);

  // Controls
  textSize(12);
  fill(100, 100, 112);
  text("← →  move      ↑  jump      F  focus", width / 2, height / 2 + 36);

  // Blinking prompt
  if (sin(frameCount * 0.07) > 0) {
    fill(0, 255, 240);
    textSize(13);
    text("PRESS ANY KEY TO BEGIN", width / 2, height / 2 + 80);
  }

  drawVignette();
}

// ── Intro Sequence ────────────────────────────────────────────────────────────
// Phase 1 (0 – INTRO_NORMAL_F):        full opacity world, no vignette, normal speed
// Phase 2 (…+ INTRO_SHAKE_F):          screen shake, still full opacity
// Phase 3 (…+ INTRO_FLASH_F):          low-vision world revealed under fading white flash
function drawIntroScene() {
  let shakeEnd = INTRO_NORMAL_F + INTRO_SHAKE_F;
  let flashEnd = shakeEnd + INTRO_FLASH_F;

  let inShake = introTimer >= INTRO_NORMAL_F && introTimer < shakeEnd;
  let inFlash = introTimer >= shakeEnd;

  // Shake offset — magnitude decays linearly to 0 by end of shake window
  let sx = 0, sy = 0;
  if (inShake) {
    let t   = (introTimer - INTRO_NORMAL_F) / INTRO_SHAKE_F;
    let mag = lerp(11, 0, t);
    sx = random(-mag, mag);
    sy = random(-mag, mag);
  }

  // Background — switches to dark low-vision base once flash starts
  background(inFlash ? color(18, 16, 22) : color(38, 44, 60));

  push();
  translate(-camX + sx, sy);

  if (inFlash) {
    // Low-vision world already active; the flash overlay hides the transition
    drawLights();
    drawPlatforms();
  } else {
    // Clean full-opacity world
    drawPlatformsFull();
  }
  drawPlayer();
  pop();

  // Vignette appears the moment the flash starts (part of the low-vision reveal)
  if (inFlash) {
    drawVignette();
  }

  // White flash fades from 255 → 0 over INTRO_FLASH_F frames
  if (inFlash) {
    let alpha = map(introTimer, shakeEnd, flashEnd, 255, 0);
    noStroke();
    fill(255, 255, 255, constrain(alpha, 0, 255));
    rect(0, 0, width, height);
  }
}

// ── Focus Mechanic (play state only) ─────────────────────────────────────────
function updateFocus() {
  let fHeld = keyIsDown(70); // F

  if (fHeld && !prevFocusKey && focusCooldown === 0) focusActive = true;
  if (!fHeld && focusActive) { focusActive = false; focusCooldown = FOCUS_COOLDOWN_FRAMES; }

  focusFade = focusActive ? 1.0 : max(0, focusFade - 1 / FOCUS_FADE_FRAMES);
  if (focusCooldown > 0) focusCooldown--;

  prevFocusKey = fHeld;
}

// ── Physics & Collision ───────────────────────────────────────────────────────
function updatePlayer() {
  // Focus slows movement only during play state
  let speed = (gameState === "play" && focusActive) ? MOVE_SPEED * 0.3 : MOVE_SPEED;

  player.vx = 0;
  if (keyIsDown(LEFT_ARROW))  player.vx = -speed;
  if (keyIsDown(RIGHT_ARROW)) player.vx =  speed;

  player.vy += GRAVITY;
  if (player.vy > TERM_VEL) player.vy = TERM_VEL;

  player.onGround = false;

  player.x += player.vx;
  for (let p of platforms) {
    if (overlaps(player, p)) {
      player.x  = player.vx > 0 ? p.x - player.w : p.x + p.w;
      player.vx = 0;
    }
  }
  player.x = constrain(player.x, 0, WORLD_W - player.w);

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
  // Start screen — any key launches the intro
  if (gameState === "start") {
    gameState  = "intro";
    introTimer = 0;
    return;
  }
  // Jump works in both intro and play
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

// ── Drawing Helpers ───────────────────────────────────────────────────────────

// Harsh glare columns (low-vision world only)
function drawLights() {
  noStroke();
  for (let l of LIGHT_SOURCES) {
    let a = map(sin(frameCount * l.speed + l.phase), -1, 1, 28, 100);
    fill(255, 248, 210, a);
    rect(l.x, l.y, l.w, l.h);
  }
}

// Full-opacity platforms — used during intro normal + shake phases
function drawPlatformsFull() {
  noStroke();
  fill(80, 140, 60);
  for (let p of platforms) {
    rect(p.x, p.y, p.w, p.h);
  }
}

// Low-opacity platforms with focus highlight — used after the flash and in play
function drawPlatforms() {
  let pcx = player.x + player.w / 2;
  let pcy = player.y + player.h / 2;

  for (let p of platforms) {
    let hi = 0;
    if (focusFade > 0) {
      if (distToRect(pcx, pcy, p.x, p.y, p.w, p.h) <= FOCUS_RADIUS) hi = focusFade;
    }

    fill(80, 140, 60, lerp(62, 255, hi));
    if (hi > 0) { stroke(0, 255, 240, hi * 160); strokeWeight(1.5); }
    else        { noStroke(); }

    rect(p.x, p.y, p.w, p.h);
  }
  noStroke();
}

function drawPlayer() {
  noStroke();
  fill(220, 80, 80);
  rect(player.x, player.y, player.w, player.h);
}

// Focus state indicator below the player
function drawFocusIndicator() {
  noStroke();
  fill(focusCooldown > 0 ? color(85, 85, 95) : color(0, 255, 240));
  ellipse(player.x + player.w / 2, player.y + player.h + 10, 8, 8);
}

// Permanent radial vignette (screen-space)
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

// Shortest distance from point to axis-aligned rect
function distToRect(px, py, rx, ry, rw, rh) {
  let dx = max(rx - px, 0, px - (rx + rw));
  let dy = max(ry - py, 0, py - (ry + rh));
  return sqrt(dx * dx + dy * dy);
}
