# Design System

## Color Palette

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Player Core | `#FFFFFF` | Ship hull |
| Player Glow | `#00FFFF` | Ship aura |
| Primary Action | `#FF006E` | Fire button, CTAs |
| Primary Accent | `#00F0FF` | Interactive elements |

### Enemy Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Enemy Primary | `#FF0044` | Basic enemies |
| Enemy Secondary | `#FF2A6D` | Advanced enemies |
| Enemy Glow | `#FF6600` | Enemy aura |
| Boss Primary | `#B300FF` | Boss entities |

### Power-up Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Shield | `#00E5FF` | Defensive power-up |
| Weapon | `#39FF14` | Weapon upgrade |
| Health | `#05FFA1` | Health restore |
| Score | `#FFD600` | Score multiplier |

### Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Void Deep | `#050A1A` | Base background |
| Void Mid | `#0A1428` | Mid-depth |
| Nebula Purple | `#12002A` | Nebula effects |
| Nebula Blue | `#1B1464` | Nebula effects |

### UI Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Text Primary | `#F0F8FF` | Main text |
| Text Secondary | `#B0B8C8` | Subdued text |
| Text Neon | `#00FFFF` | Highlights |
| Card Background | `#1F2230` | Panels |
| Border | `#2A2D3A` | Dividers |

## Typography

### Font Stack

```css
--font-title: 'Orbitron', sans-serif;      /* Game title, headers */
--font-score: 'Press Start 2P', cursive;   /* Score counters */
--font-hud: 'Electrolize', sans-serif;     /* HUD elements */
--font-body: 'Exo 2', sans-serif;          /* Body text */
--font-mono: 'VT323', monospace;           /* Terminal readouts */
```

### Usage

- **Title**: Orbitron Bold/Black for game logo and main headers
- **Score**: Press Start 2P for score counters and retro UI
- **HUD**: Electrolize for clean digital readouts
- **Body**: Exo 2 Regular/Light for descriptions
- **Mono**: VT323 for debug text and terminal effects

## Neon Effects

### Text Glow (Cyan)

```css
.neon-text-cyan {
  text-shadow:
    0 0 4px #FFFFFF,
    0 0 8px #00FFFF,
    0 0 20px #00FFFF,
    0 0 40px #00FFFF;
}
```

### Text Glow (Pink)

```css
.neon-text-pink {
  text-shadow:
    0 0 4px #FFFFFF,
    0 0 8px #FF006E,
    0 0 20px #FF006E,
    0 0 40px #FF006E;
}
```

### Button Glow (Cyan)

```css
.neon-btn-cyan {
  border: 2px solid #00F0FF;
  box-shadow:
    inset 0 0 6px rgba(0, 240, 255, 0.65),
    0 0 6px rgba(0, 240, 255, 0.75),
    0 0 20px rgba(0, 240, 255, 0.4),
    0 0 40px rgba(0, 240, 255, 0.2);
}
```

## Animations

### Timing Reference

| Animation | Duration | Easing |
|-----------|----------|--------|
| Button hover | 120ms | ease-out |
| Button press | 80ms | ease-in |
| Menu stagger | 100ms delay | back-out |
| Screen transition | 300ms | ease-in-out |
| Score count | 500ms | ease-out |
| Title glow | 3s loop | sinusoidal |

### Keyframes

```css
@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
```

## Health Bar Colors

| Health | Color | Animation |
|--------|-------|-----------|
| >= 60% | `#00FF00` | None |
| 30-59% | `#FFD600` | None |
| < 30% | `#FF0044` | Pulse |

## Design Rules

1. **Brightness = Importance**: Player 100%, UI 75%, enemies 70%, debris 30%
2. **Never pure black/white**: Always tint with blue/purple
3. **2-3 neon max per screen**: Prevent visual noise
4. **Player vs Enemy contrast**: Cyan (player) vs Red/Orange (enemy)
5. **Glows use alpha**: 20-40% outer bloom
6. **WCAG AA compliance**: 4.5:1 contrast ratio minimum
7. **Colorblind safe**: Use Blue/Orange or Magenta/Cyan, not Red/Green

## Gradients

### Deep Space

```css
background: linear-gradient(180deg, #050A1A 0%, #0A1428 60%, #1A2840 100%);
```

### Nebula

```css
background:
  radial-gradient(ellipse at 78% 12%, rgba(18, 0, 42, 0.55), transparent 55%),
  radial-gradient(ellipse at 18% 92%, rgba(10, 20, 60, 0.50), transparent 58%),
  linear-gradient(180deg, #050A1A, #0D0E14);
```

### CRT Arcade

```css
background:
  radial-gradient(ellipse at 50% 40%, rgba(0, 240, 255, 0.08), transparent 60%),
  #0A0A14;
```

## CRT Overlay

```css
.crt-overlay {
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.08) 2px,
    rgba(0, 0, 0, 0.08) 4px
  );
  pointer-events: none;
}
```

## Resources

- [Game UI Database](https://gameuidatabase.com/) - UI screenshots from 1,300+ games
- [Dribbble Space Shooter](https://dribbble.com/search/shooter-game-ui) - Design inspiration
- [ColorHaus Neon](https://www.schemecolor.com/neon-retro.php) - Neon color palettes
