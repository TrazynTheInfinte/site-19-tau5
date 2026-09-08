# Context

Domain glossary for **Site-19: Tau-5 Protocol**, an SCP-themed social deduction game. This file is a glossary only — no implementation details.

## Terms

**Foundation** — The majority faction. Ordinary players trying to identify and eliminate the Chaos Insurgency before they win. Analogous to "Villagers" in Werewolf / "Town" in Town of Salem.

**Chaos Insurgency (CI)** — The minority evil faction. Secretly working to sabotage/eliminate the Foundation without being identified. Analogous to "Werewolves" / "Mafia".

**Serpent's Hand** — A neutral faction with its own win condition, independent of Foundation and Chaos Insurgency. Analogous to third-party roles (e.g. Survivor, Executioner) in Town of Salem.

**Cycle / Night-Day cycle** — One round of the game consisting of a night phase (secret role actions), then a discussion phase, then a Trial. The game is multi-cycle (unlike One Night Ultimate Werewolf's single round), capped at a small number of cycles (3-4) to suit a 4-5 player lobby. Cycles are numbered starting at 1.

**Discussion phase** — The talk-only window that opens after each night, before the Trial. Ends on whichever comes first: a 1-minute timer, or every living player clicking ready (mirrors Briefing's early-exit pattern). Purely a discussion window — no accusing or voting happens here at all; that's the Trial's job. Skipped entirely by Overtime, which goes straight to a forced vote.

**Trial** — Adapted from Town of Salem 2's trial system: an Accusation phase, and, if it succeeds, a Defense phase followed by a Judgment phase. Up to 3 trial attempts happen per day (see Trial attempt limit) — a Judgment that pardons or ties, or an Accusation that never reaches majority, spends one attempt and loops straight back into a fresh Accusation; a Guilty verdict ends the day immediately. Entirely skipped by Overtime, which uses its own simpler forced vote instead (see Overtime round).

**Accusation phase** — The first stage of a Trial: living players vote to accuse someone. Capped at 1 minute; a strict majority of living players (more than half) sends the accused to the Defense phase immediately, without waiting for the timer. Not a forced choice — you can simply not accuse anyone. If the timer expires (or everyone's voted) with nobody reaching majority, this attempt is spent.

**Defense phase** — Second stage, only reached once an Accusation succeeds: a short window (20s) in which only the accused may speak publicly (day chat is restricted to them alone) — everyone else can still whisper. Purely about giving the accused a chance to respond before Judgment; nothing is tallied here.

**Judgment phase** — Final stage: every living player except the accused votes Guilty or Innocent (30s), privately — nobody, including after the fact, can see who voted which way, only the live running tally (unlike an Accusation vote, which is public). Guilty requires strictly more Guilty votes than Innocent — a tie (including nobody voting at all) is a pardon, same as a plain vote-count tie elsewhere in this game. Not voting before the timer expires isn't tracked as a separate "Abstain" choice, it simply isn't counted either way. A Guilty verdict executes the accused (role/will reveal, same as any other elimination) and ends the day immediately, skipping any remaining trial attempts.

**Trial attempt limit** — At most 3 accusation attempts happen per day (whether or not any of them actually reach a Defense/Judgment). If all 3 are spent with nobody convicted, the day ends with no elimination and play moves to Night.

**Briefing** — Cycle 0. The game starts here instead of straight into Night 1: a talk-only opening phase with no voting at all — nobody has acted yet, so there's nothing to vote on. Ends on whichever comes first: a 1-minute timer, or every player clicking ready (the same early-exit pattern the Discussion phase uses). Exists purely so players get a chance to set the scene/introduce characters before anyone can act or be voted on.

**Ghost** — An eliminated player. Ghosts do not spectate passively: once per remaining cycle they can send one anonymous tip (a short message/clue) to living players. A ghost gains no special omniscience about *other* players' roles beyond what's now public (see role reveal below) — they know only what they knew while alive, plus whatever they can infer.

**Role reveal on death** — The instant a player is eliminated (by any cause — vote, night kill, or forfeit), their own role and faction become visible to everyone, living and dead alike. This is about that player's identity becoming public, not about ghosts learning anything extra about anyone else. Once the game itself ends, this extends to everyone regardless of whether they died — the full roster (everyone's role) is visible to the whole table at the debrief screen, not just whoever was eliminated along the way.

**Foundation win condition** — Foundation wins when all Chaos Insurgency members have been eliminated.

**Chaos Insurgency win condition** — CI wins when living CI count > living Foundation count. Serpent's Hand roles are not part of this comparison either way.

**Serpent's Hand** — Not a single win condition like Foundation/CI. It's an umbrella faction comprising individual "special condition" roles, each with its own personal win condition, in the spirit of Town of Salem 2's Jester/Executioner. The overall "Serpent's Hand wins" framing is really "this individual role achieved its personal objective."

**Overtime round** — If the cycle cap is reached with no faction win condition met, the game skips the night phase, the discussion phase, and the Trial entirely, going straight to a forced sudden-death vote (every living player must vote, no abstaining; a tie still results in no elimination) — a single simple target vote, not an Accusation/Judgment. Whatever the outcome, the game ends right there: a winner if one's reached, otherwise a draw (individual Serpent's Hand roles can still have independently met their personal win condition).

**Night action resolution order** — Within a single night: (1) disabling effects resolve first (e.g. Saboteur's block — the blocked player's ability does not fire this cycle), (2) protection vs. elimination resolves next (Medical Officer's protection beats the Infiltrator's kill if targeting the same player), (3) passive/read-only effects (Researcher's investigation) resolve last and are unaffected by anything else unless the Researcher themself was disabled in step 1.

**Overtime tie vote** — If Overtime's forced vote ties between two or more players, no one is eliminated (see Judgment phase for the Trial's own, differently-shaped tie rule).

**Showdown** — Triggers the instant an elimination (night kill or vote, including overtime's) leaves exactly two players alive: the Enforcer and any living Chaos Insurgency member. Breaks from the normal night/discussion/voting cycle entirely into a one-on-one revolver duel between just those two - six chambers, one bullet, alternating turns pulling the trigger, resolved the moment the fatal pull lands. No player choice affects who dies - the fatal pull is decided the instant the duel starts - so it's shown live to every spectator, not just the two participants. The loser's elimination is a normal one (role/will reveal, checked against The Marked) but doesn't count as a vote for The Fool's purposes. Ends the game immediately: with only one of the two left alive, a faction win is always decided by the normal win conditions.

## Role list

**Foundation:**
- *Agent* — no special ability; rank-and-file staffer, just a vote.
- *Researcher* — each night, investigate one player and learn their faction.
- *Medical Officer* — each night, protect one player from elimination.
- *Tracker* — each night, learns who a target visited (the target of *their* action) — not what they did to that person, not their faction.
- *Warden* — each night, detains a target: blocks their action and protects them from elimination, simultaneously. Once per game, may instead Execute the detained target — an unblockable kill (scaled down from Town of Salem's Jailer, which also gets a free kill on top of the jail, for this game's smaller player counts).
- *Enforcer* — each night, either Load (up to 2 loaded) or Shoot a loaded target with a normal, blockable kill; can't shoot Night 1. If the shot connects and the target is Foundation, the weapon jams forever — no more loading or shooting. Adapted from Town of Salem's Vigilante, scaled from 3 bullets down to 2 for this game's smaller player counts and shorter cycle budget.

**Chaos Insurgency:**
- *Infiltrator* — no innate night ability. Killing is exclusively the Tome's privilege (see below), for every CI role including Infiltrator — Infiltrator's distinction is simply that it starts the game holding the Tome.
- *Saboteur* — once per game, blocks another player's night ability instead of the normal CI kill.
- *Framer* — each night, makes a target appear as Chaos Insurgency to any Researcher investigation that same night.
- *Anomaly* — once per game (not the first night), strikes a target with an unblockable kill; cannot target another Chaos Insurgency member. Adapted from Town of Salem's Conjurer, which does this during the day and stays anonymous — here it's a night action instead (reuses the existing resolution machinery rather than needing a whole separate day-action pathway), and anonymity is already free since nobody learns who killed whom anyway.
- *The Whisperer* — each night, choose a target to sense: you learn who they visit and who visits them, every night, until that target dies (at which point you may sense someone new). You also passively hear the content of every whisper sent during the day, lobby-wide, not just ones addressed to you. Adapted from Town of Salem's Wildling, with its "sense Coven teammates while not holding the Necronomicon" clause dropped entirely — redundant here since CI already has full mutual visibility, and the Tome already lets any holder kill.

**Serpent's Hand (neutral, special-condition roles):**
- *The Fool* (formerly "Jester") — wins if voted out: either found Guilty and executed at a Trial's Judgment phase, or eliminated by Overtime's forced vote. Being merely accused, or reaching a Defense that's then pardoned, doesn't count - only an actual conviction (or an Overtime elimination) does. A night kill or a Showdown loss doesn't count either, even though it's still an elimination.
- *The Marked* (formerly "Executioner") — assigned a secret Foundation target at game start; wins if that target is eliminated by any means (a Trial conviction, a night kill, Overtime, or Showdown).
- *The Puppeteer* — once per game, secretly forces another living player's Judgment vote (Guilty or Innocent) to count as the Puppeteer's choosing; the victim's own vote is never altered or shown differently to them, so they never find out. Only usable during a Judgment phase - if the game never reaches one (e.g. it goes to Overtime without a single successful Accusation), the ability simply goes unused. Wins by surviving to the end of the game.
- *The Cartographer* — once per game, silently swaps the night-action targets of two other players (neither is told). Wins by surviving to the end of the game.
- *The Cultivator* — each night, may spread the seed to a living player, up to a small number scaled to the lobby size (2 at 5 players or fewer, 3 above that). Once every seed is placed, they instead hunt the seeded down — a normal, blockable kill, targeting only the seeded. Wins once every seeded player is eliminated, by anyone's hand, not just their own. Adapted from Town of Salem's Baker/Famine, dropping the full role-transformation subsystem (no separate "Famine" role, no countdown-per-recipient) in favor of a single personal-win condition shaped like every other Serpent's Hand role — the real Baker's fixed target of 3 is scaled down and made lobby-size-aware for the same reason as the Enforcer's bullet count.

Ghost anonymous tips are free-text, sent anonymously to all living players, once per remaining cycle — no structural constraints on content for MVP.

**Chaos Insurgency mutual visibility** — CI faction members know each other's identity and role from the start of the game (this was already implied by "the CI team chooses a kill together," just not previously surfaced in the UI). Needed concretely so the Anomaly knows who not to target.

**Survive-to-end personal win** — The Puppeteer and The Cartographer both win simply by being alive when the game ends, whatever the outcome (a faction win or a draw) — checked once, at the moment the game actually ends, rather than triggered by a specific elimination event like The Fool/The Marked.

**The Tome** — Chaos Insurgency's shared item, held by exactly one living CI member at a time. Whoever holds it may, on any night, kill as their action instead of their normal ability (so any CI role can act as the killer while holding it, not just Infiltrator). It starts with the Infiltrator if one is in the game, else a random CI member. It passes two ways: automatically to a random living CI teammate if the current holder is eliminated, or manually — the current holder may hand it to a living CI teammate at any time during the Trial or Overtime. Adapted from Town of Salem's Necronomicon (Coven expansion), simplified for a CI team that's usually only 1-2 people: no group vote to decide the hand-off, just the current holder's own choice.

**Role assignment** — Not a fixed per-player-count table. Constraints only: Foundation is always the majority faction, at least one Chaos Insurgency role is always in the match, at least one Serpent's Hand role is always in the match. Beyond those constraints, exact role counts/mix are randomized per game from the role pool.

**Lobby** — Jackbox-style: one player creates the lobby and becomes host, others join via a shareable code. Host has lobby-only powers (kick, force-start, role-pool selection) before the game starts; once the game is underway the host has no special power and plays as a regular player.

**Phase timer** — Night phase (role actions) uses a soft timer (advances once all required actions are submitted, no hard cutoff). Discussion, Accusation, Defense, Judgment, and Overtime's forced vote each use their own hard timer with their own early-exit condition where they have one (see their glossary entries) — whichever comes first, the timer or the exit condition. Defense has no early-exit at all - it always runs the full 20s.

**Leaving mid-lobby vs. mid-game** — Before the game starts, leaving removes the player from the roster entirely. Once the game is in progress, leaving is a forfeit: the player is immediately marked eliminated so the game isn't stuck waiting on a vanished player's night action, accusation, or judgment vote, but this does not raise an elimination event for personal-win purposes (The Fool/The Marked don't trigger off a forfeit) — only an actual Trial conviction, Overtime elimination, night kill, or Showdown loss does.

**Reconnection** — A disconnected player can rejoin the same lobby via its code and resume their role/state from persisted game state.

**Will** — A short freeform note a living player can write and revise at any time, visible only to themself. The instant they're eliminated (by any cause — vote, night kill, or forfeit), their will locks (can no longer be edited) and becomes visible to everyone. A forfeit still reveals a will, unlike the personal-win exclusion above — revealing isn't a reward or a trigger, just what happens to whatever was written.

**Chat and whispers** — An in-app text layer alongside whatever voice/Discord discussion is already happening: a public day chat everyone can read (only living players can post — a ghost's one sanctioned channel stays the anonymous tip), and private whispers to one other player at a time. Both are only available outside the night phase, matching "night is silent" - and during a Defense phase specifically, day chat narrows further to just the accused (see Defense phase); whispers stay open to everyone throughout. Both run for the whole game, not scoped to the current cycle — earlier cycles' messages stay in the scrollback rather than being cleared each cycle, though a restart wipes them along with everything else from the finished game. Whispers are private between the two participants — except to The Whisperer, who passively hears every whisper's content lobby-wide; that's the entire reason this exists as an in-app mechanic rather than staying out-of-band like the rest of discussion. Chaos Insurgency additionally has its own night-only channel, visible only to CI — this is the concrete surfacing of Chaos Insurgency mutual visibility's "the CI team chooses a kill together" implication actually happening in-app.

## Open questions

None outstanding — see `docs/adr/` for decisions worth recording formally.
