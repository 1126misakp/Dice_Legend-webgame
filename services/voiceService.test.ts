import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CharacterVoices } from '../types';
import { getAutoPlayVoice, playAudioData } from './voiceService';

const voices: CharacterVoices = {
  characterName: '塞拉',
  rarity: 'UR',
  voiceId: 'voice-main',
  voices: [
    {
      voiceId: 'voice-main',
      audioDataHex: 'aaaa',
      skillType: 'entrance',
      line: '命运选中了我。'
    },
    {
      voiceId: 'voice-main',
      audioDataHex: 'bbbb',
      skillType: 'ultimate',
      line: '以深渊之名，终结此战！'
    }
  ]
};

test('角色立绘生成后自动播放的语音选择出场语音', () => {
  assert.equal(getAutoPlayVoice(voices)?.skillType, 'entrance');
  assert.equal(getAutoPlayVoice(voices)?.audioDataHex, 'aaaa');
});

test('没有出场语音时不会退回播放奥义语音', () => {
  assert.equal(getAutoPlayVoice({ ...voices, voices: voices.voices.filter(voice => voice.skillType !== 'entrance') }), undefined);
});

test('浏览器拦截音频自动播放时向调用方返回失败', async () => {
  const originalAudio = globalThis.Audio;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  class RejectingAudio {
    onended: (() => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;

    constructor(public src: string) {}

    play(): Promise<void> {
      return Promise.reject(new Error('blocked by autoplay'));
    }
  }

  const testGlobal = globalThis as unknown as { Audio: typeof RejectingAudio };
  testGlobal.Audio = RejectingAudio;
  URL.createObjectURL = () => 'blob:voice-test';
  URL.revokeObjectURL = () => undefined;

  try {
    const result = await Promise.race([
      playAudioData('aaaa').then(
        () => 'resolved',
        error => error instanceof Error ? error.message : String(error)
      ),
      new Promise<string>(resolve => setTimeout(() => resolve('timeout'), 20))
    ]);

    assert.equal(result, 'blocked by autoplay');
  } finally {
    (globalThis as typeof globalThis & { Audio: typeof originalAudio }).Audio = originalAudio;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  }
});
