import { CONFIG } from './config';

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  vx: number;
  vy: number;
  isPlayer: boolean;
  active: boolean;
}

export class BulletPool {
  private pool: Bullet[] = [];
  private active: Bullet[] = [];

  constructor() {
    this.preWarm(50);
  }

  private preWarm(count: number) {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.create());
    }
  }

  private create(): Bullet {
    return {
      x: 0,
      y: 0,
      width: CONFIG.BULLET_WIDTH,
      height: CONFIG.BULLET_HEIGHT,
      speed: CONFIG.BULLET_SPEED,
      vx: 0,
      vy: 0,
      isPlayer: true,
      active: false,
    };
  }

  acquire(isPlayer: boolean): Bullet {
    let bullet = this.pool.pop();
    if (!bullet) {
      bullet = this.create();
    }

    bullet.isPlayer = isPlayer;
    bullet.speed = isPlayer ? CONFIG.BULLET_SPEED : CONFIG.ENEMY_BULLET_SPEED;
    bullet.active = true;

    if (isPlayer) {
      bullet.vx = 0;
      bullet.vy = -bullet.speed;
    }

    this.active.push(bullet);
    return bullet;
  }

  acquireAngled(x: number, y: number, angle: number, speed?: number, _type?: string): Bullet {
    let bullet = this.pool.pop();
    if (!bullet) {
      bullet = this.create();
    }

    const bSpeed = speed ?? CONFIG.ENEMY_BULLET_SPEED;
    bullet.isPlayer = false;
    bullet.speed = bSpeed;
    bullet.active = true;
    bullet.x = x;
    bullet.y = y;
    bullet.vx = Math.cos(angle) * bSpeed;
    bullet.vy = Math.sin(angle) * bSpeed;

    this.active.push(bullet);
    return bullet;
  }

  release(bullet: Bullet) {
    bullet.active = false;
    const index = this.active.indexOf(bullet);
    if (index > -1) {
      this.active.splice(index, 1);
    }
    this.pool.push(bullet);
  }

  update(deltaTime: number, canvasHeight: number) {
    const dt60 = deltaTime * 60;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const bullet = this.active[i];
      if (!bullet.active) continue;

      bullet.x += bullet.vx * dt60;
      bullet.y += bullet.vy * dt60;

      // Remove if off screen
      if (bullet.y < -bullet.height || bullet.y > canvasHeight + bullet.height) {
        this.release(bullet);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const bullet of this.active) {
      if (!bullet.active) continue;

      ctx.save();
      ctx.shadowColor = bullet.isPlayer
        ? CONFIG.COLORS.BULLET_PLAYER
        : CONFIG.COLORS.BULLET_ENEMY;
      ctx.shadowBlur = 10;

      ctx.fillStyle = bullet.isPlayer
        ? CONFIG.COLORS.BULLET_PLAYER
        : CONFIG.COLORS.BULLET_ENEMY;

      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

      ctx.restore();
    }
  }

  getActive(): Bullet[] {
    return this.active;
  }

  clear() {
    while (this.active.length > 0) {
      this.release(this.active[0]);
    }
  }
}
