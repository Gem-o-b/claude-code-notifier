import { formatText } from '../format.js';

const TIMEOUT_MS = 5000;

/**
 * Telegram 채널 — Bot API sendMessage 호출.
 * settings.botToken / settings.chatId 가 없으면 조용히 skip.
 *
 * 봇 만들기: 텔레그램에서 @BotFather → /newbot → 토큰 발급.
 * chatId: 봇과 대화 시작 후 https://api.telegram.org/bot<토큰>/getUpdates 에서 확인.
 *
 * @param {import('../context.js').AlertContext} ctx
 * @param {{ botToken?: string, chatId?: string|number }} [settings]
 * @returns {Promise<void>}
 */
export async function notify(ctx, settings) {
  const token = settings?.botToken;
  const chatId = settings?.chatId;
  if (!token || !chatId) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: formatText(ctx) }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export const name = 'telegram';
