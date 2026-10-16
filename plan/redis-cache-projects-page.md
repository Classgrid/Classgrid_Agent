# Plan: Cache "last edited" times on the Projects page

## Problem
`GET /projects` in `server/src/routes/ide.routes.js` calls `newestFileEdits()` on every request.
That opens an SSH connection to the sandbox and runs `find` over every project folder, so the page gets slower as projects grow.

## Goal
Serve "last edited" from Redis for 45 seconds, and only touch SSH when the cache is empty.

## Steps
1. **Import Redis in ide.routes.js**: reuse `server/src/config/redis.js` (already imported in both files, no change needed). ✅
2. **Per-project cache key**: `ide:lastEdited:<projectId>`, value = epoch ms, TTL 45s. ✅
3. **Read cache first in `newestFileEdits()`**: one `mget` for all project ids. Only the missing ids go to SSH. ✅
4. **Write results back**: after the SSH call, `set ... EX 45` for each id that came back. ✅
5. **Fail-safe**: if Redis errors, log and fall back to the current SSH behaviour. The page must never break. ✅
6. **Invalidate on write**: when a project is saved and removed (`ide-project.service.js`, `backupAndRemoveProjectCode`, around line 626), delete that project's key. ✅
7. **Test**: call `/projects` twice and confirm the second call makes no SSH call, then edit a file and confirm the time updates within the TTL. ⏳ (needs deploy + login cookie)
8. **Push** to `main` after you approve the result. ⏳

## Risks
- Up to 45s of staleness on the card (acceptable for a "last edited" label).
- Server restart (PM2) is needed before the change is live.
- Projects with no files are not cached, so they still go through SSH (same as before).

## Changed files
- `server/src/routes/ide.routes.js` (+24 −2)
- `server/src/services/ide-project.service.js` (+1)

Status: steps 1–6 done, syntax check passed, waiting for test and push approval
