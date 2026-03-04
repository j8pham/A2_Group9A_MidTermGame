// ── Constants ─────────────────────────────────────────────────────────────────
const GRAVITY      = 0.6;
const MOVE_SPEED   = 4;
const JUMP_FORCE   = -12;
const TERM_VEL     = 16;   // max fall speed (prevents tunnelling through thin platforms)
const WORLD_W      = 2350; // total width of the level

// ── State ─────────────────────────────────────────────────────────────────────
let player;
let platforms;
let camX = 0;

// ── Setup ─────────────────────────────────────────────────────────────────────
function setup() {
  createCanvas(800, 450);
  noSmooth();

  // Player starts standing on the left ground section.
  // ground.y = 400, player.h = 40  →  player.y = 400 - 40 = 360
  player = {
    x: 60,
    y: 360,
    w: 30,
    h: 40,
    vx: 0,
    vy: 0,
    onGround: false
  };

  // 7 platforms at varied heights.
  // Layout designed so each gap requires a jump but is within max-jump range (~120 px).
  platforms = [
    { x: 0,    y: 400, w: 400, h: 50 },  // [0] ground – left section
    { x: 450,  y: 330, w: 200, h: 20 },  // [1] low step
    { x: 700,  y: 270, w: 180, h: 20 },  // [2] mid-high
    { x: 950,  y: 330, w: 150, h: 20 },  // [3] back down
    { x: 1150, y: 230, w: 200, h: 20 },  // [4] highest point
    { x: 1400, y: 350, w: 180, h: 20 },  // [5] descent step
    { x: 1550, y: 400, w: 800, h: 50 },  // [6] ground – right section
  ];
}

// ── Main Loop ─────────────────────────────────────────────────────────────────
function draw() {
  background(135, 206, 235);

  updatePlayer();
  updateCamera();

  push();
  translate(-camX, 0);
  drawPlatforms();
  drawPlayer();
  pop();
}

// ── Physics & Collision ───────────────────────────────────────────────────────
function updatePlayer() {
  // Horizontal input
  player.vx = 0;
  if (keyIsDown(LEFT_ARROW))  player.vx = -MOVE_SPEED;
  if (keyIsDown(RIGHT_ARROW)) player.vx =  MOVE_SPEED;

  // Gravity (capped at terminal velocity)
  player.vy += GRAVITY;
  if (player.vy > TERM_VEL) player.vy = TERM_VEL;

  // Reset ground flag before collision pass
  player.onGround = false;

  // ── Horizontal move then resolve ──
  player.x += player.vx;
  for (let p of platforms) {
    if (overlaps(player, p)) {
      if (player.vx > 0) player.x = p.x - player.w;  // pushed left
      else               player.x = p.x + p.w;        // pushed right
      player.vx = 0;
    }
  }

  // Clamp to world bounds
  player.x = constrain(player.x, 0, WORLD_W - player.w);

  // ── Vertical move then resolve ──
  player.y += player.vy;
  for (let p of platforms) {
    if (overlaps(player, p)) {
      if (player.vy > 0) {            // falling → land on top
        player.y       = p.y - player.h;
        player.onGround = true;
      } else {                        // rising → hit underside
        player.y = p.y + p.h;
      }
      player.vy = 0;
    }
  }

  // Respawn if player falls off the bottom of the screen
  if (player.y > height + 200) {
    player.x = 60;
    player.y = 360;
    player.vy = 0;
  }
}

// Jump is triggered on key-press (not held), so it lives in keyPressed
function keyPressed() {
  if (keyCode === UP_ARROW && player.onGround) {
    player.vy      = JUMP_FORCE;
    player.onGround = false;
  }
}

// AABB overlap test
function overlaps(a, b) {
  return a.x         < b.x + b.w &&
         a.x + a.w   > b.x       &&
         a.y         < b.y + b.h &&
         a.y + a.h   > b.y;
}

// ── Camera ────────────────────────────────────────────────────────────────────
function updateCamera() {
  // Keep player roughly 1/3 from the left edge; clamp to world bounds
  let target = player.x - width / 3;
  camX = constrain(target, 0, WORLD_W - width);
}

// ── Drawing ───────────────────────────────────────────────────────────────────
function drawPlatforms() {
  fill(80, 140, 60);
  noStroke();
  for (let p of platforms) {
    rect(p.x, p.y, p.w, p.h);
  }
}

function drawPlayer() {
  fill(220, 80, 80);
  noStroke();
  rect(player.x, player.y, player.w, player.h);
}
