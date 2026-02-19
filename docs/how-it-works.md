# How It Works

This app helps you build a balanced Pokemon team by calculating how well your
team matches up against each type of gym.

## What This App Does

When facing a gym, you want to know: "Is my team prepared for this type?" This
app answers that by scoring your team's defensive resilience and offensive
coverage against all 18 Pokemon types.

The primary use case is [Pokemon Emerald Rogue](https://pokemonrogue.com/), a
roguelike ROM hack where gym types are randomized each run. You can't predict
what you'll face, so having a well-rounded team matters more than in the base
games.

## Pokemon Basics

If you're not familiar with Pokemon, here's what you need to know:

### Types and Type Effectiveness

Pokemon has a rock-paper-scissors system with 18 types. Each type has
strengths and weaknesses:

- **Super effective (2x damage)**: Water beats Fire, Fire beats Grass, Grass
  beats Water
- **Not very effective (0.5x damage)**: Fire resists Fire, Water resists Water
- **Immune (0x damage)**: Ground can't hit Flying, Normal can't hit Ghost

Pokemon can have one or two types, and the multipliers stack:

- A Water/Ground Pokemon takes 4x damage from Grass (2x from each type)
- A Steel/Flying Pokemon takes 0.25x damage from Grass (0.5x from each type)

### Gyms

Gyms are type-specialized battle arenas. A Fire gym uses Fire-type Pokemon,
so you want:

- **Defensively**: Pokemon that resist Fire (Water, Rock, Fire, Dragon)
- **Offensively**: Moves that are super effective against Fire (Water, Ground,
  Rock)

### Abilities, Berries, and Moves

- **Abilities** are passive effects. Some grant immunities (Levitate ignores
  Ground) or resistances (Thick Fat halves Fire/Ice damage)
- **Berries** can reduce damage from one super-effective hit (Occa Berry
  reduces Fire damage)
- **Moves** have types. A Water Pokemon can learn Ice moves for Grass coverage

## The Scoring Algorithm

Each gym type gets a score based on your team's matchup. Higher is better.

### Defensive Scoring

For each Pokemon, the app calculates how much damage that gym type would deal:

| Multiplier | Points | Meaning |
| ---------- | ------ | ------- |
| 0x | +2 | Immune |
| 0.25x | +2 | Double resist |
| 0.5x | +1 | Resist |
| 1x | 0 | Neutral |
| 2x | -1 | Weak |
| 4x | -2 | Double weak |

### Offensive Scoring

If any of your Pokemon's moves are super effective against the gym type, you
get +1 for that Pokemon.

### Ability Modifiers

Abilities can change the defensive calculation, for example:

- **Immunities**: Levitate makes Ground deal 0x (becomes +2)
- **Resistances**: Thick Fat halves Fire/Ice damage
- **Weaknesses**: Dry Skin makes Fire deal 1.25x (treated as weakness)

### Special Moves

Two moves have unique mechanics:

- **Flying Press**: Deals both Fighting and Flying damage simultaneously.
  Against a Dark/Psychic target, that's 2x (Fighting vs Dark) × 0.5x
  (Fighting vs Psychic) × 2x (Flying vs neither) = 2x total
- **Freeze-Dry**: An Ice move that's super effective against Water (normally
  Ice is resisted by Water)

### Protean Ability

Pokemon with Protean (Greninja, Kecleon) change type to match their moves.
The app treats each move type as a potential defensive type, but only counts
resistances—you wouldn't use a move that makes you weak to the opponent.

### Mega Evolution

When a Pokemon Mega Evolves and gains a new type, that type is treated like
Protean: only resistances count, since you choose when to Mega Evolve.

### Berry Tiebreaker

Berries don't affect the main score, but when two gym types have the same
score, the one where more of your Pokemon have relevant berries ranks lower
(you're better prepared for it).

## Suggestions

### Swap Suggestions

The app can suggest which box Pokemon to swap onto your team. It evaluates
every possible team/box swap, comparing score profiles (undefeated gyms first,
then all gyms). The best improvement is shown in the header.

### Type Suggestions

In suggestion mode, each gym type shows an improvement indicator (▲, ▼, or —).
This answers: "How much would adding this type of coverage help my team?"

For each gym type, the app creates a hypothetical single-type Pokemon with a
matching move. If the team has fewer than 6 members, it adds the hypothetical
as an extra member. If the team is full, it tries replacing each member and
picks the best swap. Either way, the result is compared against the current
team using score profiles (undefeated gyms first). Types where the hypothetical
improves the profile rank higher, helping you identify what type coverage your
team is missing.

### Sorting in Suggestion Mode

When a swap suggestion is active, gyms are sorted by how much the suggested
swap improves each matchup, so you can see where the swap helps most.

### Pinned Gym Priority

When a gym is pinned, all suggestion algorithms prioritize improving the pinned
gym's score above everything else. The pinned gym score uses a higher cap (4)
than normal gym scores (3), allowing suggestions to distinguish between good
and excellent coverage for the gym you care about most. The normal algorithm
(undefeated gyms first, then all gyms) serves as a tiebreaker.

## Example

Your team has a Swampert (Water/Ground):

Against an **Electric gym**:

- Defensive: Ground is immune to Electric → +2
- Offensive: Ground moves are super effective → +1
- **Total: +3** (excellent matchup)

Against a **Grass gym**:

- Defensive: Water/Ground takes 4x from Grass → -2
- Offensive: No super effective moves (unless it knows Ice Beam) → 0
- **Total: -2** (terrible matchup)
