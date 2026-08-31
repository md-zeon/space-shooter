import { CONFIG } from './config';
import { BossState } from './boss';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

export interface MenuItem {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Renderer {
  private stars: Star[] = [];
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private menuItems: MenuItem[] = [];
  private hoveredItem: string | null = null;
  private waveAnnouncement: { wave: number; isBoss: boolean; timer: number } | null = null;
  private warningTimer: number = 0;
  private warningActive: boolean = false;
  private helpOpen: boolean = false;
  private soundOn: boolean = true;
  private statsOpen: boolean = false;

  setSoundOn(on: boolean) { this.soundOn = on; }
  setHelpOpen(open: boolean) { this.helpOpen = open; }
  isHelpOpen(): boolean { return this.helpOpen; }
  setStatsOpen(open: boolean) { this.statsOpen = open; }
  isStatsOpen(): boolean { return this.statsOpen; }

  init(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.initStars();
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.5 + 0.5,
      });
    }
  }

  update(deltaTime: number) {
    for (const star of this.stars) {
      star.y += star.speed * deltaTime * 60;
      if (star.y > this.canvasHeight) {
        star.y = 0;
        star.x = Math.random() * this.canvasWidth;
      }
    }
  }

  renderBackground(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, CONFIG.COLORS.BACKGROUND);
    gradient.addColorStop(1, '#0A1428');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  renderStars(ctx: CanvasRenderingContext2D) {
    for (const star of this.stars) {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderHUD(
    ctx: CanvasRenderingContext2D,
    score: number,
    lives: number,
    wave: number,
    highScore: number,
    shootMode: 'auto' | 'manual',
    powerLevel: number,
    bombs: number,
    chain: number,
    laserCharge: number = 0,
    laserActive: boolean = false,
    narrowTimer: number = 0,
    graze: number = 0,
    armor: number = 0,
  ) {
    ctx.save();

    // Score
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 10, 20);
    ctx.fillStyle = CONFIG.COLORS.POWERUP_SCORE;
    ctx.font = '12px "Press Start 2P"';
    ctx.fillText(score.toString().padStart(8, '0'), 10, 36);

    // High score
    ctx.font = '6px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('HI', this.canvasWidth / 2, 14);
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.fillText(highScore.toString().padStart(8, '0'), this.canvasWidth / 2, 24);

    // Wave
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_WAVE;
    ctx.textAlign = 'right';
    ctx.fillText(`WAVE ${wave}`, this.canvasWidth - 10, 62);

    // Lives as ship icons
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText('LIVES', this.canvasWidth - 10, 34);
    for (let i = 0; i < lives; i++) {
      ctx.fillStyle = CONFIG.COLORS.PLAYER;
      const lx = this.canvasWidth - 14 - i * 14;
      const ly = 40;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 4, ly + 8);
      ctx.lineTo(lx - 4, ly + 8);
      ctx.closePath();
      ctx.fill();
    }

    // Armor pods (hit-buffer shields) — small violet ovals under the lives.
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText('ARMOR', this.canvasWidth - 10, 58);
    for (let i = 0; i < armor; i++) {
      ctx.fillStyle = CONFIG.COLORS.POWERUP_ARMOR;
      ctx.globalAlpha = 0.9;
      const ax = this.canvasWidth - 10 - i * 12;
      const ay = 64;
      ctx.beginPath();
      ctx.ellipse(ax, ay, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Power level bar
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.font = '6px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText('PWR', 10, 50);
    const pBarW = 60;
    const pBarH = 4;
    ctx.fillStyle = '#1A1D2E';
    ctx.fillRect(10, 54, pBarW, pBarH);
    const pFill = (powerLevel - 1) / (CONFIG.MAX_POWER_LEVEL - 1);
    const pColor = pFill >= 1 ? CONFIG.COLORS.POWERUP_SCORE : CONFIG.COLORS.POWERUP_WEAPON;
    ctx.fillStyle = pColor;
    ctx.fillRect(10, 54, pBarW * pFill, pBarH);

    // Bombs
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.fillText('BOMB', 10, 68);
    for (let i = 0; i < bombs; i++) {
      ctx.fillStyle = CONFIG.COLORS.POWERUP_BOMB;
      ctx.fillRect(10 + i * 12, 72, 8, 8);
    }

    // Chain
    if (chain > 1) {
      ctx.font = '8px "Press Start 2P"';
      ctx.fillStyle = CONFIG.COLORS.POWERUP_SCORE;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
      ctx.fillText(`x${chain}`, this.canvasWidth / 2, 40);
      ctx.globalAlpha = 1;
    }

    // Laser charge bar (only at max power)
    if (powerLevel >= 5) {
      const lBarW = 50;
      const lBarH = 3;
      const lBarX = 10;
      const lBarY = this.canvasHeight - 22;
      ctx.fillStyle = '#1A1D2E';
      ctx.fillRect(lBarX, lBarY, lBarW, lBarH);
      const ready = !laserActive && laserCharge >= CONFIG.LASER_CHARGE_TIME;
      const chargePercent = laserActive ? 1 : Math.min(1, laserCharge / CONFIG.LASER_CHARGE_TIME);
      ctx.fillStyle = laserActive ? CONFIG.COLORS.LASER_BEAM : ready ? CONFIG.COLORS.POWERUP_NARROW : CONFIG.COLORS.POWERUP_NARROW;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = ready ? (Math.floor(Date.now() / 150) % 2 === 0 ? 12 : 3) : 3;
      ctx.fillRect(lBarX, lBarY, lBarW * chargePercent, lBarH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = ready ? CONFIG.COLORS.PLAYER : CONFIG.COLORS.TEXT_MUTED;
      ctx.font = '5px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillText(laserActive ? 'LASER' : ready ? 'READY [L]' : 'CHARGE', lBarX, lBarY - 2);
    }

    // Narrow indicator
    if (narrowTimer > 0) {
      const nBarW = 50;
      const nBarH = 3;
      const nBarX = 10;
      const nBarY = this.canvasHeight - 30;
      const nPercent = narrowTimer / CONFIG.POWERUP_NARROW_DURATION;
      ctx.fillStyle = '#1A1D2E';
      ctx.fillRect(nBarX, nBarY, nBarW, nBarH);
      ctx.fillStyle = CONFIG.COLORS.POWERUP_NARROW;
      ctx.shadowColor = CONFIG.COLORS.POWERUP_NARROW;
      ctx.shadowBlur = 5;
      ctx.fillRect(nBarX, nBarY, nBarW * nPercent, nBarH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
      ctx.font = '5px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillText('NARROW', nBarX, nBarY - 2);
    }

    // Shoot mode
    ctx.font = '6px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.textAlign = 'left';
    ctx.fillText(shootMode === 'auto' ? 'AUTO' : 'MANUAL', 10, this.canvasHeight - 10);

    // Graze counter
    if (graze > 0) {
      ctx.fillStyle = CONFIG.COLORS.PLAYER;
      ctx.fillText(`GRAZE ${graze}`, 60, this.canvasHeight - 10);
    }

    ctx.restore();
  }

  renderBossHP(ctx: CanvasRenderingContext2D, boss: BossState) {
    if (!boss.active || boss.entering) return;

    ctx.save();

    const barWidth = this.canvasWidth * 0.7;
    const barHeight = 6;
    const barX = (this.canvasWidth - barWidth) / 2;
    const barY = 42;

    // Boss name
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.COLORS.TEXT_WARNING;
    ctx.shadowColor = CONFIG.COLORS.TEXT_WARNING;
    ctx.shadowBlur = 10;
    ctx.fillText(boss.name, this.canvasWidth / 2, barY + 4);
    ctx.shadowBlur = 0;

    // Background
    ctx.fillStyle = CONFIG.COLORS.HP_BAR_BG;
    ctx.fillRect(barX, barY + 10, barWidth, barHeight);

    // Phase segments
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(barX + barWidth / 3, barY + 10);
    ctx.lineTo(barX + barWidth / 3, barY + 10 + barHeight);
    ctx.moveTo(barX + (barWidth * 2) / 3, barY + 10);
    ctx.lineTo(barX + (barWidth * 2) / 3, barY + 10 + barHeight);
    ctx.stroke();

    // Fill
    const hpPercent = Math.max(0, boss.health / boss.maxHealth);
    const fillColor = boss.color || CONFIG.COLORS.HP_BAR_BOSS;

    ctx.fillStyle = fillColor;
    ctx.shadowColor = fillColor;
    ctx.shadowBlur = 5;
    ctx.fillRect(barX, barY + 10, barWidth * hpPercent, barHeight);
    ctx.shadowBlur = 0;

    // Phase flash
    if (boss.phaseTransitioning && Math.floor(boss.flashTimer / 80) % 2 === 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(barX, barY + 10, barWidth, barHeight);
    }

    ctx.restore();
  }

  renderWarning(ctx: CanvasRenderingContext2D, timer: number) {
    ctx.save();

    const alpha = 0.3 + Math.sin(timer * 0.015) * 0.3;

    // Dark overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // WARNING text
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.COLORS.TEXT_WARNING;
    ctx.shadowColor = CONFIG.COLORS.TEXT_WARNING;
    ctx.shadowBlur = 20;
    ctx.globalAlpha = alpha;
    ctx.fillText('WARNING', this.canvasWidth / 2, this.canvasHeight / 2 - 10);

    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('BOSS INCOMING', this.canvasWidth / 2, this.canvasHeight / 2 + 15);
    ctx.shadowBlur = 0;

    // Side warning bars
    ctx.fillStyle = CONFIG.COLORS.TEXT_WARNING;
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillRect(0, this.canvasHeight / 2 - 30, 4, 60);
    ctx.fillRect(this.canvasWidth - 4, this.canvasHeight / 2 - 30, 4, 60);

    ctx.restore();
  }

  renderWaveAnnouncement(ctx: CanvasRenderingContext2D, wave: number, isBoss: boolean, timer: number) {
    const maxTimer = 2000;
    const progress = timer / maxTimer;
    const alpha = progress < 0.2 ? progress * 5 : progress > 0.8 ? (1 - progress) * 5 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';

    if (isBoss) {
      ctx.font = '14px "Press Start 2P"';
      ctx.fillStyle = CONFIG.COLORS.TEXT_WARNING;
      ctx.shadowColor = CONFIG.COLORS.TEXT_WARNING;
      ctx.shadowBlur = 15;
      ctx.fillText('BOSS WAVE', this.canvasWidth / 2, this.canvasHeight / 2);
    } else {
      ctx.font = '12px "Press Start 2P"';
      ctx.fillStyle = CONFIG.COLORS.TEXT_WAVE;
      ctx.shadowColor = CONFIG.COLORS.TEXT_WAVE;
      ctx.shadowBlur = 10;
      ctx.fillText(`WAVE ${wave}`, this.canvasWidth / 2, this.canvasHeight / 2);
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  renderPauseButton(ctx: CanvasRenderingContext2D): { x: number; y: number; width: number; height: number } {
    const size = 24;
    const padding = 10;
    const x = this.canvasWidth - size - padding;
    const y = padding;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = CONFIG.COLORS.TEXT;
    const barWidth = 3;
    const barHeight = 10;
    const gap = 4;
    ctx.fillRect(x + size / 2 - gap - barWidth, y + (size - barHeight) / 2, barWidth, barHeight);
    ctx.fillRect(x + size / 2 + gap - barWidth, y + (size - barHeight) / 2, barWidth, barHeight);

    ctx.restore();
    return { x: x - 5, y: y - 5, width: size + 10, height: size + 10 };
  }

  hitTestPauseButton(mx: number, my: number, bx: number, by: number, bw: number, bh: number): boolean {
    return mx >= bx && mx <= bx + bw && my >= by && my <= by + bh;
  }

  renderMainMenu(
    ctx: CanvasRenderingContext2D,
    highScore: number,
    meta?: {
      totalScore: number;
      enemiesDestroyed: number;
      bossesKilled: number;
      shipSkin: number;
      shipSkinUnlocked: boolean;
      shipUnlockScore: number;
    },
    time: number = 0
  ) {
    ctx.save();

    const unlocked = meta?.shipSkinUnlocked ?? false;
    const skin = meta?.shipSkin ?? 0;
    const cx = this.canvasWidth / 2;
    const W = this.canvasWidth;

    // ── Panel helper: rounded translucent card ─────────────────────────────
    const panel = (y: number, h: number, w: number, alpha = 0.06) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, cx - w / 2, y, w, h, 12);
      ctx.fill();
      ctx.stroke();
    };

    // ── Title (visual anchor) ──────────────────────────────────────────────
    const pulse = 0.7 + Math.sin(time * 0.0015) * 0.25;
    ctx.textAlign = 'center';
    ctx.font = '26px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 22 + pulse * 12;
    ctx.fillText('SPACE', cx, 72);
    ctx.fillText('SHOOTER', cx, 104);
    ctx.shadowBlur = 0;

    ctx.font = '8px "Exo 2"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    const tagline = '100 WAVES  •  10 BOSSES';
    const tagW = ctx.measureText(tagline).width;
    if (tagline) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.12)';
      this.roundRect(ctx, cx - tagW / 2 - 10, 116, tagW + 20, 18, 9);
      ctx.fill();
      ctx.fillStyle = CONFIG.COLORS.TEXT_WAVE;
      ctx.fillText(tagline, cx, 129);
    }

    this.menuItems = [];

    // ── Best score panel ────────────────────────────────────────────────────
    const scoreH = 64;
    const scoreY = 158;
    panel(scoreY, scoreH, W - 40);
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.fillText('BEST SCORE', cx, scoreY + 22);
    ctx.font = '20px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.POWERUP_SCORE;
    ctx.shadowColor = CONFIG.COLORS.POWERUP_SCORE;
    ctx.shadowBlur = 10;
    ctx.fillText(highScore.toString().padStart(8, '0'), cx, scoreY + 48);
    ctx.shadowBlur = 0;

    // ── Ship selector panel ────────────────────────────────────────────────
    const shipH = 118;
    const shipY = 236;
    panel(shipY, shipH, W - 40, 0.05);

    const lockW = 30;
    const lockH = 36;
    // Left / right arrows travel the vertical center of the card.
    const arrowCX = cx - (W - 40) / 2 + 22;
    const arrowCY = shipY + shipH / 2 - 14;
    this.drawMenuItem(ctx, '◄', arrowCX - lockW, arrowCY, lockW, lockH);
    this.drawMenuItem(ctx, '►', arrowCX, arrowCY, lockW, lockH);

    // Ship graphic preview (draw the actual hull instead of a plain label).
    const preview = { x: cx - 18, y: shipY + 18, width: 36, height: 36 };
    this.drawShipPreview(ctx, preview, skin);

    const shipName = skin === 1 ? 'NAVA-07' : 'AURORA-3';
    ctx.font = '9px "Press Start 2P"';
    ctx.fillStyle = skin === 1 ? CONFIG.COLORS.PLAYER_SKIN_BODY : CONFIG.COLORS.PLAYER;
    ctx.shadowColor = ctx.fillStyle as string;
    ctx.shadowBlur = 8;
    ctx.fillText(shipName, cx, shipY + 78);
    ctx.shadowBlur = 0;

    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = unlocked ? CONFIG.COLORS.TEXT_MUTED : CONFIG.COLORS.TEXT_WARNING;
    ctx.fillText(
      unlocked
        ? (skin === 1 ? 'ALT SCHEME ACTIVE' : 'SELECTED')
        : `LOCK: ${(meta?.shipUnlockScore.toLocaleString() ?? 0)} BEST`,
      cx, shipY + 98
    );

    // ── Secondary row: Sound / Help / Stats ────────────────────────────────
    const secW = (W - 40 - 24) / 3;
    const secY = 372;
    const secH = 34;
    const secGap = 12;
    const rowStart = cx - (W - 40) / 2;
    this.drawMenuItem(ctx, this.soundLabel(), rowStart, secY, secW, secH);
    this.drawMenuItem(ctx, 'HELP', rowStart + secW + secGap, secY, secW, secH);
    this.drawMenuItem(ctx, 'STATS', rowStart + (secW + secGap) * 2, secY, secW, secH);

    // ── Hero PLAY button (thumb zone) ──────────────────────────────────────
    const playW = W - 88;
    const playH = 60;
    const playY = this.canvasHeight - 130;
    this.drawMenuItem(ctx, '▶  PLAY', cx - playW / 2, playY, playW, playH, true);

    ctx.font = '7px "Exo 2"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.fillText('BUILT FOR TOUCH  •  AUTO-FIRE ON BY DEFAULT', cx, this.canvasHeight - 40);

    // ── Help overlay ───────────────────────────────────────────────────────
    if (this.helpOpen) {
      this.renderHelpOverlay(ctx);
    }

    // ── Stats overlay ──────────────────────────────────────────────────────
    if (this.statsOpen) {
      this.renderStatsOverlay(ctx, meta);
    }

    ctx.restore();
  }

  /** Rounded-rect path helper (used by panels and tags). */
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** Mini ship preview following the same hull geometry as the in-game ship. */
  private drawShipPreview(ctx: CanvasRenderingContext2D, ship: { x: number; y: number; width: number; height: number }, skin: number) {
    const body = skin === 1 ? CONFIG.COLORS.PLAYER_SKIN_BODY : CONFIG.COLORS.PLAYER;
    const wing = skin === 1 ? CONFIG.COLORS.PLAYER_SKIN_TILT : CONFIG.COLORS.PLAYER_TILT;
    const cx = ship.x + ship.width / 2;
    const top = ship.y;

    ctx.save();
    ctx.translate(cx, top + ship.height / 2);
    // Gentle idle bobbing + slight pulse so the preview feels alive.
    // (Nested save/translate here; movement comes from the caller's time if any.)
    ctx.shadowColor = body;
    ctx.shadowBlur = 16;

    // Fuselage
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -ship.height * 0.5);
    ctx.lineTo(ship.width * 0.5, ship.height * 0.4);
    ctx.lineTo(0, ship.height * 0.25);
    ctx.lineTo(-ship.width * 0.5, ship.height * 0.4);
    ctx.closePath();
    ctx.fill();

    // Wings
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(-ship.width * 0.1, -ship.height * 0.15);
    ctx.lineTo(-ship.width * 0.55, ship.height * 0.5);
    ctx.lineTo(-ship.width * 0.15, ship.height * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ship.width * 0.1, -ship.height * 0.15);
    ctx.lineTo(ship.width * 0.55, ship.height * 0.5);
    ctx.lineTo(ship.width * 0.15, ship.height * 0.3);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, -ship.height * 0.08, ship.width * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private soundLabel(): string {
    return this.soundOn ? 'SOUND ON' : 'MUTED';
  }

  private renderHelpOverlay(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(5, 10, 26, 0.94)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.textAlign = 'center';
    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 10;
    ctx.fillText('HOW TO PLAY', this.canvasWidth / 2, 90);
    ctx.shadowBlur = 0;

    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    const lines = [
      'DRAG / TAP ANYWHERE TO MOVE & SHOOT',
      'AUTO-FIRE ON BY DEFAULT (A/M TO TOGGLE)',
      'B OR BOMB BUTTON TO BOMB',
      'L / Z AT MAX POWER FIRES THE LASER',
      'GRAZE NEAR-MISS BULLETS FOR BONUS',
      'GUIDE YOUR SHIP BETWEEN THE SHOTS',
      'SURVIVE ALL 100 WAVES & 10 BOSSES',
    ];
    let y = 140;
    for (const line of lines) {
      ctx.fillText(line, this.canvasWidth / 2, y);
      y += 26;
    }
    ctx.fillStyle = CONFIG.COLORS.POWERUP_SCORE;
    ctx.fillText('TAP ANYWHERE OR PRESS ESC TO CLOSE', this.canvasWidth / 2, this.canvasHeight - 60);
  }

  private renderStatsOverlay(
    ctx: CanvasRenderingContext2D,
    meta?: {
      totalScore: number;
      enemiesDestroyed: number;
      bossesKilled: number;
      shipSkin: number;
      shipSkinUnlocked: boolean;
      shipUnlockScore: number;
    }
  ) {
    ctx.fillStyle = 'rgba(5, 10, 26, 0.94)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.textAlign = 'center';
    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 10;
    ctx.fillText('LIFETIME STATS', this.canvasWidth / 2, 90);
    ctx.shadowBlur = 0;

    const rows: [string, string][] = [
      ['TOTAL SCORE', (meta?.totalScore ?? 0).toString()],
      ['SHIPS DESTROYED', (meta?.enemiesDestroyed ?? 0).toString()],
      ['BOSSES KILLED', (meta?.bossesKilled ?? 0).toString()],
      ['ALT SHIP', meta?.shipSkinUnlocked ? 'UNLOCKED' : 'LOCKED'],
    ];

    ctx.font = '8px "Press Start 2P"';
    let y = 150;
    for (const [k, v] of rows) {
      ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
      ctx.textAlign = 'right';
      ctx.fillText(k, this.canvasWidth / 2 - 8, y);
      ctx.fillStyle = CONFIG.COLORS.TEXT;
      ctx.textAlign = 'left';
      ctx.fillText(v, this.canvasWidth / 2 + 8, y);
      y += 30;
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.COLORS.POWERUP_SCORE;
    ctx.fillText('TAP ANYWHERE TO CLOSE', this.canvasWidth / 2, this.canvasHeight - 60);
  }

  renderPauseScreen(ctx: CanvasRenderingContext2D) {
    ctx.save();

    ctx.fillStyle = 'rgba(5, 10, 26, 0.85)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.font = '16px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.textAlign = 'center';
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 10;
    ctx.fillText('PAUSED', this.canvasWidth / 2, this.canvasHeight / 2 - 80);
    ctx.shadowBlur = 0;

    this.menuItems = [];
    const startY = this.canvasHeight / 2 - 20;
    const itemWidth = 160;
    const itemHeight = 36;
    const gap = 12;

    this.drawMenuItem(ctx, 'RESUME', this.canvasWidth / 2 - itemWidth / 2, startY, itemWidth, itemHeight);
    this.drawMenuItem(ctx, 'RESTART', this.canvasWidth / 2 - itemWidth / 2, startY + itemHeight + gap, itemWidth, itemHeight);
    this.drawMenuItem(ctx, 'EXIT', this.canvasWidth / 2 - itemWidth / 2, startY + (itemHeight + gap) * 2, itemWidth, itemHeight);

    ctx.restore();
  }

  renderGameOver(
    ctx: CanvasRenderingContext2D,
    score: number,
    isNewHighScore: boolean,
    run?: { enemiesDestroyed: number; bossesKilled: number }
  ) {
    ctx.save();

    ctx.fillStyle = 'rgba(5, 10, 26, 0.85)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.font = '20px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.ENEMY;
    ctx.textAlign = 'center';
    ctx.shadowColor = CONFIG.COLORS.ENEMY;
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', this.canvasWidth / 2, this.canvasHeight / 2 - 70);

    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.shadowBlur = 0;
    ctx.fillText(`SCORE: ${score}`, this.canvasWidth / 2, this.canvasHeight / 2 - 30);

    if (isNewHighScore) {
      ctx.font = '8px "Press Start 2P"';
      ctx.fillStyle = CONFIG.COLORS.POWERUP_SCORE;
      ctx.fillText('NEW HIGH SCORE!', this.canvasWidth / 2, this.canvasHeight / 2 - 10);
    }

    if (run) {
      ctx.font = '6px "Press Start 2P"';
      ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
      ctx.fillText(`SHIPS DOWN ${run.enemiesDestroyed}  |  BOSSES ${run.bossesKilled}`, this.canvasWidth / 2, this.canvasHeight / 2 + 6);
    }

    this.menuItems = [];
    const startY = this.canvasHeight / 2 + 24;
    const itemWidth = 160;
    const itemHeight = 36;
    const gap = 12;

    this.drawMenuItem(ctx, 'RESTART', this.canvasWidth / 2 - itemWidth / 2, startY, itemWidth, itemHeight);
    this.drawMenuItem(ctx, 'EXIT', this.canvasWidth / 2 - itemWidth / 2, startY + itemHeight + gap, itemWidth, itemHeight);

    ctx.restore();
  }

  private drawMenuItem(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, width: number, height: number, hero: boolean = false) {
    const isHovered = this.hoveredItem === label;

    ctx.fillStyle = hero
      ? (isHovered ? 'rgba(0, 240, 255, 0.35)' : 'rgba(0, 240, 255, 0.18)')
      : (isHovered ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)');
    ctx.strokeStyle = hero ? CONFIG.COLORS.PLAYER : (isHovered ? CONFIG.COLORS.PLAYER : '#2A2D3A');
    ctx.lineWidth = hero ? 2 : 1;

    if (hero) {
      ctx.shadowColor = CONFIG.COLORS.PLAYER;
      ctx.shadowBlur = 16;
    }

    const radius = hero ? 8 : 4;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = hero ? '12px "Press Start 2P"' : '10px "Press Start 2P"';
    ctx.fillStyle = hero ? '#FFFFFF' : (isHovered ? CONFIG.COLORS.PLAYER : CONFIG.COLORS.TEXT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2 + (hero ? 0 : 0));
    ctx.textBaseline = 'alphabetic';

    this.menuItems.push({ id: label, label, x, y, width, height });
  }

  setHoveredItem(id: string | null) {
    this.hoveredItem = id;
  }

  hitTestMenu(x: number, y: number): MenuItem | null {
    for (const item of this.menuItems) {
      if (x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height) {
        return item;
      }
    }
    return null;
  }
}
