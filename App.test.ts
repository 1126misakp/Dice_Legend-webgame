import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

test('主界面风格输入框默认展示西式幻想', () => {
  assert.match(appSource, /useState\('西式幻想'\)/);
  assert.doesNotMatch(appSource, /useState\('火焰纹章风格\+西式幻想RPG'\)/);
});
