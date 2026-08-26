import { CONFIG } from './config';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

export class Renderer {
  private stars: Star[] = [];
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

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
    // Gradient background
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
    highScore: number
  ) {
    ctx.save();

    // Score
    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE`, 10, 25);
    ctx.fillStyle = CONFIG.COLORS.POWERUP_SCORE;
    ctx.fillText(`${score.toString().padStart(8, '0')}`, 10, 45);

    // High Score
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.textAlign = 'center';
    ctx.fillText(`HIGH SCORE`, this.canvasWidth / 2, 20);
    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.fillText(`${highScore.toString().padStart(8, '0')}`, this.canvasWidth / 2, 38);

    // Level
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.textAlign = 'right';
    ctx.fillText(`WAVE ${level}`, this.canvasWidth - 10, 25);

    // Lives
    ctx.textAlign = 'right';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.fillText(`LIVES`, this.canvasWidth - 10, 50);
    for (let i = 0; i < lives; i++) {
      ctx.fillStyle = CONFIG.COLORS.PLAYER;
      ctx.fillRect(this.canvasWidth - 20 - i * 18, 58, 12, 12);
    }

    ctx.restore();
  }

  renderGameOver(
    ctx: CanvasRenderingContext2D,
    score: number,
    isNewHighScore: boolean
  ) {
    ctx.save();

    // Overlay
    ctx.fillStyle = 'rgba(5, 10, 26, 0.8)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Game Over text
    ctx.font = '24px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.ENEMY;
    ctx.textAlign = 'center';
    ctx.shadowColor = CONFIG.COLORS.ENEMY;
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', this.canvasWidth / 2, this.canvasHeight / 2 - 40);

    // Score
    ctx.font = '14px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.shadowBlur = 0;
    ctx.fillText(`SCORE: ${score}`, this.canvasWidth / 2, this.canvasHeight / 2 + 20);

    // New High Score
    if (isNewHighScore) {
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = CONFIG.COLORS.POWERUP_SCORE;
      ctx.fillText('NEW HIGH SCORE!', this.canvasWidth / 2, this.canvasHeight / 2 + 50);
    }

    // Restart prompt
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    const alpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillText('PRESS SPACE TO RESTART', this.canvasWidth / 2, this.canvasHeight / 2 + 90);

    ctx.restore();
  }

  renderStartScreen(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Title
    ctx.font = '20px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.textAlign = 'center';
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 20;
    ctx.fillText('SPACE', this.canvasWidth / 2, this.canvasHeight / 2 - 60);
    ctx.fillText('SHOOTER', this.canvasWidth / 2, this.canvasHeight / 2 - 30);

    // Instructions
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.shadowBlur = 0;
    ctx.fillText('ARROW KEYS / WASD TO MOVE', this.canvasWidth / 2, this.canvasHeight / 2 + 30);
    ctx.fillText('SPACE TO SHOOT', this.canvasWidth / 2, this.canvasHeight / 2 + 50);
    ctx.fillText('M TO MUTE', this.canvasWidth / 2, this.canvasHeight / 2 + 70);

    // Start prompt
    const alpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.fillText('PRESS SPACE TO START', this.canvasWidth / 2, this.canvasHeight / 2 + 120);

    ctx.restore();
  }

  renderPauseScreen(ctx: CanvasRenderingContext2D) {
    ctx.save();

    ctx.fillStyle = 'rgba(5, 10, 26, 0.7)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.font = '16px "Press Start 2P"';
    ctx.fillStyle = CONFIG.COLORS.TEXT;
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', this.canvasWidth / 2, this.canvasHeight / 2);

    ctx.font = '8px "Press Start 2P"';
    const alpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillText('PRESS ESC TO RESUME', this.canvasWidth / 2, this.canvasHeight / 2 + 40);

    ctx.restore();
  }
}
