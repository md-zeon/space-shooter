import { CONFIG } from './config';

export type BulletType = 'player' | 'straight' | 'aimed' | 'spread' | 'radial' | 'spiral' | 'burst' | 'fan' | 'ring' | 'laser' | 'shockwave' | 'soundwave';

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
  default: { w: 6, h: 6 },
  aimed: { w: 5, h: 8 },
  spread: { w: 6, h: 6 },
  radial: { w: 6, h: 6 },
  spiral: { w: 7, h: 7 },
  burst: { w: 5, h: 7 },
  fan: { w: 6, h: 6 },
  ring: { w: 5, h: 5 },
  laser: { w: 3, h: 14 },
  shockwave: { w: 9, h: 9 },
  soundwave: { w: 60, h: 10 },
};

export class BulletPool {
  private static readonly SENTINEL: Bullet = { x: 0, y: 0, width: 0, height: 0, speed: 0, vx: 0, vy: 0, isPlayer: false, active: false, bulletType: 'straight' };
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
    bullet.width = isPlayer ? CONFIG.BULLET_WIDTH : CONFIG.ENEMY_BULLET_WIDTH;
    bullet.height = isPlayer ? CONFIG.BULLET_HEIGHT : CONFIG.ENEMY_BULLET_HEIGHT;

    if (isPlayer) {
      bullet.vx = 0;
      bullet.vy = -bullet.speed;
    }

    this.active.push(bullet);
    return bullet;
  }

  acquireAngled(x: number, y: number, angle: number, speed?: number, type?: string): Bullet {
    // Cap enemy bullets on screen. When at capacity, skip spawning rather than
    // growing the pool unbounded — the most visually dense patterns (the boss
    // "sun" shockwave) must never tank mobile frame rate.
    if (this.active.length >= CONFIG.MAX_ENEMY_BULLETS) {
      return BulletPool.SENTINEL;
    }

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
      this.pool.push(bullet);
    }
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number) {
    const dt60 = deltaTime * 60;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const bullet = this.active[i];
      if (!bullet.active) continue;

      bullet.x += bullet.vx * dt60;
      bullet.y += bullet.vy * dt60;

      // Remove if off screen
      if (bullet.y < -bullet.height || bullet.y > canvasHeight + bullet.height ||
          bullet.x < -bullet.width - 10 || bullet.x > canvasWidth + 10) {
        this.release(bullet);
      }
    }
  }

  getActive(): Bullet[] {
    return this.active;
  }

  clear() {
    while (this.active.length > 0) {
      this.pool.push(this.active.pop()!);
    }
  }
}
