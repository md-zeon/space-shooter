import { CONFIG } from './config';
import { InputManager } from './input';
import { Player, createPlayer, updatePlayer, renderPlayer } from './player';
import { BulletPool } from './bullet';
import { EnemyManager } from './enemy';
import { ParticleSystem } from './particles';
import { PowerUpManager } from './powerup';
import { AudioManager } from './audio';
import { Renderer } from './renderer';
import { checkCollision } from './collision';

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private input: InputManager;
  private player!: Player;
  private bullets: BulletPool;
  private enemies: EnemyManager;
  private particles: ParticleSystem;
  private powerUps: PowerUpManager;
  private audio: AudioManager;
  private renderer: Renderer;

  private state: GameState = 'menu';
  private score: number = 0;
  private level: number = 1;
  private highScore: number = 0;
  private isNewHighScore: boolean = false;

  private lastTime: number = 0;
  private accumulator: number = 0;
  private animationId: number = 0;
  private pauseBtnBounds = { x: 0, y: 0, width: 0, height: 0 };

  constructor() {
    this.input = new InputManager();
    this.bullets = new BulletPool();
    this.enemies = new EnemyManager();
    this.particles = new ParticleSystem();
    this.powerUps = new PowerUpManager();
    this.audio = new AudioManager();
    this.renderer = new Renderer();
  }

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new Error('Canvas context not available');

    this.canvas.width = CONFIG.WIDTH;
    this.canvas.height = CONFIG.HEIGHT;

    this.input.init(canvas);
    this.audio.init();
    this.renderer.init(CONFIG.WIDTH, CONFIG.HEIGHT);

    this.loadHighScore();
    this.loadShootMode();

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  destroy() {
    this.input.destroy();
    cancelAnimationFrame(this.animationId);
  }

  private loop = (currentTime: number) => {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.accumulator += deltaTime;

    while (this.accumulator >= CONFIG.FIXED_DT) {
      this.fixedUpdate(CONFIG.FIXED_DT);
      this.accumulator -= CONFIG.FIXED_DT;
    }

    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private fixedUpdate(deltaTime: number) {
    this.handleInput();

    if (this.state === 'playing') {
      this.updatePlayer(deltaTime);
      this.updateBullets(deltaTime);
      this.updateEnemies(deltaTime);
      this.updatePowerUps(deltaTime);
      this.updateParticles(deltaTime);
      this.checkCollisions();
      this.checkLevelUp();
    } else {
      this.updateParticles(deltaTime);
    }

    this.input.clearJustPressed();
    this.input.updateShootingState();
  }

  private handleInput() {
    const click = this.input.consumeClick();

    switch (this.state) {
      case 'menu':
        if (click) {
          const item = this.renderer.hitTestMenu(click.x, click.y);
          if (item?.id === 'PLAY') {
            this.startGame();
          }
        }
        if (this.input.isKeyJustPressed(' ') || this.input.isKeyJustPressed('Enter')) {
          this.startGame();
        }
        break;

      case 'playing':
        if (click) {
          const { x, y, width, height } = this.pauseBtnBounds;
          if (this.renderer.hitTestPauseButton(click.x, click.y, x, y, width, height)) {
            this.state = 'paused';
            break;
          }
        }
        if (this.input.isKeyJustPressed('Escape') || this.input.consumeBackButton()) {
          this.state = 'paused';
        }
        break;

      case 'paused':
        if (click) {
          const item = this.renderer.hitTestMenu(click.x, click.y);
          if (item?.id === 'RESUME') {
            this.state = 'playing';
          } else if (item?.id === 'RESTART') {
            this.startGame();
          } else if (item?.id === 'EXIT') {
            this.state = 'menu';
          }
        }
        if (this.input.isKeyJustPressed('Escape')) {
          this.state = 'playing';
        }
        if (this.input.isKeyJustPressed(' ') || this.input.isKeyJustPressed('Enter')) {
          this.state = 'playing';
        }
        break;

      case 'gameover':
        if (click) {
          const item = this.renderer.hitTestMenu(click.x, click.y);
          if (item?.id === 'RESTART') {
            this.startGame();
          } else if (item?.id === 'EXIT') {
            this.state = 'menu';
          }
        }
        if (this.input.isKeyJustPressed(' ') || this.input.isKeyJustPressed('Enter')) {
          this.startGame();
        }
        break;
    }

    if (this.input.isKeyDown('m')) {
      this.audio.toggleMute();
    }
  }

  private updatePlayer(deltaTime: number) {
    const touchDelta = this.input.getTouchDelta();

    updatePlayer(
      this.player,
      {
        left: this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('a'),
        right: this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('d'),
        up: this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('w'),
        down: this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('s'),
        touchDx: touchDelta.dx,
        touchDy: touchDelta.dy,
      },
      deltaTime,
      CONFIG.WIDTH,
      CONFIG.HEIGHT
    );

    if (this.input.isShootingActive()) {
      this.shoot();
    }
  }

  private shoot() {
    const now = performance.now();
    if (now - this.player.lastFireTime < this.player.fireRate) return;

    this.player.lastFireTime = now;
    this.audio.resume();
    this.audio.playShoot();

    const bullet = this.bullets.acquire(true);
    bullet.x = this.player.x + this.player.width / 2 - bullet.width / 2;
    bullet.y = this.player.y;

    if (this.player.powerLevel >= 2) {
      const leftBullet = this.bullets.acquire(true);
      leftBullet.x = this.player.x - 5;
      leftBullet.y = this.player.y + 10;

      const rightBullet = this.bullets.acquire(true);
      rightBullet.x = this.player.x + this.player.width - 5;
      rightBullet.y = this.player.y + 10;
    }
  }

  private updateBullets(deltaTime: number) {
    this.bullets.update(deltaTime, CONFIG.HEIGHT);
  }

  private updateEnemies(deltaTime: number) {
    const bulletRequests = this.enemies.update(deltaTime, CONFIG.WIDTH, CONFIG.HEIGHT);
    for (const req of bulletRequests) {
      this.bullets.acquireAngled(req.x, req.y, req.angle);
    }
  }

  private updatePowerUps(deltaTime: number) {
    this.powerUps.update(deltaTime, CONFIG.HEIGHT);
  }

  private updateParticles(deltaTime: number) {
    this.renderer.update(deltaTime);
    this.particles.update(deltaTime);
  }

  private checkCollisions() {
    const bullets = this.bullets.getActive();
    const enemies = this.enemies.getActive();

    for (const bullet of bullets) {
      if (!bullet.isPlayer || !bullet.active) continue;

      for (const enemy of enemies) {
        if (!enemy.active) continue;

        if (
          checkCollision(
            { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
            { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height }
          )
        ) {
          enemy.health--;
          bullet.active = false;

          if (enemy.health <= 0) {
            this.onEnemyKilled(enemy);
          }

          this.particles.emit(
            bullet.x + bullet.width / 2,
            bullet.y,
            5,
            CONFIG.COLORS.BULLET_PLAYER,
            { speed: 2, size: 2 }
          );
        }
      }
    }

    if (!this.player.isInvincible) {
      for (const bullet of bullets) {
        if (bullet.isPlayer || !bullet.active) continue;

        if (
          checkCollision(
            { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
            {
              x: this.player.x,
              y: this.player.y,
              width: this.player.width,
              height: this.player.height,
            }
          )
        ) {
          this.onPlayerHit();
          bullet.active = false;
        }
      }
    }

    if (!this.player.isInvincible) {
      for (const enemy of enemies) {
        if (!enemy.active) continue;

        if (
          checkCollision(
            { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height },
            {
              x: this.player.x,
              y: this.player.y,
              width: this.player.width,
              height: this.player.height,
            }
          )
        ) {
          this.onPlayerHit();
          this.onEnemyKilled(enemy);
        }
      }
    }

    const powerUps = this.powerUps.getActive();
    for (const powerUp of powerUps) {
      if (!powerUp.active) continue;

      if (
        checkCollision(
          { x: powerUp.x, y: powerUp.y, width: powerUp.size, height: powerUp.size },
          {
            x: this.player.x,
            y: this.player.y,
            width: this.player.width,
            height: this.player.height,
          }
        )
      ) {
        this.onPowerUpCollected(powerUp);
        this.powerUps.remove(powerUp);
      }
    }
  }

  private onEnemyKilled(enemy: { x: number; y: number; width: number; height: number; active: boolean }) {
    enemy.active = false;
    this.enemies.remove(enemy as any);

    this.score += CONFIG.SCORE_PER_ENEMY * this.level;
    this.audio.playExplosion();

    this.particles.emit(
      enemy.x + enemy.width / 2,
      enemy.y + enemy.height / 2,
      15,
      CONFIG.COLORS.ENEMY,
      { speed: 4, size: 3 }
    );
  }

  private onPlayerHit() {
    this.player.lives--;
    this.audio.playDamage();

    if (this.player.lives <= 0) {
      this.gameOver();
    } else {
      this.player.isInvincible = true;
      this.player.invincibleTimer = CONFIG.INVINCIBLE_DURATION;

      this.particles.emit(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        10,
        CONFIG.COLORS.PLAYER,
        { speed: 3, size: 2 }
      );
    }
  }

  private onPowerUpCollected(powerUp: { type: string }) {
    this.audio.playPowerUp();

    switch (powerUp.type) {
      case 'shield':
        this.player.isInvincible = true;
        this.player.invincibleTimer = CONFIG.POWERUP_DURATION;
        break;
      case 'weapon':
        this.player.powerLevel = Math.min(3, this.player.powerLevel + 1);
        break;
      case 'health':
        this.player.lives = Math.min(CONFIG.PLAYER_LIVES, this.player.lives + 1);
        break;
      case 'score':
        this.score += CONFIG.SCORE_MULTIPLIER_DURATION;
        break;
    }

    this.particles.emit(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      20,
      CONFIG.COLORS.POWERUP_SCORE,
      { speed: 5, size: 3 }
    );
  }

  private checkLevelUp() {
    const newLevel = Math.floor(this.score / 1000) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.enemies.setDifficulty(this.level);
    }
  }

  private render() {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    this.renderer.renderBackground(this.ctx);
    this.renderer.renderStars(this.ctx);

    switch (this.state) {
      case 'menu':
        this.renderer.renderMainMenu(this.ctx, this.highScore);
        break;

      case 'playing':
        this.enemies.render(this.ctx);
        this.powerUps.render(this.ctx);
        this.bullets.render(this.ctx);
        renderPlayer(this.ctx, this.player, performance.now());
        this.particles.render(this.ctx);
        this.renderer.renderHUD(
          this.ctx,
          this.score,
          this.player.lives,
          this.level,
          this.highScore,
          this.input.getShootMode()
        );
        this.pauseBtnBounds = this.renderer.renderPauseButton(this.ctx);
        break;

      case 'paused':
        this.enemies.render(this.ctx);
        this.powerUps.render(this.ctx);
        this.bullets.render(this.ctx);
        renderPlayer(this.ctx, this.player, performance.now());
        this.particles.render(this.ctx);
        this.renderer.renderHUD(
          this.ctx,
          this.score,
          this.player.lives,
          this.level,
          this.highScore,
          this.input.getShootMode()
        );
        this.renderer.renderPauseScreen(this.ctx);
        break;

      case 'gameover':
        this.enemies.render(this.ctx);
        this.powerUps.render(this.ctx);
        this.bullets.render(this.ctx);
        this.particles.render(this.ctx);
        this.renderer.renderGameOver(this.ctx, this.score, this.isNewHighScore);
        break;
    }

    // Update hover state for menu items
    const mouse = this.input.getMousePosition();
    if (mouse) {
      const item = this.renderer.hitTestMenu(mouse.x, mouse.y);
      this.renderer.setHoveredItem(item?.id ?? null);
    } else {
      this.renderer.setHoveredItem(null);
    }
  }

  private startGame() {
    this.state = 'playing';
    this.score = 0;
    this.level = 1;
    this.isNewHighScore = false;
    this.player = createPlayer(CONFIG.WIDTH, CONFIG.HEIGHT);
    this.bullets.clear();
    this.enemies.clear();
    this.powerUps.clear();
    this.particles.clear();
    this.audio.resume();
  }

  private gameOver() {
    this.state = 'gameover';
    this.audio.playGameOver();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.isNewHighScore = true;
      this.saveHighScore();
    }
  }

  private loadHighScore() {
    try {
      const saved = localStorage.getItem('space-shooter-highscore');
      if (saved) {
        this.highScore = parseInt(saved, 10) || 0;
      }
    } catch {}
  }

  private saveHighScore() {
    try {
      localStorage.setItem('space-shooter-highscore', this.highScore.toString());
    } catch {}
  }

  private loadShootMode() {
    try {
      const saved = localStorage.getItem('space-shooter-shootmode');
      if (saved === 'auto' || saved === 'manual') {
        this.input.setShootMode(saved);
      }
    } catch {}
  }

  private saveShootMode(mode: 'auto' | 'manual') {
    try {
      localStorage.setItem('space-shooter-shootmode', mode);
    } catch {}
  }

  toggleShootMode(): 'auto' | 'manual' {
    const current = this.input.getShootMode();
    const newMode = current === 'auto' ? 'manual' : 'auto';
    this.input.setShootMode(newMode);
    this.saveShootMode(newMode);
    return newMode;
  }

  getShootMode(): 'auto' | 'manual' {
    return this.input.getShootMode();
  }

  getState(): GameState {
    return this.state;
  }

  getScore(): number {
    return this.score;
  }
}
