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
| 4 | Help audit | Claude Code | done | `src/app/help.tsx` |
| 5 | Sign in & registration | Claude Code | in progress | `src/components/auth-screen.tsx`, new `src/components/auth/*` |
| 6 | Final integration (credits link, npm resync, tsc, consistency review) | Claude Code | todo | any of the above, after sections 1–5 are done |

## Do not touch (any agent)
- `src/services/unlock-storage.ts`, `src/services/nfc-service.ts`, `src/hooks/use-nfc-unlock.ts` — NFC scanning, `UnlockService.unlockSpot` and the 30-day timer must keep working.

## Requested changes
_Add requests for files you don't own here: file, what to change, why, who asked._

- `src/services/audio-service.ts` (owner: lead; services are do-not-touch for section agents): on iOS/Android `playMusic` has no real music — `getWebAudioContext()` returns null outside the browser, so the native fallback just speaks “Atmospheric heritage audio playing” in English. The Story player’s “Music” tab is therefore misleading on phones. Either bundle real audio files (expo-av) or hide the Music tab on native. Asked by: Help audit (section 4).
- `src/hooks/use-nfc-unlock.ts` (do-not-touch, lead decides): LT alert title „Nepavyko nuskaityti žymos“ uses „žyma“ while the rest of the app says „lentelė“ — suggest „Nepavyko nuskaityti lentelės“. Asked by: Help audit (section 4).
- `src/app/index.tsx` vs `src/components/app-tabs.tsx`: the Explore tab is „Atrasti“ but the Explore header says „Atraskite“. Help refers to the tab as „Atrasti“; suggest the header match. Also the “No NFC? Enter the code” Pressable has no explicit `accessibilityLabel` (child text is read, so low priority). Asked by: Help audit (section 4).
