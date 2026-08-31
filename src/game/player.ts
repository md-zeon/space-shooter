import { CONFIG } from './config';

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  lives: number;
  speed: number;
  isInvincible: boolean;
  invincibleTimer: number;
  lastFireTime: number;
  fireRate: number;
  powerLevel: number;
  bombs: number;
  tilt: number;
  targetTilt: number;
  thrusterPhase: number;
  laserCharge: number;
  laserActive: boolean;
  laserTimer: number;
  laserDmgTimer: number;
  narrowTimer: number;
  focusing: boolean;
  armor: number;
  maxArmor: number;
}

export function createPlayer(canvasWidth: number, canvasHeight: number): Player {
  return {
    x: canvasWidth / 2 - CONFIG.PLAYER_WIDTH / 2,
    y: canvasHeight - CONFIG.PLAYER_HEIGHT - 20,
    width: CONFIG.PLAYER_WIDTH,
    height: CONFIG.PLAYER_HEIGHT,
    lives: CONFIG.PLAYER_LIVES,
    speed: CONFIG.PLAYER_SPEED,
    isInvincible: false,
    invincibleTimer: 0,
    lastFireTime: 0,
    fireRate: CONFIG.FIRE_RATE,
    powerLevel: 1,
    bombs: CONFIG.BOMB_COUNT,
    tilt: 0,
    targetTilt: 0,
    thrusterPhase: 0,
    laserCharge: 0,
    laserActive: false,
    laserTimer: 0,
    laserDmgTimer: 0,
    narrowTimer: 0,
    focusing: false,
    armor: 0,
    maxArmor: CONFIG.PLAYER_MAX_ARMOR,
  };
}

export function updatePlayer(
  player: Player,
  input: { left: boolean; right: boolean; up: boolean; down: boolean; touchTarget: { x: number; y: number } | null },
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const speed = player.speed * deltaTime * 60 * (player.focusing ? CONFIG.FOCUS_SPEED_MULT : 1);

  if (input.touchTarget) {
    // Direct position follow with smoothing. Focus slows the pursuit so the
    // player gets fine-grained thumb control through dense lanes. The bottom
    // TOUCH_DEADZONE strip is reserved as a trackpad: the ship never tracks
    // into it, so a resting thumb down there never occludes the hull.
    const smoothing = player.focusing ? 0.10 : 0.25;
    const deadY = canvasHeight - CONFIG.TOUCH_DEADZONE;
    const targetX = input.touchTarget.x - player.width / 2;
    const targetY = Math.min(input.touchTarget.y - player.height / 2, deadY - player.height);
    player.x += (targetX - player.x) * smoothing;
    player.y += (targetY - player.y) * smoothing;
  } else {
    if (input.left) player.x -= speed;
    if (input.right) player.x += speed;
    if (input.up) player.y -= speed;
    if (input.down) player.y += speed;
  }

  // Banking tilt (input-driven, snappy)
  if (input.left || (input.touchTarget && input.touchTarget.x < player.x + player.width / 2 - 2)) {
    player.targetTilt = -1;
  } else if (input.right || (input.touchTarget && input.touchTarget.x > player.x + player.width / 2 + 2)) {
    player.targetTilt = 1;
  } else {
    player.targetTilt = 0;
  }

  player.tilt += (player.targetTilt - player.tilt) * 0.3;
  if (Math.abs(player.tilt) < 0.05) player.tilt = 0;

  // Thruster animation
  player.thrusterPhase += deltaTime * 10;

  player.x = Math.max(0, Math.min(canvasWidth - player.width, player.x));
  player.y = Math.max(0, Math.min(canvasHeight - player.height, player.y));

  if (player.isInvincible) {
    player.invincibleTimer -= deltaTime * 1000;
    if (player.invincibleTimer <= 0) {
      player.isInvincible = false;
      player.invincibleTimer = 0;
    }
  }
}

export function renderPlayer(ctx: CanvasRenderingContext2D, player: Player, time: number, skin: number = 0) {
  if (player.isInvincible && Math.floor(time / 100) % 2 === 0) return;

  // Alternate skin (index 1) re-colors the hull/wings/accents (meta unlock).
  const bodyColor = skin === 1 ? CONFIG.COLORS.PLAYER_SKIN_BODY : CONFIG.COLORS.PLAYER;
  const tiltColor = skin === 1 ? CONFIG.COLORS.PLAYER_SKIN_TILT : CONFIG.COLORS.PLAYER_TILT;
  const bulletColor = skin === 1 ? CONFIG.COLORS.PLAYER_SKIN_BULLET : CONFIG.COLORS.BULLET_PLAYER;

  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  const tilt = player.tilt;

  ctx.save();

  // Shield bubble
  if (player.isInvincible && player.invincibleTimer > CONFIG.INVINCIBLE_DURATION * 0.3) {
    ctx.strokeStyle = bodyColor;
    ctx.globalAlpha = 0.2 + Math.sin(time * 0.01) * 0.1;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, player.width * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Engine exhaust (behind ship)
  const exhaustLen = 10 + Math.sin(player.thrusterPhase) * 4;
  const exhaustAlpha = 0.5 + Math.sin(player.thrusterPhase * 1.5) * 0.2;

  ctx.globalAlpha = exhaustAlpha;
  ctx.fillStyle = bulletColor;
  ctx.shadowColor = bulletColor;
  ctx.shadowBlur = 8;

  // Left exhaust
  ctx.beginPath();
  ctx.moveTo(cx - 8 + tilt * 3, player.y + player.height);
  ctx.lineTo(cx - 5 + tilt * 3, player.y + player.height + exhaustLen + Math.random() * 3);
  ctx.lineTo(cx - 2 + tilt * 3, player.y + player.height);
  ctx.closePath();
  ctx.fill();

  // Right exhaust
  ctx.beginPath();
  ctx.moveTo(cx + 2 + tilt * 3, player.y + player.height);
  ctx.lineTo(cx + 5 + tilt * 3, player.y + player.height + exhaustLen + Math.random() * 3);
  ctx.lineTo(cx + 8 + tilt * 3, player.y + player.height);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Ship body
  ctx.shadowColor = bodyColor;
  ctx.shadowBlur = 20;

  const tiltOffset = tilt * 4;

  // Main fuselage
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(cx + tiltOffset, player.y);
  ctx.lineTo(player.x + player.width + tiltOffset * 0.5, player.y + player.height * 0.85);
  ctx.lineTo(cx + tiltOffset * 0.3, player.y + player.height * 0.65);
  ctx.lineTo(player.x + tiltOffset * 0.5, player.y + player.height * 0.85);
  ctx.closePath();
  ctx.fill();

  // Wings
  ctx.fillStyle = tiltColor;
  ctx.beginPath();
  ctx.moveTo(cx - 2 + tiltOffset * 0.5, player.y + player.height * 0.4);
  ctx.lineTo(player.x - 5 + tiltOffset * 0.3, player.y + player.height);
  ctx.lineTo(cx - 4 + tiltOffset * 0.3, player.y + player.height * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 2 + tiltOffset * 0.5, player.y + player.height * 0.4);
  ctx.lineTo(player.x + player.width + 5 + tiltOffset * 0.3, player.y + player.height);
  ctx.lineTo(cx + 4 + tiltOffset * 0.3, player.y + player.height * 0.7);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(cx + tiltOffset * 0.8, cy - 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Wing accents
  ctx.strokeStyle = tiltColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx - 3 + tiltOffset * 0.5, player.y + player.height * 0.5);
  ctx.lineTo(player.x - 3 + tiltOffset * 0.3, player.y + player.height * 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 3 + tiltOffset * 0.5, player.y + player.height * 0.5);
  ctx.lineTo(player.x + player.width + 3 + tiltOffset * 0.3, player.y + player.height * 0.9);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Focus mode: reveal the tiny hitbox core at the ship center (Touhou-style).
  if (player.focusing) {
    const hx = cx + tiltOffset * 0.8;
    const hy = cy - 2;
    ctx.fillStyle = '#FF0000';
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(hx, hy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hx, hy, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
