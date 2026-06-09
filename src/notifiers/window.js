import { openTerminalWriter } from '../tty.js';

const BEL = '\x07';
const ESC = '\x1b';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** OSC로 터미널 탭/창 제목을 설정한다 (작업표시줄/탭 식별용). */
function setTitle(title) {
  return `${ESC}]0;${title}${BEL}`;
}

const EVENT = {
  stop: { badge: '✅' },
  notification: { badge: '⏳' },
};

// 깜빡임용 종 모양 한 쌍 — 두 종을 교차해 "딸랑거리는" 효과를 낸다.
const BELL_PAIR = ['🔔', '🛎️'];

const BLINKS = 14; // 깜빡임 횟수 (약 3초)
const BLINK_MS = 220; // 프레임 간격

/**
 * 범용 창 강조 채널.
 * 터미널 본문은 건드리지 않고, 탭 제목의 종 아이콘을 교차 점멸시키며
 * 벨을 울려 "탭이 딸랑딸랑 반짝거리는" 효과를 낸다.
 * 깜빡임이 끝나면 상태 아이콘(완료/대기)으로 고정해 식별성을 유지한다.
 *
 * @param {import('../context.js').AlertContext} ctx
 */
export async function notify(ctx) {
  const badge = (EVENT[ctx.event] || EVENT.stop).badge;
  const suffix = `${ctx.projectName} · ${ctx.message}`;
  const writer = openTerminalWriter();
  try {
    for (let i = 0; i < BLINKS; i++) {
      const icon = BELL_PAIR[i % BELL_PAIR.length];
      // 첫 번째 종(🔔) 프레임마다 벨을 울려 작업표시줄/탭 깜빡임을 반복시킨다.
      const bell = i % BELL_PAIR.length === 0 ? BEL : '';
      writer.write(setTitle(`${icon} ${suffix}`) + bell);
      await sleep(BLINK_MS);
    }
    // 마지막엔 상태 아이콘으로 고정 — 어느 터미널이 끝났는지 계속 식별되게.
    writer.write(setTitle(`${badge} ${suffix}`));
  } finally {
    writer.close();
  }
}

export const name = 'window';
