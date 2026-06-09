import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 임시 홈으로 격리 — import 전에 설정해야 install.js의 homedir() 경로에 반영된다.
const TMP = mkdtempSync(join(tmpdir(), 'ccn-test-'));
process.env.USERPROFILE = TMP;
process.env.HOME = TMP;

const { installHooks, uninstallHooks } = await import('../src/install.js');

const settingsPath = join(TMP, '.claude', 'settings.json');
const readSettings = () => JSON.parse(readFileSync(settingsPath, 'utf8'));
const commands = (s, key) => (s.hooks?.[key] || []).flatMap((g) => (g.hooks || []).map((h) => h.command));

const seedForeignHook = () => {
  mkdirSync(join(TMP, '.claude'), { recursive: true });
  writeFileSync(
    settingsPath,
    JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo keep-me' }] }] } }),
  );
};

beforeEach(() => rmSync(join(TMP, '.claude'), { recursive: true, force: true }));
after(() => rmSync(TMP, { recursive: true, force: true }));

test('install이 Stop/Notification hook을 등록한다', () => {
  installHooks();
  const s = readSettings();
  assert.ok(commands(s, 'Stop').some((c) => /hook stop\b/.test(c)));
  assert.ok(commands(s, 'Notification').some((c) => /hook notification\b/.test(c)));
});

test('install을 반복해도 우리 hook은 1개씩만 유지된다', () => {
  installHooks();
  installHooks();
  installHooks();
  const s = readSettings();
  assert.equal(commands(s, 'Stop').filter((c) => /hook stop\b/.test(c)).length, 1);
  assert.equal(commands(s, 'Notification').filter((c) => /hook notification\b/.test(c)).length, 1);
});

test('기존 사용자 hook은 보존한다', () => {
  seedForeignHook();
  installHooks();
  const stop = commands(readSettings(), 'Stop');
  assert.ok(stop.includes('echo keep-me')); // 사용자 것 보존
  assert.ok(stop.some((c) => /hook stop\b/.test(c))); // 우리 것 추가
});

test('uninstall이 우리 hook만 제거하고 사용자 hook은 남긴다', () => {
  seedForeignHook();
  installHooks();
  uninstallHooks();
  const stop = commands(readSettings(), 'Stop');
  assert.ok(stop.includes('echo keep-me'));
  assert.equal(stop.filter((c) => /hook stop\b/.test(c)).length, 0);
});
