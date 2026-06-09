import notifier from 'node-notifier';
import { fileURLToPath } from 'node:url';

/** 번들된 종 아이콘 절대 경로. */
const BELL_ICON = fileURLToPath(new URL('../../assets/bell.png', import.meta.url));

/**
 * OS 네이티브 토스트 채널 — v1 주력.
 * 터미널 설정·탭 제목과 무관하게 항상 뜨고, 어느 터미널인지까지 식별시킨다.
 *
 * - 제목: "🔔 <상태> · <프로젝트명>"  (종 + 상태 + 어느 프로젝트인지)
 * - 본문: 전체 경로                    (같은 이름 폴더가 여럿이어도 구분)
 * - 아이콘: 번들 종 이미지
 * - 소리는 끈다(sound:false). 기본 알림음과 구분되도록 전용 sound 채널이 담당.
 *
 * node-notifier는 OS별 헬퍼 프로세스를 띄우므로, 콜백 또는 안전 타임아웃까지
 * 기다린 뒤 resolve 한다 (즉시 process.exit 시 토스트가 안 뜨는 것 방지).
 *
 * @param {import('../context.js').AlertContext} ctx
 * @returns {Promise<void>}
 */
export function notify(ctx) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    try {
      notifier.notify(
        {
          title: `🔔 ${ctx.message} · ${ctx.projectName}`,
          message: ctx.cwd,
          icon: BELL_ICON,
          contentImage: BELL_ICON, // macOS 토스트 이미지
          sound: false, // 소리는 전용 sound 채널이 구분되는 음으로 담당
          wait: false,
        },
        () => finish(),
      );
    } catch {
      finish();
      return;
    }
    // 헬퍼가 뜰 시간을 확보하는 안전 타임아웃.
    setTimeout(finish, 1500);
  });
}

export const name = 'toast';
