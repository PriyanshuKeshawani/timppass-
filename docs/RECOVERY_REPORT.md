# Folder Recovery Report — 2026-11-27

## Situation
The repository had been reorganized in the working tree before this recovery session. The first snapshot showed 293 deletions, 92 modifications, and 299 untracked entries under `frontend/clg_ki_website`, plus one modified root `.gitignore`. Those uncommitted website changes were in the working tree, not in a commit, stash, or pack.

## What was recovered
- Renamed folders into a clean monorepo layout:
  - `backend/anshul` → `apps/chatbot`
  - `backend/adarsh_mishra` → `apps/recommender`
  - `backend/Email as extension` → `apps/email-extension`
  - `frontend/workdone_on_frontend` → `docs/frontend-worklog`
  - `docs/documeentaion` → `docs/project-documents`
- Preserved the existing `.env` files and other uncommitted changes.
- Updated path references in:
  - `vercel.json`
  - `README.md`
  - `docs/frontend-worklog/run_full_system.bat`
  - `docs/frontend-worklog/FRONTEND_CHANGES_EXPLAINED.md`
  - `apps/email-extension/README.md`
- Confirmed deployment files use context-relative paths.

## Website recovery blocker
`frontend/clg_ki_website` could not be physically moved because a local preview server (`python -m http.server 3000`) had its working directory set to that folder. The server was stopped. By then, the destination `apps/website` had been created and was empty, while the source path no longer existed.

Recovery checks performed:
- `git stash list` — empty.
- `git fsck --lost-found --no-reflogs` — no dangling commits or blobs reported.
- Reflog — no commit/stash containing the original dirty website working tree.
- Filesystem searches — no duplicate copies of the missing modified website files found in the repo or common temp/config folders.
- Current HEAD (`e2e88c6`) contains the last committed website version, including the committed WebP/WebM optimization.

Therefore, the exact uncommitted website changes from the initial snapshot are not recoverable from Git or the filesystem. The committed version is still available from HEAD.

## Next step
Restore the committed website files from HEAD into `apps/website`, without touching any other file, then verify the expected assets and update Vercel root-directory settings if needed.
