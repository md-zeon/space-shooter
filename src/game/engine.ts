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
import { WaveManager } from './wave';
import { BossManager } from './boss';

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
  private waves: WaveManager;
  private boss: BossManager;

  private state: GameState = 'menu';
  private score: number = 0;
  private level: number = 1;
  private highScore: number = 0;
  private isNewHighScore: boolean = false;

  private lastTime: number = 0;
  private accumulator: number = 0;
  private animationId: number = 0;
  private pauseBtnBounds = { x: 0, y: 0, width: 0, height: 0 };

  // Bomb
  private bombActive: boolean = false;
  private bombTimer: number = 0;

  // Chain
  private chain: number = 0;
  private chainTimer: number = 0;

  // Announcements
  private waveAnnounceTimer: number = 0;
  private warningTimer: number = 0;
  private warningActive: boolean = false;

  // Boss defeat tracking
  private bossDefeatTimer: number = 0;

  constructor() {
    this.input = new InputManager();
    this.bullets = new BulletPool();
    this.enemies = new EnemyManager();
    this.particles = new ParticleSystem();
    this.powerUps = new PowerUpManager();
    this.audio = new AudioManager();
    this.renderer = new Renderer();
    this.waves = new WaveManager();
    this.boss = new BossManager();
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
      if (!this.particles.isHitstopped()) {
        this.updatePlayer(deltaTime);
        this.updateBullets(deltaTime);
        this.updateEnemies(deltaTime);
        this.updateBoss(deltaTime);
        this.updatePowerUps(deltaTime);
        this.updateBomb(deltaTime);
        this.updateChain(deltaTime);
        this.checkCollisions();
        this.checkWaveAnnouncements();
        this.checkWarning();
        this.checkBossDefeat(deltaTime);
      }
      this.updateParticles(deltaTime);
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
          if (item?.id === 'PLAY') this.startGame();
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
        // Bomb
        if (this.input.isKeyJustPressed('b') || this.input.isKeyJustPressed('B')) {
          this.activateBomb();
        }
        break;

      case 'paused':
        if (click) {
          const item = this.renderer.hitTestMenu(click.x, click.y);
          if (item?.id === 'RESUME') this.state = 'playing';
          else if (item?.id === 'RESTART') this.startGame();
          else if (item?.id === 'EXIT') this.state = 'menu';
        }
        if (this.input.isKeyJustPressed('Escape')) this.state = 'playing';
        if (this.input.isKeyJustPressed(' ') || this.input.isKeyJustPressed('Enter')) this.state = 'playing';
        break;

      case 'gameover':
        if (click) {
          const item = this.renderer.hitTestMenu(click.x, click.y);
          if (item?.id === 'RESTART') this.startGame();
          else if (item?.id === 'EXIT') this.state = 'menu';
        }
        if (this.input.isKeyJustPressed(' ') || this.input.isKeyJustPressed('Enter')) this.startGame();
        break;
    }

    if (this.input.isKeyDown('m')) this.audio.toggleMute();
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

    this.enemies.setPlayerPosition(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );

    if (this.input.isShootingActive()) this.shoot();
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

    const lvl = this.player.powerLevel;
    if (lvl >= 2) {
      const l = this.bullets.acquire(true);
      l.x = this.player.x - 5; l.y = this.player.y + 10;
      const r = this.bullets.acquire(true);
      r.x = this.player.x + this.player.width - 5; r.y = this.player.y + 10;
    }
    if (lvl >= 3) {
      const l = this.bullets.acquire(true);
      l.x = this.player.x - 2; l.y = this.player.y + 15;
      l.vx = -1.5; l.vy = -CONFIG.BULLET_SPEED;
      const r = this.bullets.acquire(true);
      r.x = this.player.x + this.player.width - 2; r.y = this.player.y + 15;
      r.vx = 1.5; r.vy = -CONFIG.BULLET_SPEED;
    }
    if (lvl >= 4) {
      const c = this.bullets.acquire(true);
      c.x = this.player.x + this.player.width / 2 - 2;
      c.y = this.player.y - 5;
    }
    if (lvl >= 5) {
      for (let i = -2; i <= 2; i++) {
        if (i === 0) continue;
        const b = this.bullets.acquire(true);
        b.x = this.player.x + this.player.width / 2 - 2;
        b.y = this.player.y + 5;
        b.vx = i * 1.2;
        b.vy = -CONFIG.BULLET_SPEED;
      }
    }
  }

  private activateBomb() {
    if (this.player.bombs <= 0 || this.bombActive) return;
    this.player.bombs--;
    this.bombActive = true;
    this.bombTimer = CONFIG.BOMB_DURATION;
    this.audio.playBomb();

    this.particles.flash('#FFFFFF', 0.7);
    this.particles.addShake(10);

    // Kill all enemy bullets
    const bullets = this.bullets.getActive();
    for (const b of bullets) {
      if (!b.isPlayer && b.active) {
        b.active = false;
        this.particles.emit(b.x, b.y, 3, CONFIG.COLORS.BULLET_ENEMY, { speed: 2, size: 1 });
      }
    }

    // Damage all enemies
    const enemies = this.enemies.getActive();
    for (const e of enemies) {
      if (!e.active) continue;
      e.health -= 5;
      if (e.health <= 0) {
        this.onEnemyKilled(e);
      }
    }

    // Damage boss
    if (this.boss.isBossActive()) {
      this.boss.takeDamage(10);
    }
  }

  private updateBomb(deltaTime: number) {
    if (!this.bombActive) return;
    this.bombTimer -= deltaTime * 1000;

    if (this.bombTimer <= 0) {
      this.bombActive = false;
      return;
    }

    // Continuous damage
    const enemies = this.enemies.getActive();
    for (const e of enemies) {
      if (!e.active) continue;
      if (Math.random() < 0.1) {
        e.health -= 1;
        if (e.health <= 0) this.onEnemyKilled(e);
      }
    }
  }

  private updateBullets(deltaTime: number) {
    this.bullets.update(deltaTime, CONFIG.HEIGHT);
  }

  private updateEnemies(deltaTime: number) {
    const requests = this.enemies.update(deltaTime, CONFIG.WIDTH, CONFIG.HEIGHT);
    for (const req of requests) {
      this.bullets.acquireAngled(req.x, req.y, req.angle, req.speed, req.type);
    }
  }

  private updateBoss(deltaTime: number) {
    if (this.boss.isBossActive()) {
      const requests = this.boss.update(deltaTime, CONFIG.WIDTH, this.player.x + this.player.width / 2);
      for (const req of requests) {
        this.bullets.acquireAngled(req.x, req.y, req.angle, req.speed, req.type);
      }
    }
  }

  private updatePowerUps(deltaTime: number) {
    this.powerUps.update(deltaTime, CONFIG.WIDTH, CONFIG.HEIGHT);
  }

  private updateParticles(deltaTime: number) {
    this.renderer.update(deltaTime);
    this.particles.update(deltaTime);
  }

  private updateChain(deltaTime: number) {
    if (this.chain > 0) {
      this.chainTimer -= deltaTime * 1000;
      if (this.chainTimer <= 0) {
        this.chain = 0;
      }
    }
  }

  private checkCollisions() {
    const bullets = this.bullets.getActive();
    const enemies = this.enemies.getActive();

    // Player bullets vs enemies
    for (const bullet of bullets) {
      if (!bullet.isPlayer || !bullet.active) continue;

      for (const enemy of enemies) {
        if (!enemy.active) continue;

        if (checkCollision(
          { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
          { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height }
        )) {
          enemy.health--;
          enemy.flashTimer = 100;
          bullet.active = false;
          this.audio.playEnemyHit();

          if (enemy.health <= 0) {
            this.onEnemyKilled(enemy);
          }

          this.particles.emit(
            bullet.x + bullet.width / 2, bullet.y,
            3, CONFIG.COLORS.BULLET_PLAYER,
            { speed: 2, size: 1.5 }
          );
        }
      }

      // Player bullets vs boss
      if (this.boss.isBossActive()) {
        const boss = this.boss.getBoss();
        if (boss && checkCollision(
          { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
          { x: boss.x, y: boss.y, width: boss.width, height: boss.height }
        )) {
          bullet.active = false;
          const died = this.boss.takeDamage(1);
          this.audio.playBossHit();
          this.particles.emit(
            bullet.x, bullet.y,
            4, '#FFFFFF',
            { speed: 3, size: 2 }
          );
          if (died) this.onBossDefeated();
        }
      }
    }

    // Enemy bullets vs player
    if (!this.player.isInvincible && !this.bombActive) {
      for (const bullet of bullets) {
        if (bullet.isPlayer || !bullet.active) continue;

        if (checkCollision(
          { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
          { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height }
        )) {
          this.onPlayerHit();
          bullet.active = false;
        }
      }
    }

    // Enemies vs player
    if (!this.player.isInvincible && !this.bombActive) {
      for (const enemy of enemies) {
        if (!enemy.active) continue;

        if (checkCollision(
          { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height },
          { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height }
        )) {
          this.onPlayerHit();
          this.onEnemyKilled(enemy);
        }
      }
    }

    // Boss vs player
    if (!this.player.isInvincible && !this.bombActive && this.boss.isBossActive()) {
      const boss = this.boss.getBoss();
      if (boss && checkCollision(
        { x: boss.x, y: boss.y, width: boss.width, height: boss.height },
        { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height }
      )) {
        this.onPlayerHit();
      }
    }

    // Power-ups vs player
    const powerUps = this.powerUps.getActive();
    for (const powerUp of powerUps) {
      if (!powerUp.active) continue;

      if (checkCollision(
        { x: powerUp.x, y: powerUp.y, width: powerUp.size, height: powerUp.size },
        { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height }
      )) {
        this.onPowerUpCollected(powerUp);
        this.powerUps.remove(powerUp);
      }
    }
  }

  private onEnemyKilled(enemy: { x: number; y: number; width: number; height: number; health?: number; type?: string }) {
    this.chain++;
    this.chainTimer = CONFIG.CHAIN_TIMEOUT;

    const chainMultiplier = Math.min(this.chain, 10);
    this.score += CONFIG.SCORE_PER_ENEMY * this.level * chainMultiplier;

    if (enemy.type === 'elite') {
      this.audio.playExplosion();
      this.particles.emitExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 1.5);
    } else {
      this.audio.playExplosionSmall();
      this.particles.emitExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 0.8);
    }

    // Power-up drops from elite enemies
    if (enemy.type === 'elite' && Math.random() < 0.4) {
      this.powerUps.spawnAt(enemy.x + enemy.width / 2, enemy.y, 'weapon');
    }
  }

  private onBossDefeated() {
    this.boss.clear();
    this.bullets.clear();
    this.score += CONFIG.SCORE_BONUS_BOSS * this.level;
    this.audio.playBossDeath();
    this.particles.emitBigExplosion(CONFIG.WIDTH / 2, 100);
    this.bossDefeatTimer = 3000;
  }

  private checkBossDefeat(deltaTime: number) {
    if (this.bossDefeatTimer > 0) {
      this.bossDefeatTimer -= deltaTime * 1000;
      if (this.bossDefeatTimer <= 0) {
        this.waves.onBossDefeated();
      }
    }
  }

  private onPlayerHit() {
    this.player.lives--;
    this.chain = 0;
    this.audio.playDamage();
    this.particles.addShake(8);
    this.particles.flash('#FF0000', 0.3);

    if (this.player.lives <= 0) {
      this.gameOver();
    } else {
      this.player.isInvincible = true;
      this.player.invincibleTimer = CONFIG.INVINCIBLE_DURATION;
      this.player.powerLevel = Math.max(1, this.player.powerLevel - 1);

      this.particles.emit(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        15, CONFIG.COLORS.PLAYER,
        { speed: 4, size: 3 }
      );
    }
  }

  private onPowerUpCollected(powerUp: { type: string }) {
    this.audio.playPowerUp();
    this.particles.emit(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      15, CONFIG.COLORS.POWERUP_SCORE,
      { speed: 4, size: 2 }
    );

    switch (powerUp.type) {
      case 'shield':
        this.player.isInvincible = true;
        this.player.invincibleTimer = CONFIG.POWERUP_DURATION;
        break;
      case 'weapon':
        this.player.powerLevel = Math.min(CONFIG.MAX_POWER_LEVEL, this.player.powerLevel + 1);
        break;
      case 'health':
        this.player.lives = Math.min(CONFIG.MAX_LIVES, this.player.lives + 1);
        break;
      case 'score':
        this.score += 500 * this.level;
        break;
      case 'bomb':
        this.player.bombs = Math.min(5, this.player.bombs + 1);
        break;
    }
  }

  private checkWaveAnnouncements() {
    const announcement = this.waves.getWaveAnnouncement();
    if (announcement) {
      this.waveAnnounceTimer = 2000;
      if (announcement.isBoss) {
        this.warningActive = true;
        this.warningTimer = 2500;
        this.audio.playWarning();
      } else {
        this.audio.playWaveComplete();
      }
    }
  }

  private checkWarning() {
    if (this.warningActive) {
      this.warningTimer -= CONFIG.FIXED_DT * 1000;
      if (this.warningTimer <= 0) {
        this.warningActive = false;
        this.boss.spawnBoss(this.waves.getDifficulty());
      }
    }
  }

  private startGame() {
    this.state = 'playing';
    this.score = 0;
    this.level = 1;
    this.chain = 0;
    this.chainTimer = 0;
    this.isNewHighScore = false;
    this.bombActive = false;
    this.bombTimer = 0;
    this.waveAnnounceTimer = 0;
    this.warningActive = false;
    this.warningTimer = 0;
    this.bossDefeatTimer = 0;
    this.player = createPlayer(CONFIG.WIDTH, CONFIG.HEIGHT);
    this.bullets.clear();
    this.enemies.clear();
    this.powerUps.clear();
    this.particles.clear();
    this.waves.reset();
    this.boss.clear();
    this.audio.resume();
    this.waves.startNextWave(CONFIG.WIDTH);
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
      if (saved) this.highScore = parseInt(saved, 10) || 0;
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
      if (saved === 'auto' || saved === 'manual') this.input.setShootMode(saved);
    } catch {}
  }

  private saveShootMode(mode: 'auto' | 'manual') {
    try {
      localStorage.setItem('space-shooter-shootmode', mode);
    } catch {}
  }

  private render() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Hitstop freeze
    if (this.particles.isHitstopped() && this.state === 'playing') {
      this.renderGameFrame(ctx);
      return;
    }

    ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Screen shake
    const shake = this.particles.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    this.renderer.renderBackground(ctx);
    this.renderer.renderStars(ctx);

    switch (this.state) {
      case 'menu':
        this.renderer.renderMainMenu(ctx, this.highScore);
        break;

      case 'playing':
        this.renderGameFrame(ctx);
        break;

      case 'paused':
        this.renderGameFrame(ctx);
        this.renderer.renderPauseScreen(ctx);
        break;

      case 'gameover':
        this.renderGameFrame(ctx);
        this.renderer.renderGameOver(ctx, this.score, this.isNewHighScore);
        break;
    }

    ctx.restore();

    // Hover state
    const mouse = this.input.getMousePosition();
    if (mouse) {
      const item = this.renderer.hitTestMenu(mouse.x, mouse.y);
      this.renderer.setHoveredItem(item?.id ?? null);
    } else {
      this.renderer.setHoveredItem(null);
    }
  }

  private renderGameFrame(ctx: CanvasRenderingContext2D) {
    this.enemies.render(ctx);
    if (this.boss.getBoss()) {
      this.renderBoss(ctx);
    }
    this.powerUps.render(ctx);

    // Render enemy bullets first, then player bullets on top
    const bullets = this.bullets.getActive();
    ctx.save();
    for (const bullet of bullets) {
      if (!bullet.active) continue;
      ctx.save();
      const color = bullet.isPlayer ? CONFIG.COLORS.BULLET_PLAYER : CONFIG.COLORS.BULLET_ENEMY;
      ctx.shadowColor = color;
      ctx.shadowBlur = bullet.isPlayer ? 8 : 6;
      ctx.fillStyle = color;
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      ctx.restore();
    }
    ctx.restore();

    renderPlayer(ctx, this.player, performance.now());

    // Bomb effect
    if (this.bombActive) {
      ctx.save();
      const progress = 1 - this.bombTimer / CONFIG.BOMB_DURATION;
      const radius = CONFIG.BOMB_RADIUS * progress;
      const alpha = 0.3 * (1 - progress);
      ctx.strokeStyle = CONFIG.COLORS.POWERUP_BOMB;
      ctx.lineWidth = 3;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        radius, 0, Math.PI * 2
      );
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = CONFIG.COLORS.POWERUP_BOMB;
      ctx.fill();
      ctx.restore();
    }

    this.particles.render(ctx);

    // HUD
    this.renderer.renderHUD(
      ctx, this.score, this.player.lives,
      this.waves.getWaveNumber(), this.highScore,
      this.input.getShootMode(), this.player.powerLevel,
      this.player.bombs, this.chain
    );

    // Boss HP bar
    const boss = this.boss.getBoss();
    if (boss && (boss.active || boss.dying)) {
      this.renderer.renderBossHP(ctx, boss);
    }

    this.pauseBtnBounds = this.renderer.renderPauseButton(ctx);

    // Wave announcement
    if (this.waveAnnounceTimer > 0) {
      this.waveAnnounceTimer -= CONFIG.FIXED_DT * 1000;
      this.renderer.renderWaveAnnouncement(
        ctx,
        this.waves.getWaveNumber(),
        this.waves.isBossWaveNow(),
        this.waveAnnounceTimer
      );
    }

    // Warning
    if (this.warningActive) {
      this.renderer.renderWarning(ctx, this.warningTimer);
    }
  }

  private renderBoss(ctx: CanvasRenderingContext2D) {
    const boss = this.boss.getBoss();
    if (!boss) return;

    ctx.save();

    if (boss.phaseTransitioning && Math.floor(boss.flashTimer / 80) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (boss.dying) {
      const flash = Math.floor(boss.deathTimer / 100) % 2;
      ctx.globalAlpha = flash ? 0.5 : 1;
    }

    const cx = boss.x + boss.width / 2;
    const cy = boss.y + boss.height / 2;

    // Glow
    ctx.shadowColor = CONFIG.COLORS.BOSS_GLOW;
    ctx.shadowBlur = 25;

    // Main body
    ctx.fillStyle = CONFIG.COLORS.BOSS;
    ctx.beginPath();
    ctx.moveTo(cx, boss.y);
    ctx.lineTo(boss.x + boss.width, boss.y + boss.height * 0.4);
    ctx.lineTo(boss.x + boss.width - 10, boss.y + boss.height);
    ctx.lineTo(boss.x + 10, boss.y + boss.height);
    ctx.lineTo(boss.x, boss.y + boss.height * 0.4);
    ctx.closePath();
    ctx.fill();

    // Wings
    ctx.fillStyle = '#CC0044';
    ctx.beginPath();
    ctx.moveTo(boss.x - 10, cy);
    ctx.lineTo(boss.x + 15, boss.y + boss.height * 0.6);
    ctx.lineTo(boss.x - 15, boss.y + boss.height * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(boss.x + boss.width + 10, cy);
    ctx.lineTo(boss.x + boss.width - 15, boss.y + boss.height * 0.6);
    ctx.lineTo(boss.x + boss.width + 15, boss.y + boss.height * 0.8);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = boss.phase === 3 ? '#FF00FF' : boss.phase === 2 ? '#FF6600' : '#FFFFFF';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(cx, boss.y + boss.height * 0.35, 8, 0, Math.PI * 2);
    ctx.fill();

    // Inner eye
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx, boss.y + boss.height * 0.35, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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
