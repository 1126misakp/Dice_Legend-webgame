import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CharacterInfo, VoiceData } from '../types';
import { createVoiceGenerationGate } from './voiceGenerationGate';

const characterInfo: CharacterInfo = {
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
};

const entranceVoice: VoiceData = {
  voiceId: 'voice-main',
  audioDataHex: 'aaaa',
  skillType: 'entrance',
  line: '我已回应召唤。'
};

const skillVoice: VoiceData = {
  voiceId: 'voice-main',
  audioDataHex: 'bbbb',
  skillType: 'skill1',
  line: '破阵！'
};

test('出场语音未生成前等待门不会提前放行', async () => {
  const gate = createVoiceGenerationGate();
  gate.addVoice(skillVoice);

  const result = await Promise.race([
    gate.waitForAutoPlayVoice().then(() => 'ready'),
    new Promise<string>(resolve => setTimeout(() => resolve('pending'), 5))
  ]);

  assert.equal(result, 'pending');
});

test('出场语音生成后等待门放行并能生成局部语音快照', async () => {
  const gate = createVoiceGenerationGate();
  gate.addVoice(entranceVoice);

  await gate.waitForAutoPlayVoice();

  const snapshot = gate.buildCharacterVoices(characterInfo);
  assert.equal(snapshot?.characterName, '艾琳');
  assert.equal(snapshot?.rarity, 'SR');
  assert.equal(snapshot?.voiceId, 'voice-main');
  assert.equal(snapshot?.voices.length, 1);
  assert.equal(snapshot?.voices[0]?.skillType, 'entrance');
});

test('语音生成结束但没有出场语音时等待门也会释放，避免卡住展示', async () => {
  const gate = createVoiceGenerationGate();
  gate.addVoice(skillVoice);
  gate.finish();

  await gate.waitForAutoPlayVoice();

  const snapshot = gate.buildCharacterVoices(characterInfo);
  assert.equal(snapshot?.voices.some(voice => voice.skillType === 'entrance'), false);
});
