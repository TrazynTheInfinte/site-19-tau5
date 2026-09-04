# Context

Domain glossary for **Site-19: Tau-5 Protocol**, an SCP-themed social deduction game. This file is a glossary only — no implementation details.

## Terms

**Foundation** — The majority faction. Ordinary players trying to identify and eliminate the Chaos Insurgency before they win. Analogous to "Villagers" in Werewolf / "Town" in Town of Salem.

**Chaos Insurgency (CI)** — The minority evil faction. Secretly working to sabotage/eliminate the Foundation without being identified. Analogous to "Werewolves" / "Mafia".

**Serpent's Hand** — A neutral faction with its own win condition, independent of Foundation and Chaos Insurgency. Analogous to third-party roles (e.g. Survivor, Executioner) in Town of Salem.

**Cycle / Night-Day cycle** — One round of the game consisting of a night phase (secret role actions) followed by a day phase (discussion + vote). The game is multi-cycle (unlike One Night Ultimate Werewolf's single round), capped at a small number of cycles (3-4) to suit a 4-5 player lobby.

**Ghost** — An eliminated player. Ghosts do not spectate passively: once per remaining cycle they can send one anonymous tip (a short message/clue) to living players. Ghosts get no bonus information on death (e.g. do not learn everyone's role) — they know only what they knew while alive, plus whatever they can infer.

**Foundation win condition** — Foundation wins when all Chaos Insurgency members have been eliminated.

**Chaos Insurgency win condition** — CI wins when living CI count > living Foundation count. Serpent's Hand roles are not part of this comparison either way.

**Serpent's Hand** — Not a single win condition like Foundation/CI. It's an umbrella faction comprising individual "special condition" roles, each with its own personal win condition, in the spirit of Town of Salem 2's Jester/Executioner. The overall "Serpent's Hand wins" framing is really "this individual role achieved its personal objective."

**Overtime round** — If the cycle cap is reached with no faction win condition met, the game skips the night phase and goes straight to a forced sudden-death day vote (every living player must vote, no abstaining; a tie still results in no elimination). If this still leaves no faction win condition met, the game ends in a draw (individual Serpent's Hand roles can still have independently met their personal win condition).

**Night action resolution order** — Within a single night: (1) disabling effects resolve first (e.g. Saboteur's block — the blocked player's ability does not fire this cycle), (2) protection vs. elimination resolves next (Medical Officer's protection beats the Infiltrator's kill if targeting the same player), (3) passive/read-only effects (Researcher's investigation) resolve last and are unaffected by anything else unless the Researcher themself was disabled in step 1.

**Day-phase tie vote** — If the elimination vote ties between two or more players, no one is eliminated that cycle (applies to normal cycles; the overtime round's forced vote also results in no elimination on a tie).

## Role list (MVP)

**Foundation:**
- *Agent* — no special ability; rank-and-file staffer, just a vote.
- *Researcher* — each night, investigate one player and learn their faction.
- *Medical Officer* — each night, protect one player from elimination.

**Chaos Insurgency:**
- *Infiltrator* — each night, the CI team chooses a player to eliminate.
- *Saboteur* — once per game, blocks another player's night ability instead of the normal CI kill.

**Serpent's Hand (neutral, special-condition roles):**
- *The Fool* (formerly "Jester") — wins if voted out by the Foundation during a day-phase vote.
- *The Marked* (formerly "Executioner") — assigned a secret Foundation target at game start; wins if that target is voted out/terminated.

Ghost anonymous tips are free-text, sent anonymously to all living players, once per remaining cycle — no structural constraints on content for MVP.

**Role assignment** — Not a fixed per-player-count table. Constraints only: Foundation is always the majority faction, at least one Chaos Insurgency role is always in the match, at least one Serpent's Hand role is always in the match. Beyond those constraints, exact role counts/mix are randomized per game from the role pool.

**Lobby** — Jackbox-style: one player creates the lobby and becomes host, others join via a shareable code. Host has lobby-only powers (kick, force-start, role-pool selection) before the game starts; once the game is underway the host has no special power and plays as a regular player.

**Phase timer** — Night phase (role actions) uses a soft timer (advances once all required actions are submitted, no hard cutoff). Day phase (discussion + vote) advances on whichever comes first: the hard timer expiring, or every living player having cast a vote (votes are one-shot and can't be changed once cast, so ending early once everyone's voted loses no discussion opportunity that a still-changeable vote would have needed). Overtime's forced vote uses the same early-exit, which is normally how it actually ends given every living player must vote.

**Leaving mid-lobby vs. mid-game** — Before the game starts, leaving removes the player from the roster entirely. Once the game is in progress, leaving is a forfeit: the player is immediately marked eliminated so the game isn't stuck waiting on a vanished player's night action or vote, but this does not raise an elimination event for personal-win purposes (The Fool/The Marked don't trigger off a forfeit) — only an actual vote or night kill does.

**Reconnection** — A disconnected player can rejoin the same lobby via its code and resume their role/state from persisted game state.

## Open questions

None outstanding — see `docs/adr/` for decisions worth recording formally.
