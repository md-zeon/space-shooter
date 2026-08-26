import { CONFIG } from './config';

export type PowerUpType = 'shield' | 'weapon' | 'health' | 'score' | 'bomb';

export interface PowerUp {
  x: number;
  y: number;
  size: number;
  type: PowerUpType;
  active: boolean;
  pulsePhase: number;
}

export class PowerUpManager {
  private powerUps: PowerUp[] = [];
  private spawnTimer: number = 0;

  update(deltaTime: number, canvasWidth: number, canvasHeight: number) {
    this.spawnTimer += deltaTime * 1000;
    if (this.spawnTimer >= CONFIG.POWERUP_SPAWN_RATE) {
      this.spawn(canvasWidth);
      this.spawnTimer = 0;
    }

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      if (!powerUp.active) continue;

      powerUp.y += CONFIG.POWERUP_SPEED * deltaTime * 60;
      powerUp.pulsePhase += deltaTime * 5;

      if (powerUp.y > canvasHeight + powerUp.size) {
        this.remove(powerUp);
      }
    }
  }

  spawn(canvasWidth: number) {
    const roll = Math.random();
    let type: PowerUpType;
    if (roll < 0.35) type = 'weapon';
    else if (roll < 0.55) type = 'score';
    else if (roll < 0.75) type = 'shield';
    else if (roll < 0.9) type = 'health';
    else type = 'bomb';

    this.powerUps.push({
      x: 30 + Math.random() * (canvasWidth - 60),
      y: -CONFIG.POWERUP_SIZE,
      size: CONFIG.POWERUP_SIZE,
      type,
      active: true,
      pulsePhase: 0,
    });
  }

  spawnAt(x: number, y: number, type: PowerUpType) {
    this.powerUps.push({
      x: x - CONFIG.POWERUP_SIZE / 2,
      y,
      size: CONFIG.POWERUP_SIZE,
      type,
      active: true,
      pulsePhase: 0,
    });
  }

  remove(powerUp: PowerUp) {
    powerUp.active = false;
    const index = this.powerUps.indexOf(powerUp);
    if (index > -1) this.powerUps.splice(index, 1);
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const powerUp of this.powerUps) {
      if (!powerUp.active) continue;

      ctx.save();

      let color: string;
      let label: string;
      switch (powerUp.type) {
        case 'shield': color = CONFIG.COLORS.POWERUP_SHIELD; label = 'S'; break;
        case 'weapon': color = CONFIG.COLORS.POWERUP_WEAPON; label = 'P'; break;
        case 'health': color = CONFIG.COLORS.POWERUP_HEALTH; label = '+'; break;
        case 'score': color = CONFIG.COLORS.POWERUP_SCORE; label = '$'; break;
        case 'bomb': color = CONFIG.COLORS.POWERUP_BOMB; label = 'B'; break;
      }

      const pulse = 1 + Math.sin(powerUp.pulsePhase) * 0.1;
      const size = powerUp.size * pulse;
      const centerX = powerUp.x + powerUp.size / 2;
      const centerY = powerUp.y + powerUp.size / 2;
      const radius = size / 2;

      // Outer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 15 + Math.sin(powerUp.pulsePhase) * 5;

      // Diamond shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX + radius, centerY);
      ctx.lineTo(centerX, centerY + radius);
      ctx.lineTo(centerX - radius, centerY);
      ctx.closePath();
      ctx.fill();

      // Border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.stroke();

      // Inner label
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.floor(size * 0.4)}px "Press Start 2P"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, centerX, centerY + 1);

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
