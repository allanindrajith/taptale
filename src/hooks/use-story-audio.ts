import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { AppLanguage, LocalizedText, resolveText } from '@/constants/spots';
import { AUDIO_SOURCE_LABEL, AudioAsset, getMusic, getNarration, hasNarration } from '@/constants/spot-audio';
import { AudioMode, AudioService } from '@/services/audio-service';

/** Which engine is currently making sound. */
type Engine = 'file' | 'speech' | 'synth' | null;

interface Options {
  spotId: string;
  language: AppLanguage;
  chapters: LocalizedText[];
}

let audioModeReady = false;
async function ensureAudioMode() {
  if (audioModeReady) return;
  audioModeReady = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    audioModeReady = false;
  }
}

/**
 * Story + music playback for one spot.
 * - Story: bundled narration files when generated for this spot/language, otherwise the phone's own voice.
 * - Music: bundled track when generated; on web the built-in synth; otherwise unavailable.
 */
export function useStoryAudio({ spotId, language, chapters }: Options) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const lastIndex = Math.max(0, chapters.length - 1);

  const [mode, setMode] = useState<AudioMode>('voice');
  const [chapter, setChapter] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [engine, setEngine] = useState<Engine>(null);
  const [speechProgress, setSpeechProgress] = useState(0);
  const isMounted = useRef(true);
  const onFileFinished = useRef<() => void>(() => {});
  const playChapterRef = useRef<(index: number) => void>(() => {});

  const musicFile = getMusic(spotId);
  const canPlayMusic = musicFile !== undefined || Platform.OS === 'web';
  const usesGeneratedVoice = hasNarration(spotId, language);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      AudioService.stop();
    };
  }, []);

  // Advance / loop when a bundled file reaches its end.
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) onFileFinished.current();
    });
    return () => sub.remove();
  }, [player]);

  const playFile = useCallback(
    (source: AudioAsset, onFinished: () => void) => {
      AudioService.stop();
      onFileFinished.current = onFinished;
      ensureAudioMode();
      player.replace(source);
      player.play();
      setEngine('file');
      setIsPlaying(true);
    },
    [player]
  );

  const stop = useCallback(() => {
    onFileFinished.current = () => {};
    player.pause();
    AudioService.stop();
    setIsPlaying(false);
    setEngine(null);
    setSpeechProgress(0);
  }, [player]);

  const playChapter = useCallback(
    (index: number) => {
      setChapter(index);
      const next = () => {
        if (!isMounted.current) return;
        if (index < lastIndex) playChapterRef.current(index + 1);
        else stop();
      };

      const file = getNarration(spotId, language, index);
      if (file !== undefined) {
        playFile(file, next);
        return;
      }

      // No generated narration: read the chapter with the phone's voice.
      player.pause();
      setEngine('speech');
      setIsPlaying(true);
      setSpeechProgress(0);
      AudioService.playNarrator(
        resolveText(chapters[index], language),
        language,
        (pct) => isMounted.current && setSpeechProgress(pct),
        next
      );
    },
    [chapters, language, lastIndex, player, playFile, spotId, stop]
  );

  useEffect(() => {
    playChapterRef.current = playChapter;
  }, [playChapter]);

  const playMusic = useCallback(() => {
    if (musicFile !== undefined) {
      // Loop the track until the listener stops it.
      playFile(musicFile, () => {
        player.seekTo(0).then(() => player.play()).catch(() => {});
      });
      return;
    }
    if (Platform.OS !== 'web') return;
    player.pause();
    setEngine('synth');
    setIsPlaying(true);
    setSpeechProgress(0);
    AudioService.playMusic(spotId, (pct) => isMounted.current && setSpeechProgress(pct));
  }, [musicFile, player, playFile, spotId]);

  const togglePlay = useCallback(() => {
    if (isPlaying) return stop();
    if (mode === 'voice') return playChapter(chapter);
    return playMusic();
  }, [chapter, isPlaying, mode, playChapter, playMusic, stop]);

  const goTo = useCallback(
    (index: number) => {
      if (isPlaying && mode === 'voice') playChapter(index);
      else setChapter(index);
    },
    [isPlaying, mode, playChapter]
  );

  const switchMode = useCallback(
    (next: AudioMode) => {
      stop();
      setMode(next);
    },
    [stop]
  );

  const fileProgress = status.duration > 0 ? Math.min(100, (status.currentTime / status.duration) * 100) : 0;
  const progress = engine === 'file' ? fileProgress : speechProgress;

  const label =
    mode === 'music'
      ? musicFile !== undefined
        ? AUDIO_SOURCE_LABEL.aiMusic
        : { en: 'Ambient sound', lt: 'Aplinkos garsas' }
      : usesGeneratedVoice
        ? AUDIO_SOURCE_LABEL.aiVoice
        : AUDIO_SOURCE_LABEL.deviceVoice;

  return {
    mode,
    chapter,
    isPlaying,
    isLoading: engine === 'file' && isPlaying && !status.isLoaded,
    progress,
    canPlayMusic,
    sourceLabel: language === 'lt' ? label.lt : label.en,
    togglePlay,
    goTo,
    switchMode,
  };
}
