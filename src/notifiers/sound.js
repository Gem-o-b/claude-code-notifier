import { spawn } from 'node:child_process';

/**
 * OS·이벤트별 "확실히 구분되는" 내장 사운드 파일.
 * 일반 알림음과 다르게 들리도록 일부러 특색 있는 소리를 고른다. (추가 다운로드 0)
 */
const SOUND_FILES = {
  // Windows: %WINDIR%\Media\*.wav
  win32: { stop: 'tada.wav', notification: 'chimes.wav' },
  // macOS: /System/Library/Sounds/*.aiff
  darwin: { stop: 'Hero.aiff', notification: 'Submarine.aiff' },
};

/** 플랫폼에 맞는 사운드 재생 명령을 만든다. 재생이 끝날 때까지 블로킹(PlaySync/afplay). */
function soundCommand(event) {
  if (process.platform === 'win32') {
    const file = SOUND_FILES.win32[event] || SOUND_FILES.win32.stop;
    // PlaySync는 재생이 끝날 때까지 블로킹 → 프로세스가 일찍 죽어 소리가 잘리는 일 없음.
    const script = `(New-Object Media.SoundPlayer ("$env:WINDIR\\Media\\${file}")).PlaySync()`;
    return { cmd: 'powershell', args: ['-NoProfile', '-Command', script] };
  }
  if (process.platform === 'darwin') {
    const file = SOUND_FILES.darwin[event] || SOUND_FILES.darwin.stop;
    return { cmd: 'afplay', args: [`/System/Library/Sounds/${file}`] };
  }
  // Linux: freedesktop 기본음 (없으면 error 콜백으로 조용히 무시).
  return { cmd: 'paplay', args: ['/usr/share/sounds/freedesktop/stereo/complete.oga'] };
}

/**
 * 소리 채널. 완료/대기를 서로 다른, 일반 알림음과 구분되는 소리로 알린다.
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
      const { cmd, args } = soundCommand(ctx.event);
      const child = spawn(cmd, args, { stdio: 'ignore' });
      child.on('error', finish); // 재생기/파일 없음 → 조용히 무시
      child.on('close', finish);
    } catch {
      finish();
      return;
    }
    setTimeout(finish, 4000); // 안전 타임아웃 (긴 사운드 대비)
  });
}

export const name = 'sound';
