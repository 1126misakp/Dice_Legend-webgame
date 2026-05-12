import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CharacterVoices } from '../types';
import { ApiKeys } from '../utils/apiKeyStore';
import {
  generateCharacterVoices,
  getAutoPlayVoice,
  getAutoPlayVoiceDelayMs,
  initVoiceAudioPlayback,
  playAudioData
} from './voiceService';

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

const apiKeys: ApiKeys = {
  openRouter: '',
  openRouterModel: 'x-ai/grok-4.1-fast',
  runningHub: '',
  mimo: 'mimo-key',
  mimoVoice: '',
  textProvider: 'mimo'
};

test('角色立绘生成后自动播放的语音选择出场语音', () => {
  assert.equal(getAutoPlayVoice(voices)?.skillType, 'entrance');
  assert.equal(getAutoPlayVoice(voices)?.audioDataHex, 'aaaa');
});

test('没有出场语音时不会退回播放奥义语音', () => {
  assert.equal(getAutoPlayVoice({ ...voices, voices: voices.voices.filter(voice => voice.skillType !== 'entrance') }), undefined);
});

test('自动出场语音延迟统一为 100ms', () => {
  assert.equal(getAutoPlayVoiceDelayMs('R'), 100);
  assert.equal(getAutoPlayVoiceDelayMs('SR'), 100);
  assert.equal(getAutoPlayVoiceDelayMs('SSR'), 100);
  assert.equal(getAutoPlayVoiceDelayMs('UR'), 100);
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

test('语音生成会先发送出场台词给 TTS 并返回 entrance 音频', async () => {
  const originalFetch = globalThis.fetch;
  const ttsTexts: string[] = [];

  globalThis.fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body || '{}'));

    if (input === '/api/mimo/chat') {
      return new Response(JSON.stringify({
        ok: true,
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                voice_prompt: '30岁女性的坚定声音',
                entrance_line: '我已回应召唤。',
                skill1_line: '破阵！',
                skill2_line: '守护！',
                skill3_line: '光辉降临！',
                ultimate_line: '此刻即是终局！'
              })
            }
          }]
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (input === '/api/mimo/tts') {
      const text = body.messages.find((message: { role: string }) => message.role === 'assistant')?.content;
      ttsTexts.push(text);
      return new Response(JSON.stringify({
        ok: true,
        data: {
          choices: [{
            message: {
              audio: { data: `audio-for-${text}` }
            }
          }]
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    throw new Error(`未预期的请求: ${input}`);
  };

  try {
    const result = await generateCharacterVoices({
      style: '西式幻想',
      name: '艾琳',
      gender: '女',
      age: '30岁',
      profession: '骑士',
      race: '人类',
      attribute: '光',
      rarity: 'SR',
      title: '晨光骑士',
      description: '测试角色'
    }, apiKeys);

    assert.equal(result.success, true);
    assert.equal(ttsTexts[0], '我已回应召唤。');
    assert.equal(result.data?.voices[0]?.skillType, 'entrance');
    assert.equal(result.data?.voices[0]?.audioDataHex, 'audio-for-我已回应召唤。');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('初始化语音播放时播放静音片段以解锁后续异步语音', async () => {
  const originalWindow = globalThis.window;
  let silentSourceStarted = false;

  class FakeAudioContext {
    state = 'running';
    destination = {};
    currentTime = 0;

    resume(): Promise<void> {
      return Promise.resolve();
    }

    createBuffer() {
      return {};
    }

    createBufferSource() {
      return {
        buffer: null,
        connect: () => undefined,
        start: () => {
          silentSourceStarted = true;
        }
      };
    }
  }

  (globalThis as unknown as { window: unknown }).window = { AudioContext: FakeAudioContext };

  try {
    await initVoiceAudioPlayback();
    assert.equal(silentSourceStarted, true);
  } finally {
    (globalThis as unknown as { window: typeof originalWindow }).window = originalWindow;
  }
});
