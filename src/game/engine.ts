import { CONFIG } from './config';
import { InputManager } from './input';
import { Player, createPlayer, updatePlayer, renderPlayer } from './player';
import { BulletPool, Bullet } from './bullet';
import { EnemyManager } from './enemy';
import { ParticleSystem } from './particles';
import { PowerUpManager } from './powerup';
import { AudioManager } from './audio';
import { Renderer } from './renderer';
import { checkCollision, getPlayerHitbox } from './collision';
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
  private wasTouching: boolean = false;

  // Graze
  private grazeCount: number = 0;
  private grazePulse: number = 0;
  private grazedBullets = new Set<Bullet>();

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
    this.audio.startMenuMusic();

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
        this.updateGraze(deltaTime);
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
          this.audio.resume();
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
    if (this.input.isKeyJustPressed('l') || this.input.isKeyJustPressed('L')) {
      this.activateLaser();
    }
    if (this.input.isKeyJustPressed('z') || this.input.isKeyJustPressed('Z')) {
      this.activateLaser();
    }
    break;

      case 'paused':
        if (click) {
          const item = this.renderer.hitTestMenu(click.x, click.y);
          if (item?.id === 'RESUME') this.state = 'playing';
          else if (item?.id === 'RESTART') this.startGame();
          else if (item?.id === 'EXIT') { this.state = 'menu'; this.audio.startMenuMusic(); }
        }
        if (this.input.isKeyJustPressed('Escape')) this.state = 'playing';
        if (this.input.isKeyJustPressed(' ') || this.input.isKeyJustPressed('Enter')) this.state = 'playing';
        break;

      case 'gameover':
        if (click) {
          const item = this.renderer.hitTestMenu(click.x, click.y);
          if (item?.id === 'RESTART') this.startGame();
          else if (item?.id === 'EXIT') { this.state = 'menu'; this.audio.startMenuMusic(); }
        }
        if (this.input.isKeyJustPressed(' ') || this.input.isKeyJustPressed('Enter')) this.startGame();
        break;
    }

    if (this.input.isKeyJustPressed('m')) this.audio.toggleMute();
  }

  private updateWaveSpawning(deltaTime: number) {
    if (this.boss.isBossActive() || this.warningActive || this.bossDefeatTimer > 0) return;

    const activeEnemyCount = this.enemies.countActive();
    if (activeEnemyCount >= 30) return;

    const spawnCommands = this.waves.update(deltaTime, activeEnemyCount, CONFIG.WIDTH);

    this.enemies.setDifficulty(this.waves.getDifficulty());

    for (const cmd of spawnCommands) {
      this.enemies.spawnEnemy(
        cmd.type, cmd.x, cmd.y, cmd.speed,
        cmd.movementPattern, cmd.shootPattern,
        cmd.formationId, cmd.offsetX, cmd.offsetY,
        cmd.hp, cmd.aimShards, cmd.shieldHp,
        cmd.isReward, cmd.startHidden,
        cmd.indestructible, cmd.explosive
      );
    }

    if (this.waves.isBossWaveNow() && !this.boss.isBossActive() && !this.warningActive) {
      this.warningActive = true;
      this.warningTimer = 2500;
      this.audio.playWarning();
    }
  }

  private updatePlayer(deltaTime: number) {
    // Initialize touch offset when touch begins
    if (this.input.isTouching() && !this.wasTouching) {
      this.input.setTouchOffset(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2
      );
    }
    this.wasTouching = this.input.isTouching();

    const touchTarget = this.input.getTouchTarget();

    updatePlayer(
      this.player,
      {
        left: this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('a'),
        right: this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('d'),
        up: this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('w'),
        down: this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('s'),
        touchTarget,
      },
      deltaTime,
      CONFIG.WIDTH,
      CONFIG.HEIGHT
    );

    this.enemies.setPlayerPosition(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );

    this.applyGravityPull(deltaTime);

    if (this.input.isShootingActive()) this.shoot();
  }

  /**
   * D7 gravity: every active attractor / gravity turret pulls the ship toward
   * it with an inverse-distance falloff. The player must COUNTER-DRIFT — the
   * field bends their controls while a source lives, which is the decade's
   * "movement economy under a field effect" verb.
   */
  private applyGravityPull(deltaTime: number) {
    if (!this.player || this.player.isInvincible) return;
    const dt = deltaTime * 60;

    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    let pullX = 0;
    let pullY = 0;

    const sources = this.enemies.getGravitySources();

    if (this.boss && this.boss.isBossActive()) {
      for (const m of this.boss.getGravitySources()) sources.push(m);
    }

    for (const s of sources) {
      if (s.hidden) continue;
      const dx = s.x - px;
      const dy = s.y - py;
      const dist2 = dx * dx + dy * dy;
      if (dist2 > s.radius * s.radius || dist2 < 1) continue;
      const dist = Math.sqrt(dist2);
      const falloff = 1 - dist / s.radius;
      const pull = s.strength * falloff * falloff * 2.2 * dt;
      pullX += (dx / dist) * pull;
      pullY += (dy / dist) * pull;
    }

    if (pullX !== 0 || pullY !== 0) {
      this.player.x += pullX;
      this.player.y += pullY;
      this.player.x = Math.max(0, Math.min(CONFIG.WIDTH - this.player.width, this.player.x));
      this.player.y = Math.max(0, Math.min(CONFIG.HEIGHT - this.player.height, this.player.y));
    }
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
      const center = Math.floor(count / 2);
      for (let i = 0; i < count; i++) {
        if (i === center) continue;
        const b = this.bullets.acquire(true);
        b.x = this.player.x + this.player.width / 2 - 2;
        b.y = this.player.y + 5;
        const angle = -Math.PI / 2 + (i - center) * spread;
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
        this.bullets.release(b);
        this.particles.emit(b.x, b.y, 3, CONFIG.COLORS.BULLET_ENEMY, { speed: 2, size: 1 });
      }
    }

    const enemies = this.enemies.getActive();
    for (const e of enemies) {
      if (!e.active) continue;
      if (this.enemies.damageEnemy(e, 5)) this.onEnemyKilled(e);
    }

    if (this.boss.isBossActive()) {
      const died = this.boss.takeDamage(10);
      if (died) this.onBossDefeated();
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
        if (this.enemies.damageEnemy(e, 1)) this.onEnemyKilled(e);
      }
    }
  }

  private updateBullets(deltaTime: number) {
    this.bullets.update(deltaTime, CONFIG.WIDTH, CONFIG.HEIGHT);
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

  private activateLaser() {
    if (this.player.powerLevel < CONFIG.MAX_POWER_LEVEL) return;
    if (this.player.laserActive) return;
    if (this.player.laserCharge < CONFIG.LASER_CHARGE_TIME) return;
    this.player.laserActive = true;
    this.player.laserTimer = CONFIG.LASER_DURATION;
    this.player.laserDmgTimer = 0;
    this.audio.playExplosion();
    this.particles.addShake(4);
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
    } else if (this.player.laserCharge < CONFIG.LASER_CHARGE_TIME) {
      this.player.laserCharge = Math.min(
        CONFIG.LASER_CHARGE_TIME,
        this.player.laserCharge + deltaTime * 1000
      );
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
        if (this.enemies.damageEnemy(e, CONFIG.LASER_DAMAGE)) this.onEnemyKilled(e);
      }
    }

    if (this.boss.isBossActive()) {
      const boss = this.boss.getBoss();
      if (boss && checkCollision(
        { x: lx, y: ly, width: lw, height: lh },
        { x: boss.x, y: boss.y, width: boss.width, height: boss.height }
      )) {
        const died = this.boss.takeDamage(CONFIG.LASER_DAMAGE);
        if (died) this.onBossDefeated();
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
    for (let bi = 0; bi < bullets.length; bi++) {
      const bullet = bullets[bi];
      if (!bullet.isPlayer || !bullet.active) continue;

      for (const enemy of enemies) {
        if (!enemy.active) continue;

        if (checkCollision(
          { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
          { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height }
        )) {
          const died = this.enemies.damageEnemy(enemy, 1);
          bullet.active = false;
          this.bullets.release(bullet);
          this.audio.playEnemyHit();

          if (died) {
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
                // Turret-Cruiser thesis: destroying a turret is also NOT safe —
                // it bursts into 2 homing shards (the splinterer lesson, scaled).
                if (boss.bossId === 'turrets') {
                  const mx = minion.x + minion.width / 2;
                  const my = minion.y + minion.height / 2;
                  const pCX = this.player.x + this.player.width / 2;
                  const pCY = this.player.y + this.player.height / 2;
                  const base = Math.atan2(pCY - my, pCX - mx);
                  this.bullets.acquireAngled(mx, my, base - 0.3, 5, 'aimed');
                  this.bullets.acquireAngled(mx, my, base + 0.3, 5, 'aimed');
                }
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
          this.particles.addShake(2);
          if (died) {
            this.particles.addHitstop(6);
            this.onBossDefeated();
          }
        }
      }
    }

    // Enemy bullets vs player
    if (!this.player.isInvincible && !this.bombActive) {
      const hitbox = getPlayerHitbox(
        this.player.x, this.player.y, this.player.width, this.player.height
      );
      let hit = false;
      for (let bi = 0; bi < bullets.length; bi++) {
        const bullet = bullets[bi];
        if (bullet.isPlayer || !bullet.active) continue;

        if (checkCollision(
          { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
          hitbox
        )) {
          bullet.active = false;
          this.bullets.release(bullet);
          if (!hit) {
            hit = true;
            this.onPlayerHit();
          }
          continue;
        }

        this.checkGraze(bullet);
      }
    }

    // Enemies vs player
    if (!this.player.isInvincible && !this.bombActive) {
      const playerHitbox = getPlayerHitbox(
        this.player.x, this.player.y, this.player.width, this.player.height
      );
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        // A teleporting enemy is intangible while hidden or telegraphing —
        // it only exists to be shot during the reveal.
        if (enemy.hidden || enemy.telegraphing) continue;

        if (checkCollision(
          { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height },
          playerHitbox
        )) {
          this.onPlayerHit();
          this.onEnemyKilled(enemy);
          break;
        }
      }
    }

    // Boss vs player
    if (!this.player.isInvincible && !this.bombActive && this.boss.isBossActive()) {
      const playerHitbox = getPlayerHitbox(
        this.player.x, this.player.y, this.player.width, this.player.height
      );
      const boss = this.boss.getBoss();
      if (boss && checkCollision(
        { x: boss.x, y: boss.y, width: boss.width, height: boss.height },
        playerHitbox
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

  private onEnemyKilled(enemy: { x: number; y: number; width: number; height: number; health?: number; type?: string; active?: boolean; aimShards?: boolean; isReward?: boolean }) {
    if (enemy.active === false) return;
    enemy.active = false;

    const waveNumber = this.waves.getWaveNumber();
    const level = Math.floor(waveNumber / 5) + 1;

    this.chain++;
    this.chainTimer = CONFIG.CHAIN_TIMEOUT;
    const chainMultiplier = Math.min(this.chain, 10);
    this.score += CONFIG.SCORE_PER_ENEMY * level * chainMultiplier;

    // Reward teleporter: catching it inside the brief reveal window pays out a
    // big bonus — the payout is the whole point of risking the kill in-window.
    if (enemy.isReward) {
      this.score += CONFIG.SCORE_PER_ENEMY * 6 * chainMultiplier;
    }

    if (enemy.type === 'elite') {
      this.audio.playExplosion();
      this.particles.emitExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 1.5);
    } else {
      this.audio.playExplosionSmall();
      this.particles.emitExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 0.8);
    }

    // Splinterer: kills are NOT safe — death sprays 4 fast shrapnel shards.
    // Once aiming is unlocked (later in decade 3) the shards home at the player,
    // forcing kill-placement discipline. This intentionally breaks the decade-1
    // "killing = safe" rule.
    if (enemy.type === 'splinterer') {
      const cx = enemy.x + enemy.width / 2;
      const cy = enemy.y + enemy.height / 2;
      const shardCount = 4;
      const baseSpeed = 5.5;
      const aimed = !!enemy.aimShards;
      const playerCX = this.player.x + this.player.width / 2;
      const playerCY = this.player.y + this.player.height / 2;
      for (let i = 0; i < shardCount; i++) {
        let angle: number;
        if (aimed) {
          const baseAngle = Math.atan2(playerCY - cy, playerCX - cx);
          angle = baseAngle + (i - (shardCount - 1) / 2) * 0.42;
        } else {
          angle = (i / shardCount) * Math.PI * 2 + Math.random() * 0.2;
        }
        this.bullets.acquireAngled(cx, cy, angle, baseSpeed + Math.random() * 0.6, 'aimed');
      }
      this.audio.playExplosionSmall();
    }

    // Explosive terrain (the D8 crate): shooting it is a DIFFERENT danger than
    // shooting through it — it blows up, spraying a radial burst from the crater.
    // "Destroy it" is the lesson; "don't be near when it pops" is the tax.
    if (enemy.type === 'terrain' && (enemy as { explosive?: boolean }).explosive) {
      const cx = enemy.x + enemy.width / 2;
      const cy = enemy.y + enemy.height / 2;
      const shardCount = 10;
      const baseSpeed = 2.6;
      for (let i = 0; i < shardCount; i++) {
        const angle = (i / shardCount) * Math.PI * 2 + Math.random() * 0.3;
        this.bullets.acquireAngled(cx, cy, angle, baseSpeed + Math.random() * 0.4, 'radial');
      }
      this.audio.playExplosionSmall();
      this.particles.emitBigExplosion(cx, cy);
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

  private checkGraze(bullet: Bullet) {
    if (this.player.isInvincible || this.bombActive) return;
    if (this.grazedBullets.has(bullet)) return;

    const gx = this.player.x + this.player.width / 2;
    const gy = this.player.y + this.player.height / 2;
    const gz = this.player.width * 0.7;

    const bx = bullet.x + bullet.width / 2;
    const by = bullet.y + bullet.height / 2;
    const dx = bx - gx;
    const dy = by - gy;
    if (dx * dx + dy * dy < gz * gz) {
      this.grazedBullets.add(bullet);
      this.grazeCount++;
      this.grazePulse = 1;
      this.score += 10;
      this.audio.playEnemyHit();
      this.particles.emit(bx, by, 3, CONFIG.COLORS.PLAYER, { speed: 2, size: 1.5 });
    }
  }

  private updateGraze(deltaTime: number) {
    if (this.grazePulse > 0) this.grazePulse -= deltaTime * 2;
    for (const bullet of this.bullets.getActive()) {
      if (!bullet.active && this.grazedBullets.has(bullet)) {
        this.grazedBullets.delete(bullet);
      }
    }
  }

  private onPlayerHit() {
    this.player.lives--;
    this.chain = 0;
    this.player.isInvincible = true;
    this.audio.playDamage();
    this.particles.addShake(8);
    this.particles.addHitstop(6);
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
    this.audio.stopMenuMusic();
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
    this.grazeCount = 0;
    this.grazePulse = 0;
    this.grazedBullets.clear();
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
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      } else {
        switch (bullet.bulletType) {
          case 'aimed': color = CONFIG.COLORS.BULLET_ENEMY_AIMED; break;
          case 'spiral': color = CONFIG.COLORS.BULLET_ENEMY_SPIRAL; break;
          case 'laser': color = CONFIG.COLORS.BULLET_ENEMY_LASER; break;
          case 'shockwave': color = CONFIG.COLORS.BULLET_ENEMY_SHOCKWAVE; break;
          case 'soundwave': color = CONFIG.COLORS.BULLET_ENEMY_SOUNDWAVE; break;
          default: color = CONFIG.COLORS.BULLET_ENEMY; break;
        }

        // Trail effect
        const trailLen = 10;
        const nx = bullet.vx !== 0 ? -bullet.vx : 0;
        const ny = bullet.vy !== 0 ? -bullet.vy : 1;
        const len = Math.sqrt(nx * nx + ny * ny) || 1;
        const dx = (nx / len) * 2;
        const dy = (ny / len) * 2;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = color;
        for (let t = 1; t <= 3; t++) {
          ctx.globalAlpha = 0.15 / t;
          const tw = bullet.width * (1 - t * 0.2);
          const th = bullet.height * 0.5;
          ctx.fillRect(
            bullet.x + bullet.width / 2 - tw / 2 + dx * t * trailLen * 0.3,
            bullet.y + dy * t * trailLen * 0.3,
            tw, th
          );
        }
        ctx.globalAlpha = 1;

        // Strong glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = color;
        if (bullet.bulletType === 'shockwave') {
          ctx.beginPath();
          ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width / 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (bullet.bulletType === 'soundwave') {
          // Wide pulse wall with a bright leading edge
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillRect(bullet.x, bullet.y, bullet.width, 3);
        } else {
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }

        // White core for contrast
        ctx.shadowBlur = 0;
        if (bullet.bulletType !== 'shockwave' && bullet.bulletType !== 'soundwave') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillRect(
            bullet.x + 1, bullet.y + 1,
            bullet.width - 2, bullet.height - 2
          );
        }
      }
      ctx.restore();
    }
    ctx.restore();

    renderPlayer(ctx, this.player, performance.now());

    if (this.grazePulse > 0) {
      ctx.save();
      ctx.globalAlpha = this.grazePulse * 0.8;
      ctx.strokeStyle = CONFIG.COLORS.PLAYER;
      ctx.shadowColor = CONFIG.COLORS.PLAYER;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        this.player.width * (0.8 - this.grazePulse * 0.3),
        0, Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

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
      this.player.narrowTimer, this.grazeCount
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
        case 'fleet':
          // Carrier escort-fleet: a small winged interceptor that files in from
          // the bay and SCREENS the carrier core. Reads as "the minions ARE the
          // attack" — a bright intercept ship, not a weak-point or a shooter.
          ctx.fillStyle = CONFIG.COLORS.BOSS_CARRIER;
          ctx.shadowColor = CONFIG.COLORS.BOSS_CARRIER;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(cx, m.y);
          ctx.lineTo(m.x + m.width, m.y + m.height * 0.5);
          ctx.lineTo(cx, m.y + m.height);
          ctx.lineTo(m.x, m.y + m.height * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, m.y + m.height * 0.5, 2, 0, Math.PI * 2);
          ctx.fill();
          // Wing tips that flutter.
          ctx.strokeStyle = CONFIG.COLORS.BOSS_CARRIER_BAY;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(m.x + 2, m.y + m.height * 0.35);
          ctx.lineTo(m.x - 5, m.y + m.height * 0.5);
          ctx.moveTo(m.x + m.width - 2, m.y + m.height * 0.35);
          ctx.lineTo(m.x + m.width + 5, m.y + m.height * 0.5);
          ctx.stroke();
          break;

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

        case 'rusher':
          ctx.fillStyle = boss.color;
          ctx.shadowColor = boss.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(cx, m.y + m.height);
          ctx.lineTo(m.x + m.width, m.y + m.height * 0.3);
          ctx.lineTo(cx + m.width * 0.15, m.y + m.height * 0.3);
          ctx.lineTo(cx, m.y);
          ctx.lineTo(cx - m.width * 0.15, m.y + m.height * 0.3);
          ctx.lineTo(m.x, m.y + m.height * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, m.y + m.height * 0.55, 2, 0, Math.PI * 2);
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

        case 'mirror':
          ctx.fillStyle = '#FF77CC';
          ctx.shadowColor = '#FF77CC';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(cx, m.y + m.height);
          ctx.lineTo(m.x + m.width, m.y);
          ctx.lineTo(m.x, m.y);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'escort':
          // Elite fin-sail escort: a bright diamond that seals the creature's
          // fin-core. Kill these first to open the creature for damage.
          ctx.fillStyle = CONFIG.COLORS.BOSS_CREATURE;
          ctx.shadowColor = CONFIG.COLORS.BOSS_CREATURE;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(cx, m.y);
          ctx.lineTo(m.x + m.width, cy);
          ctx.lineTo(cx, m.y + m.height);
          ctx.lineTo(m.x, cy);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'aimer':
          // Weak-point marksman: a red reticle that marks where the shell is
          // aiming. Read it, dodge the tracer, then kill it (HP 1).
          ctx.fillStyle = '#FF3333';
          ctx.shadowColor = '#FF3333';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(cx, cy, m.width * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, m.width * 0.9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx - m.width * 1.2, cy);
          ctx.lineTo(cx - m.width * 0.6, cy);
          ctx.moveTo(cx + m.width * 0.6, cy);
          ctx.lineTo(cx + m.width * 1.2, cy);
          ctx.stroke();
          break;

        case 'mine':
          // Fast-seeking mine: a spiked pellet that orbits then lunges. One hit
          // and it's gone, but it flies straight at you.
          ctx.fillStyle = '#FFD700';
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(cx, cy, m.width * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + m.patternTimer * 0.01;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * m.width * 0.45, cy + Math.sin(a) * m.width * 0.45);
            ctx.lineTo(cx + Math.cos(a) * m.width * 0.85, cy + Math.sin(a) * m.width * 0.85);
            ctx.stroke();
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'gturret':
          // Gravity-anchored turret: an armored turret that PULLS the ship while
          // it fires. Its halo shows the pull radius — every one bends your drift.
          ctx.fillStyle = CONFIG.COLORS.BOSS_FORTRESS;
          ctx.shadowColor = CONFIG.COLORS.BOSS_FORTRESS;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(cx, m.y + m.height);
          ctx.lineTo(m.x + m.width, m.y + m.height * 0.3);
          ctx.lineTo(m.x, m.y + m.height * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FF5522';
          ctx.shadowColor = '#FF5522';
          ctx.beginPath();
          ctx.arc(cx, m.y + m.height * 0.25, 3, 0, Math.PI * 2);
          ctx.fill();
          // Pull-radius halo.
          ctx.strokeStyle = CONFIG.COLORS.BOSS_FORTRESS;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          ctx.arc(cx, cy, m.gravityRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;

        case 'slot':
          // Fortress slot weak-point: a bright notch riding the bastion face.
          // Destroy all three, and the core opens — but they slide along the face.
          ctx.fillStyle = CONFIG.COLORS.BOSS_FORTRESS_SLOT;
          ctx.shadowColor = CONFIG.COLORS.BOSS_FORTRESS_SLOT;
          ctx.shadowBlur = 14;
          ctx.fillRect(cx - m.width / 2, cy - m.height / 2, m.width, m.height);
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowBlur = 10;
          ctx.fillRect(cx - 4, cy - 10, 8, 20);
          break;

        case 'drone':
          // Terrain-drone: a jagged block that glides to your lane, then PLANTS
          // into a stationary crate that primes a radial burst. Early phase =
          // it still has wings; planted = it's the cage around you.
          if (m.patternTimer < 1400) {
            // Gliding — winged block hunting your lane.
            ctx.fillStyle = CONFIG.COLORS.BOSS_MECH_DRONE;
            ctx.shadowColor = CONFIG.COLORS.BOSS_MECH_DRONE;
            ctx.shadowBlur = 10;
            ctx.fillRect(cx - m.width / 2, cy - m.height / 2, m.width, m.height);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(cx, m.y + m.height);
            ctx.lineTo(m.x + m.width, m.y);
            ctx.lineTo(m.x, m.y);
            ctx.closePath();
            ctx.fill();
          } else {
            // Planted crate — ticking down, borderline about to burst.
            const pulse = (m.patternTimer - 1400) / 1800;
            ctx.fillStyle = CONFIG.COLORS.BOSS_MECH;
            ctx.shadowColor = CONFIG.COLORS.BOSS_MECH;
            ctx.shadowBlur = 8 + pulse * 14;
            ctx.fillRect(cx - m.width / 2, cy - m.height / 2, m.width, m.height);
            ctx.strokeStyle = CONFIG.COLORS.BOSS_MECH_SPARK;
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - m.width / 2, cy - m.height / 2, m.width, m.height);
            ctx.beginPath();
            ctx.moveTo(cx - m.width / 2 + 3, cy - m.height / 2 + 3);
            ctx.lineTo(cx + m.width / 2 - 3, cy + m.height / 2 - 3);
            ctx.moveTo(cx + m.width / 2 - 3, cy - m.height / 2 + 3);
            ctx.lineTo(cx - m.width / 2 + 3, cy + m.height / 2 - 3);
            ctx.stroke();
          }
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

      case 'spider': {
        // Step limps on each side + low wide body + belly-core weak point.
        const legStep = Math.sin(boss.legPhase ? boss.patternTimer * 0.02 + boss.legPhase : 0) * 3;
        ctx.lineWidth = 3;
        ctx.strokeStyle = boss.color;
        ctx.beginPath();
        // left legs
        ctx.moveTo(boss.x + boss.width * 0.15, cy);
        ctx.lineTo(boss.x - 8, boss.y + boss.height * 0.3 + legStep - 6);
        ctx.moveTo(boss.x + boss.width * 0.22, cy);
        ctx.lineTo(boss.x - 10, boss.y + boss.height * 0.6 + legStep);
        ctx.moveTo(boss.x + boss.width * 0.15, boss.y + boss.height);
        ctx.lineTo(boss.x - 6, boss.y + boss.height + 6 + legStep);
        // right legs
        ctx.moveTo(boss.x + boss.width * 0.85, cy);
        ctx.lineTo(boss.x + boss.width + 8, boss.y + boss.height * 0.3 - legStep - 6);
        ctx.moveTo(boss.x + boss.width * 0.78, cy);
        ctx.lineTo(boss.x + boss.width + 10, boss.y + boss.height * 0.6 - legStep);
        ctx.moveTo(boss.x + boss.width * 0.85, boss.y + boss.height);
        ctx.lineTo(boss.x + boss.width + 6, boss.y + boss.height + 6 - legStep);
        ctx.stroke();
        ctx.lineWidth = 1;

        // Low rounded body
        ctx.fillStyle = boss.color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, boss.width * 0.42, boss.height * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        // Belly-core (bright when open = vulnerable, dim when closed).
        const coreOpen = boss.coreOpen;
        ctx.fillStyle = coreOpen ? '#FFE000' : '#554400';
        ctx.shadowColor = coreOpen ? '#FFE000' : 'transparent';
        ctx.shadowBlur = coreOpen ? 15 : 0;
        ctx.beginPath();
        ctx.arc(cx, boss.y + boss.height * 0.78, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }

      case 'turrets': {
        // Angled hull (cruiser) girdled by an outer turret ring. As turrets fall
        // the ring visibly disassembles; the center core glows only when exposed.
        const ringPct = boss.minions.length / Math.max(CONFIG.MAX_BOSS_MINIONS, 1);
        const hullW = boss.width * 0.62;
        const hullH = boss.height * 0.55;
        ctx.beginPath();
        ctx.moveTo(cx - hullW / 2, cy - hullH / 2);
        ctx.lineTo(cx - hullW * 0.2, boss.y + boss.height * 0.12);
        ctx.lineTo(cx + hullW * 0.2, boss.y + boss.height * 0.12);
        ctx.lineTo(cx + hullW / 2, cy - hullH / 2);
        ctx.lineTo(cx + hullW * 0.3, boss.y + boss.height);
        ctx.lineTo(cx - hullW * 0.3, boss.y + boss.height);
        ctx.closePath();
        ctx.fill();

        // Outer turret ring — closes tighter as turrets are destroyed.
        const ringR = boss.width * 0.46 * (0.6 + ringPct * 0.4);
        ctx.strokeStyle = boss.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, boss.patternTimer * 0.001, boss.patternTimer * 0.001 + Math.PI * 1.6);
        ctx.stroke();
        ctx.lineWidth = 1;

        // Turret nubs riding the ring gap (the remaining ring "teeth").
        ctx.fillStyle = '#FFAA00';
        const teeth = Math.max(2, Math.round(ringPct * 8));
        for (let i = 0; i < teeth; i++) {
          const a = (i / teeth) * Math.PI * 2 + boss.patternTimer * 0.002;
          const tx = cx + Math.cos(a) * ringR;
          const ty = cy + Math.sin(a) * ringR;
          ctx.beginPath();
          ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Central core — bright when exposed (vulnerable), dark when sealed.
        const exposed = boss.coreOpen;
        ctx.fillStyle = exposed ? CONFIG.COLORS.BOSS_TURRET_CORE : '#5A3A00';
        ctx.shadowColor = exposed ? CONFIG.COLORS.BOSS_TURRET_CORE : 'transparent';
        ctx.shadowBlur = exposed ? 16 : 0;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }

      case 'statue': {
        // The face IS the boss: a rigid totemic head. The two ring-firing EYES
        // are the weak points (bright/circular), and the mouth "opens" in the
        // death phase to telegraph the charged wide beam.
        ctx.beginPath();
        ctx.ellipse(cx, cy, boss.width * 0.5, boss.height * 0.46, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head band / crown (helps the silhouette read as a totem).
        ctx.fillStyle = boss.color;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(boss.x + boss.width * 0.16, boss.y + boss.height * 0.06, boss.width * 0.68, boss.height * 0.14);
        ctx.globalAlpha = 1;

        // Eyes — the bright, circular weak points. Ring-glow pulses with charge.
        const eyeY = boss.y + boss.height * 0.34;
        const eyeRX = boss.width * 0.11;
        const leftEX = cx - boss.width * 0.22;
        const rightEX = cx + boss.width * 0.22;
        const eyeOn = boss.phase >= 1;
        // In phase B onward BOTH eyes are lit (cross-fire); before that one glows.
        const leftLit = eyeOn;
        const rightLit = boss.phase >= 2;
        const charge = (Math.sin(boss.patternTimer * 0.004) + 1) / 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 14;
        const drawEye = (ex: number, lit: boolean) => {
          ctx.beginPath();
          ctx.arc(ex, eyeY, eyeRX, 0, Math.PI * 2);
          ctx.fill();
          if (lit) {
            ctx.fillStyle = '#FF3B3B';
            ctx.shadowColor = '#FF3B3B';
            ctx.shadowBlur = 18 + charge * 8;
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRX * 0.45, 0, Math.PI * 2);
            ctx.fill();
          }
          // Ring around the eye — the "ring-firing" motif.
          ctx.strokeStyle = lit ? '#FF6644' : '#664433';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ex, eyeY, eyeRX * 1.7, boss.patternTimer * 0.002, boss.patternTimer * 0.002 + Math.PI * 1.5);
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = '#FFFFFF';
          ctx.shadowBlur = 14;
        };
        drawEye(leftEX, leftLit);
        drawEye(rightEX, rightLit);

        // Mouth — closed at phase 1-2, "opens" in phase 3 to telegraph the beam.
        const mouthY = boss.y + boss.height * 0.72;
        const mouthOpen = boss.phase >= 3 ? 0.4 : 0.12;
        ctx.fillStyle = boss.phase >= 3 ? '#FF0000' : '#333333';
        ctx.shadowColor = boss.phase >= 3 ? '#FF0000' : 'transparent';
        ctx.shadowBlur = boss.phase >= 3 ? 16 : 0;
        ctx.beginPath();
        ctx.ellipse(cx, mouthY, boss.width * 0.3, boss.height * 0.12 * mouthOpen * 3 + 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }

      case 'creature': {
        // Neon-finned eel/ray cutting across the top band (the mobile boss).
        // Long low body, undulating fins above and below, and a FIN-CORE that
        // only lights when its elite escorts (the "buffer" fin-sails) are gone.
        const waveX = Math.sin(boss.patternTimer * 0.0015);
        const bodyH = boss.height * 0.4;
        // Undulating fin (top).
        ctx.beginPath();
        ctx.moveTo(boss.x, cy);
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const px = boss.x + boss.width * t;
          const py = cy - bodyH * 0.6 + Math.sin(t * Math.PI * 2 + boss.patternTimer * 0.004) * 8;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.lineTo(boss.x + boss.width, cy);
        ctx.closePath();
        ctx.fill();

        // Undulating fin (bottom).
        ctx.beginPath();
        ctx.moveTo(boss.x, cy);
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const px = boss.x + boss.width * t;
          const py = cy + bodyH * 0.6 + Math.sin(t * Math.PI * 2 + boss.patternTimer * 0.004 + 0.5) * 8;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.lineTo(boss.x + boss.width, cy);
        ctx.closePath();
        ctx.fill();

        // Ray-like body.
        ctx.beginPath();
        ctx.ellipse(cx, cy, boss.width * 0.5, bodyH * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head / eye (front, toward the direction it sweeps).
        const headX = cx + Math.sign(waveX) * boss.width * 0.4;
        ctx.fillStyle = '#E8FFE8';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(headX, cy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Fin-core: bright when exposed (escorts dead), dim when sealed.
        const exposed = boss.coreOpen;
        ctx.fillStyle = exposed ? '#FFFFFF' : '#556644';
        ctx.shadowColor = exposed ? '#FFFFFF' : 'transparent';
        ctx.shadowBlur = exposed ? 16 : 0;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
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

      case 'shell': {
        // Hex armor shell over a blink-gated inner core. The outer shell is a
        // thick armored hexagon; the core only glows during its REVEAL window
        // (phase 2+), mirroring the teleporter's hidden/telegraph/revealed cycle.
        ctx.fillStyle = boss.color;
        ctx.shadowColor = boss.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const px = cx + Math.cos(a) * boss.width * 0.42;
          const py = cy + Math.sin(a) * boss.height * 0.42;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Armor plating: a seam breaks and plates fall off as the health bar
        // drops through the phases (70->40->20->0 armor).
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        const seamAngle = boss.phase * 0.6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(seamAngle) * boss.width * 0.4, cy + Math.sin(seamAngle) * boss.height * 0.4);
        ctx.stroke();

        // Inner core: hidden while the armor re-locks, glowing when revealed.
        if (boss.coreOpen) {
          const coreColor = boss.phase >= 3 ? '#FF44AA' : boss.phase === 2 ? '#FFAA00' : '#FFFFFF';
          ctx.fillStyle = coreColor;
          ctx.shadowColor = coreColor;
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.arc(cx, cy, boss.width * 0.14, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Blink telegraph when the shell has re-locked (the "armor re-seals"
          // beat) — reads as intangible until it re-opens.
          const pulse = (Math.sin(boss.patternTimer * 0.04) + 1) / 2;
          ctx.strokeStyle = CONFIG.COLORS.BOSS_SHELL_CORE;
          ctx.globalAlpha = 0.15 + pulse * 0.3;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, boss.width * 0.16 + pulse * 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        break;
      }

      case 'fortress': {
        // Full-width bastion: a crenellated wall face with SLOT notches where the
        // exposed weak points ride. While any slot is up the core stays sealed.
        ctx.fillStyle = boss.color;
        ctx.shadowColor = boss.color;
        ctx.shadowBlur = 16;
        ctx.fillRect(boss.x, cy - 14, boss.width, boss.height);

        // Crenellations along the top.
        const teeth = 12;
        const toothW = boss.width / teeth;
        for (let i = 0; i < teeth; i++) {
          ctx.fillStyle = boss.color;
          ctx.fillRect(boss.x + i * toothW, boss.y, toothW * 0.6, 14);
        }

        // Armor seams (read the phases as battlement damage).
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        for (let i = 1; i < teeth; i++) {
          const sx = boss.x + i * toothW;
          ctx.beginPath();
          ctx.moveTo(sx, boss.y + 14);
          ctx.lineTo(sx, cy + 14);
          ctx.stroke();
        }

        // Muzzle strip: light port windows along the face.
        ctx.fillStyle = 'rgba(255,80,40,0.5)';
        for (let i = 0; i < 6; i++) {
          const lx = boss.x + boss.width * (0.12 + i * 0.15);
          ctx.fillRect(lx, cy - 2, 8, 4);
        }

        // Core: sealed unless every slot is down (slot weak-points killed).
        if (boss.coreOpen) {
          const coreColor = boss.phase >= 3 ? '#FF4433' : boss.phase === 2 ? '#FFAA00' : '#FF5522';
          ctx.fillStyle = coreColor;
          ctx.shadowColor = coreColor;
          ctx.shadowBlur = 26;
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const pulse = (Math.sin(boss.patternTimer * 0.05) + 1) / 2;
          ctx.strokeStyle = CONFIG.COLORS.BOSS_FORTRESS_SLOT;
          ctx.globalAlpha = 0.15 + pulse * 0.35;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 18 + pulse * 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        break;
      }

      case 'mech': {
        // The Nimble Rocket-Skater Mech: a red biped that CHASES you on X with
        // speed that climbs each phase, throwing spark trails from its skates as
        // it leans into the hunt. The "fast boss" — reads against every rooted
        // boss before it.
        // Sparky vent trail (its skates) flicker behind the body.
        ctx.strokeStyle = CONFIG.COLORS.BOSS_MECH_SPARK;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const tw = Math.sin(boss.patternTimer * 0.05 + i * 1.7);
          const sx = boss.x + boss.width * (0.35 + i * 0.1);
          ctx.beginPath();
          ctx.moveTo(sx, boss.y + boss.height - 4);
          ctx.lineTo(sx + tw * 4, boss.y + boss.height + 8 + i * 3);
          ctx.stroke();
        }

        // Biped body: wide shoulders, narrow waist, rocket-skate feet below.
        ctx.fillStyle = boss.color;
        ctx.shadowColor = boss.color;
        ctx.shadowBlur = 20;
        // Torso (shoulders out, hips in).
        ctx.beginPath();
        ctx.moveTo(boss.x + boss.width * 0.12, boss.y);
        ctx.lineTo(boss.x + boss.width * 0.88, boss.y);
        ctx.lineTo(boss.x + boss.width * 0.62, boss.y + boss.height * 0.62);
        ctx.lineTo(boss.x + boss.width * 0.38, boss.y + boss.height * 0.62);
        ctx.closePath();
        ctx.fill();

        // Head visor (dark + a single bright eye — the hunter's gaze).
        ctx.fillStyle = '#1A1D2E';
        ctx.fillRect(cx - 8, boss.y - 6, 16, 9);
        ctx.fillStyle = CONFIG.COLORS.BOSS_MECH_SPARK;
        ctx.shadowColor = CONFIG.COLORS.BOSS_MECH_SPARK;
        ctx.shadowBlur = 12;
        ctx.fillRect(cx - 2, boss.y - 3, 4, 7);

        // Rocket-skate feet: paired pods under the body.
        ctx.fillStyle = boss.color;
        ctx.shadowColor = boss.color;
        ctx.fillRect(boss.x + boss.width * 0.2, boss.y + boss.height * 0.62, boss.width * 0.22, 12);
        ctx.fillRect(boss.x + boss.width * 0.58, boss.y + boss.height * 0.62, boss.width * 0.22, 12);

        // Core (the mech's reactor): always damageable — the hunter's gut.
        if (boss.coreOpen) {
          const coreColor = boss.phase >= 3 ? '#FF4433' : boss.phase === 2 ? '#FFAA00' : CONFIG.COLORS.BOSS_MECH_SPARK;
          ctx.fillStyle = coreColor;
          ctx.shadowColor = coreColor;
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.arc(cx, boss.y + boss.height * 0.4, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, boss.y + boss.height * 0.4, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'carrier': {
        // The Escort-Carrier: a beached-hull aircraft "factory" — broad flat
        // deck, engine pods, and the LOADING BAY across its underside where its
        // fleet files in. Its bright CORE slips open in WINDOWS (only hittable
        // then), so the fight reads: the bay keeps spawning minions that screen
        // the core, and you clear lanes to land damage in the open window.
        ctx.fillStyle = boss.color;
        ctx.shadowColor = boss.color;
        ctx.shadowBlur = 18;

        // Hull deck: a wide rounded slab.
        ctx.fillRect(boss.x, boss.y + boss.height * 0.3, boss.width, boss.height * 0.5);

        // Engine pods (port/starboard) — the "anchors".
        ctx.fillRect(boss.x + 4, boss.y + boss.height * 0.12, boss.width * 0.16, boss.height * 0.6);
        ctx.fillRect(boss.x + boss.width * 0.8, boss.y + boss.height * 0.12, boss.width * 0.16, boss.height * 0.6);

        // Loading bay line across the underside: even when shut it reads as the
        // seam where minions exit.
        ctx.fillStyle = CONFIG.COLORS.BOSS_CARRIER_BAY;
        ctx.shadowColor = CONFIG.COLORS.BOSS_CARRIER_BAY;
        ctx.shadowBlur = 6;
        ctx.fillRect(boss.x + boss.width * 0.16, boss.y + boss.height * 0.78, boss.width * 0.68, 3);

        // The CORE/WEAK POINT: a bright reactor inside the hull — only drawn when
        // the window is OPEN so the player reads exactly when to commit damage.
        if (boss.coreOpen) {
          const pulse = (boss.phaseTransitioning ? 1 : 0.6 + Math.sin(performance.now() * 0.02) * 0.4);
          const coreColor = boss.phase >= 3 ? '#FFFFFF' : CONFIG.COLORS.BOSS_CARRIER_CORE;
          ctx.fillStyle = coreColor;
          ctx.shadowColor = coreColor;
          ctx.shadowBlur = 26;
          ctx.globalAlpha = pulse;
          ctx.beginPath();
          ctx.arc(cx, boss.y + boss.height * 0.55, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, boss.y + boss.height * 0.55, 4, 0, Math.PI * 2);
          ctx.fill();
          // A glint ring marks the open window's edge.
          ctx.strokeStyle = CONFIG.COLORS.BOSS_CARRIER_BAY;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(cx, boss.y + boss.height * 0.55, 17, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        break;
      }
    }

    const eyeY = boss.y + boss.height * 0.35;
    ctx.fillStyle = boss.phase === 3 ? '#FF00FF' : boss.phase === 2 ? '#FF6600' : '#FFFFFF';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    if (boss.bossId !== 'spider' && boss.bossId !== 'turrets' && boss.bossId !== 'statue' && boss.bossId !== 'shell' && boss.bossId !== 'fortress' && boss.bossId !== 'mech' && boss.bossId !== 'carrier') {
      ctx.beginPath();
      ctx.arc(cx, eyeY, boss.width * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  pressBomb() {
    if (this.state === 'playing') this.activateBomb();
  }

  pressSpecial() {
    if (this.state === 'playing') this.activateLaser();
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
