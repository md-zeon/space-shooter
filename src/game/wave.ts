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
  movementPattern?: string;
  hp?: number;
  aimShards?: boolean;
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
  hp?: number;
  aimShards?: boolean;
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
  if (type === 'splinterer') return 'straight';
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
  if (type === 'splinterer') return 'none';
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

    // Waves 1-10 are AUTHORED (deterministic teaching ladder) per research:
    // RESEARCH-FIRST-10-WAVES.md section 9. Each wave teaches one new mechanic
    // on top of the last, building to the first boss-with-minions wave (wave 10).
    // Wave 9 is a calm / pre-boss relief wave.
    const authored: Wave[] = [
      // Wave 1 — "The Lesson": 3 grunts, no fire.
      { groups: [
        { type: 'basic', formation: 'line', count: 3, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 2 — formation + aim practice: 4 grunts in a V, no shots yet.
      { groups: [
        { type: 'basic', formation: 'vshape', count: 4, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 3 — two types: 2 "tank" flyers (advanced, more HP) fire single aimed
      // bullets; 3 grunts lead. First enemy projectiles.
      { groups: [
        { type: 'basic', formation: 'line', count: 3, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
        { type: 'advanced', formation: 'line', count: 2, movementPattern: 'straight', shootPattern: 'aimed', delay: 700 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 4 — squad coordination + entry fire: individual diver grunts + aimed
      // tanks. Divers use 'random' so they break away and swoop independently.
      { groups: [
        { type: 'basic', formation: 'random', count: 3, movementPattern: 'swoop', shootPattern: 'none', delay: 0 },
        { type: 'advanced', formation: 'line', count: 3, movementPattern: 'straight', shootPattern: 'aimed', delay: 500 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 5 — first leader (elite dash) + escort divers + tanks; mourning reset.
      { groups: [
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'dash', shootPattern: 'spread3', delay: 0 },
        { type: 'basic', formation: 'random', count: 2, movementPattern: 'swoop', shootPattern: 'none', delay: 200 },
        { type: 'advanced', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'aimed', delay: 800 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 6 — heavier budget, alternating coordinated dives (two diver squads).
      { groups: [
        { type: 'basic', formation: 'random', count: 4, movementPattern: 'swoop', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'random', count: 4, movementPattern: 'swoop', shootPattern: 'none', delay: 900 },
        { type: 'advanced', formation: 'line', count: 2, movementPattern: 'straight', shootPattern: 'spread3', delay: 400 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 7 — speed spike + pattern ceiling: V at higher speed, combine dive + shot.
      { groups: [
        { type: 'basic', formation: 'vshape', count: 6, movementPattern: 'straight', speed: CONFIG.ENEMY_SPEED + 1, shootPattern: 'aimed', delay: 0 },
        { type: 'advanced', formation: 'grid', count: 6, movementPattern: 'straight', shootPattern: 'spread3', delay: 600 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 8 — shielded/armored minions + ganging: forces target priority.
      { groups: [
        { type: 'advanced', formation: 'pincer', count: 6, movementPattern: 'sinewave', shootPattern: 'aimed', delay: 0 },
        { type: 'advanced', formation: 'line', count: 6, movementPattern: 'straight', shootPattern: 'spread3', delay: 500 },
        { type: 'elite', formation: 'diamond', count: 1, movementPattern: 'hover', shootPattern: 'spread5', delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 9 — calm / pre-boss relief: light, open field, lower density.
      { groups: [
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
        { type: 'elite', formation: 'vshape', count: 1, movementPattern: 'hover', shootPattern: 'spread3', delay: 1200 },
      ], isBossWave: false, isBossPrep: true },

      // Wave 10 — FIRST BOSS WITH MINIONS (capstone; handled by BossManager).
      { groups: [], isBossWave: true, isBossPrep: false },

      // ===== Decade 2 (waves 11-20): Wall / Barricade archetype =====
      // New verb: route re-negotiation — walls block lanes, forcing repositioning.
      // D2 entry grammar: side flankers + top sweeps.

      // Wave 11 — Air/recovery after boss 10: recap, bigger counts, no new gimmick.
      { groups: [
        { type: 'basic', formation: 'line', count: 6, movementPattern: 'swoop', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'straight', shootPattern: 'aimed', delay: 500 },
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'dash', shootPattern: 'spread3', delay: 1200 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 12 — First wall: wide barricades descend, park, no shots. Move before they settle.
      { groups: [
        { type: 'wall', formation: 'random', count: 2, movementPattern: 'wall', shootPattern: 'none', delay: 0 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 13 — Wall + swarmers flood around it.
      { groups: [
        { type: 'wall', formation: 'random', count: 1, movementPattern: 'wall', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 8, movementPattern: 'swoop', shootPattern: 'none', delay: 400 },
        { type: 'basic', formation: 'line', count: 6, movementPattern: 'straight', shootPattern: 'none', delay: 900 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 14 — Two walls staggered pinning a corridor; rushers dive the gap.
      { groups: [
        { type: 'wall', formation: 'random', count: 2, movementPattern: 'wall', shootPattern: 'none', delay: 200 },
        { type: 'elite', formation: 'random', count: 2, movementPattern: 'swoop', shootPattern: 'spread3', delay: 700 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 15 — Walls that lower/raise in rhythm (timed cycles); grunts dive during low phase.
      { groups: [
        { type: 'wall', formation: 'random', count: 2, movementPattern: 'wall', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 900 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 1800 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 16 — Wall + aimed-fire tanks (route + bullets at once).
      { groups: [
        { type: 'wall', formation: 'random', count: 1, movementPattern: 'wall', shootPattern: 'none', delay: 0 },
        { type: 'advanced', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'aimed', delay: 500 },
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'hover', shootPattern: 'spread3', delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 17 — Faster walls, tighter gaps, more swarmers (weather rising).
      { groups: [
        { type: 'wall', formation: 'random', count: 2, movementPattern: 'wall', speed: CONFIG.ENEMY_SPEED + 2, shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 8, movementPattern: 'swoop', shootPattern: 'aimed', delay: 500 },
        { type: 'basic', formation: 'line', count: 6, movementPattern: 'straight', shootPattern: 'none', delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 18 — Shielded wall (needs multiple hits) parking a key lane; prioritize it.
      { groups: [
        { type: 'wall', formation: 'random', count: 2, movementPattern: 'wall', shootPattern: 'none', delay: 0 },
        { type: 'advanced', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'aimed', delay: 600 },
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'dash', shootPattern: 'spread5', delay: 1100 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 19 — Calm / pre-boss relief: fewer walls, open field, score-chain setup.
      { groups: [
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 600 },
      ], isBossWave: false, isBossPrep: true },

      // Wave 20 — BOSS: The Spider War Machine (BossManager handles it).
      { groups: [], isBossWave: true, isBossPrep: false },

      // ===== Decade 3 (waves 21-30): Splinterer archetype =====
      // New verb: kill placement & target choice — splinterers die into shrapnel,
      // so killing is NOT automatically safe. D3 entry grammar: V-formations with
      // a center anchor.

      // Wave 21 — Air/recovery after boss 20: recap D2 walls lightly, reset.
      { groups: [
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 0 },
        { type: 'wall', formation: 'random', count: 1, movementPattern: 'wall', shootPattern: 'none', delay: 600 },
        { type: 'advanced', formation: 'line', count: 3, movementPattern: 'straight', shootPattern: 'aimed', delay: 900 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 22 — First splinterer: death splits into 4 fast shards (cross).
      { groups: [
        { type: 'splinterer', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 23 — Splinterers mixed with swarmers: choose what to pop where.
      { groups: [
        { type: 'splinterer', formation: 'vshape', count: 2, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'random', count: 6, movementPattern: 'swoop', shootPattern: 'none', delay: 400 },
        { type: 'splinterer', formation: 'vshape', count: 2, movementPattern: 'straight', shootPattern: 'none', delay: 1200 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 24 — Splinterer + wall: wall forces you into the shrapnel cone.
      { groups: [
        { type: 'wall', formation: 'random', count: 1, movementPattern: 'wall', shootPattern: 'none', delay: 0 },
        { type: 'splinterer', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'none', delay: 500 },
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'swoop', shootPattern: 'none', delay: 900 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 25 — Aimed shards unlocked: splinterers' shards now home lightly at
      // the player — kill AWAY from yourself / manage point-blank radius.
      { groups: [
        { type: 'splinterer', formation: 'vshape', count: 4, movementPattern: 'straight', shootPattern: 'none', aimShards: true, delay: 0 },
        { type: 'splinterer', formation: 'vshape', count: 2, movementPattern: 'straight', shootPattern: 'none', aimShards: true, delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 26 — Chain of splinterers: killing one reveals the next (a ladder).
      { groups: [
        { type: 'splinterer', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'none', aimShards: true, delay: 0 },
        { type: 'splinterer', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'none', aimShards: true, delay: 500 },
        { type: 'splinterer', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'none', aimShards: true, delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 27 — Splinterers + tanks + rushers together: multitask under splinters.
      { groups: [
        { type: 'splinterer', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'none', aimShards: true, delay: 0 },
        { type: 'advanced', formation: 'line', count: 3, movementPattern: 'straight', shootPattern: 'aimed', delay: 400 },
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'dash', shootPattern: 'spread5', delay: 900 },
        { type: 'splinterer', formation: 'vshape', count: 2, movementPattern: 'straight', shootPattern: 'none', aimShards: true, delay: 1300 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 28 — Armored splinterer (2-stage): break the shell (2 HP), then it splits.
      { groups: [
        { type: 'splinterer', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'none', aimShards: true, hp: 2, delay: 0 },
        { type: 'wall', formation: 'random', count: 1, movementPattern: 'wall', shootPattern: 'none', delay: 500 },
        { type: 'splinterer', formation: 'vshape', count: 2, movementPattern: 'straight', shootPattern: 'none', aimShards: true, delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 29 — Calm / pre-boss relief: light splinterer scatter, breathing room.
      { groups: [
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
        { type: 'splinterer', formation: 'vshape', count: 2, movementPattern: 'straight', shootPattern: 'none', delay: 800 },
      ], isBossWave: false, isBossPrep: true },

      // Wave 30 — BOSS: The Turret-Cruiser (BossManager handles it).
      { groups: [], isBossWave: true, isBossPrep: false },
    ];

    for (let i = 0; i < authored.length; i++) {
      this.waves.push(authored[i]);
    }

    // Waves 21-200: procedural escalation (existing generator), appended after
    // the authored openers so the researched 1-20 arc plays first.
    for (let w = authored.length + 1; w <= 200; w++) {
      const waveNum = w;
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
      const movement = group.movementPattern || getMovementPattern(group.formation, group.type);
      const shootPattern = group.shootPattern || getShootPattern(group.type, this.difficulty);
      const speed = group.speed ?? CONFIG.ENEMY_SPEED + Math.random() * this.difficulty * 0.3;

      const formationId = group.formation !== 'random' ? nextFormationId++ : -1;
      const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
      const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;

      for (let i = 0; i < positions.length; i++) {
        commands.push({
          type: group.type,
          x: positions[i].x,
          y: positions[i].y,
          speed,
          movementPattern: movement,
          shootPattern,
          delay: (group.delay || 0) + i * 80,
          formationId,
          offsetX: positions[i].x - cx,
          offsetY: positions[i].y - cy,
          hp: group.hp,
          aimShards: group.aimShards,
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
