import * as windowNotifier from './notifiers/window.js';
import * as toastNotifier from './notifiers/toast.js';
import * as soundNotifier from './notifiers/sound.js';
import * as webhookNotifier from './notifiers/webhook.js';
import * as telegramNotifier from './notifiers/telegram.js';

/**
 * 채널 레지스트리. 새 채널은 여기 한 줄 추가하면 등록된다.
 * 로컬: 창 강조 + OS 토스트 + 소리 / 메신저: 범용 웹훅 + Telegram.
 */
const CHANNELS = {
  window: windowNotifier,
  toast: toastNotifier,
  sound: soundNotifier,
  webhook: webhookNotifier,
  telegram: telegramNotifier,
};

const DEFAULT_ENABLED = ['window', 'toast', 'sound'];

/**
 * 설정에 켜진 채널들로 동시에 알림을 뿌린다.
 * 한 채널이 실패해도 다른 채널/Claude Code 동작에 영향을 주지 않는다.
 *
 * @param {import('./context.js').AlertContext} ctx
 * @param {string[]} enabled  활성 채널명 목록
 * @param {Record<string, object>} channelSettings  채널별 설정(URL/토큰 등)
 */
export async function dispatch(ctx, enabled = DEFAULT_ENABLED, channelSettings = {}) {
  await Promise.allSettled(
    enabled.map(async (channelName) => {
      const channel = CHANNELS[channelName];
      if (!channel) return;
      try {
        await channel.notify(ctx, channelSettings[channelName]);
      } catch (err) {
        // 채널 실패는 삼킨다 — hook은 항상 정상 종료해야 한다.
        process.stderr.write(`[claude-code-notifier] channel "${channelName}" failed: ${err.message}\n`);
      }
    }),
  );
}
