import { CONFIG } from './config';

export type BossPhase = 1 | 2 | 3;
export type BossAttackType = 'radial' | 'aimed_stream' | 'spiral' | 'fan' | 'laser' | 'ring' | 'composite' | 'shockwave' | 'soundwave';
export type BossId = 'cipher' | 'spider' | 'turrets' | 'omega' | 'abyss';
export type MinionType = 'basic' | 'shooter' | 'shield' | 'rusher';

export interface BossBulletRequest {
  x: number;
  y: number;
  angle: number;
  speed?: number;
  type?: string;
}

export interface BossMinion {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  type: MinionType;
  active: boolean;
  patternTimer: number;
  orbitAngle: number;
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
  coreOpen: boolean;
  coreCycleTimer: number;
  legPhase: number;
  name: string;
  bossId: BossId;
  color: string;
  minionSpawnTimer: number;
  minions: BossMinion[];
}

interface BossDef {
  id: BossId;
  name: string;
  width: number;
  height: number;
  color: string;
  baseHp: number;
  speed: number;
  targetY: number;
  attacks: BossAttackType[];
  minionTypes: MinionType[];
  minionCount: number;
  minionInterval: number;
}

const BOSS_DEFS: BossDef[] = [
  {
    id: 'cipher', name: 'CIPHER', width: 60, height: 60,
    color: CONFIG.COLORS.BOSS_CIPHER, baseHp: 80, speed: 2.5, targetY: 60,
    attacks: ['radial', 'aimed_stream', 'shockwave'],
    minionTypes: ['basic'], minionCount: 2, minionInterval: 6000,
  },
  {
    id: 'spider', name: 'SPIDER', width: 90, height: 70,
    color: CONFIG.COLORS.BOSS_SPIDER, baseHp: 100, speed: 2.2, targetY: 55,
    attacks: ['aimed_stream', 'fan', 'radial', 'shockwave'],
    minionTypes: ['rusher'], minionCount: 3, minionInterval: 4500,
  },
  {
    id: 'turrets', name: 'TURRET-CRUISER', width: 120, height: 80,
    color: CONFIG.COLORS.BOSS_TURRET, baseHp: 200, speed: 1.2, targetY: 50,
    attacks: ['fan', 'laser', 'shockwave', 'radial'],
    minionTypes: ['shield', 'shooter'], minionCount: 3, minionInterval: 4000,
  },
  {
    id: 'omega', name: 'OMEGA', width: 110, height: 80,
    color: CONFIG.COLORS.BOSS_OMEGA, baseHp: 220, speed: 0.5, targetY: 50,
    attacks: ['laser', 'ring', 'fan', 'soundwave'],
    minionTypes: ['shield'], minionCount: 2, minionInterval: 7000,
  },
  {
    id: 'abyss', name: 'ABYSS', width: 100, height: 100,
    color: CONFIG.COLORS.BOSS_ABYSS, baseHp: 300, speed: 1.5, targetY: 60,
    attacks: ['radial', 'aimed_stream', 'spiral', 'fan', 'laser', 'ring', 'composite', 'shockwave', 'soundwave'],
    minionTypes: ['basic', 'shooter', 'shield'], minionCount: 3, minionInterval: 3500,
  },
];

export class BossManager {
  private boss: BossState | null = null;
  private difficulty: number = 1;
  private waveNumber: number = 0;

  spawnBoss(difficulty: number, waveNumber: number) {
    this.difficulty = difficulty;
    this.waveNumber = waveNumber;

    const bossIndex = Math.min(Math.floor((waveNumber - 1) / 10), BOSS_DEFS.length - 1);
    const def = BOSS_DEFS[bossIndex];
    const hp = def.baseHp + difficulty * 25;

    this.boss = {
      x: CONFIG.WIDTH / 2 - def.width / 2,
      y: -def.height,
      width: def.width,
      height: def.height,
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
      targetX: CONFIG.WIDTH / 2 - def.width / 2,
      targetY: def.targetY,
      moveTimer: 0,
      invulnerable: false,
      dying: false,
      deathTimer: 0,
      flashTimer: 0,
      coreOpen: def.id !== 'turrets',
      coreCycleTimer: 0,
      legPhase: 0,
      name: def.name,
      bossId: def.id,
      color: def.color,
      minionSpawnTimer: 3000,
      minions: [],
    };
  }

  update(deltaTime: number, canvasWidth: number, playerX: number): BossBulletRequest[] {
    if (!this.boss || !this.boss.active) return [];
    const requests: BossBulletRequest[] = [];
    const dt60 = deltaTime * 60;

    if (this.boss.dying) {
      this.boss.deathTimer += deltaTime * 1000;
      this.boss.flashTimer += deltaTime * 1000;
      this.updateMinions(deltaTime, canvasWidth, playerX);
      return [];
    }

    if (this.boss.entering) {
      this.boss.enteringTimer -= deltaTime * 1000;
      const progress = 1 - this.boss.enteringTimer / 2000;
      this.boss.y = -this.boss.height + (this.boss.targetY + this.boss.height) * Math.min(1, progress);
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

    const bossDef = BOSS_DEFS[Math.min(
      Math.floor((this.waveNumber - 1) / 10),
      BOSS_DEFS.length - 1
    )];

    this.updateCoreState(deltaTime);
    this.updateMovement(deltaTime, canvasWidth, bossDef);
    requests.push(...this.updateAttacks(deltaTime, canvasWidth, playerX, bossDef));
    this.updateMinionSpawning(deltaTime);
    this.updateMinions(deltaTime, canvasWidth, playerX);

    return requests;
  }

  /**
   * Keep the boss's weak point (core) state in sync.
   *  - Turret-Cruiser: the outer turret RING (shield minions) is the shield —
   *    destroy every ring turret to expose the core ("the ring is the minions;
   *    core exposed"). New ring turrets re-close it.
   *  - Spider: the belly-core is a TIMED CYCLE — it opens so the player can
   *    deal damage, then closes while the spider steps and volleys, then opens
   *    again. Phase 1 teaches (always open); phase 2+ cycles closed->open.
   */
  private updateCoreState(deltaTime: number) {
    if (!this.boss) return;

    if (this.boss.bossId === 'turrets') {
      // Outer ring present == core sealed. Ring gone == core exposed.
      const ringAlive = this.boss.minions.some(m => m.active && m.type === 'shield');
      this.boss.coreOpen = !ringAlive;
      return;
    }

    if (this.boss.bossId === 'spider') {
      if (this.boss.phase === 1) {
        // Phase A teaches "shoot the core": stays open.
        this.boss.coreOpen = true;
        this.boss.coreCycleTimer = 0;
        return;
      }
      // Phase B/C: timed close-then-open cycle so the player always gets a
      // window to damage (the belly-core reopens; spider focuses on dodging).
      const closedDuration = 1800;
      const openDuration = 2200;
      this.boss.coreCycleTimer += deltaTime * 1000;
      const cycle = closedDuration + openDuration;
      const t = this.boss.coreCycleTimer % cycle;
      this.boss.coreOpen = t >= closedDuration;
      // Skip the cycle while transitioning so it feels gentle.
      if (this.boss.phaseTransitioning) this.boss.coreOpen = true;
      return;
    }

    // All other bosses: always damageable (core stays exposed).
    this.boss.coreOpen = true;
  }

  private updateMovement(deltaTime: number, canvasWidth: number, def: BossDef) {
    if (!this.boss) return;
    const dt60 = deltaTime * 60;
    this.boss.moveTimer += deltaTime * 1000;

    switch (def.id) {
      case 'cipher':
        if (this.boss.moveTimer > 1500) {
          this.boss.moveTimer = 0;
          this.boss.targetX = 40 + Math.random() * (canvasWidth - this.boss.width - 80);
        }
        break;
      case 'spider':
        // Steps side to side — frequent lateral repositioning (the "stepping-limb" roamer).
        if (this.boss.moveTimer > 1100) {
          this.boss.moveTimer = 0;
          this.boss.targetX = 40 + Math.random() * (canvasWidth - this.boss.width - 80);
          this.boss.legPhase += 1;
        }
        break;
      case 'turrets':
        // Slow side-to-side cruiser drift — the outer turret ring does the work.
        if (this.boss.moveTimer > 3600) {
          this.boss.moveTimer = 0;
          this.boss.targetX = canvasWidth / 2 - this.boss.width / 2 + (Math.random() - 0.5) * 160;
        }
        break;
      case 'omega':
        if (this.boss.moveTimer > 5000) {
          this.boss.moveTimer = 0;
          this.boss.targetX = canvasWidth / 2 - this.boss.width / 2 + (Math.random() - 0.5) * 60;
        }
        break;
      case 'abyss': {
        const orbitSpeed = 0.001;
        const angle = this.boss.moveTimer * orbitSpeed;
        const orbitRadius = 80;
        this.boss.x = canvasWidth / 2 - this.boss.width / 2 + Math.cos(angle) * orbitRadius;
        this.boss.y = this.boss.targetY + Math.sin(angle * 0.5) * 20;
        return;
      }
    }

    const dx = this.boss.targetX - this.boss.x;
    this.boss.x += dx * 0.02 * dt60 * def.speed;
    this.boss.x = Math.max(10, Math.min(canvasWidth - this.boss.width - 10, this.boss.x));
  }

  private updateAttacks(
    deltaTime: number,
    canvasWidth: number,
    playerX: number,
    def: BossDef
  ): BossBulletRequest[] {
    if (!this.boss) return [];
    const requests: BossBulletRequest[] = [];

    this.boss.attackTimer += deltaTime * 1000;
    this.boss.patternTimer += deltaTime * 1000;

    if (this.boss.attackTimer >= this.boss.attackCooldown && !this.boss.currentAttack) {
      const attacks = this.getAvailableAttacks(def);
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
            // Charging
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
        case 'shockwave': {
          // Expanding concentric rings (slow) — dodge by reading the gaps between
          // rings rather than outrunning the whole nova.
          if (Math.floor(this.boss.patternTimer / 600) > Math.floor((this.boss.patternTimer - deltaTime * 1000) / 600)) {
            const rings = this.boss.phase >= 3 ? 3 : this.boss.phase >= 2 ? 2 : 1;
            const count = this.boss.phase >= 2 ? 24 : 16;
            const ringGap = 0.18;
            for (let ring = 0; ring < rings; ring++) {
              for (let i = 0; i < count; i++) {
                const base = (i / count) * Math.PI * 2 + ring * ringGap;
                requests.push({ x: cx, y: cy, angle: base, speed: 1.6 + ring * 0.4, type: 'shockwave' });
              }
            }
          }
          break;
        }
        case 'soundwave': {
          // Telegraphed full-arena pulse: a long no-fire wind-up, then a slow
          // wide wavefront descends — a single timing-dodge.
          if (this.boss.patternTimer < 700) {
            // Wind-up / charge telegraph (no bullets yet)
          } else if (Math.floor(this.boss.patternTimer / 500) > Math.floor((this.boss.patternTimer - deltaTime * 1000) / 500)) {
            requests.push({ x: CONFIG.WIDTH / 2, y: cy, angle: Math.PI / 2, speed: this.boss.phase >= 2 ? 2.6 : 2.2, type: 'soundwave' });
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

  private getAvailableAttacks(def: BossDef): BossAttackType[] {
    if (!this.boss) return ['radial'];
    const phaseAttacks = def.attacks.filter(a => {
      if (a === 'aimed_stream' || a === 'spiral') return this.boss!.phase >= 1;
      if (a === 'composite') return this.boss!.phase >= 2;
      // Laser sweeps unlock at phase 2 (the turret-cruiser's hull-laser phase,
      // after the outer-ring assault) — never in the opener pattern.
      if (a === 'laser') return this.boss!.phase >= 2;
      return true;
    });
    return phaseAttacks.length > 0 ? phaseAttacks : ['radial'];
  }

  private updateMinionSpawning(deltaTime: number) {
    if (!this.boss || this.boss.phaseTransitioning || this.boss.entering) return;
    const bossDef = BOSS_DEFS[Math.min(
      Math.floor((this.waveNumber - 1) / 10),
      BOSS_DEFS.length - 1
    )];

    this.boss.minionSpawnTimer -= deltaTime * 1000;
    if (this.boss.minionSpawnTimer <= 0 && this.boss.minions.length < CONFIG.MAX_BOSS_MINIONS) {
      const count = Math.min(
        bossDef.minionCount + (this.boss.phase - 1),
        CONFIG.MAX_BOSS_MINIONS - this.boss.minions.length
      );
      for (let i = 0; i < count; i++) {
        const type = bossDef.minionTypes[Math.floor(Math.random() * bossDef.minionTypes.length)];
        this.spawnMinion(type);
      }
      this.boss.minionSpawnTimer = bossDef.minionInterval;
    }
  }

  private spawnMinion(type: MinionType) {
    if (!this.boss) return;
    const health = type === 'shield' ? 3 : type === 'shooter' || type === 'rusher' ? 2 : 1;
    const width = type === 'shield' ? 25 : 20;
    const height = type === 'shield' ? 25 : 20;

    this.boss.minions.push({
      x: this.boss.x + Math.random() * (this.boss.width - width),
      y: this.boss.y + this.boss.height,
      width,
      height,
      health,
      maxHealth: health,
      type,
      active: true,
      patternTimer: Math.random() * 1000,
      orbitAngle: Math.random() * Math.PI * 2,
    });
  }

  private updateMinions(deltaTime: number, canvasWidth: number, playerX: number) {
    if (!this.boss) return;
    const dt60 = deltaTime * 60;

    for (let i = this.boss.minions.length - 1; i >= 0; i--) {
      const m = this.boss.minions[i];
      if (!m.active) {
        this.boss.minions.splice(i, 1);
        continue;
      }

      m.patternTimer += deltaTime * 1000;

      switch (m.type) {
        case 'basic':
          m.y += 1.5 * dt60;
          if (m.y > CONFIG.HEIGHT + 30) m.active = false;
          break;

        case 'rusher':
          // Dive-rusher: descends fast from the top along its column (runs the walls).
          m.y += 5 * dt60;
          if (m.y > CONFIG.HEIGHT + 30) m.active = false;
          break;

        case 'shooter': {
          const targetY = 100 + Math.sin(m.patternTimer * 0.001) * 30;
          if (m.y < targetY) {
            m.y += 1 * dt60;
          } else {
            m.x += Math.sin(m.patternTimer * 0.002) * 1;
          }
          m.x = Math.max(0, Math.min(canvasWidth - m.width, m.x));
          break;
        }

        case 'shield': {
          if (this.boss) {
            m.orbitAngle += 0.02 * dt60;
            const cx = this.boss.x + this.boss.width / 2;
            const cy = this.boss.y + this.boss.height / 2;
            const orbitRadius = this.boss.width * 0.8;
            m.x = cx + Math.cos(m.orbitAngle) * orbitRadius - m.width / 2;
            m.y = cy + Math.sin(m.orbitAngle) * orbitRadius * 0.5 - m.height / 2;
          }
          break;
        }
      }
    }
  }

  takeDamage(amount: number): boolean {
    if (!this.boss || !this.boss.active || this.boss.invulnerable || this.boss.dying || this.boss.entering) return false;
    if (this.boss.bossId === 'spider' && !this.boss.coreOpen) return false;
    if (this.boss.bossId === 'turrets' && !this.boss.coreOpen) return false;

    this.boss.health -= amount;
    this.boss.flashTimer = 100;

    const hpPercent = this.boss.health / this.boss.maxHealth;

    if (hpPercent <= 0) {
      this.boss.dying = true;
      this.boss.deathTimer = 0;
      for (const m of this.boss.minions) m.active = false;
      return true;
    }

    let newPhase: BossPhase = 1;
    if (hpPercent <= 0.33) newPhase = 3;
    else if (hpPercent <= 0.66) newPhase = 2;

    if (newPhase > this.boss.phase) {
      this.boss.phase = newPhase;
      // Reset spider's core cycle so the next open/close cycle restarts cleanly.
      this.boss.coreCycleTimer = 0;
      // The core-open flag is owned by updateCoreState (turrets: destroy the
      // ring; spider: timed cycle). Just pause briefly for the reveal.
      this.boss.phaseTransitioning = true;
      this.boss.phaseTransitionTimer = 1500;
      this.boss.invulnerable = true;
      this.boss.currentAttack = null;
    }

    return false;
  }

  takeMinionDamage(minion: BossMinion, amount: number): boolean {
    minion.health -= amount;
    if (minion.health <= 0) {
      minion.active = false;
      return true;
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
