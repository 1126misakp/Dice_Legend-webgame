import { CharacterInfo, CharacterVoices, VoiceData } from '../types';
import { getAutoPlayVoice } from '../services/voiceService';

export interface VoiceGenerationGate {
  addVoice: (voice: VoiceData) => void;
  finish: () => void;
  waitForAutoPlayVoice: () => Promise<void>;
  buildCharacterVoices: (info: CharacterInfo) => CharacterVoices | undefined;
}

export function createVoiceGenerationGate(): VoiceGenerationGate {
  const voices: VoiceData[] = [];
  let isReleased = false;
  let releaseWaiter: (() => void) | null = null;

  const waitPromise = new Promise<void>(resolve => {
    releaseWaiter = resolve;
  });

  const release = () => {
    if (isReleased) return;
    isReleased = true;
    releaseWaiter?.();
  };

  return {
    addVoice: (voice: VoiceData) => {
      voices.push(voice);
      if (getAutoPlayVoice({ characterName: '', rarity: '', voiceId: '', voices })) {
        release();
      }
    },
    finish: release,
    waitForAutoPlayVoice: () => isReleased ? Promise.resolve() : waitPromise,
    buildCharacterVoices: (info: CharacterInfo) => {
      if (voices.length === 0) return undefined;
      return {
        characterName: info.name,
        rarity: info.rarity,
        voiceId: voices[voices.length - 1].voiceId,
        voices: [...voices]
      };
    }
  };
}
