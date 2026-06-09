import { test } from 'node:test';
import assert from 'node:assert/strict';
import { basename } from 'node:path';
import { buildContext } from '../src/context.js';

test('payload의 cwd에서 projectName을 뽑는다', () => {
  const ctx = buildContext('stop', { cwd: 'C:/work/payment-api', session_id: 'abc' });
  assert.equal(ctx.event, 'stop');
  assert.equal(ctx.projectName, 'payment-api');
  assert.equal(ctx.cwd, 'C:/work/payment-api');
  assert.equal(ctx.sessionId, 'abc');
  assert.equal(ctx.message, '작업 완료');
});

test('notification 이벤트의 기본 메시지', () => {
  const ctx = buildContext('notification', {});
  assert.equal(ctx.message, '입력 대기중');
  assert.equal(ctx.projectName, basename(process.cwd()));
});

test('payload.message가 기본 메시지를 덮어쓴다', () => {
  const ctx = buildContext('stop', { message: '커스텀 메시지' });
  assert.equal(ctx.message, '커스텀 메시지');
});
