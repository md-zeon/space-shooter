# User Feedback Report — Wave Pacing, Enemy Spawning, Boss Identity, Difficulty Scaling

**Status:** Root-cause analysis with evidence and prioritized fixes
**Scope:** `src/game/wave.ts`, `src/game/enemy.ts`, `src/game/boss.ts`, `src/game/engine.ts`, `src/game/config.ts`
**Date:** 2026-08-31

---

## 1. Executive Summary

Players reported five distinct classes of problems. Investigation confirmed **all five are real**, and four of the five map to *specific, provable logic bugs* in the wave/spawn/despawn code rather than tuning-only concerns:

| # | Complaint | Verdict | Root cause |
|---|-----------|---------|------------|
| 1 | Waves end too fast / next wave starts before previous is cleared | **Bug** | `wave.ts` advances to the next wave based only on *spawn commands issued*, ignoring live enemies |
| 2 | All enemies of a wave come at once / no formation feel | **Bug** | per-enemy spawn delay is far too small; all commands queue-release in one frame |
| 3 | Enemies appear out of thin air | **Bug + design** | fast formation-lead enemies outrun their formation; random top-entry spawns pop at the screen edge |
| 4 | Boss attack types all feel the same | **Design flaw** | nearly every boss shares the same attack vocabulary + random selection |
| 5 | Later waves feel easier / difficulty is erratic (sometimes hard, sometimes too easy) | **Bug** | regular enemy HP does not scale with wave; randomness dominates; spawn cap hard-gates the whole wave |

---

## 2. Complaint #1 — "Waves end too fast / next wave starts before the previous one is cleared" — CONFIRMED BUG

### Evidence

`src/game/wave.ts:1156-1189` — `WaveManager.update()`:

```ts
update(deltaTime, activeEnemyCount, canvasWidth): SpawnCommand[] {
  const newSpawns: SpawnCommand[] = [];
  if (this.bossActive) return [];

  if (this.betweenWaves) {
    this.betweenWaveTimer -= deltaTime * 1000;
    if (this.betweenWaveTimer <= 0) {
      this.betweenWaves = false;
      this.currentWaveIndex++;
      this.startNextWave(canvasWidth);   // <-- advances IMMEDIATELY
    }
    return [];
  }

  this.spawnDelay -= Math.min(deltaTime * 1000, 100);
  while (this.pendingSpawns.length > 0 && this.spawnDelay <= 0) {
    if (this.nextSpawnTime > -this.spawnDelay) break;
    const cmd = this.pendingSpawns.shift()!;
    newSpawns.push(cmd);
    this.nextSpawnTime += Math.max(cmd.delay, 50);
  }

  // BUG: this condition fires the moment the LAST SPAWN COMMAND has been
  // emitted — it never checks whether any spawned enemies are still alive.
  if (this.pendingSpawns.length === 0 && newSpawns.length === 0 && !this.betweenWaves) {
    this.betweenWaves = true;
    this.betweenWaveTimer = 3000;        // <-- starts next wave 3s later
  }
  return newSpawns;
}
```

**The smoking gun:** `WaveManager.update()` accepts `activeEnemyCount` as a parameter but **never reads it**. The wave-transition trigger at `wave.ts:1183` fires when `pendingSpawns` (queued spawn commands) is empty — i.e., the moment the last enemy has been *spawned*, not the moment the last enemy has been *killed*. Any enemies that are still alive, or that fly off-screen without being shot, do not block progression.

### Evidence (caller passes the count, callee ignores it)

`src/game/engine.ts:283-286`:
```ts
const activeEnemyCount = this.enemies.countForSpawnCap();
if (activeEnemyCount >= 30) return;   // hard cap gate
const spawnCommands = this.waves.update(deltaTime, activeEnemyCount, CONFIG.WIDTH);
```
`activeEnemyCount` is computed and passed but never used inside `WaveManager.update`.

### Consequence
- The 3000ms countdown (and eventual `startNextWave`) begins as soon as the last spawn command leaves the queue, typically **seconds before** the last enemy is defeated. For a wave of 3 grunts (wave 1), all spawn within ~240ms, so the wave is "done" almost instantly — matching "waves end in the blink of an eye."
- "Wave should not move to next until all enemies of the current wave are dead" is exactly what is missing.

### Fix proposal
Make wave progression gated on active-enemy count (and remaining pending spawns). Add a method to `EnemyManager` to count live, un-removed enemies (and enemy bullets optionally), then require `pendingSpawns.length === 0 && liveEnemyCount === 0` before entering `betweenWaves`. Ignore enemies that are dying/expired but not yet reaped. Also extend the generator so every wave has an unambiguous "clear" signal.

---

## 3. Complaint #2 — "If we increase the enemy count we should think how they would come — not all at once / enemies don't have war formations" — CONFIRMED BUG

### Evidence

`src/game/wave.ts:1129-1138` — per-enemy stagger inside `getSpawnCommands()`:

```ts
for (let i = 0; i < positions.length; i++) {
  commands.push({
    ...
    delay: (group.delay || 0) + i * 80,   // <-- only 80ms per enemy
    ...
  });
}
```

and `wave.ts:1180`:
```ts
this.nextSpawnTime += Math.max(cmd.delay, 50);   // floor of 50ms between spawns
```

So a single group of, say, 15 enemies (procedural waves 21–200 use `count: 3 + rand*(3+tier*2)`, capped at 15 — `wave.ts:1102,1107`) is queued with only **80ms spacing**. At 60fps that is ~5 frames between each enemy. The entire group pops into being within about **1.2 seconds**, and because `update()` releases every command whose `nextSpawnTime` has passed in the same frame (`wave.ts:1176-1181`), most of the group is released in one or two frames.

### Evidence (procedural generator packs groups)
`src/game/wave.ts:1091-1109`:
```ts
const numGroups = 1 + Math.floor(Math.random() * (tier + 1));
...
groups.push({
  type, formation,
  count: Math.min(count, 15),
  delay: g * 800,          // 800ms BETWEEN groups — but 80ms WITHIN a group
});
```
With `delay: g * 800` and `i * 80` per enemy, high-count waves collapse into a near-simultaneous burst → "all comes and dies at once."

### Fix proposal
- Increase per-enemy stagger meaningfully and make it formation-aware (e.g., rows of a grid enter row-by-row with 300–600ms, not 80ms).
- Cap the number of commands released per `update()` call, spreading releases across frames (a paced "spawn budget per second").
- Use FormationOrigin to move the whole formation as a unit instead of spawning every member at once — the existing `formationId`/`FormationOrigin` machinery (`enemy.ts:141-153`) is already built for this but is bypassed because every member spawns simultaneously.
- Make difficulty raise *count gradually* with an explicit per-wave cap so later waves read as "more, arriving in waves," not "everything at once."

---

## 4. Complaint #3 — "Some enemies come out of thin air suddenly" — CONFIRMED (mix of bug + design)

### Evidence A — random top-entry spawns at the screen edge

`src/game/wave.ts:69-75`:
```ts
case 'random': {
  for (let i = 0; i < count; i++) {
    positions.push({
      x: margin + Math.random() * usableWidth,
      y: baseY + (fromBottom ? -Math.random() * 50 : -Math.random() * 50),
    });
  }
```
For top entry, `baseY = -ENEMY_HEIGHT` (`wave.ts:66`), so `y` lands between `-30` and `-80`. Due to the **80ms stagger + same-frame release** (see §3), several enemies are materialized at the very top edge within a frame or two, reading as "popping out of thin air" at the top of the screen.

### Evidence B — fast enemies outrun their formation origin

`src/game/enemy.ts:156-200` moves the shared `FormationOrigin` at `origin.speed * dt60`, but each member enemy also falls through the same `update` movement path. Members of a `rusher`-type formation use `movementPattern: 'rusher'` (`getMovementPattern`, `wave.ts:227`) which multiplies travel speed (`enemy.ts:421`), so the members separate from the formation leader quickly — they appear to spawn in mid-screen without a coherent "entrance."

### Evidence C — teleporter/blink is by design but reads as "thin air"
`enemy.ts:470+` implements the teleporter's `HIDDEN -> TELEGRAPH -> REVEALED` blink. This is intentional (decade 6 verb), but a **hidden enemy that is not yet telegraphing is not rendered** — combined with the fast simultaneous release, teleporters can genuinely appear out of nothing on the first reveal.

### Fix proposal
- Add a short, always-rendered "warp-in" telegraph/fade to every spawned enemy (scale-in or alpha ramp for ~250ms) so nothing appears without an entrance cue.
- Spawn enemy *positions* strictly off-screen with enough lead (larger off-screen distance) so they visibly fly in.
- Slow down formation-member separation: cap `rusher`/fast-member speed until the formation has fully entered (use the formation origin's `retreating`/entry phase).
- For teleporters, always render at least a faint telegraph ghost during the first reveal beat.

---

## 5. Complaint #4 — "Boss attack types are the same / all bosses feel the same" — CONFIRMED DESIGN FLAW

### Evidence A — overlapping attack vocabularies
`src/game/boss.ts:83-150` — almost every boss re-uses the same core attacks:

| Boss | Attacks |
|------|---------|
| cipher | radial, **aimed_stream**, shockwave |
| spider | **aimed_stream**, **fan**, radial, shockwave |
| turrets | **fan**, **laser**, shockwave, radial |
| statue | **laser**, **aimed_stream**, **fan**, **ring**, shockwave, soundwave, crossfire |
| creature | **aimed_stream**, **fan**, **laser**, shockwave, radial |
| shell | **aimed_stream**, **fan**, **ring**, **laser**, radial, snipe, shockwave |
| fortress | **aimed_stream**, **fan**, radial, charge, laser, soundwave |
| mech | **aimed_stream**, **fan**, laser, ring |
| carrier | **fan**, **aimed_stream**, ring, laser, soundwave |
| omega | **fan**, **aimed_stream**, ring, laser, radial, spiral, soundwave, shockwave |

`aimed_stream` (8 bosses), `fan` (9), `radial` (7), `shockwave` (6), `laser` (6), `ring` (6) dominate every roster.

### Evidence B — purely random selection makes them interchangeable
`src/game/boss.ts:527-533`:
```ts
if (this.boss.attackTimer >= this.boss.attackCooldown && !this.boss.currentAttack) {
  const attacks = this.getAvailableAttacks(def);
  this.boss.currentAttack = attacks[Math.floor(Math.random() * attacks.length)];
  this.boss.attackDuration = 2000 + Math.random() * 1500;
  ...
}
```
Attacks are drawn uniformly at random from what is essentially the same shared pool, so the identity of any given boss is statistically invisible in a short fight — they all feel like the same shape-shooter.

### Evidence C — several "signature" attacks are gated and rarely seen
`getAvailableAttacks` (`boss.ts:701-716`) requires phase≥2 for `spiral`/`composite`/`crossfire`/`snipe`/`charge`, and `laser` needs phase≥2 except statue. So in phase 1 (which is most of a fight at high HP), bosses fall back to the same `radial`/`fan`/`aimed_stream` — reinforcing sameness.

### Fix proposal
- Give each boss a **weighted, phase-aware signature attack** that is unique or dominant (e.g., spider = aimed/fan weave, statue = crossfire/laser, shell = snipe + ring, mech = charge). Use a weighted random that heavily favors the boss's signature; make the signature available from phase 1.
- Reduce cross-boss overlap: restrict the shared pool so each boss has at most ~4 attacks, of which 1-2 are unique.
- Differentiate bullet *colors/speeds/aiming* per boss so even shared attacks read differently (already partially done via `BOSS_*` colors in `config.ts:149-168`).

---

## 6. Complaint #5 — "Later waves feel easier than earlier / sometimes hard, sometimes too easy" — CONFIRMED (HP doesn't scale + spike randomness)

### Evidence A — regular enemy HP never scales with wave
`src/game/enemy.ts:103`:
```ts
const health = hp ?? (isWall ? 3 : type === 'elite' ? 4 : ... : 1);
```
Enemy health is a fixed constant per type. Boss HP scales (`boss.ts:163`: `baseHp + difficulty*25`), but **no regular enemy gets more HP at higher waves**. The player reaches max power/weapon early and one-shots everything regardless of wave number → later waves feel *easier* despite nominally being "harder," directly matching the complaint.

### Evidence B — difficulty drives only micro-ramps
`wave.ts:1199`:
```ts
this.difficulty = Math.floor(this.waveNumber / 3) + 1;
```
`difficulty` scales shoot intervals (`enemy.ts` shoot patterns) and a tiny speed bump (`wave.ts:1123`: `+ rand * difficulty * 0.3`), but not HP, not count ceilings in a way that makes later waves *climb*.

### Evidence C — random generation produces erratic difficulty spikes/dips
`wave.ts:1091-1109`: `numGroups = 1 + floor(rand*(tier+1))` and `count = 3 + floor(rand*(3+tier*2))` are fully random each run. A wave can roll `numGroups=1, count=3` (trivial) or `numGroups=4, count=15` (spike) at the same tier — hence "sometimes too easy, sometimes too hard."

### Evidence D — hard spawn cap can truncate a wave
`engine.ts:284`:
```ts
if (activeEnemyCount >= 30) return;   // stops feeding spawns entirely
```
Because deselected/lingering enemies (e.g., parked indestructible terrain excluded only at `enemy.ts:1379`) count toward the cap, dense waves can stall mid-spawn, then the wave-transition bug (§2) ends them while enemies remain — contributing to "got cleared without me doing anything."

### Fix proposal
- **Scale regular enemy HP with wave** (e.g., `hp * (1 + difficulty * 0.1)`, or a per-decade HP tier) so later waves require more hits — this is the single biggest lever for "later waves should feel harder."
- **Tame procedural randomness**: use seeded, monotonically-increasing per-wave budget (enemy-count + HP + group-count) with tight min/max bands, rather than independent uniform rolls, so difficulty ramps smoothly instead of spiking/dipping run-to-run.
- Keep the spawn cap but exclude *all* non-destructible/hovering enemies from the gate, and raise the cap with difficulty.
- Scale speed/bullet-rate *and* HP together so the hardness increase is consistent, not spiky.

---

## 7. Consolidated, Prioritized Fix Plan

### P0 — Correctness (directly match the two biggest complaints)
1. **Gate wave progression on cleared enemies** (`wave.ts:1183`). Use the already-passed `activeEnemyCount`: only enter `betweenWaves` when `pendingSpawns.length === 0 && activeEnemyCount === 0`. Add `EnemyManager.countAlive()` that counts non-removed, active enemies (including terrain that isn't reaped yet).
2. **Spread enemy release across time** (`wave.ts:1176-1181`, `getSpawnCommands` delay). Replace the 80ms per-enemy / 800ms per-group stagger with formation-aware pacing (row-by-row, 250–600ms) and cap releases per frame; drive the whole formation off the shared `FormationOrigin` so members enter as a coherent block.

### P1 — Feel / identity
3. **Entrance telegraph for every spawn** (§4 fix) — no enemy materializes without a visible cue.
4. **Weighted, phase-aware & unique boss signatures** (§5 fix) — reduce the shared pool; give each boss a signature that is available from phase 1.
5. **Formation-driven war-groups** — use `FormationOrigin` properly and define named formations per wave so "war formation" is visible, especially for large counts.

### P2 — Difficulty curve
6. **Scale regular enemy HP with wave**; **tame procedural randomness** with a monotonic seeded budget; **fix the spawn-cap truncation** (§6 fix).

### Suggested config knobs (`src/game/config.ts`)
- Add `ENEMY_SPAWN_STAGGER_MS`, `SPAWN_PACE_PER_SEC`, `ENEMY_HP_SCALE_PER_DIFF` tuning constants so the pacing/HP changes are data-driven, not hard-coded.

---

## 8. Verification Checklist
- [ ] Wave 1 doesn't advance to wave 2 until all 3 grunts are destroyed.
- [ ] A large group (e.g., wave 9's 18 enemies) enters in staged ranks with visible entrances, not a single-frame burst.
- [ ] No enemy appears at the top/edge without a brief warp-in telegraph.
- [ ] Each boss demonstrates a distinct, recognizable signature in phase 1.
- [ ] Wave 40 minions survive more hits than wave 1 minions; a wave at tier N is consistently harder than tier N-1 across multiple runs.
- [ ] `activeEnemyCount` is actually consumed inside `WaveManager.update()` (remove the dead parameter).
