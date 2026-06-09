import { basename } from 'node:path';

/**
 * @typedef {Object} AlertContext
 * @property {'stop' | 'notification'} event
 * @property {string} projectName  cwd에서 추출 — "어느 터미널인지" 식별
 * @property {string} cwd
 * @property {string} [sessionId]
 * @property {string} message
 */

const DEFAULT_MESSAGES = {
  stop: '작업 완료',
  notification: '입력 대기중',
};

/**
 * Claude Code hook이 stdin으로 넘기는 JSON과 이벤트명으로 AlertContext를 만든다.
 * @param {'stop' | 'notification'} event
 * @param {object} payload  hook stdin JSON (cwd, session_id 등). 비어 있어도 안전.
 * @returns {AlertContext}
 */
export function buildContext(event, payload = {}) {
  const cwd = payload.cwd || process.cwd();
  return {
    event,
    cwd,
    projectName: basename(cwd) || cwd,
    sessionId: payload.session_id,
    message: payload.message || DEFAULT_MESSAGES[event] || event,
  };
}
