# Design Spec & Bug Report — Enemy Behaviors, Difficulty, Boss Minions, HP & Death VFX

**Status:** Code-verified bug report + design spec
**Scope:** `src/game/enemy.ts`, `src/game/boss.ts`, `src/game/wave.ts`, `src/game/engine.ts`, `src/game/particles.ts`, `src/game/config.ts`
**Date:** 2026-08-31

---

## 0. Gamer Report → Verdict map

| # | Gamer's report | Verdict | Root cause (code) |
|---|----------------|---------|-------------------|
| 1 | Boss minions are **not attacking** | **Bug (confirmed)** | `boss.ts:818-985` `updateMinions` moves minions but only `drone` fires (and only when it despawns). `shooter`/`fleet`/`gturret` are *documented* as firing but have **no fire code**. |
| 2 | Enemy **goes down off-screen and vanishes** if not killed | **Design gap** | `enemy.ts:616-617` removes any enemy with `y > canvasHeight + height`; straight/rusher patterns just descend and despawn. No loop/return behavior. |
| 3 | **Enemy comes out of nowhere in the middle** of the screen | **Design gap** | `teleporter`/`teleport` spawn hidden and reveal mid-screen (`enemy.ts:386-394,480-503`); `random` formation + `formationId=-1` (`wave.ts:1148`) lets members fly/teleport into the field; no guaranteed edge entrance. |
| 4 | The **game is easy** | **Design** | Relative trackpad + auto-bomb + auto-fire make survival forgiving; enemy fire intervals are slow and density capped; most authored waves teach/roster rather than threaten. |
| 5 | **Doesn't get harder with wave** | **Partial bug** | HP scales weakly (`enemy.ts:109` `* (1 + difficulty*0.08)`); shoot intervals scale but floor out; boss "handicap" from prior fixes **reduced** threat; player power plateaus early (max power ≈ wave 20), so nothing procedurally outpaces the player. |
| 6 | **Boss easy after handicap** | **Design regression** | Boss attacks were already weighted/signature-tuned and density was *reduced* for the 400×700 touch canvas + auto-bomb; boss HP scales but minions (finding #1) don't contribute fire → fights feel like dodging the boss alone. |
| 7 | **HP bar should show only after the enemy is hit (and while HP remains)** | **Not implemented** | `enemy.ts:1341` draws the bar whenever `maxHealth > 1` — shown full at spawn, never tied to "has it been damaged." |
| 8 | **Type-specific death animation** | **Not implemented** | `engine.ts:877-883` uses one generic `emitExplosion` (only size differs). `particles.ts:84-95` has no per-type variants. |

---

## 1. Confirmed Bug — Boss minions never attack

### Evidence
`src/game/boss.ts:818-985` — `updateMinions()` iterates minions and updates their **position only**. Inspecting the whole switch:

| Minion type | Movement? | Fires? |
|-------------|-----------|--------|
| `basic` | descends | **no** |
| `rusher` | dives fast | **no** |
| `shooter` | hovers/wobbles (comment implies firing) | **no** — doc/code contradiction |
| `shield` | orbits boss | **no** |
| `mirror` | homes + climbs | **no** |
| `escort` | rides creature fin | **no** |
| `aimer` | marks/hovers | **no** |
| `mine` | orbits then lunges | **no** |
| `slot` | slides on fortress face | **no** |
| `gturret` | sways (comment "fires and pulls") | **no** — doc/code contradiction |
| `drone` | glides then plants | **only on despawn** radial burst (`:956-966`) |
| `fleet` | files down (comment "fire a light shot") | **no** — doc/code contradiction |

`burst` (the returned `BossBulletRequest[]`) is only ever appended inside the `drone` branch. So every boss-with-minions (wave 10, 20, … 100) has minions that are pure moving hitboxes — they never contribute fire. That matches "boss minions are not attacking" exactly.

### Required (spec)
Every minion type that is **supposed** to threaten the player must fire in a way consistent with its role:
- **shooter** — aimed/short spread on a cadence (its whole job).
- **fleet** — the light shot its comment promises.
- **gturret** — a small aimed or vertical shot (and keep its gravity pull).
- **mine** — lunge already exists; optionally a tiny burst on detonation near the player.
- **basic / rusher / mirror** — at high boss phase, a sparse aimed or single straight shot.
- **shield / escort / slot** — remain **non-firing** by design (they are geometry / shielding, not offense) — this is *correct* and must be preserved.

Each minion attack needs the same 200–400ms telegraph language as bosses (rising glint before firing) so density stays readable on a 400×700 touch field.

---

## 2. Enemy should not vanish off the bottom — it should execute its pattern fully

### Evidence
`enemy.ts:614,616-617`:
```ts
if (enemy.y > canvasHeight + enemy.height) {
  this.remove(enemy);
}
```
`straight`, `rusher`, `sinewave`, `swoop`, `zigzag`, `homing`, `mirror`, `ambush` all end by drifting below → removed. If the player lets them pass, they silently despawn and the game gives no reward/scoring — reinforcing "why bother."

### Required (spec)
**No enemy should despawn just for reaching the bottom.** Instead, each movement pattern should **loop or re-enter** so the enemy keeps operating:
- **straight / line** — when it exits the bottom, **re-enter from the top** (offset X as a "loop is a treadmill"), reset its `patternTimer`, so formations sustain. (This is the classic "enemy wraps the vertical screen.")
- **rusher / swoop / ambush** — wrap to top like `straight`, or (better) turn around and re-approach with a dictated pattern, keeping its threat.
- **homing / mirror** — when it exits bottom, wrap to top and re-home; they should remain alive & dangerous until killed, not despawn.
- **sinewave / zigzag / diamond** — continue looping their X-oscillation on a vertical loop.
- **Wall / terrain / turret / reflector / attractor** — these *park* and are destructible; they may still despawn after their authored lifespan/phase, but that is a design choice to keep the arena clean — document it.

Waves end when everything is **killed** (`countAlive()===0` already gates on this and is unaffected by wrapping — wrapping entities stay `active`, so they correctly block wave advance until destroyed, which matches "clear every enemy").

---

## 3. No enemy should appear out of nowhere mid-screen — every entry needs an edge origin + entrance

### Evidence
Two distinct teleport sources:
- **`teleporter` type** (`enemy.ts:480-503`) — a controlled blink cycle `HIDDEN(1400ms, not rendered) → TELEGRAPH(350ms ghost) → REVEALED(hittable)`. This is a designed pattern, but the single 350ms telegraph is easy to miss under fire, so the *mid-field materialization* still reads as sudden on first contact.
- **`teleport` movement pattern** (`enemy.ts:386-394`) — the real culprit: raw `Math.random()` repositioning to a random X with only a `flashTimer=300` and **no ghost/entrance animation** — genuinely appears out of nowhere in the middle.
- Additionally `random` formation gives `formationId = -1` (`wave.ts:1148`) → members don't ride a `FormationOrigin`, so they scatter into the field.

### Required (spec) — keep the teleport, add an entrance animation
Do **not** remove the teleport/blink verbs (they are decade-6 design). Instead give every teleport a clear, skimmable entrance so nothing appears from nothing:

- **`teleport` movement pattern** (`enemy.ts:386-394`): add a true **entrance animation** — a short (~250–400ms) "warp-in": a growing glint ring + fast scale-in (0 → 1) + primary-color shimmer that plays *before* the enemy becomes targetable. Follow it with the existing flash. The enemy should "fold in" from a point, not blink to full body at a new X.
- **`teleporter` type** (`enemy.ts:480-503`): keep the phased blink, but **lengthen/reinforce the telegraph beat** so it cannot be missed under fire (e.g., a brief resonant ring pulse + brighten, and hold the ghost with a shadow even during `hidden` at 20% alpha so the player is always aware *something* is there). The reveal window then reads as "I saw it coming in."
- **Warp-in fade/scale for all spawns** (~250ms) so every enemy visibly enters (see §3 general rule).
- **`random` units** must still enter from the top/side and be driven by a `FormationOrigin` even when "random" — driven as a group, never scattered teleports.
- Fast members must **not outrun their formation origin**: gate member speed until the formation has fully entered (the origin's entry phase), so the group reads as a block.

---

## 4. Difficulty: it feels easy and doesn't climb

### Evidence
- **HP scaling is weak & floor-dominated:** `enemy.ts:109` `baseHealth * (1 + difficulty*0.08)`. `difficulty = floor(wave/3)+1`, so even at wave 90 (`difficulty=31`) a basic enemy has `1 * (1+31*0.08) ≈ 3.5 → 4` HP. At max weapon power (≈4–5), most enemies die in 1–2 hits the whole run → "easy."
- **Fire intervals floor out:** `checkShoot` intervals use `Math.max(1500/1200/…, 3500 - difficulty*150)` — after ~wave 15 the interval is at its floor and stops shrinking. Bullet count grows slowly (`radial: 8+difficulty`) but density is capped by the arena + auto-fire help.
- **Player power plateaus early:** max power reached by ~wave 20; laser/special and auto-bomb make lategame forgiving.
- **Boss handicap:** prior tuning reduced boss bullet density for the 400×700 touch field AND minions don't fire (finding #1) → bosses are dodge-the-boss-alone fights → easy.

### Required (spec)
1. **Scale regular-enemy HP meaningfully with difficulty,** not just +8%: use a per-decade HP tier (e.g., base × `(1 + (difficulty-1) * 0.12)`) **and** raise the tier math so late waves take visible extra hits. Keep explicit `hp:` overrides unscaled (they are design choices).
2. **Let fire cadence keep climbing:** remove or raise the interval floors so later waves genuinely densify; scale bullet **speed** mildly with difficulty so faster enemies stay threatening.
3. **Increase density *with* difficulty, bounded by the spawn cap** (cap already grows `+8*difficulty` in `engine.ts:286`) — but *raise* the per-wave count budget so "more arrive in waves," matching the difficulty S-curve research.
4. **Reverse the boss handicap smartly:** keep touch fairness but restore threat via minion fire (finding #1) and phase-locked **bullet densification** rather than raw speed, so it climbs without becoming unreadable.
5. **Give the player an incentive to push into late waves:** meta-progression / score / endless rewards so "harder" is meaningful and revisitable.

---

## 5. HP bar: show only when the enemy has been hit (and while it has HP left)

### Evidence
`enemy.ts:1341-1351`:
```ts
if (enemy.maxHealth > 1) {
  // draws full bar at spawn regardless of damage
}
```
Bars are drawn at spawn for every multi-HP enemy, cluttering the field.

### Required (spec)
- Track a `hasTakenDamage` flag on each enemy (set true the first time `damageEnemy` touches its core/shield, `enemy.ts:787-794`).
- Draw the bar **only when** `hasTakenDamage && health > 0` (and optionally let it fade out a moment after the last hit).
- While a **shield** is up, show the shield ring (already exists) but no core bar until the core is actually damaged.
- Bosses keep their permanent full-width bar (they are the pace-setter) — this rule applies to normal enemies only.

---

## 6. Type-specific death animation

### Evidence
`engine.ts:877-883` — one generic path:
```ts
if (enemy.type === 'elite') { playExplosion(); emitExplosion(..., 1.5); }
else { playExplosionSmall(); emitExplosion(..., 0.8); }
```
`particles.ts:84-95` — `emitExplosion` is a single white/orange puff, no per-type variant.

### Required (spec)
Add a **per-type death VFX table** driven by `enemy.type` so each archetype dies recognizably (new helpers in `particles.ts`, called from `onEnemyKilled`):

| Type | Death signature |
|------|-----------------|
| `basic` | small quick puff — white spark, dies instantly |
| `advanced` | medium puff + a short cyan flash ring |
| `elite`/`leader` | big flash ring + slow-blooming ember shower + **screen shake**
| `rusher` | directional **speed-line burst** along its travel axis (it "burns out" mid-dive) |
| `homer`/`mirror`/`mirrorcopy` | **shatter** — the sprite snaps into jagged shard particles (no round puff) |
| `splinterer` | fires its shrapnel (already) + a cracked split frame before detonating |
| `healer` | a soft **green cross / heal-pulse** dissipating (it "fades," no violent boom) |
| `teleporter`/`teleport` | **blink-out** — the body fades in a shimmer, leaving a brief echo silhouette |
| `attractor` | gravitational **implosion** — particles pull inward then collapse |
| `terrain` (non-explosive) | heavy **debris jumble** (grey rock chunks); (explosive keeps its radial boom) |
| `turret` | **spark + smoke column**, brief muzzle-flash re-fire |
| `wall` | **barricade collapse** — segments tumble down as chunky blocks |
| `reflector` | **mirror-shatter** — cold white-blue shards, brief flash |

Each signature reuses `particles.emit`/`emitExplosion` primitives but varies **count, colors, direction, speed and formation** so it reads as the type, not a generic boom.

---

## 7. Consolidated spec checklist (prioritized)

- [ ] **P0 — Minion fire** (§1): `shooter`, `fleet`, `gturret` actually fire with telegraphs; boss fights regain their intended pressure.
- [ ] **P0 — No bottom-despawn** (§2): normal enemies wrap / complete their pattern; they only leave when killed. `countAlive()` correctly blocks wave advance until destroyed.
- [ ] **P1 — Edge-only entrance + coherent formation** (§3): no enemy materializes mid-screen; teleporters keep a visible telegraph ghost while hidden; random members ride a `FormationOrigin`; warp-in fade for all.
- [ ] **P1 — Difficulty climbs** (§4): meaningful HP tiers, faster cadence, higher density, restored boss pressure — without exceeding touch readability.
- [ ] **P2 — HP bar on hit only** (§5): `hasTakenDamage` gating, fade-out.
- [ ] **P2 — Type-specific death VFX** (§6): per-archetype death signature table.

### Suggested config knobs (`config.ts`)
- `ENEMY_HP_SCALE_PER_DIFF` (replace hard-coded `0.08`), `ENEMY_HP_TIER_PER_DECADE`
- `ENEMY_MIN_FIRE_INTERVAL` floor (allow later tightening)
- `ENEMY_BULLET_SPEED_SCALE_PER_DIFF`
- New `DEATH_VFX` registry keys if needed.
