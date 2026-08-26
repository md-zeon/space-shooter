# Space Shooter

A classic arcade space shooter game built with Canvas API, Next.js 16, and TypeScript. Control a ship, shoot enemies, collect power-ups, and chase high scores. Works offline and installable on any device.

## Features

- **Arcade Gameplay** - Classic space shooter mechanics with modern polish
- **Mobile Support** - Touch controls with virtual joystick
- **Offline Play** - Full PWA support, works without internet
- **Installable** - Add to home screen on any device
- **Synthesized Audio** - Retro sound effects via Web Audio API
- **High Scores** - Persistent leaderboard stored in IndexedDB

## Tech Stack

| Layer       | Technology              |
| ----------- | ----------------------- |
| Framework   | Next.js 16 (App Router) |
| Styling     | Tailwind CSS v4         |
| Game Engine | HTML5 Canvas API        |
| Animation   | GSAP                    |
| PWA         | Serwist                 |
| Storage     | IndexedDB (idb)         |
| Audio       | Web Audio API           |
| Language    | TypeScript              |

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/space-shooter.git
cd space-shooter

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

### PWA Development

The service worker is disabled in development mode. To test PWA features:

1. Build the project: `npm run build`
2. Start the server: `npm start`
3. Open in browser and check Application tab in DevTools

## Controls

### Desktop

| Action     | Key    |
| ---------- | ------ |
| Move Left  | ← / A  |
| Move Right | → / D  |
| Shoot      | Space  |
| Pause      | Escape |
| Mute       | M      |

### Mobile

| Action | Gesture                  |
| ------ | ------------------------ |
| Move   | Touch & drag (left side) |
| Shoot  | Tap/hold (right side)    |
| Pause  | Two-finger tap           |
| Mute   | Swipe down               |

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main page
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Global styles & design tokens
│   └── sw.ts             # Service worker
├── components/
│   ├── Game.tsx          # Canvas wrapper
│   └── UI/               # UI components
├── game/
│   ├── engine.ts         # Game loop
│   ├── player.ts         # Player logic
│   ├── enemy.ts          # Enemy types
│   ├── bullet.ts         # Projectiles
│   ├── powerup.ts        # Power-ups
│   ├── particles.ts      # Particle effects
│   ├── collision.ts      # Collision detection
│   ├── input.ts          # Keyboard input
│   ├── touch.ts          # Touch controls
│   ├── audio.ts          # Sound system
│   ├── renderer.ts       # Canvas utilities
│   └── config.ts         # Game constants
├── hooks/
│   └── useGameLoop.ts    # React hook
└── lib/
    ├── tokens.ts         # Design tokens
    └── storage.ts        # IndexedDB
```

## Documentation

- [Design System](./docs/DESIGN.md) - Colors, typography, components
- [Architecture](./docs/ARCHITECTURE.md) - Game engine design
- [PWA Setup](./docs/PWA.md) - Service worker & offline
- [Mobile](./docs/MOBILE.md) - Touch controls & responsive

## Performance

- 60 FPS on desktop
- 30+ FPS on mid-range mobile
- Object pooling for bullets/enemies/particles
- Offscreen canvas caching
- Fixed timestep game loop

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+
- iOS Safari 15+
- Android Chrome 90+

## License

MIT
