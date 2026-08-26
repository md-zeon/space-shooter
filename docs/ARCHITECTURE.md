# Game Architecture

## Overview

The game uses a component-based architecture with a main game loop driving all updates and rendering through the Canvas API.

## Game Loop

```
┌─────────────────────────────────────────┐
│              Game Loop                   │
├─────────────────────────────────────────┤
│  1. Input Processing                    │
│  2. Update (fixed timestep)             │
│     ├── Player update                   │
│     ├── Enemy update                    │
│     ├── Bullet update                   │
│     ├── Power-up update                 │
│     ├── Particle update                 │
│     └── Collision detection             │
│  3. Render (interpolated)               │
│     ├── Clear canvas                    │
│     ├── Draw background/stars           │
│     ├── Draw enemies                    │
│     ├── Draw bullets                    │
│     ├── Draw player                     │
│     ├── Draw particles                  │
│     ├── Draw HUD                        │
│     └── Draw UI overlays                │
│  4. requestAnimationFrame               │
└─────────────────────────────────────────┘
```

## Core Modules

### engine.ts

Main game loop with fixed timestep physics and interpolated rendering.

```typescript
class GameEngine {
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly FIXED_DT: number = 1/60;

  update(deltaTime: number) {
    this.accumulator += deltaTime;
    while (this.accumulator >= this.FIXED_DT) {
      this.fixedUpdate(this.FIXED_DT);
      this.accumulator -= this.FIXED_DT;
    }
    this.render(this.accumulator / this.FIXED_DT);
  }
}
```

### player.ts

Player ship state and movement.

```typescript
interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  lives: number;
  speed: number;
  isInvincible: boolean;
  invincibleTimer: number;
}
```

### enemy.ts

Enemy types with different behaviors.

| Type | Movement | Shooting | Health |
|------|----------|----------|--------|
| Basic | Straight down | None | 1 |
| Advanced | Diagonal | Occasional | 2 |
| Elite | Zigzag | Targeted | 3 |
| Boss | Pattern-based | Multiple | 10+ |

### bullet.ts

Projectile management with object pooling.

```typescript
class BulletPool {
  private pool: Bullet[] = [];
  private active: Bullet[] = [];

  acquire(): Bullet {
    return this.pool.pop() || this.create();
  }

  release(bullet: Bullet) {
    this.pool.push(bullet);
  }
}
```

### collision.ts

AABB collision detection.

```typescript
function checkCollision(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
```

### particles.ts

Particle system with pooling and additive blending.

```typescript
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
}
```

### input.ts

Unified input handling for keyboard and touch.

```typescript
class InputManager {
  private keys: Set<string> = new Set();
  private touch: TouchState | null = null;

  isKeyDown(key: string): boolean {
    return this.keys.has(key);
  }

  getTouchPosition(): { x: number; y: number } | null {
    return this.touch?.position ?? null;
  }
}
```

### touch.ts

Virtual joystick and gesture recognition.

```
┌─────────────────────────────────┐
│                                 │
│      Movement Zone (40%)        │
│    ┌───────────────────┐        │
│    │   Virtual Joystick │        │
│    │   (appears on      │        │
│    │    touch)          │        │
│    └───────────────────┘        │
│                                 │
│              ┌──────────────────┤
│              │   Fire Zone (60%)│
│              │   Tap/hold to    │
│              │   shoot          │
│              └──────────────────┤
│                                 │
└─────────────────────────────────┘
```

### audio.ts

Web Audio API synthesizer for retro sounds.

```typescript
class AudioManager {
  private ctx: AudioContext;
  
  playShoot() { /* Synthesize laser sound */ }
  playExplosion() { /* Synthesize explosion */ }
  playPowerUp() { /* Synthesize pickup */ }
  playDamage() { /* Synthesize hit */ }
}
```

### renderer.ts

Canvas drawing utilities.

```typescript
class Renderer {
  private ctx: CanvasRenderingContext2D;
  
  drawShip(x: number, y: number) { /* Draw player ship */ }
  drawEnemy(x: number, y: number, type: EnemyType) { /* Draw enemy */ }
  drawBullet(x: number, y: number, isPlayer: boolean) { /* Draw bullet */ }
  drawParticles(particles: Particle[]) { /* Draw particle system */ }
}
```

## Data Flow

```
Input → State → Update → Render → Output
  │        │        │        │
  │        │        │        └─ Canvas API
  │        │        └─ Physics, AI, Collision
  │        └─ Player, Enemies, Bullets
  └─ Keyboard, Touch
```

## State Management

Game state is managed through React refs and direct mutation for performance.

```typescript
const gameState = useRef({
  player: { x: 0, y: 0, lives: 3 },
  enemies: [],
  bullets: [],
  particles: [],
  score: 0,
  level: 1,
});
```

## Performance Patterns

### Object Pooling

Pre-allocate bullets, enemies, and particles. Reuse dead entities.

### Offscreen Canvas

Cache static sprites to offscreen canvases for faster rendering.

```typescript
const cachedSprite = document.createElement('canvas');
cachedSprite.width = spriteWidth;
cachedSprite.height = spriteHeight;
const cacheCtx = cachedSprite.getContext('2d')!;
// Draw sprite once
cacheCtx.drawImage(sprite, 0, 0);
// Reuse each frame
ctx.drawImage(cachedSprite, x, y);
```

### Spatial Partitioning

Grid-based collision detection for large entity counts.

```typescript
class SpatialGrid {
  private cellSize: number = 64;
  private cells: Map<string, Entity[]> = new Map();
  
  insert(entity: Entity) {
    const cellKey = this.getCellKey(entity.x, entity.y);
    this.cells.get(cellKey)?.push(entity);
  }
  
  query(x: number, y: number, radius: number): Entity[] {
    // Only check nearby cells
  }
}
```

### Memory Management

- No allocations in hot paths
- Mutate objects, don't create new ones
- Use typed arrays for particle coordinates
- Pre-compute values where possible

## File Structure

```
game/
├── engine.ts         # Game loop, timing
├── player.ts         # Player state, movement
├── enemy.ts          # Enemy types, AI, spawning
├── bullet.ts         # Projectile pool
├── powerup.ts        # Power-up system
├── particles.ts      # Particle effects
├── collision.ts      # AABB detection
├── input.ts          # Keyboard handling
├── touch.ts          # Touch controls
├── audio.ts          # Web Audio synthesizer
├── renderer.ts       # Canvas drawing
└── config.ts         # Game constants
```

## References

- [MDN Game Loop](https://developer.mozilla.org/en-US/docs/Games/Anatomy)
- [Game Programming Patterns](https://gameprogrammingpatterns.com/)
- [HTML5 Canvas Performance](https://web.dev/articles/canvas-performance)
