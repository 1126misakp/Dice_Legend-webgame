import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CharacterVoices } from '../types';
import { getAutoPlayVoice } from './voiceService';

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

test('角色立绘生成后自动播放的语音选择奥义', () => {
  assert.equal(getAutoPlayVoice(voices)?.skillType, 'ultimate');
  assert.equal(getAutoPlayVoice(voices)?.audioDataHex, 'bbbb');
});

test('没有奥义语音时不会退回播放出场语音', () => {
  assert.equal(getAutoPlayVoice({ ...voices, voices: voices.voices.filter(voice => voice.skillType !== 'ultimate') }), undefined);
});
