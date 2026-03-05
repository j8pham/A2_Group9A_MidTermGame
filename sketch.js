// ═══════════════════════════════════════════════════════════════════════════════
//  DATA BREACH — cyberpunk platformer about limited vision
//  p5.js · 800 × 450 · procedurally generated levels
// ═══════════════════════════════════════════════════════════════════════════════

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = -12;
const TERM_VEL = 16;
const WORLD_W = 4800;

const FOCUS_RADIUS = 280;
const FOCUS_FADE_FRAMES = 30;

const INTRO_NORMAL_F = 60;
const INTRO_SHAKE_F = 30;
const INTRO_FLASH_F = 24;

const RAIN_COUNT = 50;
const MOTE_COUNT = 15;

const COYOTE_FRAMES = 7;
const JUMP_CUT_MULT = 0.42;

// Physics-derived jump envelope (used by generator)
const MAX_JUMP_H = 110; // max height gain in pixels
const MAX_JUMP_W = 145; // max horizontal distance in air
const SAFE_GAP = 130; // comfortable gap (leaves margin)

const LIGHT_SOURCES = [
  { x: 200, y: 0, w: 300, h: 450, phase: 0.0, speed: 0.038 },
  { x: 850, y: 0, w: 240, h: 450, phase: 2.1, speed: 0.055 },
  { x: 1480, y: 0, w: 320, h: 450, phase: 1.4, speed: 0.031 },
  { x: 2200, y: 0, w: 260, h: 450, phase: 0.7, speed: 0.048 },
  { x: 3000, y: 0, w: 280, h: 450, phase: 1.9, speed: 0.042 },
  { x: 3800, y: 0, w: 350, h: 450, phase: 0.3, speed: 0.036 },
];

const GLARE_ZONES = [
  { x: 2600, w: 600, intensity: 2.2 },
  { x: 3800, w: 900, intensity: 3.0 },
];

const WIN_BTN = { x: 310, y: 378, w: 180, h: 40 };

const DEATH_SHAKE_FRAMES = 18;
const DEATH_FLASH_FRAMES = 14;
const FOCUS_FLASH_FRAMES = 10;

const AFTERIMAGE_COUNT = 4;
const AFTERIMAGE_SPACING = 3;

const JAMIE_ANIM_SPEED = 8; // frames per idle animation frame
const JAMIE_DRAW_W = 48; // display width for sprite
const JAMIE_DRAW_H = 48; // display height for sprite

// Dash mechanic
const DASH_SPEED = 14;
const DASH_FRAMES = 8;
const DASH_COOLDOWN = 45;

// Traps
const SPIKE_W = 16;
const SPIKE_H = 14;
const LASER_CYCLE = 180; // frames for one on/off cycle
const LASER_ON_FRAC = 0.6; // fraction of cycle the laser is active

// ── ASSET LOADING ────────────────────────────────────────────────────────────
let buildingImgs = [];
let jamieIdle = []; // 3-frame idle animation
let jamieRun = [];  // 4-frame run cycle
let jamieJump = []; // 5-frame jump sequence

function preload() {
  for (let i = 2; i <= 8; i++) {
    let pad = i < 10 ? "0" + i : "" + i;
    buildingImgs.push(
      loadImage("assets/Single Buildings/Pixel Art Buildings-" + pad + ".png"),
    );
  }
  for (let i = 1; i <= 3; i++) {
    jamieIdle.push(loadImage("assets/JAMIE/IDLE/Jamie_IDLE_" + i + ".png"));
  }
  for (let i = 1; i <= 4; i++) {
    jamieRun.push(loadImage("assets/JAMIE/RUN/Jamie_RUN_" + i + ".png"));
  }
  for (let i = 1; i <= 5; i++) {
    jamieJump.push(loadImage("assets/JAMIE/JUMP/Jamie_JUMP_" + i + ".png"));
  }
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let player, platforms, movingPlatforms, enemies, goal;
let spikes = [];
let lasers = [];
let camX = 0;
let playerFacing = 1; // 1 = right, -1 = left

let dashTimer = 0;
let dashCooldown = 0;
let dashDir = 1;

let gameState = "start";
let introTimer = 0;
let winTimer = 0;
let menuSelection = 0; // 0 = START GAME, 1 = EXIT GAME

let focusActive = false;
let focusFade = 0;
let prevFocusKey = false;
let focusPulseR = 0;
let focusPulseOn = false;
let focusFlashTimer = 0;

let deathCount = 0;
let deathShakeTimer = 0;
let deathFlashTimer = 0;

let coyoteTimer = 0;
let wasOnGround = false;
let jumpHeld = false;

let afterimages = [];

let bgLayer1 = [];
let bgLayer2 = [];
let rain = [];
let motes = [];

// ═══════════════════════════════════════════════════════════════════════════════
//  PROCEDURAL LEVEL GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

// Zone configs: [minPlatW, maxPlatW, minGap, maxGap, minY, maxY, enemyChance, movingChance, enemySpeedMin, enemySpeedMax]
const ZONE_CONFIGS = [
  // Zone 1: Tutorial (0–1200) — wide, easy, no enemies, no traps
  {
    minW: 140,
    maxW: 350,
    minGap: 50,
    maxGap: 90,
    minY: 340,
    maxY: 400,
    enemyChance: 0,
    movingChance: 0,
    eSpeedMin: 0,
    eSpeedMax: 0,
    enemyPlatW: 0,
    spikeChance: 0,
    laserChance: 0,
  },
  // Zone 2: Medium — spikes appear, occasional lasers
  {
    minW: 90,
    maxW: 170,
    minGap: 70,
    maxGap: 130,
    minY: 240,
    maxY: 380,
    enemyChance: 0.25,
    movingChance: 0.15,
    eSpeedMin: 0.8,
    eSpeedMax: 1.3,
    enemyPlatW: 180,
    spikeChance: 0.2,
    laserChance: 0.1,
  },
  // Zone 3: Hard — more traps
  {
    minW: 70,
    maxW: 120,
    minGap: 80,
    maxGap: 150,
    minY: 220,
    maxY: 380,
    enemyChance: 0.35,
    movingChance: 0.25,
    eSpeedMin: 1.2,
    eSpeedMax: 1.8,
    enemyPlatW: 155,
    spikeChance: 0.3,
    laserChance: 0.15,
  },
  // Zone 4: Brutal — traps everywhere
  {
    minW: 55,
    maxW: 95,
    minGap: 100,
    maxGap: 170,
    minY: 180,
    maxY: 370,
    enemyChance: 0.4,
    movingChance: 0.3,
    eSpeedMin: 1.5,
    eSpeedMax: 2.2,
    enemyPlatW: 135,
    spikeChance: 0.35,
    laserChance: 0.2,
  },
];

const ZONE_BOUNDARIES = [0, 1200, 2400, 3600, WORLD_W];

function generateLevel() {
  platforms = [];
  movingPlatforms = [];
  enemies = [];
  spikes = [];
  lasers = [];

  // ── Always start with a safe wide ground platform ──
  let startPlat = { x: 0, y: 400, w: 350, h: 50 };
  platforms.push(startPlat);

  let curX = startPlat.x + startPlat.w;
  let curY = startPlat.y;
  let lastEnemyX = -500; // track spacing between enemies (min 400px apart)
  let lastMovingX = -500; // min 300px between moving platforms

  while (curX < WORLD_W - 300) {
    // Determine which zone we're in
    let zoneIdx = 0;
    for (let z = ZONE_BOUNDARIES.length - 2; z >= 0; z--) {
      if (curX >= ZONE_BOUNDARIES[z]) {
        zoneIdx = z;
        break;
      }
    }
    let cfg = ZONE_CONFIGS[min(zoneIdx, ZONE_CONFIGS.length - 1)];

    // ── Decide: static platform or moving platform? ──
    let useMoving = random() < cfg.movingChance && curX - lastMovingX > 300;

    if (useMoving) {
      // Place a moving platform to bridge a gap
      let gap = random(cfg.minGap + 20, cfg.maxGap + 40); // moving plats bridge wider gaps
      gap = min(gap, SAFE_GAP + 20); // but not impossibly wide

      let mpX = curX + gap * 0.3; // start position within the gap area
      let mpY = constrain(curY + random(-40, 30), cfg.minY, cfg.maxY);
      let mpW = random(65, 90);

      // Ensure reachable: height change from curY
      let dy = curY - mpY; // positive = platform is higher
      if (dy > MAX_JUMP_H - 20) mpY = curY - MAX_JUMP_H + 25;
      mpY = constrain(mpY, cfg.minY, cfg.maxY);

      let axis = random() < 0.5 ? "x" : "y";
      let range = axis === "x" ? random(60, 110) : random(50, 80);
      let speed = random(0.6, 1.0 + zoneIdx * 0.3);

      movingPlatforms.push({
        x: mpX,
        y: mpY,
        w: mpW,
        h: 20,
        axis: axis,
        speed: speed,
        range: range,
        origin: axis === "x" ? mpX : mpY,
      });

      curX = mpX + mpW + random(cfg.minGap * 0.5, cfg.minGap);
      curY = mpY;
      lastMovingX = mpX;
    } else {
      // ── Static platform ──
      let gap = random(cfg.minGap, cfg.maxGap);
      let platW = random(cfg.minW, cfg.maxW);

      // Decide if this platform gets an enemy BEFORE finalising width
      let wantsEnemy =
        cfg.enemyChance > 0 &&
        curX + gap - lastEnemyX > 400 &&
        random() < cfg.enemyChance;

      // If an enemy will spawn, boost the platform width so there's room
      if (wantsEnemy && cfg.enemyPlatW > 0) {
        platW = max(platW, cfg.enemyPlatW + random(-15, 20));
      }

      // Y position: random within zone range, but must be reachable from current
      let newY = curY + random(-60, 50);
      newY = constrain(newY, cfg.minY, cfg.maxY);

      // Enforce jump reachability
      let dy = curY - newY; // positive = new plat is higher
      if (dy > MAX_JUMP_H - 20) newY = curY - MAX_JUMP_H + 25;

      // Enforce horizontal reachability
      if (gap > SAFE_GAP && dy > 0) {
        gap = SAFE_GAP - 10;
      }

      let platX = curX + gap;
      newY = constrain(newY, cfg.minY, cfg.maxY);

      // Avoid platforms going off-world
      if (platX + platW > WORLD_W - 200) break;

      platforms.push({ x: platX, y: newY, w: platW, h: 20 });

      // ── Place enemy: patrol edge-to-edge of the platform ──
      if (wantsEnemy) {
        let eW = 22,
          eH = 30;
        // Edge-to-edge patrol: enemy walks from platform left edge to right edge
        let leftBound = platX;
        let rightBound = platX + platW - eW;

        if (rightBound - leftBound >= 30) {
          let eSpeed = random(cfg.eSpeedMin, cfg.eSpeedMax);
          enemies.push({
            x: leftBound,
            y: newY - eH,
            w: eW,
            h: eH,
            speed: eSpeed,
            dir: 1,
            leftBound: leftBound,
            rightBound: rightBound,
            startX: leftBound,
            startDir: 1,
          });
          lastEnemyX = platX;
        }
      }

      // ── Place spikes on platform (only if no enemy) ──
      if (
        !wantsEnemy &&
        cfg.spikeChance > 0 &&
        random() < cfg.spikeChance &&
        platW >= 50
      ) {
        let spikeCount = floor(random(1, min(4, platW / SPIKE_W)));
        let spikeStartX =
          platX + random(8, max(10, platW - spikeCount * SPIKE_W - 8));
        for (let s = 0; s < spikeCount; s++) {
          let sx = spikeStartX + s * SPIKE_W;
          if (sx + SPIKE_W <= platX + platW) {
            spikes.push({ x: sx, y: newY - SPIKE_H, w: SPIKE_W, h: SPIKE_H });
          }
        }
      }

      // ── Place laser above this platform ──
      let wantsLaser = cfg.laserChance > 0 && random() < cfg.laserChance;
      if (wantsLaser) {
        // If enemy + laser combo, widen the platform so it's not unfair
        if (wantsEnemy) {
          let comboBoost = 60;
          platW += comboBoost;
          // Update the platform we already pushed
          platforms[platforms.length - 1].w = platW;
          // Update enemy patrol bounds to match wider platform
          if (enemies.length > 0) {
            let lastE = enemies[enemies.length - 1];
            if (lastE.leftBound === platX) {
              lastE.rightBound = platX + platW - lastE.w;
            }
          }
        }
        let laserY = newY - random(40, 80);
        laserY = constrain(laserY, 60, 380);
        lasers.push({
          x: platX - 10,
          y: laserY,
          w: platW + 20,
          h: 4,
          phase: random(LASER_CYCLE),
        });
      }

      curX = platX + platW;
      curY = newY;
    }
  }

  // ── Final platform (always wide + safe) with portal ──
  let finalX = max(curX + 80, WORLD_W - 350);
  let finalY = constrain(curY + random(-20, 40), 350, 400);
  // Ensure reachable from last position
  if (curY - finalY > MAX_JUMP_H - 20) finalY = curY - MAX_JUMP_H + 25;
  finalY = constrain(finalY, 350, 400);

  platforms.push({ x: finalX, y: finalY, w: 250, h: 50 });

  // Portal on the far end of final platform
  goal = { x: finalX + 200, y: finalY - 52, w: 36, h: 52 };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════════════════

function setup() {
  createCanvas(800, 450);

  player = { x: 60, y: 360, w: 30, h: 40, vx: 0, vy: 0, onGround: false };

  generateLevel();
  initParallax();
  initParticles();
}

// ── PARALLAX GENERATION (image-based) ─────────────────────────────────────────
function initParallax() {
  bgLayer1 = [];
  bgLayer2 = [];

  let farIndices = [3, 4, 6];
  let x1 = -300;
  while (x1 < WORLD_W + 600) {
    let idx = farIndices[floor(random(farIndices.length))];
    let img = buildingImgs[idx];
    let sc = random(0.22, 0.38);
    let w = img.width * sc;
    let h = img.height * sc;
    bgLayer1.push({ x: x1, w: w, h: h, imgIdx: idx });
    x1 += w + random(20, 70);
  }

  let x2 = -300;
  while (x2 < WORLD_W + 600) {
    let idx = floor(random(buildingImgs.length));
    let img = buildingImgs[idx];
    let sc = random(0.32, 0.55);
    let w = img.width * sc;
    let h = img.height * sc;
    bgLayer2.push({ x: x2, w: w, h: h, imgIdx: idx });
    x2 += w + random(-10, 25);
  }
}

// ── PARTICLE GENERATION ───────────────────────────────────────────────────────
function initParticles() {
  rain = [];
  motes = [];
  for (let i = 0; i < RAIN_COUNT; i++) {
    rain.push({
      x: random(width + 40),
      y: random(-20, height),
      speed: random(5, 9),
      len: random(12, 22),
      alpha: random(15, 40),
    });
  }
  for (let i = 0; i < MOTE_COUNT; i++) {
    motes.push({
      x: random(width),
      y: random(height),
      vx: random(-0.3, 0.3),
      vy: random(-0.6, -0.15),
      size: random(1.5, 3),
      alpha: random(60, 160),
      pink: random() > 0.6,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════════════

function draw() {
  if (gameState === "start") {
    drawStartScreen();
    return;
  }
  if (gameState === "win") {
    drawWinScreen();
    return;
  }

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
    let maxR = dist(0, 0, width, height);
    let r = map(winTimer, 0, 28, 0, maxR * 1.1);
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
    if (introTimer >= INTRO_NORMAL_F + INTRO_SHAKE_F + INTRO_FLASH_F)
      gameState = "play";
    return;
  }

  // ── PLAY ──
  updateFocus();
  updateEnemies();
  updateDash();
  checkEnemyCollision();
  checkTrapCollision();
  if (overlaps(player, goal)) {
    gameState = "winning";
    winTimer = 0;
    return;
  }

  if (deathShakeTimer > 0) deathShakeTimer--;
  if (deathFlashTimer > 0) deathFlashTimer--;

  background(12, 8, 20);
  drawParallax(true);

  push();
  let dsx = 0,
    dsy = 0;
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
  drawSpikes();
  drawLasers();
  drawAfterimages();
  drawPlayer();
  drawFocusPulse();
  drawFocusIndicator();
  pop();

  updateParticles();
  drawParticles();

  if (focusFlashTimer > 0) {
    focusFlashTimer--;
    let fa = map(focusFlashTimer, FOCUS_FLASH_FRAMES, 0, 60, 0);
    noStroke();
    fill(0, 255, 240, constrain(fa, 0, 255));
    rect(0, 0, width, height);
  }

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

function drawGlitchLine(y, halfW, col, maxAlpha) {
  // Broken glitchy horizontal line with gaps and jitter
  let segments = 18;
  let segW = (halfW * 2) / segments;
  let cx = width / 2;
  for (let i = 0; i < segments; i++) {
    if (random() < 0.3) continue; // gaps
    let sx = cx - halfW + i * segW;
    let jy = y + random(-1.5, 1.5);
    let sw = segW * random(0.5, 1.0);
    let a = maxAlpha * random(0.4, 1.0);
    stroke(red(col), green(col), blue(col), a);
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

  updateParticles();
  drawParticles();

  // Update menu selection via mouse hover on buttons
  let btnW = 180, btnH = 34;
  let startBtnY = 290, exitBtnY = 335;
  let btnX = width / 2 - btnW / 2;
  if (mouseX >= btnX && mouseX <= btnX + btnW) {
    if (mouseY >= startBtnY && mouseY <= startBtnY + btnH) menuSelection = 0;
    if (mouseY >= exitBtnY && mouseY <= exitBtnY + btnH) menuSelection = 1;
  }

  // Arrow key menu navigation
  // (handled in keyPressed)

  let cx = width / 2;
  textAlign(CENTER, CENTER);
  noStroke();

  // ── TITLE: "DATA BREACH" with neon cyan glow ──
  let titleY = 80;
  let titleGlow = 220 + 35 * sin(frameCount * 0.04);

  // Glow layers behind title
  fill(0, titleGlow, constrain(titleGlow - 10, 0, 255), 15);
  textSize(64);
  textStyle(BOLD);
  text("DATA BREACH", cx + 2, titleY + 2);
  text("DATA BREACH", cx - 2, titleY - 2);

  // Main title
  fill(0, titleGlow, constrain(titleGlow - 10, 0, 255));
  textSize(62);
  text("DATA BREACH", cx, titleY);

  // Red glitchy lines above and below title
  let glitchCol = color(255, 40, 80);
  drawGlitchLine(titleY - 38, 200, glitchCol, 180);
  drawGlitchLine(titleY + 38, 200, glitchCol, 180);

  // ── SUBTITLE ──
  fill(90, 80, 115);
  textSize(12);
  textStyle(NORMAL);
  text("VISION IS A LIMITED RESOURCE", cx, titleY + 60);

  // ── MODERN CONTROL DISPLAY ──
  let ctrlY = 190;
  let totalCtrlW = 520;
  let startX = cx - totalCtrlW / 2;

  // WASD cluster
  drawKeyCluster(startX, ctrlY, ["W", "A", "S", "D"]);
  fill(70, 65, 90);
  textSize(9);
  textAlign(CENTER, TOP);
  text("MOVE", startX + 34, ctrlY + 48);

  // Arrow cluster
  let arrowX = startX + 120;
  drawKeyCluster(arrowX, ctrlY, ["\u2191", "\u2190", "\u2193", "\u2192"]);
  fill(70, 65, 90);
  textSize(9);
  textAlign(CENTER, TOP);
  text("MOVE", arrowX + 34, ctrlY + 48);

  // F key
  let fX = startX + 270;
  drawKeyCap(fX, ctrlY + 10, 32, 28, "F");
  fill(70, 65, 90);
  textSize(9);
  textAlign(CENTER, TOP);
  text("FOCUS", fX + 16, ctrlY + 48);

  // SHIFT key
  let shiftX = startX + 360;
  drawKeyCap(shiftX, ctrlY + 10, 60, 28, "SHIFT");
  fill(70, 65, 90);
  textSize(9);
  textAlign(CENTER, TOP);
  text("DASH", shiftX + 30, ctrlY + 48);

  // ── MENU BUTTONS ──
  textAlign(CENTER, CENTER);
  drawMenuButton(cx, startBtnY + btnH / 2, btnW, btnH, "START GAME", menuSelection === 0);
  drawMenuButton(cx, exitBtnY + btnH / 2, btnW, btnH, "EXIT GAME", menuSelection === 1);

  // ── Blinking prompt ──
  if (sin(frameCount * 0.07) > 0) {
    fill(60, 55, 80, 120);
    textSize(10);
    text("PRESS ENTER OR CLICK TO SELECT", cx, 395);
  }

  drawScanlines();
  drawVignette();
}

function drawKeyCap(x, y, w, h, label) {
  // Dark keycap with subtle border
  noStroke();
  fill(30, 25, 45, 200);
  rect(x, y, w, h, 4);
  stroke(80, 70, 110, 120);
  strokeWeight(1);
  noFill();
  rect(x, y, w, h, 4);

  // Key label
  noStroke();
  fill(140, 130, 170);
  textSize(11);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + h / 2);
  textStyle(NORMAL);
}

function drawKeyCluster(x, y, keys) {
  // WASD / Arrow layout: top-center, bottom row of 3
  let kw = 24, kh = 20, gap = 2;
  // Top key (W or Up)
  drawKeyCap(x + kw + gap, y, kw, kh, keys[0]);
  // Bottom row (A/Left, S/Down, D/Right)
  drawKeyCap(x, y + kh + gap, kw, kh, keys[1]);
  drawKeyCap(x + kw + gap, y + kh + gap, kw, kh, keys[2]);
  drawKeyCap(x + (kw + gap) * 2, y + kh + gap, kw, kh, keys[3]);
}

function drawMenuButton(cx, cy, w, h, label, selected) {
  let bx = cx - w / 2, by = cy - h / 2;

  if (selected) {
    // Neon cyan style with glitch lines
    let pulse = 0.7 + 0.3 * sin(frameCount * 0.08);
    noStroke();
    fill(0, 255, 240, 12 * pulse);
    rect(bx - 4, by - 4, w + 8, h + 8, 4);
    fill(0, 255, 240, 25 * pulse);
    rect(bx, by, w, h, 3);

    // Glitch lines above/below button
    let gc = color(255, 40, 80);
    drawGlitchLine(by - 3, w / 2 - 10, gc, 120);
    drawGlitchLine(by + h + 3, w / 2 - 10, gc, 120);

    // Cyan border
    stroke(0, 255, 240, 200 * pulse);
    strokeWeight(1.5);
    noFill();
    rect(bx, by, w, h, 3);
    noStroke();

    // Text
    fill(0, 255, 240);
    textSize(14);
    textStyle(BOLD);
    text(label, cx, cy);
    textStyle(NORMAL);
  } else {
    // Dimmed gray style
    noStroke();
    fill(35, 30, 50, 150);
    rect(bx, by, w, h, 3);
    stroke(70, 60, 90, 80);
    strokeWeight(1);
    noFill();
    rect(bx, by, w, h, 3);
    noStroke();

    fill(100, 90, 120);
    textSize(14);
    textStyle(BOLD);
    text(label, cx, cy);
    textStyle(NORMAL);
  }
}

function drawIntroScene() {
  let shakeEnd = INTRO_NORMAL_F + INTRO_SHAKE_F;
  let flashEnd = shakeEnd + INTRO_FLASH_F;
  let inShake = introTimer >= INTRO_NORMAL_F && introTimer < shakeEnd;
  let inFlash = introTimer >= shakeEnd;

  let sx = 0,
    sy = 0;
  if (inShake) {
    let t = (introTimer - INTRO_NORMAL_F) / INTRO_SHAKE_F;
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

function drawWinScreen() {
  background(12, 8, 20);
  updateParticles();
  drawParticles();

  let pcx = width / 2,
    pcy = 218;
  drawPortalVFX(pcx, pcy, 52, 82, 1.0);

  // Jamie silhouette inside portal
  if (jamieIdle.length > 0) {
    let frame = jamieIdle[0];
    push();
    tint(255, 255, 255, 200);
    imageMode(CENTER);
    image(frame, pcx, pcy + 6, 32, 32);
    imageMode(CORNER);
    pop();
  }

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
  let canFocus = player.onGround && abs(player.vx) < 0.5;

  if (fHeld && canFocus) {
    if (!focusActive) {
      // Just activated
      focusPulseOn = true;
      focusPulseR = 0;
      focusFlashTimer = FOCUS_FLASH_FRAMES;
    }
    focusActive = true;
  } else {
    focusActive = false;
  }

  focusFade = focusActive ? 1.0 : max(0, focusFade - 1 / FOCUS_FADE_FRAMES);
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
  let speed =
    gameState === "play" && focusActive ? MOVE_SPEED * 0.3 : MOVE_SPEED;

  // During dash, override horizontal velocity
  if (dashTimer > 0) {
    player.vx = DASH_SPEED * dashDir;
  } else {
    player.vx = 0;
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
      player.vx = -speed;
      playerFacing = -1;
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
      player.vx = speed;
      playerFacing = 1;
    }
  }

  // Afterimage trail (more frequent during dash)
  let trailRate = dashTimer > 0 ? 1 : AFTERIMAGE_SPACING;
  if (
    gameState === "play" &&
    abs(player.vx) > 0.5 &&
    frameCount % trailRate === 0
  ) {
    afterimages.push({ x: player.x, y: player.y, age: 0 });
    if (afterimages.length > AFTERIMAGE_COUNT) afterimages.shift();
  }

  player.vy += GRAVITY;
  if (player.vy > TERM_VEL) player.vy = TERM_VEL;

  // Variable jump height
  if (jumpHeld && !keyIsDown(UP_ARROW) && !keyIsDown(87) && player.vy < 0) {
    player.vy *= JUMP_CUT_MULT;
    jumpHeld = false;
  }

  // Coyote time
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
      player.x = player.vx > 0 ? p.x - player.w : p.x + p.w;
      player.vx = 0;
    }
  }
  player.x = constrain(player.x, 0, WORLD_W - player.w);

  // Vertical
  player.y += player.vy;
  for (let p of allPlats) {
    if (overlaps(player, p)) {
      if (player.vy > 0) {
        player.y = p.y - player.h;
        player.onGround = true;
      } else {
        player.y = p.y + p.h;
      }
      player.vy = 0;
    }
  }

  if (player.y > height + 200) {
    triggerDeath();
  }
}

function updateMovingPlatforms() {
  for (let mp of movingPlatforms) {
    let t = frameCount * mp.speed * 0.02;
    let prevX = mp.x,
      prevY = mp.y;
    if (mp.axis === "x") {
      mp.x = mp.origin + sin(t) * mp.range;
    } else {
      mp.y = mp.origin + sin(t) * mp.range;
    }
    mp.dx = mp.x - prevX;
    mp.dy = mp.y - prevY;
  }

  // Stick player to moving platform they're standing on
  for (let mp of movingPlatforms) {
    let feet = { x: player.x, y: player.y + player.h, w: player.w, h: 4 };
    let top = { x: mp.x, y: mp.y - 2, w: mp.w, h: 6 };
    if (player.onGround && overlaps(feet, top)) {
      player.x += mp.dx;
      player.y += mp.dy;
      break;
    }
  }
}

function updateEnemies() {
  for (let e of enemies) {
    e.x += e.speed * e.dir;
    if (e.x >= e.rightBound) {
      e.x = e.rightBound;
      e.dir = -1;
    }
    if (e.x <= e.leftBound) {
      e.x = e.leftBound;
      e.dir = 1;
    }
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

function updateDash() {
  if (dashTimer > 0) dashTimer--;
  if (dashCooldown > 0) dashCooldown--;
}

function checkTrapCollision() {
  // Spikes — always lethal
  for (let s of spikes) {
    if (overlaps(player, s)) {
      triggerDeath();
      return;
    }
  }
  // Lasers — lethal only when active
  for (let l of lasers) {
    let cycle = (frameCount + l.phase) % LASER_CYCLE;
    if (cycle < LASER_CYCLE * LASER_ON_FRAC) {
      if (overlaps(player, l)) {
        triggerDeath();
        return;
      }
    }
  }
}

function triggerDeath() {
  deathCount++;
  deathShakeTimer = DEATH_SHAKE_FRAMES;
  deathFlashTimer = DEATH_FLASH_FRAMES;
  player.x = 60;
  player.y = 360;
  player.vx = 0;
  player.vy = 0;

  focusActive = false;
  focusFade = 0;
  prevFocusKey = false;
  focusPulseOn = false;
  focusPulseR = 0;

  afterimages = [];
  coyoteTimer = 0;
  wasOnGround = false;
  jumpHeld = false;
  dashTimer = 0;
  dashCooldown = 0;
}

function overlaps(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════════════════════════════════

function keyPressed() {
  if (gameState === "start") {
    // Menu navigation
    if (keyCode === DOWN_ARROW || keyCode === 83) {
      menuSelection = (menuSelection + 1) % 2;
      return;
    }
    if (keyCode === UP_ARROW || keyCode === 87) {
      menuSelection = (menuSelection + 1) % 2;
      return;
    }
    if (keyCode === ENTER || keyCode === 32) {
      if (menuSelection === 0) {
        gameState = "intro";
        introTimer = 0;
      }
      // menuSelection === 1 (EXIT) — no-op in browser
      return;
    }
    return;
  }

  if (
    (keyCode === UP_ARROW || keyCode === 87) &&
    (player.onGround || (wasOnGround && coyoteTimer > 0))
  ) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    wasOnGround = false;
    coyoteTimer = 0;
    jumpHeld = true;
  }

  // Dash on SHIFT
  if (
    keyCode === SHIFT &&
    dashCooldown === 0 &&
    dashTimer === 0 &&
    gameState === "play"
  ) {
    dashTimer = DASH_FRAMES;
    dashCooldown = DASH_COOLDOWN;
    dashDir = playerFacing;
  }
}

function keyReleased() {
  if (keyCode === UP_ARROW || keyCode === 87) {
    jumpHeld = false;
  }
}

function mousePressed() {
  if (gameState === "start") {
    let btnW = 180, btnH = 34;
    let btnX = width / 2 - btnW / 2;
    let startBtnY = 290;
    if (mouseX >= btnX && mouseX <= btnX + btnW) {
      if (mouseY >= startBtnY && mouseY <= startBtnY + btnH) {
        gameState = "intro";
        introTimer = 0;
      }
    }
    return;
  }
  if (
    gameState === "win" &&
    mouseX >= WIN_BTN.x &&
    mouseX <= WIN_BTN.x + WIN_BTN.w &&
    mouseY >= WIN_BTN.y &&
    mouseY <= WIN_BTN.y + WIN_BTN.h
  ) {
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
  let dim = lowVis ? 0.3 : 0.8;

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
    if (r.y > height + 20) {
      r.y = random(-30, -10);
      r.x = random(-10, width + 40);
    }
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
//  VISUAL — Glare
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
    let bandW = gz.w * 0.3;
    let bPulse = 0.4 + 0.6 * sin(t * 0.06 + gz.x * 0.01);
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
    if (
      focusFade > 0 &&
      distToRect(pcx, pcy, p.x, p.y, p.w, p.h) <= FOCUS_RADIUS
    ) {
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
    if (
      focusFade > 0 &&
      distToRect(pcx, pcy, mp.x, mp.y, mp.w, mp.h) <= FOCUS_RADIUS
    ) {
      hi = focusFade;
    }
    drawMovingPlatformNeon(mp, lerp(0.18, 1.0, hi), hi);
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
    if (fade <= 0) {
      afterimages.splice(i, 1);
      i--;
      continue;
    }

    // Ghost sprite afterimage
    if (jamieIdle.length > 0) {
      let frame = jamieIdle[0];
      push();
      tint(0, 255, 240, fade * 0.6);
      imageMode(CENTER);
      let cx = ai.x + player.w / 2;
      let cy = ai.y + player.h / 2;
      if (playerFacing < 0) {
        scale(-1, 1);
        cx = -cx;
      }
      image(frame, cx, cy, JAMIE_DRAW_W, JAMIE_DRAW_H);
      imageMode(CORNER);
      pop();
    }
  }
}

function drawPlayer() {
  let px = player.x,
    py = player.y,
    pw = player.w,
    ph = player.h;
  let cx = px + pw / 2;
  let cy = py + ph / 2;
  noStroke();

  // Outer cyan glow
  fill(0, 255, 240, 14);
  rect(px - 5, py - 5, pw + 10, ph + 10);
  fill(0, 255, 240, 28);
  rect(px - 2, py - 2, pw + 4, ph + 4);

  // Jamie sprite — pick animation based on state
  let spriteFrame = null;
  if (!player.onGround && jamieJump.length > 0) {
    // Jump: pick frame based on vertical velocity
    let jIdx;
    if (player.vy < -4) jIdx = 0;        // rising fast
    else if (player.vy < 0) jIdx = 1;    // rising slow
    else if (player.vy < 2) jIdx = 2;    // apex
    else if (player.vy < 6) jIdx = 3;    // falling
    else jIdx = 4;                         // falling fast
    jIdx = min(jIdx, jamieJump.length - 1);
    spriteFrame = jamieJump[jIdx];
  } else if (abs(player.vx) > 0.5 && jamieRun.length > 0) {
    // Run cycle: 4 frames at 6fps
    let rIdx = floor(frameCount / 6) % jamieRun.length;
    spriteFrame = jamieRun[rIdx];
  } else if (jamieIdle.length > 0) {
    // Idle
    let iIdx = floor(frameCount / JAMIE_ANIM_SPEED) % jamieIdle.length;
    spriteFrame = jamieIdle[iIdx];
  }

  if (spriteFrame) {
    push();
    imageMode(CENTER);
    if (playerFacing < 0) {
      scale(-1, 1);
      image(spriteFrame, -cx, cy, JAMIE_DRAW_W, JAMIE_DRAW_H);
    } else {
      image(spriteFrame, cx, cy, JAMIE_DRAW_W, JAMIE_DRAW_H);
    }
    imageMode(CORNER);
    pop();
  } else {
    // Fallback neon silhouette if sprites didn't load
    fill(16, 10, 28);
    rect(px, py, pw, ph);
    stroke(0, 255, 240, 220);
    strokeWeight(2);
    line(px + 4, py + 9, px + pw - 4, py + 9);
    stroke(255, 50, 150, 150);
    strokeWeight(1);
    line(px + 3, py + 20, px + pw - 3, py + 20);
  }

  // Edge highlights around hitbox
  stroke(0, 255, 240, 35);
  strokeWeight(1);
  line(px, py, px, py + ph);
  line(px + pw, py, px + pw, py + ph);
  noStroke();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Enemies
// ═══════════════════════════════════════════════════════════════════════════════

function drawEnemyNeon(e, a, hi) {
  let ex = e.x,
    ey = e.y,
    ew = e.w,
    eh = e.h;
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
  let pcx = player.x + player.w / 2,
    pcy = player.y + player.h / 2;
  for (let e of enemies) {
    let hi = 0;
    if (
      focusFade > 0 &&
      distToRect(pcx, pcy, e.x, e.y, e.w, e.h) <= FOCUS_RADIUS
    ) {
      hi = focusFade;
    }
    drawEnemyNeon(e, lerp(0.18, 1.0, hi), hi);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Traps (spikes + lasers)
// ═══════════════════════════════════════════════════════════════════════════════

function drawSpikes() {
  let pcx = player.x + player.w / 2,
    pcy = player.y + player.h / 2;
  for (let s of spikes) {
    let hi = 0;
    if (
      focusFade > 0 &&
      distToRect(pcx, pcy, s.x, s.y, s.w, s.h) <= FOCUS_RADIUS
    ) {
      hi = focusFade;
    }
    let a = lerp(0.18, 1.0, hi);

    // Spike triangle pointing up
    let cx = s.x + s.w / 2;
    noStroke();
    fill(255, 80, 40, 22 * a);
    triangle(cx, s.y - 2, s.x - 2, s.y + s.h + 2, s.x + s.w + 2, s.y + s.h + 2);

    fill(80, 20, 10, 210 * a);
    triangle(cx, s.y, s.x, s.y + s.h, s.x + s.w, s.y + s.h);

    stroke(255, 120, 40, 190 * a);
    strokeWeight(1.5);
    line(s.x, s.y + s.h, cx, s.y);
    line(cx, s.y, s.x + s.w, s.y + s.h);

    if (hi > 0) {
      stroke(0, 255, 240, hi * 180);
      strokeWeight(1);
      line(s.x, s.y + s.h, cx, s.y);
      line(cx, s.y, s.x + s.w, s.y + s.h);
    }
    noStroke();
  }
}

function drawLasers() {
  let pcx = player.x + player.w / 2,
    pcy = player.y + player.h / 2;
  for (let l of lasers) {
    let cycle = (frameCount + l.phase) % LASER_CYCLE;
    let isOn = cycle < LASER_CYCLE * LASER_ON_FRAC;

    let hi = 0;
    if (
      focusFade > 0 &&
      distToRect(pcx, pcy, l.x, l.y, l.w, l.h) <= FOCUS_RADIUS
    ) {
      hi = focusFade;
    }
    let vis = lerp(0.18, 1.0, hi);

    if (isOn) {
      // Active laser beam — bright red
      let flicker = 0.7 + 0.3 * sin(frameCount * 0.5);
      noStroke();
      fill(255, 20, 60, 12 * vis);
      rect(l.x - 2, l.y - 6, l.w + 4, l.h + 12);
      fill(255, 40, 80, 160 * vis * flicker);
      rect(l.x, l.y, l.w, l.h);
      fill(255, 180, 180, 90 * vis * flicker);
      rect(l.x, l.y + 1, l.w, 2);
    } else {
      // Charging / off — dim warning dots at endpoints
      let chargeProgress = cycle / (LASER_CYCLE * (1 - LASER_ON_FRAC));
      let dotAlpha = chargeProgress * 120 * vis;
      noStroke();
      fill(255, 40, 80, dotAlpha);
      ellipse(l.x + 3, l.y + 2, 5, 5);
      ellipse(l.x + l.w - 3, l.y + 2, 5, 5);
      // Faint dashed line preview
      stroke(255, 40, 80, dotAlpha * 0.3);
      strokeWeight(1);
      for (let dx = 0; dx < l.w; dx += 12) {
        line(l.x + dx, l.y + 2, l.x + min(dx + 5, l.w), l.y + 2);
      }
      noStroke();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — Danger warning
// ═══════════════════════════════════════════════════════════════════════════════

function drawDangerWarning() {
  if (enemies.length === 0) return;
  let pcx = player.x + player.w / 2;
  let pcy = player.y + player.h / 2;
  let closestDist = Infinity;
  for (let e of enemies) {
    let d = distToRect(pcx, pcy, e.x, e.y, e.w, e.h);
    if (d < closestDist) closestDist = d;
  }

  if (closestDist < 150) {
    let intensity = map(closestDist, 150, 30, 0, 1);
    intensity = constrain(intensity, 0, 1);
    let pulse = 0.6 + 0.4 * sin(frameCount * 0.15);
    let a = intensity * pulse * 55;

    let ctx = drawingContext;
    let cx = width / 2,
      cy = height / 2;
    let g = ctx.createRadialGradient(
      cx,
      cy,
      height * 0.25,
      cx,
      cy,
      height * 0.75,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(255,20,60," + (a / 255).toFixed(3) + ")");
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

  let drift = 0.5 + 0.5 * sin(t * 0.04);
  let fieldR = lerp(0, 80, drift);
  let fieldG = lerp(200, 40, drift);
  let fieldB = lerp(220, 255, drift);
  fill(fieldR, fieldG, fieldB, 40 * intensity);
  ellipse(cx, cy, rx * 2, ry * 2);

  for (let ly = cy - ry + 5; ly < cy + ry - 3; ly += 7) {
    let span = sqrt(max(0, 1 - sq((ly - cy) / ry))) * rx * 0.88;
    let flicker = 0.4 + 0.6 * sin(t * 0.13 + ly * 0.22);
    stroke(0, 255, 240, 28 * flicker * intensity);
    strokeWeight(1);
    line(cx - span, ly, cx + span, ly);
  }
  noStroke();

  for (let i = 0; i < 5; i++) {
    let angle = t * 0.038 + (i * TWO_PI) / 5;
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
    let ly = cy - ry - 4 - step * 7;
    let prog = step / 4;
    let hw = lerp(rx * 0.28, 0, prog);
    let la = lerp(55, 0, prog) * intensity;
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

function drawGoalFull() {
  drawGoalNeon(1.0, 0);
}

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
  let pcx = player.x + player.w / 2,
    pcy = player.y + player.h / 2;
  let hi = 0;
  if (
    focusFade > 0 &&
    distToRect(pcx, pcy, goal.x, goal.y, goal.w, goal.h) <= FOCUS_RADIUS
  ) {
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
  let maxR = FOCUS_RADIUS + 30;
  let alpha = map(focusPulseR, 0, maxR, 200, 0);
  if (alpha <= 0) {
    focusPulseOn = false;
    return;
  }

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
  let canFocus = player.onGround && abs(player.vx) < 0.5;
  noStroke();

  if (focusActive) {
    // Active — bright pulsing dot
    let pulse = 0.7 + 0.3 * sin(frameCount * 0.15);
    fill(0, 255, 240, 50 * pulse);
    ellipse(cx, cy, 18, 18);
    fill(0, 255, 240);
    ellipse(cx, cy, 7, 7);
  } else if (canFocus) {
    // Ready — normal dot
    fill(0, 255, 240, 35);
    ellipse(cx, cy, 14, 14);
    fill(0, 255, 240);
    ellipse(cx, cy, 6, 6);
  } else {
    // Unavailable — dim
    fill(45, 40, 60, 120);
    ellipse(cx, cy, 8, 8);
  }
  noStroke();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VISUAL — HUD
// ═══════════════════════════════════════════════════════════════════════════════

function drawDeathCounter() {
  // Dash indicator (top-left, prominent)
  let dashReady = dashCooldown === 0 && dashTimer === 0;
  let dashX = 14, dashY = 10, dashW = 72, dashH = 22;
  noStroke();
  if (dashReady) {
    let pulse = 0.7 + 0.3 * sin(frameCount * 0.12);
    fill(0, 255, 240, 35 * pulse);
    rect(dashX - 2, dashY - 2, dashW + 4, dashH + 4, 5);
    fill(0, 255, 240, 50);
    rect(dashX, dashY, dashW, dashH, 4);
    stroke(0, 255, 240, 180 * pulse);
    strokeWeight(1);
    noFill();
    rect(dashX, dashY, dashW, dashH, 4);
    noStroke();
    fill(0, 255, 240, 230);
    textSize(11);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("DASH RDY", dashX + dashW / 2, dashY + dashH / 2);
  } else {
    fill(30, 25, 45, 180);
    rect(dashX, dashY, dashW, dashH, 4);
    let prog = 1 - dashCooldown / DASH_COOLDOWN;
    fill(0, 255, 240, 60);
    rect(dashX, dashY, dashW * prog, dashH, 4);
    stroke(60, 50, 80, 120);
    strokeWeight(1);
    noFill();
    rect(dashX, dashY, dashW, dashH, 4);
    noStroke();
    fill(100, 90, 130, 180);
    textSize(11);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("DASH", dashX + dashW / 2, dashY + dashH / 2);
  }
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);

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
  ctx.fillStyle = "rgba(0,0,0,0.055)";
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }
}

function drawVignette() {
  let ctx = drawingContext;
  let cx = width / 2,
    cy = height / 2;
  let g = ctx.createRadialGradient(cx, cy, height * 0.1, cx, cy, height * 0.82);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.6, "rgba(0,0,0,0.45)");
  g.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RESET + UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

function resetGame() {
  player.x = 60;
  player.y = 360;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  playerFacing = 1;

  // Generate a fresh random level on restart
  generateLevel();
  initParallax();

  camX = 0;
  focusActive = false;
  focusFade = 0;
  prevFocusKey = false;
  focusPulseOn = false;
  focusPulseR = 0;
  focusFlashTimer = 0;
  deathCount = 0;
  deathShakeTimer = 0;
  deathFlashTimer = 0;
  afterimages = [];
  coyoteTimer = 0;
  wasOnGround = false;
  jumpHeld = false;
  dashTimer = 0;
  dashCooldown = 0;

  gameState = "start";
  introTimer = 0;
  winTimer = 0;
}

function distToRect(px, py, rx, ry, rw, rh) {
  let dx = max(rx - px, 0, px - (rx + rw));
  let dy = max(ry - py, 0, py - (ry + rh));
  return sqrt(dx * dx + dy * dy);
}
