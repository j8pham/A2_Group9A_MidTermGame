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

let gameState  = "start"; // "start" | "intro" | "play" | "win"
let introTimer = 0;

let focusActive   = false;
let focusFade     = 0;
let focusCooldown = 0;
let prevFocusKey  = false;

// Enemy — patrols platform [4] (the highest point)
let enemy;

// Goal — data vault sitting on the far end of the right ground section
let goal;

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

  // Enemy sits on platform [4] (x:1150, y:230, w:200).
  // Bounds keep it a few pixels inside the platform edges.
  enemy = {
    x: 1155, y: 200,   // y = platform top (230) − enemy height (30)
    w: 22,   h: 30,
    speed: 1.1,
    dir: 1,            // 1 = right, −1 = left
    leftBound:  1155,
    rightBound: 1150 + 200 - 22 - 5,  // 1323
  };

  // Goal sits on right ground section (platform [6]: x:1550, y:400, w:800).
  // Placed near the far end of the level.
  goal = { x: 2250, y: 368, w: 30, h: 32 };
}

// ── Main Loop ─────────────────────────────────────────────────────────────────
function draw() {
  if (gameState === "start") {
    drawStartScreen();
    return;
  }

  if (gameState === "win") {
    drawWinScreen();
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
  updateEnemy();
  checkEnemyCollision();
  if (overlaps(player, goal)) { gameState = "win"; return; }
  background(18, 16, 22);
  push();
  translate(-camX, 0);
  drawLights();
  drawPlatforms();
  drawGoal();
  drawEnemy();
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

  updateEnemy();

  push();
  translate(-camX + sx, sy);

  if (inFlash) {
    // Low-vision world already active; the flash overlay hides the transition
    drawLights();
    drawPlatforms();
    drawGoal();
    drawEnemy();
  } else {
    // Clean full-opacity world
    drawPlatformsFull();
    drawGoalFull();
    drawEnemyFull();
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

// ── Enemy ─────────────────────────────────────────────────────────────────────

// Advance patrol position; reverse at bounds.
function updateEnemy() {
  enemy.x += enemy.speed * enemy.dir;
  if (enemy.x >= enemy.rightBound) { enemy.x = enemy.rightBound; enemy.dir = -1; }
  if (enemy.x <= enemy.leftBound)  { enemy.x = enemy.leftBound;  enemy.dir =  1; }
}

// AABB touch → snap player back to spawn.
function checkEnemyCollision() {
  if (overlaps(player, enemy)) {
    player.x = 60; player.y = 360;
    player.vx = 0; player.vy = 0;
  }
}

// Intro full-vision phase — amber at full opacity, no outline
function drawEnemyFull() {
  noStroke();
  fill(185, 100, 30);
  rect(enemy.x, enemy.y, enemy.w, enemy.h);
}

// Low-vision phase — same dim opacity as platforms, highlights with Focus
function drawEnemy() {
  let pcx = player.x + player.w / 2;
  let pcy = player.y + player.h / 2;
  let hi  = 0;
  if (focusFade > 0) {
    if (distToRect(pcx, pcy, enemy.x, enemy.y, enemy.w, enemy.h) <= FOCUS_RADIUS) {
      hi = focusFade;
    }
  }

  fill(185, 100, 30, lerp(62, 255, hi));
  if (hi > 0) { stroke(0, 255, 240, hi * 160); strokeWeight(1.5); }
  else        { noStroke(); }
  rect(enemy.x, enemy.y, enemy.w, enemy.h);
  noStroke();
}

// ── Goal ──────────────────────────────────────────────────────────────────────

// Low-vision version — same opacity system as platforms and enemy
function drawGoal() {
  let pcx = player.x + player.w / 2;
  let pcy = player.y + player.h / 2;
  let hi  = 0;
  if (focusFade > 0) {
    if (distToRect(pcx, pcy, goal.x, goal.y, goal.w, goal.h) <= FOCUS_RADIUS) hi = focusFade;
  }

  let a = lerp(62, 255, hi);

  // Body
  fill(0, 195, 175, a);
  if (hi > 0) { stroke(0, 255, 240, hi * 220); strokeWeight(2); }
  else        { noStroke(); }
  rect(goal.x, goal.y, goal.w, goal.h);

  // Inner vault panel
  noStroke();
  fill(0, 110, 100, lerp(30, 190, hi));
  rect(goal.x + 5, goal.y + 5, goal.w - 10, goal.h - 13);

  // Access indicator dot
  fill(0, 255, 220, lerp(55, 255, hi));
  ellipse(goal.x + goal.w / 2, goal.y + goal.h - 6, 5, 5);
}

// Full-opacity version used during intro clear phase
function drawGoalFull() {
  noStroke();
  fill(0, 195, 175);
  rect(goal.x, goal.y, goal.w, goal.h);
  fill(0, 110, 100);
  rect(goal.x + 5, goal.y + 5, goal.w - 10, goal.h - 13);
  fill(0, 255, 220);
  ellipse(goal.x + goal.w / 2, goal.y + goal.h - 6, 5, 5);
}

// ── Win Screen ────────────────────────────────────────────────────────────────

// Button bounds — defined once, shared between draw and click detection
const WIN_BTN = { x: 310, y: 285, w: 180, h: 42 };

function drawWinScreen() {
  background(18, 16, 22);
  textAlign(CENTER, CENTER);

  // Primary heading
  noStroke();
  fill(0, 255, 240);
  textSize(56);
  textStyle(BOLD);
  text("DATA SECURED", width / 2, height / 2 - 88);

  // Cyan rule
  stroke(0, 255, 240, 55);
  strokeWeight(1);
  line(width / 2 - 210, height / 2 - 44, width / 2 + 210, height / 2 - 44);
  noStroke();

  // Secondary line
  fill(180, 60, 255);
  textSize(17);
  textStyle(NORMAL);
  text("OBJECTIVE COMPLETE", width / 2, height / 2 - 18);

  // Flavour lines
  fill(70, 70, 85);
  textSize(11);
  text("ACCESS NODE REACHED  //  NEURAL LINK ESTABLISHED", width / 2, height / 2 + 16);

  // Restart button — neon cyan border, label inside
  stroke(0, 255, 240, 200);
  strokeWeight(1);
  noFill();
  rect(WIN_BTN.x, WIN_BTN.y, WIN_BTN.w, WIN_BTN.h);

  noStroke();
  fill(0, 255, 240);
  textSize(13);
  textStyle(BOLD);
  text("RESTART", width / 2, WIN_BTN.y + WIN_BTN.h / 2);

  drawVignette();
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function resetGame() {
  player.x = 60; player.y = 360;
  player.vx = 0; player.vy = 0;
  player.onGround = false;

  enemy.x   = 1155; enemy.y = 200; enemy.dir = 1;

  camX          = 0;
  focusActive   = false;
  focusFade     = 0;
  focusCooldown = 0;
  prevFocusKey  = false;

  gameState  = "start";
  introTimer = 0;
}

function mousePressed() {
  if (gameState === "win") {
    if (mouseX >= WIN_BTN.x && mouseX <= WIN_BTN.x + WIN_BTN.w &&
        mouseY >= WIN_BTN.y && mouseY <= WIN_BTN.y + WIN_BTN.h) {
      resetGame();
    }
  }
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
