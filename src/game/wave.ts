import { CONFIG } from './config';
import { EnemyType } from './enemy';

export type FormationType = 'random' | 'line' | 'vshape' | 'diamond' | 'pincer' | 'grid' | 'circle' | 'spiral';

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
}

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
          x: centerX + offset * 35 - CONFIG.ENEMY_WIDTH / 2,
          y: -CONFIG.ENEMY_HEIGHT - Math.abs(offset) * 25,
        });
      }
      break;
    }

    case 'diamond': {
      const cx = canvasWidth / 2;
      if (count <= 4) {
        positions.push({ x: cx - CONFIG.ENEMY_WIDTH / 2, y: -CONFIG.ENEMY_HEIGHT });
        positions.push({ x: cx - 55, y: -CONFIG.ENEMY_HEIGHT - 30 });
        positions.push({ x: cx + 25, y: -CONFIG.ENEMY_HEIGHT - 30 });
        positions.push({ x: cx - CONFIG.ENEMY_WIDTH / 2, y: -CONFIG.ENEMY_HEIGHT - 60 });
      } else {
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
          const radius = 35;
          positions.push({
            x: cx + Math.cos(angle) * radius - CONFIG.ENEMY_WIDTH / 2,
            y: -CONFIG.ENEMY_HEIGHT - 30 + Math.sin(angle) * radius,
          });
        }
      }
      break;
    }

    case 'pincer': {
      const half = Math.ceil(count / 2);
      const spacing = 30;
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
      const spacingY = 40;
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
        const t = i / count;
        const angle = t * Math.PI * 4;
        const radius = 30 + t * 50;
        positions.push({
          x: centerX + Math.cos(angle) * radius - CONFIG.ENEMY_WIDTH / 2,
          y: -CONFIG.ENEMY_HEIGHT - 20 - t * 80,
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
    case 'pincer': return 'zigzag';
    case 'grid': return 'straight';
    case 'circle': return 'sinewave';
    case 'spiral': return 'sinewave';
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

export class WaveManager {
  private waves: Wave[] = [];
  private currentWaveIndex: number = 0;
  private pendingSpawns: SpawnCommand[] = [];
  private spawnDelay: number = 0;
  private waveClearTimer: number = 0;
  private waveClearThreshold: number = 2000;
  private waitingForClear: boolean = false;
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

      const formations: FormationType[] = ['random', 'line', 'vshape', 'diamond', 'pincer', 'grid'];

      for (let g = 0; g < numGroups; g++) {
        let type: EnemyType = 'basic';
        const roll = Math.random();
        if (tier >= 2 && roll > 0.85) type = 'elite';
        else if (tier >= 1 && roll > 0.5) type = 'advanced';

        const formation = formations[Math.floor(Math.random() * Math.min(formations.length, 2 + tier))];
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

      for (let i = 0; i < positions.length; i++) {
        commands.push({
          type: group.type,
          x: positions[i].x,
          y: positions[i].y,
          speed: CONFIG.ENEMY_SPEED + Math.random() * this.difficulty * 0.3,
          movementPattern: movement,
          shootPattern: getShootPattern(group.type, this.difficulty),
          delay: (group.delay || 0) + i * 80,
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

    if (this.waitingForClear) {
      if (activeEnemyCount === 0) {
        this.waveClearTimer += deltaTime * 1000;
        if (this.waveClearTimer >= this.waveClearThreshold) {
          this.waitingForClear = false;
          this.betweenWaves = true;
          this.betweenWaveTimer = 1500;
        }
      } else {
        this.waveClearTimer = 0;
      }

      this.spawnDelay -= deltaTime * 1000;
      while (this.pendingSpawns.length > 0 && this.spawnDelay <= 0) {
        const cmd = this.pendingSpawns.shift()!;
        newSpawns.push(cmd);
        this.spawnDelay += cmd.delay > 0 ? 50 : 0;
      }
      return newSpawns;
    }

    this.spawnDelay -= deltaTime * 1000;
    while (this.pendingSpawns.length > 0 && this.spawnDelay <= 0) {
      const cmd = this.pendingSpawns.shift()!;
      newSpawns.push(cmd);
      this.spawnDelay += cmd.delay > 0 ? 50 : 0;
    }

    if (this.pendingSpawns.length === 0 && activeEnemyCount > 0 && activeEnemyCount <= 2 && !this.waitingForClear) {
      this.waitingForClear = true;
      this.waveClearTimer = 0;
    }

    if (this.pendingSpawns.length === 0 && activeEnemyCount === 0 && !this.waitingForClear) {
      this.betweenWaves = true;
      this.betweenWaveTimer = 1000;
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
    this.waitingForClear = false;
    this.waveClearTimer = 0;

    if (wave.isBossPrep) {
      this.waveClearThreshold = 1000;
    } else {
      this.waveClearThreshold = 2000;
    }
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
    this.waveClearTimer = 0;
    this.waitingForClear = false;
    this.betweenWaves = false;
    this.betweenWaveTimer = 0;
    this.difficulty = 1;
    this.waveNumber = 0;
    this.bossActive = false;
    this.announcedWave = -1;
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
