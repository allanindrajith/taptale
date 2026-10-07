# Agent tasks

Shared board for Claude Code and Antigravity agents working in this repo.

**Rules**
- Read this file before editing anything. Update your row when you start and when you finish.
- Never edit a file listed under a section that another agent has marked `in progress`.
- Shared files (theme, `ui/kit.tsx`, services) have one owner per run. If you need a change in a file you don't own, add it under **Requested changes** below instead of editing it.
- Branch: `claude/taptale-ui-update`. Commits are made per finished section.

## Sections

| # | Section | Owner | Status | Files it touches |
|---|---------|-------|--------|------------------|
| 1 | Unlocked places first (Explore) | Claude Code | done | `src/app/index.tsx`, new `src/components/your-places.tsx` |
| 2 | Readability + real photos | Claude Code | in progress | `src/constants/theme.ts`, `src/components/ui/kit.tsx`, `src/components/spot-story-modal.tsx`, `src/components/story-player.tsx`, `src/components/passkey-sheet.tsx`, `src/components/app-tabs.tsx`, `src/constants/spots.ts` (only `imageUrl` lines), `src/app/_layout.tsx` (only image preload), `assets/images/spots/*`, new `src/constants/photo-credits.ts`, new `src/components/photo-credits.tsx`, new `PHOTO_CREDITS.md` |
| 3 | Passport: editable profile | Claude Code | in progress | `src/app/me.tsx`, `src/services/user-storage.ts`, `app.json` (only permission strings), new `src/components/profile-editor.tsx` |
| 4 | Help audit | Claude Code | in progress | `src/app/help.tsx` |
| 5 | Sign in & registration | Claude Code | in progress | `src/components/auth-screen.tsx`, new `src/components/auth/*` |
| 6 | Final integration (credits link, npm resync, tsc, consistency review) | Claude Code | todo | any of the above, after sections 1–5 are done |

## Do not touch (any agent)
- `src/services/unlock-storage.ts`, `src/services/nfc-service.ts`, `src/hooks/use-nfc-unlock.ts` — NFC scanning, `UnlockService.unlockSpot` and the 30-day timer must keep working.

## Requested changes
_Add requests for files you don't own here: file, what to change, why, who asked._

- (none yet)
