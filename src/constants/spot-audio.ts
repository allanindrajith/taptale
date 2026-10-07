import { AppLanguage } from '@/constants/spots';
import { GENERATED_SPOT_AUDIO } from '@/constants/spot-audio.generated';

/** A bundled audio asset (the number returned by `require('…/file.m4a')`). */
export type AudioAsset = number;

export interface SpotAudio {
  /** One file per story chapter, in chapter order. */
  narration?: Partial<Record<AppLanguage, AudioAsset[]>>;
  /** Instrumental track for the place. */
  music?: AudioAsset;
}

export type SpotAudioManifest = Record<string, SpotAudio>;

/** Shown in the player so listeners know what they hear. */
export const AUDIO_SOURCE_LABEL = {
  aiVoice: { en: 'AI voice · Gemini', lt: 'DI balsas · Gemini' },
  deviceVoice: { en: 'Your phone’s voice', lt: 'Telefono balsas' },
  aiMusic: { en: 'AI music · Gemini Lyria', lt: 'DI muzika · Gemini Lyria' },
} as const;

/** Narration file for one chapter, or undefined when this spot/language has none. */
export function getNarration(spotId: string, language: AppLanguage, chapter: number): AudioAsset | undefined {
  return GENERATED_SPOT_AUDIO[spotId]?.narration?.[language]?.[chapter];
}

export function hasNarration(spotId: string, language: AppLanguage): boolean {
  return (GENERATED_SPOT_AUDIO[spotId]?.narration?.[language]?.length ?? 0) > 0;
}

export function getMusic(spotId: string): AudioAsset | undefined {
  return GENERATED_SPOT_AUDIO[spotId]?.music;
}
