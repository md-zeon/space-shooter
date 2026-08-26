# Enhanced Space Shooter - Implementation Plan

Research compiled from classic shmups: Gradius, R-Type, Ikaruga, DoDonPachi, Touhou, Jamestown, Galaga.

---

## 1. Wave System

### Wave Structure
- **Opening**: Simple enemies, teaches basics, builds confidence
- **Mid-section**: V-formations, aimed patterns, flanking groups
- **Peak**: Dense formations, all enemy types
- **Pre-boss relief**: Simple waves only, signals upcoming boss

### Spawning Logic
- **Trigger-based**: Next wave fires when current wave is cleared (primary)
- **Time gate**: Safety net — force spawn after X seconds if wave isn't cleared
- **Wave counter**: Display "WAVE X" at start, fade out after 2s

### Wave Templates (per difficulty tier)
| Tier | Waves | Enemies/Wave | Types | Bullet Count |
|------|-------|--------------|-------|--------------|
| 1-3  | 3-5   | 3-6          | Basic only | 0-1 per enemy |
| 4-6  | 5-7   | 6-12         | Basic + Advanced | 1-2 per enemy |
| 7-9  | 7-10  | 10-20        | All types | 2-3 per enemy |
| 10+  | 10+   | 15-30        | All + Elite | 3-5 per enemy |

---

## 2. Formation Patterns

### Formation Types
| Formation | Behavior | Design Purpose |
|-----------|----------|----------------|
| **Line** | Horizontal row, march down | Lane pressure, teaches lateral positioning |
| **V-Shape** | V formation, enter from top | Tests rapid clearing |
| **Diamond** | 4+ enemies in diamond | Compact threat |
| **Circle** | Ring that expands/contracts | Surrounds player |
| **Pincer** | Two groups from sides | Compression pressure |
| **Spiral** | Enemies on spiral path | Sweeping motion |
| **Grid** | Rows and columns | Wall-of-enemies |

### Formation Movement
- **Leader-follower**: One leader follows path, members offset from leader
- **Phase transitions**: Hover → charge → retreat (teaches rhythm)

---

## 3. Enemy Movement Patterns

### 8 Core Movement Types
1. **Straight Line** — Baseline, speed implies urgency
2. **Sinewave** — Sine offset on straight path, multiple create weaving
3. **Zigzag** — Sharp directional changes
4. **Dash** — High-speed rush, tests reaction
5. **Repositioning** — Move between waypoints
6. **Hovering** — Slow wandering (bosses/large enemies)
7. **Teleporting** — Appear/disappear, rewards quick kills
8. **Swooping** — Curved arcs (Galaga-style)

### Enemy Lifecycle
1. **Intro**: Enter animation (tween, scale, teleport)
2. **Action**: Movement + shooting
3. **Departure**: Exit animation or off-screen

---

## 4. Shooting Patterns (15 Archetypes)

| # | Pattern | Description | Use Case |
|---|---------|-------------|----------|
| 1 | **Radial** | 360° evenly spaced | Basic enemy, boss filler |
| 2 | **Spiral** | Rotating angle over time | Boss sub-pattern |
| 3 | **Fan** | Concentrated wedge at player | Snapshot mechanic |
| 4 | **Aimed** | Track player position | Forces movement |
| 5 | **Wave/Curtain** | Sine-wave shaped walls | Visual rhythm |
| 6 | **Grid** | Regular bullet grid | Readable gaps |
| 7 | **Floral** | Symmetric petal designs | Boss spell cards |
| 8 | **Ring** | Expanding/contracting circle | Boss technique |
| 9 | **Star** | Polygon-angle bursts | Boss personality |
| 10 | **Stack** | Same angle, different speeds | Streaming walls |
| 11 | **Homing** | Curves toward player | Living creature feel |
| 12 | **Laser** | Line/band attack | Area denial |
| 13 | **Rain** | Top-to-bottom pour | Stage atmosphere |
| 14 | **Composite** | Multiple layered patterns | Boss fights |
| 15 | **Splitting** | Bullets divide mid-flight | Surprise element |

### Design Rule
**Design the gaps, not the density.** At least one safe path must always exist.

---

## 5. Boss System

### Boss Phase Architecture (3 phases standard)
- **Phase 1**: Moderate density, clear telegraphs, establishes identity
- **Phase 2**: Increased density, new attack, forces adaptation
- **Phase 3**: Combines Phase 1+2 patterns layered together

### Phase Transitions
- Boss enters invulnerability animation
- Clear all bullets from screen (become score items)
- Boss repositions or changes form
- Brief respite (2-3 seconds)

### Boss Attack Types
1. **Radial bursts** — Expanding rings
2. **Aimed streams** — Continuous tracking fire
3. **Spiral patterns** — Rotating bullet arms
4. **Fan spreads** — Wedge shots
5. **Laser beams** — Telegraphed line attacks
6. **Minion summoning** — Spawn additional enemies
7. **Charge attacks** — Ram or dash at player
8. **Shield mechanics** — Rotating barriers, timed vulnerability

### Boss Health Display
- Horizontal bar at top of screen (60-80% width)
- Segmented by phase (color-coded: white → orange → red)
- Boss name displayed above bar
- "Delayed damage chunk" effect (Souls-style trail)

### Boss Death Sequence
1. Damage states visible on sprite (sparking, breaking)
2. Escalating explosions (series of increasingly large blasts)
3. Final white flash detonation
4. All bullets cancelled → become score items
5. 5-10 seconds total, then clean resolve

### Mini-Bosses
- 20-40% of main boss HP
- 1-2 phases max
- 15-30 second fights
- Drop power-ups as reward
- Test mastery of stage mechanic

---

## 6. Warning Systems

### Boss Approach Warning Sequence
1. Music fades out (silence creates tension)
2. Screen dims (darken overlay)
3. Alarm sound (siren/klaxon)
4. "WARNING" text pulses on screen
5. Boss name in red
6. Boss entrance animation

### In-Attack Telegraphing
| Signal | Meaning |
|--------|---------|
| Weapon glows warm | Energy attack incoming |
| Wings spread/panels open | Fan/spread attack |
| Charging animation | Powerful attack |
| Brief pause | Pattern about to fire |
| Thin warning line | Laser about to fire |
| Boss repositioning | New pattern/phase |

### Telegraph Timing
- Basic attacks: 300-500ms warning
- Complex attacks: 500-1000ms warning
- "If a player can't react on first attempt, it's too fast, not too hard"

---

## 7. Bullet Count Scaling

### Three-Axis Difficulty
| Axis | Easy | Normal | Hard |
|------|------|--------|------|
| Enemy count | 1.0x | 1.0x | 1.3x |
| Spawn timing | 1.0x | 0.85x | 0.70x |
| Bullet speed | 1.0x | 1.2x | 1.5x |

### Density Limits
| Difficulty | Max Bullets/Burst | Min Spacing | Telegraph |
|------------|-------------------|-------------|-----------|
| Easy | 12 | 28px | 700ms |
| Normal | 20 | 18px | 550ms |
| Hard | 32 | 12px | 450ms |

### Scaling Rule
**Never stack multiple scaling axes simultaneously.** Introduce one change at a time.

---

## 8. Power-Up System

### Power-Up Types
| Type | Effect | Rarity |
|------|--------|--------|
| **Weapon (P)** | Level up main weapon (max 5) | Common |
| **Shield** | Temporary invincibility | Uncommon |
| **Bomb** | Screen-clearing special | Rare |
| **Health** | Restore 1 life | Uncommon |
| **Score** | Bonus points | Common |
| **Speed** | Increase ship speed | Common |

### Weapon Progression
- **Level 1**: Single shot
- **Level 2**: Dual shot
- **Level 3**: Triple spread
- **Level 4**: Quad + aimed
- **Level 5**: Full spread + homing

### Drop Design
- Key enemies always drop what player needs
- Fodder enemies drop probabilistically
- Player reaches max power within first third of level
- After death, recovery to max takes 30-60 seconds

### Visual Communication
- Power-up glow on ship when powered up
- Shot spread/sound/density visibly scales
- Distinct color per power-up type (diamond shape with glow)

---

## 9. Player Ship Design

### Visual Principles
- **Cool colors**: Cyan, blue, white, teal (contrast against warm enemies)
- **Hitbox smaller than sprite**: Small dot near cockpit
- **Silhouette first**: Outline readable before color/detail
- **Wing accents**: Emphasize banking animation

### Ship Animation Set
1. **Banking/Tilt** (highest priority):
   - 3 frames minimum: neutral, left-tilt, right-tilt
   - Driven by INPUT, not velocity
   - Snaps immediately on key press

2. **Idle animation**:
   - Thruster glow pulsing (2-4 frame cycle)
   - Micro fuselage oscillation
   - Present but unconscious

3. **Engine exhaust**:
   - Continuous with intensity variation
   - Stronger when accelerating
   - More intense at higher power levels

4. **Weapon firing**:
   - Muzzle flash (1-2 frames)
   - Recoil micro-motion (1px)
   - Barrel glow when charged

### Visual Feedback
- **Hit flash**: White flash for 1-3 frames on damage
- **Shield bubble**: Semi-transparent sphere (additive blending)
- **Damage states**: Sparks, flickering engine, trailing smoke
- **Power-up glow**: Ship radiates aura at high power

---

## 10. Enemy Ship Design

### Visual Hierarchy
| Tier | Size | Color | Shape |
|------|------|-------|-------|
| Popcorn | 1x player | Muted | Simple geometric |
| Basic | 1.5-2x | Orange/Yellow | Angular, simple |
| Advanced | 2-3x | Red/Crimson | Complex angular |
| Elite | 3-4x | Red/Purple | Armored, elaborate |
| Mini-boss | 6-10x | Multi-color | Distinctive |
| Boss | Fills 20-40% screen | Unique palette | Iconic |

### Attack Readiness Indicators
- Weapon glows warm before firing
- Wings spread before fan attack
- Charging animation with increasing brightness
- Brief deceleration before attack

### Design Rule
**All enemies in a faction share visual consistency** (same materials/colors) while being distinguished by shape and accent.

---

## 11. Bullet Visual Design

### Player vs Enemy Bullets
| Property | Player | Enemy |
|----------|--------|-------|
| Color | Cyan/blue/white | Red/orange/pink |
| Shape | Elongated, directional | Round, organic |
| Trail | Short, sharp | Soft glow |
| Layer | Rendered BELOW enemy bullets | Rendered ON TOP |

### Readability Rules
- Bullets are most luminous objects on screen
- Enemy bullets always rendered on top of all other objects
- Separate patterns use visually distinct bullet types
- Trails communicate velocity and trajectory

---

## 12. UI Elements

### HUD Layout
- **Score**: Top-left, heavy font, dark outline
- **High Score**: Top-center, smaller
- **Lives**: Top-right, icon-based (ship silhouettes)
- **Wave**: Top-right, brief overlay at wave start
- **Power level**: Near player or dedicated zone
- **Boss HP**: Top bar, segmented, with boss name
- **Shoot mode**: Bottom-left, small indicator

### Font Rules
- Heavy weight (not thin)
- Dark outline or drop shadow
- Color NOT used in bullet/background palette

### Screen Effects
| Effect | Use | Duration |
|--------|-----|----------|
| Hit flash | Enemy damaged | 1-2 frames |
| Explosion | Enemy destroyed | 15-30 frames |
| Screen shake | High-impact events | Trauma-based decay |
| White flash | Boss death | 1 frame full opacity |
| Red flash | Player damage | 1 frame |
| Hitstop | High-impact hits | 2-4 frames |

### Explosion Rules
- Brief and bright
- Color: White-hot → orange → gray smoke
- Scale matches enemy size
- Never fully occlude active bullets (use additive blending)

---

## 13. Implementation Priority

### Phase 1: Core Mechanics
1. Wave system with trigger-based spawning
2. Formation patterns (line, V-shape, diamond)
3. Enhanced enemy movement patterns
4. Player ship banking animation

### Phase 2: Shooting & Power-ups
5. Enemy shooting patterns (radial, aimed, fan, spiral)
6. Weapon power-up progression (5 levels)
7. Shield, health, score power-ups
8. Bomb mechanic

### Phase 3: Boss System
9. Boss phase architecture (3 phases)
10. Boss health bar with segments
11. Boss attack patterns (8 types)
12. Boss warning system
13. Boss death sequence
14. Mini-boss encounters

### Phase 4: Visual Polish
15. Enhanced ship animations (idle, exhaust, firing)
16. Enemy attack telegraphs
17. Screen effects (shake, flash, hitstop)
18. Explosion particle system upgrade
19. Bullet trail effects

### Phase 5: UI & Flow
20. HUD redesign
21. Wave transition announcements
22. Boss name cards
23. Score multiplier system

---

## References
- Flukz.org — Shmup design series
- Sparen's Danmaku Design Studio — Bullet pattern theory
- SLYNYRD Pixelblog — Sprite design, shot types
- npaka's 15 Beautiful Bullet Patterns — Pattern taxonomy
- Boghog's Bullet Hell Shmup 101 — Boss design
- Gradius Wiki, Shmups Wiki — Game documentation
