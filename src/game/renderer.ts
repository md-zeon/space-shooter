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
    chain: number
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
    ctx.fillText(`WAVE ${wave}`, this.canvasWidth - 10, 50);

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

    // Shoot mode
    ctx.font = '6px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.textAlign = 'left';
    ctx.fillText(shootMode === 'auto' ? 'AUTO' : 'MANUAL', 10, this.canvasHeight - 10);

    ctx.restore();
  }

  renderBossHP(ctx: CanvasRenderingContext2D, boss: BossState) {
    if (!boss.active || boss.entering) return;

    ctx.save();

    const barWidth = this.canvasWidth * 0.7;
    const barHeight = 6;
    const barX = (this.canvasWidth - barWidth) / 2;
    const barY = 28;

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
    let fillColor: string;
    if (boss.phase === 3) fillColor = CONFIG.COLORS.HP_BAR_BOSS_PHASE3;
    else if (boss.phase === 2) fillColor = CONFIG.COLORS.HP_BAR_BOSS_PHASE2;
    else fillColor = CONFIG.COLORS.HP_BAR_BOSS;

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

  renderMainMenu(ctx: CanvasRenderingContext2D, highScore: number) {
    ctx.save();

    ctx.font = '20px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.textAlign = 'center';
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 20;
    ctx.fillText('SPACE', this.canvasWidth / 2, this.canvasHeight / 2 - 100);
    ctx.fillText('SHOOTER', this.canvasWidth / 2, this.canvasHeight / 2 - 70);

    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.shadowBlur = 0;
    ctx.fillText(`HIGH SCORE: ${highScore.toString().padStart(8, '0')}`, this.canvasWidth / 2, this.canvasHeight / 2 - 30);

    this.menuItems = [];
    const playY = this.canvasHeight / 2 + 20;
    const itemWidth = 160;
    const itemHeight = 36;

    this.drawMenuItem(ctx, 'PLAY', this.canvasWidth / 2 - itemWidth / 2, playY, itemWidth, itemHeight);

    ctx.font = '6px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.fillText('ARROW KEYS / WASD TO MOVE', this.canvasWidth / 2, this.canvasHeight / 2 + 100);
    ctx.fillText('TAP LEFT TO MOVE, RIGHT TO SHOOT', this.canvasWidth / 2, this.canvasHeight / 2 + 115);
    ctx.fillText('B / TAP BOTTOM TO BOMB', this.canvasWidth / 2, this.canvasHeight / 2 + 130);

    ctx.restore();
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

  renderGameOver(ctx: CanvasRenderingContext2D, score: number, isNewHighScore: boolean) {
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

    this.menuItems = [];
    const startY = this.canvasHeight / 2 + 20;
    const itemWidth = 160;
    const itemHeight = 36;
    const gap = 12;

    this.drawMenuItem(ctx, 'RESTART', this.canvasWidth / 2 - itemWidth / 2, startY, itemWidth, itemHeight);
    this.drawMenuItem(ctx, 'EXIT', this.canvasWidth / 2 - itemWidth / 2, startY + itemHeight + gap, itemWidth, itemHeight);

    ctx.restore();
  }

  private drawMenuItem(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, width: number, height: number) {
    const isHovered = this.hoveredItem === label;

    ctx.fillStyle = isHovered ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = isHovered ? CONFIG.COLORS.PLAYER : '#2A2D3A';
    ctx.lineWidth = 1;

    const radius = 4;
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

    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = isHovered ? CONFIG.COLORS.PLAYER : CONFIG.COLORS.TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2);
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
