import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

test('主界面风格输入框默认展示西式幻想', () => {
  assert.match(appSource, /useState\('西式幻想'\)/);
  assert.doesNotMatch(appSource, /useState\('火焰纹章风格\+西式幻想RPG'\)/);
});

test('主界面不再显示英文刻印和灌铅调试状态框', () => {
  assert.doesNotMatch(appSource, /Crest:/);
  assert.doesNotMatch(appSource, /Weighted:/);
});

test('占星裁决页位于左侧道具栏下方', () => {
  const inventoryIndex = appSource.indexOf('<InventoryBar');
  const resultPanelIndex = appSource.indexOf('<ResultPanel result={result}');
  const apiFallbackIndex = appSource.indexOf('API 未完整配置');

  assert.notEqual(inventoryIndex, -1);
  assert.notEqual(resultPanelIndex, -1);
  assert.notEqual(apiFallbackIndex, -1);
  assert.ok(inventoryIndex < resultPanelIndex);
  assert.ok(resultPanelIndex < apiFallbackIndex);
});

test('隐藏界面按钮位于左下区域且不压缩裁决页高度', () => {
  assert.match(appSource, /max-h-\[calc\(100vh-1\.5rem\)\]/);
  assert.doesNotMatch(appSource, /max-h-\[calc\(100vh-9rem\)\]/);
  assert.match(appSource, /absolute bottom-3 left-3 md:bottom-6 md:left-\[24rem\]/);
  assert.doesNotMatch(appSource, /absolute bottom-20 right-3 md:bottom-8 md:right-8/);
});
