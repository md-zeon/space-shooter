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
  };
}

export function updatePlayer(
  player: Player,
  input: { left: boolean; right: boolean; up: boolean; down: boolean; touchDx: number; touchDy: number },
  deltaTime: number,
  canvasWidth: number
) {
  const speed = player.speed * deltaTime * 60;

  // Keyboard input
  if (input.left) player.x -= speed;
  if (input.right) player.x += speed;
  if (input.up) player.y -= speed;
  if (input.down) player.y += speed;

  // Touch input
  if (input.touchDx !== 0 || input.touchDy !== 0) {
    player.x += input.touchDx * speed;
    player.y += input.touchDy * speed;
  }

  // Bounds checking
  player.x = Math.max(0, Math.min(canvasWidth - player.width, player.x));
  player.y = Math.max(0, player.y);

  // Invincibility timer
  if (player.isInvincible) {
    player.invincibleTimer -= deltaTime * 1000;
    if (player.invincibleTimer <= 0) {
      player.isInvincible = false;
      player.invincibleTimer = 0;
    }
  }
}

export function renderPlayer(ctx: CanvasRenderingContext2D, player: Player, time: number) {
  // Flash effect when invincible
  if (player.isInvincible && Math.floor(time / 100) % 2 === 0) {
    return;
  }

  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;

  // Glow effect
  ctx.save();
  ctx.shadowColor = CONFIG.COLORS.PLAYER;
  ctx.shadowBlur = 20;

  // Ship body (triangle)
  ctx.fillStyle = CONFIG.COLORS.PLAYER;
  ctx.beginPath();
  ctx.moveTo(centerX, player.y);
  ctx.lineTo(player.x + player.width, player.y + player.height);
  ctx.lineTo(centerX, player.y + player.height * 0.7);
  ctx.lineTo(player.x, player.y + player.height);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Engine exhaust
  ctx.fillStyle = CONFIG.COLORS.BULLET_PLAYER;
  ctx.globalAlpha = 0.6 + Math.sin(time * 0.01) * 0.2;
  ctx.beginPath();
  ctx.moveTo(centerX - 5, player.y + player.height);
  ctx.lineTo(centerX, player.y + player.height + 8 + Math.random() * 4);
  ctx.lineTo(centerX + 5, player.y + player.height);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}
