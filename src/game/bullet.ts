import { CONFIG } from './config';

export type BulletType = 'player' | 'straight' | 'aimed' | 'spread' | 'radial' | 'spiral' | 'burst' | 'fan' | 'ring' | 'laser';

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
  bulletType: BulletType;
}

const ENEMY_BULLET_SIZES: Record<string, { w: number; h: number }> = {
  default: { w: 4, h: 4 },
  aimed: { w: 3, h: 6 },
  spread: { w: 4, h: 4 },
  radial: { w: 4, h: 4 },
  spiral: { w: 5, h: 5 },
  burst: { w: 3, h: 5 },
  fan: { w: 4, h: 4 },
  ring: { w: 3, h: 3 },
  laser: { w: 2, h: 10 },
};

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
      bulletType: 'player',
    };
  }

  acquire(isPlayer: boolean): Bullet {
    let bullet = this.pool.pop();
    if (!bullet) {
      bullet = this.create();
    }

    bullet.isPlayer = isPlayer;
    bullet.bulletType = 'player';
    bullet.speed = isPlayer ? CONFIG.BULLET_SPEED : CONFIG.ENEMY_BULLET_SPEED;
    bullet.active = true;
    bullet.width = CONFIG.BULLET_WIDTH;
    bullet.height = CONFIG.BULLET_HEIGHT;

    if (isPlayer) {
      bullet.vx = 0;
      bullet.vy = -bullet.speed;
    }

    this.active.push(bullet);
    return bullet;
  }

  acquireAngled(x: number, y: number, angle: number, speed?: number, type?: string): Bullet {
    let bullet = this.pool.pop();
    if (!bullet) {
      bullet = this.create();
    }

    const bSpeed = speed ?? CONFIG.ENEMY_BULLET_SPEED;
    const bType = (type as BulletType) || 'straight';
    const size = ENEMY_BULLET_SIZES[type || 'default'] || ENEMY_BULLET_SIZES.default;

    bullet.isPlayer = false;
    bullet.bulletType = bType;
    bullet.speed = bSpeed;
    bullet.active = true;
    bullet.x = x;
    bullet.y = y;
    bullet.vx = Math.cos(angle) * bSpeed;
    bullet.vy = Math.sin(angle) * bSpeed;
    bullet.width = size.w;
    bullet.height = size.h;

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
