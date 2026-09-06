# In-game music files are committed directly into the repo, not externally hosted or LFS-tracked

The `music/` folder (~40MB of mp3s covering lobby/night/day/overtime ambience and event stings) is committed as plain binary files in git and deployed via Firebase Hosting alongside the rest of `dist/`, rather than using Git LFS, an external CDN/object store, or re-encoding to a lower bitrate first. This was a deliberate trade-off, not an oversight: Git LFS and external hosting both add real operational complexity (LFS quota/billing on GitHub, or a second deployment target to keep in sync) for a project with a handful of friends as its entire audience. Firebase Hosting's Spark (free) plan caps at 10GB/month of egress, and this group's realistic usage is nowhere near that ceiling even with the full ~40MB downloaded by every player every game.

## Consequences

Every clone and every CI checkout now carries this ~40MB permanently — git doesn't shrink a repo's history by later deleting files, only by rewriting history, which this project has no reason to do. If the audio library grows substantially (many more tracks, or a much larger friend group with real bandwidth pressure), this decision should be revisited; at that point, Git LFS or serving the files from Firebase Storage/a CDN would be the natural next step rather than continuing to grow the git-tracked binary footprint.
