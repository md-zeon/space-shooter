# Mobile Support

## Overview

Space Shooter is fully playable on mobile devices with touch controls, responsive canvas, and mobile-optimized UX.

## Touch Controls

### Layout

```
┌─────────────────────────────────┐
│ [SCORE]    [WAVE 3]    [LIVES] │
│                                 │
│                                 │
│         PLAYFIELD               │
│                                 │
│                                 │
│ [JOYSTICK]            [FIRE]    │
│ (left 40%)          (right 60%)│
│                                 │
│            [PAUSE]              │
└─────────────────────────────────┘
```

### Virtual Joystick

- **Activation**: Left 40% of screen
- **Behavior**: Appears where finger touches
- **Visual**: Semi-transparent circle
- **Dead zone**: 15% of radius
- **Max radius**: 60px

### Fire Button

- **Activation**: Right 60% of screen
- **Behavior**: Auto-fire while held
- **Visual**: Crosshair icon, pulses when firing
- **Size**: 80-100px

### Gestures

| Gesture | Action |
|---------|--------|
| Touch & drag (left) | Move ship |
| Tap/hold (right) | Shoot |
| Two-finger tap | Pause |
| Swipe down | Mute |

## Responsive Canvas

### Scaling Strategy

```typescript
function resizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  const ctx = canvas.getContext('2d');
  ctx?.scale(dpr, dpr);
}
```

### Aspect Ratio

- **Portrait**: 9:16 (default)
- **Landscape**: 16:9 (fallback)
- **Maintain**: Aspect ratio with letterboxing

### DPI Handling

- Cap `devicePixelRatio` at 2 for performance
- Scale sprites based on screen density
- Use `Math.floor()` for pixel-perfect rendering

## Mobile-Specific Features

### Haptic Feedback

```typescript
function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// Shoot: short pulse
vibrate(10);

// Hit: medium pulse
vibrate(50);

// Explosion: long pattern
vibrate([50, 30, 100]);
```

### Fullscreen Mode

```typescript
function requestFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  }
}
```

### Prevent Default Behaviors

```css
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
```

### Safe Areas

```css
.game-container {
  padding: env(safe-area-inset-top)
           env(safe-area-inset-right)
           env(safe-area-inset-bottom)
           env(safe-area-inset-left);
}
```

## Performance Optimization

### Mobile-Specific

| Technique | Impact |
|-----------|--------|
| Cap DPR at 2 | 50% fewer pixels |
| Reduce particles | Less GPU load |
| Simpler shaders | Faster rendering |
| Lower resolution | Better FPS |

### Adaptive Quality

```typescript
function getQualityLevel(): 'low' | 'medium' | 'high' {
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency <= 4;
  
  if (isMobile && isLowEnd) return 'low';
  if (isMobile) return 'medium';
  return 'high';
}
```

### Quality Settings

| Level | Particles | Stars | FPS Target |
|-------|-----------|-------|------------|
| Low | 50 | 50 | 30 |
| Medium | 100 | 100 | 45 |
| High | 200 | 200 | 60 |

## Platform Considerations

### iOS Safari

- Add to home screen for fullscreen
- 50MB storage limit (uninstalled)
- Touch events need `{ passive: false }`
- No `beforeinstallprompt` event

### Android Chrome

- Install prompt available
- Generous storage quota
- Full PWA support
- Push notifications supported

### Desktop

- Keyboard/mouse primary
- Touch as fallback
- Window resizing supported

## Touch Event Handling

```typescript
class TouchController {
  private touches: Map<number, { x: number; y: number }> = new Map();
  
  handleTouchStart(e: TouchEvent) {
    for (const touch of Array.from(e.changedTouches)) {
      this.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
      });
    }
    e.preventDefault();
  }
  
  handleTouchMove(e: TouchEvent) {
    for (const touch of Array.from(e.changedTouches)) {
      const prev = this.touches.get(touch.identifier);
      if (prev) {
        const dx = touch.clientX - prev.x;
        const dy = touch.clientY - prev.y;
        this.handleMovement(dx, dy);
        this.touches.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
        });
      }
    }
    e.preventDefault();
  }
  
  handleTouchEnd(e: TouchEvent) {
    for (const touch of Array.from(e.changedTouches)) {
      this.touches.delete(touch.identifier);
    }
  }
}
```

## Testing

### Device Testing

- Test on real devices, not just emulators
- Test on low-end Android devices
- Test on iOS devices with different screen sizes
- Test landscape and portrait orientations

### Browser DevTools

1. Chrome DevTools → Toggle device toolbar
2. Select iPhone/Android presets
3. Enable touch simulation
4. Test network throttling

### Performance Profiling

```bash
# Chrome DevTools
1. Open Performance tab
2. Record session
3. Check for:
   - Long tasks (>50ms)
   - Layout thrashing
   - GC pauses
```

## Accessibility

### Reduced Motion

```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (prefersReducedMotion) {
  // Disable animations
  // Reduce particles
  // Simplify effects
}
```

### High Contrast

```css
@media (prefers-contrast: high) {
  :root {
    --text-primary: #FFFFFF;
    --text-secondary: #FFFFFF;
  }
}
```

## References

- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [web.dev Mobile Performance](https://web.dev/fast/)
- [Apple HIG Touch](https://developer.apple.com/design/human-interface-guidelines/)
