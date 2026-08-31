# Review & Bug Report — Mobile Player Clearing All 100 Levels

**Status:** Gamer-perspective review + psychology-grounded code audit + bug report
**Method:** Static analysis of `src/game/*` and `src/components/Game.tsx`, simulated mobile play (400×700 portrait), grounded in game-design psychology research
**Date:** 2026-08-31

---

## 0. TL;DR / Severity Map

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| 1 | **P0** | Beating the wave-100 **final boss does nothing** — the game silently continues into endless procedural waves (101+), no victory/credits/restart, so "clearing 100 levels" has no payoff | `engine.ts:931` `onBossDefeated`, `wave.ts:1092` |
| 2 | **P0** | Mobile **FOCUS button overlaps the touch move-deadzone** in the bottom-left thumb zone; tapping it steals the move touch (ship won't steer when thumb is over FOCUS) | `Game.tsx:130-143`, `config.ts` `TOUCH_DEADZONE` |
| 3 | **P1** | **Touch targets too small vs iPhone guideline:** bomb (`w-8`=32px) and shoot-mode toggle (32px) are below Apple's 44px min — frequent mis-taps in high-pressure boss fights | `Game.tsx:145-172` |
| 4 | **P1** | Help/controls copy is **keyboard-flavored on mobile** ("L / Z AT MAX POWER FIRES THE LASER"); laser is actually fired by the ✷ button on touch | `renderer.ts:625-627` |
| 5 | **P1** | Procedural wave RNG is **only partly seeded**: `wave.ts:1117` (type roll) and `wave.ts:1146` (speed jitter) still use raw `Math.random()`, so "same wave = same identity" is only half true and endgame difficulty is still erratic run-to-run | `wave.ts:1117,1146` |
| 6 | **P2** | Wave-100 ends **exactly 100 spawn-commands with no graze/clear bounty** — the "final" wave is only `[{},{}]` empty; the finale leans entirely on the omega boss, no send-off | `wave.ts:1081-1083` |
| 7 | **P2** | Hidden 11th boss **`abyss`** (wave 110+) only reachable *after* the final boss in endless loops — likely dead content nobody will ever meet | `boss.ts:156,173` |

**Good news:** the prior user-report's P0 (wave-pacing fires before clearing) and P1 (spawn-burst) are **already fixed and correctly wired** — verified in current code (`wave.ts:1249-1257` gates on `activeEnemyCount===0`; `computeEntryStagger` + `releaseBudget=5` spread releases; spawn cap now scales with difficulty). This report is about what *remains*.

---

## 1. Executive Review (gamer + psychology lens)

As a player asked to clear 100 levels on mobile, the first 20 waves are genuinely well-made: auto-fire on by default, relative trackpad steering, a bottom dead-zone, graze bonuses, telegraphs. The difficulty S-curve idea from the design docs is real in the authored decades. But three psychological problems block long-form (100-wave) play:

### 1.1 The finale has no ending → the loop never "closes" (P0)
Clearing 100 waves in a modern arcade game must produce a *closure beat* — credits, a victory screen, a "you did it" validation, a meta-unlock, or at minimum an explicit invitation to loop. Here the wave-100 omega boss (intentionally the "TRUE FINAL BOSS", `wave.ts:1081`) is killed, `onBossDefeated` fires the generic boss-death path, and the game **immediately starts spawning wave 101 of endless procedural content**. There is no `victory` state at all. 

Psychology: **goal-gradient + sunk-cost + closure**. Once a player commits to "beat the final boss," reaching it and getting *nothing* — not even a reading of "ENDLESS MODE START" — reads as a bug or an unfinished game. The most reported form of rage-quit in arcade-like mobile titles is not difficulty; it's the *absence of a recognized payoff* at the moment of victory (misplaced salience / unfulfilled reward prediction). This is the single highest-leverage finding.

**Fix:** on omega death, enter a `victory` state that: freeze-play, play a distinct fanfare, show a "100 WAVES CLEARED" screen with final score, and clearly transition into "ENDLESS MODE — continue?? [YES/EXIT]". Make endless a *conscious choice*, not an incidental continuation.

### 1.2 Scale of failure means >1 bomb here reads as punishment (P2)
`BOMB_COUNT:3` with `AUTO-BOMB` default-on means the "safe first failure" is covered. But in a 100-wave marathon with no between-run meta-progression and no checkpoint/continue, dying at wave 80 sends the player *all the way back to wave 1*. Long-form shmups (Touhou, Danmaku) are designed around single-sitting or short sessions; this is a mobile game where sessions are 2–5 min. Forcing a full 100-wave reset on death without a meta-unlock or stage-select is a retention killer — the S-curve flow state (research: ~58% flow time on a well-tuned curve) collapses the moment progress is thrown away wholesale.

**Fix:** add a checkpoint (re-spawn at the start of the current decade / boss wave), or a "continue from wave N" after game-over, at minimum. Research (`RESEARCH-GAMEPLAY-UIUX.md`) already flagged *meta-progression for retention* — it is not implemented, and it's the difference between "one more run" and "uninstall."

### 1.3 Small touch targets + overlapping deadzone break the thumb budget (P0/P1)
The bottom corners are where both thumbs naturally rest. The FOCUS button (bottom-left, 56px) sits exactly in the left-thumb move zone; the ✷/B/A buttons (bottom-right, 32/32px) sit in the right-thumb zone. When a bullet-hell pattern forces the player to move to the bottom-left corner, the ship *stops responding* because the canvas touch handler never sees touches that start on the HTML button. Combined with sub-44px targets (P1), this produces exactly the "my ship sticks / I fat-fingered the bomb" frustration players report in mobile shmup reviews.

**Fix:** on touch devices, don't overlay action buttons on the canvas corners — extend the layout so buttons sit *below* the playfield (dedicated control strip), or grow FOCUS/B/✷ to ≥44px and raise `TOUCH_DEADZONE` to reserve a true non-gameplay control band. Ensure the canvas `touchstart`/`touchmove` map coordinates so touches that begin outside the canvas can't freeze the ship.

---

## 2. Bug Report (verified by code)

### P0-1 — No victory state after wave-100 final boss
- **Where:** `engine.ts:931` `onBossDefeated()`; `wave.ts:1081-1083` wave 100 = `{ groups: [], isBossWave: true, isBossPrep: false }`; `wave.ts:1092` appends waves 101–200.
- **What:** Killing omega triggers normal boss-death → 3s timer → `waves.onBossDefeated()` → next wave. No check for `waveNumber === 100`, no `victory`/`credits`/`endless` gate.
- **Repro:** Play to wave 100, kill the Emblem, observe endless wave 101 start.
- **Expected:** a distinct finale acknowledgment and an explicit endless-mode entry point.

### P0-2 — FOCUS button steals the move touch in the bottom-left deadzone
- **Where:** `Game.tsx:130-143` FOCUS button `left-3, bottom: safe+1.5rem, w-14 (=56px)`; `config.ts` `TOUCH_DEADZONE:90` (canvas px ~ bottom ~13% band); canvas handlers in `engine.ts`/`input.ts`.
- **What:** The button is an HTML element stacked above the full-bleed canvas. A `pointerdown` on it never reaches the canvas, so steering stops while the thumb is over FOCUS. The deadzone renders a trackpad right where FOCUS lives.
- **Expected:** movement must not dead-zone under the control strip, or buttons must live outside the move band.

### P1-1 — Sub-44px touch targets for high-frequency buttons
- **Where:** `Game.tsx:147` shoot-toggle `w-8` = 32px; `Game.tsx:165` bomb `w-8` = 32px; special `w-11` = 44px; focus `w-14` = 56px.
- **What:** Bomb and A/M toggles are 32px, below Apple's 44px and Material's 48px minimum. Worst button (bomb, ⌀32) is also the one you tap hardest under fire.
- **Expected:** all action buttons ≥44px; dedicated control strip to avoid canvas overlap.

### P1-2 — Mobile sees keyboard-only help copy
- **Where:** `renderer.ts:625-627`: `'L / Z AT MAX POWER FIRES THE LASER'` (and the banner `renderer.ts:527` "BUILT FOR TOUCH · AUTO-FIRE ON").
- **What:** On a phone there is no `L`/`Z` key; the laser is the ✷ button. The copy literally instructs an input that doesn't exist for the platform.
- **Expected:** platform-aware help (e.g., "✷ / L/Z AT MAX POWER FIRES THE LASER").

### P1-3 — Procedural wave RNG is only partly seeded (endgame still erratic)
- **Where:** `wave.ts:1111` `const rng = mulberry32(waveNum * 7919)` is used for `numGroups`, formation, and count — **good**. But `wave.ts:1117` `const roll = Math.random()` (type choice) and `wave.ts:1146` `const speed = ... + Math.random() * this.difficulty * 0.3` still use raw `Math.random()`.
- **What:** The docs promise "waveNum feeds the RNG seed so each specific wave keeps its own stable identity" (`wave.ts:1109-1110`, and the earlier report's requirement for *deterministic* waves). Three unseeded rolls remain → the same wave number re-rolls its enemy mix/speed run-to-run, so the "later waves consistently harder" goal (already weakened by no regular-HP scaling — see below) is further undermined by variance.
- **Expected:** route **all** procedural randomness through the per-wave `rng` (and if determinism is genuinely desired, don't leave so many live rolls).

### P1-4 — Regular enemy HP still doesn't scale with wave (from prior report, still open)
- **Where:** `enemy.ts:103` health is a fixed per-type constant; no wave scalar.
- **What:** The prior report's complaint #5 ("later waves feel easier") is only half-addressed — pacing/density were tuned, but enemy *tankiness* is flat, so a late-game player at max power one-shots wave-90 grunts the same as wave-10 grunts. Difficulty bumps are micro (speed/comma) only.
- **Expected:** scale regular enemy HP (and payoffs) with wave/decade.

### P2-1 — Empty authored finale; finale depends 100% on the omega fight
- **Where:** `wave.ts:1081-1083` wave 100 = empty groups.
- **What:** Nothing builds to the final boss — no preceding swarm, no "all archetypes" gauntlet (which the decade-10 design doc promised: "the 10-wave gauntlet runs all prior archetypes together"). Any combinator variety in wave 91–99 is (per P1-3) procedural.
- **Expected:** a scripted multi-archetype gauntlet for waves 91–99, then the omega capstone.

### P2-2 — `abyss` boss is unreachable within the advertised 100-level scope
- **Where:** `boss.ts:84` `BOSS_DEFS` = 11 entries (index 10 = `abyss`); selection `boss.ts:173` `Math.floor((waveNumber-1)/10)` clamped to `length-1`.
- **What:** waves 10…100 → indexes 0…9 (cipher…omega). `abyss` (index 10) requires wave 110, which only exists in the *endless procedural loop after the final boss*. The home screen markets "100 WAVES • 10 BOSSES" — so `abyss` is invisible dead content.
- **Expected:** either fold it into the main 100 (rebalance roster) or prominently label it as an endless-mode bonus boss.

---

## 3. Psychology-Research-Grounded Recommendations (highest value first)

1. **Closure for the 100-wave run** (P0-1) — unfulfilled reward prediction at the "final boss" is the #1 rage/quit trigger. Add a victory beat + explicit endless gate. *(Flow/closure research.)*
2. **Meta-progression / continues** (1.2) — loses all progress at wave 80 with no checkpoint or persistent unlock breaks retention; add decade checkpoints and/or a persistent meta-XP store (already absent though recommended in `RESEARCH-GAMEPLAY-UIUX.md`). *(Retention/commitment research.)*
3. **Respect the thumb budget** (P0-2/P1-1) — move action buttons off the canvas dead-zone and ≥44px. Mis-salient, undersized controls directly fracture flow in dense bullet patterns. *(Misplaced salience & state-transition friction research.)*
4. **Make the ending difficulty land** (P1-3/P1-4) — a finale that's *randomly* easier/harder than the prior decade reads as a bug; the final decade should be the *provably hardest*, via seeded deterministic scaling + HP tiers, not RNG variance.
5. **Surface the hidden boss / endless mode** — if `abyss` exists, tell the player it's reachable ("BONUS: survive into ENDLESS to meet THE ABYSS"), converting hidden content into a retention hook instead of dead code.

---

## 4. Verification Checklist
- [ ] Killing the wave-100 omega yields a distinct victory beat (not silent wave 101).
- [ ] On a phone, steering still responds when the thumb is in the bottom-left FOCUS region.
- [ ] Bomb / shoot-toggle buttons are ≥44px taps.
- [ ] Help copy reflects on-screen ✷/FOCUS/buttons on touch devices (no bare "L / Z").
- [ ] Replaying a fixed wave number (e.g., 55) yields an identical enemy mix across runs.
- [ ] Late-decade grunts take visibly more hits than wave-1 grunts.
- [ ] `abyss` is reachable and clearly advertised (or removed from the 100-wave roster).
