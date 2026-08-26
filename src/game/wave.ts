import { CONFIG } from './config';
import { EnemyType } from './enemy';

export type FormationType = 'random' | 'line' | 'vshape' | 'diamond' | 'pincer' | 'grid' | 'circle' | 'spiral' | 'cross';

export interface WaveGroup {
  type: EnemyType;
  formation: FormationType;
  count: number;
  speed?: number;
  shootPattern?: string;
  delay?: number;
}

export interface Wave {
  groups: WaveGroup[];
  isBossWave: boolean;
  isBossPrep: boolean;
}

export interface SpawnCommand {
  type: EnemyType;
  x: number;
  y: number;
  speed: number;
  movementPattern: string;
  shootPattern: string;
  delay: number;
  formationId: number;
  offsetX: number;
  offsetY: number;
}

const FORMATION_POOL: FormationType[] = [
  'random', 'line', 'vshape', 'diamond', 'pincer',
  'grid', 'circle', 'spiral', 'cross',
];

function generateFormation(
  formation: FormationType,
  count: number,
  canvasWidth: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const margin = 40;
  const usableWidth = canvasWidth - margin * 2;

  switch (formation) {
    case 'random':
      for (let i = 0; i < count; i++) {
        positions.push({
          x: margin + Math.random() * usableWidth,
          y: -CONFIG.ENEMY_HEIGHT - Math.random() * 50,
        });
      }
      break;

    case 'line': {
      const spacing = usableWidth / (count + 1);
      const startX = margin + spacing;
      for (let i = 0; i < count; i++) {
        positions.push({
          x: startX + i * spacing - CONFIG.ENEMY_WIDTH / 2,
          y: -CONFIG.ENEMY_HEIGHT,
        });
      }
      break;
    }

    case 'vshape': {
      const centerX = canvasWidth / 2;
      for (let i = 0; i < count; i++) {
        const half = Math.floor(count / 2);
        const offset = i - half;
        positions.push({
          x: centerX + offset * 40 - CONFIG.ENEMY_WIDTH / 2,
          y: -CONFIG.ENEMY_HEIGHT - Math.abs(offset) * 30,
        });
      }
      break;
    }

    case 'diamond': {
      const cx = canvasWidth / 2;
      if (count <= 4) {
        const diamondPos = [
          { x: cx - CONFIG.ENEMY_WIDTH / 2, y: -CONFIG.ENEMY_HEIGHT },
          { x: cx - 40, y: -CONFIG.ENEMY_HEIGHT - 30 },
          { x: cx + 10, y: -CONFIG.ENEMY_HEIGHT - 30 },
          { x: cx - CONFIG.ENEMY_WIDTH / 2, y: -CONFIG.ENEMY_HEIGHT - 60 },
        ];
        for (let i = 0; i < count; i++) {
          positions.push(diamondPos[i]);
        }
      } else {
        const spacing = 35;
        const half = Math.floor(count / 2);
        let placed = 0;
        for (let i = 0; i < half && placed < count; i++) {
          const xOff = i * spacing * 0.7;
          positions.push({ x: cx - xOff - CONFIG.ENEMY_WIDTH / 2, y: -CONFIG.ENEMY_HEIGHT - i * spacing });
          placed++;
          if (placed < count) {
            positions.push({ x: cx + xOff - CONFIG.ENEMY_WIDTH / 2, y: -CONFIG.ENEMY_HEIGHT - i * spacing });
            placed++;
          }
        }
        if (placed < count) {
          positions.push({ x: cx - CONFIG.ENEMY_WIDTH / 2, y: -CONFIG.ENEMY_HEIGHT - half * spacing });
        }
      }
      break;
    }

    case 'pincer': {
      const half = Math.ceil(count / 2);
      const spacing = 45;
      for (let i = 0; i < half; i++) {
        positions.push({
          x: margin,
          y: -CONFIG.ENEMY_HEIGHT - i * spacing,
        });
      }
      for (let i = 0; i < count - half; i++) {
        positions.push({
          x: canvasWidth - margin - CONFIG.ENEMY_WIDTH,
          y: -CONFIG.ENEMY_HEIGHT - i * spacing,
        });
      }
      break;
    }

    case 'grid': {
      const cols = Math.min(count, 5);
      const rows = Math.ceil(count / cols);
      const spacingX = usableWidth / (cols + 1);
      const spacingY = 45;
      let placed = 0;
      for (let r = 0; r < rows && placed < count; r++) {
        for (let c = 0; c < cols && placed < count; c++) {
          positions.push({
            x: margin + spacingX * (c + 1) - CONFIG.ENEMY_WIDTH / 2,
            y: -CONFIG.ENEMY_HEIGHT - r * spacingY,
          });
          placed++;
        }
      }
      break;
    }

    case 'circle': {
      const centerX = canvasWidth / 2;
      const radius = 60;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        positions.push({
          x: centerX + Math.cos(angle) * radius - CONFIG.ENEMY_WIDTH / 2,
          y: -CONFIG.ENEMY_HEIGHT - 40 + Math.sin(angle) * radius,
        });
      }
      break;
    }

    case 'spiral': {
      const centerX = canvasWidth / 2;
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(count - 1, 1);
        const angle = t * Math.PI * 4;
        const radius = 30 + t * 50;
        positions.push({
          x: centerX + Math.cos(angle) * radius - CONFIG.ENEMY_WIDTH / 2,
          y: -CONFIG.ENEMY_HEIGHT - 20 - t * 80,
        });
      }
      break;
    }

    case 'cross': {
      const centerX = canvasWidth / 2;
      const armLen = Math.ceil(count / 2);
      const spacing = 40;
      for (let i = 0; i < armLen; i++) {
        positions.push({
          x: centerX - CONFIG.ENEMY_WIDTH / 2,
          y: -CONFIG.ENEMY_HEIGHT - i * spacing,
        });
      }
      const remaining = count - armLen;
      for (let i = 0; i < remaining; i++) {
        const side = i < Math.ceil(remaining / 2) ? -1 : 1;
        const pos = i % Math.ceil(remaining / 2);
        positions.push({
          x: centerX + side * (pos + 1) * spacing - CONFIG.ENEMY_WIDTH / 2,
          y: -CONFIG.ENEMY_HEIGHT - armLen * spacing,
        });
      }
      break;
    }
  }

  return positions;
}

function getMovementPattern(formation: FormationType, type: EnemyType): string {
  if (type === 'elite') return 'hover';
  switch (formation) {
    case 'line': return 'straight';
    case 'vshape': return 'straight';
    case 'diamond': return 'sinewave';
    case 'pincer': return 'reposition';
    case 'grid': return 'straight';
    case 'circle': return 'hover';
    case 'spiral': return 'swoop';
    case 'cross': return 'zigzag';
    default: return type === 'advanced' ? 'sinewave' : 'straight';
  }
}

function getShootPattern(type: EnemyType, difficulty: number): string {
  if (difficulty <= 2) {
    return type === 'elite' ? 'spread3' : 'straight';
  }
  switch (type) {
    case 'basic': return difficulty >= 6 ? 'aimed' : 'straight';
    case 'advanced': return difficulty >= 4 ? 'aimed' : 'spread3';
    case 'elite': return difficulty >= 8 ? 'spiral' : 'spread5';
    default: return 'straight';
  }
}

let nextFormationId = 0;

export class WaveManager {
  private waves: Wave[] = [];
  private currentWaveIndex: number = 0;
  private pendingSpawns: SpawnCommand[] = [];
  private spawnDelay: number = 0;
  private betweenWaves: boolean = false;
  private betweenWaveTimer: number = 0;
  private difficulty: number = 1;
  private waveNumber: number = 0;
  private bossActive: boolean = false;
  private waveAnnouncementTimer: number = 0;
  private announcedWave: number = -1;

  constructor() {
    this.generateWaves();
  }

  generateWaves() {
    this.waves = [];

    for (let w = 0; w < 200; w++) {
      const waveNum = w + 1;
      const tier = Math.min(Math.floor(waveNum / 3), 3);

      if (waveNum % 10 === 0) {
        this.waves.push({ groups: [], isBossWave: true, isBossPrep: false });
        continue;
      }

      if (waveNum % 10 === 9) {
        this.waves.push({ groups: [], isBossWave: false, isBossPrep: true });
        continue;
      }

      const groups: WaveGroup[] = [];
      const numGroups = 1 + Math.floor(Math.random() * (tier + 1));

      for (let g = 0; g < numGroups; g++) {
        let type: EnemyType = 'basic';
        const roll = Math.random();
        if (tier >= 2 && roll > 0.85) type = 'elite';
        else if (tier >= 1 && roll > 0.5) type = 'advanced';

        const maxFormationIndex = Math.min(FORMATION_POOL.length, 2 + tier * 2);
        const formation = FORMATION_POOL[Math.floor(Math.random() * maxFormationIndex)];
        const count = 3 + Math.floor(Math.random() * (3 + tier * 2));

        groups.push({
          type,
          formation,
          count: Math.min(count, 15),
          delay: g * 800,
        });
      }

      this.waves.push({ groups, isBossWave: false, isBossPrep: false });
    }
  }

  getSpawnCommands(wave: Wave, canvasWidth: number): SpawnCommand[] {
    const commands: SpawnCommand[] = [];

    for (const group of wave.groups) {
      const positions = generateFormation(group.formation, group.count, canvasWidth);
      const movement = getMovementPattern(group.formation, group.type);

      const formationId = group.formation !== 'random' ? nextFormationId++ : -1;
      const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
      const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;

      for (let i = 0; i < positions.length; i++) {
        commands.push({
          type: group.type,
          x: positions[i].x,
          y: positions[i].y,
          speed: CONFIG.ENEMY_SPEED + Math.random() * this.difficulty * 0.3,
          movementPattern: movement,
          shootPattern: getShootPattern(group.type, this.difficulty),
          delay: (group.delay || 0) + i * 80,
          formationId,
          offsetX: positions[i].x - cx,
          offsetY: positions[i].y - cy,
        });
      }
    }

    return commands;
  }

  update(
    deltaTime: number,
    activeEnemyCount: number,
    canvasWidth: number
  ): SpawnCommand[] {
    const newSpawns: SpawnCommand[] = [];

    if (this.bossActive) return [];

    if (this.betweenWaves) {
      this.betweenWaveTimer -= deltaTime * 1000;
      if (this.betweenWaveTimer <= 0) {
        this.betweenWaves = false;
        this.currentWaveIndex++;
        this.startNextWave(canvasWidth);
      }
      return [];
    }

    this.spawnDelay -= deltaTime * 1000;
    while (this.pendingSpawns.length > 0 && this.spawnDelay <= 0) {
      const cmd = this.pendingSpawns.shift()!;
      newSpawns.push(cmd);
      this.spawnDelay += 80;
    }

    if (this.pendingSpawns.length === 0 && newSpawns.length === 0 && !this.betweenWaves) {
      this.betweenWaves = true;
      this.betweenWaveTimer = 3000;
    }

    return newSpawns;
  }

  startNextWave(canvasWidth: number) {
    if (this.currentWaveIndex >= this.waves.length) {
      this.generateWaves();
      this.currentWaveIndex = 0;
    }

    const wave = this.waves[this.currentWaveIndex];
    this.waveNumber = this.currentWaveIndex + 1;
    this.difficulty = Math.floor(this.waveNumber / 3) + 1;

    if (wave.isBossWave) {
      this.bossActive = true;
      return;
    }

    const commands = this.getSpawnCommands(wave, canvasWidth);
    this.pendingSpawns = commands;
    this.spawnDelay = 0;
  }

  getWaveAnnouncement(): { wave: number; isBoss: boolean } | null {
    if (this.waveNumber !== this.announcedWave && this.waveNumber > 0) {
      const wave = this.waves[this.currentWaveIndex];
      this.announcedWave = this.waveNumber;
      return { wave: this.waveNumber, isBoss: wave?.isBossWave || false };
    }
    return null;
  }

  onBossDefeated() {
    this.bossActive = false;
    this.betweenWaves = true;
    this.betweenWaveTimer = 2000;
  }

  reset() {
    this.currentWaveIndex = 0;
    this.pendingSpawns = [];
    this.spawnDelay = 0;
    this.betweenWaves = false;
    this.betweenWaveTimer = 0;
    this.difficulty = 1;
    this.waveNumber = 0;
    this.bossActive = false;
    this.announcedWave = -1;
    nextFormationId = 0;
    this.generateWaves();
  }

  isBossWaveNow(): boolean {
    return this.bossActive;
  }

  getWaveNumber(): number {
    return this.waveNumber;
  }

  getDifficulty(): number {
    return this.difficulty;
  }

  isBetweenWaves(): boolean {
    return this.betweenWaves;
  }
}
