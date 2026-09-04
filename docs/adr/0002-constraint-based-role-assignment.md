# Role assignment is constraint-based, not a fixed per-player-count table

Role counts per game are not looked up from a fixed table keyed by player count. Instead, assignment is randomized from the role pool subject to three constraints: Foundation is always the majority faction, at least one Chaos Insurgency role is always present, and at least one Serpent's Hand role is always present. A fixed table (e.g. "5 players = 2 Foundation, 1 CI, 2 Serpent's Hand") was considered and rejected because it produces the same game shape every time at a given lobby size, which hurts replayability for a small friend group expected to play repeatedly — randomization within constraints keeps games varied while still guaranteeing balance invariants hold.

## Consequences

Balance can't be reasoned about from a single lookup table; the constraint-solver (or randomizer + validator) is the source of truth for what role combinations are legal at a given player count, and any future role additions must be checked against the three invariants rather than just slotted into a table row.
