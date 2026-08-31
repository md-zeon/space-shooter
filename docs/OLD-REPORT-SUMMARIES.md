# Research Report Summaries

Consolidated summaries of the original research documents. The full source reports were
removed to reduce doc sprawl; this file preserves the intent, key decisions, and design
rationale of each so the information is not lost.

---

## Design Research

### mobile-shmup-powers-controls-research.md
Mobile shmup player powers, touch controls, and charged attacks (survey of ~30 games:
DoDonPachi, Sky Force, Danmaku Unlimited, etc.). Decisions: relative trackpad movement
with a bottom dead-zone, auto-fire default, bomb via two-finger tap/corner button, and an
action-charged special meter (graze/kills fill, tap to cash out). Produces a tiered feature
stack (Tier 0–3) with an input-cost cheat sheet mapping each mechanic to thumb usage.

### RESEARCH-100-WAVES-VARIETY.md
How to keep 100 waves engaging without bespoke content (Galaga, Geometry Wars, Vampire
Survivors). Decision: variety comes from re-contextualizing existing enemies (palette swaps
with new rules, formation rotation, recipe-based composition), NOT HP inflation. 12 enemy
archetypes introduced over 10 decades with orthogonal player verbs; composition grammar
(ambient, duet, ladder, box, symbiosis, sequence) is the primary scaling lever.

### RESEARCH-BOSS-ATTACK-TYPES.md
Taxonomy of boss attacks: danmaku bullets, lasers, charged shots, shielded phases,
shockwaves/novas, soundwave pulses, homing missiles, summons/adds, contact/dash, and
enrage/transformation. Decision: every attack family needs a 300–500ms telegraph, attacks
blend micro-dodge and macro-reposition, and density is scaled down for a 400×700 portrait
canvas with touch-friendly dodge zones.

### RESEARCH-BOSS-DESIGN.md
Visual/structural guidelines for 10 bosses: silhouette readability, scale (1/3–1/2 screen
width), weak-point placement, telegraph color language, damage states, boss-minion visual
coordination. Decision: each boss gets one master shape (battleship, spider, turret-cruiser,
statue, creature, shell-metamorphosis, fortress, mech, escort-carrier, emblem) with a
single brightest primary weak point; health is destructible structure + phase thresholds,
not a raw HP bar.

### RESEARCH-GAMEPLAY-UIUX.md
UI/UX + audio research (reference games, feedback patterns, mobile best practices,
self-audit). Key decisions: declutter the HUD, UI sound is the biggest polish win,
meta-progression (persistent stats/unlocks) is essential for retention, synthesized SFX add
pitch variation, low-HP heartbeat, UI blips, and a laser charge-up ramp. Ten ranked
improvement proposals.

### RESEARCH-FULLSCREEN.md
Fullscreen/immersive mode for the web portrait shmup (iOS/Android/desktop). Decision:
fullscreen is correct, but iOS iPhone only supports PWA standalone (no Fullscreen API);
request fullscreen on Play tap for desktop/Android; replace fixed 400×700 canvas with
"keep width, expand vertically" on phones / "keep height, expand horizontally" on tablets;
add `viewport-fit=cover` + `env(safe-area-inset-*)` padding for notch/home-indicator safety.

### RESEARCH-HOME-SCREEN.md
Home screen/main menu design: the menu is an obstacle to minimize, not a feature to
decorate. Decision: Play button is a dominant hero in the bottom-center thumb zone; layout
is a vertical stack (title, high score, ship selector, Play); 44–48px touch targets; nav
depth capped at 3 levels; bottom tab bar (Play/Ships/Stats/Settings) if multi-section
navigation is needed.

### RESEARCH-FIRST-10-WAVES.md
Wave-by-wave design for waves 1–10, a 5-phase mini-arc (entry/settle/attack/desperation/
dissolve) with one new mechanic per wave. Decision: wave 10 is a deterministic boss-with-
minions capstone in four rotating phases (volleys, sweeps, gangs, desperation); coordination
is scripted composition + timing, not AI; every entry is choreographed single-file/flanking
to avoid pop-in. Also covers bonus-level design and a 100+ wave cadence with a boss every
10th wave.

### RESEARCH-WAVES-11-100.md
Master index for waves 11–100 into 9 decades; each decade introduces one new enemy
archetype culminating in a boss-with-minions capstone shaped like that decade's signature.
Decision: the player power kit scales on a gated schedule (hyper by 20, drone/armor by 30,
weapon-switch by 50, meta XP by 90); fairness via guaranteed pattern gaps, death-bomb
windows, bullet-sealing, and 200ms+ telegraphs; a tension/relief pulse (normal waves,
wave-9 calm, boss spike, post-boss breathing room) is the anti-boredom mechanism.

---

## Per-Decade Wave Research

Each decade (10 waves) introduces one new enemy archetype / gameplay verb and ends in a
matching boss. Wave 9 of each decade is a calm pre-boss relief beat; wave 10 is the boss.

### RESEARCH-WAVES-11-20.md — Decade 2: Wall / Barricade
Verb: **route re-negotiation** — enemies remove the column you're in rather than aiming at
you, breaking camping. Walls lower/raise in rhythm; shielded walls need targeted breaking;
the Spider War Machine boss's movement itself becomes the walls.

### RESEARCH-WAVES-21-30.md — Decade 3: Splinterer
Verb: **kill placement & target choice** — enemies die into directional shrapnel, so you
must kill in a safe direction, subverting "killing is always safe." Armored two-stage
splinterers, chain-reaction splinter ladders; Turret-Cruiser boss bursts into homing shards.
Player gains a drone/armor-pod by wave 30.

### RESEARCH-WAVES-31-40.md — Decade 4: Mirror / Homing
Verb: **baiting & reactive movement** — homing enemies must be steered into clean space;
mirror enemies replicate until killed with burst damage. The Statue/Face boss fires
cross-aimed eye-beams forming a lattice to weave through while steering mirror-minions.
Chain scoring and point-blank bonuses reward precision.

### RESEARCH-WAVES-41-50.md — Decade 5: Healer / Support + Elite / Leader
Verb: **strategic priority ladder** — the first enemies requiring prioritized targeting
(kill healers first), not just reflex. The Creature/Swimmer boss is the first mobile boss,
sweeping the top band while elite escorts buff it. Player gains weapon-type switching
(spread/laser/homing) by wave 50.

### RESEARCH-WAVES-51-60.md — Decade 6: Teleporter
Verb: **timing / second-focus** — enemies flicker in/out, breaking the habit of only
watching the top of the screen. The Shell/Inner Core boss sheds armor and teleports between
phases, requiring timed DPS into brief reveal windows. A "Doppler" fake-echo variant and a
"reward teleporter" add discrimination and risk/reward timing.

### RESEARCH-WAVES-61-70.md — Decade 7: Gravity / Attractor
Verb: **movement economy under a field effect** — gravity fields pull the ship, changing
control physics. The Fortress Wall boss has gravity-anchored turrets that warp the arena's
pull; players must move *with* the field to escape charge-beams. Dual attractors create
safe "null-point" pockets, teaching field reading.

### RESEARCH-WAVES-71-80.md — Decade 8: Terrain-blocker
Verb: **line-of-sight planning** — destructible and indestructible debris block shots and
hide enemies behind cover. The Rocket-Skater Mech boss is the first true *hunter* that
chases the player, planting explosive terrain to form a closing cage. Completes the
"R-Type spatial trilogy": walls block you, gravity moves you, terrain hides from you.

### RESEARCH-WAVES-81-90.md — Decade 9: Turret / Static emplacement
Verb: **positional awareness of static kill-zones** — turrets with distinct charge-up
telegraphs (AA, laser, plasma) demand reading tells and timing passes through deadly zones.
The Escort-Carrier boss continuously spawns and docks its own turret-armed mini-fleet, so
the minions ARE the fight. Player gains meta XP / permanent upgrades by wave 90.

### RESEARCH-WAVES-91-100.md — Decade 10: Reflect-shield / bullet-reflector
Verb: **fire discipline** — the only verb requiring the player to *stop shooting* during
reflect windows, capping the game by testing the core loop's inverse. The final boss
(The Emblem) is deliberately small and fast (anti-fortress), cycling the game's whole attack
vocabulary while deploying a census of every prior minion. The 10-wave gauntlet runs all
prior archetypes together; your own reflected fire becomes lethal without discipline.

---

*Superseded by:* `RESEARCH-USER-REPORT-WAVE-PACING-DIFFICULTY.md` — a follow-up report on
user-reported wave-pacing, enemy-spawning, boss-identity, and difficulty-scaling issues with
root-cause analysis and fixes. Note: that report's fix recommendations intentionally revise
reader assumptions in these older docs (e.g., HP scaling, boss attack uniqueness, formation
stagger) where user feedback showed the original design was not achieving its goals.
