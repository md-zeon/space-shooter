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
        this.updateWaveSpawning(deltaTime);
        this.updatePlayer(deltaTime);
        this.updateBullets(deltaTime);
        this.updateEnemies(deltaTime);
        this.updateBoss(deltaTime);
        this.updatePowerUps(deltaTime);
        this.updateBomb(deltaTime);
        this.updateChain(deltaTime);
        this.updateNarrow(deltaTime);
        this.updateLaser(deltaTime);
        this.checkCollisions();
        this.checkWaveAnnouncements();
        this.checkWarning();
        this.checkBossDefeat(deltaTime);
        if (this.waveAnnounceTimer > 0) {
          this.waveAnnounceTimer -= CONFIG.FIXED_DT * 1000;
        }
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

    if (this.input.isKeyJustPressed('m')) this.audio.toggleMute();
  }

  private updateWaveSpawning(deltaTime: number) {
    if (this.boss.isBossActive() || this.warningActive || this.bossDefeatTimer > 0) return;

    const activeEnemyCount = this.enemies.getActive().length;
    if (activeEnemyCount >= 30) return;

    const spawnCommands = this.waves.update(deltaTime, activeEnemyCount, CONFIG.WIDTH);

    this.enemies.setDifficulty(this.waves.getDifficulty());

    for (const cmd of spawnCommands) {
      this.enemies.spawnEnemy(
        cmd.type, cmd.x, cmd.y, cmd.speed,
        cmd.movementPattern, cmd.shootPattern,
        cmd.formationId, cmd.offsetX, cmd.offsetY
      );
    }

    if (this.waves.isBossWaveNow() && !this.boss.isBossActive() && !this.warningActive) {
      this.warningActive = true;
      this.warningTimer = 2500;
      this.audio.playWarning();
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

    this.enemies.setPlayerPosition(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );

    if (this.input.isShootingActive()) this.shoot();
  }

  private shoot() {
    const now = performance.now();
    if (now - this.player.lastFireTime < this.player.fireRate) return;
    if (this.player.laserActive) return;

    this.player.lastFireTime = now;
    this.audio.resume();
    this.audio.playShoot();

    const narrow = this.player.narrowTimer > 0;
    const bullet = this.bullets.acquire(true);
    bullet.x = this.player.x + this.player.width / 2 - bullet.width / 2;
    bullet.y = this.player.y;

    if (narrow) {
      const count = CONFIG.NARROW_BULLET_COUNT;
      const spread = CONFIG.NARROW_SPREAD;
      for (let i = 0; i < count; i++) {
        if (i === 0) continue;
        const b = this.bullets.acquire(true);
        b.x = this.player.x + this.player.width / 2 - 2;
        b.y = this.player.y + 5;
        const angle = -Math.PI / 2 + (i - (count - 1) / 2) * spread;
        b.vx = Math.cos(angle) * CONFIG.BULLET_SPEED * 0.3;
        b.vy = Math.sin(angle) * CONFIG.BULLET_SPEED;
      }
      return;
    }

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

    const bullets = this.bullets.getActive();
    for (const b of bullets) {
      if (!b.isPlayer && b.active) {
        b.active = false;
        this.particles.emit(b.x, b.y, 3, CONFIG.COLORS.BULLET_ENEMY, { speed: 2, size: 1 });
      }
    }

    const enemies = this.enemies.getActive();
    for (const e of enemies) {
      if (!e.active) continue;
      e.health -= 5;
      if (e.health <= 0) {
        this.onEnemyKilled(e);
      }
    }

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

  private updateNarrow(deltaTime: number) {
    if (this.player.narrowTimer > 0) {
      this.player.narrowTimer -= deltaTime * 1000;
      if (this.player.narrowTimer <= 0) {
        this.player.narrowTimer = 0;
      }
    }
  }

  private updateLaser(deltaTime: number) {
    if (this.player.powerLevel < CONFIG.MAX_POWER_LEVEL) {
      this.player.laserCharge = 0;
      this.player.laserActive = false;
      return;
    }

    if (this.player.laserActive) {
      this.player.laserTimer -= deltaTime * 1000;
      this.player.laserDmgTimer -= deltaTime * 1000;

      if (this.player.laserDmgTimer <= 0) {
        this.player.laserDmgTimer = CONFIG.LASER_TICK;
        this.dealLaserDamage();
      }

      if (this.player.laserTimer <= 0) {
        this.player.laserActive = false;
        this.player.laserCharge = 0;
      }
    } else {
      this.player.laserCharge += deltaTime * 1000;
      if (this.player.laserCharge >= CONFIG.LASER_CHARGE_TIME) {
        this.player.laserActive = true;
        this.player.laserTimer = CONFIG.LASER_DURATION;
        this.player.laserDmgTimer = 0;
        this.audio.playExplosion();
        this.particles.addShake(4);
      }
    }
  }

  private dealLaserDamage() {
    if (!this.player.laserActive) return;

    const lx = this.player.x + this.player.width / 2 - CONFIG.LASER_WIDTH / 2;
    const ly = 0;
    const lw = CONFIG.LASER_WIDTH;
    const lh = this.player.y;

    const enemies = this.enemies.getActive();
    for (const e of enemies) {
      if (!e.active) continue;
      if (checkCollision(
        { x: lx, y: ly, width: lw, height: lh },
        { x: e.x, y: e.y, width: e.width, height: e.height }
      )) {
        e.health -= CONFIG.LASER_DAMAGE;
        e.flashTimer = 50;
        if (e.health <= 0) this.onEnemyKilled(e);
      }
    }

    if (this.boss.isBossActive()) {
      const boss = this.boss.getBoss();
      if (boss && checkCollision(
        { x: lx, y: ly, width: lw, height: lh },
        { x: boss.x, y: boss.y, width: boss.width, height: boss.height }
      )) {
        this.boss.takeDamage(CONFIG.LASER_DAMAGE);
      }

      if (boss) {
        for (const m of boss.minions) {
          if (!m.active) continue;
          if (checkCollision(
            { x: lx, y: ly, width: lw, height: lh },
            { x: m.x, y: m.y, width: m.width, height: m.height }
          )) {
            const killed = this.boss.takeMinionDamage(m, CONFIG.LASER_DAMAGE);
            if (killed) {
              this.score += 50;
              this.particles.emitExplosion(m.x + m.width / 2, m.y + m.height / 2, 0.5);
            }
          }
        }
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
          this.bullets.release(bullet);
          this.audio.playEnemyHit();

          if (enemy.health <= 0) {
            this.onEnemyKilled(enemy);
          }

          this.particles.emit(
            bullet.x + bullet.width / 2, bullet.y,
            3, CONFIG.COLORS.BULLET_PLAYER,
            { speed: 2, size: 1.5 }
          );
          break;
        }
      }

      if (!bullet.active) continue;

      if (this.boss.isBossActive()) {
        const boss = this.boss.getBoss();
        if (boss) {
          for (const minion of boss.minions) {
            if (!minion.active) continue;
            if (checkCollision(
              { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
              { x: minion.x, y: minion.y, width: minion.width, height: minion.height }
            )) {
              bullet.active = false;
              this.bullets.release(bullet);
              const killed = this.boss.takeMinionDamage(minion, 1);
              this.audio.playEnemyHit();
              this.particles.emit(bullet.x, bullet.y, 3, CONFIG.COLORS.BULLET_PLAYER, { speed: 2, size: 1.5 });
              if (killed) {
                this.score += 50;
                this.particles.emitExplosion(minion.x + minion.width / 2, minion.y + minion.height / 2, 0.5);
                this.audio.playExplosionSmall();
              }
              break;
            }
          }
        }

        if (bullet.active && boss && checkCollision(
          { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
          { x: boss.x, y: boss.y, width: boss.width, height: boss.height }
        )) {
          bullet.active = false;
          this.bullets.release(bullet);
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
      let hit = false;
      for (const bullet of bullets) {
        if (bullet.isPlayer || !bullet.active) continue;

        if (checkCollision(
          { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
          { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height }
        )) {
          bullet.active = false;
          this.bullets.release(bullet);
          if (!hit) {
            hit = true;
            this.onPlayerHit();
          }
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
          break;
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

    // Power-ups vs player — collect removals to avoid mutating array during iteration
    const powerUps = this.powerUps.getActive();
    const toRemove: { type: string }[] = [];
    for (const powerUp of powerUps) {
      if (!powerUp.active) continue;

      if (checkCollision(
        { x: powerUp.x, y: powerUp.y, width: powerUp.size, height: powerUp.size },
        { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height }
      )) {
        this.onPowerUpCollected(powerUp);
        toRemove.push(powerUp);
      }
    }
    for (const p of toRemove) {
      this.powerUps.remove(p as any);
    }
  }

  private onEnemyKilled(enemy: { x: number; y: number; width: number; height: number; health?: number; type?: string; active?: boolean }) {
    if (enemy.active === false) return;
    enemy.active = false;

    const waveNumber = this.waves.getWaveNumber();
    const level = Math.floor(waveNumber / 5) + 1;

    this.chain++;
    this.chainTimer = CONFIG.CHAIN_TIMEOUT;
    const chainMultiplier = Math.min(this.chain, 10);
    this.score += CONFIG.SCORE_PER_ENEMY * level * chainMultiplier;

    if (enemy.type === 'elite') {
      this.audio.playExplosion();
      this.particles.emitExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 1.5);
    } else {
      this.audio.playExplosionSmall();
      this.particles.emitExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 0.8);
    }

    if (enemy.type === 'elite' && Math.random() < 0.4) {
      this.powerUps.spawnAt(enemy.x + enemy.width / 2, enemy.y, 'weapon');
    }
  }

  private onBossDefeated() {
    this.boss.clear();
    this.bullets.clear();

    const waveNumber = this.waves.getWaveNumber();
    const level = Math.floor(waveNumber / 5) + 1;
    this.score += CONFIG.SCORE_BONUS_BOSS * level;

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
    this.player.isInvincible = true;
    this.audio.playDamage();
    this.particles.addShake(8);
    this.particles.flash('#FF0000', 0.3);

    if (this.player.lives <= 0) {
      this.gameOver();
    } else {
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
        this.score += 500 * (Math.floor(this.waves.getWaveNumber() / 5) + 1);
        break;
      case 'bomb':
        this.player.bombs = Math.min(CONFIG.BOMB_COUNT, this.player.bombs + 1);
        break;
      case 'narrow':
        this.player.narrowTimer = CONFIG.POWERUP_NARROW_DURATION;
        break;
    }
  }

  private checkWaveAnnouncements() {
    const announcement = this.waves.getWaveAnnouncement();
    if (announcement) {
      this.waveAnnounceTimer = 2000;
      if (!announcement.isBoss) {
        this.audio.playWaveComplete();
      }
    }
  }

  private checkWarning() {
    if (this.warningActive) {
      this.warningTimer -= CONFIG.FIXED_DT * 1000;
      if (this.warningTimer <= 0) {
        this.warningActive = false;
        this.boss.spawnBoss(this.waves.getDifficulty(), this.waves.getWaveNumber());
      }
    }
  }

  private startGame() {
    this.state = 'playing';
    this.score = 0;
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

    ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

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
    const boss = this.boss.getBoss();
    if (boss) {
      this.renderBossMinions(ctx);
      this.renderBoss(ctx);
    }
    this.powerUps.render(ctx);

    const bullets = this.bullets.getActive();
    ctx.save();
    for (const bullet of bullets) {
      if (!bullet.active) continue;
      ctx.save();

      let color: string;
      if (bullet.isPlayer) {
        color = CONFIG.COLORS.BULLET_PLAYER;
        ctx.shadowBlur = 8;
      } else {
        switch (bullet.bulletType) {
          case 'aimed': color = CONFIG.COLORS.BULLET_ENEMY_AIMED; break;
          case 'spiral': color = CONFIG.COLORS.BULLET_ENEMY_SPIRAL; break;
          case 'laser': color = CONFIG.COLORS.BULLET_ENEMY_LASER; break;
          default: color = CONFIG.COLORS.BULLET_ENEMY; break;
        }
        ctx.shadowBlur = 6;
      }

      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      ctx.restore();
    }
    ctx.restore();

    renderPlayer(ctx, this.player, performance.now());

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

    if (this.player.laserActive) {
      ctx.save();
      const lx = this.player.x + this.player.width / 2;
      const lw = CONFIG.LASER_WIDTH;
      const flash = Math.floor(this.player.laserTimer / 50) % 2;
      const alpha = flash ? 0.9 : 0.7;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = CONFIG.COLORS.LASER_BEAM;
      ctx.shadowColor = CONFIG.COLORS.LASER_BEAM;
      ctx.shadowBlur = 20;
      ctx.fillRect(lx - lw / 2, 0, lw, this.player.y);

      ctx.globalAlpha = alpha * 0.3;
      ctx.fillRect(lx - lw * 2, 0, lw * 4, this.player.y);

      ctx.restore();
    }

    this.particles.render(ctx);

    this.renderer.renderHUD(
      ctx, this.score, this.player.lives,
      this.waves.getWaveNumber(), this.highScore,
      this.input.getShootMode(), this.player.powerLevel,
      this.player.bombs, this.chain,
      this.player.laserCharge, this.player.laserActive,
      this.player.narrowTimer
    );

    const bossState = this.boss.getBoss();
    if (bossState && (bossState.active || bossState.dying)) {
      this.renderer.renderBossHP(ctx, bossState);
    }

    this.pauseBtnBounds = this.renderer.renderPauseButton(ctx);

    if (this.waveAnnounceTimer > 0) {
      this.renderer.renderWaveAnnouncement(
        ctx,
        this.waves.getWaveNumber(),
        this.waves.isBossWaveNow(),
        this.waveAnnounceTimer
      );
    }

    if (this.warningActive) {
      this.renderer.renderWarning(ctx, this.warningTimer);
    }
  }

  private renderBossMinions(ctx: CanvasRenderingContext2D) {
    const boss = this.boss.getBoss();
    if (!boss) return;

    for (const m of boss.minions) {
      if (!m.active) continue;
      ctx.save();
      const cx = m.x + m.width / 2;
      const cy = m.y + m.height / 2;

      switch (m.type) {
        case 'basic':
          ctx.fillStyle = boss.color;
          ctx.shadowColor = boss.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(cx, m.y + m.height);
          ctx.lineTo(m.x + m.width, m.y);
          ctx.lineTo(m.x, m.y);
          ctx.closePath();
          ctx.fill();
          break;

        case 'shooter':
          ctx.fillStyle = '#FF6666';
          ctx.shadowColor = '#FF6666';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(cx, m.y);
          ctx.lineTo(m.x + m.width, cy);
          ctx.lineTo(cx, m.y + m.height);
          ctx.lineTo(m.x, cy);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'shield':
          ctx.fillStyle = '#4488FF';
          ctx.shadowColor = '#4488FF';
          ctx.shadowBlur = 10;
          const hw = m.width / 2;
          const hh = m.height / 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const px = cx + Math.cos(angle) * hw * 0.8;
            const py = cy + Math.sin(angle) * hh * 0.8;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          break;
      }

      if (m.maxHealth > 1) {
        const barWidth = m.width * 0.8;
        const barHeight = 2;
        ctx.fillStyle = '#1A1D2E';
        ctx.fillRect(cx - barWidth / 2, m.y - 4, barWidth, barHeight);
        ctx.fillStyle = CONFIG.COLORS.HP_BAR_FILL;
        ctx.fillRect(cx - barWidth / 2, m.y - 4, barWidth * (m.health / m.maxHealth), barHeight);
      }

      ctx.restore();
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

    ctx.shadowColor = boss.color;
    ctx.shadowBlur = 25;
    ctx.fillStyle = boss.color;

    switch (boss.bossId) {
      case 'cipher': {
        ctx.beginPath();
        ctx.moveTo(cx, boss.y + boss.height);
        ctx.lineTo(boss.x + boss.width, boss.y);
        ctx.lineTo(cx, boss.y + boss.height * 0.3);
        ctx.lineTo(boss.x, boss.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.globalAlpha = Math.sin(boss.patternTimer * 0.005) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.moveTo(boss.x, boss.y + boss.height * 0.3);
        ctx.lineTo(boss.x + boss.width, boss.y + boss.height * 0.3);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }

      case 'nexus': {
        const hw = boss.width / 2;
        const hh = boss.height / 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const px = cx + Math.cos(angle) * hw * 0.9;
          const py = cy + Math.sin(angle) * hh * 0.9;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const px = cx + Math.cos(angle) * hw * 0.5;
          const py = cy + Math.sin(angle) * hh * 0.5;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'void': {
        const radius = boss.width / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#9933FF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.6, boss.patternTimer * 0.002, boss.patternTimer * 0.002 + Math.PI * 1.5);
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'omega': {
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

        ctx.fillStyle = '#880000';
        ctx.fillRect(boss.x + 5, boss.y + 5, boss.width - 10, boss.height - 10);

        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x + 15, boss.y + 15, boss.width - 30, boss.height - 30);

        if (boss.phase >= 2) {
          ctx.fillStyle = '#FF0000';
          ctx.shadowColor = '#FF0000';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'abyss': {
        const points = 8;
        const outerR = boss.width / 2 * 0.9;
        const innerR = outerR * 0.5;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          const px = cx + Math.cos(angle + boss.patternTimer * 0.001) * r;
          const py = cy + Math.sin(angle + boss.patternTimer * 0.001) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    const eyeY = boss.y + boss.height * 0.35;
    ctx.fillStyle = boss.phase === 3 ? '#FF00FF' : boss.phase === 2 ? '#FF6600' : '#FFFFFF';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    if (boss.bossId !== 'void') {
      ctx.beginPath();
      ctx.arc(cx, eyeY, boss.width * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

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
