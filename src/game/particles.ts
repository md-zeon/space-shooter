import { CONFIG } from './config';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
  active: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private screenShake: number = 0;
  private hitstopTimer: number = 0;
  private flashAlpha: number = 0;
  private flashColor: string = '#FFFFFF';

  constructor() {
    this.preWarm(CONFIG.MAX_PARTICLES);
  }

  private preWarm(count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.create());
    }
  }

  private create(): Particle {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, decay: 0, size: 0,
      color: '', active: false,
    };
  }

  emit(
    x: number,
    y: number,
    count: number,
    color: string,
    options?: {
      speed?: number;
      spread?: number;
      size?: number;
      decay?: number;
      gravity?: number;
    }
  ) {
    const speed = options?.speed ?? CONFIG.PARTICLE_SPEED;
    const spread = options?.spread ?? Math.PI * 2;
    const baseSize = options?.size ?? 2;
    const baseDecay = options?.decay ?? 0.03;
    const gravity = options?.gravity ?? 0;

    for (let i = 0; i < count; i++) {
      let particle = this.particles.find((p) => !p.active);
      if (!particle) {
        if (this.particles.length >= CONFIG.MAX_PARTICLES * 2) continue;
        particle = this.create();
        this.particles.push(particle);
      }

      const angle = Math.random() * spread - spread / 2;
      const velocity = speed * (0.5 + Math.random() * 0.5);

      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity + gravity;
      particle.life = 1;
      particle.decay = baseDecay + Math.random() * 0.02;
      particle.size = baseSize + Math.random() * 2;
      particle.color = color;
      particle.active = true;
    }
  }

  emitExplosion(x: number, y: number, size: number = 1) {
    const count = Math.floor(15 * size);
    this.emit(x, y, count, '#FFFFFF', { speed: 3 * size, size: 3 * size, decay: 0.04 });
    this.emit(x, y, Math.floor(count * 0.7), CONFIG.COLORS.ENEMY, { speed: 2 * size, size: 2 * size, decay: 0.03 });
    this.emit(x, y, Math.floor(count * 0.3), '#FF8800', { speed: 1.5 * size, size: 4 * size, decay: 0.02 });
    this.addShake(size * 5);
  }

  emitBigExplosion(x: number, y: number) {
    this.emitExplosion(x, y, 3);
    this.emit(x, y, 30, '#FF0044', { speed: 5, size: 4, decay: 0.015 });
    this.emit(x, y, 20, '#FF8800', { speed: 6, size: 5, decay: 0.01 });
    this.flash('#FFFFFF', 0.8);
    this.addShake(15);
  }

  addShake(amount: number) {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  addHitstop(frames: number) {
    this.hitstopTimer = Math.max(this.hitstopTimer, frames);
  }

  flash(color: string = '#FFFFFF', alpha: number = 0.5) {
    this.flashColor = color;
    this.flashAlpha = alpha;
  }

  update(deltaTime: number) {
    const dt60 = deltaTime * 60;

    for (const particle of this.particles) {
      if (!particle.active) continue;

      particle.x += particle.vx * dt60;
      particle.y += particle.vy * dt60;
      particle.vy += 0.05 * dt60;
      particle.vx *= 0.98;
      particle.life -= particle.decay * dt60;

      if (particle.life <= 0) {
        particle.active = false;
      }
    }

    this.screenShake *= CONFIG.SHAKE_DECAY;
    if (this.screenShake < 0.5) this.screenShake = 0;

    if (this.hitstopTimer > 0) this.hitstopTimer--;

    if (this.flashAlpha > 0) {
      this.flashAlpha -= 0.05 * dt60;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    for (const particle of this.particles) {
      if (!particle.active) continue;

      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flash overlay
    if (this.flashAlpha > 0) {
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    ctx.restore();
  }

  getShakeOffset(): { x: number; y: number } {
    if (this.screenShake < 0.5) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.screenShake * 2,
      y: (Math.random() - 0.5) * this.screenShake * 2,
    };
  }

  isHitstopped(): boolean {
    return this.hitstopTimer > 0;
  }

  clear() {
    for (const particle of this.particles) {
      particle.active = false;
    }
    this.screenShake = 0;
    this.hitstopTimer = 0;
    this.flashAlpha = 0;
  }
}
