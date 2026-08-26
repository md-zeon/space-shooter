# PWA & Offline Support

## Overview

Space Shooter is a Progressive Web App (PWA) that works offline and can be installed on any device.

## Technologies

- **Serwist** - Service worker management
- **IndexedDB** - Persistent storage for high scores
- **Cache API** - Asset caching

## Setup

### Installation

```bash
npm install @serwist/next @serwist/precaching @serwist/sw idb
```

### Configuration

```typescript
// next.config.ts
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
```

## Service Worker Strategy

### Caching Policies

| Asset | Strategy | Reason |
|-------|----------|--------|
| HTML/JS/CSS | Cache-First | Instant load |
| Game sprites | Cache-First | Static assets |
| Audio | Cache-First | Synthesized |
| High scores | Network-First | Sync online |

### Cache Versioning

```typescript
// sw.ts
import { precacheAndRoute } from "@serwist/precaching";

precacheAndRoute(self.__WB_MANIFEST);
```

## Manifest

```json
{
  "name": "Space Shooter",
  "short_name": "SpaceShooter",
  "start_url": "/",
  "display": "fullscreen",
  "orientation": "portrait",
  "theme_color": "#050A1A",
  "background_color": "#050A1A",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

## Icons

Generate PWA icons using:
- [PWA Asset Generator](https://www.pwabuilder.com/imagegenerator)
- [Favicon Generator](https://favicon.io/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

Required sizes:
- 192x192 (standard)
- 512x512 (maskable)

## IndexedDB Storage

### Schema

```typescript
interface HighScore {
  id?: number;
  score: number;
  level: number;
  date: string;
}
```

### Usage

```typescript
import { openDB } from 'idb';

const db = await openDB('space-shooter', 1, {
  upgrade(db) {
    db.createObjectStore('highscores', {
      keyPath: 'id',
      autoIncrement: true,
    });
  },
});

// Save score
await db.add('highscores', {
  score: 10000,
  level: 5,
  date: new Date().toISOString(),
});

// Get top scores
const scores = await db.getAllFromIndex('highscores', 'score');
```

## Testing PWA

### Development

Service worker is disabled in dev mode. To test:

1. Build: `npm run build`
2. Start: `npm start`
3. Open DevTools → Application tab

### Lighthouse Audit

```bash
npx lighthouse http://localhost:3000 --view
```

Check:
- Installable
- PWA
- Offline ready

### Manual Testing

1. Open Chrome DevTools
2. Go to Application → Service Workers
3. Check "Offline" checkbox
4. Reload page - should work

## Browser Support

| Browser | PWA Support |
|---------|-------------|
| Chrome 90+ | Full |
| Firefox 90+ | Full |
| Safari 15+ | Limited (no push) |
| Edge 90+ | Full |
| iOS Safari 15+ | Add to home screen |
| Android Chrome | Full |

### iOS Limitations

- No `beforeinstallprompt` event
- Manual "Add to Home Screen" via Share menu
- 50MB storage limit (uninstalled)
- No push notifications until iOS 16.4+

## Offline Fallback

Create `public/offline.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Offline</title>
  <style>
    body {
      background: #050A1A;
      color: #F0F8FF;
      font-family: 'Orbitron', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div>
    <h1>OFFLINE</h1>
    <p>Connect to the internet to play.</p>
  </div>
</body>
</html>
```

## Deployment

Vercel automatically:
- Serves over HTTPS (required for PWA)
- Handles service worker scope
- Provides fast global CDN

No environment variables needed.

## References

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [Serwist Docs](https://serwist.net/)
