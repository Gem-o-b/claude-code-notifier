import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enabledChannels, DEFAULT_CONFIG } from '../src/config.js';

test('enabledChannels는 켜진 채널만 반환한다', () => {
  const cfg = { stop: { window: false, toast: true, sound: true } };
  assert.deepEqual(enabledChannels(cfg, 'stop'), ['toast', 'sound']);
});

test('없는 이벤트는 빈 배열을 반환한다', () => {
  assert.deepEqual(enabledChannels({}, 'stop'), []);
});

test('기본값은 window OFF, toast/sound ON', () => {
  assert.equal(DEFAULT_CONFIG.stop.window, false);
  assert.equal(DEFAULT_CONFIG.stop.toast, true);
  assert.equal(DEFAULT_CONFIG.stop.sound, true);
  assert.equal(DEFAULT_CONFIG.notification.window, false);
  assert.equal(DEFAULT_CONFIG.notification.toast, true);
  assert.equal(DEFAULT_CONFIG.notification.sound, true);
});
