#!/usr/bin/env node
/**
 * Generates real audio for selected TapTale spots:
 *   - story narration per chapter, EN + LT  (Gemini TTS)
 *   - one instrumental music track per spot   (Gemini Lyria)
 *
 * Usage (from the taptale folder):
 *   node scripts/generate-audio.mjs                 # generate whatever is missing
 *   node scripts/generate-audio.mjs --force         # regenerate everything
 *   node scripts/generate-audio.mjs --only=music    # or --only=story
 *   node scripts/generate-audio.mjs --manifest-only # just rewrite the app manifest
 *
 * The key is read from GEMINI_API_KEY (env) or taptale/.env.local. It is only used
 * here, on your machine — it is never written into the app.
 * Needs macOS `afconvert` to compress WAV → AAC (.m4a); falls back to WAV without it.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPOTS_FILE = path.join(ROOT, 'src/constants/spots.ts');
const AUDIO_DIR = path.join(ROOT, 'assets/audio');
const MANIFEST_FILE = path.join(ROOT, 'src/constants/spot-audio.generated.ts');
const PROVENANCE_FILE = path.join(AUDIO_DIR, 'provenance.json');

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MUSIC_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateMusic';
const TTS_MODEL = 'gemini-3.8-flash-tts';
// Lyria RealTime: experimental streaming model, no per-track charge (Lyria 3.x / 3.5 are paid).
const MUSIC_MODEL = 'lyria-realtime-exp';
const MUSIC_SECONDS = 120;
const MUSIC_RATE = 48000; // Lyria RealTime streams 16-bit stereo PCM at 48 kHz
const FADE_IN_SECONDS = 2;
const FADE_OUT_SECONDS = 5;
const STALL_TIMEOUT_MS = 30000;
const VOICE = 'Sulafat'; // "Warm"
const NARRATION_STYLE =
  'Warm, calm heritage audio-guide narrator speaking to a visitor standing at the place. Unhurried pace, clear pronunciation, natural pauses between sentences.';
const LANGS = ['en', 'lt'];
const MAX_RETRIES = 6;
const REQUEST_GAP_MS = 1500;

/** The four places that get generated audio, with a Lyria RealTime music brief for each. */
const TARGETS = {
  'vln-cathedral-square': {
    music: {
      bpm: 66,
      prompts: [
        { text: 'Solemn sacred pipe organ, slow and majestic', weight: 1.0 },
        { text: 'Distant tolling church bells', weight: 0.5 },
        { text: 'Soft sustained strings, spacious cathedral reverb', weight: 0.6 },
      ],
    },
  },
  'vln-university': {
    music: {
      bpm: 92,
      prompts: [
        { text: 'Late-Renaissance harpsichord, graceful and scholarly', weight: 1.0 },
        { text: 'Small baroque string consort with recorder', weight: 0.6 },
        { text: 'Intimate chamber music, bright and calm', weight: 0.4 },
      ],
    },
  },
  'trk-island-castle': {
    music: {
      bpm: 76,
      prompts: [
        { text: 'Medieval Baltic zither (kankles) and lute, stately and calm', weight: 1.0 },
        { text: 'Wooden flute melody over soft frame drums', weight: 0.6 },
        { text: 'Gentle lake wind ambience', weight: 0.3 },
      ],
    },
  },
  'kns-kaunas-castle': {
    music: {
      bpm: 84,
      prompts: [
        { text: 'Medieval fortress music, low war drums with a steady marching pulse', weight: 1.0 },
        { text: 'Horns, hurdy-gurdy and fiddle, tense but not aggressive', weight: 0.7 },
        { text: 'Distant river ambience', weight: 0.3 },
      ],
    },
  },
};

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const MANIFEST_ONLY = args.has('--manifest-only');
const ONLY = [...args].find((a) => a.startsWith('--only='))?.split('=')[1]; // 'story' | 'music'
// Free-tier TTS quotas are per model per day; another TTS model can finish the rest.
const TTS_MODEL_ARG = [...args].find((a) => a.startsWith('--tts-model='))?.split('=')[1];
// Optional filters, e.g. --spot=kns-kaunas-castle --lang=en
const SPOT_ARG = [...args].find((a) => a.startsWith('--spot='))?.split('=')[1];
const LANG_ARG = [...args].find((a) => a.startsWith('--lang='))?.split('=')[1];

/** Thrown when Google reports a per-day quota — retrying today is pointless. */
class DailyQuotaError extends Error {}

/* ------------------------------------------------------------------ */
/* Key + stories                                                       */
/* ------------------------------------------------------------------ */

function readApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const envFile = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envFile)) return null;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.*)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, '').trim() || null;
  }
  return null;
}

function literalText(node) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return undefined;
}

function prop(obj, name) {
  return obj.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === name)?.initializer;
}

/** Reads `story` chapters for the target spots straight from spots.ts (no regexes). */
function readStories() {
  const source = ts.createSourceFile(SPOTS_FILE, fs.readFileSync(SPOTS_FILE, 'utf8'), ts.ScriptTarget.Latest, true);
  const stories = {};
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const id = literalText(prop(node, 'id'));
      const story = prop(node, 'story');
      if (id && TARGETS[id] && story && ts.isArrayLiteralExpression(story)) {
        stories[id] = story.elements.filter(ts.isObjectLiteralExpression).map((ch) => ({
          en: literalText(prop(ch, 'en')) ?? '',
          lt: literalText(prop(ch, 'lt')),
        }));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return stories;
}

/** Same rule as resolveText() in the app: LT if present, otherwise EN. */
function chapterText(chapter, lang) {
  return lang === 'lt' && chapter.lt ? chapter.lt : chapter.en;
}

/* ------------------------------------------------------------------ */
/* Gemini API                                                          */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function retryDelayMs(body, attempt) {
  const detail = body?.error?.details?.find((d) => String(d['@type']).includes('RetryInfo'));
  const secs = parseFloat(String(detail?.retryDelay ?? '').replace('s', ''));
  return Number.isFinite(secs) ? Math.ceil(secs * 1000) + 500 : Math.min(60000, 2000 * 2 ** attempt);
}

async function callGemini(apiKey, body, label) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    if (res.ok && json) return json;

    const message = json?.error?.message ?? text.slice(0, 300);
    if (res.status === 429 && /per day/i.test(message)) {
      throw new DailyQuotaError(`${label}: daily free quota used up — ${message}`);
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < MAX_RETRIES) {
      const wait = retryDelayMs(json, attempt);
      console.log(`   … ${label}: ${res.status}, retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${label}: HTTP ${res.status} — ${message}`);
  }
  throw new Error(`${label}: gave up after ${MAX_RETRIES} retries`);
}

/** Finds the last base64 audio block anywhere in an interactions response. */
function extractAudio(json) {
  const found = [];
  const walk = (value, parentKey) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach((v) => walk(v, parentKey));
    const mime = value.mime_type ?? value.mimeType ?? '';
    const isAudio = value.type === 'audio' || parentKey === 'audio' || String(mime).startsWith('audio/');
    if (isAudio && typeof value.data === 'string' && value.data.length > 100) {
      found.push({ data: value.data, mime: String(mime) });
    }
    for (const [k, v] of Object.entries(value)) walk(v, k);
  };
  walk(json, '');
  const last = found.at(-1);
  if (!last) throw new Error('No audio in the response');
  return { buffer: Buffer.from(last.data, 'base64'), mime: last.mime };
}

function sniffFormat(buffer, mime) {
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF') return 'wav';
  // Only trust an explicit ID3 tag or MIME type: a bare 0xFFEx "frame sync" can also be
  // the first PCM sample of headerless TTS audio, which was once mis-saved as .mp3.
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3' || mime.includes('mpeg')) return 'mp3';
  // Anything without a RIFF/MP3 header is raw 16-bit PCM (some TTS models return it headerless).
  return 'pcm';
}

/** Wraps raw 16-bit PCM in a WAV header (used if the API returns headerless PCM). */
function pcmToWav(pcm, sampleRate = 24000, channels = 1) {
  const blockAlign = channels * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Returns a copy of 16-bit stereo PCM with a linear fade-in and fade-out (for smooth looping). */
function withFades(pcm, rate, fadeInSec, fadeOutSec) {
  const out = Buffer.from(pcm);
  const frames = out.length / 4;
  const fadeIn = Math.min(frames, Math.round(rate * fadeInSec));
  const fadeOut = Math.min(frames, Math.round(rate * fadeOutSec));
  for (let f = 0; f < frames; f++) {
    let gain = 1;
    if (f < fadeIn) gain = f / fadeIn;
    if (f >= frames - fadeOut) gain = Math.min(gain, (frames - f) / fadeOut);
    if (gain === 1) continue;
    for (let ch = 0; ch < 2; ch++) {
      const i = f * 4 + ch * 2;
      out.writeInt16LE(Math.round(out.readInt16LE(i) * gain), i);
    }
  }
  return out;
}

/**
 * Streams music from Lyria RealTime over a WebSocket and resolves with
 * `seconds` of 16-bit stereo PCM at 48 kHz.
 */
function recordRealtimeMusic(apiKey, { prompts, bpm }, seconds, label) {
  const targetBytes = MUSIC_RATE * 4 * seconds;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${MUSIC_WS_URL}?key=${encodeURIComponent(apiKey)}`);
    const chunks = [];
    let bytes = 0;
    let settled = false;
    let stallTimer;
    let lastPct = -1;

    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(stallTimer);
      try {
        ws.send(JSON.stringify({ playbackControl: 'STOP' }));
      } catch {}
      try {
        ws.close();
      } catch {}
      if (err) reject(new Error(`${label}: ${err}`));
      else resolve(Buffer.concat(chunks).subarray(0, targetBytes));
    };
    const armStall = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => finish(`no audio for ${STALL_TIMEOUT_MS / 1000}s`), STALL_TIMEOUT_MS);
    };

    ws.onopen = () => {
      armStall();
      ws.send(JSON.stringify({ setup: { model: `models/${MUSIC_MODEL}` } }));
    };
    ws.onerror = (e) => finish(`connection error ${e?.message ?? ''}`.trim());
    ws.onclose = (e) => {
      if (bytes < targetBytes) finish(`connection closed early (${e.code}${e.reason ? ` ${e.reason}` : ''})`);
    };
    ws.onmessage = async (ev) => {
      const text = typeof ev.data === 'string' ? ev.data : Buffer.from(await ev.data.arrayBuffer()).toString('utf8');
      let msg;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }
      if (msg.setupComplete) {
        ws.send(JSON.stringify({ clientContent: { weightedPrompts: prompts } }));
        ws.send(JSON.stringify({ musicGenerationConfig: { bpm, temperature: 1.0 } }));
        ws.send(JSON.stringify({ playbackControl: 'PLAY' }));
        return;
      }
      if (msg.filteredPrompt) return finish(`prompt was filtered: ${JSON.stringify(msg.filteredPrompt)}`);
      for (const chunk of msg.serverContent?.audioChunks ?? []) {
        const buf = Buffer.from(chunk.data, 'base64');
        chunks.push(buf);
        bytes += buf.length;
        armStall();
        const pct = Math.floor((Math.min(bytes, targetBytes) / targetBytes) * 4) * 25;
        if (pct !== lastPct && pct < 100) {
          lastPct = pct;
          console.log(`   … ${label}: ${pct}%`);
        }
        if (bytes >= targetBytes) return finish();
      }
    };
  });
}

let hasAfconvert;
function canCompress() {
  if (hasAfconvert === undefined) {
    try {
      execFileSync('which', ['afconvert'], { stdio: 'ignore' });
      hasAfconvert = true;
    } catch {
      hasAfconvert = false;
      console.warn('! afconvert not found — keeping WAV files (larger).');
    }
  }
  return hasAfconvert;
}

/** Saves audio as .m4a (AAC) when possible, else as-is. Returns the file name written. */
function saveAudio(dir, baseName, { buffer, mime }, bitrate) {
  fs.mkdirSync(dir, { recursive: true });
  let format = sniffFormat(buffer, mime);
  let data = buffer;
  if (format === 'pcm') {
    data = pcmToWav(buffer);
    format = 'wav';
  }
  if (format === 'mp3') {
    const file = `${baseName}.mp3`;
    fs.writeFileSync(path.join(dir, file), data);
    return file;
  }
  const wavPath = path.join(dir, `${baseName}.wav`);
  fs.writeFileSync(wavPath, data);
  if (!canCompress()) return `${baseName}.wav`;
  const file = `${baseName}.m4a`;
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', String(bitrate), wavPath, path.join(dir, file)]);
  fs.unlinkSync(wavPath);
  return file;
}

function existing(dir, baseName) {
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir).find((f) => f.startsWith(`${baseName}.`)) ?? null;
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

function loadProvenance() {
  try {
    return JSON.parse(fs.readFileSync(PROVENANCE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function recordProvenance(list, entry) {
  const rest = list.filter((e) => !(e.spotId === entry.spotId && e.file === entry.file));
  return [...rest, { ...entry, generatedAt: new Date().toISOString() }];
}

async function generateNarration(apiKey, spotId, chapters, provenance) {
  let log = provenance;
  const dir = path.join(AUDIO_DIR, spotId);
  for (const lang of LANGS) {
    if (LANG_ARG && lang !== LANG_ARG) continue;
    // Keep one model per place+language so a story never changes voice mid-way.
    const earlier = FORCE ? undefined : log.find((e) => e.spotId === spotId && e.kind === 'narration' && e.lang === lang);
    const model = earlier?.model ?? TTS_MODEL_ARG ?? TTS_MODEL;
    for (let i = 0; i < chapters.length; i++) {
      const base = `story-${lang}-${i + 1}`;
      if (!FORCE && existing(dir, base)) continue;
      const text = chapterText(chapters[i], lang);
      if (!text) continue;
      console.log(`→ ${spotId} ${base} (${text.length} chars, ${model})`);
      // Only the 3.8 TTS models accept a speech_metadata style annotation; older ones reject it.
      const annotations = model.startsWith('gemini-3.8')
        ? [{ type: 'speech_metadata', style: NARRATION_STYLE }]
        : undefined;
      const json = await callGemini(
        apiKey,
        {
          model,
          input: [{ type: 'user_input', content: [{ type: 'text', text, ...(annotations ? { annotations } : {}) }] }],
          response_format: { type: 'audio' },
          generation_config: { speech_config: [{ voice: VOICE }] },
        },
        `${spotId} ${base}`
      );
      const file = saveAudio(dir, base, extractAudio(json), 64000);
      log = recordProvenance(log, { spotId, file, kind: 'narration', lang, chapter: i + 1, model, voice: VOICE });
      fs.writeFileSync(PROVENANCE_FILE, JSON.stringify(log, null, 2));
      await sleep(REQUEST_GAP_MS);
    }
  }
  return log;
}

async function generateMusic(apiKey, spotId, provenance) {
  const dir = path.join(AUDIO_DIR, spotId);
  if (!FORCE && existing(dir, 'music')) return provenance;
  const brief = TARGETS[spotId].music;
  console.log(`→ ${spotId} music (${MUSIC_SECONDS}s, recorded in real time)`);
  const pcm = await recordRealtimeMusic(apiKey, brief, MUSIC_SECONDS, `${spotId} music`);
  const wav = pcmToWav(withFades(pcm, MUSIC_RATE, FADE_IN_SECONDS, FADE_OUT_SECONDS), MUSIC_RATE, 2);
  const file = saveAudio(dir, 'music', { buffer: wav, mime: 'audio/wav' }, 128000);
  const log = recordProvenance(provenance, {
    spotId,
    file,
    kind: 'music',
    model: MUSIC_MODEL,
    prompts: brief.prompts,
    bpm: brief.bpm,
    seconds: MUSIC_SECONDS,
  });
  fs.writeFileSync(PROVENANCE_FILE, JSON.stringify(log, null, 2));
  return log;
}

/* ------------------------------------------------------------------ */
/* App manifest                                                        */
/* ------------------------------------------------------------------ */

function writeManifest(stories) {
  const lines = [
    '// AUTO-GENERATED by scripts/generate-audio.mjs — do not edit by hand.',
    "import type { SpotAudioManifest } from './spot-audio';",
    '',
    'export const GENERATED_SPOT_AUDIO: SpotAudioManifest = {',
  ];
  for (const spotId of Object.keys(TARGETS)) {
    const dir = path.join(AUDIO_DIR, spotId);
    const rel = (f) => `require('../../assets/audio/${spotId}/${f}')`;
    const narration = LANGS.map((lang) => {
      const files = (stories[spotId] ?? []).map((_, i) => existing(dir, `story-${lang}-${i + 1}`));
      // Only expose a language when every chapter has audio, so chapters never mix voices.
      return files.length > 0 && files.every(Boolean) ? `      ${lang}: [${files.map(rel).join(', ')}],` : null;
    }).filter(Boolean);
    const music = existing(dir, 'music');
    if (narration.length === 0 && !music) continue;
    lines.push(`  '${spotId}': {`);
    if (narration.length) lines.push('    narration: {', ...narration, '    },');
    if (music) lines.push(`    music: ${rel(music)},`);
    lines.push('  },');
  }
  lines.push('};', '');
  fs.writeFileSync(MANIFEST_FILE, lines.join('\n'));
  console.log(`✓ wrote ${path.relative(ROOT, MANIFEST_FILE)}`);
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const stories = readStories();
  for (const id of Object.keys(TARGETS)) {
    if (!stories[id]?.length) throw new Error(`No story chapters found for ${id} in spots.ts`);
    const missingLt = stories[id].filter((c) => !c.lt).length;
    console.log(`• ${id}: ${stories[id].length} chapters${missingLt ? ` (${missingLt} without LT text — EN used)` : ''}`);
  }

  if (MANIFEST_ONLY) return writeManifest(stories);

  const apiKey = readApiKey();
  if (!apiKey) {
    writeManifest(stories);
    throw new Error('GEMINI_API_KEY not found. Add GEMINI_API_KEY=... to taptale/.env.local and run again.');
  }

  let provenance = loadProvenance();
  const failures = [];
  let isTtsQuotaUsed = false;
  for (const spotId of Object.keys(TARGETS)) {
    if (SPOT_ARG && spotId !== SPOT_ARG) continue;
    if (ONLY !== 'music' && !isTtsQuotaUsed) {
      try {
        provenance = await generateNarration(apiKey, spotId, stories[spotId], provenance);
      } catch (err) {
        failures.push(err.message);
        console.error(`✗ ${err.message}`);
        if (err instanceof DailyQuotaError) {
          isTtsQuotaUsed = true;
          console.error('  Skipping the remaining narration for today. Re-run tomorrow, or pass --tts-model=<another TTS model>.');
        }
      }
    }
    if (ONLY !== 'story') {
      try {
        provenance = await generateMusic(apiKey, spotId, provenance);
      } catch (err) {
        failures.push(err.message);
        console.error(`✗ ${err.message}`);
      }
    }
  }

  writeManifest(stories);
  if (failures.length) {
    console.error(`\n${failures.length} item(s) failed. Re-run to retry only the missing files.`);
    process.exitCode = 1;
  } else {
    console.log('\n✓ All audio generated.');
  }
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exitCode = 1;
});
