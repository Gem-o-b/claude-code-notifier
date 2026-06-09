import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDefaultConfig, CONFIG_PATH } from './config.js';

/** Claude Code 사용자 설정 파일 경로. */
const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');

/** 이 hook이 호출할 cli.js 절대 경로. */
const CLI_PATH = fileURLToPath(new URL('./cli.js', import.meta.url));

const BIN = 'claude-code-notifier';

const EVENTS = [
  { key: 'Stop', arg: 'stop' },
  { key: 'Notification', arg: 'notification' },
];

/** `claude-code-notifier` 명령이 PATH에서 해석되는지 (npm link / -g 설치 여부). */
function binOnPath() {
  try {
    const probe = process.platform === 'win32' ? `where ${BIN}` : `command -v ${BIN}`;
    execSync(probe, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 우리가 등록하는 hook 명령 문자열.
 * PATH에 bin이 있으면 위치 독립적인 `claude-code-notifier hook <event>` 형태,
 * 없으면 cli.js 절대경로 형태로 폴백한다.
 */
function hookCommand(arg, useBin) {
  return useBin ? `${BIN} hook ${arg}` : `node "${CLI_PATH}" hook ${arg}`;
}

/**
 * 이 명령이 claude-code-notifier가 등록한 hook인지 식별한다.
 * 폴더/패키지 이름이 바뀌어도 동작하도록 hook 명령 구조(`cli.js hook <event>`)로 매칭한다.
 */
function isOurs(command) {
  return (
    typeof command === 'string' &&
    /(cli\.js"?|claude-code-notifier)\s+hook\s+(stop|notification)\b/.test(command)
  );
}

function readSettings() {
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}

/** 한 이벤트의 hook 배열에서 우리 그룹만 제거. */
function stripOurs(groups) {
  if (!Array.isArray(groups)) return [];
  return groups
    .map((group) => ({
      ...group,
      hooks: Array.isArray(group.hooks) ? group.hooks.filter((h) => !isOurs(h.command)) : group.hooks,
    }))
    .filter((group) => !Array.isArray(group.hooks) || group.hooks.length > 0);
}

/**
 * Stop·Notification hook을 settings.json에 등록(중복 없이 갱신)하고
 * 기본 config 파일을 생성한다.
 * @returns {{ settingsPath: string, configCreated: boolean }}
 */
export function installHooks() {
  const settings = readSettings();
  settings.hooks = settings.hooks || {};
  const useBin = binOnPath();
  for (const { key, arg } of EVENTS) {
    const cleaned = stripOurs(settings.hooks[key]);
    cleaned.push({ hooks: [{ type: 'command', command: hookCommand(arg, useBin) }] });
    settings.hooks[key] = cleaned;
  }
  writeSettings(settings);
  const configCreated = ensureDefaultConfig();
  return { settingsPath: SETTINGS_PATH, configCreated, useBin };
}

/**
 * settings.json에서 claude-code-notifier hook만 제거한다 (다른 설정은 보존).
 * @returns {{ settingsPath: string, existed: boolean }}
 */
export function uninstallHooks() {
  if (!existsSync(SETTINGS_PATH)) return { settingsPath: SETTINGS_PATH, existed: false };
  const settings = readSettings();
  if (!settings.hooks) return { settingsPath: SETTINGS_PATH, existed: false };
  for (const { key } of EVENTS) {
    const cleaned = stripOurs(settings.hooks[key]);
    if (cleaned.length > 0) settings.hooks[key] = cleaned;
    else delete settings.hooks[key];
  }
  writeSettings(settings);
  return { settingsPath: SETTINGS_PATH, existed: true };
}

export { SETTINGS_PATH, CONFIG_PATH };
