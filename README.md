# Site-19: Tau-5 Protocol

SCP-themed social deduction game (Foundation vs. Chaos Insurgency vs. Serpent's Hand). Design/rules glossary: `CONTEXT.md`. Architecture decisions: `docs/adr/`.

## One-time Firebase setup (you have to do this part — I can't click through your console)

1. Go to https://console.firebase.google.com and create a new project (Spark/free plan is fine — no billing needed).
2. **Build → Firestore Database** → Create database → start in **production mode** → pick a region.
3. **Build → Authentication** → Get started → enable the **Anonymous** sign-in provider.
4. **Build → Hosting** → Get started (you can skip the CLI steps it shows you, we'll do that from the repo).
5. Project settings (gear icon) → **Your apps** → Add app → Web (`</>`) → register it (nickname doesn't matter, don't check "also set up Hosting" here). Copy the `firebaseConfig` values it shows you.
6. Copy `.env.local.example` to `.env.local` and fill in the values from step 5:
   ```
   cp .env.local.example .env.local
   ```
7. Install the Firebase CLI if you don't have it (`npm i -g firebase-tools`), then `firebase login`, then from this repo run `firebase use --add` and pick the project you just created — this creates a local `.firebaserc` (gitignored, machine-specific).
8. Deploy the security rules: `firebase deploy --only firestore:rules`.

## Local dev

```
npm install
npm run dev
```

Open the printed URL in two browser tabs (or a normal + incognito window) to test multiplayer locally — each tab gets its own anonymous auth session.

## Testing

```
npm test          # run once
npm run test:watch
npm run typecheck
npm run build      # production build (tsc -b && vite build)
```

## Deploying

```
npm run build
firebase deploy --only hosting
```

## Known trust-model limitations (Spark plan, no Cloud Functions — by design, see `docs/adr/`)

This game runs entirely on Firestore + Anonymous Auth + Hosting, with no trusted server. The lobby **host's browser tab acts as the resolver** — it's the client that assigns roles and resolves night actions. This is fine for a friends-only game with no cheating concern, but it means:

- The host has technical read access to every player's secret role (needed to resolve nights). A technically capable host could look this up via devtools.
- Ghost tips are anonymous in the UI, but the author's uid is stored in Firestore and not truly hidden from someone reading raw data.

Neither of these is a bug to fix — they're accepted trade-offs of staying on the free plan. If cheating ever becomes a real concern, the fix is adding Cloud Functions (Blaze plan) as a trusted server, which the current `src/game/*` pure-function design was deliberately built to make an easy swap later (same functions, just called from a Cloud Function instead of the host's client).

## Testing multiplayer locally with the dev panel

Set your display name to exactly `Dr. Bright` while creating a lobby (and start the game as host) to unlock a debug panel in-game: reveal all roles, force-resolve the current night, force-expire the day/overtime timer. It's a client-side-only convenience, not a security boundary.
