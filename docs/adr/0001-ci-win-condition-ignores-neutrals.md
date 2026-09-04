# Chaos Insurgency win condition compares against Foundation only

The Chaos Insurgency (CI) win condition is `living CI count > living Foundation count`, with Serpent's Hand roles excluded from the comparison entirely — they neither help nor hinder a CI win. The alternative considered was comparing CI against Foundation + Serpent's Hand combined, which would better reflect "CI outnumbers everyone opposing them" but complicates the check whenever a Serpent's Hand role dies or the role pool changes size. We chose the simpler Foundation-only comparison to match the mental model players already have from Mafia/Town of Salem (mafia-parity checks ignore neutrals), and because Serpent's Hand roles win or lose independently of the Foundation/CI conflict anyway.

## Consequences

Changing this later means re-deriving win-check logic and re-balancing role counts per lobby size (a Serpent's Hand-inclusive comparison shifts how many players CI needs to eliminate to win), so revisit deliberately rather than as an incidental tweak.
