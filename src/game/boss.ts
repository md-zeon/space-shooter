import { CONFIG } from './config';

export type BossPhase = 1 | 2 | 3;
export type BossAttackType = 'radial' | 'aimed_stream' | 'spiral' | 'fan' | 'laser' | 'ring' | 'composite';

export interface BossBulletRequest {
  x: number;
  y: number;
  angle: number;
  speed?: number;
  type?: string;
}

export interface BossState {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  phase: BossPhase;
  active: boolean;
  entering: boolean;
  enteringTimer: number;
  phaseTransitioning: boolean;
  phaseTransitionTimer: number;
  attackTimer: number;
  attackCooldown: number;
  currentAttack: BossAttackType | null;
  attackDuration: number;
  patternTimer: number;
  targetX: number;
  targetY: number;
  moveTimer: number;
  invulnerable: boolean;
  dying: boolean;
  deathTimer: number;
  flashTimer: number;
  name: string;
}

const BOSS_NAMES = ['CIPHER', 'NEXUS', 'VOID', 'OMEGA', 'ABYSS'];

export class BossManager {
  private boss: BossState | null = null;
  private difficulty: number = 1;

  spawnBoss(difficulty: number) {
    this.difficulty = difficulty;
    const name = BOSS_NAMES[Math.min(difficulty - 1, BOSS_NAMES.length - 1)];
    const hp = 50 + difficulty * 30;

    this.boss = {
      x: CONFIG.WIDTH / 2 - CONFIG.BOSS_WIDTH / 2,
      y: -CONFIG.BOSS_HEIGHT,
      width: CONFIG.BOSS_WIDTH,
      height: CONFIG.BOSS_HEIGHT,
      health: hp,
      maxHealth: hp,
      phase: 1,
      active: true,
      entering: true,
      enteringTimer: 2000,
      phaseTransitioning: false,
      phaseTransitionTimer: 0,
      attackTimer: 0,
      attackCooldown: 1500,
      currentAttack: null,
      attackDuration: 0,
      patternTimer: 0,
      targetX: CONFIG.WIDTH / 2 - CONFIG.BOSS_WIDTH / 2,
      targetY: 60,
      moveTimer: 0,
      invulnerable: false,
      dying: false,
      deathTimer: 0,
      flashTimer: 0,
      name,
    };
  }

  update(deltaTime: number, canvasWidth: number, playerX: number): BossBulletRequest[] {
    if (!this.boss || !this.boss.active) return [];
    const requests: BossBulletRequest[] = [];
    const dt60 = deltaTime * 60;

    if (this.boss.dying) {
      this.boss.deathTimer += deltaTime * 1000;
      this.boss.flashTimer += deltaTime * 1000;
      return [];
    }

    if (this.boss.entering) {
      this.boss.enteringTimer -= deltaTime * 1000;
      const progress = 1 - this.boss.enteringTimer / 2000;
      this.boss.y = -CONFIG.BOSS_HEIGHT + (this.boss.targetY + CONFIG.BOSS_HEIGHT) * Math.min(1, progress);
      if (this.boss.enteringTimer <= 0) {
        this.boss.entering = false;
        this.boss.y = this.boss.targetY;
      }
      return [];
    }

    if (this.boss.phaseTransitioning) {
      this.boss.phaseTransitionTimer -= deltaTime * 1000;
      this.boss.flashTimer += deltaTime * 1000;
      if (this.boss.phaseTransitionTimer <= 0) {
        this.boss.phaseTransitioning = false;
        this.boss.invulnerable = false;
        this.boss.attackTimer = 0;
      }
      return [];
    }

    // Movement
    this.boss.moveTimer += deltaTime * 1000;
    if (this.boss.moveTimer > 3000) {
      this.boss.moveTimer = 0;
      this.boss.targetX = 40 + Math.random() * (canvasWidth - this.boss.width - 80);
    }

    const dx = this.boss.targetX - this.boss.x;
    this.boss.x += dx * 0.02 * dt60;
    this.boss.x = Math.max(10, Math.min(canvasWidth - this.boss.width - 10, this.boss.x));

    // Attack timer
    this.boss.attackTimer += deltaTime * 1000;
    this.boss.patternTimer += deltaTime * 1000;

    if (this.boss.attackTimer >= this.boss.attackCooldown && !this.boss.currentAttack) {
      const attacks = this.getAvailableAttacks();
      this.boss.currentAttack = attacks[Math.floor(Math.random() * attacks.length)];
      this.boss.attackDuration = 2000 + Math.random() * 1500;
      this.boss.patternTimer = 0;
      this.boss.attackTimer = 0;
    }

    if (this.boss.currentAttack) {
      this.boss.attackDuration -= deltaTime * 1000;

      const cx = this.boss.x + this.boss.width / 2;
      const cy = this.boss.y + this.boss.height;

      switch (this.boss.currentAttack) {
        case 'radial': {
          const count = this.boss.phase >= 2 ? 16 : 12;
          if (Math.floor(this.boss.patternTimer / 300) > Math.floor((this.boss.patternTimer - deltaTime * 1000) / 300)) {
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2 + this.boss.patternTimer * 0.002;
              requests.push({ x: cx, y: cy, angle, type: 'radial' });
            }
          }
          break;
        }
        case 'aimed_stream': {
          if (Math.floor(this.boss.patternTimer / 200) > Math.floor((this.boss.patternTimer - deltaTime * 1000) / 200)) {
            const angle = Math.atan2(CONFIG.HEIGHT - cy, playerX - cx);
            requests.push({ x: cx, y: cy, angle, type: 'aimed' });
            if (this.boss.phase >= 3) {
              requests.push({ x: cx, y: cy, angle: angle - 0.15, type: 'aimed' });
              requests.push({ x: cx, y: cy, angle: angle + 0.15, type: 'aimed' });
            }
          }
          break;
        }
        case 'spiral': {
          if (Math.floor(this.boss.patternTimer / 80) > Math.floor((this.boss.patternTimer - deltaTime * 1000) / 80)) {
            const arms = this.boss.phase >= 3 ? 3 : 2;
            for (let a = 0; a < arms; a++) {
              const baseAngle = (a / arms) * Math.PI * 2;
              const angle = baseAngle + this.boss.patternTimer * 0.008;
              requests.push({ x: cx, y: cy, angle, type: 'spiral' });
            }
          }
          break;
        }
        case 'fan': {
          if (Math.floor(this.boss.patternTimer / 500) > Math.floor((this.boss.patternTimer - deltaTime * 1000) / 500)) {
            const baseAngle = Math.atan2(CONFIG.HEIGHT - cy, playerX - cx);
            const fanCount = this.boss.phase >= 2 ? 7 : 5;
            const spread = 0.8;
            for (let i = 0; i < fanCount; i++) {
              const t = (i / (fanCount - 1)) - 0.5;
              requests.push({ x: cx, y: cy, angle: baseAngle + t * spread, type: 'fan' });
            }
          }
          break;
        }
        case 'laser': {
          if (this.boss.patternTimer < 500) {
            // Charging - no bullets yet
          } else if (this.boss.patternTimer < 550) {
            if (Math.floor(this.boss.patternTimer / 10) > Math.floor((this.boss.patternTimer - deltaTime * 1000) / 10)) {
              const angle = Math.atan2(CONFIG.HEIGHT - cy, playerX - cx);
              for (let i = -2; i <= 2; i++) {
                requests.push({ x: cx, y: cy, angle: angle + i * 0.02, speed: 8, type: 'laser' });
              }
            }
          }
          break;
        }
        case 'ring': {
          if (Math.floor(this.boss.patternTimer / 400) > Math.floor((this.boss.patternTimer - deltaTime * 1000) / 400)) {
            const count = this.boss.phase >= 2 ? 20 : 14;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2;
              requests.push({ x: cx, y: cy, angle, speed: 3, type: 'ring' });
            }
          }
          break;
        }
        case 'composite': {
          if (Math.floor(this.boss.patternTimer / 200) > Math.floor((this.boss.patternTimer - deltaTime * 1000) / 200)) {
            const angle = Math.atan2(CONFIG.HEIGHT - cy, playerX - cx);
            requests.push({ x: cx, y: cy, angle, type: 'aimed' });
          }
          if (Math.floor(this.boss.patternTimer / 350) > Math.floor((this.boss.patternTimer - deltaTime * 1000) / 350)) {
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2 + this.boss.patternTimer * 0.003;
              requests.push({ x: cx, y: cy, angle: a, type: 'radial' });
            }
          }
          break;
        }
      }

      if (this.boss.attackDuration <= 0) {
        this.boss.currentAttack = null;
        this.boss.attackCooldown = 1000 + Math.random() * 1000;
      }
    }

    return requests;
  }

  private getAvailableAttacks(): BossAttackType[] {
    const attacks: BossAttackType[] = ['radial', 'fan', 'ring'];
    if (this.boss!.phase >= 1) attacks.push('aimed_stream');
    if (this.boss!.phase >= 2) attacks.push('spiral', 'laser');
    if (this.boss!.phase >= 3) attacks.push('composite');
    return attacks;
  }

  takeDamage(amount: number): boolean {
    if (!this.boss || !this.boss.active || this.boss.invulnerable || this.boss.dying || this.boss.entering) return false;

    this.boss.health -= amount;
    this.boss.flashTimer = 0;

    const hpPercent = this.boss.health / this.boss.maxHealth;

    if (hpPercent <= 0) {
      this.boss.dying = true;
      this.boss.deathTimer = 0;
      return true;
    }

    let newPhase: BossPhase = 1;
    if (hpPercent <= 0.33) newPhase = 3;
    else if (hpPercent <= 0.66) newPhase = 2;

    if (newPhase > this.boss.phase) {
      this.boss.phase = newPhase;
      this.boss.phaseTransitioning = true;
      this.boss.phaseTransitionTimer = 1500;
      this.boss.invulnerable = true;
      this.boss.currentAttack = null;
    }

    return false;
  }

  getBoss(): BossState | null {
    return this.boss;
  }

  isBossActive(): boolean {
    return this.boss !== null && this.boss.active && !this.boss.dying;
  }

  isBossDying(): boolean {
    return this.boss !== null && this.boss.dying;
  }

  isBossDefeated(): boolean {
    return this.boss !== null && this.boss.dying && this.boss.deathTimer > 3000;
  }

  clear() {
    this.boss = null;
  }
}
