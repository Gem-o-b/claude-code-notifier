#!/usr/bin/env node
import { buildContext } from './context.js';
import { dispatch } from './dispatcher.js';
import { loadConfig, enabledChannels, CONFIG_PATH } from './config.js';
import { installHooks, uninstallHooks, SETTINGS_PATH } from './install.js';
import { readFileSync } from 'node:fs';

/** stdin 전체를 읽어 JSON으로 파싱한다. 비어 있거나 잘못된 JSON이면 {} 반환. */
async function readStdinJson() {
  if (process.stdin.isTTY) return {};
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** 이벤트에 맞는 활성 채널로 알림을 발사한다. */
async function alert(ctx) {
  const enabled = enabledChannels(loadConfig(), ctx.event);
  await dispatch(ctx, enabled);
}

async function runHook(event) {
  if (event !== 'stop' && event !== 'notification') {
    process.stderr.write(`[claude-code-notifier] unknown event: ${event}\n`);
    process.exit(0); // hook은 흐름을 막지 않도록 항상 0.
  }
  const payload = await readStdinJson();
  await alert(buildContext(event, payload));
  process.exit(0);
}

async function runTest() {
  await alert(buildContext('stop', { message: 'claude-code-notifier 테스트 알림' }));
  process.stdout.write('[claude-code-notifier] 테스트 알림 발사 — 탭 깜빡임/토스트/소리를 확인하세요.\n');
}

function runInstall() {
  const { settingsPath, configCreated, useBin } = installHooks();
  process.stdout.write(`[claude-code-notifier] hook 등록 완료 → ${settingsPath}\n`);
  process.stdout.write(
    `[claude-code-notifier] hook 형태: ${useBin ? '`claude-code-notifier hook …` (PATH, 위치 독립)' : '`node "…/cli.js" hook …` (절대경로)'}\n`,
  );
  process.stdout.write(
    configCreated
      ? `[claude-code-notifier] 기본 설정 생성 → ${CONFIG_PATH}\n`
      : `[claude-code-notifier] 기존 설정 유지 → ${CONFIG_PATH}\n`,
  );
  process.stdout.write('[claude-code-notifier] 새 Claude Code 세션부터 적용됩니다.\n');
}

function runUninstall() {
  const { settingsPath, existed } = uninstallHooks();
  process.stdout.write(
    existed
      ? `[claude-code-notifier] hook 제거 완료 → ${settingsPath}\n`
      : `[claude-code-notifier] 등록된 hook이 없습니다 → ${settingsPath}\n`,
  );
}

function runConfig() {
  process.stdout.write(`설정 파일: ${CONFIG_PATH}\n\n`);
  try {
    process.stdout.write(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    process.stdout.write('(아직 생성되지 않음 — `claude-code-notifier install` 시 기본값 생성)\n');
  }
}

function printHelp() {
  process.stdout.write(
    'claude-code-notifier — Claude Code 세션 완료/대기 알림\n\n' +
      '  claude-code-notifier install                    Stop·Notification hook 자동 등록 + 기본 설정 생성\n' +
      '  claude-code-notifier uninstall                  등록된 hook 제거\n' +
      '  claude-code-notifier hook <stop|notification>   Claude Code hook 핸들러 (직접 호출 X)\n' +
      '  claude-code-notifier test                       샘플 알림 발사\n' +
      '  claude-code-notifier config                     현재 설정 경로/내용 표시\n',
  );
}

function main() {
  const [command, arg] = process.argv.slice(2);
  switch (command) {
    case 'hook':
      return runHook(arg);
    case 'test':
      return runTest();
    case 'install':
      return runInstall();
    case 'uninstall':
      return runUninstall();
    case 'config':
      return runConfig();
    default:
      return printHelp();
  }
}

main();
