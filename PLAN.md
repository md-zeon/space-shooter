# Space Shooter — Implementation Plan

## Overview

A classic arcade space shooter game built with Canvas API. Control a ship, shoot enemies, collect power-ups, and chase high scores. Pure client-side, no backend needed.

---

## Market Research

### Competitors

| Game                 | Strengths         | Weaknesses       |
| -------------------- | ----------------- | ---------------- |
| Galaga               | Classic gameplay  | Dated graphics   |
| Space Invaders       | Simple, addictive | No power-ups     |
| Asteroids            | Physics-based     | Limited variety  |
| R-Type               | Detailed sprites  | Complex controls |
| Browser arcade games | Accessible        | Often ad-heavy   |

### Opportunity

- No modern, clean space shooter exists for web
- Most browser games are ad-heavy or poorly designed
- Canvas-based game shows technical skill

### Target Users

- Anyone wanting quick fun
- Portfolio visitors (shows creative coding)
- Retro gaming fans

---

## Tech Stack

| Layer       | Technology               |
| ----------- | ------------------------ |
| Framework   | Next.js 16 (App Router)  |
| Styling     | Tailwind CSS + shadcn/ui |
| Game Engine | HTML5 Canvas API         |
| Animation   | GSAP (UI animations)     |
| PWA         | Serwist (service worker) |
| Storage     | IndexedDB (idb)          |
| State       | React state + refs       |
| Audio       | Web Audio API            |
| Deployment  | Vercel                   |

---

## Animation Library Research

### Recommendation: GSAP

**Why GSAP for this project:**
- Free since 2024 (Webflow sponsorship)
- Industry standard with excellent documentation
- Works with any framework (React, vanilla JS)
- Handles UI animations (menus, HUD transitions, score popups)
- Game loop handles canvas animations internally

### Alternatives Considered

| Library    | Best For                  | Bundle Size | Verdict                     |
| ---------- | ------------------------- | ----------- | --------------------------- |
| GSAP       | UI animations, timelines  | ~60kb       | **Recommended** - free, robust |
| Anime.js   | Lightweight DOM animation | ~17kb       | Good alternative, smaller   |
| PixiJS     | WebGL 2D games            | ~200kb      | Overkill for this project   |
| Konva      | Interactive canvas apps   | ~150kb      | Better for editors/tools    |
| Raw Canvas | Game logic animations     | 0kb         | Used for game loop anyway   |

### Animation Responsibilities

**GSAP handles:**
- Menu transitions (start, pause, game over screens)
- HUD animations (score counting, life indicators)
- Power-up pickup effects (DOM overlays)
- Screen shake effect coordination

**Canvas API handles (in game loop):**
- Player/enemy movement
- Bullet trajectories
- Particle systems
- Parallax scrolling
- All in-game entity animations

### Installation

```bash
npm install gsap
```

---

## PWA & Offline Support

### Implementation: Serwist

```bash
npm install @serwist/next @serwist/precaching @serwist/sw idb
```

### Service Worker Strategy

| Asset Type | Strategy | Reason |
|------------|----------|--------|
| HTML/JS/CSS | Cache-First | Instant load, versioned updates |
| Game sprites | Cache-First | Static assets, never change |
| Audio | Cache-First | Synthesized via Web Audio, no files |
| High scores | Network-First | Sync when online |

### Manifest Configuration

```json
{
  "name": "Space Shooter",
  "short_name": "SpaceShooter",
  "start_url": "/",
  "display": "fullscreen",
  "orientation": "portrait",
  "theme_color": "#000000",
  "background_color": "#000000",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Offline Features

- Full gameplay works without internet
- High scores saved to IndexedDB
- Automatic cache update on new deployment
- Offline fallback page if load fails

### next.config.ts

```typescript
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});
```

---

## Mobile Support

### Touch Controls

| Action | Gesture |
|--------|---------|
| Move | Touch & drag (virtual joystick) |
| Shoot | Tap anywhere (auto-fire while held) |
| Pause | Two-finger tap |
| Mute | Swipe down |

### Virtual Joystick Implementation

- Left side of screen: movement zone
- Right side of screen: shoot zone
- Visual joystick indicator follows finger
- Deadzone to prevent accidental movement

### Responsive Canvas

- Canvas fills viewport on all devices
- Maintain aspect ratio (9:16 portrait)
- Scale game elements based on screen DPI
- Handle device pixel ratio for sharp rendering

### Mobile-Specific Features

- Haptic feedback on shoot/hit (Vibration API)
- Fullscreen mode (no browser UI)
- Prevent zoom/scroll (touch-action: none)
- Handle orientation changes gracefully
- Battery-aware: reduce particles on low battery

### CSS Requirements

```css
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

canvas {
  display: block;
  width: 100vw;
  height: 100vh;
}
```

### Platform Considerations

| Platform | Notes |
|----------|-------|
| iOS Safari | Add to home screen for fullscreen, 50MB storage limit |
| Android Chrome | Install prompt, generous storage |
| Desktop | Keyboard/mouse primary, touch as fallback |

---

## Core Features

### Player System
- Smooth ship movement (arrow keys + WASD)
- Continuous shooting with fire rate control
- Lives system (3 lives default)
- Invincibility frames after taking damage
- Visual hit feedback (flash effect)

### Enemy System
- Multiple enemy types:
  - Basic: straight movement, no shooting
  - Advanced: diagonal movement, occasional shots
  - Elite: zigzag patterns, targeted shots
- Progressive difficulty (speed/health increase per level)
- Wave-based spawning with increasing intensity

### Projectile System
- Player bullets (upward trajectory)
- Enemy bullets (downward/diagonal)
- Bullet pooling for performance
- Collision detection (AABB)

### Power-up System
- Shield: temporary invincibility
- Rapid Fire: increased fire rate
- Multi-shot: 3-way spread
- Score multiplier: 2x points for 10 seconds

### Visual Effects
- Particle system for explosions
- Star parallax background (3 layers)
- Screen shake on impacts
- Glow effects for projectiles

### Audio System
- Synthesized sounds via Web Audio API (no external files)
- Sound effects: shoot, explosion, power-up, damage
- Background music: looping synth pattern
- Volume controls (SFX + Music)
- Persistent settings via localStorage

### UI/UX
- Start screen with instructions
- HUD: score, lives, level, power-up timer
- Pause menu (ESC key)
- Game over screen with restart option
- High score display (localStorage)

### Controls

**Desktop:**
| Action        | Key              |
| ------------- | ---------------- |
| Move Left     | ← / A           |
| Move Right    | → / D           |
| Shoot         | Space            |
| Pause         | Escape           |
| Mute Audio    | M               |

**Mobile:**
| Action        | Gesture              |
| ------------- | -------------------- |
| Move          | Touch & drag (left)  |
| Shoot         | Tap/hold (right)     |
| Pause         | Two-finger tap       |
| Mute          | Swipe down           |

---

## Performance Optimization

- Use `requestAnimationFrame` for game loop
- Implement fixed timestep with delta time
- Object pooling for bullets/enemies/particles
- Offscreen canvas for caching static elements
- Minimize `save()`/`restore()` calls
- Use integer coordinates to avoid sub-pixel rendering
- Multiple canvas layers (background, game, UI)
- Pre-render sprites to offscreen canvases

---

## Architecture

```
src/
├── app/
│   ├── page.tsx          # Main page
│   ├── layout.tsx        # Root layout
│   ├── sw.ts             # Service worker source
│   └── manifest.ts       # PWA manifest
├── components/
│   ├── Game.tsx          # Canvas wrapper
│   └── UI/
│       ├── HUD.tsx       # Score/lives display
│       ├── StartScreen.tsx
│       └── GameOver.tsx
├── game/
│   ├── engine.ts         # Game loop, update/render cycle
│   ├── player.ts         # Player ship logic
│   ├── enemy.ts          # Enemy types and AI
│   ├── bullet.ts         # Projectile management
│   ├── powerup.ts        # Power-up system
│   ├── particles.ts      # Particle effects
│   ├── collision.ts      # Collision detection
│   ├── input.ts          # Keyboard + touch handling
│   ├── touch.ts          # Virtual joystick, gestures
│   ├── audio.ts          # Web Audio API manager
│   ├── renderer.ts       # Canvas drawing utilities
│   └── config.ts         # Game constants
├── hooks/
│   └── useGameLoop.ts    # React hook for game loop
└── lib/
    └── storage.ts        # IndexedDB high scores
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1-2)
- Project setup with Next.js + Tailwind
- Canvas initialization and game loop
- Player ship rendering and movement
- Basic keyboard input handling
- Responsive canvas sizing

### Phase 2: Core Gameplay (Day 3-4)
- Bullet system with pooling
- Enemy spawning and basic AI
- Collision detection
- Score tracking
- Mobile touch controls

### Phase 3: Polish (Day 5-6)
- Particle effects and explosions
- Power-up system
- Audio integration
- UI screens (start, pause, game over)
- GSAP menu animations

### Phase 4: PWA & Mobile (Day 7-8)
- Service worker setup (Serwist)
- Manifest configuration
- Offline caching strategy
- Touch controls refinement
- Virtual joystick
- Haptic feedback
- Fullscreen mode

### Phase 5: Enhancement (Day 9)
- Progressive difficulty
- High score persistence (IndexedDB)
- Performance optimization
- Visual polish (parallax, screen shake)
- Cross-browser testing

---

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Auto-deploy
4. Environment variables: None
5. HTTPS: Required for PWA (Vercel provides by default)
6. Generate PWA icons (192x192, 512x512)

---

## Success Metrics

- 60 FPS gameplay on desktop
- 30+ FPS on mid-range mobile devices
- No lag with 100+ entities on screen
- Works on desktop browsers (Chrome, Firefox, Edge, Safari)
- Works on mobile browsers (iOS Safari, Android Chrome)
- High score persists between sessions (IndexedDB)
- Full offline playability (PWA)
- Installable to home screen
- Responsive canvas sizing
- Smooth controls with no input lag (keyboard + touch)
