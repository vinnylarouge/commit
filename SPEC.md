# Commit — Static Mobile-First Web App Specification

Vincent's spec, 2026-09-12, verbatim. Do not edit; quote it. Decisions that depart from it go in DECISIONS.md.

Status: MVP architecture
Deployment target: GitHub Pages
Primary device: phone
Secondary devices: tablet and desktop
Runtime model: fully client-side, local-first, installable PWA
Working title: Commit

────────

## 1. Product

Commit is not primarily a probability calculator.

It answers:

> **What is the least I need to commit to make this happen with a probability I am comfortable with?**

Existing MathHammer-style tools mostly answer:

> If unit A attacks unit B, what happens?

Commit instead takes:

• a target;
• a set of attackers currently available;
• a tactical goal;
• a confidence threshold;
• optional resource constraints;

and returns an ordered contingent plan.

Example:

```text
ERADICATORS FIRST

74% chance to kill

If it survives:
→ Ballistus Dreadnought
→ 93% total

1 CP only adds +2%
SAVE THE CP

[ Details ]
```

The primary artefact is a recommendation, not a graph.

────────

## 2. MVP constraint: static GitHub Pages app

The first version must require:

• no server;
• no database service;
• no API keys;
• no login;
• no cloud account;
• no app-store installation.

Everything happens in the browser.

This makes the deployment model:

```text
GitHub repository
      │
      ▼
GitHub Actions
      │
      ▼
static Vite build
      │
      ▼
GitHub Pages
      │
      ├── HTML/CSS/JS
      ├── bundled rules/schema data
      └── PWA assets
```

Persistent user state is stored locally with IndexedDB.

The app should remain useful offline once loaded.

────────

## 3. Recommended stack

Core

```text
Vite
React
TypeScript (strict)
```

Reasons:

• excellent static-site deployment;
• trivial GitHub Pages hosting;
• fast mobile runtime;
• strong typing for the combat model;
• easy component ecosystem without requiring a framework server.

Use strict: true and prohibit any in application code.

State

Use two levels:

```text
Zustand
  └── ephemeral UI / current game state

Dexie + IndexedDB
  └── rosters
  └── custom profiles
  └── saved matchups
  └── preferences
  └── cached analysis
```

No Redux.

Styling

Prefer:

```text
CSS Modules or plain scoped CSS
CSS custom properties for design tokens
```

A utility CSS framework is not necessary for this app. The UI is small enough that explicit CSS will keep mobile behaviour predictable.

Testing

```text
Vitest
React Testing Library
Playwright
```

The numerical engine should have more tests than the UI.

PWA

Use vite-plugin-pwa.

Requirements:

• installable;
• app icon;
• offline shell;
• cached static rules data;
• no compulsory network access after first load.

────────

## 4. Routing on GitHub Pages

Avoid ordinary history-based SPA routes because GitHub Pages does not provide arbitrary route fallback.

Use hash routing:

```text
/#/
/#/setup
/#/game
/#/analyse
/#/settings
```

This avoids 404.html routing hacks and works from repository subpaths.

Alternatively, most of the MVP can be a stateful single-page interface with only a few top-level hash routes.

────────

## 5. Product modes

There are only three top-level modes.

```text
PREP       GAME       SANDBOX
```

Prep

Before a game:

• import your roster;
• import opponent roster;
• inspect obvious matchup strengths/weaknesses;
• precompute pairwise attack distributions.

Game

The primary product.

Ask:

> What should I commit here?

Sandbox

Traditional calculator for users who explicitly want to experiment.

This contains:

• arbitrary attacker/defender selection;
• modifiers;
• complete distributions;
• efficiency tables;
• compare mode.

The Sandbox absorbs "MathHammer nerd" requirements without contaminating the Game UX.

────────

## 6. Mobile-first navigation

On phones:

```text
┌─────────────────────────────┐
│ COMMIT                 ⋯    │
│                             │
│        current screen       │
│                             │
│                             │
├─────────────────────────────┤
│   Prep     Game    Sandbox  │
└─────────────────────────────┘
```

Use a fixed bottom navigation bar.

Minimum touch target:

```text
44 × 44 CSS px
```

Primary actions should normally be at least 48 px high.

Do not rely on hover.

Do not put critical actions in menus.

────────

## 7. Core game UX

The primary path should take roughly five seconds.

Screen 1 — choose target

```text
COMMIT

What needs to die?

┌────────────────────────────┐
│ Deathshroud Terminators    │
│ 3 models · 9 W remaining  │
└────────────────────────────┘

Land Raider
Plague Marines
Cultists

[ Search target ]
```

Targets are drawn from the opponent's imported roster.

The most recently selected and most tactically relevant targets stay near the top.

A long press or secondary control opens current-state editing.

────────

Screen 2 — choose goal

The target opens directly into:

```text
DEATHSHROUD TERMINATORS

What do you need?

[ Kill unit ]

[ Remove ≥ 2 models ]

[ Deal ≥ 6 wounds ]

[ Custom ]
```

Default should be Kill unit.

If the target is already damaged, the app uses current state.

────────

Screen 3 — choose confidence

Use three opinionated presets, not a precision slider by default:

```text
How certain?

[ Gamble 60% ]

[ Reliable 80% ]

[ Must happen 95% ]
```

A small Custom option can expose an arbitrary threshold.

This is much faster than asking users to choose between 0% and 100% every time.

Persist their last-used default.

────────

Screen 4 — available attackers

```text
Who can attack it?

✓ Eradicators
✓ Ballistus
✓ Hellblasters
  Intercessors

[ Select all plausible ]

                [ Calculate ]
```

The app remembers which units have already activated this turn and removes them from this list.

Later versions may infer availability. The MVP does not.

────────

Screen 5 — recommendation

This screen must be immediately legible from arm's length.

```text
┌───────────────────────────────┐
│ ERADICATORS FIRST             │
│                               │
│ 74% chance to kill            │
│                               │
│ If it survives:               │
│ → BALLISTUS                   │
│ → 93% total                   │
│                               │
│ 1 CP only adds +2%            │
│ SAVE THE CP                   │
│                               │
│ [ Resolve attack ]            │
│                               │
│ Details ▾                     │
└───────────────────────────────┘
```

There should be exactly one dominant answer.

Alternatives go below it.

────────

## 8. Simple ↔ detailed answer

This is the central UX distinction.

It should not be implemented as separate beginner/expert modes.

Every result has two presentations of the same PlanAnalysis.

Simple presentation

Contains at most:

• first action;
• headline success probability;
• contingent next action;
• resource recommendation;
• one short reason.

Example:

```text
ERADICATORS FIRST

74% kill chance

If they fail:
→ Ballistus
→ 93% total

Using the stratagem adds only 2%.
SAVE THE CP.
```

Detailed presentation

Expanded inline:

```text
Goal
Kill target with ≥ 90% probability

Recommended policy
1. Eradicators
2. Observe damage
3. If target survives with > 2 W, Ballistus
4. Otherwise stop

Success                       93.2%
Expected attacker activations 1.26
Expected CP                   0.00
Expected wounds wasted        1.8
Expected enemy points removed 143

Alternative plans
────────────────────────────────────────
Eradicators                         74.1%
Ballistus                           61.3%
Ballistus → Eradicators             91.0%
Eradicators → Ballistus             93.2%
Both committed immediately          93.2%

Why this order?
The Eradicators solve the target alone in 31% of
states where committing the Ballistus immediately
would be unnecessary.

[ Probability distribution ]
[ Assumptions ]
[ Rules trace ]
```

The detailed layer is primarily a trust interface.

────────

## 9. Resolution/replanning UX

After an attack, do not make the player rebuild the calculation.

Tap:

```text
[ Resolve attack ]
```

Then show a compact outcome picker based on target type.

For multi-model units:

```text
What happened?

[ 0 killed ]
[ 1 killed ]
[ 2 killed ]
[ Unit destroyed ]

Wounds on surviving model:
[ - ]  2  [ + ]

[ Continue ]
```

For vehicles/monsters:

```text
Damage dealt

[ 0 ] [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5+ ]

Exact: [ 7 ]

[ Continue ]
```

The existing policy is conditioned on the observed state and recomputed.

Result:

```text
TARGET HAS 4 W LEFT

Use Ballistus now.

88% chance to finish it.

[ Resolve ]
```

This adaptive loop is the strongest differentiator.

────────

## 10. Resource modelling

Do not reduce "commitment" to points.

There are several distinct costs.

```ts
type ResourceCost = Readonly<{
  activations: number;
  commandPoints: number;
  oncePerGameUses: ReadonlyArray<AbilityId>;
  expectedOverkill: number;
}>;
```

Unit points are primarily relevant to:

• pre-game efficiency;
• expected enemy material removed;
• army construction;
• trade analysis.

An attacker does not consume its points merely by firing.

────────

## 11. Mathematical problem

Let:

```text
S : finite combat state space
A(s) : legal candidate actions in state s
G : S → Bool
q : [0,1]
C : policy → cost vector
```

A policy may depend on observed intermediate outcomes:

```text
π : observation history → action | stop
```

For policy π, define:

```text
Pπ = Pr[G(final_state) = true | initial_state, π]
```

The optimisation is:

```text
find Pareto-minimal π
such that Pπ ≥ q
```

with respect to a cost vector such as:

```text
(
  expected activations,
  expected CP,
  scarce resources consumed,
  expected overkill
)
```

For a single scalar ranking in the UI:

```text
score(π) =
    wA * E[activations]
  + wCP * E[CP]
  + wR * scarce_resource_cost
  + wO * E[overkill]
```

but retain the Pareto frontier internally.

Do not hide materially different alternatives merely because one arbitrary weighting wins by a tiny margin.

────────

## 12. Canonical domain model

Use branded IDs so unrelated identifiers cannot be accidentally interchanged.

```ts
type Brand<T, Name extends string> =
  T & Readonly<{ __brand: Name }>;

type UnitId = Brand<string, "UnitId">;
type WeaponId = Brand<string, "WeaponId">;
type AbilityId = Brand<string, "AbilityId">;
type RosterId = Brand<string, "RosterId">;
```

Core profile:

```ts
type UnitProfile = Readonly<{
  id: UnitId;
  name: string;
  points: number;
  models: number;
  toughness: number;
  armourSave: number;
  invulnerableSave: number | null;
  woundsPerModel: number;
  feelNoPain: number | null;
  keywords: ReadonlySet<string>;
  weapons: ReadonlyArray<WeaponProfile>;
  abilities: ReadonlyArray<AbilityId>;
}>;
```

Weapon profile:

```ts
type DiceExpr =
  | Readonly<{ kind: "constant"; value: number }>
  | Readonly<{ kind: "die"; count: number; sides: number; modifier: number }>;

type WeaponProfile = Readonly<{
  id: WeaponId;
  name: string;
  attacks: DiceExpr;
  skill: number;
  strength: number;
  armourPenetration: number;
  damage: DiceExpr;
  keywords: ReadonlySet<string>;
}>;
```

Combat state:

```ts
type UnitState = Readonly<{
  unitId: UnitId;
  modelsRemaining: number;
  woundsOnDamagedModel: number;
  hasActivated: boolean;
}>;

type CombatState = Readonly<{
  attackerStates: ReadonlyMap<UnitId, UnitState>;
  targetState: UnitState;
  commandPoints: number;
  activeEffects: ReadonlySet<AbilityId>;
}>;
```

The actual Warhammer rules require a richer model; these types define the architectural shape rather than claiming completeness.

────────

## 13. Probability engine

The engine should be framework-independent TypeScript.

```text
src/engine/
    dice/
    distributions/
    combat/
    rules/
    optimisation/
```

React must never contain combat arithmetic.

Core distribution type

Represent finite discrete distributions exactly when practical.

```ts
type Probability = number; // invariant: 0 ≤ p ≤ 1

type PMF<T> = ReadonlyMap<T, Probability>;
```

Core operations:

```ts
mapDistribution
flatMapDistribution
convolve
condition
probabilityOf
expectation
```

Most common d6 combat chains can be computed exactly.

────────

## 14. Exact-first, simulation-second

Use exact distributions for standard cases:

```text
attacks
→ hits
→ wounds
→ saves
→ damage
→ model allocation
```

This produces deterministic answers and removes Monte Carlo noise from the normal UI.

Use Monte Carlo only for rule interactions whose exact state space becomes unreasonable.

Interface:

```ts
type AnalysisMethod =
  | Readonly<{ kind: "exact" }>
  | Readonly<{
      kind: "monte-carlo";
      samples: number;
      seed: bigint;
    }>;
```

The user should normally never need to know which was used.

The detailed panel may report it.

────────

## 15. Web Workers

Heavy calculations must not block the phone UI.

Architecture:

```text
React UI
   │
   ▼
analysis client
   │
   ▼
Web Worker
   │
   ├── probability engine
   └── policy optimiser
```

Messages should be typed.

```ts
type AnalysisRequest =
  | AnalyseAttackRequest
  | OptimiseCommitmentRequest
  | BuildMatchupMatrixRequest;

type AnalysisResponse =
  | AnalysisProgress
  | AnalysisSuccess
  | AnalysisFailure;
```

The app remains interactive during large matrix computations.

────────

## 16. Optimiser architecture

A plan is an adaptive policy tree.

```ts
type PlanNode =
  | Readonly<{
      kind: "stop";
      outcome: "success" | "failure";
    }>
  | Readonly<{
      kind: "act";
      action: CombatAction;
      branches: ReadonlyArray<{
        observation: ObservationClass;
        probability: number;
        next: PlanNode;
      }>;
    }>;
```

For MVP, bound the search heavily.

Recommended limits:

```text
≤ 6 candidate attackers
≤ 2 optional resource toggles per attacker
≤ 3 actions deep by default
```

This is enough for actual "what should I shoot first?" decisions while keeping browser computation small.

Use:

1. memoisation by canonical state;
2. branch-and-bound;
3. dominance pruning;
4. probability threshold pruning;
5. Pareto frontier pruning.

Later versions can expand search depth.

────────

## 17. Observation compression

Do not branch once per raw damage value if those outcomes lead to equivalent decisions.

Example:

```text
0–2 damage   → same continuation
3–5 damage   → same continuation
6+ damage    → stop
```

So the optimiser should partition raw outcomes into equivalence classes based on downstream state.

This dramatically reduces policy-tree size.

────────

## 18. Rules engine

Separate generic probability arithmetic from Warhammer semantics.

```text
engine/
  distributions/
      generic maths

rules/
  core/
      hit
      wound
      save
      allocate damage
  modifiers/
      rerolls
      lethal hits
      sustained hits
      devastating wounds
      cover
      etc.
```

Rule implementations should be composable transforms over a typed combat context.

Conceptually:

```ts
type RuleTransform =
  (context: CombatContext) => CombatContext;
```

More complicated abilities may hook particular stages.

Every rule requires:

• human-readable name;
• rules/version source metadata;
• executable implementation;
• regression tests;
• explanation fragment for the Rules Trace.

────────

## 19. Rules trace

Detailed mode should be able to explain the calculation in ordinary language:

```text
ASSUMPTIONS

Eradicators
• 6 attacks
• hit on 3+
• re-roll 1s
• wound on 4+
• AP -4

Target
• T12
• 2+ save
• Benefit of Cover
• 4+ invulnerable save

Effective save: 4+
```

This is generated from the same rule objects used by the engine.

Do not maintain a separate prose explanation system that can disagree with the calculation.

────────

## 20. Data model and versioning

The app should not couple the engine to one hard-coded dataset.

```ts
type GameDataBundle = Readonly<{
  schemaVersion: number;
  gameEdition: string;
  rulesRevision: string;
  generatedAt: string;
  units: ReadonlyArray<UnitProfile>;
  abilities: ReadonlyArray<AbilityDefinition>;
}>;
```

At launch:

• bundle a small legal test/demo dataset;
• support user-imported roster/profile data;
• keep adapters for external data sources isolated.

Architecture:

```text
raw roster text
      │
      ▼
format detector
      │
      ▼
parser adapter
      │
      ▼
canonical roster
      │
      ▼
validation / correction
      │
      ▼
Commit engine
```

────────

## 21. Roster import

The MVP should treat paste as the universal input.

```text
[ Paste roster ]
```

Then:

```text
detectFormat(text)
→ parse
→ confidence scores
→ correction UI
```

Parser adapters:

```ts
interface RosterParser {
  readonly id: string;
  detect(input: string): number; // confidence 0..1
  parse(input: string): ParseResult;
}
```

Never require a user to understand the source format.

Unknown entries should become editable placeholders rather than failing the entire import.

────────

## 22. Local persistence

Persist:

```text
rosters
custom unit profiles
current game state
recent opponents
user confidence preset
simple/detailed preference
saved analyses
rules/data bundle version
```

Do not persist huge redundant pairwise matrices indefinitely.

Cache derived analyses by content hash.

Example cache key:

```text
hash(
  attacker profile,
  defender profile,
  modifiers,
  rules revision
)
```

────────

## 23. URL state

Useful analyses should be shareable without a backend.

For small configurations:

```text
/#/sandbox?s=<compressed-state>
```

Use compressed, versioned URL-safe state.

For large rosters, provide:

```text
Export matchup
→ .commit.json
```

and

```text
Import matchup
```

No account system is necessary.

────────

## 24. Responsive layout

Phone

Single-column.

Recommendation result is full-screen or nearly full-screen.

Advanced details expand beneath it.

Use bottom sheets for editing modifiers.

Tablet

Two columns where useful:

```text
target / options | recommendation
```

Desktop

Three-pane optional layout:

```text
roster | current decision | analysis/details
```

Do not make desktop the canonical layout and then shrink it.

Design the phone view first.

────────

## 25. Visual language

The app should feel like a tactical instrument, not a spreadsheet.

Principles

• high contrast;
• very little chrome;
• large typography for recommendations;
• restrained colour;
• no dense dashboards in the main game flow;
• numbers aligned and tabular only in detailed views;
• one primary action per screen.

Suggested semantic colours:

```text
success          green
borderline       amber
poor             red
informational    blue
neutral          grey
```

Do not encode meaning by colour alone.

Always pair with text/iconography.

────────

## 26. Recommendation card semantics

A recommendation card should visibly answer five questions:

```text
WHAT?       Eradicators first
HOW GOOD?   74%
THEN WHAT?  Ballistus if needed
TOTAL?      93%
WHY?        Saves CP / preserves activation 31% of the time
```

If the recommendation cannot meet the requested threshold:

```text
NO RELIABLE PLAN

Best available:
Eradicators → Ballistus → Hellblasters

72% success

Even committing everything misses your
95% requirement.

[ Show alternatives ]
```

This is much better than pretending there is always a good answer.

────────

## 27. Pre-game matchup view

This is secondary to the commitment calculator but nearly free once pairwise analyses exist.

Simple view:

```text
MATCHUP

BEST INTO LAND RAIDER
Eradicators

BEST INTO TERMINATORS
Ballistus

BAD MATCHUP
Your army has no efficient answer to:
Mortarion
```

Detailed:

```text
Expected enemy points removed / activation
```

and a matrix:

```text
                  LR   TERM  CULT  PM
Eradicators       84    31    12   28
Ballistus         67    73    19   52
Hellblasters      26    61    77   69
```

Do not put this matrix in front of normal users unless requested.

────────

## 28. Efficiency analysis

For army-building / prep, expose:

```text
expected damage / 100 points
expected enemy points removed / 100 points
kill probability / 100 points
```

but condition on complete target profiles, not Toughness alone.

A target archetype minimally includes:

```ts
type TargetArchetype = Readonly<{
  toughness: number;
  armourSave: number;
  invulnerableSave: number | null;
  woundsPerModel: number;
  modelCount: number;
  feelNoPain: number | null;
}>;
```

Two targets with equal Toughness can produce entirely different weapon rankings.

────────

## 29. Current game state

MVP game state can be intentionally sparse.

```ts
type GameSession = Readonly<{
  myRoster: RosterId;
  opponentRoster: RosterId;
  turn: number;
  phase: GamePhase;
  units: ReadonlyMap<UnitId, UnitState>;
  commandPoints: number;
}>;
```

The user updates only state that influences current calculations.

Avoid trying to model:

• complete table geometry;
• objective locations;
• every status effect;
• movement paths;
• all hidden information.

Those can arrive only if real usage demonstrates demand.

────────

## 30. Camera / board recognition

Not MVP.

Design the domain model so it can later consume approximate board observations:

```ts
type BoardObservation = Readonly<{
  unitId: UnitId | null;
  confidence: number;
  approximatePosition: Readonly<{
    x: number;
    y: number;
  }>;
}>;
```

The future camera feature should accelerate state entry, not be required for correctness.

Imported rosters provide the model-recognition prior.

Circular bases can aid geometry, but they do not solve arbitrary miniature identification.

────────

## 31. Accessibility

Required from MVP:

• WCAG AA contrast;
• keyboard navigation on desktop;
• screen-reader labels;
• no colour-only state;
• reduced-motion support;
• scalable text without layout breakage;
• 44 px minimum interactive target;
• landscape phone support.

Use native semantic controls wherever possible.

────────

## 32. Performance targets

On a mid-range modern phone:

```text
initial cached load          < 1 s perceived
screen transition            < 100 ms
simple A-v-B exact analysis  < 100 ms
4-attacker commitment plan   < 500 ms target
large precompute             worker/background
```

When analysis exceeds ~150 ms, show immediate progress feedback.

Never freeze scrolling or touch input.

────────

## 33. Offline behaviour

Once installed/visited:

```text
app shell                     offline
saved rosters                 offline
combat calculations           offline
rules/data bundle             offline
current game                  offline
```

If later versions support online dataset updates, they should be optional and versioned.

A tournament venue with poor signal must not break the app.

────────

## 34. Error states

Good:

```text
I can't model this ability yet.

The calculation below ignores:
"Quantum Murder Beam"

[ Continue without it ]
[ Edit unit ]
```

Bad:

```text
NaN
```

Import failure should preserve raw text and allow manual repair.

Analysis failure should never lose current game state.

────────

## 35. Source tree

```text
commit/
├── public/
│   ├── icons/
│   └── demo-data/
│
├── src/
│   ├── app/
│   │   ├── routes/
│   │   ├── layout/
│   │   └── App.tsx
│   │
│   ├── components/
│   │   ├── RecommendationCard/
│   │   ├── UnitPicker/
│   │   ├── GoalPicker/
│   │   ├── ConfidencePicker/
│   │   ├── OutcomeEntry/
│   │   └── DetailDisclosure/
│   │
│   ├── domain/
│   │   ├── ids.ts
│   │   ├── profiles.ts
│   │   ├── roster.ts
│   │   ├── combat-state.ts
│   │   ├── plans.ts
│   │   └── validation.ts
│   │
│   ├── engine/
│   │   ├── dice/
│   │   ├── distributions/
│   │   ├── combat/
│   │   ├── optimisation/
│   │   └── analysis.ts
│   │
│   ├── rules/
│   │   ├── core/
│   │   ├── abilities/
│   │   ├── modifiers/
│   │   └── trace/
│   │
│   ├── import/
│   │   ├── detect.ts
│   │   ├── parsers/
│   │   └── canonicalise.ts
│   │
│   ├── persistence/
│   │   ├── db.ts
│   │   ├── cache.ts
│   │   └── migrations.ts
│   │
│   ├── workers/
│   │   ├── analysis.worker.ts
│   │   └── protocol.ts
│   │
│   ├── stores/
│   │   ├── game.ts
│   │   ├── ui.ts
│   │   └── preferences.ts
│   │
│   └── styles/
│       ├── tokens.css
│       └── global.css
│
├── tests/
│   ├── fixtures/
│   ├── engine/
│   ├── rules/
│   └── e2e/
│
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
│
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

────────

## 36. GitHub Pages deployment

Use a GitHub Actions workflow:

```text
push to main
→ npm ci
→ npm test
→ npm run build
→ upload Pages artifact
→ deploy-pages
```

Vite should emit only static assets.

Use a relative asset base where practical, or configure the repository base path explicitly.

No server endpoints should be assumed anywhere in application code.

────────

## 37. MVP scope

Must ship

Infrastructure

• Vite + React + strict TypeScript
• GitHub Pages deployment
• responsive phone-first layout
• installable PWA
• IndexedDB persistence
• Web Worker analysis

Data

• canonical typed unit/weapon schema
• small demo dataset
• manual custom profile creation
• at least one useful pasted-roster parser
• correction UI

Calculator

• normal hit/wound/save/damage pipeline
• exact finite distributions
• a useful initial subset of common modifiers
• model damage allocation
• expected damage
• kill probability
• threshold probabilities

Commitment engine

• 1–6 candidate attackers
• ordered plans
• stop after success
• adaptive second/third attacker
• user-selected confidence target
• basic CP/resource option
• dominance/Pareto pruning

UX

• Prep / Game / Sandbox
• simple answer
• detailed disclosure
• outcome entry
• immediate replanning
• assumptions/rules trace
• graceful unsupported-rule handling

────────

## 38. Explicitly not MVP

Do not build yet:

• accounts;
• cloud sync;
• multiplayer;
• social features;
• computer vision;
• AR overlays;
• complete board-state modelling;
• movement optimisation;
• objective optimisation;
• opponent strategy modelling;
• LLM recommendations;
• native iOS/Android wrappers;
• tournament integrations.

Each one should require demonstrated user demand.

────────

## 39. Development order

Milestone 0 — vertical slice

Hard-code:

• one attacker;
• one target;
• one weapon profile.

Build:

```text
select target
→ choose confidence
→ calculate
→ simple recommendation
→ details
```

This proves the interaction before building rules breadth.

Milestone 1 — trustworthy MathHammer kernel

Implement and test:

```text
d6 distributions
hits
wounds
saves
damage
multi-model allocation
common rerolls/modifiers
```

Create extensive golden tests.

Milestone 2 — commitment optimiser

Add:

```text
multiple attackers
ordering
conditional continuation
resource costs
threshold optimisation
```

This is the actual product milestone.

Milestone 3 — game session

Add:

```text
rosters
unit activation state
damage tracking
resolution entry
replanning
```

Milestone 4 — import

Add roster format adapters and correction flow.

Milestone 5 — polish

PWA, offline caching, accessibility, performance, animation restraint, visual tuning.

────────

## 40. Key acceptance scenarios

Scenario A — trivial success

Given:

```text
A alone has 98% kill probability
required confidence = 80%
```

Return:

```text
USE A
98% kill chance

Do not commit anything else.
```

Scenario B — adaptive value

Given:

```text
A alone = 70%
B alone = 65%
A then B = 94%
B then A = 91%
required = 90%
```

Return A → B conditionally.

Do not return "use A and B" as an unconditional recommendation.

Scenario C — resource not worthwhile

Given:

```text
A → B = 91%
A + 1 CP → B = 93%
required = 90%
```

Return the 0 CP policy.

Scenario D — impossible threshold

Given:

```text
all available resources = 72%
required = 95%
```

Return an explicit failure to satisfy the requested confidence.

Scenario E — outcome replanning

After action A, an unusually strong result leaves the target at 1 W.

If a cheap attacker C now suffices, replan to C rather than blindly following the original B branch.

Scenario F — explanation consistency

The Rules Trace and displayed assumptions must be generated from the exact parameters used by the numerical engine.

────────

## 41. First screen worth building

If only one screen is built to test the idea, build this:

```text
COMMIT
──────────────────────────────

TARGET
Deathshroud Terminators
3 models · 9 wounds

GOAL
● Kill unit

CONFIDENCE
○ Gamble 60%
● Reliable 80%
○ Must happen 95%

AVAILABLE
✓ Eradicators
✓ Ballistus
✓ Hellblasters

[ FIND BEST COMMITMENT ]

──────────────────────────────

ERADICATORS FIRST

74% kill chance

If they survive:
→ BALLISTUS
→ 93% total

SAVE THE CP

[ Resolve attack ]

Details ▾
```

If this feels excellent on a phone, the project has a product.

Everything else is infrastructure.
