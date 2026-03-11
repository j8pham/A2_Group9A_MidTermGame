// ═══════════════════════════════════════════════════════════════════════════════
//  DATA BREACH — cyberpunk platformer
//  p5.js · 800 × 450 · hand-designed static level
// ═══════════════════════════════════════════════════════════════════════════════

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const GRAVITY    = 1.0;
const MOVE_SPEED = 5.5;
const JUMP_FORCE = -15;
const TERM_VEL   = 22;
const WORLD_W    = 4800;

const FOCUS_RADIUS         = 280;
const FOCUS_FADE_FRAMES    = 90;   // 1.5s fade on release
const FOCUS_COOLDOWN_FRAMES = 210; // 3.5s cooldown before reuse

const INTRO_NORMAL_F = 60;
const INTRO_SHAKE_F  = 30;
const INTRO_FLASH_F  = 24;

const RAIN_COUNT = 50;
const MOTE_COUNT = 15;

const COYOTE_FRAMES     = 7;
const JUMP_CUT_MULT     = 0.42;
const DOUBLE_JUMP_FORCE = -10;

const LIGHT_SOURCES = [
  { x: 200,  y: 0, w: 300, h: 450, phase: 0.0,  speed: 0.038 },
  { x: 850,  y: 0, w: 240, h: 450, phase: 2.1,  speed: 0.055 },
  { x: 1480, y: 0, w: 320, h: 450, phase: 1.4,  speed: 0.031 },
  { x: 2200, y: 0, w: 260, h: 450, phase: 0.7,  speed: 0.048 },
  { x: 3000, y: 0, w: 280, h: 450, phase: 1.9,  speed: 0.042 },
  { x: 3800, y: 0, w: 350, h: 450, phase: 0.3,  speed: 0.036 },
];

const GLARE_ZONES = [
  { x: 700,  w: 350, intensity: 1.4 },
  { x: 2600, w: 600, intensity: 3.0 },
  { x: 3800, w: 900, intensity: 3.8 },
];

const DARK_ZONES = [
  { x: 1700, w: 450, intensity: 0.72 },
  { x: 4050, w: 350, intensity: 0.82 },
];

const WIN_BTN = { x: 310, y: 378, w: 180, h: 40 };

const DEATH_SHAKE_FRAMES = 18;
const DEATH_FLASH_FRAMES = 14;
const FOCUS_FLASH_FRAMES = 10;

const AFTERIMAGE_COUNT   = 6;
const AFTERIMAGE_SPACING = 3;

const JAMIE_ANIM_SPEED = 8;
const JAMIE_DRAW_W     = 48;
const JAMIE_DRAW_H     = 48;

const SPIKE_W      = 16;
const SPIKE_H      = 14;
const LASER_CYCLE  = 180;
const LASER_ON_FRAC = 0.6;

// ── STATIC LEVEL DATA ────────────────────────────────────────────────────────
//  Zone 1 (0–1450):    Tutorial — wide platforms, gentle gaps, no threats.
//  Zone 2 (1450–2600): Medium  — enemies A–B, spikes, laser 1, moving platform.
//  Zone 3 (2600–3750): Hard    — enemies C–D, tighter jumps, laser 2, glare.
//  Zone 4 (3750–4800): Brutal  — enemies E–F, small platforms, laser 3, heavy glare.

const LEVEL_PLATFORMS = [
  // Zone 1
  { x: 0,    y: 400, w: 350, h: 50 }, // start
  { x: 430,  y: 385, w: 200, h: 20 },
  { x: 700,  y: 370, w: 185, h: 20 },
  { x: 955,  y: 352, w: 225, h: 20 },
  { x: 1245, y: 358, w: 175, h: 20 },
  // Zone 2
  { x: 1480, y: 332, w: 180, h: 20 }, // enemy A
  { x: 1720, y: 298, w: 145, h: 20 },
  { x: 1925, y: 320, w: 120, h: 20 }, // spikes
  { x: 2110, y: 275, w: 205, h: 20 }, // enemy B + laser 1 (pre-widened for combo)
  { x: 2520, y: 298, w: 155, h: 20 }, // after moving platform 1
  // Zone 3
  { x: 2745, y: 265, w: 155, h: 20 }, // enemy C
  { x: 2975, y: 240, w: 100, h: 20 }, // spikes
  { x: 3140, y: 282, w: 90,  h: 20 },
  { x: 3300, y: 242, w: 195, h: 20 }, // enemy D + laser 2 (pre-widened)
  { x: 3610, y: 275, w: 125, h: 20 }, // after moving platform 2
  // Zone 4
  { x: 3810, y: 238, w: 135, h: 20 }, // enemy E
  { x: 4020, y: 203, w: 80,  h: 20 }, // spikes
  { x: 4175, y: 242, w: 195, h: 20 }, // enemy F + laser 3 (pre-widened)
  { x: 4450, y: 207, w: 80,  h: 20 }, // spikes
  { x: 4630, y: 368, w: 160, h: 50 }, // final
];

const LEVEL_MOVING_PLATFORMS = [
  // MP1: x-axis — bridges Zone2 gap (P8 ends 2315 → P9 starts 2520)
  { x: 2400, y: 260, w: 75, h: 20, axis: "x", origin: 2400, range: 65, speed: 0.8, dx: 0, dy: 0 },
  // MP2: y-axis — vertical oscillation bridges Zone3 gap (P13 ends 3495 → P14 starts 3610)
  { x: 3510, y: 260, w: 80, h: 20, axis: "y", origin: 260,  range: 50, speed: 1.0, dx: 0, dy: 0 },
  // MP3: x-axis — bridges Zone4 final gap (P18 ends 4530 → Final starts 4630)
  { x: 4565, y: 210, w: 65, h: 20, axis: "x", origin: 4565, range: 40, speed: 1.2, dx: 0, dy: 0 },
];

const LEVEL_ENEMIES = [
  // Zone 2 — slower
  { x: 1480, y: 302, w: 22, h: 30, speed: 0.90, dir: 1, leftBound: 1480, rightBound: 1638, startX: 1480, startDir: 1 },
  { x: 2110, y: 245, w: 22, h: 30, speed: 1.15, dir: 1, leftBound: 2110, rightBound: 2293, startX: 2110, startDir: 1 },
  // Zone 3 — medium
  { x: 2745, y: 235, w: 22, h: 30, speed: 1.45, dir: 1, leftBound: 2745, rightBound: 2878, startX: 2745, startDir: 1 },
  { x: 3300, y: 212, w: 22, h: 30, speed: 1.65, dir: 1, leftBound: 3300, rightBound: 3473, startX: 3300, startDir: 1 },
  // Zone 4 — fast
  { x: 3810, y: 208, w: 22, h: 30, speed: 1.85, dir: 1, leftBound: 3810, rightBound: 3923, startX: 3810, startDir: 1 },
  { x: 4175, y: 212, w: 22, h: 30, speed: 2.05, dir: 1, leftBound: 4175, rightBound: 4348, startX: 4175, startDir: 1 },
];

// Spikes are fully static — referenced directly, never modified
const LEVEL_SPIKES = [
  { x: 1969, y: 306, w: 16, h: 14 }, // on P7
  { x: 1985, y: 306, w: 16, h: 14 },
  { x: 3009, y: 226, w: 16, h: 14 }, // on P11
  { x: 3025, y: 226, w: 16, h: 14 },
  { x: 4044, y: 189, w: 16, h: 14 }, // on P16
  { x: 4060, y: 189, w: 16, h: 14 },
  { x: 4474, y: 193, w: 16, h: 14 }, // on P18
  { x: 4490, y: 193, w: 16, h: 14 },
];

// Lasers are fully static — referenced directly, never modified
const LEVEL_LASERS = [
  { x: 2100, y: 220, w: 215, h: 4, phase: 30  }, // above P8
  { x: 3290, y: 182, w: 205, h: 4, phase: 90  }, // above P13
  { x: 4165, y: 182, w: 205, h: 4, phase: 150 }, // above P17
];

const LEVEL_GOAL = { x: 4748, y: 316, w: 36, h: 52 };

const LEVEL_CHECKPOINTS = [
  { x: 1783, y: 258, w: 18, h: 40 }, // center of P6 (x:1720, y:298) — no enemy, no spikes
  { x: 3663, y: 235, w: 18, h: 40 }, // center of P14 (x:3610, y:275) — no enemy, no spikes
];

const LEVEL_VISION_PICKUP = { x: 3150, y: 262, w: 16, h: 16 };

const VISION_BOOST_FRAMES = 300;
const VISION_FADE_FRAMES  = 60;
const DARK_WALL_SPEED     = 1.2;

// ── ASSET LOADING ────────────────────────────────────────────────────────────
let buildingImgs = [];
let jamieIdle    = [];
let jamieRun     = [];
let jamieJump    = [];
let bgMusic;
let sfxJump, sfxDoubleJump, sfxFocus, sfxDeath, sfxGoal;

function preload() {
  for (let i = 2; i <= 8; i++) {
    let pad = i < 10 ? "0" + i : "" + i;
    buildingImgs.push(loadImage("assets/Single Buildings/Pixel Art Buildings-" + pad + ".png"));
  }
  for (let i = 1; i <= 3; i++) jamieIdle.push(loadImage("assets/JAMIE/IDLE/Jamie_IDLE_" + i + ".png"));
  for (let i = 1; i <= 4; i++) jamieRun.push(loadImage("assets/JAMIE/RUN/Jamie_RUN_" + i + ".png"));
  for (let i = 1; i <= 5; i++) jamieJump.push(loadImage("assets/JAMIE/JUMP/Jamie_JUMP_" + i + ".png"));
  bgMusic       = loadSound("assets/nikitakondrashev-cyberpunk-437545.mp3");
  sfxJump       = loadSound("assets/302 sound effects/Jump.mp3");
  sfxDoubleJump = loadSound("assets/302 sound effects/Dash.mp3");
  sfxFocus      = loadSound("assets/302 sound effects/Focus.mp3");
  sfxDeath      = loadSound("assets/302 sound effects/Breach(death).mp3");
  sfxGoal       = loadSound("assets/302 sound effects/Explosion then power down.mp3");
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let player;
let platforms, movingPlatforms, enemies, goal;
let spikes, lasers;
let allPlats = []; // built once: platforms + movingPlatform refs (updated in-place)

let camX        = 0;
let playerFacing = 1;

let canDoubleJump = false;

let checkpoints       = [];
let activeCheckpointIdx = -1;
let cpPulseTimers     = [];

let visionPickup      = null;
let visionBoostTimer  = 0;

let darkWallX         = -200;
let darkWallActive    = false;

let gameState    = "start";
let introTimer   = 0;
let winTimer     = 0;
let menuSelection = 0;

let focusActive     = false;
let focusFade       = 0;
let prevFocusKey    = false;
let focusPulseR     = 0;
let focusPulseOn    = false;
let focusFlashTimer = 0;
let focusCooldown   = 0;
let focusWasUsed    = false; // tracks if echolocation was used (for cooldown trigger)

let deathCount      = 0;
let deathShakeTimer = 0;
let deathFlashTimer = 0;

let coyoteTimer = 0;
let wasOnGround = false;
let jumpHeld    = false;

let afterimages = [];

let bgLayer1 = [];
let bgLayer2 = [];
let rain     = [];
let motes    = [];

// Pre-allocated scratch objects to avoid per-frame GC pressure
const _mpFeet = { x: 0, y: 0, w: 30, h: 4 };
const _mpTop  = { x: 0, y: 0, w: 0,  h: 6 };

// ═══════════════════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════════════════

function setup() {
  createCanvas(800, 450);
  frameRate(60);
  fitCanvas();
  player = { x: 60, y: 360, w: 30, h: 40, vx: 0, vy: 0, onGround: false };
  initLevel();
  initParallax();
  initParticles();
}

function windowResized() { fitCanvas(); }

function fitCanvas() {
  let sc = min(windowWidth / 800, windowHeight / 450);
  document.querySelector("canvas").style.transform = "translate(-50%, -50%) scale(" + sc + ")";
}

// ── Level initialisation ───────────────────────────────────────────────────────
function initLevel() {
  // Shallow-copy mutable arrays from const level data
  platforms       = LEVEL_PLATFORMS.map(p  => Object.assign({}, p));
  movingPlatforms = LEVEL_MOVING_PLATFORMS.map(mp => Object.assign({}, mp));
  enemies         = LEVEL_ENEMIES.map(e  => Object.assign({}, e));
  spikes          = LEVEL_SPIKES;   // immutable — share reference
  lasers          = LEVEL_LASERS;   // immutable — share reference
  goal            = Object.assign({}, LEVEL_GOAL);
  // Single combined array — moving platform positions update in-place
  allPlats = platforms.concat(movingPlatforms);
  checkpoints         = LEVEL_CHECKPOINTS.map(c => Object.assign({ activated: false }, c));
  activeCheckpointIdx = -1;
  cpPulseTimers       = checkpoints.map(() => 0);
  visionPickup        = Object.assign({}, LEVEL_VISION_PICKUP);
  visionBoostTimer    = 0;
  darkWallX           = -200;
  darkWallActive      = false;
}

// ── Parallax generation ────────────────────────────────────────────────────────
function initParallax() {
  bgLayer1 = [];
  bgLayer2 = [];
  let farIdx = [3, 4, 6];
  let x1 = -300;
  while (x1 < WORLD_W + 600) {
    let idx = farIdx[floor(random(farIdx.length))];
    let img = buildingImgs[idx];
    let sc  = random(0.22, 0.38);
    bgLayer1.push({ x: x1, w: img.width * sc, h: img.height * sc, imgIdx: idx });
    x1 += img.width * sc + random(20, 70);
  }
  let x2 = -300;
  while (x2 < WORLD_W + 600) {
    let idx = floor(random(buildingImgs.length));
    let img = buildingImgs[idx];
    let sc  = random(0.32, 0.55);
    bgLayer2.push({ x: x2, w: img.width * sc, h: img.height * sc, imgIdx: idx });
    x2 += img.width * sc + random(-10, 25);
  }
}

// ── Particle initialisation ────────────────────────────────────────────────────
function initParticles() {
  rain  = [];
  motes = [];
  for (let i = 0; i < RAIN_COUNT; i++) {
    rain.push({ x: random(width + 40), y: random(-20, height),
                speed: random(5, 9), len: random(12, 22), alpha: random(15, 40) });
  }
  for (let i = 0; i < MOTE_COUNT; i++) {
    motes.push({ x: random(width), y: random(height),
                 vx: random(-0.3, 0.3), vy: random(-0.6, -0.15),
                 size: random(1.5, 3), alpha: random(60, 160), pink: random() > 0.6 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════════════

function draw() {
  if (gameState === "start") { drawStartScreen(); return; }
  if (gameState === "win")   { drawWinScreen();   return; }

  if (gameState === "winning") {
    winTimer++;
    background(12, 8, 20);
    drawParallax(true);
    push(); translate(-camX, 0);
    drawLights(); drawPlatforms(); drawMovingPlatforms();
    drawGoal(); drawEnemies();
    pop();
    updateParticles(); drawParticles();
    drawScanlines(); drawVignette();
    let portalSX = goal.x + goal.w / 2 - camX;
    let portalSY = goal.y + goal.h / 2;
    let r    = map(winTimer, 0, 28, 0, dist(0, 0, width, height) * 1.1);
    let alph = winTimer < 18 ? map(winTimer, 0, 18, 0, 230) : 230;
    noStroke(); fill(0, 210, 255, constrain(alph, 0, 255));
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

  // ── PLAY ──────────────────────────────────────────────────────────────────
  updateFocus();
  updateEnemies();
  updateDarkWall();
  updateVisionPickup();
  updateCheckpoints();
  checkEnemyCollision();
  checkTrapCollision();
  if (overlaps(player, goal)) { gameState = "winning"; winTimer = 0; playSfx(sfxGoal, 0.65); return; }

  if (deathShakeTimer > 0) deathShakeTimer--;
  if (deathFlashTimer > 0) deathFlashTimer--;

  background(12, 8, 20);
  drawParallax(true);

  push();
  let dsx = 0, dsy = 0;
  if (deathShakeTimer > 0) {
    let mag = map(deathShakeTimer, 0, DEATH_SHAKE_FRAMES, 0, 8);
    dsx = random(-mag, mag); dsy = random(-mag, mag);
  }
  translate(-camX + dsx, dsy);

  drawLights();
  drawGlareZones();
  drawPlatforms();
  drawMovingPlatforms();
  drawGoal();
  drawCheckpoints();
  drawVisionPickup();
  drawEnemies();
  drawSpikes();
  drawLasers();
  drawAfterimages();
  drawPlayer();
  drawFocusPulse();
  drawFocusIndicator();
  pop();
  drawDarkZones();
  drawDarkWall();

  updateParticles();
  drawParticles();

  if (focusFlashTimer > 0) {
    focusFlashTimer--;
    let fa = map(focusFlashTimer, FOCUS_FLASH_FRAMES, 0, 60, 0);
    noStroke(); fill(0, 255, 240, constrain(fa, 0, 255));
    rect(0, 0, width, height);
  }
  if (deathFlashTimer > 0) {
    let da = map(deathFlashTimer, DEATH_FLASH_FRAMES, 0, 100, 0);
    noStroke(); fill(255, 20, 60, constrain(da, 0, 255));
    rect(0, 0, width, height);
  }

  drawDangerWarning();
  drawScanlines();
  drawVignette();
  drawHUD();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME STATES
// ═══════════════════════════════════════════════════════════════════════════════

function drawGlitchLine(y, halfW, r, g, b, maxAlpha) {
  let segments = 18;
  let segW = (halfW * 2) / segments;
  let cx   = width / 2;
  for (let i = 0; i < segments; i++) {
    if (random() < 0.3) continue;
    let sx  = cx - halfW + i * segW;
    let jy  = y + random(-1.5, 1.5);
    let sw  = segW * random(0.5, 1.0);
    let a   = maxAlpha * random(0.4, 1.0);
    stroke(r, g, b, a);
    strokeWeight(random(1, 2.5));
    line(sx, jy, sx + sw, jy);
  }
  noStroke();
}

function drawStartScreen() {
  background(12, 8, 20);
  let saved = camX;
  camX = 200 + sin(frameCount * 0.005) * 200;
  drawParallax(true);
  camX = saved;
  updateParticles(); drawParticles();

  let btnW = 180, btnH = 34;
  let startBtnY = 290, exitBtnY = 335;
  let btnX = width / 2 - btnW / 2;
  if (mouseX >= btnX && mouseX <= btnX + btnW) {
    if (mouseY >= startBtnY && mouseY <= startBtnY + btnH) menuSelection = 0;
    if (mouseY >= exitBtnY  && mouseY <= exitBtnY  + btnH) menuSelection = 1;
  }

  let cx = width / 2;
  textAlign(CENTER, CENTER); noStroke();

  // Title glow layers
  let titleY   = 80;
  let titleGlow = 220 + 35 * sin(frameCount * 0.04);
  fill(0, titleGlow, constrain(titleGlow - 10, 0, 255), 15);
  textSize(64); textStyle(BOLD);
  text("DATA BREACH", cx + 2, titleY + 2);
  text("DATA BREACH", cx - 2, titleY - 2);
  fill(0, titleGlow, constrain(titleGlow - 10, 0, 255));
  textSize(62);
  text("DATA BREACH", cx, titleY);

  drawGlitchLine(titleY - 38, 200, 255, 40, 80, 180);
  drawGlitchLine(titleY + 38, 200, 255, 40, 80, 180);

  fill(180, 140, 255); textSize(12); textStyle(NORMAL);
  text("VISION IS A LIMITED RESOURCE", cx, titleY + 60);

  // Controls
  let ctrlY  = 190;
  let startX = cx - 260;
  drawKeyCluster(startX, ctrlY, ["W", "A", "S", "D"]);
  fill(160, 140, 210); textSize(9); textAlign(CENTER, TOP);
  text("MOVE", startX + 34, ctrlY + 48);

  let arrowX = startX + 120;
  drawKeyCluster(arrowX, ctrlY, ["\u2191", "\u2190", "\u2193", "\u2192"]);
  fill(160, 140, 210); textSize(9); textAlign(CENTER, TOP);
  text("MOVE", arrowX + 34, ctrlY + 48);

  let fX = startX + 270;
  drawKeyCap(fX, ctrlY + 10, 32, 28, "F");
  fill(160, 140, 210); textSize(8); textAlign(CENTER, TOP);
  text("ECHOLOCATION", fX + 16, ctrlY + 48);

  let spaceX = startX + 355;
  drawKeyCap(spaceX, ctrlY + 10, 70, 28, "SPACE");
  fill(160, 140, 210); textSize(9); textAlign(CENTER, TOP);
  text("JUMP", spaceX + 35, ctrlY + 48);

  textAlign(CENTER, CENTER);
  drawMenuButton(cx, startBtnY + btnH / 2, btnW, btnH, "START GAME", menuSelection === 0);
  drawMenuButton(cx, exitBtnY  + btnH / 2, btnW, btnH, "EXIT GAME",  menuSelection === 1);

  if (sin(frameCount * 0.07) > 0) {
    fill(160, 140, 210, 200); textSize(10);
    text("PRESS ENTER OR CLICK TO SELECT", cx, 395);
  }
  drawScanlines(); drawVignette();
}

function drawKeyCap(x, y, w, h, label) {
  noStroke(); fill(30, 25, 45, 200); rect(x, y, w, h, 4);
  stroke(80, 70, 110, 120); strokeWeight(1); noFill(); rect(x, y, w, h, 4);
  noStroke(); fill(200, 185, 240); textSize(11); textStyle(BOLD);
  textAlign(CENTER, CENTER); text(label, x + w / 2, y + h / 2); textStyle(NORMAL);
}

function drawKeyCluster(x, y, keys) {
  let kw = 24, kh = 20, gap = 2;
  drawKeyCap(x + kw + gap,       y,          kw, kh, keys[0]);
  drawKeyCap(x,                  y + kh + gap, kw, kh, keys[1]);
  drawKeyCap(x + kw + gap,       y + kh + gap, kw, kh, keys[2]);
  drawKeyCap(x + (kw + gap) * 2, y + kh + gap, kw, kh, keys[3]);
}

function drawMenuButton(cx, cy, w, h, label, selected) {
  let bx = cx - w / 2, by = cy - h / 2;
  if (selected) {
    let pulse = 0.7 + 0.3 * sin(frameCount * 0.08);
    noStroke();
    fill(0, 255, 240, 12 * pulse); rect(bx - 4, by - 4, w + 8, h + 8, 4);
    fill(0, 255, 240, 25 * pulse); rect(bx, by, w, h, 3);
    drawGlitchLine(by - 3,     w / 2 - 10, 255, 40, 80, 120);
    drawGlitchLine(by + h + 3, w / 2 - 10, 255, 40, 80, 120);
    stroke(0, 255, 240, 200 * pulse); strokeWeight(1.5); noFill(); rect(bx, by, w, h, 3); noStroke();
    fill(0, 255, 240); textSize(14); textStyle(BOLD); text(label, cx, cy); textStyle(NORMAL);
  } else {
    noStroke(); fill(35, 30, 50, 150); rect(bx, by, w, h, 3);
    stroke(70, 60, 90, 80); strokeWeight(1); noFill(); rect(bx, by, w, h, 3); noStroke();
    fill(190, 170, 230); textSize(14); textStyle(BOLD); text(label, cx, cy); textStyle(NORMAL);
  }
}

function drawIntroScene() {
  let shakeEnd = INTRO_NORMAL_F + INTRO_SHAKE_F;
  let flashEnd = shakeEnd + INTRO_FLASH_F;
  let inShake  = introTimer >= INTRO_NORMAL_F && introTimer < shakeEnd;
  let inFlash  = introTimer >= shakeEnd;
  let sx = 0, sy = 0;
  if (inShake) {
    let t = (introTimer - INTRO_NORMAL_F) / INTRO_SHAKE_F;
    let mag = lerp(11, 0, t);
    sx = random(-mag, mag); sy = random(-mag, mag);
  }
  background(12, 8, 20);
  drawParallax(inFlash);
  updateEnemies();
  push(); translate(-camX + sx, sy);
  if (inFlash) {
    drawLights(); drawPlatforms(); drawMovingPlatforms(); drawGoal(); drawEnemies();
  } else {
    drawPlatformsFull(); drawMovingPlatformsFull(); drawGoalFull(); drawEnemiesFull();
  }
  drawPlayer(); pop();
  updateParticles(); drawParticles(); drawScanlines();
  if (inFlash) {
    drawVignette();
    let a = map(introTimer, shakeEnd, flashEnd, 255, 0);
    noStroke(); fill(255, 255, 255, constrain(a, 0, 255)); rect(0, 0, width, height);
  }
}

function drawWinScreen() {
  background(12, 8, 20);
  updateParticles(); drawParticles();
  let pcx = width / 2, pcy = 218;
  drawPortalVFX(pcx, pcy, 52, 82, 1.0);
  if (jamieIdle.length > 0) {
    push(); tint(255, 255, 255, 200); imageMode(CENTER);
    image(jamieIdle[0], pcx, pcy + 6, 32, 32);
    imageMode(CORNER); pop();
  }
  textAlign(CENTER, CENTER);
  fill(0, 255, 240); textSize(44); textStyle(BOLD); text("DATA SECURED", pcx, 68);
  stroke(255, 50, 150, 70); strokeWeight(1); line(pcx - 190, 90, pcx + 190, 90); noStroke();
  fill(200, 60, 255); textSize(14); textStyle(NORMAL); text("OBJECTIVE COMPLETE", pcx, 322);
  fill(255, 50, 150, 180); textSize(11);
  text(deathCount === 0 ? "FLAWLESS RUN   //   ZERO BREACHES"
                        : "SYSTEM BREACHES: " + deathCount, pcx, 350);
  fill(45, 42, 65); textSize(10);
  text("ACCESS NODE REACHED   //   NEURAL LINK ESTABLISHED", pcx, 368);
  stroke(0, 255, 240, 200); strokeWeight(1); noFill(); rect(WIN_BTN.x, WIN_BTN.y, WIN_BTN.w, WIN_BTN.h);
  noStroke(); fill(0, 255, 240); textSize(12); textStyle(BOLD);
  text("RESTART", pcx, WIN_BTN.y + WIN_BTN.h / 2);
  drawScanlines(); drawVignette();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FOCUS MECHANIC
// ═══════════════════════════════════════════════════════════════════════════════

function updateFocus() {
  let fHeld    = keyIsDown(70);
  let canFocus = player.onGround && abs(player.vx) < 0.5 && focusCooldown <= 0;

  // Cooldown tick
  if (focusCooldown > 0) {
    focusCooldown--;
    if (focusCooldown === 0 && focusWasUsed) {
      playSfx(sfxDoubleJump, 0.25); // "echolocation ready" chime
      focusWasUsed = false;
    }
  }

  if (fHeld && canFocus) {
    if (!focusActive) {
      focusPulseOn    = true;
      focusPulseR     = 0;
      focusFlashTimer = FOCUS_FLASH_FRAMES;
      playSfx(sfxFocus, 0.50);
    }
    focusActive = true;
  } else {
    // Start cooldown when releasing after use
    if (focusActive && !fHeld) {
      focusCooldown = FOCUS_COOLDOWN_FRAMES;
      focusWasUsed  = true;
    }
    focusActive = false;
  }
  focusFade    = focusActive ? 1.0 : max(0, focusFade - 1 / FOCUS_FADE_FRAMES);
  prevFocusKey = fHeld;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHYSICS & COLLISION
// ═══════════════════════════════════════════════════════════════════════════════

function updatePlayer() {
  let speed = focusActive ? MOVE_SPEED * 0.3 : MOVE_SPEED;

  player.vx = 0;
  if (keyIsDown(LEFT_ARROW)  || keyIsDown(65)) { player.vx = -speed; playerFacing = -1; }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { player.vx =  speed; playerFacing =  1; }

  // Afterimage trail
  let trailRate = AFTERIMAGE_SPACING;
  if (gameState === "play" && abs(player.vx) > 0.5 && frameCount % trailRate === 0) {
    afterimages.push({ x: player.x, y: player.y, age: 0 });
    if (afterimages.length > AFTERIMAGE_COUNT) afterimages.shift();
  }

  player.vy += GRAVITY;
  if (player.vy > TERM_VEL) player.vy = TERM_VEL;

  // Variable jump height
  if (jumpHeld && !keyIsDown(UP_ARROW) && !keyIsDown(87) && !keyIsDown(32) && player.vy < 0) {
    player.vy *= JUMP_CUT_MULT;
    jumpHeld = false;
  }

  // Coyote time
  if (player.onGround) {
    coyoteTimer = COYOTE_FRAMES; wasOnGround = true; canDoubleJump = false;
  } else if (wasOnGround) {
    coyoteTimer--;
    if (coyoteTimer <= 0) wasOnGround = false;
  }
  player.onGround = false;

  // Horizontal collision
  player.x += player.vx;
  for (let p of allPlats) {
    if (overlaps(player, p)) {
      player.x  = player.vx > 0 ? p.x - player.w : p.x + p.w;
      player.vx = 0;
    }
  }
  player.x = constrain(player.x, 0, WORLD_W - player.w);

  // Vertical collision
  player.y += player.vy;
  for (let p of allPlats) {
    if (overlaps(player, p)) {
      if (player.vy > 0) { player.y = p.y - player.h; player.onGround = true; }
      else               { player.y = p.y + p.h; }
      player.vy = 0;
    }
  }

  if (player.y > height + 200) triggerDeath();
}

function updateMovingPlatforms() {
  for (let mp of movingPlatforms) {
    let prevX = mp.x, prevY = mp.y;
    let t = frameCount * mp.speed * 0.02;
    if (mp.axis === "x") mp.x = mp.origin + sin(t) * mp.range;
    else                 mp.y = mp.origin + sin(t) * mp.range;
    mp.dx = mp.x - prevX;
    mp.dy = mp.y - prevY;
  }
  // Stick player to moving platform surface
  _mpFeet.x = player.x;
  _mpFeet.y = player.y + player.h;
  for (let mp of movingPlatforms) {
    _mpTop.x = mp.x; _mpTop.y = mp.y - 2; _mpTop.w = mp.w;
    if (player.onGround && overlaps(_mpFeet, _mpTop)) {
      player.x += mp.dx;
      player.y += mp.dy;
      break;
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
    if (overlaps(player, e)) { triggerDeath(); return; }
  }
}

function checkTrapCollision() {
  for (let s of spikes) {
    if (overlaps(player, s)) { triggerDeath(); return; }
  }
  for (let l of lasers) {
    let cycle = (frameCount + l.phase) % LASER_CYCLE;
    if (cycle < LASER_CYCLE * LASER_ON_FRAC && overlaps(player, l)) {
      triggerDeath(); return;
    }
  }
}

function triggerDeath() {
  playSfx(sfxDeath, 0.60);
  deathCount++;
  deathShakeTimer = DEATH_SHAKE_FRAMES;
  deathFlashTimer = DEATH_FLASH_FRAMES;
  if (activeCheckpointIdx >= 0) {
    let cp = checkpoints[activeCheckpointIdx];
    player.x = cp.x - player.w / 2;
    player.y = cp.y - player.h;
  } else {
    player.x = 60; player.y = 360;
  }
  player.vx = 0; player.vy = 0;
  focusActive = false; focusFade = 0; prevFocusKey = false;
  focusPulseOn = false; focusPulseR = 0;
  focusCooldown = 0; focusWasUsed = false;
  afterimages = []; coyoteTimer = 0; wasOnGround = false;
  jumpHeld = false; canDoubleJump = false;
  darkWallX = -200; darkWallActive = false;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════════════════════════════════

function keyPressed() {
  if (gameState === "start") {
    if (keyCode === DOWN_ARROW || keyCode === 83) { menuSelection = (menuSelection + 1) % 2; return; }
    if (keyCode === UP_ARROW   || keyCode === 87) { menuSelection = (menuSelection + 1) % 2; return; }
    if (keyCode === ENTER || keyCode === 32) {
      if (menuSelection === 0) { gameState = "intro"; introTimer = 0; startMusic(); }
      return;
    }
    return;
  }
  if (keyCode === UP_ARROW || keyCode === 87 || keyCode === 32) {
    if (player.onGround || (wasOnGround && coyoteTimer > 0)) {
      player.vy = JUMP_FORCE; player.onGround = false;
      wasOnGround = false; coyoteTimer = 0; jumpHeld = true;
      canDoubleJump = true; playSfx(sfxJump, 0.45);
    } else if (canDoubleJump) {
      player.vy = DOUBLE_JUMP_FORCE; jumpHeld = true;
      canDoubleJump = false; playSfx(sfxDoubleJump, 0.35);
    }
  }
}

function keyReleased() {
  if (keyCode === UP_ARROW || keyCode === 87 || keyCode === 32) jumpHeld = false;
}

function mousePressed() {
  if (gameState === "start") {
    let btnW = 180, btnH = 34, btnX = width / 2 - 90, startBtnY = 290;
    if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= startBtnY && mouseY <= startBtnY + btnH) {
      gameState = "intro"; introTimer = 0; startMusic();
    }
    return;
  }
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
//  VISUAL — Parallax city skyline
// ═══════════════════════════════════════════════════════════════════════════════

function drawParallax(lowVis) {
  let dim = lowVis ? 0.52 : 0.95;
  let off1 = camX * 0.08;
  for (let b of bgLayer1) {
    let sx = b.x - off1;
    if (sx + b.w < -20 || sx > width + 20) continue;
    push(); tint(255, 255, 255, 120 * dim);
    image(buildingImgs[b.imgIdx], sx, height - b.h, b.w, b.h); pop();
  }
  let off2 = camX * 0.25;
  for (let b of bgLayer2) {
    let sx = b.x - off2;
    if (sx + b.w < -20 || sx > width + 20) continue;
    push(); tint(255, 255, 255, 180 * dim);
    image(buildingImgs[b.imgIdx], sx, height - b.h, b.w, b.h); pop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Particles
// ═══════════════════════════════════════════════════════════════════════════════

function updateParticles() {
  for (let r of rain) {
    r.y += r.speed; r.x -= r.speed * 0.12;
    if (r.y > height + 20) { r.y = random(-30, -10); r.x = random(-10, width + 40); }
    if (r.x < -30) r.x = width + random(10, 30);
  }
  for (let m of motes) {
    m.x += m.vx; m.y += m.vy;
    if (m.y < -10 || m.x < -10 || m.x > width + 10) {
      m.x = random(width); m.y = height + random(5, 15);
    }
  }
}

function drawParticles() {
  for (let r of rain) {
    stroke(100, 150, 240, r.alpha); strokeWeight(1);
    line(r.x, r.y, r.x + r.len * 0.12, r.y - r.len);
  }
  noStroke();
  for (let m of motes) {
    fill(m.pink ? color(255, 50, 150, m.alpha) : color(0, 255, 240, m.alpha));
    ellipse(m.x, m.y, m.size, m.size);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Glare & Lights
// ═══════════════════════════════════════════════════════════════════════════════

function drawLights() {
  noStroke();
  for (let l of LIGHT_SOURCES) {
    let a = map(sin(frameCount * l.speed + l.phase), -1, 1, 40, 130);
    fill(255, 245, 210, a); rect(l.x, l.y, l.w, l.h);
  }
}

function drawGlareZones() {
  for (let gz of GLARE_ZONES) {
    if (gz.x + gz.w < camX - 50 || gz.x > camX + width + 50) continue;
    let t = frameCount;
    for (let i = 0; i < 3; i++) {
      let pulse = 0.5 + 0.5 * sin(t * (0.04 + i * 0.012) + i * 1.3);
      let a     = constrain(pulse * 35 * gz.intensity, 0, 255);
      noStroke(); fill(255, 240, 200, a);
      let ox = gz.x + i * 40, ow = gz.w - i * 80;
      if (ow > 0) rect(ox, 0, ow, height);
    }
    let bandW  = gz.w * 0.3;
    let bPulse = 0.4 + 0.6 * sin(t * 0.06 + gz.x * 0.01);
    fill(255, 255, 240, constrain(bPulse * 25 * gz.intensity, 0, 255));
    rect(gz.x + gz.w / 2 - bandW / 2, 0, bandW, height);
  }
}

function drawDarkZones() {
  noStroke();
  for (let dz of DARK_ZONES) {
    let sx = dz.x - camX;
    if (sx + dz.w < 0 || sx > width) continue;
    let fadeW = 60;
    fill(0, 0, 0, 255 * dz.intensity);
    rect(sx + fadeW, 0, max(0, dz.w - fadeW * 2), height);
    for (let f = 0; f < fadeW; f += 4) {
      let a = map(f, 0, fadeW, 0, 255 * dz.intensity);
      fill(0, 0, 0, a);
      rect(sx + f, 0, 4, height);
      rect(sx + dz.w - f - 4, 0, 4, height);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Neon platforms
// ═══════════════════════════════════════════════════════════════════════════════

function drawPlatformNeon(p, a, hi) {
  noStroke(); fill(0, 255, 140, 22 * a); rect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);
  fill(12, 45, 32, 210 * a); rect(p.x, p.y, p.w, p.h);
  fill(0, 255, 140, 90 * a); rect(p.x, p.y, p.w, 2);
  fill(0, 255, 140, 28 * a); rect(p.x, p.y + 2, p.w, min(5, p.h - 2));
  stroke(0, 255, 140, 230 * a); strokeWeight(2.5); line(p.x, p.y, p.x + p.w, p.y);
  stroke(0, 255, 140, 65 * a); strokeWeight(1);
  line(p.x, p.y, p.x, p.y + p.h); line(p.x + p.w, p.y, p.x + p.w, p.y + p.h);
  stroke(0, 255, 140, 30 * a); line(p.x, p.y + p.h, p.x + p.w, p.y + p.h);
  if (hi > 0) {
    stroke(0, 255, 240, hi * 220); strokeWeight(2); noFill();
    rect(p.x - 1, p.y - 1, p.w + 2, p.h + 2);
  }
}

function drawMovingPlatformNeon(p, a, hi) {
  noStroke(); fill(80, 40, 255, 18 * a); rect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);
  fill(22, 12, 55, 210 * a); rect(p.x, p.y, p.w, p.h);
  fill(120, 80, 255, 85 * a); rect(p.x, p.y, p.w, 2);
  fill(120, 80, 255, 25 * a); rect(p.x, p.y + 2, p.w, min(5, p.h - 2));
  stroke(120, 80, 255, 230 * a); strokeWeight(2.5); line(p.x, p.y, p.x + p.w, p.y);
  stroke(120, 80, 255, 65 * a); strokeWeight(1);
  line(p.x, p.y, p.x, p.y + p.h); line(p.x + p.w, p.y, p.x + p.w, p.y + p.h);
  stroke(120, 80, 255, 30 * a); line(p.x, p.y + p.h, p.x + p.w, p.y + p.h);
  if (hi > 0) {
    stroke(0, 255, 240, hi * 220); strokeWeight(2); noFill();
    rect(p.x - 1, p.y - 1, p.w + 2, p.h + 2);
  }
}

function drawPlatformsFull()       { for (let p  of platforms)       drawPlatformNeon(p,  1.0, 0); noStroke(); }
function drawMovingPlatformsFull() { for (let mp of movingPlatforms) drawMovingPlatformNeon(mp, 1.0, 0); noStroke(); }

function drawPlatforms() {
  let pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  let vL = camX - 50, vR = camX + width + 50;
  for (let p of platforms) {
    if (p.x + p.w < vL || p.x > vR) continue;
    let hi = (focusFade > 0 && distToRect(pcx, pcy, p.x, p.y, p.w, p.h) <= FOCUS_RADIUS) ? focusFade : 0;
    drawPlatformNeon(p, lerp(lerp(0.45, 0.98, visionFloor()), 1.0, hi), hi);
  }
  noStroke();
}

function drawMovingPlatforms() {
  let pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  for (let mp of movingPlatforms) {
    let hi = (focusFade > 0 && distToRect(pcx, pcy, mp.x, mp.y, mp.w, mp.h) <= FOCUS_RADIUS) ? focusFade : 0;
    drawMovingPlatformNeon(mp, lerp(lerp(0.45, 0.98, visionFloor()), 1.0, hi), hi);
  }
  noStroke();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Player (Jamie sprite + neon effects)
// ═══════════════════════════════════════════════════════════════════════════════

function drawAfterimages() {
  for (let i = 0; i < afterimages.length; i++) {
    let ai = afterimages[i];
    ai.age++;
    let fade = map(ai.age, 0, 20, 50, 0);
    if (fade <= 0) { afterimages.splice(i, 1); i--; continue; }
    if (jamieIdle.length > 0) {
      let cx = ai.x + player.w / 2, cy = ai.y + player.h / 2;
      push(); tint(0, 255, 240, fade * 0.6); imageMode(CENTER);
      if (playerFacing < 0) { scale(-1, 1); cx = -cx; }
      image(jamieIdle[0], cx, cy, JAMIE_DRAW_W, JAMIE_DRAW_H);
      imageMode(CORNER); pop();
    }
  }
}

function drawPlayer() {
  let px = player.x, py = player.y, pw = player.w, ph = player.h;
  let cx = px + pw / 2, cy = py + ph / 2;
  noStroke();
  fill(0, 255, 240, 14); rect(px - 5, py - 5, pw + 10, ph + 10);
  fill(0, 255, 240, 28); rect(px - 2, py - 2, pw + 4, ph + 4);

  // Sprite selection
  let frame = null;
  if (!player.onGround && jamieJump.length > 0) {
    let ji = player.vy < -4 ? 0 : player.vy < 0 ? 1 : player.vy < 2 ? 2 : player.vy < 6 ? 3 : 4;
    frame = jamieJump[min(ji, jamieJump.length - 1)];
  } else if (abs(player.vx) > 0.5 && jamieRun.length > 0) {
    frame = jamieRun[floor(frameCount / 6) % jamieRun.length];
  } else if (jamieIdle.length > 0) {
    frame = jamieIdle[floor(frameCount / JAMIE_ANIM_SPEED) % jamieIdle.length];
  }

  if (frame) {
    push(); imageMode(CENTER);
    if (playerFacing < 0) { scale(-1, 1); image(frame, -cx, cy, JAMIE_DRAW_W, JAMIE_DRAW_H); }
    else                  { image(frame, cx, cy, JAMIE_DRAW_W, JAMIE_DRAW_H); }
    imageMode(CORNER); pop();
  } else {
    fill(16, 10, 28); rect(px, py, pw, ph);
    stroke(0, 255, 240, 220); strokeWeight(2); line(px + 4, py + 9, px + pw - 4, py + 9);
  }

  stroke(0, 255, 240, 35); strokeWeight(1);
  line(px, py, px, py + ph); line(px + pw, py, px + pw, py + ph); noStroke();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Enemies
// ═══════════════════════════════════════════════════════════════════════════════

function drawEnemyNeon(e, a, hi) {
  let ex = e.x, ey = e.y, ew = e.w, eh = e.h; noStroke();
  fill(255, 70, 20, 60 * a); rect(ex - 3, ey - 3, ew + 6, eh + 6);
  fill(55, 14, 4, 210 * a); rect(ex, ey, ew, eh);
  fill(255, 160, 80, 120 * a); rect(ex + 1, ey + 6, ew - 2, 3);
  stroke(255, 70, 20, 230 * a); strokeWeight(1.5); line(ex, ey, ex + ew, ey);
  stroke(255, 70, 20, 255 * a); strokeWeight(2.5);  line(ex + 3, ey + 8, ex + ew - 3, ey + 8);
  if (hi > 0) {
    stroke(0, 255, 240, hi * 200); strokeWeight(2); noFill(); rect(ex - 1, ey - 1, ew + 2, eh + 2);
  }
  noStroke();
}

function drawEnemiesFull() { for (let e of enemies) drawEnemyNeon(e, 1.0, 0); }

function drawEnemies() {
  let pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  let vL = camX - 50, vR = camX + width + 50;
  for (let e of enemies) {
    if (e.x + e.w < vL || e.x > vR) continue;
    let hi = (focusFade > 0 && distToRect(pcx, pcy, e.x, e.y, e.w, e.h) <= FOCUS_RADIUS) ? focusFade : 0;
    drawEnemyNeon(e, lerp(lerp(0.70, 0.98, visionFloor()), 1.0, hi), hi);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Traps
// ═══════════════════════════════════════════════════════════════════════════════

function drawSpikes() {
  let pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  let vL = camX - 50, vR = camX + width + 50;
  for (let s of spikes) {
    if (s.x + s.w < vL || s.x > vR) continue;
    let hi = (focusFade > 0 && distToRect(pcx, pcy, s.x, s.y, s.w, s.h) <= FOCUS_RADIUS) ? focusFade : 0;
    let a  = lerp(0.45, 1.0, hi);
    let cx = s.x + s.w / 2;
    noStroke();
    fill(255, 80, 40, 22 * a); triangle(cx, s.y - 2, s.x - 2, s.y + s.h + 2, s.x + s.w + 2, s.y + s.h + 2);
    fill(80, 20, 10, 210 * a); triangle(cx, s.y, s.x, s.y + s.h, s.x + s.w, s.y + s.h);
    stroke(255, 120, 40, 190 * a); strokeWeight(1.5);
    line(s.x, s.y + s.h, cx, s.y); line(cx, s.y, s.x + s.w, s.y + s.h);
    if (hi > 0) { stroke(0, 255, 240, hi * 180); strokeWeight(1); line(s.x, s.y + s.h, cx, s.y); line(cx, s.y, s.x + s.w, s.y + s.h); }
    noStroke();
  }
}

function drawLasers() {
  let pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  let vL = camX - 50, vR = camX + width + 50;
  for (let l of lasers) {
    if (l.x + l.w < vL || l.x > vR) continue;
    let cycle = (frameCount + l.phase) % LASER_CYCLE;
    let isOn  = cycle < LASER_CYCLE * LASER_ON_FRAC;
    let hi    = (focusFade > 0 && distToRect(pcx, pcy, l.x, l.y, l.w, l.h) <= FOCUS_RADIUS) ? focusFade : 0;
    let vis   = lerp(0.45, 1.0, hi);
    if (isOn) {
      let flicker = 0.7 + 0.3 * sin(frameCount * 0.5);
      noStroke();
      fill(255, 20, 60, 10 * vis);  rect(l.x - 8, l.y - 14, l.w + 16, l.h + 28);
      fill(255, 40, 80, 25 * vis);  rect(l.x - 4, l.y - 8,  l.w + 8,  l.h + 16);
      fill(255, 20, 60, 18 * vis);  rect(l.x - 2, l.y - 6,  l.w + 4,  l.h + 12);
      fill(255, 40, 80, 230 * vis * flicker); rect(l.x, l.y, l.w, l.h);
      fill(255, 220, 200, 140 * vis * flicker); rect(l.x, l.y + 1, l.w, 2);
    } else {
      let dotA = (cycle / (LASER_CYCLE * (1 - LASER_ON_FRAC))) * 120 * vis;
      noStroke(); fill(255, 40, 80, dotA);
      ellipse(l.x + 3, l.y + 2, 5, 5); ellipse(l.x + l.w - 3, l.y + 2, 5, 5);
      stroke(255, 40, 80, dotA * 0.3); strokeWeight(1);
      for (let dx = 0; dx < l.w; dx += 12) line(l.x + dx, l.y + 2, l.x + min(dx + 5, l.w), l.y + 2);
      noStroke();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Danger warning
// ═══════════════════════════════════════════════════════════════════════════════

function drawDangerWarning() {
  let pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  let closestDist = Infinity;
  for (let e of enemies) {
    let d = distToRect(pcx, pcy, e.x, e.y, e.w, e.h);
    if (d < closestDist) closestDist = d;
  }
  if (closestDist < 150) {
    let intensity = constrain(map(closestDist, 150, 30, 0, 1), 0, 1);
    let a = intensity * (0.6 + 0.4 * sin(frameCount * 0.15)) * 55;
    let ctx = drawingContext;
    let g = ctx.createRadialGradient(width / 2, height / 2, height * 0.25, width / 2, height / 2, height * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(255,20,60," + (a / 255).toFixed(3) + ")");
    ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Goal (portal)
// ═══════════════════════════════════════════════════════════════════════════════

function drawPortalVFX(cx, cy, rx, ry, intensity) {
  let t = frameCount; noStroke();
  for (let i = 3; i >= 1; i--) { fill(80, 30, 180, 18 * i * intensity); ellipse(cx, cy, (rx + 18 * i) * 2, (ry + 11 * i) * 2); }
  let drift = 0.5 + 0.5 * sin(t * 0.04);
  fill(lerp(0, 80, drift), lerp(200, 40, drift), lerp(220, 255, drift), 40 * intensity);
  ellipse(cx, cy, rx * 2, ry * 2);
  for (let ly = cy - ry + 5; ly < cy + ry - 3; ly += 7) {
    let span = sqrt(max(0, 1 - sq((ly - cy) / ry))) * rx * 0.88;
    stroke(0, 255, 240, 28 * (0.4 + 0.6 * sin(t * 0.13 + ly * 0.22)) * intensity); strokeWeight(1);
    line(cx - span, ly, cx + span, ly);
  }
  noStroke();
  for (let i = 0; i < 5; i++) {
    let angle = t * 0.038 + i * TWO_PI / 5;
    fill(0, 255, 240, 190 * intensity); ellipse(cx + cos(angle) * (rx + 4), cy + sin(angle) * (ry + 3), 3.5, 3.5);
  }
  let pulse = 0.8 + 0.2 * sin(t * 0.09);
  stroke(0, 255, 240, 210 * pulse * intensity); strokeWeight(2.5); noFill(); ellipse(cx, cy, rx * 2, ry * 2);
  stroke(160, 50, 255, 140 * pulse * intensity); strokeWeight(1.5); ellipse(cx, cy, (rx + 4) * 2, (ry + 3) * 2);
  for (let step = 0; step < 5; step++) {
    let ly = cy - ry - 4 - step * 7, prog = step / 4;
    stroke(0, 255, 240, lerp(55, 0, prog) * intensity); strokeWeight(1);
    line(cx - lerp(rx * 0.28, 0, prog), ly, cx + lerp(rx * 0.28, 0, prog), ly);
  }
  noStroke();
  for (let i = 1; i <= 3; i++) { fill(0, 255, 240, lerp(18, 4, i / 3) * intensity); ellipse(cx, cy + ry + i * 5, rx * lerp(1.6, 0.4, i / 3), 4); }
  noStroke();
}

function drawGoalFull() { drawGoalNeon(1.0, 0); }

function drawGoalNeon(a, hi) {
  let cx = goal.x + goal.w / 2, cy = goal.y + goal.h / 2;
  drawPortalVFX(cx, cy, goal.w / 2, goal.h / 2, a);
  if (hi > 0) {
    stroke(0, 255, 240, hi * 180); strokeWeight(2); noFill();
    ellipse(cx, cy, (goal.w / 2 + 7) * 2, (goal.h / 2 + 6) * 2); noStroke();
  }
}

function drawGoal() {
  let pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  let hi = (focusFade > 0 && distToRect(pcx, pcy, goal.x, goal.y, goal.w, goal.h) <= FOCUS_RADIUS) ? focusFade : 0;
  drawGoalNeon(lerp(0.45, 1.0, hi), hi);
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
  let cx = player.x + player.w / 2, cy = player.y + player.h / 2;
  noFill(); stroke(0, 255, 240, alpha); strokeWeight(2.5);
  ellipse(cx, cy, focusPulseR * 2, focusPulseR * 2);
  if (focusPulseR > 18) {
    stroke(0, 255, 240, alpha * 0.3); strokeWeight(1);
    ellipse(cx, cy, (focusPulseR - 18) * 2, (focusPulseR - 18) * 2);
  }
  noStroke();
}

function drawFocusIndicator() {
  let cx       = player.x + player.w / 2;
  let cy       = player.y + player.h + 12;
  let canFocus = player.onGround && abs(player.vx) < 0.5 && focusCooldown <= 0;
  noStroke();
  if (focusActive) {
    let pulse = 0.7 + 0.3 * sin(frameCount * 0.15);
    fill(0, 255, 240, 50 * pulse); ellipse(cx, cy, 18, 18);
    fill(0, 255, 240); ellipse(cx, cy, 7, 7);
  } else if (focusCooldown > 0) {
    // Cooldown arc indicator
    let progress = 1 - focusCooldown / FOCUS_COOLDOWN_FRAMES;
    fill(45, 40, 60, 120); ellipse(cx, cy, 14, 14);
    // Draw arc showing cooldown progress
    stroke(0, 255, 240, 140); strokeWeight(2); noFill();
    arc(cx, cy, 14, 14, -HALF_PI, -HALF_PI + TWO_PI * progress);
    noStroke();
    fill(80, 70, 100, 180); ellipse(cx, cy, 4, 4);
  } else if (canFocus) {
    fill(0, 255, 240, 35); ellipse(cx, cy, 14, 14);
    fill(0, 255, 240);     ellipse(cx, cy, 6, 6);
  } else {
    fill(45, 40, 60, 120); ellipse(cx, cy, 8, 8);
  }
  noStroke();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — HUD
// ═══════════════════════════════════════════════════════════════════════════════

function drawHUD() {
  drawProgressBar();
  // Double jump indicator — top-left
  let dx = 14, dy = 10, dw = 72, dh = 22;
  noStroke();
  if (canDoubleJump) {
    let pulse = 0.7 + 0.3 * sin(frameCount * 0.12);
    fill(160, 80, 255, 35 * pulse); rect(dx - 2, dy - 2, dw + 4, dh + 4, 5);
    fill(160, 80, 255, 50); rect(dx, dy, dw, dh, 4);
    stroke(160, 80, 255, 180 * pulse); strokeWeight(1); noFill(); rect(dx, dy, dw, dh, 4); noStroke();
    fill(200, 160, 255, 230); textSize(11); textStyle(BOLD); textAlign(CENTER, CENTER);
    text("2x JUMP", dx + dw / 2, dy + dh / 2);
  } else {
    fill(30, 25, 45, 180); rect(dx, dy, dw, dh, 4);
    stroke(60, 50, 80, 120); strokeWeight(1); noFill(); rect(dx, dy, dw, dh, 4); noStroke();
    fill(80, 70, 100, 180); textSize(11); textStyle(BOLD); textAlign(CENTER, CENTER);
    text("JUMP", dx + dw / 2, dy + dh / 2);
  }
  textStyle(NORMAL); textAlign(LEFT, BASELINE);

  // Death counter — top-right
  if (deathCount === 0) return;
  textAlign(RIGHT, TOP); noStroke();
  fill(255, 40, 100, 25); rect(width - 110, 8, 100, 24, 3);
  fill(255, 40, 100, 180); textSize(11); textStyle(BOLD);
  text("BREACHES: " + deathCount, width - 16, 14);
  textStyle(NORMAL); textAlign(LEFT, BASELINE);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Screen-space overlays
// ═══════════════════════════════════════════════════════════════════════════════

function drawScanlines() {
  let ctx = drawingContext;
  ctx.fillStyle = "rgba(0,0,0,0.025)";
  for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1);
}

function drawVignette() {
  let ctx = drawingContext;
  let g = ctx.createRadialGradient(width / 2, height / 2, height * 0.1, width / 2, height / 2, height * 0.82);
  g.addColorStop(0,   "rgba(0,0,0,0)");
  g.addColorStop(0.6, "rgba(0,0,0,0.22)");
  g.addColorStop(1,   "rgba(0,0,0,0.60)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RESET + UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

function resetGame() {
  if (bgMusic      && bgMusic.isPlaying())      bgMusic.stop();
  if (sfxDeath     && sfxDeath.isPlaying())     sfxDeath.stop();
  if (sfxGoal      && sfxGoal.isPlaying())      sfxGoal.stop();
  if (sfxFocus     && sfxFocus.isPlaying())     sfxFocus.stop();
  player.x = 60; player.y = 360;
  player.vx = 0; player.vy = 0; player.onGround = false;
  playerFacing = 1;
  initLevel();
  camX = 0;
  focusActive = false; focusFade = 0; prevFocusKey = false;
  focusPulseOn = false; focusPulseR = 0; focusFlashTimer = 0;
  focusCooldown = 0; focusWasUsed = false;
  deathCount = 0; deathShakeTimer = 0; deathFlashTimer = 0;
  afterimages = []; coyoteTimer = 0; wasOnGround = false;
  jumpHeld = false; canDoubleJump = false;
  activeCheckpointIdx = -1; darkWallX = -200; darkWallActive = false;
  menuSelection = 0;
  gameState = "start"; introTimer = 0; winTimer = 0;
}

function playSfx(snd, vol) {
  if (!snd) return;
  if (snd.isPlaying()) snd.stop();
  snd.setVolume(vol);
  snd.play();
}

function startMusic() {
  if (bgMusic && !bgMusic.isPlaying()) {
    bgMusic.setVolume(0.33);
    bgMusic.loop();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHECKPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

function updateCheckpoints() {
  for (let i = 0; i < checkpoints.length; i++) {
    let cp = checkpoints[i];
    if (!cp.activated && overlaps(player, cp)) {
      cp.activated = true;
      activeCheckpointIdx = i;
      cpPulseTimers[i] = 45;
      playSfx(sfxFocus, 0.45);
    }
    if (cpPulseTimers[i] > 0) cpPulseTimers[i]--;
  }
}

function drawCheckpoints() {
  let vL = camX - 50, vR = camX + width + 50;
  for (let i = 0; i < checkpoints.length; i++) {
    let cp = checkpoints[i];
    if (cp.x + cp.w < vL || cp.x > vR) continue;
    let baseA = cp.activated ? 1.0 : 0.45;
    let cr = cp.activated ? 0 : 80;
    let cg = cp.activated ? 255 : 200;
    let cb = cp.activated ? 240 : 220;
    noStroke();
    let outerPulse = cpPulseTimers[i] > 0 ? 60 * (0.5 + 0.5 * sin(frameCount * 0.3)) : 0;
    fill(cr, cg, cb, (28 + outerPulse) * baseA);
    rect(cp.x - 3, cp.y - 3, cp.w + 6, cp.h + 6);
    fill(cr, cg, cb, 180 * baseA);
    rect(cp.x, cp.y, cp.w, cp.h);
    fill(cr, cg, cb, (220 + 35 * sin(frameCount * 0.06)) * baseA);
    rect(cp.x, cp.y, cp.w, 4);
    stroke(cr, cg, cb, 120 * baseA); strokeWeight(1);
    line(cp.x + cp.w / 2, cp.y, cp.x + cp.w / 2, cp.y + cp.h);
    noStroke();
    if (cpPulseTimers[i] > 0) {
      let pr = map(cpPulseTimers[i], 45, 0, 0, 60);
      let pa = map(cpPulseTimers[i], 45, 0, 200, 0);
      noFill(); stroke(0, 255, 240, pa); strokeWeight(2);
      ellipse(cp.x + cp.w / 2, cp.y + cp.h / 2, pr * 2, pr * 2);
      noStroke();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISION POWER-UP
// ═══════════════════════════════════════════════════════════════════════════════

function visionFloor() {
  if (visionBoostTimer <= 0) return 0;
  if (visionBoostTimer > VISION_FADE_FRAMES) return 1.0;
  return visionBoostTimer / VISION_FADE_FRAMES;
}

function updateVisionPickup() {
  if (visionBoostTimer > 0) visionBoostTimer--;
  if (visionPickup && overlaps(player, visionPickup)) {
    visionPickup = null;
    visionBoostTimer = VISION_BOOST_FRAMES;
    playSfx(sfxFocus, 0.55);
  }
}

function drawVisionPickup() {
  if (!visionPickup) return;
  let vp = visionPickup;
  if (vp.x + vp.w < camX - 50 || vp.x > camX + width + 50) return;
  let cx = vp.x + vp.w / 2, cy = vp.y + vp.h / 2;
  let pulse = 0.6 + 0.4 * sin(frameCount * 0.1);
  push(); translate(cx, cy); rotate(frameCount * 0.03);
  noStroke();
  fill(0, 255, 200, 40 * pulse); rect(-vp.w / 2 - 4, -vp.h / 2 - 4, vp.w + 8, vp.h + 8);
  fill(0, 220, 180, 200);
  beginShape();
  vertex(0, -vp.h / 2); vertex(vp.w / 2, 0);
  vertex(0, vp.h / 2);  vertex(-vp.w / 2, 0);
  endShape(CLOSE);
  fill(180, 255, 240, 220 * pulse);
  beginShape();
  vertex(0, -vp.h / 4); vertex(vp.w / 4, 0);
  vertex(0, vp.h / 4);  vertex(-vp.w / 4, 0);
  endShape(CLOSE);
  pop();
  noStroke(); fill(0, 255, 200, 18 * pulse);
  rect(cx - 3, cy - vp.h * 2, 6, vp.h * 4);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DARKNESS WALL
// ═══════════════════════════════════════════════════════════════════════════════

function updateDarkWall() {
  if (!darkWallActive && player.x >= 2600) {
    darkWallActive = true;
    darkWallX = player.x - 300;
  }
  if (!darkWallActive) return;
  darkWallX += DARK_WALL_SPEED;
  if (player.x + player.w < darkWallX - 10) triggerDeath();
}

function drawDarkWall() {
  if (!darkWallActive) return;
  let sx = darkWallX - camX;
  if (sx > width) return;
  noStroke();
  fill(0, 0, 0, 240);
  rect(0, 0, min(sx, width), height);
  for (let i = 0; i < 40; i++) {
    let ex = sx + i;
    if (ex < 0 || ex > width) continue;
    fill(0, 0, 0, map(i, 0, 40, 210, 0));
    rect(ex, 0, 1, height);
  }
  if (sx >= -6 && sx <= width + 6) {
    noStroke();
    fill(255, 20, 60, 120); rect(sx - 2, 0, 4, height);
    fill(255, 80, 40, 60);  rect(sx - 6, 0, 6, height);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════════

function drawProgressBar() {
  let barW = 300, barH = 6, barX = width / 2 - barW / 2, barY = 8;
  let progress = constrain(player.x / (WORLD_W - player.w), 0, 1);
  noStroke();
  fill(20, 16, 35, 200); rect(barX - 2, barY - 2, barW + 4, barH + 4, 3);
  fill(35, 28, 55, 180); rect(barX, barY, barW, barH, 2);
  let pulse = 0.85 + 0.15 * sin(frameCount * 0.08);
  fill(0, 255, 240, 200 * pulse); rect(barX, barY, barW * progress, barH, 2);
  if (progress > 0.01) {
    fill(255, 255, 255, 180 * pulse);
    rect(barX + barW * progress - 2, barY, 2, barH);
  }
  for (let cp of LEVEL_CHECKPOINTS) {
    let tx = barX + (cp.x / WORLD_W) * barW;
    fill(0, 255, 240, 160); rect(tx - 1, barY - 1, 2, barH + 2);
  }
  stroke(0, 255, 240, 80); strokeWeight(1); noFill();
  rect(barX, barY, barW, barH, 2); noStroke();
}

function distToRect(px, py, rx, ry, rw, rh) {
  let dx = max(rx - px, 0, px - (rx + rw));
  let dy = max(ry - py, 0, py - (ry + rh));
  return sqrt(dx * dx + dy * dy);
}
