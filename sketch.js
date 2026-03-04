// ═══════════════════════════════════════════════════════════════════════════════
//  DATA BREACH — cyberpunk platformer about limited vision
//  p5.js · 800 × 450 · pixel art city skyline
// ═══════════════════════════════════════════════════════════════════════════════

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const GRAVITY    = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = -12;
const TERM_VEL   = 16;
const WORLD_W    = 4800;

const FOCUS_RADIUS          = 200;
const FOCUS_FADE_FRAMES     = 90;   // 1.5 s fade after release
const FOCUS_COOLDOWN_FRAMES = 210;  // 3.5 s cooldown

const INTRO_NORMAL_F = 60;  // 1.0 s full vision (faster intro)
const INTRO_SHAKE_F  = 30;  // 0.5 s screen shake
const INTRO_FLASH_F  = 24;  // 0.4 s white flash

const RAIN_COUNT = 50;
const MOTE_COUNT = 15;

const COYOTE_FRAMES = 7;       // grace frames after leaving edge
const JUMP_CUT_MULT = 0.42;    // velocity multiplier on early jump release

const LIGHT_SOURCES = [
  { x: 200,  y: 0, w: 300, h: 450, phase: 0.0,  speed: 0.038 },
  { x: 850,  y: 0, w: 240, h: 450, phase: 2.1,  speed: 0.055 },
  { x: 1480, y: 0, w: 320, h: 450, phase: 1.4,  speed: 0.031 },
  { x: 2200, y: 0, w: 260, h: 450, phase: 0.7,  speed: 0.048 },
  { x: 3000, y: 0, w: 280, h: 450, phase: 1.9,  speed: 0.042 },
  { x: 3800, y: 0, w: 350, h: 450, phase: 0.3,  speed: 0.036 },
];

const GLARE_ZONES = [
  { x: 2600, w: 600,  intensity: 2.2 },
  { x: 3800, w: 900,  intensity: 3.0 },
];

const WIN_BTN = { x: 310, y: 378, w: 180, h: 40 };

const DEATH_SHAKE_FRAMES = 18;
const DEATH_FLASH_FRAMES = 14;
const FOCUS_FLASH_FRAMES = 10;

const AFTERIMAGE_COUNT = 4;
const AFTERIMAGE_SPACING = 3;  // frames between each ghost

// ── ASSET LOADING ────────────────────────────────────────────────────────────
let buildingImgs = [];    // 7 single building sprites

function preload() {
  for (let i = 2; i <= 8; i++) {
    let pad = i < 10 ? "0" + i : "" + i;
    buildingImgs.push(loadImage("assets/Single Buildings/Pixel Art Buildings-" + pad + ".png"));
  }
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let player, platforms, movingPlatforms, enemies, goal;
let camX = 0;

let gameState  = "start";
let introTimer = 0;
let winTimer   = 0;

let focusActive     = false;
let focusFade       = 0;
let focusCooldown   = 0;
let prevFocusKey    = false;
let focusPulseR     = 0;
let focusPulseOn    = false;
let focusFlashTimer = 0;

let deathCount      = 0;
let deathShakeTimer = 0;
let deathFlashTimer = 0;

let coyoteTimer     = 0;   // frames since last grounded
let wasOnGround     = false;
let jumpHeld        = false;

// Player afterimage trail
let afterimages = [];  // ring buffer of {x, y, age}

let bgLayer1 = [];    // far buildings (image-based)
let bgLayer2 = [];    // mid buildings (image-based)
let rain     = [];
let motes    = [];

// ── SETUP ─────────────────────────────────────────────────────────────────────
function setup() {
  createCanvas(800, 450);

  player = { x: 60, y: 360, w: 30, h: 40, vx: 0, vy: 0, onGround: false };

  platforms = [
    // === ZONE 1: Tutorial (x 0–800) ===
    { x: 0,    y: 400, w: 350, h: 50 },
    { x: 410,  y: 360, w: 160, h: 20 },
    { x: 630,  y: 320, w: 140, h: 20 },

    // === ZONE 2: Medium (x 800–1800) ===
    { x: 840,  y: 350, w: 120, h: 20 },
    { x: 1020, y: 290, w: 100, h: 20 },
    { x: 1180, y: 230, w: 180, h: 20 },
    { x: 1420, y: 310, w: 90,  h: 20 },
    { x: 1560, y: 370, w: 130, h: 20 },
    { x: 1730, y: 310, w: 100, h: 20 },

    // === ZONE 3: Hard (x 1800–3200) ===
    { x: 1900, y: 380, w: 110, h: 20 },
    { x: 2100, y: 320, w: 80,  h: 20 },
    { x: 2300, y: 260, w: 90,  h: 20 },
    { x: 2520, y: 330, w: 70,  h: 20 },
    { x: 2680, y: 280, w: 85,  h: 20 },
    { x: 2860, y: 350, w: 100, h: 20 },
    { x: 3040, y: 290, w: 80,  h: 20 },

    // === ZONE 4: Brutal (x 3200–4800) ===
    { x: 3220, y: 350, w: 90,  h: 20 },
    { x: 3400, y: 280, w: 65,  h: 20 },
    { x: 3560, y: 220, w: 75,  h: 20 },
    { x: 3730, y: 300, w: 60,  h: 20 },
    { x: 3880, y: 240, w: 70,  h: 20 },
    { x: 4050, y: 320, w: 80,  h: 20 },
    { x: 4220, y: 260, w: 65,  h: 20 },
    { x: 4380, y: 350, w: 120, h: 20 },
    { x: 4550, y: 380, w: 250, h: 50 },
  ];

  movingPlatforms = [
    { x: 1560, y: 250, w: 90, h: 20,
      axis: "x", speed: 0.8, range: 100, origin: 1560 },
    { x: 2420, y: 340, w: 80, h: 20,
      axis: "y", speed: 0.7, range: 80, origin: 340 },
    { x: 2950, y: 240, w: 75, h: 20,
      axis: "x", speed: 1.1, range: 120, origin: 2950 },
    { x: 3960, y: 180, w: 65, h: 20,
      axis: "y", speed: 1.4, range: 100, origin: 180 },
    { x: 4300, y: 200, w: 70, h: 20,
      axis: "x", speed: 1.6, range: 130, origin: 4300 },
  ];

  enemies = [
    { x: 1185, y: 200, w: 22, h: 30,
      speed: 1.1, dir: 1,
      leftBound: 1180, rightBound: 1338 },
    { x: 2680, y: 250, w: 22, h: 30,
      speed: 1.6, dir: -1,
      leftBound: 2680, rightBound: 2743 },
    { x: 2860, y: 320, w: 22, h: 30,
      speed: 0.8, dir: 1,
      leftBound: 2860, rightBound: 2938 },
    { x: 4050, y: 290, w: 22, h: 30,
      speed: 2.0, dir: 1,
      leftBound: 4050, rightBound: 4108 },
  ];

  goal = { x: 4698, y: 328, w: 36, h: 52 };

  initParallax();
  initParticles();
}

// ── PARALLAX GENERATION (image-based) ─────────────────────────────────────────
function initParallax() {
  bgLayer1 = [];
  bgLayer2 = [];

  // Layer 1 — far, sparse, uses darker/simpler buildings (indices 3,4,6 → imgs 05,06,08)
  let farIndices = [3, 4, 6];
  let x1 = -300;
  while (x1 < WORLD_W + 600) {
    let idx = farIndices[floor(random(farIndices.length))];
    let img = buildingImgs[idx];
    let scale = random(0.08, 0.14);
    let w = img.width * scale;
    let h = img.height * scale;
    bgLayer1.push({ x: x1, w: w, h: h, imgIdx: idx, scale: scale });
    x1 += w + random(30, 90);
  }

  // Layer 2 — mid, denser, all buildings, bigger scale
  let x2 = -300;
  while (x2 < WORLD_W + 600) {
    let idx = floor(random(buildingImgs.length));
    let img = buildingImgs[idx];
    let scale = random(0.12, 0.22);
    let w = img.width * scale;
    let h = img.height * scale;
    bgLayer2.push({ x: x2, w: w, h: h, imgIdx: idx, scale: scale });
    x2 += w + random(5, 40);
  }
}

// ── PARTICLE GENERATION ───────────────────────────────────────────────────────
function initParticles() {
  rain = [];
  motes = [];
  for (let i = 0; i < RAIN_COUNT; i++) {
    rain.push({
      x: random(width + 40), y: random(-20, height),
      speed: random(5, 9), len: random(12, 22), alpha: random(15, 40),
    });
  }
  for (let i = 0; i < MOTE_COUNT; i++) {
    motes.push({
      x: random(width), y: random(height),
      vx: random(-0.3, 0.3), vy: random(-0.6, -0.15),
      size: random(1.5, 3), alpha: random(60, 160),
      pink: random() > 0.6,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════════════

function draw() {
  if (gameState === "start") { drawStartScreen(); return; }
  if (gameState === "win")   { drawWinScreen();   return; }

  // ── WINNING — portal-suck transition ──
  if (gameState === "winning") {
    winTimer++;
    background(12, 8, 20);
    drawParallax(true);
    push();
    translate(-camX, 0);
    drawLights();
    drawPlatforms();
    drawMovingPlatforms();
    drawGoal();
    drawEnemies();
    pop();
    updateParticles();
    drawParticles();
    drawScanlines();
    drawVignette();

    let portalSX = goal.x + goal.w / 2 - camX;
    let portalSY = goal.y + goal.h / 2;
    let maxR  = dist(0, 0, width, height);
    let r     = map(winTimer, 0, 28, 0, maxR * 1.1);
    let alpha = winTimer < 18 ? map(winTimer, 0, 18, 0, 230) : 230;
    noStroke();
    fill(0, 210, 255, constrain(alpha, 0, 255));
    ellipse(portalSX, portalSY, r * 2, r * 2);

    if (winTimer >= 34) gameState = "win";
    return;
  }

  updatePlayer();
  updateMovingPlatforms();
  updateCamera();

  if (gameState === "intro") {
    introTimer++;
    drawIntroScene();
    if (introTimer >= INTRO_NORMAL_F + INTRO_SHAKE_F + INTRO_FLASH_F) gameState = "play";
    return;
  }

  // ── PLAY ──
  updateFocus();
  updateEnemies();
  checkEnemyCollision();
  if (overlaps(player, goal)) { gameState = "winning"; winTimer = 0; return; }

  if (deathShakeTimer > 0) deathShakeTimer--;
  if (deathFlashTimer > 0) deathFlashTimer--;

  background(12, 8, 20);
  drawParallax(true);

  push();
  let dsx = 0, dsy = 0;
  if (deathShakeTimer > 0) {
    let mag = map(deathShakeTimer, 0, DEATH_SHAKE_FRAMES, 0, 8);
    dsx = random(-mag, mag);
    dsy = random(-mag, mag);
  }
  translate(-camX + dsx, dsy);

  drawLights();
  drawGlareZones();
  drawPlatforms();
  drawMovingPlatforms();
  drawGoal();
  drawEnemies();
  drawAfterimages();
  drawPlayer();
  drawFocusPulse();
  drawFocusIndicator();
  pop();

  updateParticles();
  drawParticles();

  // Focus activation flash
  if (focusFlashTimer > 0) {
    focusFlashTimer--;
    let fa = map(focusFlashTimer, FOCUS_FLASH_FRAMES, 0, 60, 0);
    noStroke();
    fill(0, 255, 240, constrain(fa, 0, 255));
    rect(0, 0, width, height);
  }

  // Death red flash
  if (deathFlashTimer > 0) {
    let da = map(deathFlashTimer, DEATH_FLASH_FRAMES, 0, 100, 0);
    noStroke();
    fill(255, 20, 60, constrain(da, 0, 255));
    rect(0, 0, width, height);
  }

  drawDangerWarning();
  drawScanlines();
  drawVignette();
  drawDeathCounter();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME STATES
// ═══════════════════════════════════════════════════════════════════════════════

function drawStartScreen() {
  background(12, 8, 20);

  let saved = camX;
  camX = 200 + sin(frameCount * 0.005) * 200;
  drawParallax(true);
  camX = saved;

  updateParticles();
  drawParticles();

  textAlign(CENTER, CENTER);
  noStroke();

  // Title with subtle breathing glow
  let titleGlow = 220 + 35 * sin(frameCount * 0.04);
  fill(0, titleGlow, constrain(titleGlow - 10, 0, 255));
  textSize(60);
  textStyle(BOLD);
  text("DATA BREACH", width / 2, height / 2 - 72);

  // Hot pink rule
  stroke(255, 50, 150, 90);
  strokeWeight(1);
  line(width / 2 - 160, height / 2 - 30, width / 2 + 160, height / 2 - 30);
  noStroke();

  fill(90, 80, 115);
  textSize(12);
  textStyle(NORMAL);
  text("VISION IS A LIMITED RESOURCE", width / 2, height / 2 - 5);

  fill(55, 50, 75);
  textSize(11);
  text("ARROWS  MOVE + JUMP      F  FOCUS", width / 2, height / 2 + 30);

  if (sin(frameCount * 0.07) > 0) {
    fill(0, 255, 240);
    textSize(13);
    text("PRESS ANY KEY TO BEGIN", width / 2, height / 2 + 80);
  }

  drawScanlines();
  drawVignette();
}

// ── Intro Sequence ────────────────────────────────────────────────────────────
function drawIntroScene() {
  let shakeEnd = INTRO_NORMAL_F + INTRO_SHAKE_F;
  let flashEnd = shakeEnd + INTRO_FLASH_F;
  let inShake  = introTimer >= INTRO_NORMAL_F && introTimer < shakeEnd;
  let inFlash  = introTimer >= shakeEnd;

  let sx = 0, sy = 0;
  if (inShake) {
    let t   = (introTimer - INTRO_NORMAL_F) / INTRO_SHAKE_F;
    let mag = lerp(11, 0, t);
    sx = random(-mag, mag);
    sy = random(-mag, mag);
  }

  background(12, 8, 20);
  drawParallax(inFlash);

  updateEnemies();

  push();
  translate(-camX + sx, sy);
  if (inFlash) {
    drawLights();
    drawPlatforms();
    drawMovingPlatforms();
    drawGoal();
    drawEnemies();
  } else {
    drawPlatformsFull();
    drawMovingPlatformsFull();
    drawGoalFull();
    drawEnemiesFull();
  }
  drawPlayer();
  pop();

  updateParticles();
  drawParticles();
  drawScanlines();

  if (inFlash) {
    drawVignette();
    let a = map(introTimer, shakeEnd, flashEnd, 255, 0);
    noStroke();
    fill(255, 255, 255, constrain(a, 0, 255));
    rect(0, 0, width, height);
  }
}

// ── Win Screen ────────────────────────────────────────────────────────────────
function drawWinScreen() {
  background(12, 8, 20);
  updateParticles();
  drawParticles();

  let pcx = width / 2, pcy = 218;
  drawPortalVFX(pcx, pcy, 52, 82, 1.0);

  // Player silhouette inside portal
  noStroke();
  fill(16, 10, 28, 220);
  rectMode(CENTER);
  rect(pcx, pcy + 10, 18, 26);
  stroke(0, 255, 240, 160);
  strokeWeight(1.5);
  line(pcx - 5, pcy + 2, pcx + 5, pcy + 2);
  stroke(255, 50, 150, 110);
  strokeWeight(1);
  line(pcx - 4, pcy + 12, pcx + 4, pcy + 12);
  noStroke();
  rectMode(CORNER);

  textAlign(CENTER, CENTER);

  fill(0, 255, 240);
  textSize(44);
  textStyle(BOLD);
  text("DATA SECURED", pcx, 68);

  stroke(255, 50, 150, 70);
  strokeWeight(1);
  line(pcx - 190, 90, pcx + 190, 90);
  noStroke();

  fill(200, 60, 255);
  textSize(14);
  textStyle(NORMAL);
  text("OBJECTIVE COMPLETE", pcx, 322);

  // Death stats on win screen
  fill(255, 50, 150, 180);
  textSize(11);
  if (deathCount === 0) {
    text("FLAWLESS RUN   //   ZERO BREACHES", pcx, 350);
  } else {
    text("SYSTEM BREACHES: " + deathCount, pcx, 350);
  }

  fill(45, 42, 65);
  textSize(10);
  text("ACCESS NODE REACHED   //   NEURAL LINK ESTABLISHED", pcx, 368);

  // Restart button
  stroke(0, 255, 240, 200);
  strokeWeight(1);
  noFill();
  rect(WIN_BTN.x, WIN_BTN.y, WIN_BTN.w, WIN_BTN.h);

  noStroke();
  fill(0, 255, 240);
  textSize(12);
  textStyle(BOLD);
  text("RESTART", pcx, WIN_BTN.y + WIN_BTN.h / 2);

  drawScanlines();
  drawVignette();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FOCUS MECHANIC
// ═══════════════════════════════════════════════════════════════════════════════

function updateFocus() {
  let fHeld = keyIsDown(70);

  if (fHeld && !prevFocusKey && focusCooldown === 0) {
    focusActive     = true;
    focusPulseOn    = true;
    focusPulseR     = 0;
    focusFlashTimer = FOCUS_FLASH_FRAMES;
  }
  if (!fHeld && focusActive) {
    focusActive   = false;
    focusCooldown = FOCUS_COOLDOWN_FRAMES;
  }

  focusFade = focusActive ? 1.0 : max(0, focusFade - 1 / FOCUS_FADE_FRAMES);
  if (focusCooldown > 0) focusCooldown--;
  prevFocusKey = fHeld;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHYSICS & COLLISION
// ═══════════════════════════════════════════════════════════════════════════════

function getAllPlatforms() {
  let all = platforms.slice();
  for (let mp of movingPlatforms) {
    all.push({ x: mp.x, y: mp.y, w: mp.w, h: mp.h });
  }
  return all;
}

function updatePlayer() {
  let speed = (gameState === "play" && focusActive) ? MOVE_SPEED * 0.3 : MOVE_SPEED;

  player.vx = 0;
  if (keyIsDown(LEFT_ARROW))  player.vx = -speed;
  if (keyIsDown(RIGHT_ARROW)) player.vx =  speed;

  // Record afterimage every few frames when moving
  if (gameState === "play" && abs(player.vx) > 0.5 && frameCount % AFTERIMAGE_SPACING === 0) {
    afterimages.push({ x: player.x, y: player.y, age: 0 });
    if (afterimages.length > AFTERIMAGE_COUNT) afterimages.shift();
  }

  player.vy += GRAVITY;
  if (player.vy > TERM_VEL) player.vy = TERM_VEL;

  // Variable jump height — release UP early to cut jump short
  if (jumpHeld && !keyIsDown(UP_ARROW) && player.vy < 0) {
    player.vy *= JUMP_CUT_MULT;
    jumpHeld = false;
  }

  // Coyote time tracking
  if (player.onGround) {
    coyoteTimer = COYOTE_FRAMES;
    wasOnGround = true;
  } else if (wasOnGround) {
    coyoteTimer--;
    if (coyoteTimer <= 0) wasOnGround = false;
  }

  player.onGround = false;

  let allPlats = getAllPlatforms();

  // Horizontal
  player.x += player.vx;
  for (let p of allPlats) {
    if (overlaps(player, p)) {
      player.x  = player.vx > 0 ? p.x - player.w : p.x + p.w;
      player.vx = 0;
    }
  }
  player.x = constrain(player.x, 0, WORLD_W - player.w);

  // Vertical
  player.y += player.vy;
  for (let p of allPlats) {
    if (overlaps(player, p)) {
      if (player.vy > 0) { player.y = p.y - player.h; player.onGround = true; }
      else               { player.y = p.y + p.h; }
      player.vy = 0;
    }
  }

  // Fall death
  if (player.y > height + 200) {
    triggerDeath();
  }
}

function updateMovingPlatforms() {
  for (let mp of movingPlatforms) {
    let t = frameCount * mp.speed * 0.02;
    if (mp.axis === "x") {
      mp.x = mp.origin + sin(t) * mp.range;
    } else {
      mp.y = mp.origin + sin(t) * mp.range;
    }
  }
}

function updateEnemies() {
  for (let e of enemies) {
    e.x += e.speed * e.dir;
    if (e.x >= e.rightBound) { e.x = e.rightBound; e.dir = -1; }
    if (e.x <= e.leftBound)  { e.x = e.leftBound;  e.dir =  1; }
  }
}

function checkEnemyCollision() {
  for (let e of enemies) {
    if (overlaps(player, e)) {
      triggerDeath();
      return;
    }
  }
}

function triggerDeath() {
  deathCount++;
  deathShakeTimer = DEATH_SHAKE_FRAMES;
  deathFlashTimer = DEATH_FLASH_FRAMES;
  player.x = 60; player.y = 360;
  player.vx = 0; player.vy = 0;

  // Reset focus on death so player can immediately use it
  focusActive   = false;
  focusFade     = 0;
  focusCooldown = 0;
  prevFocusKey  = false;
  focusPulseOn  = false;
  focusPulseR   = 0;

  // Clear afterimages
  afterimages = [];
  coyoteTimer = 0;
  wasOnGround = false;
  jumpHeld    = false;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════════════════════════════════

function keyPressed() {
  if (gameState === "start") { gameState = "intro"; introTimer = 0; return; }

  // Jump with coyote time support
  if (keyCode === UP_ARROW && (player.onGround || (wasOnGround && coyoteTimer > 0))) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    wasOnGround = false;
    coyoteTimer = 0;
    jumpHeld = true;
  }
}

function keyReleased() {
  if (keyCode === UP_ARROW) {
    jumpHeld = false;
  }
}

function mousePressed() {
  if (gameState === "win" &&
      mouseX >= WIN_BTN.x && mouseX <= WIN_BTN.x + WIN_BTN.w &&
      mouseY >= WIN_BTN.y && mouseY <= WIN_BTN.y + WIN_BTN.h) {
    resetGame();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CAMERA
// ═══════════════════════════════════════════════════════════════════════════════

function updateCamera() {
  camX = constrain(player.x - width / 3, 0, WORLD_W - width);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Parallax city skyline (image-based, 2 layers)
// ═══════════════════════════════════════════════════════════════════════════════

function drawParallax(lowVis) {
  let dim = lowVis ? 0.30 : 0.80;

  // Layer 1 — far (0.08× scroll)
  let off1 = camX * 0.08;
  for (let b of bgLayer1) {
    let sx = b.x - off1;
    if (sx + b.w < -20 || sx > width + 20) continue;
    let img = buildingImgs[b.imgIdx];
    push();
    tint(255, 255, 255, 120 * dim);
    image(img, sx, height - b.h, b.w, b.h);
    pop();
  }

  // Layer 2 — mid (0.25× scroll)
  let off2 = camX * 0.25;
  for (let b of bgLayer2) {
    let sx = b.x - off2;
    if (sx + b.w < -20 || sx > width + 20) continue;
    let img = buildingImgs[b.imgIdx];
    push();
    tint(255, 255, 255, 180 * dim);
    image(img, sx, height - b.h, b.w, b.h);
    pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Particles
// ═══════════════════════════════════════════════════════════════════════════════

function updateParticles() {
  for (let r of rain) {
    r.y += r.speed;
    r.x -= r.speed * 0.12;
    if (r.y > height + 20) { r.y = random(-30, -10); r.x = random(-10, width + 40); }
    if (r.x < -30) r.x = width + random(10, 30);
  }
  for (let m of motes) {
    m.x += m.vx;
    m.y += m.vy;
    if (m.y < -10 || m.x < -10 || m.x > width + 10) {
      m.x = random(width);
      m.y = height + random(5, 15);
    }
  }
}

function drawParticles() {
  for (let r of rain) {
    stroke(100, 150, 240, r.alpha);
    strokeWeight(1);
    line(r.x, r.y, r.x + r.len * 0.12, r.y - r.len);
  }
  noStroke();
  for (let m of motes) {
    fill(m.pink ? color(255, 50, 150, m.alpha) : color(0, 255, 240, m.alpha));
    ellipse(m.x, m.y, m.size, m.size);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Harsh glare columns + intense glare zones
// ═══════════════════════════════════════════════════════════════════════════════

function drawLights() {
  noStroke();
  for (let l of LIGHT_SOURCES) {
    let a = map(sin(frameCount * l.speed + l.phase), -1, 1, 25, 90);
    fill(255, 245, 210, a);
    rect(l.x, l.y, l.w, l.h);
  }
}

function drawGlareZones() {
  for (let gz of GLARE_ZONES) {
    let sx = gz.x;
    let ex = gz.x + gz.w;
    if (ex < camX - 50 || sx > camX + width + 50) continue;

    let t = frameCount;
    for (let i = 0; i < 3; i++) {
      let phase = i * 1.3;
      let pulse = 0.5 + 0.5 * sin(t * (0.04 + i * 0.012) + phase);
      let a = pulse * 35 * gz.intensity;
      noStroke();
      fill(255, 240, 200, constrain(a, 0, 255));
      let ox = gz.x + i * 40;
      let ow = gz.w - i * 80;
      if (ow > 0) rect(ox, 0, ow, height);
    }

    let centreX = gz.x + gz.w / 2;
    let bandW   = gz.w * 0.3;
    let bPulse  = 0.4 + 0.6 * sin(t * 0.06 + gz.x * 0.01);
    fill(255, 255, 240, constrain(bPulse * 25 * gz.intensity, 0, 255));
    rect(centreX - bandW / 2, 0, bandW, height);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Neon platforms
// ═══════════════════════════════════════════════════════════════════════════════

function drawPlatformNeon(p, a, hi) {
  noStroke();
  fill(0, 255, 140, 22 * a);
  rect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);

  fill(12, 45, 32, 210 * a);
  rect(p.x, p.y, p.w, p.h);

  stroke(0, 255, 140, 190 * a);
  strokeWeight(2);
  line(p.x, p.y, p.x + p.w, p.y);

  stroke(0, 255, 140, 65 * a);
  strokeWeight(1);
  line(p.x, p.y, p.x, p.y + p.h);
  line(p.x + p.w, p.y, p.x + p.w, p.y + p.h);

  stroke(0, 255, 140, 30 * a);
  line(p.x, p.y + p.h, p.x + p.w, p.y + p.h);

  if (hi > 0) {
    stroke(0, 255, 240, hi * 220);
    strokeWeight(2);
    noFill();
    rect(p.x - 1, p.y - 1, p.w + 2, p.h + 2);
  }
}

function drawMovingPlatformNeon(p, a, hi) {
  noStroke();
  fill(80, 40, 255, 18 * a);
  rect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);

  fill(22, 12, 55, 210 * a);
  rect(p.x, p.y, p.w, p.h);

  stroke(120, 80, 255, 190 * a);
  strokeWeight(2);
  line(p.x, p.y, p.x + p.w, p.y);

  stroke(120, 80, 255, 65 * a);
  strokeWeight(1);
  line(p.x, p.y, p.x, p.y + p.h);
  line(p.x + p.w, p.y, p.x + p.w, p.y + p.h);

  stroke(120, 80, 255, 30 * a);
  line(p.x, p.y + p.h, p.x + p.w, p.y + p.h);

  if (hi > 0) {
    stroke(0, 255, 240, hi * 220);
    strokeWeight(2);
    noFill();
    rect(p.x - 1, p.y - 1, p.w + 2, p.h + 2);
  }
}

function drawPlatformsFull() {
  for (let p of platforms) drawPlatformNeon(p, 1.0, 0);
  noStroke();
}

function drawMovingPlatformsFull() {
  for (let mp of movingPlatforms) drawMovingPlatformNeon(mp, 1.0, 0);
  noStroke();
}

function drawPlatforms() {
  let pcx = player.x + player.w / 2;
  let pcy = player.y + player.h / 2;
  for (let p of platforms) {
    let hi = 0;
    if (focusFade > 0 && distToRect(pcx, pcy, p.x, p.y, p.w, p.h) <= FOCUS_RADIUS) {
      hi = focusFade;
    }
    drawPlatformNeon(p, lerp(0.18, 1.0, hi), hi);
  }
  noStroke();
}

function drawMovingPlatforms() {
  let pcx = player.x + player.w / 2;
  let pcy = player.y + player.h / 2;
  for (let mp of movingPlatforms) {
    let hi = 0;
    if (focusFade > 0 && distToRect(pcx, pcy, mp.x, mp.y, mp.w, mp.h) <= FOCUS_RADIUS) {
      hi = focusFade;
    }
    drawMovingPlatformNeon(mp, lerp(0.18, 1.0, hi), hi);
  }
  noStroke();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Player (neon silhouette + afterimages)
// ═══════════════════════════════════════════════════════════════════════════════

function drawAfterimages() {
  for (let i = 0; i < afterimages.length; i++) {
    let ai = afterimages[i];
    ai.age++;
    let fade = map(ai.age, 0, 20, 50, 0);
    if (fade <= 0) { afterimages.splice(i, 1); i--; continue; }

    let px = ai.x, py = ai.y;
    noStroke();
    fill(0, 255, 240, fade * 0.3);
    rect(px - 1, py - 1, player.w + 2, player.h + 2);
    fill(16, 10, 28, fade);
    rect(px, py, player.w, player.h);

    stroke(0, 255, 240, fade * 0.7);
    strokeWeight(1);
    line(px + 4, py + 9, px + player.w - 4, py + 9);
    noStroke();
  }
}

function drawPlayer() {
  let px = player.x, py = player.y, pw = player.w, ph = player.h;
  noStroke();

  // Outer cyan glow
  fill(0, 255, 240, 14);
  rect(px - 5, py - 5, pw + 10, ph + 10);
  fill(0, 255, 240, 28);
  rect(px - 2, py - 2, pw + 4, ph + 4);

  // Dark body
  fill(16, 10, 28);
  rect(px, py, pw, ph);

  // Cyan visor
  stroke(0, 255, 240, 220);
  strokeWeight(2);
  line(px + 4, py + 9, px + pw - 4, py + 9);

  // Hot pink body accent
  stroke(255, 50, 150, 150);
  strokeWeight(1);
  line(px + 3, py + 20, px + pw - 3, py + 20);

  // Edge highlights
  stroke(0, 255, 240, 55);
  strokeWeight(1);
  line(px, py, px, py + ph);
  line(px + pw, py, px + pw, py + ph);

  noStroke();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Enemies (hot pink neon)
// ═══════════════════════════════════════════════════════════════════════════════

function drawEnemyNeon(e, a, hi) {
  let ex = e.x, ey = e.y, ew = e.w, eh = e.h;
  noStroke();

  fill(255, 40, 100, 28 * a);
  rect(ex - 3, ey - 3, ew + 6, eh + 6);

  fill(55, 8, 22, 210 * a);
  rect(ex, ey, ew, eh);

  stroke(255, 40, 100, 190 * a);
  strokeWeight(1.5);
  line(ex, ey, ex + ew, ey);

  stroke(255, 40, 100, 220 * a);
  strokeWeight(2);
  line(ex + 3, ey + 8, ex + ew - 3, ey + 8);

  if (hi > 0) {
    stroke(0, 255, 240, hi * 200);
    strokeWeight(2);
    noFill();
    rect(ex - 1, ey - 1, ew + 2, eh + 2);
  }
  noStroke();
}

function drawEnemiesFull() {
  for (let e of enemies) drawEnemyNeon(e, 1.0, 0);
}

function drawEnemies() {
  let pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  for (let e of enemies) {
    let hi = 0;
    if (focusFade > 0 && distToRect(pcx, pcy, e.x, e.y, e.w, e.h) <= FOCUS_RADIUS) {
      hi = focusFade;
    }
    drawEnemyNeon(e, lerp(0.18, 1.0, hi), hi);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Danger proximity warning (screen-space red edge pulse near enemies)
// ═══════════════════════════════════════════════════════════════════════════════

function drawDangerWarning() {
  let pcx = player.x + player.w / 2;
  let pcy = player.y + player.h / 2;
  let closestDist = Infinity;
  for (let e of enemies) {
    let d = distToRect(pcx, pcy, e.x, e.y, e.w, e.h);
    if (d < closestDist) closestDist = d;
  }

  // Subtle red vignette when within 150px of any enemy
  if (closestDist < 150) {
    let intensity = map(closestDist, 150, 30, 0, 1);
    intensity = constrain(intensity, 0, 1);
    let pulse = 0.6 + 0.4 * sin(frameCount * 0.15);
    let a = intensity * pulse * 55;

    let ctx = drawingContext;
    let cx = width / 2, cy = height / 2;
    let g = ctx.createRadialGradient(cx, cy, height * 0.25, cx, cy, height * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(255,20,60,' + (a / 255).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Goal (portal)
// ═══════════════════════════════════════════════════════════════════════════════

function drawPortalVFX(cx, cy, rx, ry, intensity) {
  let t = frameCount;

  noStroke();
  for (let i = 3; i >= 1; i--) {
    fill(80, 30, 180, 18 * i * intensity);
    ellipse(cx, cy, (rx + 18 * i) * 2, (ry + 11 * i) * 2);
  }

  let drift  = 0.5 + 0.5 * sin(t * 0.04);
  let fieldR = lerp(0,   80,  drift);
  let fieldG = lerp(200, 40,  drift);
  let fieldB = lerp(220, 255, drift);
  fill(fieldR, fieldG, fieldB, 40 * intensity);
  ellipse(cx, cy, rx * 2, ry * 2);

  for (let ly = cy - ry + 5; ly < cy + ry - 3; ly += 7) {
    let span    = sqrt(max(0, 1 - sq((ly - cy) / ry))) * rx * 0.88;
    let flicker = 0.4 + 0.6 * sin(t * 0.13 + ly * 0.22);
    stroke(0, 255, 240, 28 * flicker * intensity);
    strokeWeight(1);
    line(cx - span, ly, cx + span, ly);
  }
  noStroke();

  for (let i = 0; i < 5; i++) {
    let angle = t * 0.038 + i * TWO_PI / 5;
    let ox = cx + cos(angle) * (rx + 4);
    let oy = cy + sin(angle) * (ry + 3);
    fill(0, 255, 240, 190 * intensity);
    ellipse(ox, oy, 3.5, 3.5);
  }

  let pulse = 0.8 + 0.2 * sin(t * 0.09);
  stroke(0, 255, 240, 210 * pulse * intensity);
  strokeWeight(2.5);
  noFill();
  ellipse(cx, cy, rx * 2, ry * 2);

  stroke(160, 50, 255, 140 * pulse * intensity);
  strokeWeight(1.5);
  ellipse(cx, cy, (rx + 4) * 2, (ry + 3) * 2);

  for (let step = 0; step < 5; step++) {
    let ly   = cy - ry - 4 - step * 7;
    let prog = step / 4;
    let hw   = lerp(rx * 0.28, 0, prog);
    let la   = lerp(55, 0, prog) * intensity;
    stroke(0, 255, 240, la);
    strokeWeight(1);
    line(cx - hw, ly, cx + hw, ly);
  }

  noStroke();
  for (let i = 1; i <= 3; i++) {
    fill(0, 255, 240, lerp(18, 4, i / 3) * intensity);
    ellipse(cx, cy + ry + i * 5, rx * lerp(1.6, 0.4, i / 3), 4);
  }
  noStroke();
}

function drawGoalFull() { drawGoalNeon(1.0, 0); }

function drawGoalNeon(a, hi) {
  let cx = goal.x + goal.w / 2;
  let cy = goal.y + goal.h / 2;
  let rx = goal.w / 2;
  let ry = goal.h / 2;

  drawPortalVFX(cx, cy, rx, ry, a);

  if (hi > 0) {
    stroke(0, 255, 240, hi * 180);
    strokeWeight(2);
    noFill();
    ellipse(cx, cy, (rx + 7) * 2, (ry + 6) * 2);
    noStroke();
  }
}

function drawGoal() {
  let pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  let hi = 0;
  if (focusFade > 0 && distToRect(pcx, pcy, goal.x, goal.y, goal.w, goal.h) <= FOCUS_RADIUS) {
    hi = focusFade;
  }
  drawGoalNeon(lerp(0.18, 1.0, hi), hi);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Focus pulse + indicator
// ═══════════════════════════════════════════════════════════════════════════════

function drawFocusPulse() {
  if (!focusPulseOn) return;

  focusPulseR += 10;
  let maxR  = FOCUS_RADIUS + 30;
  let alpha = map(focusPulseR, 0, maxR, 200, 0);
  if (alpha <= 0) { focusPulseOn = false; return; }

  let cx = player.x + player.w / 2;
  let cy = player.y + player.h / 2;

  noFill();
  stroke(0, 255, 240, alpha);
  strokeWeight(2.5);
  ellipse(cx, cy, focusPulseR * 2, focusPulseR * 2);

  if (focusPulseR > 18) {
    stroke(0, 255, 240, alpha * 0.3);
    strokeWeight(1);
    ellipse(cx, cy, (focusPulseR - 18) * 2, (focusPulseR - 18) * 2);
  }
  noStroke();
}

function drawFocusIndicator() {
  let cx = player.x + player.w / 2;
  let cy = player.y + player.h + 12;
  noStroke();

  if (focusCooldown > 0) {
    fill(45, 40, 60);
    ellipse(cx, cy, 8, 8);
    let prog = 1 - focusCooldown / FOCUS_COOLDOWN_FRAMES;
    stroke(0, 255, 240, 90);
    strokeWeight(1.5);
    noFill();
    arc(cx, cy, 13, 13, -HALF_PI, -HALF_PI + prog * TWO_PI);
  } else {
    fill(0, 255, 240, 35);
    ellipse(cx, cy, 14, 14);
    fill(0, 255, 240);
    ellipse(cx, cy, 6, 6);
  }
  noStroke();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Death counter HUD
// ═══════════════════════════════════════════════════════════════════════════════

function drawDeathCounter() {
  if (deathCount === 0) return;

  textAlign(RIGHT, TOP);
  noStroke();

  fill(255, 40, 100, 25);
  rect(width - 110, 8, 100, 24, 3);

  fill(255, 40, 100, 180);
  textSize(11);
  textStyle(BOLD);
  text("BREACHES: " + deathCount, width - 16, 14);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Screen-space overlays
// ═══════════════════════════════════════════════════════════════════════════════

function drawScanlines() {
  let ctx = drawingContext;
  ctx.fillStyle = 'rgba(0,0,0,0.055)';
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }
}

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

// ═══════════════════════════════════════════════════════════════════════════════
//  RESET + UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

function resetGame() {
  player.x = 60; player.y = 360;
  player.vx = 0; player.vy = 0;
  player.onGround = false;

  let startPositions = [
    { x: 1185, dir: 1 },
    { x: 2680, dir: -1 },
    { x: 2860, dir: 1 },
    { x: 4050, dir: 1 },
  ];
  for (let i = 0; i < enemies.length; i++) {
    enemies[i].x = startPositions[i].x;
    enemies[i].dir = startPositions[i].dir;
  }

  camX            = 0;
  focusActive     = false;
  focusFade       = 0;
  focusCooldown   = 0;
  prevFocusKey    = false;
  focusPulseOn    = false;
  focusPulseR     = 0;
  focusFlashTimer = 0;
  deathCount      = 0;
  deathShakeTimer = 0;
  deathFlashTimer = 0;
  afterimages     = [];
  coyoteTimer     = 0;
  wasOnGround     = false;
  jumpHeld        = false;

  gameState  = "start";
  introTimer = 0;
  winTimer   = 0;
}

function distToRect(px, py, rx, ry, rw, rh) {
  let dx = max(rx - px, 0, px - (rx + rw));
  let dy = max(ry - py, 0, py - (ry + rh));
  return sqrt(dx * dx + dy * dy);
}
