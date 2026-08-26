import { CONFIG } from './config';

export type PowerUpType = 'shield' | 'weapon' | 'health' | 'score';

export interface PowerUp {
  x: number;
  y: number;
  size: number;
  type: PowerUpType;
  active: boolean;
}

export class PowerUpManager {
  private powerUps: PowerUp[] = [];
  private spawnTimer: number = 0;
  private spawnRate: number = 5000;

  update(deltaTime: number, canvasHeight: number) {
    this.spawnTimer += deltaTime * 1000;
    if (this.spawnTimer >= this.spawnRate) {
      this.spawn(canvasHeight);
      this.spawnTimer = 0;
    }

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      if (!powerUp.active) continue;

      powerUp.y += CONFIG.POWERUP_SPEED * deltaTime * 60;

      if (powerUp.y > canvasHeight + powerUp.size) {
        this.remove(powerUp);
      }
    }
  }

  spawn(canvasHeight: number) {
    const types: PowerUpType[] = ['shield', 'weapon', 'health', 'score'];
    const type = types[Math.floor(Math.random() * types.length)];

    const powerUp: PowerUp = {
      x: Math.random() * (CONFIG.WIDTH - CONFIG.POWERUP_SIZE),
      y: -CONFIG.POWERUP_SIZE,
      size: CONFIG.POWERUP_SIZE,
      type,
      active: true,
    };

    this.powerUps.push(powerUp);
  }

  remove(powerUp: PowerUp) {
    powerUp.active = false;
    const index = this.powerUps.indexOf(powerUp);
    if (index > -1) {
      this.powerUps.splice(index, 1);
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const powerUp of this.powerUps) {
      if (!powerUp.active) continue;

      ctx.save();

      let color: string;
      switch (powerUp.type) {
        case 'shield':
          color = CONFIG.COLORS.POWERUP_SHIELD;
          break;
        case 'weapon':
          color = CONFIG.COLORS.POWERUP_WEAPON;
          break;
        case 'health':
          color = CONFIG.COLORS.POWERUP_HEALTH;
          break;
        case 'score':
          color = CONFIG.COLORS.POWERUP_SCORE;
          break;
      }

      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = color;

      const centerX = powerUp.x + powerUp.size / 2;
      const centerY = powerUp.y + powerUp.size / 2;
      const radius = powerUp.size / 2;

      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX + radius, centerY);
      ctx.lineTo(centerX, centerY + radius);
      ctx.lineTo(centerX - radius, centerY);
      ctx.closePath();
      ctx.fill();

      // Inner glow
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  getActive(): PowerUp[] {
    return this.powerUps;
  }

  clear() {
    this.powerUps = [];
    this.spawnTimer = 0;
  }
}
