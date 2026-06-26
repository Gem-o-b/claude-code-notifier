import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

export const CONFIG_PATH = join(homedir(), '.claude-code-notifier', 'config.json');

/**
 * 이벤트별 채널 on/off 기본값 + 채널 설정.
 * window(터미널 벨/탭 강조)는 터미널 설정 의존이라 세션 안 실효성이 낮아 기본 OFF.
 * toast(항상 동작) + sound(구분되는 소리)만 기본 ON.
 * webhook/telegram은 URL·토큰 설정이 필요하므로 기본 OFF.
 * channels: 메신저 채널의 URL/토큰 등 설정·비밀값 (로컬에만 저장).
 */
export const DEFAULT_CONFIG = {
  stop: { window: false, toast: true, sound: true, webhook: false, telegram: false },
  notification: { window: false, toast: true, sound: true, webhook: false, telegram: false },
  channels: {},
};

/** 설정 파일을 읽는다. 없거나 깨졌으면 기본값을 반환한다. */
export function loadConfig() {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      stop: { ...DEFAULT_CONFIG.stop, ...(parsed.stop || {}) },
      notification: { ...DEFAULT_CONFIG.notification, ...(parsed.notification || {}) },
      channels: { ...(parsed.channels || {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** 해당 이벤트에서 켜진 채널 이름 목록. */
export function enabledChannels(config, event) {
  const section = config[event] || {};
  return Object.keys(section).filter((channel) => section[channel]);
}

/** 설정 파일이 없으면 기본값으로 생성한다. */
export function ensureDefaultConfig() {
  if (existsSync(CONFIG_PATH)) return false;
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');
  return true;
}
