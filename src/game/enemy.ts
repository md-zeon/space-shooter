import { CONFIG } from './config';

export type EnemyType = 'basic' | 'advanced' | 'elite';

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
}

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
    offsetY: number = 0
  ) {
    const health = type === 'elite' ? 4 : type === 'advanced' ? 2 : 1;
    this.enemies.push({
      x, y,
      width: type === 'elite' ? 35 : CONFIG.ENEMY_WIDTH,
      height: type === 'elite' ? 35 : CONFIG.ENEMY_HEIGHT,
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

    return bulletRequests;
  }

  private checkShoot(enemy: Enemy, canvasWidth: number, canvasHeight: number): EnemyBulletRequest[] | null {
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

  render(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

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

      ctx.restore();
    }
  }

  getActive(): Enemy[] {
    return this.enemies;
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
