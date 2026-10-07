# Audio credits

Story narration and music for these places are **AI-generated with Google Gemini** and bundled with the app:

| Place | Story voice (EN + LT) | Music |
|-------|----------------------|-------|
| Cathedral Square (`vln-cathedral-square`) | Gemini 3.8 Flash TTS, voice “Sulafat” | Gemini Lyria 3.5 |
| Vilnius University (`vln-university`) | Gemini 3.8 Flash TTS, voice “Sulafat” | Gemini Lyria 3.5 |
| Trakai Island Castle (`trk-island-castle`) | Gemini 3.8 Flash TTS, voice “Sulafat” | Gemini Lyria 3.5 |
| Kaunas Castle (`kns-kaunas-castle`) | Gemini 3.8 Flash TTS, voice “Sulafat” | Gemini Lyria 3.5 |

- The narration reads the story text from `src/constants/spots.ts` word for word, one file per chapter.
- The voice is synthetic. It is **not** the voice of the historians named in the spot data. The app labels it “AI voice · Gemini” / “DI balsas · Gemini”.
- Lyria music carries Google’s inaudible SynthID watermark. The app labels it “AI music · Gemini Lyria” / “DI muzika · Gemini Lyria”.
- Exact models, prompts and generation dates for every file are in `assets/audio/provenance.json`.
- Every other place uses the phone’s built-in voice for the story. On phones, places without a generated track have no Music option.

## Regenerating

1. Put your key in `taptale/.env.local`: `GEMINI_API_KEY=...` (this file is gitignored and the key is never bundled into the app).
2. Run `npm run generate:audio` (only missing files are created; add `-- --force` to redo everything, or `-- --only=story` / `-- --only=music`).
3. Rebuild the app. Lyria is a paid API model (about $0.08 per track), billed to the Google Cloud project behind the key.

To add another place, add its id and a music brief to `TARGETS` in `scripts/generate-audio.mjs` and run the script again.
