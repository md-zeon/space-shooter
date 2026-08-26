import { CONFIG } from './config';

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

  init(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.initStars();
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 100; i++) {
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
    level: number,
    highScore: number,
    shootMode: 'auto' | 'manual'
  ) {
    ctx.save();

    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE`, 10, 25);
    ctx.fillStyle = CONFIG.COLORS.POWERUP_SCORE;
    ctx.fillText(`${score.toString().padStart(8, '0')}`, 10, 45);

    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.textAlign = 'center';
    ctx.fillText(`HIGH SCORE`, this.canvasWidth / 2, 20);
    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.fillText(`${highScore.toString().padStart(8, '0')}`, this.canvasWidth / 2, 38);

    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.textAlign = 'right';
    ctx.fillText(`WAVE ${level}`, this.canvasWidth - 10, 25);

    ctx.textAlign = 'right';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.fillText(`LIVES`, this.canvasWidth - 10, 50);
    for (let i = 0; i < lives; i++) {
      ctx.fillStyle = CONFIG.COLORS.PLAYER;
      ctx.fillRect(this.canvasWidth - 20 - i * 18, 58, 12, 12);
    }

    ctx.font = '6px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.textAlign = 'left';
    ctx.fillText(`${shootMode === 'auto' ? 'AUTO' : 'MANUAL'}`, 10, this.canvasHeight - 10);

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

    // Pause bars
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

    // Title
    ctx.font = '20px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.textAlign = 'center';
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 20;
    ctx.fillText('SPACE', this.canvasWidth / 2, this.canvasHeight / 2 - 100);
    ctx.fillText('SHOOTER', this.canvasWidth / 2, this.canvasHeight / 2 - 70);

    // High score
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.shadowBlur = 0;
    ctx.fillText(`HIGH SCORE: ${highScore.toString().padStart(8, '0')}`, this.canvasWidth / 2, this.canvasHeight / 2 - 30);

    // Menu items
    this.menuItems = [];
    const playY = this.canvasHeight / 2 + 20;
    const itemWidth = 160;
    const itemHeight = 36;

    this.drawMenuItem(ctx, 'PLAY', this.canvasWidth / 2 - itemWidth / 2, playY, itemWidth, itemHeight);

    // Instructions
    ctx.font = '6px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT_MUTED;
    ctx.fillText('ARROW KEYS / WASD TO MOVE', this.canvasWidth / 2, this.canvasHeight / 2 + 100);
    ctx.fillText('TAP LEFT TO MOVE, RIGHT TO SHOOT', this.canvasWidth / 2, this.canvasHeight / 2 + 115);

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

    // Menu items
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
    isNewHighScore: boolean
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

    // Menu items
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

    // Button background
    ctx.fillStyle = isHovered ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = isHovered ? CONFIG.COLORS.PLAYER : '#2A2D3A';
    ctx.lineWidth = 1;

    // Rounded rect
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

    // Label
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = isHovered ? CONFIG.COLORS.PLAYER : CONFIG.COLORS.TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2);
    ctx.textBaseline = 'alphabetic';

    // Store menu item for hit detection
    this.menuItems.push({ id: label, label, x, y, width, height });
  }

  setHoveredItem(id: string | null) {
    this.hoveredItem = id;
  }

  getMenuItems(): MenuItem[] {
    return this.menuItems;
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
