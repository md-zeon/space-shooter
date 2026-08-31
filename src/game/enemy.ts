import { CONFIG } from './config';

export type EnemyType = 'basic' | 'advanced' | 'elite' | 'wall' | 'splinterer' | 'rusher' | 'homer' | 'mirror' | 'mirrorcopy' | 'healer' | 'leader' | 'teleporter' | 'attractor' | 'terrain';

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  health: number;
  maxHealth: number;
  type: EnemyType;
  active: boolean;
  shootTimer: number;
  patternTimer: number;
  movementPattern: string;
  shootPattern: string;
  originX: number;
  flashTimer: number;
  spawnX: number;
  formationId: number;
  offsetX: number;
  offsetY: number;
  aimShards: boolean;
  shieldHp: number;
  heading: number;
  isReward: boolean;
  hidden: boolean;
  telegraphing: boolean;
  gravityStrength: number;
  gravityRadius: number;
  indestructible: boolean;
  explosive: boolean;
  lifespan: number;
}

/** A tile of an enemy that must be stripped (shield/armor) before core damage. */

export interface EnemyBulletRequest {
  x: number;
  y: number;
  angle: number;
  speed?: number;
  type?: string;
}

interface FormationOrigin {
  x: number;
  y: number;
  speed: number;
  movementPattern: string;
  patternTimer: number;
  canvasWidth: number;
  retreatTimer: number;
  retreating: boolean;
  retreatSpeed: number;
}

export class EnemyManager {
  private enemies: Enemy[] = [];
  private difficulty: number = 1;
  private playerX: number = CONFIG.WIDTH / 2;
  private playerY: number = CONFIG.HEIGHT - 60;
  private formationOrigins: Map<number, FormationOrigin> = new Map();

  setPlayerPosition(x: number, y: number) {
    this.playerX = x;
    this.playerY = y;
  }

  spawnEnemy(
    type: EnemyType,
    x: number,
    y: number,
    speed: number,
    movementPattern: string,
    shootPattern: string,
    formationId: number = -1,
    offsetX: number = 0,
    offsetY: number = 0,
    hp?: number,
    aimShards: boolean = false,
    shieldHp?: number,
    isReward: boolean = false,
    spawnHidden: boolean = false,
    indestructible: boolean = false,
    explosive: boolean = false
  ) {
    const isWall = type === 'wall';
    const isSplinterer = type === 'splinterer';
    const isRusher = type === 'rusher';
    const isHomer = type === 'homer';
    const isAttractor = type === 'attractor';
    const isTerrain = type === 'terrain';
    const health = hp ?? (isWall ? 3 : type === 'elite' ? 4 : type === 'leader' ? 4 : type === 'advanced' ? 2 : type === 'mirror' ? 2 : type === 'healer' ? 1 : isSplinterer ? 1 : isAttractor ? 3 : isTerrain ? 3 : 1);
    this.enemies.push({
      x, y,
      width: isWall ? 30 : isAttractor ? 40 : isTerrain ? 38 : type === 'elite' ? 35 : type === 'leader' ? 35 : isRusher ? 26 : isHomer ? 26 : CONFIG.ENEMY_WIDTH,
      height: isWall ? 80 : isAttractor ? 40 : isTerrain ? 38 : type === 'elite' ? 35 : type === 'leader' ? 35 : isRusher ? 26 : isHomer ? 26 : CONFIG.ENEMY_HEIGHT,
      speed,
      health,
      maxHealth: health,
      type,
      active: true,
      shootTimer: Math.random() * 1000,
      patternTimer: 0,
      movementPattern,
      shootPattern,
      originX: x,
      flashTimer: 0,
      spawnX: x,
      formationId,
      offsetX,
      offsetY,
      aimShards,
      shieldHp: shieldHp ?? 0,
      heading: Math.PI / 2,
      isReward,
      hidden: spawnHidden,
      telegraphing: false,
      gravityStrength: isAttractor ? 1 : 0,
      gravityRadius: isAttractor ? 150 : 0,
      indestructible,
      explosive,
      lifespan: indestructible ? 9000 : -1,
    });

    if (formationId >= 0 && !this.formationOrigins.has(formationId)) {
      this.formationOrigins.set(formationId, {
        x,
        y,
        speed,
        movementPattern,
        patternTimer: 0,
        canvasWidth: CONFIG.WIDTH,
        retreatTimer: 0,
        retreating: false,
        retreatSpeed: 0,
      });
    }
  }

  private updateFormationOrigin(origin: FormationOrigin, deltaTime: number) {
    const dt60 = deltaTime * 60;
    origin.patternTimer += deltaTime * 1000;
    const speed = origin.speed * dt60;

    if (origin.retreating) {
      origin.y -= origin.retreatSpeed * dt60;
      origin.retreatSpeed += 0.15 * dt60;
      return;
    }

    switch (origin.movementPattern) {
      case 'straight':
        origin.y += speed;
        break;

      case 'sinewave':
        origin.y += speed * 0.8;
        origin.x += Math.sin(origin.patternTimer * 0.003) * 1.5;
        break;

      case 'zigzag': {
        const zigPeriod = 2000;
        const phase = (origin.patternTimer % zigPeriod) / zigPeriod;
        if (phase < 0.5) {
          origin.x += speed * 1.2;
        } else {
          origin.x -= speed * 1.2;
        }
        origin.y += speed * 0.5;
        break;
      }

      case 'hover': {
        const hoverY = 80 + Math.sin(origin.patternTimer * 0.001) * 20;
        if (origin.y < hoverY) {
          origin.y += speed * 0.6;
        } else {
          origin.x += Math.sin(origin.patternTimer * 0.002) * 2;
          origin.retreatTimer += deltaTime * 1000;
          if (origin.retreatTimer > 8000) {
            origin.retreating = true;
            origin.retreatSpeed = 1;
          }
        }
        origin.y += Math.sin(origin.patternTimer * 0.001) * 0.5;
        break;
      }

      case 'reposition': {
        const targetY = 100;
        if (origin.y < targetY) {
          origin.y += speed;
        } else {
          origin.x += Math.sin(origin.patternTimer * 0.001) * 1.5;
          origin.retreatTimer += deltaTime * 1000;
          if (origin.retreatTimer > 10000) {
            origin.retreating = true;
            origin.retreatSpeed = 1;
          }
        }
        break;
      }

      case 'dash': {
        if (origin.patternTimer < 500) {
          origin.y += speed * 0.3;
        } else if (origin.patternTimer < 800) {
          origin.y += speed * 4;
        } else if (origin.patternTimer > 2000) {
          origin.patternTimer = 0;
        }
        break;
      }

      case 'swoop': {
        const swoopT = origin.patternTimer * 0.002;
        origin.x += Math.cos(swoopT) * speed * 0.8;
        origin.y += speed * 0.7;
        break;
      }

      case 'rusher': {
        // Dive-rusher: fast straight dive down its column (wall-runner).
        origin.y += speed * 2.4;
        break;
      }

      case 'homing':
        origin.y += speed * 0.8;
        break;

      case 'ambush':
        if (origin.patternTimer < 1700) {
          origin.y -= speed;
        } else {
          origin.y += speed * 1.5;
        }
        break;

      case 'support':
        if (origin.y < 60) {
          origin.y += speed * 0.5;
        } else if (origin.y > 60) {
          origin.y -= speed * 0.4;
        } else {
          origin.x += Math.sin(origin.patternTimer * 0.002) * 1.5;
        }
        break;

      case 'teleport': {
        if (origin.patternTimer > 3000) {
          origin.x = 30 + Math.random() * (origin.canvasWidth - 60);
          origin.patternTimer = 0;
        }
        origin.y += speed * 0.4;
        break;
      }

      default:
        origin.y += speed;
    }

    if (origin.movementPattern === 'hover' || origin.movementPattern === 'reposition' || origin.movementPattern === 'zigzag') {
      if (origin.x < 10) origin.x = 10;
      if (origin.x > origin.canvasWidth - 90) origin.x = origin.canvasWidth - 90;
    }
  }

  private turnToward(current: number, target: number, maxTurn: number): number {
    let diff = target - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = Math.max(-maxTurn, Math.min(maxTurn, diff * 0.25));
    return current + turn;
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): EnemyBulletRequest[] {
    const bulletRequests: EnemyBulletRequest[] = [];
    const dt60 = deltaTime * 60;

    for (const origin of this.formationOrigins.values()) {
      origin.canvasWidth = canvasWidth;
      this.updateFormationOrigin(origin, deltaTime);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.active) {
        this.remove(enemy);
        continue;
      }

      enemy.patternTimer += deltaTime * 1000;
      enemy.shootTimer += deltaTime * 1000;
      if (enemy.flashTimer > 0) enemy.flashTimer -= deltaTime * 1000;

      if (enemy.formationId >= 0) {
        const origin = this.formationOrigins.get(enemy.formationId);
        if (origin) {
          enemy.x = Math.max(0, Math.min(CONFIG.WIDTH - enemy.width, origin.x + enemy.offsetX));
          enemy.y = origin.y + enemy.offsetY;
        }
      } else {
        const speed = enemy.speed * dt60;

        switch (enemy.movementPattern) {
          case 'straight':
            enemy.y += speed;
            break;

          case 'sinewave':
            enemy.y += speed * 0.8;
            enemy.x = enemy.originX + Math.sin(enemy.patternTimer * 0.003) * 40;
            break;

          case 'zigzag': {
            const zigPeriod = 2000;
            const phase = (enemy.patternTimer % zigPeriod) / zigPeriod;
            if (phase < 0.5) {
              enemy.x += speed * 1.2;
            } else {
              enemy.x -= speed * 1.2;
            }
            enemy.y += speed * 0.5;
            break;
          }

          case 'hover': {
            const hoverY = 80 + Math.sin(enemy.patternTimer * 0.001) * 20;
            if (enemy.y < hoverY) {
              enemy.y += speed * 0.6;
            } else {
              enemy.x += Math.sin(enemy.patternTimer * 0.002) * 2;
            }
            enemy.y += Math.sin(enemy.patternTimer * 0.001) * 0.5;
            break;
          }

          case 'dash': {
            if (enemy.patternTimer < 500) {
              enemy.y += speed * 0.3;
            } else if (enemy.patternTimer < 800) {
              enemy.y += speed * 4;
            } else if (enemy.patternTimer > 2000) {
              enemy.patternTimer = 0;
            }
            break;
          }

          case 'swoop': {
            const swoopT = enemy.patternTimer * 0.002;
            enemy.x = enemy.spawnX + Math.sin(swoopT) * 80;
            enemy.y += speed * 0.7;
            break;
          }

          case 'teleport': {
            if (enemy.patternTimer > 3000) {
              enemy.x = 30 + Math.random() * (canvasWidth - 60);
              enemy.patternTimer = 0;
              enemy.flashTimer = 300;
            }
            enemy.y += speed * 0.4;
            break;
          }

          case 'reposition': {
            if (enemy.y < 100) {
              enemy.y += speed;
            } else {
              enemy.x += Math.sin(enemy.patternTimer * 0.001) * 1.5;
            }
            break;
          }

          case 'wall': {
            // Barricade: descends slowly, parks for a beat, then sinks off.
            if (enemy.patternTimer < 1200) {
              enemy.y += speed * 0.5;
            } else if (enemy.patternTimer < 5200) {
              // parked — no vertical movement
            } else {
              enemy.y += speed * 1.6;
            }
            break;
          }

          case 'wallRhythm': {
            // Wall that lowers and raises in rhythm: descends to a park, then
            // pumps vertically so the gap opens briefly (grunts dive through it).
            if (enemy.patternTimer < 1200) {
              enemy.y += speed * 0.6;
            } else {
              const cycle = 2200;
              const t = (enemy.patternTimer - 1200) % cycle;
              // Sinks then rises on a sine — creates a breathing low/high cycle.
              enemy.y += Math.sin((t / cycle) * Math.PI * 2) * 0.6 * speed;
            }
            break;
          }

          case 'rusher': {
            // Dive-rusher: fast straight dive down its column (wall-runner).
            enemy.y += speed * 2.4;
            break;
          }

          case 'homing': {
            // Reactive homer: partial home with a bounded turn rate, so it is
            // STEERABLE (bait it into clean space) rather than a guaranteed hit.
            const desired = Math.atan2(
              this.playerY - (enemy.y + enemy.height / 2),
              this.playerX - (enemy.x + enemy.width / 2)
            );
            enemy.heading = this.turnToward(enemy.heading, desired, 0.12);
            enemy.x += Math.cos(enemy.heading) * speed;
            enemy.y += Math.sin(enemy.heading) * speed;
            break;
          }

          case 'ambush': {
            // Bottom-entry ambush: rises from below the screen for a beat, then
            // swings down AND toward the player for a diving attack.
            const riseTime = 1700;
            if (enemy.patternTimer < riseTime) {
              enemy.y -= speed;
            } else {
              enemy.y += speed * 1.5;
              const dx = this.playerX - (enemy.x + enemy.width / 2);
              enemy.x += Math.sign(dx) * Math.min(Math.abs(dx) * 0.01, speed * 0.6);
            }
            break;
          }

          case 'support': {
            // Backline medic / leader: descends to the FAR top band, then shuffles
            // side to side — the player must reach it through the escort shield.
            const hoverY = 60 + Math.sin(enemy.patternTimer * 0.001) * 14;
            if (enemy.y < hoverY) {
              enemy.y += speed * 0.5;
            } else if (enemy.y > hoverY) {
              enemy.y -= speed * 0.4;
            } else {
              enemy.x += Math.sin(enemy.patternTimer * 0.002) * 1.5;
            }
            enemy.y = Math.max(20, enemy.y);
            break;
          }

          case 'teleporter': {
            // Blink cycle: HIDDEN (safe, no render) -> TELEGRAPH (ghost flicker,
            // readiness beat — still intangible) -> REVEALED (hittable). The
            // player must read the flicker and fire into the reveal.
            const hiddenDur = 1400;
            const telegraphDur = 350;
            const revealDur = 1600;
            const cycle = hiddenDur + telegraphDur + revealDur;
            const t = enemy.patternTimer % cycle;
            enemy.hidden = true;
            enemy.telegraphing = false;
            if (t >= hiddenDur && t < hiddenDur + telegraphDur) {
              enemy.hidden = false;
              enemy.telegraphing = true;
            } else if (t < hiddenDur + telegraphDur + revealDur) {
              enemy.hidden = false;
              enemy.telegraphing = false;
              // While revealed it creeps down into range and drifts toward player.
              enemy.y += speed * 0.7;
              const dx = this.playerX - (enemy.x + enemy.width / 2);
              enemy.x += Math.sign(dx) * Math.min(Math.abs(dx) * 0.006, speed * 0.3);
            }
            break;
          }

          case 'attractor': {
            // A slow, heavy mass that drifts down and sways side to side so the
            // gravity well stays menacing, lingering on-screen instead of passing.
            // The player must budget their drift against it (D7's verb).
            enemy.y += speed * 0.25;
            enemy.x += Math.sin(enemy.patternTimer * 0.0016) * 0.6;
            enemy.x = Math.max(20, Math.min(CONFIG.WIDTH - enemy.width - 20, enemy.x));
            break;
          }

          case 'terrain': {
            // D8 terrain-blocker: descends into a PARKED slot (a shelf that
            // scales by its column), then HOLDS — occupying the field, eating
            // your shots and shading enemies behind it for the wave.
            const parkY = 30 + (Math.min(enemy.originX, CONFIG.WIDTH - enemy.width) / CONFIG.WIDTH) * 170;
            if (enemy.y < parkY) {
              enemy.y += speed * 0.4;
            } else {
              // Parked: only a hair of hover so it reads as anchored debris.
              enemy.y += Math.sin(enemy.patternTimer * 0.0008) * 0.15;
              // Indestructible cover despawns after its lifespan so it cannot
              // linger across waves as permanent clutter.
              if (enemy.indestructible && enemy.lifespan > 0) {
                enemy.lifespan -= deltaTime * 1000;
                if (enemy.lifespan <= 0) {
                  enemy.flashTimer = 300;
                  this.remove(enemy);
                }
              }
            }
            break;
          }

          default:
            enemy.y += speed;
        }

        enemy.x = Math.max(0, Math.min(canvasWidth - enemy.width, enemy.x));
      }

      const requests = this.checkShoot(enemy, canvasWidth, canvasHeight);
      if (requests) bulletRequests.push(...requests);

      if (enemy.y > canvasHeight + enemy.height) {
        this.remove(enemy);
      }
    }

    for (const [id, origin] of this.formationOrigins) {
      const members = this.enemies.filter(e => e.formationId === id);
      if (origin.retreating && origin.y < -200) {
        this.formationOrigins.delete(id);
        for (const m of members) {
          this.remove(m);
        }
      } else if (members.length === 0) {
        this.formationOrigins.delete(id);
      }
    }

    this.applySupportBuffs();

    return bulletRequests;
  }

  /**
   * The strategic-pivot mechanic: healer & leader allies actively maintain the
   * local escort. Healers re-shield AND re-heal nearby allies; leaders (elites)
   * re-shield them faster as a "resistance" buff. The player MUST kill these
   * supports first or the surrounding enemies keep shrugging off damage.
   */
  private applySupportBuffs() {
    const radius = 110;
    for (const ally of this.enemies) {
      if (!ally.active) continue;
      const isHealer = ally.type === 'healer';
      const isLeader = ally.type === 'leader';
      if (!isHealer && !isLeader) continue;

      const healEvery = isHealer ? 2500 : 1800;
      if (ally.patternTimer < healEvery) continue;
      ally.patternTimer = 0;
      const ax = ally.x + ally.width / 2;
      const ay = ally.y + ally.height / 2;
      for (const e of this.enemies) {
        if (!e.active || e === ally) continue;
        if (e.type === 'healer' || e.type === 'leader') continue;
        const ex = e.x + e.width / 2;
        const ey = e.y + e.height / 2;
        const dx = ex - ax;
        const dy = ey - ay;
        if (dx * dx + dy * dy > radius * radius) continue;

        // Healer restores a defeated ally's integrity: re-shield then re-heal.
        if (isHealer) {
          if (e.shieldHp < 2) {
            e.shieldHp += 1;
          } else if (e.health < e.maxHealth) {
            e.health = Math.min(e.maxHealth, e.health + 1);
          }
        } else {
          // Leader: resistance buff — keep re-shielding nearby troops.
          if (e.shieldHp < 1) e.shieldHp += 1;
        }
      }
    }
  }

  private checkShoot(enemy: Enemy, canvasWidth: number, canvasHeight: number): EnemyBulletRequest[] | null {
    if (enemy.hidden || enemy.telegraphing) return null;
    const requests: EnemyBulletRequest[] = [];
    const cx = enemy.x + enemy.width / 2;
    const cy = enemy.y + enemy.height;

    switch (enemy.shootPattern) {
      case 'straight': {
        const interval = Math.max(1500, 3500 - this.difficulty * 150);
        if (enemy.shootTimer >= interval) {
          enemy.shootTimer = 0;
          requests.push({ x: cx, y: cy, angle: Math.PI / 2, type: 'straight' });
        }
        break;
      }

      case 'aimed': {
        const interval = Math.max(1200, 2500 - this.difficulty * 100);
        if (enemy.shootTimer >= interval) {
          enemy.shootTimer = 0;
          const angle = Math.atan2(this.playerY - cy, this.playerX - cx);
          requests.push({ x: cx, y: cy, angle, type: 'aimed' });
        }
        break;
      }

      case 'spread3': {
        const interval = Math.max(1000, 2200 - this.difficulty * 100);
        if (enemy.shootTimer >= interval) {
          enemy.shootTimer = 0;
          for (let i = -1; i <= 1; i++) {
            requests.push({ x: cx, y: cy, angle: Math.PI / 2 + i * 0.3, type: 'spread' });
          }
        }
        break;
      }

      case 'spread5': {
        const interval = Math.max(1200, 2500 - this.difficulty * 100);
        if (enemy.shootTimer >= interval) {
          enemy.shootTimer = 0;
          for (let i = -2; i <= 2; i++) {
            requests.push({ x: cx, y: cy, angle: Math.PI / 2 + i * 0.2, type: 'spread' });
          }
        }
        break;
      }

      case 'radial': {
        const interval = Math.max(2000, 4000 - this.difficulty * 150);
        if (enemy.shootTimer >= interval) {
          enemy.shootTimer = 0;
          const count = 8 + this.difficulty;
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            requests.push({ x: cx, y: cy, angle, type: 'radial' });
          }
        }
        break;
      }

      case 'spiral': {
        const interval = Math.max(80, 120 - this.difficulty * 5);
        if (enemy.shootTimer >= interval) {
          enemy.shootTimer = 0;
          const angle = enemy.patternTimer * 0.005;
          requests.push({ x: cx, y: cy, angle, type: 'spiral' });
          requests.push({ x: cx, y: cy, angle: angle + Math.PI, type: 'spiral' });
        }
        break;
      }

      case 'burst3': {
        const interval = Math.max(1500, 3000 - this.difficulty * 100);
        if (enemy.shootTimer >= interval) {
          enemy.shootTimer = 0;
          const baseAngle = Math.atan2(this.playerY - cy, this.playerX - cx);
          for (let i = 0; i < 3; i++) {
            const angle = baseAngle + (i - 1) * 0.2;
            requests.push({ x: cx, y: cy, angle, type: 'burst' });
          }
        }
        break;
      }
    }

    return requests.length > 0 ? requests : null;
  }

  remove(enemy: Enemy) {
    enemy.active = false;
    const index = this.enemies.indexOf(enemy);
    if (index > -1) this.enemies.splice(index, 1);
  }

  /**
   * Apply core damage to an enemy, honoring shields: while shieldHp remains it
   * absorbs the hit (the shield must be stripped before the core takes damage).
   * Returns true if the enemy died from this hit.
   */
  damageEnemy(enemy: Enemy, amount: number): boolean {
    if (!enemy.active) return false;
    if (enemy.hidden || enemy.telegraphing) return false;
    // Indestructible terrain: shots are ABSORBED (the block hides enemies and
    // eats your fire) but it never dies — route fire AROUND it, never at it.
    if (enemy.type === 'terrain' && enemy.indestructible) return false;
    if (enemy.shieldHp > 0) {
      enemy.shieldHp -= amount;
      enemy.flashTimer = 100;
      if (enemy.shieldHp <= 0) enemy.shieldHp = 0;
      return false;
    }
    enemy.health -= amount;
    enemy.flashTimer = 100;
    if (enemy.health <= 0) {
      this.remove(enemy);
      return true;
    }
    // Mirror: a NON-lethal hit replicates one copy that homes toward the player.
    // This teaches burst discipline — tickle it with weak blows and it floods
    // the screen; finish it with a decisive hit and it can't replicate.
    if (enemy.type === 'mirror') {
      const cx = enemy.x + enemy.width / 2;
      const cy = enemy.y + enemy.height / 2;
      const copy: Enemy = {
        x: cx - enemy.width / 2,
        y: cy - enemy.height / 2,
        width: enemy.width,
        height: enemy.height,
        speed: enemy.speed,
        health: 1,
        maxHealth: 1,
        type: 'mirrorcopy',
        active: true,
        shootTimer: 0,
        patternTimer: 0,
        movementPattern: 'homing',
        shootPattern: 'none',
        originX: cx - enemy.width / 2,
        flashTimer: 100,
        spawnX: cx - enemy.width / 2,
        formationId: -1,
        offsetX: 0,
        offsetY: 0,
        aimShards: false,
        shieldHp: 0,
        heading: Math.atan2(this.playerY - cy, this.playerX - cx),
        isReward: false,
        hidden: false,
        telegraphing: false,
        gravityStrength: 0,
        gravityRadius: 0,
        indestructible: false,
        explosive: false,
        lifespan: -1,
      };
      this.enemies.push(copy);
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (enemy.hidden) continue;

      ctx.save();

      const centerX = enemy.x + enemy.width / 2;
      const centerY = enemy.y + enemy.height / 2;

      if (enemy.flashTimer > 0) {
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 20;
      } else {
        ctx.shadowColor = CONFIG.COLORS.ENEMY_GLOW;
        ctx.shadowBlur = 15;
      }

      let color: string;
      let shape: string;
      switch (enemy.type) {
        case 'basic':
          color = CONFIG.COLORS.ENEMY;
          shape = 'triangle';
          break;
        case 'advanced':
          color = CONFIG.COLORS.ENEMY_ADVANCED;
          shape = 'diamond';
          break;
        case 'elite':
          color = CONFIG.COLORS.ENEMY_ELITE;
          shape = 'hexagon';
          break;
        case 'wall':
          color = CONFIG.COLORS.ENEMY_WALL;
          shape = 'wall';
          break;
        case 'splinterer':
          color = CONFIG.COLORS.ENEMY_SPLINTERER;
          shape = 'splinterer';
          break;
        case 'rusher':
          color = CONFIG.COLORS.ENEMY_RUSHER;
          shape = 'rusher';
          break;
        case 'homer':
          color = CONFIG.COLORS.ENEMY_HOMER;
          shape = 'homer';
          break;
        case 'mirror':
          color = CONFIG.COLORS.ENEMY_MIRROR;
          shape = 'mirror';
          break;
        case 'mirrorcopy':
          color = CONFIG.COLORS.ENEMY_MIRRORCOPY;
          shape = 'mirror';
          break;
        case 'healer':
          color = CONFIG.COLORS.ENEMY_HEALER;
          shape = 'healer';
          break;
        case 'leader':
          color = CONFIG.COLORS.ENEMY_LEADER;
          shape = 'leader';
          break;
        case 'teleporter':
          color = CONFIG.COLORS.ENEMY_TELEPORTER;
          shape = 'teleporter';
          break;
        case 'attractor':
          color = CONFIG.COLORS.ENEMY_ATTRACTOR;
          shape = 'attractor';
          break;
        case 'terrain':
          if (enemy.indestructible) {
            color = CONFIG.COLORS.ENEMY_TERRAIN_INDESTRUCTIBLE;
          } else if (enemy.explosive) {
            color = CONFIG.COLORS.ENEMY_TERRAIN_EXPLOSIVE;
          } else {
            color = CONFIG.COLORS.ENEMY_TERRAIN;
          }
          shape = 'terrain';
          break;
      }

      if (enemy.telegraphing) {
        // Readiness beat: the camera-reads-the-teleport-ghost flicker. Visible
        // but NOT hittable — the draw of the reveal is still to come.
        const pulse = (Math.sin(enemy.patternTimer * 0.05) + 1) / 2;
        ctx.globalAlpha = 0.15 + pulse * 0.35;
        ctx.strokeStyle = CONFIG.COLORS.ENEMY_TELEPORTER_TELEGRAPH;
        ctx.shadowColor = CONFIG.COLORS.ENEMY_TELEPORTER_TELEGRAPH;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(enemy.width, enemy.height) * 0.62 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
        continue;
      }

      ctx.fillStyle = color;

      if (shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(centerX, enemy.y + enemy.height);
        ctx.lineTo(enemy.x + enemy.width, enemy.y);
        ctx.lineTo(enemy.x, enemy.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(centerX, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, centerY);
        ctx.lineTo(centerX, enemy.y + enemy.height);
        ctx.lineTo(enemy.x, centerY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFAA00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(enemy.x + 3, centerY);
        ctx.lineTo(centerX - 5, centerY);
        ctx.moveTo(centerX + 5, centerY);
        ctx.lineTo(enemy.x + enemy.width - 3, centerY);
        ctx.stroke();
      } else if (shape === 'wall') {
        // Barricade: tall slab with a glowing core — the wall reads as blocking a lane.
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.globalAlpha = 1;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(enemy.x + 1, enemy.y + 1, enemy.width - 2, enemy.height - 2);

        const coreColor = enemy.maxHealth > 3 ? '#FFCC00' : '#FFFFFF';
        ctx.fillStyle = coreColor;
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (shape === 'terrain') {
        // D8 terrain-blocker: a slab/crate that parks in a lane and absorbs fire.
        // Reads by value — dark indestructible rock, bright hazard crate when it
        // explodes on death, mid debris otherwise.
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.globalAlpha = 1;

        ctx.strokeStyle = enemy.explosive ? '#FFE000' : 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemy.x + 1, enemy.y + 1, enemy.width - 2, enemy.height - 2);

        ctx.lineWidth = 1;
        // Cross-brace read: the crate's strapping (a hazard X on explosives).
        ctx.beginPath();
        ctx.moveTo(enemy.x + 3, enemy.y + 3);
        ctx.lineTo(enemy.x + enemy.width - 3, enemy.y + enemy.height - 3);
        ctx.moveTo(enemy.x + enemy.width - 3, enemy.y + 3);
        ctx.lineTo(enemy.x + 3, enemy.y + enemy.height - 3);
        ctx.stroke();

        if (enemy.explosive) {
          ctx.fillStyle = '#FFE000';
          ctx.shadowColor = '#FFE000';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (enemy.indestructible) {
          ctx.strokeStyle = 'rgba(255,255,255,0.18)';
          for (let j = 0; j < 3; j++) {
            const sy = enemy.y + ((j + 1) * enemy.height) / 4;
            ctx.beginPath();
            ctx.moveTo(enemy.x + 2, sy);
            ctx.lineTo(enemy.x + enemy.width - 2, sy);
            ctx.stroke();
          }
        }
      } else if (shape === 'splinterer') {
        // Spiky star/orb: fragile, ready to shatter and spray shards outward.
        const points = 8;
        const outerR = enemy.width * 0.55;
        const innerR = enemy.width * 0.22;
        ctx.beginPath();
        for (let j = 0; j < points * 2; j++) {
          const angle = (j / (points * 2)) * Math.PI * 2 - Math.PI / 2;
          const r = j % 2 === 0 ? outerR : innerR;
          const px = centerX + Math.cos(angle) * r;
          const py = centerY + Math.sin(angle) * r;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'rusher') {
        // Dive-dart: narrow, fast, reads as a wall-runner bullet.
        ctx.beginPath();
        ctx.moveTo(centerX, enemy.y + enemy.height);
        ctx.lineTo(enemy.x + enemy.width * 0.85, enemy.y + enemy.height * 0.2);
        ctx.lineTo(enemy.x + enemy.width * 0.5, enemy.y + enemy.height * 0.45);
        ctx.lineTo(enemy.x + enemy.width * 0.15, enemy.y + enemy.height * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, enemy.y + enemy.height * 0.55, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'homer') {
        // Homing missile: a dart with a small thruster tail, carves toward player.
        ctx.beginPath();
        ctx.moveTo(centerX, enemy.y + enemy.height);
        ctx.lineTo(enemy.x + enemy.width * 0.85, enemy.y + enemy.height * 0.25);
        ctx.lineTo(centerX, enemy.y + enemy.height * 0.5);
        ctx.lineTo(enemy.x + enemy.width * 0.15, enemy.y + enemy.height * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FF5500';
        ctx.beginPath();
        ctx.arc(centerX, enemy.y + enemy.height - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'mirror') {
        // Shard: a sliver of glass that reflects — replicates a copy on hit.
        ctx.beginPath();
        ctx.moveTo(centerX, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, centerY);
        ctx.lineTo(centerX, enemy.y + enemy.height);
        ctx.lineTo(enemy.x, centerY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, enemy.y + enemy.height * 0.25);
        ctx.lineTo(centerX, enemy.y + enemy.height * 0.75);
        ctx.stroke();
      } else if (shape === 'healer') {
        // Medic: a rounded support beacon with a tilted cross — reads as "the
        // guy who keeps the others alive", and it carries its own shield ring.
        ctx.beginPath();
        ctx.arc(centerX, centerY, enemy.width * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, enemy.width * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillRect(centerX - 2, centerY - enemy.height * 0.3, 4, enemy.height * 0.6);
        ctx.fillRect(centerX - enemy.width * 0.3, centerY - 2, enemy.width * 0.6, 4);
      } else if (shape === 'leader') {
        // Elite leader: a crowned hex-boss with a pulsing buff-aura ring around
        // it (the "one to kill now" — it broadcasts the resistance buff).
        const hw = enemy.width / 2;
        const hh = enemy.height / 2;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2 - Math.PI / 2;
          const px = centerX + Math.cos(angle) * hw * 0.95;
          const py = centerY + Math.sin(angle) * hh * 0.95;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Crown spikes on top.
        ctx.fillStyle = color;
        for (let s = -1; s <= 1; s++) {
          ctx.beginPath();
          ctx.moveTo(centerX + s * 10 - 4, enemy.y);
          ctx.lineTo(centerX + s * 10 + 4, enemy.y);
          ctx.lineTo(centerX + s * 14, enemy.y - 8);
          ctx.lineTo(centerX + s * 10 - 4, enemy.y);
          ctx.fill();
        }
        // Buff-aura: pulsing ring that signals the active buff.
        const aura = (Math.sin(enemy.patternTimer * 0.006) + 1) / 2;
        ctx.strokeStyle = CONFIG.COLORS.ENEMY_SHIELD;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4 + aura * 0.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, enemy.width * 0.85 + aura * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (shape === 'teleporter') {
        // Displacement rig: hexagonal core fringed with anti-telegraph sparks.
        // Renders only while REVEALED (the hidden state skips earlier).
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2 - Math.PI / 2;
          const px = centerX + Math.cos(angle) * enemy.width * 0.45;
          const py = centerY + Math.sin(angle) * enemy.height * 0.45;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        const spark = (Math.sin(enemy.patternTimer * 0.02) + 1) / 2;
        ctx.strokeStyle = CONFIG.COLORS.ENEMY_TELEPORTER;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3 + spark * 0.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, enemy.width * 0.6 + spark * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (shape === 'attractor') {
        // Gravity well: a dark core with swirling orbit rings and a halo showing
        // its pull radius. The halo is a direct threat-read — drift too close and
        // the mass owns your movement.
        const swirl = (Math.sin(enemy.patternTimer * 0.01) + 1) / 2;
        const r = enemy.width / 2;

        // Halo / pull radius.
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.18 + swirl * 0.18;
        ctx.beginPath();
        ctx.arc(centerX, centerY, enemy.gravityRadius * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Internal orbit rings (read as swirling).
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = color;
        for (let k = 1; k <= 3; k++) {
          ctx.globalAlpha = 0.25 + (k * 0.12);
          ctx.beginPath();
          ctx.arc(centerX, centerY, r * (0.3 + k * 0.18) + Math.sin(enemy.patternTimer * 0.008 + k) * 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Dense dark core.
        ctx.fillStyle = '#1A1024';
        ctx.beginPath();
        ctx.arc(centerX, centerY, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const hw = enemy.width / 2;
        const hh = enemy.height / 2;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2 - Math.PI / 2;
          const px = centerX + Math.cos(angle) * hw * 0.9;
          const py = centerY + Math.sin(angle) * hh * 0.9;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FF00AA';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (enemy.maxHealth > 1) {
        const barWidth = enemy.width * 0.8;
        const barHeight = 3;
        const barX = centerX - barWidth / 2;
        const barY = enemy.y - 6;

        ctx.fillStyle = '#1A1D2E';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = CONFIG.COLORS.HP_BAR_FILL;
        ctx.fillRect(barX, barY, barWidth * (enemy.health / enemy.maxHealth), barHeight);
      }

      // Shield ring: visible while a shield is up — it must be stripped first.
      if (enemy.shieldHp > 0) {
        const shieldColor = CONFIG.COLORS.ENEMY_SHIELD;
        ctx.strokeStyle = shieldColor;
        ctx.shadowColor = shieldColor;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(enemy.width, enemy.height) * 0.62, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }
  }

  getActive(): Enemy[] {
    return this.enemies;
  }

  getGravitySources(): { x: number; y: number; strength: number; radius: number; hidden: boolean }[] {
    const sources: { x: number; y: number; strength: number; radius: number; hidden: boolean }[] = [];
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (e.type !== 'attractor') continue;
      // Elite attractors (armored via hp/shield) pull noticeably harder.
      const elite = e.health >= 5 || e.shieldHp > 0;
      sources.push({
        x: e.x + e.width / 2,
        y: e.y + e.height / 2,
        strength: e.gravityStrength * (elite ? 1.7 : 1),
        radius: e.gravityRadius * (elite ? 1.15 : 1),
        hidden: e.hidden || e.telegraphing,
      });
    }
    return sources;
  }

  countActive(): number {
    let c = 0;
    for (const e of this.enemies) if (e.active) c++;
    return c;
  }

  getActiveCount(): number {
    return this.countActive();
  }

  setDifficulty(level: number) {
    this.difficulty = level;
  }

  clear() {
    this.enemies = [];
    this.formationOrigins.clear();
  }
}
