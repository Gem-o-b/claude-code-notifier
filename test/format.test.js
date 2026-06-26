import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatText, buildWebhookPayload } from '../src/format.js';

const ctx = {
  event: 'stop',
  projectName: 'payment-api',
  cwd: 'C:/work/payment-api',
  message: '작업 완료',
};

test('formatText는 상태·프로젝트·경로를 담는다', () => {
  const text = formatText(ctx);
  assert.match(text, /작업 완료/);
  assert.match(text, /payment-api/);
  assert.match(text, /C:\/work\/payment-api/);
  assert.match(text, /✅/);
});

test('notification 이벤트는 ⏳ 배지를 쓴다', () => {
  assert.match(formatText({ ...ctx, event: 'notification', message: '입력 대기중' }), /⏳/);
});

test('buildWebhookPayload는 Slack(text)·Discord(content)·구조화 필드를 모두 담는다', () => {
  const p = buildWebhookPayload(ctx);
  assert.equal(p.text, p.content); // Slack/Discord 동시 호환
  assert.match(p.text, /payment-api/);
  assert.equal(p.event, 'stop');
  assert.equal(p.project, 'payment-api');
  assert.equal(p.cwd, 'C:/work/payment-api');
  assert.equal(p.message, '작업 완료');
});
