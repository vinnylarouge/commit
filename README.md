# Commit

Commit answers: what is the least I need to commit to kill this target with a probability I am comfortable with?

The mobile-first app estimates one shooting or fighting sequence before a game. It builds an ordered, conditional plan from a target, available attackers and a confidence threshold. It runs entirely in the browser, stores profiles locally and remains useful offline after the first visit.

Use it at [vinnylarouge.github.io/commit](https://vinnylarouge.github.io/commit/).

## Using Commit

- **Prep** imports pasted rosters, lets you repair uncertain fields, adds multiple Shoot or Fight weapons and saves the result on the device.
- **Plan** compares up to six possible attackers for Shoot, Fight, or Shoot + Fight. Each unit has an explicit model count, weapon choice and situational modifiers. The target has its own model count, Toughness, save, re-roll, invulnerable save, Feel No Pain and cover controls.
- **Sandbox** is the fastest one-off path. Enter raw attacker, weapon and target values, apply modifiers, and read exact damage, threshold and kill probabilities.

Weapon attacks are entered per model. Feel No Pain is rolled independently for every point of damage. Results include the mean damage and the central 80% outcome range for the first recommended unit.

Commit uses local user-entered data. It does not scrape or silently copy a third-party rules database. Saved profiles avoid repeat entry, while the Sandbox remains available for a calculation that does not need named units.

The plain-text importer recognises compact statlines such as:

```text
Roster: Spearhead
Faction: Adeptus Astartes

3x Eradicators (200 points)
T 6, Sv 3+, W 3
Melta rifles: A 2, BS 3+, S 9, AP -4, D D6
Close combat weapons: A 3, WS 3+, S 4, AP 0, D 1
```

Unrecognised rules remain attached to the profile and are disclosed whenever a calculation ignores them.

## Development

```sh
npm install
npm run dev
```

Run the checks with:

```sh
npm test
npm run build
npm run test:e2e
```

The product specification is published in [SPEC.md](SPEC.md).
