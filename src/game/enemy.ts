import { CONFIG } from './config';

export type EnemyType = 'basic' | 'advanced' | 'elite';

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  health: number;
  type: EnemyType;
  active: boolean;
  shootTimer: number;
  patternTimer: number;
}

export interface EnemyBulletRequest {
  x: number;
  y: number;
  angle: number;
}

export class EnemyManager {
  private enemies: Enemy[] = [];
  private spawnTimer: number = 0;
  private spawnRate: number = CONFIG.ENEMY_SPAWN_RATE;
  private difficulty: number = 1;

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): EnemyBulletRequest[] {
    const bulletRequests: EnemyBulletRequest[] = [];

    // Spawn enemies
    this.spawnTimer += deltaTime * 1000;
    if (this.spawnTimer >= this.spawnRate) {
      this.spawn(canvasWidth);
      this.spawnTimer = 0;
      this.spawnRate = Math.max(300, CONFIG.ENEMY_SPAWN_RATE - this.difficulty * 50);
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.active) continue;

      const speed = enemy.speed * deltaTime * 60;

      switch (enemy.type) {
        case 'basic':
          enemy.y += speed;
          break;
        case 'advanced':
          enemy.y += speed * 0.8;
          enemy.x += Math.sin(enemy.patternTimer * 0.02) * 2;
          enemy.patternTimer += deltaTime * 60;
          break;
        case 'elite':
          enemy.y += speed * 0.6;
          enemy.x += Math.cos(enemy.patternTimer * 0.03) * 3;
          enemy.patternTimer += deltaTime * 60;
          break;
      }

      // Shooting
      enemy.shootTimer += deltaTime * 1000;
      const request = this.checkShoot(enemy, canvasWidth, canvasHeight);
      if (request) {
        bulletRequests.push(...request);
      }

      // Remove if off screen
      if (enemy.y > canvasHeight + enemy.height) {
        this.remove(enemy);
      }
    }

    return bulletRequests;
  }

  private checkShoot(enemy: Enemy, canvasWidth: number, canvasHeight: number): EnemyBulletRequest[] | null {
    const requests: EnemyBulletRequest[] = [];

    switch (enemy.type) {
      case 'basic': {
        const interval = Math.max(2000, 4000 - this.difficulty * 200);
        if (enemy.shootTimer >= interval) {
          enemy.shootTimer = 0;
          requests.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height,
            angle: Math.PI / 2, // straight down
          });
        }
        break;
      }
      case 'advanced': {
        const interval = Math.max(1500, 3000 - this.difficulty * 150);
        if (enemy.shootTimer >= interval) {
          enemy.shootTimer = 0;
          // Aimed shot (toward player's typical position - center-ish)
          const targetX = canvasWidth / 2;
          const dx = targetX - (enemy.x + enemy.width / 2);
          const dy = canvasHeight - enemy.y;
          const angle = Math.atan2(dy, dx);
          requests.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height,
            angle,
          });
        }
        break;
      }
      case 'elite': {
        const interval = Math.max(800, 1800 - this.difficulty * 100);
        if (enemy.shootTimer >= interval) {
          enemy.shootTimer = 0;
          // Spread shot (3 bullets)
          for (let i = -1; i <= 1; i++) {
            requests.push({
              x: enemy.x + enemy.width / 2,
              y: enemy.y + enemy.height,
              angle: Math.PI / 2 + i * 0.3,
            });
          }
        }
        break;
      }
    }

    return requests.length > 0 ? requests : null;
  }

  spawn(canvasWidth: number) {
    const types: EnemyType[] = ['basic', 'basic', 'basic', 'advanced', 'elite'];
    const type = types[Math.floor(Math.random() * Math.min(types.length, 2 + Math.floor(this.difficulty / 2)))];

    const enemy: Enemy = {
      x: Math.random() * (canvasWidth - CONFIG.ENEMY_WIDTH),
      y: -CONFIG.ENEMY_HEIGHT,
      width: CONFIG.ENEMY_WIDTH,
      height: CONFIG.ENEMY_HEIGHT,
      speed: CONFIG.ENEMY_SPEED + Math.random() * this.difficulty * 0.2,
      health: type === 'elite' ? 3 : type === 'advanced' ? 2 : 1,
      type,
      active: true,
      shootTimer: Math.random() * 1000, // random initial offset
      patternTimer: 0,
    };

    this.enemies.push(enemy);
  }

  remove(enemy: Enemy) {
    enemy.active = false;
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      ctx.save();
      ctx.shadowColor = CONFIG.COLORS.ENEMY_GLOW;
      ctx.shadowBlur = 15;

      const centerX = enemy.x + enemy.width / 2;
      const centerY = enemy.y + enemy.height / 2;

      if (enemy.type === 'elite') {
        ctx.fillStyle = CONFIG.COLORS.BOSS;
      } else {
        ctx.fillStyle = CONFIG.COLORS.ENEMY;
      }

      // Enemy body (inverted triangle)
      ctx.beginPath();
      ctx.moveTo(centerX, enemy.y + enemy.height);
      ctx.lineTo(enemy.x + enemy.width, enemy.y);
      ctx.lineTo(enemy.x, enemy.y);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  getActive(): Enemy[] {
    return this.enemies;
  }

  setDifficulty(level: number) {
    this.difficulty = level;
  }

  clear() {
    this.enemies = [];
    this.spawnTimer = 0;
  }
}
