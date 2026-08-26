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
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      decay: 0,
      size: 0,
      color: '',
      active: false,
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
    }
  ) {
    const speed = options?.speed ?? CONFIG.PARTICLE_SPEED;
    const spread = options?.spread ?? Math.PI * 2;
    const baseSize = options?.size ?? 2;
    const baseDecay = options?.decay ?? 0.03;

    for (let i = 0; i < count; i++) {
      let particle = this.particles.find((p) => !p.active);
      if (!particle) {
        particle = this.create();
        this.particles.push(particle);
      }

      const angle = Math.random() * spread - spread / 2;
      const velocity = speed * (0.5 + Math.random() * 0.5);

      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity;
      particle.life = 1;
      particle.decay = baseDecay + Math.random() * 0.02;
      particle.size = baseSize + Math.random() * 2;
      particle.color = color;
      particle.active = true;
    }
  }

  update(deltaTime: number) {
    for (const particle of this.particles) {
      if (!particle.active) continue;

      particle.x += particle.vx * deltaTime * 60;
      particle.y += particle.vy * deltaTime * 60;
      particle.life -= particle.decay * deltaTime * 60;

      if (particle.life <= 0) {
        particle.active = false;
      }
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

    ctx.restore();
  }

  clear() {
    for (const particle of this.particles) {
      particle.active = false;
    }
  }

  getActiveCount(): number {
    return this.particles.filter((p) => p.active).length;
  }
}
