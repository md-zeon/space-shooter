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
  gravity: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private free: number[] = [];
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
      this.free.push(i);
    }
  }

  /**
   * O(1) slot allocation: pops the most-recently-recycled particle index off the
   * free-stack, or grows the pool (up to the hard cap) when the stack is empty.
   * Returns the particle, or null when the pool is exhausted.
   */
  private nextSlot(): Particle | null {
    const index = this.free.pop();
    if (index !== undefined) return this.particles[index];
    if (this.particles.length >= CONFIG.MAX_PARTICLES * 2) return null;
    const particle = this.create();
    this.particles.push(particle);
    return particle;
  }

  private create(): Particle {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, decay: 0, size: 0,
      color: '', active: false, gravity: 0,
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
      const particle = this.nextSlot();
      if (!particle) continue;

      const angle = Math.random() * spread - spread / 2;
      const velocity = speed * (0.5 + Math.random() * 0.5);

      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity + gravity;
      particle.gravity = gravity;
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

  /**
   * Directional particle burst centered on a base angle (use for speed-lines,
   * directional shatter, implosions, etc.). Complements `emit`, which is a
   * symmetric omni-directional puff.
   */
  private emitBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    baseAngle: number,
    spread: number,
    speed: number,
    size: number,
    decay: number
  ) {
    for (let i = 0; i < count; i++) {
      const particle = this.nextSlot();
      if (!particle) continue;
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const velocity = speed * (0.6 + Math.random() * 0.6);
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity;
      particle.gravity = 0;
      particle.life = 1;
      particle.decay = decay + Math.random() * 0.02;
      particle.size = size + Math.random() * 1.5;
      particle.color = color;
      particle.active = true;
    }
  }

  /**
   * Type-specific enemy death VFX: each archetype dies with a recognizable
   * signature instead of the same generic puff (see the enemy design spec).
   */
  emitTypeDeath(type: string, x: number, y: number) {
    switch (type) {
      case 'basic':
        this.emit(x, y, 6, '#FFFFFF', { speed: 3, size: 2.5, decay: 0.04 });
        this.emit(x, y, 4, CONFIG.COLORS.ENEMY, { speed: 2, size: 2, decay: 0.03 });
        break;

      case 'advanced':
        this.emit(x, y, 10, '#FFFFFF', { speed: 3.4, size: 2.6, decay: 0.035 });
        this.emit(x, y, 6, CONFIG.COLORS.ENEMY_ADVANCED, { speed: 2.5, size: 3, decay: 0.028 });
        this.emit(x, y, 8, '#00F0FF', { speed: 1.5, size: 2, decay: 0.022 });
        break;

      case 'elite':
      case 'leader':
        this.emitExplosion(x, y, 1.6);
        this.emit(x, y, 14, '#FF8800', { speed: 2, size: 4, decay: 0.016 });
        this.flash('#FFFFFF', 0.15);
        this.addShake(8);
        break;

      case 'wall':
        // Barricade collapse: chunky blocks tumble down.
        for (let i = 0; i < 8; i++) {
          this.emit(x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 40, 1, CONFIG.COLORS.ENEMY_WALL,
            { speed: 1.8 + Math.random() * 1.5, size: 4 + Math.random() * 3, decay: 0.02, gravity: 0.25 });
        }
        break;

      case 'splinterer':
        // Cracked-split frame before the shrapnel detonates.
        this.emit(x, y, 12, CONFIG.COLORS.ENEMY_SPLINTERER, { speed: 2.5, size: 2.5, decay: 0.03 });
        this.emit(x, y, 6, CONFIG.COLORS.ENEMY_SPLINTERER_SHARD, { speed: 3.5, size: 2, decay: 0.025 });
        break;

      case 'rusher':
        // Burn-out speed-lines along its dive axis.
        this.emitBurst(x, y, 10, CONFIG.COLORS.ENEMY_RUSHER, Math.PI / 2, 0.5, 6, 2.4, 0.03);
        this.emit(x, y, 5, '#FFFFFF', { speed: 3, size: 2.4, decay: 0.035 });
        break;

      case 'homer':
      case 'mirror':
      case 'mirrorcopy':
        // Shatter: the body snaps into jagged shards (no round puff).
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
          const color = type === 'mirrorcopy' ? CONFIG.COLORS.ENEMY_MIRRORCOPY : CONFIG.COLORS.ENEMY_MIRROR;
          this.emitBurst(x, y, 1, color, a, 0.4, 2.5 + Math.random() * 2, 2.6, 0.028);
        }
        this.emit(x, y, 4, '#FFFFFF', { speed: 2.5, size: 1.6, decay: 0.04 });
        break;

      case 'healer':
        // Soft heal-pulse dissipating — fades, no violent boom.
        this.emit(x, y, 16, CONFIG.COLORS.ENEMY_HEALER, { speed: 1.4, size: 2.4, decay: 0.018 });
        break;

      case 'teleporter':
        // Blink-out: warm shimmer with an echo silhouette.
        this.emit(x, y, 12, CONFIG.COLORS.ENEMY_TELEPORTER, { speed: 1.8, size: 2.2, decay: 0.02 });
        this.flash(CONFIG.COLORS.ENEMY_TELEPORTER_TELEGRAPH, 0.12);
        break;

      case 'attractor':
        // Implosion: shards drawn inward then collapse.
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
          this.emitBurst(x, y, 1, CONFIG.COLORS.ENEMY_ATTRACTOR, a, 0.5, 2 + Math.random() * 1.5, 3, 0.02);
        }
        break;

      case 'terrain':
        // Heavy debris jumble (rock chunks), no bright core.
        for (let i = 0; i < 8; i++) {
          this.emit(x + (Math.random() - 0.5) * 26, y + (Math.random() - 0.5) * 26, 1, CONFIG.COLORS.ENEMY_TERRAIN,
            { speed: 1.8 + Math.random() * 1.6, size: 3.5 + Math.random() * 2.5, decay: 0.02, gravity: 0.2 });
        }
        break;

      case 'turret':
        // Spark + smoke column, brief re-fire flash.
        for (let i = 0; i < 10; i++) {
          this.emitBurst(x, y + Math.random() * 20, 1, CONFIG.COLORS.ENEMY_TURRET, -Math.PI / 2, 0.6,
            3 + Math.random() * 2, 2.4, 0.03);
        }
        this.emit(x, y, 6, CONFIG.COLORS.ENEMY_TURRET_CHARGE, { speed: 1.8, size: 3, decay: 0.02 });
        this.addShake(4);
        break;

      case 'reflector':
        // Mirror-shatter: cold blue-white shards, brief flash.
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
          this.emitBurst(x, y, 1, CONFIG.COLORS.ENEMY_REFLECTOR_ACTIVE, a, 0.4, 2.6 + Math.random() * 2, 2.4, 0.026);
        }
        this.flash('#FFFFFF', 0.12);
        break;

      default:
        this.emitExplosion(x, y, 0.8);
        break;
    }
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

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (!particle.active) continue;

      particle.x += particle.vx * dt60;
      particle.y += particle.vy * dt60;
      particle.vy += particle.gravity * dt60;
      particle.vx *= 0.98;
      particle.life -= particle.decay * dt60;

      if (particle.life <= 0) {
        particle.active = false;
        this.free.push(i);
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
    this.free = [];
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this.free.push(i);
    }
    this.screenShake = 0;
    this.hitstopTimer = 0;
    this.flashAlpha = 0;
  }
}
