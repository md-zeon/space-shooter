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
  shieldHp?: number;
  bottomEntry?: boolean;
  isReward?: boolean;
  startHidden?: boolean;
  indestructible?: boolean;
  explosive?: boolean;
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
  shieldHp?: number;
  bottomEntry?: boolean;
  isReward?: boolean;
  startHidden?: boolean;
  indestructible?: boolean;
  explosive?: boolean;
}

const FORMATION_POOL: FormationType[] = [
  'random', 'line', 'vshape', 'diamond', 'pincer',
  'grid', 'circle', 'spiral', 'cross',
];

function generateFormation(
  formation: FormationType,
  count: number,
  canvasWidth: number,
  fromBottom: boolean = false
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const margin = 40;
  const usableWidth = canvasWidth - margin * 2;
  // Bottom-entry ambushes spawn BELOW the playfield and rise up into view.
  const baseY = fromBottom ? CONFIG.HEIGHT + 40 : -CONFIG.ENEMY_HEIGHT;

  switch (formation) {
    case 'random':
      for (let i = 0; i < count; i++) {
        positions.push({
          x: margin + Math.random() * usableWidth,
          y: baseY + (fromBottom ? -Math.random() * 50 : -Math.random() * 50),
        });
      }
      break;

    case 'line': {
      const spacing = usableWidth / (count + 1);
      const startX = margin + spacing;
      for (let i = 0; i < count; i++) {
        positions.push({
          x: startX + i * spacing - CONFIG.ENEMY_WIDTH / 2,
          y: baseY,
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
          y: baseY - Math.abs(offset) * 30,
        });
      }
      break;
    }

    case 'diamond': {
      const cx = canvasWidth / 2;
      if (count <= 4) {
        const diamondPos = [
          { x: cx - CONFIG.ENEMY_WIDTH / 2, y: baseY },
          { x: cx - 40, y: baseY - 30 },
          { x: cx + 10, y: baseY - 30 },
          { x: cx - CONFIG.ENEMY_WIDTH / 2, y: baseY - 60 },
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
          positions.push({ x: cx - xOff - CONFIG.ENEMY_WIDTH / 2, y: baseY - i * spacing });
          placed++;
          if (placed < count) {
            positions.push({ x: cx + xOff - CONFIG.ENEMY_WIDTH / 2, y: baseY - i * spacing });
            placed++;
          }
        }
        if (placed < count) {
          positions.push({ x: cx - CONFIG.ENEMY_WIDTH / 2, y: baseY - half * spacing });
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
          y: baseY - i * spacing,
        });
      }
      for (let i = 0; i < count - half; i++) {
        positions.push({
          x: canvasWidth - margin - CONFIG.ENEMY_WIDTH,
          y: baseY - i * spacing,
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
            y: baseY - r * spacingY,
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
          y: baseY - 40 + Math.sin(angle) * radius,
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
          y: baseY - 20 - t * 80,
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
          y: baseY - i * spacing,
        });
      }
      const remaining = count - armLen;
      for (let i = 0; i < remaining; i++) {
        const side = i < Math.ceil(remaining / 2) ? -1 : 1;
        const pos = i % Math.ceil(remaining / 2);
        positions.push({
          x: centerX + side * (pos + 1) * spacing - CONFIG.ENEMY_WIDTH / 2,
          y: baseY - armLen * spacing,
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
  if (type === 'homer' || type === 'mirror' || type === 'mirrorcopy') return 'homing';
  if (type === 'healer' || type === 'leader') return 'support';
  if (type === 'teleporter') return 'teleporter';
  if (type === 'attractor') return 'attractor';
  if (type === 'terrain') return 'terrain';
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
  if (type === 'teleporter') return 'none';
  if (type === 'attractor') return 'none';
  if (type === 'terrain') return 'none';
  if (type === 'healer') return 'none';
  if (type === 'leader') return difficulty >= 6 ? 'aimed' : 'spread3';
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
    // Wave 9 is the 18-enemy cumulative synthesis / pre-boss stress test; the
    // "wave-9 calm" convention applies to decades 2+ (see RESEARCH-WAVES-11-100.md).
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

      // Wave 4 — squad coordination + entry fire: one-side single long-row entry,
      // tanks fire entry pulses; two grunts peel into a mirrored pincer dive
      // (the gap between them is dodgeable). per research §9 wave 4.
      { groups: [
        { type: 'advanced', formation: 'line', count: 3, movementPattern: 'straight', shootPattern: 'aimed', delay: 0 },
        { type: 'basic', formation: 'line', count: 3, movementPattern: 'straight', shootPattern: 'none', delay: 250 },
        { type: 'basic', formation: 'pincer', count: 2, movementPattern: 'sinewave', shootPattern: 'none', delay: 500 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 5 — first leader (elite dash) + escort divers + tanks; mourning reset.
      { groups: [
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'dash', shootPattern: 'spread3', delay: 0 },
        { type: 'basic', formation: 'random', count: 2, movementPattern: 'swoop', shootPattern: 'none', delay: 200 },
        { type: 'advanced', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'aimed', delay: 800 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 6 — heavier budget, alternating coordinated dives (two squads side by
      // side = 10 enemies: 4+4 divers in mirrored pincers + 2 tanks screening).
      { groups: [
        { type: 'basic', formation: 'pincer', count: 4, movementPattern: 'sinewave', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'pincer', count: 4, movementPattern: 'swoop', shootPattern: 'none', delay: 900 },
        { type: 'advanced', formation: 'line', count: 2, movementPattern: 'straight', shootPattern: 'spread3', delay: 400 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 7 — speed spike + pattern ceiling: single V flight at higher speed,
      // grunts dive+fire mid-dive, tanks lay a horizontal spread (both types
      // arrive as one faster V: 12 enemies).
      { groups: [
        { type: 'basic', formation: 'vshape', count: 6, movementPattern: 'straight', speed: CONFIG.ENEMY_SPEED + 1.5, shootPattern: 'aimed', delay: 0 },
        { type: 'basic', formation: 'vshape', count: 3, movementPattern: 'straight', speed: CONFIG.ENEMY_SPEED + 1.5, shootPattern: 'aimed', delay: 150 },
        { type: 'advanced', formation: 'vshape', count: 3, movementPattern: 'straight', speed: CONFIG.ENEMY_SPEED + 1, shootPattern: 'spread5', delay: 300 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 8 — shielded/armored minions + ganging: forces target priority.
      // 15 enemies: shielded grunt squad (shield strip = targeting decision),
      // tanks screening fire, an elite. Gang of 3 shielded grunts dives at once.
      { groups: [
        { type: 'advanced', formation: 'pincer', count: 6, movementPattern: 'sinewave', shootPattern: 'aimed', delay: 0 },
        { type: 'basic', formation: 'grid', count: 6, movementPattern: 'straight', shootPattern: 'aimed', shieldHp: 1, delay: 300 },
        { type: 'basic', formation: 'diamond', count: 2, movementPattern: 'swoop', shootPattern: 'aimed', shieldHp: 1, delay: 800 },
        { type: 'elite', formation: 'diamond', count: 1, movementPattern: 'hover', shootPattern: 'spread5', delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 9 — "Full synthesis" pre-boss stress test: 18 enemies — leaders,
      // shielded grunts, tanks, entry fire, pincer dives. A cumulative exam of
      // every tool taught in 1-8 before the wave-10 boss (per research §9.0/§9).
      { groups: [
        { type: 'advanced', formation: 'line', count: 5, movementPattern: 'straight', shootPattern: 'aimed', delay: 0 },
        { type: 'basic', formation: 'random', count: 3, movementPattern: 'swoop', shootPattern: 'aimed', shieldHp: 2, delay: 200 },
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'dash', shootPattern: 'spread5', delay: 400 },
        { type: 'basic', formation: 'pincer', count: 4, movementPattern: 'sinewave', shootPattern: 'aimed', delay: 600 },
        { type: 'advanced', formation: 'grid', count: 4, movementPattern: 'straight', shootPattern: 'spread5', delay: 800 },
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'hover', shootPattern: 'spiral', delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

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
        { type: 'rusher', formation: 'random', count: 4, movementPattern: 'rusher', shootPattern: 'none', delay: 700 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 15 — Walls that lower/raise in rhythm (timed cycles); grunts dive during low phase.
      { groups: [
        { type: 'wall', formation: 'random', count: 2, movementPattern: 'wallRhythm', shootPattern: 'none', delay: 0 },
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
        { type: 'wall', formation: 'random', count: 2, movementPattern: 'wall', shootPattern: 'none', delay: 0, shieldHp: 2 },
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

      // Wave 22 — First splinterer: ONE enemy; death splits into 4 fast shards.
      { groups: [
        { type: 'splinterer', formation: 'vshape', count: 1, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
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
        { type: 'rusher', formation: 'random', count: 4, movementPattern: 'rusher', shootPattern: 'none', delay: 900 },
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

      // ===== Decade 4 (waves 31-40): Mirror / Homing archetype =====
      // New verb: baiting & reactive movement — you don't dodge the homer, you
      // STEER it into clean space. D4 signature entry grammar: bottom-entry
      // ambushes (enemies rise from beneath and swing down on you).

      // Wave 31 — Air/recovery after boss 30: recap D3 splinters lightly, reset.
      { groups: [
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 0 },
        { type: 'splinterer', formation: 'vshape', count: 2, movementPattern: 'straight', shootPattern: 'none', delay: 500 },
        { type: 'advanced', formation: 'line', count: 3, movementPattern: 'straight', shootPattern: 'aimed', delay: 900 },
        { type: 'basic', formation: 'pincer', count: 4, shootPattern: 'none', bottomEntry: true, movementPattern: 'ambush', delay: 1400 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 32 — FIRST HOMER: a single steerable homing missile (bounded turn
      // rate, so it's fair). Bait it into a corner while it trails you.
      { groups: [
        { type: 'homer', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'none', delay: 500 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 33 — Homers + swarmers: the swarm is fodder; the homer is the puzzle.
      { groups: [
        { type: 'homer', formation: 'random', count: 2, movementPattern: 'homing', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 8, movementPattern: 'swoop', shootPattern: 'none', delay: 300 },
        { type: 'basic', formation: 'line', count: 6, movementPattern: 'straight', shootPattern: 'none', delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 34 — Homing + wall: reroute the lane while a homer follows.
      { groups: [
        { type: 'homer', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 0 },
        { type: 'wall', formation: 'random', count: 2, movementPattern: 'wall', shootPattern: 'none', delay: 300 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 900 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 35 — FIRST MIRROR: one copy per NON-lethal hit until killed.
      // Teaches burst discipline — tickle it and it floods, finish it decisively.
      { groups: [
        { type: 'mirror', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'straight', shootPattern: 'none', delay: 600 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 36 — Homers that BRACKET at player x (bait a reversal): they trail
      // your column, so crossing through them is the dodge.
      { groups: [
        { type: 'homer', formation: 'random', count: 3, movementPattern: 'homing', speed: CONFIG.ENEMY_SPEED + 0.8, shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'pincer', count: 4, movementPattern: 'sinewave', shootPattern: 'none', delay: 700 },
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'none', delay: 1200 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 37 — Mirror + splinterer combo (mirror becomes the nightmare choice).
      { groups: [
        { type: 'mirror', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 0 },
        { type: 'wall', formation: 'random', count: 1, movementPattern: 'wall', shootPattern: 'none', delay: 300 },
        { type: 'splinterer', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'none', aimShards: true, delay: 700 },
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'swoop', shootPattern: 'none', delay: 1100 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 38 — First ELITE of the decade (Brotato +1/decade): a bigger, faster
      // turn-rate homer that MUST be focused — elite triage.
      { groups: [
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'spiral', delay: 0 },
        { type: 'homer', formation: 'random', count: 2, movementPattern: 'homing', shootPattern: 'none', delay: 400 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'straight', shootPattern: 'none', delay: 800 },
        { type: 'basic', formation: 'pincer', count: 4, shootPattern: 'none', bottomEntry: true, movementPattern: 'ambush', delay: 1300 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 39 — Calm / pre-boss relief: light bottom-entry ambush, breathing room.
      { groups: [
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
        { type: 'homer', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 700 },
        { type: 'basic', formation: 'pincer', count: 4, movementPattern: 'ambush', shootPattern: 'none', bottomEntry: true, delay: 1200 },
      ], isBossWave: false, isBossPrep: true },

      // Wave 40 — BOSS: The Statue / Face (BossManager handles it).
      { groups: [], isBossWave: true, isBossPrep: false },

      // ===== Decade 5 (waves 41-50): Healer / Support + Elite / Leader =====
      // The strategic pivot: the new verb is the PRIORITY LADDER — kill the
      // healer/buffer FIRST or the surrounding escort keeps shrugging off damage.
      // D5 signature entry grammar: escorted double-wedges.

      // Wave 41 — Air/recovery: re-presents D2-D4 archetypes at D1 complexity.
      { groups: [
        { type: 'wall', formation: 'random', count: 1, movementPattern: 'wall', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 400 },
        { type: 'splinterer', formation: 'vshape', count: 1, movementPattern: 'straight', shootPattern: 'none', delay: 900 },
        { type: 'homer', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 1300 },
        { type: 'advanced', formation: 'line', count: 3, movementPattern: 'straight', shootPattern: 'aimed', delay: 1600 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 42 — FIRST HEALER: a far, shielded medic that re-shields nearby
      // enemies. Kill the medic first, or the whole squad ignores your bullets.
      { groups: [
        { type: 'healer', formation: 'random', count: 1, movementPattern: 'support', shootPattern: 'none', shieldHp: 2, delay: 0 },
        { type: 'advanced', formation: 'pincer', count: 4, movementPattern: 'sinewave', shootPattern: 'aimed', delay: 400 },
        { type: 'basic', formation: 'line', count: 6, movementPattern: 'swoop', shootPattern: 'none', delay: 900 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 43 — Healer + tank + rusher (ONE composition): priority ladder.
      { groups: [
        { type: 'healer', formation: 'random', count: 1, movementPattern: 'support', shootPattern: 'none', shieldHp: 2, delay: 0 },
        { type: 'advanced', formation: 'line', count: 3, movementPattern: 'straight', shootPattern: 'aimed', hp: 3, delay: 500 },
        { type: 'rusher', formation: 'random', count: 4, movementPattern: 'rusher', shootPattern: 'none', delay: 900 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 44 — Healer + splinterer: the healer restores the splintering parts,
      // so kill it BEFORE engaging the splinters close-up.
      { groups: [
        { type: 'healer', formation: 'random', count: 1, movementPattern: 'support', shootPattern: 'none', shieldHp: 2, delay: 0 },
        { type: 'splinterer', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'none', aimShards: true, delay: 500 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 1100 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 45 — ELITE LEADER buffing neighbors (resistance): the "one to kill now."
      { groups: [
        { type: 'leader', formation: 'random', count: 1, movementPattern: 'support', shootPattern: 'spread3', delay: 0 },
        { type: 'basic', formation: 'vshape', count: 5, movementPattern: 'straight', shootPattern: 'none', delay: 400 },
        { type: 'advanced', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'aimed', delay: 900 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 46 — Healer + elite together: healers re-shield elites. Two support
      // priority contest — kill the healer, THEN the amplifying elite.
      { groups: [
        { type: 'healer', formation: 'random', count: 1, movementPattern: 'support', shootPattern: 'none', shieldHp: 2, delay: 0 },
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'hover', shootPattern: 'spread5', delay: 400 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 800 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 47 — Healer + homer + mirror + swarmer: priority under full noise.
      { groups: [
        { type: 'healer', formation: 'random', count: 1, movementPattern: 'support', shootPattern: 'none', shieldHp: 2, delay: 0 },
        { type: 'homer', formation: 'random', count: 2, movementPattern: 'homing', shootPattern: 'none', delay: 300 },
        { type: 'mirror', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 700 },
        { type: 'basic', formation: 'line', count: 7, movementPattern: 'swoop', shootPattern: 'none', delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 48 — TWO healers cross-healing each other + army: break the heal-loop.
      { groups: [
        { type: 'healer', formation: 'random', count: 2, movementPattern: 'support', shootPattern: 'none', shieldHp: 2, delay: 0 },
        { type: 'advanced', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'aimed', delay: 600 },
        { type: 'rusher', formation: 'random', count: 4, movementPattern: 'rusher', shootPattern: 'none', delay: 1100 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 49 — Calm / pre-boss relief: breathing room, but an elite stalker teases.
      { groups: [
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'dash', shootPattern: 'spread3', delay: 0 },
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'none', delay: 500 },
      ], isBossWave: false, isBossPrep: true },

      // Wave 50 — BOSS: The Creature / Swimmer (BossManager handles it).
      { groups: [], isBossWave: true, isBossPrep: false },

      // ===== Decade 6 (waves 51-60): Teleporter / Timing =====
      // The new verb is TIMING / SECOND FOCUS — enemies appear and vanish, so the
      // player can't just watch the top lane. The D6 signature entry grammar is the
      // THREE-AXIS PINCER: threats pour in from top-left, top-right, AND the bottom
      // simultaneously. Teleporters blink HIDDEN -> TELEGRAPH ghost -> REVEALED.

      // Wave 51 — Air/recovery: re-presents D2-D5 archetypes at D1 complexity.
      { groups: [
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 0 },
        { type: 'homer', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 500 },
        { type: 'wall', formation: 'random', count: 1, movementPattern: 'wall', shootPattern: 'none', delay: 900 },
        { type: 'basic', formation: 'pincer', count: 4, movementPattern: 'ambush', shootPattern: 'none', bottomEntry: true, delay: 1300 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 52 — FIRST TELEPORTER: it flickers with a telegraph beat before the
      // reveal. Read the ghost, fire into the reveal gap.
      { groups: [
        { type: 'teleporter', formation: 'random', count: 1, movementPattern: 'teleporter', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 400 },
        { type: 'basic', formation: 'pincer', count: 4, movementPattern: 'ambush', shootPattern: 'none', bottomEntry: true, delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 53 — Teleporter + swarmers: the flicker hides the swarm's approach.
      { groups: [
        { type: 'teleporter', formation: 'random', count: 2, movementPattern: 'teleporter', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 8, movementPattern: 'swoop', shootPattern: 'none', delay: 600 },
        { type: 'rusher', formation: 'pincer', count: 4, movementPattern: 'rusher', shootPattern: 'none', bottomEntry: true, delay: 1100 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 54 — Teleporter + half-teleporting wall: only pieces of the barricade
      // are solid at any moment. Thread through the gaps.
      { groups: [
        { type: 'teleporter', formation: 'random', count: 3, movementPattern: 'teleporter', shootPattern: 'none', delay: 0 },
        { type: 'wall', formation: 'line', count: 4, movementPattern: 'wall', shootPattern: 'none', delay: 500 },
        { type: 'advanced', formation: 'pincer', count: 4, movementPattern: 'ambush', shootPattern: 'aimed', bottomEntry: true, delay: 1300 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 55 — REWARD teleporter: a bonus target that is only hittable during
      // its brief reveal. Kill it in-window for a huge payout.
      { groups: [
        { type: 'teleporter', formation: 'random', count: 1, movementPattern: 'teleporter', shootPattern: 'none', isReward: true, hp: 1, delay: 0 },
        { type: 'basic', formation: 'line', count: 6, movementPattern: 'swoop', shootPattern: 'none', delay: 700 },
        { type: 'homer', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 1100 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 56 — Teleporter + homer: vanish/reappear while a seeker bears down.
      { groups: [
        { type: 'teleporter', formation: 'random', count: 2, movementPattern: 'teleporter', shootPattern: 'none', delay: 0 },
        { type: 'homer', formation: 'random', count: 2, movementPattern: 'homing', shootPattern: 'none', delay: 400 },
        { type: 'basic', formation: 'pincer', count: 6, movementPattern: 'ambush', shootPattern: 'none', bottomEntry: true, delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 57 — Teleporter + elite: timing pressure meets concentrated fire.
      { groups: [
        { type: 'teleporter', formation: 'random', count: 2, movementPattern: 'teleporter', shootPattern: 'none', delay: 0 },
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'hover', shootPattern: 'spread5', delay: 500 },
        { type: 'advanced', formation: 'line', count: 4, movementPattern: 'swoop', shootPattern: 'aimed', delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 58 — TWO teleporters + swarm + elite: the full focus test. Watch the
      // ghosts, the swarm, AND the bottom pincer at once.
      { groups: [
        { type: 'teleporter', formation: 'random', count: 2, movementPattern: 'teleporter', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 7, movementPattern: 'swoop', shootPattern: 'none', delay: 700 },
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'hover', shootPattern: 'spread5', delay: 1000 },
        { type: 'rusher', formation: 'pincer', count: 5, movementPattern: 'rusher', shootPattern: 'none', bottomEntry: true, delay: 1500 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 59 — Calm / pre-boss relief: breathing room before the Shell.
      { groups: [
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
      ], isBossWave: false, isBossPrep: true },

      // Wave 60 — BOSS: The Shell -> Inner Core (BossManager handles it).
      { groups: [], isBossWave: true, isBossPrep: false },

      // ===== Decade 7 (waves 61-70): Gravity / Attractor =====
      // The new verb is MOVEMENT ECONOMY UNDER A FIELD: a slow Attractor mass
      // pulls the ship toward it while it lives, bending the player's controls.
      // D7 signature entry grammar: field-assisted entrances (enemies arrive
      // WHILE the gravity field is already on).

      // Wave 61 — Air/recovery: re-presents earlier archetypes, NO gravity.
      // Decade rule: the air-wave after a boss stays clean.
      { groups: [
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 0 },
        { type: 'wall', formation: 'random', count: 1, movementPattern: 'wall', shootPattern: 'none', delay: 700 },
        { type: 'homer', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 1200 },
        { type: 'advanced', formation: 'line', count: 3, movementPattern: 'straight', shootPattern: 'aimed', delay: 1600 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 62 — FIRST ATTRACTOR: a slow mass pulling the ship toward it.
      // Counter-drift — hold against the pull while you deal with the flank.
      { groups: [
        { type: 'attractor', formation: 'random', count: 1, movementPattern: 'attractor', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 500 },
        { type: 'advanced', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'aimed', delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 63 — Attractor + swarmers: the swarm funnels INTO the attractor
      // (suicide bullets). Let gravity do the killing for you.
      { groups: [
        { type: 'attractor', formation: 'random', count: 1, movementPattern: 'attractor', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 7, movementPattern: 'swoop', shootPattern: 'none', delay: 400 },
        { type: 'rusher', formation: 'pincer', count: 4, movementPattern: 'rusher', shootPattern: 'none', delay: 900 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 64 — Attractor + wall: the wall is fine, but your drift is bent
      // toward it. Compensate drift while you reroute around the barricade.
      { groups: [
        { type: 'attractor', formation: 'random', count: 1, movementPattern: 'attractor', shootPattern: 'none', delay: 0 },
        { type: 'wall', formation: 'line', count: 2, movementPattern: 'wall', shootPattern: 'none', delay: 500 },
        { type: 'basic', formation: 'vshape', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 1100 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 65 — DUAL attractors (left + right) fighting each other = a *kind*
      // of safe pocket. Find the field null-point between them.
      { groups: [
        { type: 'attractor', formation: 'random', count: 2, movementPattern: 'attractor', shootPattern: 'none', delay: 0 },
        { type: 'homer', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 700 },
        { type: 'advanced', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'aimed', delay: 1100 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 66 — Attractor + homer: the homer curves WITH your counter-drift.
      // Steer against BOTH fields.
      { groups: [
        { type: 'attractor', formation: 'random', count: 1, movementPattern: 'attractor', shootPattern: 'none', delay: 0 },
        { type: 'homer', formation: 'random', count: 2, movementPattern: 'homing', shootPattern: 'none', delay: 500 },
        { type: 'basic', formation: 'line', count: 6, movementPattern: 'swoop', shootPattern: 'none', delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 67 — Attractor + teleporter: it teleports, THEN pulls you from a
      // new spot. Re-orient under a shifting field.
      { groups: [
        { type: 'attractor', formation: 'random', count: 1, movementPattern: 'attractor', shootPattern: 'none', delay: 0 },
        { type: 'teleporter', formation: 'random', count: 2, movementPattern: 'teleporter', shootPattern: 'none', delay: 500 },
        { type: 'advanced', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'aimed', delay: 1200 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 68 — ELITE attractor (stronger pull, armored) + escort.
      { groups: [
        { type: 'attractor', formation: 'random', count: 1, movementPattern: 'attractor', shootPattern: 'none', hp: 5, shieldHp: 2, delay: 0 },
        { type: 'basic', formation: 'line', count: 6, movementPattern: 'swoop', shootPattern: 'none', delay: 600 },
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'hover', shootPattern: 'spread5', delay: 1100 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 69 — Calm / pre-boss relief: the attractor is REMOVED — relief is
      // literal (your controls feel silky again).
      { groups: [
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'none', delay: 0 },
      ], isBossWave: false, isBossPrep: true },

      // Wave 70 — BOSS: The Fortress Wall (BossManager handles it).
      { groups: [], isBossWave: true, isBossPrep: false },

      // ===== Decade 8 (waves 71-80): Terrain / Line-of-Sight =====
      // The new verb is PLANNING AROUND BLOCKERS: terrain occupies the field,
      // eats your shots, and hides enemies behind it — you re-route fire and
      // deny their cover. Completes the block-you / move-you / hide-from-you
      // spatial trilogy. D8 signature entry grammar: terrain-guided paths
      // (enemies enter THROUGH / BEHIND blockers).

      // Wave 71 — Air/recovery: re-presents earlier verbs at D1 complexity, NO
      // terrain — the decade rule keeps the post-boss air clean.
      { groups: [
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 0 },
        { type: 'wall', formation: 'random', count: 1, movementPattern: 'wall', shootPattern: 'none', delay: 700 },
        { type: 'homer', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 1200 },
        { type: 'advanced', formation: 'vshape', count: 3, movementPattern: 'straight', shootPattern: 'aimed', delay: 1600 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 72 — FIRST terrain block: a destructible crate parks in a column and
      // reserves it — your shots are eaten until you clear it. Plan around the
      // blockage (route to the open lanes).
      { groups: [
        { type: 'terrain', formation: 'random', count: 1, movementPattern: 'terrain', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 500 },
        { type: 'advanced', formation: 'pincer', count: 2, movementPattern: 'ambush', shootPattern: 'aimed', bottomEntry: true, delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 73 — Terrain + enemies hiding BEHIND it: the shooter uses the crate
      // as cover — you must deny it by moving to a flank to shoot through the
      // opening, not straight through the block.
      { groups: [
        { type: 'terrain', formation: 'random', count: 2, movementPattern: 'terrain', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'aimed', delay: 600 },
        { type: 'advanced', formation: 'line', count: 2, movementPattern: 'hover', shootPattern: 'spread3', delay: 1000 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 74 — INDESTRUCTIBLE terrain (R-Type wall) + swarmers: a permanent
      // obstacle you cannot clear — route AROUND it forever while the swarm dips
      // through the gap it leaves.
      { groups: [
        { type: 'terrain', formation: 'random', count: 1, movementPattern: 'terrain', shootPattern: 'none', indestructible: true, delay: 0 },
        { type: 'basic', formation: 'line', count: 6, movementPattern: 'swoop', shootPattern: 'none', delay: 500 },
        { type: 'rusher', formation: 'pincer', count: 4, movementPattern: 'rusher', shootPattern: 'none', delay: 1100 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 75 — EXPLOSIVE terrain (Sky Force crate): shoot it and it BLOWS —
      // area denial. Either pick your kill angle (do it far away) or leave it and
      // snake around.
      { groups: [
        { type: 'terrain', formation: 'random', count: 2, movementPattern: 'terrain', shootPattern: 'none', explosive: true, delay: 0 },
        { type: 'basic', formation: 'vshape', count: 5, movementPattern: 'straight', shootPattern: 'aimed', delay: 700 },
        { type: 'homer', formation: 'random', count: 1, movementPattern: 'homing', shootPattern: 'none', delay: 1300 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 76 — Terrain + wall + gravity: the FULL R-Type spatial trilogy at
      // once (blocks-you + hides-you + moves-you). Triple spatial synthesis.
      { groups: [
        { type: 'terrain', formation: 'random', count: 1, movementPattern: 'terrain', shootPattern: 'none', delay: 0 },
        { type: 'attractor', formation: 'random', count: 1, movementPattern: 'attractor', shootPattern: 'none', delay: 400 },
        { type: 'wall', formation: 'random', count: 1, movementPattern: 'wall', shootPattern: 'none', delay: 900 },
        { type: 'basic', formation: 'line', count: 6, movementPattern: 'swoop', shootPattern: 'none', delay: 1300 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 77 — Terrain hiding a HEALER behind indestructible cover: solve the
      // impossible-seeming priority — flank the heal, don't front-snipe it.
      { groups: [
        { type: 'terrain', formation: 'random', count: 1, movementPattern: 'terrain', shootPattern: 'none', indestructible: true, delay: 0 },
        { type: 'healer', formation: 'random', count: 1, movementPattern: 'support', shootPattern: 'none', shieldHp: 2, delay: 400 },
        { type: 'rusher', formation: 'line', count: 4, movementPattern: 'rusher', shootPattern: 'none', delay: 900 },
        { type: 'basic', formation: 'line', count: 5, movementPattern: 'swoop', shootPattern: 'none', delay: 1300 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 78 — Elite + terrain: the elite WEAVES through the rubble, using the
      // debris as a shield wall. Break their cover to break them.
      { groups: [
        { type: 'terrain', formation: 'random', count: 2, movementPattern: 'terrain', shootPattern: 'none', delay: 0 },
        { type: 'elite', formation: 'random', count: 1, movementPattern: 'hover', shootPattern: 'spread5', shieldHp: 2, delay: 600 },
        { type: 'advanced', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'aimed', delay: 1100 },
      ], isBossWave: false, isBossPrep: false },

      // Wave 79 — Calm / pre-boss relief: terrain stays but it's sparse — back to
      // basics with rubble for texture, nothing to solve.
      { groups: [
        { type: 'terrain', formation: 'random', count: 1, movementPattern: 'terrain', shootPattern: 'none', delay: 0 },
        { type: 'basic', formation: 'line', count: 4, movementPattern: 'straight', shootPattern: 'none', delay: 500 },
      ], isBossWave: false, isBossPrep: true },

      // Wave 80 — BOSS: The Nimble Rocket-Skater Mech (BossManager handles it).
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
      const positions = generateFormation(group.formation, group.count, canvasWidth, group.bottomEntry);
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
          shieldHp: group.shieldHp,
          bottomEntry: group.bottomEntry,
          isReward: group.isReward,
          startHidden: group.startHidden,
          indestructible: group.indestructible,
          explosive: group.explosive,
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
