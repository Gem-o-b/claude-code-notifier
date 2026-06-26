const BADGE = { stop: '✅', notification: '⏳' };

/**
 * 사람이 읽는 알림 문구. 메신저 채널(webhook/telegram)이 공통으로 사용한다.
 * @param {import('./context.js').AlertContext} ctx
 * @returns {string}
 */
export function formatText(ctx) {
  const badge = BADGE[ctx.event] || '🔔';
  return `${badge} ${ctx.message} · ${ctx.projectName}\n📁 ${ctx.cwd}`;
}

/**
 * 범용 웹훅 본문. 한 본문으로 여러 서비스를 커버한다.
 * - Slack Incoming Webhook → `text`
 * - Discord Webhook → `content`
 * - 커스텀/ntfy → 구조화 필드(event/project/cwd/message) 활용
 * @param {import('./context.js').AlertContext} ctx
 * @returns {object}
 */
export function buildWebhookPayload(ctx) {
  const text = formatText(ctx);
  return {
    text, // Slack
    content: text, // Discord
    event: ctx.event,
    project: ctx.projectName,
    cwd: ctx.cwd,
    message: ctx.message,
  };
}
