import { buildWebhookPayload } from '../format.js';

const TIMEOUT_MS = 5000;

/**
 * 범용 웹훅 채널 — 임의 URL에 JSON POST.
 * Slack Incoming Webhook / Discord Webhook / ntfy / 커스텀 엔드포인트를 커버한다.
 * settings.url 이 없으면 조용히 skip.
 *
 * @param {import('../context.js').AlertContext} ctx
 * @param {{ url?: string }} [settings]
 * @returns {Promise<void>}
 */
export async function notify(ctx, settings) {
  const url = settings?.url;
  if (!url) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildWebhookPayload(ctx)),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export const name = 'webhook';
