# Audio credits

Story narration and music for these places are **AI-generated with Google Gemini** and bundled with the app:

| Place | Story voice (EN + LT) | Music |
|-------|----------------------|-------|
| Cathedral Square (`vln-cathedral-square`) | EN + LT: Gemini 3.8 Flash TTS | Gemini Lyria RealTime |
| Vilnius University (`vln-university`) | EN: Gemini 3.8 Flash TTS · LT: Gemini 3.1 Flash TTS (preview) | Gemini Lyria RealTime |
| Trakai Island Castle (`trk-island-castle`) | EN: Gemini 3.1 Flash TTS (preview) · LT: _pending_ | Gemini Lyria RealTime |
| Kaunas Castle (`kns-kaunas-castle`) | EN: Gemini 2.5 Flash TTS (preview) · LT: _pending_ | Gemini Lyria RealTime |

All narration uses the prebuilt voice “Sulafat”. Each place + language is voiced by a single model, so a story never changes voice between chapters. Several models were used only because each free-tier TTS model allows about 10 requests per day.

- The narration reads the story text from `src/constants/spots.ts` word for word, one file per chapter.
- The voice is synthetic. It is **not** the voice of the historians named in the spot data. The app labels it “AI voice · Gemini” / “DI balsas · Gemini”.
- Lyria music carries Google’s inaudible SynthID watermark. The app labels it “AI music · Gemini Lyria” / “DI muzika · Gemini Lyria”.
- Exact models, prompts and generation dates for every file are in `assets/audio/provenance.json`.
- Every other place uses the phone’s built-in voice for the story. On phones, places without a generated track have no Music option.

## Regenerating

1. Put your key in `taptale/.env.local`: `GEMINI_API_KEY=...` (this file is gitignored and the key is never bundled into the app).
2. Run `npm run generate:audio` (only missing files are created; add `-- --force` to redo everything, or `-- --only=story` / `-- --only=music`).
3. Rebuild the app.

Both models used are free: Gemini 3.8 Flash TTS has a free tier, and Lyria RealTime (`lyria-realtime-exp`) is an experimental model that streams music live; the script records 2 minutes per place and adds a short fade in/out so it loops smoothly. (The other Lyria models — 3 Clip, 3 Pro, 3.5 — are paid, so the script doesn't use them.) Experimental models can change or be withdrawn by Google; the bundled files keep working regardless.

To add another place, add its id and a music brief to `TARGETS` in `scripts/generate-audio.mjs` and run the script again.
