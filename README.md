# Commit

Commit answers: what is the least I need to commit to kill this target with a probability I am comfortable with?

The mobile-first app builds an ordered, conditional plan from a target, available attackers, a tactical goal and a confidence threshold. It runs entirely in the browser, stores data locally and remains useful offline after the first visit.

Use it at [vinnylarouge.github.io/commit](https://vinnylarouge.github.io/commit/).

## Using Commit

- **Prep** imports pasted rosters, lets you repair uncertain fields, saves custom profiles on the device and shows the strongest matchups.
- **Game** tracks turn, phase, command points, wounds and activated units, then replans as outcomes are entered.
- **Sandbox** accepts editable attacker, weapon and target profiles plus common modifiers. It shows exact damage, threshold and kill probabilities, and can save, link or export a matchup.

The plain-text importer recognises compact statlines such as:

```text
Roster: Spearhead
Faction: Adeptus Astartes

3x Eradicators (200 points)
T 6, Sv 3+, W 3
Melta rifles: A 6, BS 3+, S 9, AP -4, D D6
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
