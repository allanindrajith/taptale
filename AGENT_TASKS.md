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
| 2 | Readability + real photos | Claude Code | done | `src/constants/theme.ts`, `src/components/ui/kit.tsx`, `src/components/spot-story-modal.tsx`, `src/components/story-player.tsx`, `src/components/passkey-sheet.tsx`, `src/components/app-tabs.tsx`, `src/constants/spots.ts` (only `imageUrl` lines), `src/app/_layout.tsx` (only image preload), `assets/images/spots/*` (21 new JPGs), new `src/constants/photo-credits.ts`, new `src/components/photo-credits.tsx`, new `PHOTO_CREDITS.md` |
| 3 | Passport: editable profile | Claude Code | done | `src/app/me.tsx`, `src/services/user-storage.ts` (new `updateProfile` only), `app.json` (camera/photo permission strings + `expo-image-picker` plugin entry), new `src/components/profile-editor.tsx` |
| 4 | Help audit | Claude Code | done | `src/app/help.tsx` |
| 5 | Sign in & registration | Claude Code | done | `src/components/auth-screen.tsx` (now a re-export), new `src/components/auth/` (`auth-screen.tsx`, `welcome-header.tsx`, `sign-in-form.tsx`, `register-form.tsx`, `text-field.tsx`, `apple-button.tsx`, `forgot-password-sheet.tsx`, `validation.ts`) |
| 6 | Final integration (credits link, npm resync, tsc, consistency review) | Claude Code | done | `src/app/help.tsx` (Photo credits row), `src/app/index.tsx` (shared SectionHeader, „Atrasti“), `src/components/ui/kit.tsx` (SectionHeader a11y role), `src/hooks/use-nfc-unlock.ts` (one LT string only), `src/components/spot-story-modal.tsx` + `src/components/photo-credits.tsx` (dev-only logs), `app.json` (`usesAppleSignIn`), `package.json` / `package-lock.json` (`expo-file-system`, resync) |
| 7 | Real story voice + music for 4 places (Gemini TTS + Lyria) | Claude Code | in progress (music 4/4 done; narration 23/32 — Trakai EN ch. 4, Trakai LT, Kaunas LT wait for the free TTS quota: run `npm run generate:audio -- --only=story` after ~03:00) | new `scripts/generate-audio.mjs`, new `assets/audio/*`, new `src/constants/spot-audio.ts`, `src/components/story-player.tsx`, `src/services/audio-service.ts` (native music fallback only), `package.json` / `package-lock.json` (`expo-audio`), `app.json` (`expo-audio` plugin), new `AUDIO_CREDITS.md` |


**Resolved in section 6:** LT „žymos“ → „lentelės“; Explore header „Atrasti“; `expo-file-system` declared; `usesAppleSignIn: true`.
**Still open (owner decision):** native Music tab has no real audio (`audio-service.ts`); `user-storage.ts` security/behaviour issues listed below.

## Do not touch (any agent)
- `src/services/unlock-storage.ts`, `src/services/nfc-service.ts`, `src/hooks/use-nfc-unlock.ts` — NFC scanning, `UnlockService.unlockSpot` and the 30-day timer must keep working.

## Requested changes
_Add requests for files you don't own here: file, what to change, why, who asked._

- `src/services/audio-service.ts` (owner: lead; services are do-not-touch for section agents): on iOS/Android `playMusic` has no real music — `getWebAudioContext()` returns null outside the browser, so the native fallback just speaks “Atmospheric heritage audio playing” in English. The Story player’s “Music” tab is therefore misleading on phones. Either bundle real audio files (expo-av) or hide the Music tab on native. Asked by: Help audit (section 4).
- `src/hooks/use-nfc-unlock.ts` (do-not-touch, lead decides): LT alert title „Nepavyko nuskaityti žymos“ uses „žyma“ while the rest of the app says „lentelė“ — suggest „Nepavyko nuskaityti lentelės“. Asked by: Help audit (section 4).
- `src/app/index.tsx` vs `src/components/app-tabs.tsx`: the Explore tab is „Atrasti“ but the Explore header says „Atraskite“. Help refers to the tab as „Atrasti“; suggest the header match. Also the “No NFC? Enter the code” Pressable has no explicit `accessibilityLabel` (child text is read, so low priority). Asked by: Help audit (section 4).
- `package.json` (section 6, npm resync): `src/components/profile-editor.tsx` imports `expo-file-system` (File/Directory/Paths API) to copy the picked profile photo out of the cache into the document directory. It is installed only as a transitive dependency of `expo` (57.0.7); please add it explicitly with `npx expo install expo-file-system`. Asked by section 3.
- `app.json` (section 6 / lead): add `"usesAppleSignIn": true` under `expo.ios` (and the `expo-apple-authentication` config plugin if preferred). Without the Sign in with Apple entitlement the native Apple sheet fails in dev/production builds; the auth screen then shows an inline error. Asked by section 5.
- `src/services/user-storage.ts` (lead decides, security/behaviour): passwords are stored in plain text in the profile JSON via SafeStorage/AsyncStorage (and localStorage on web); `loginWithEmail` never checks the password and spreads the previous profile, so the old `password` carries over to a different email; `connectApple`/`registerUser` call `switchUser` (async, not awaited) then `clearForFreshStart`, which races and resets a returning Apple user's passes on every sign-in. Section 5 works around the password check in the UI (compares against the stored profile) but did not change the service. Asked by section 5.
