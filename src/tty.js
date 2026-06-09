import { openSync, writeSync, closeSync } from 'node:fs';

/**
 * 제어 터미널(controlling terminal) 장치 경로.
 * hook은 Claude Code의 자식 프로세스라 stdout이 해당 터미널이 아닐 수 있으므로,
 * OS의 터미널 장치에 직접 써서 BEL/OSC/색상이 올바른 창에 도달하게 한다.
 */
function terminalDevicePath() {
  return process.platform === 'win32' ? '\\\\.\\CONOUT$' : '/dev/tty';
}

/**
 * 제어 터미널에 직접 쓰는 writer를 연다.
 * 애니메이션처럼 여러 번 써야 할 때 사용한다. 다 쓰면 close() 호출.
 * 장치를 열 수 없으면 stderr로 폴백한다.
 *
 * @returns {{ write: (text: string) => void, close: () => void, via: 'tty' | 'stderr' }}
 */
export function openTerminalWriter() {
  let fd;
  try {
    fd = openSync(terminalDevicePath(), 'w');
    return {
      write: (text) => writeSync(fd, text),
      close: () => { try { closeSync(fd); } catch { /* ignore */ } },
      via: 'tty',
    };
  } catch {
    return {
      write: (text) => { try { process.stderr.write(text); } catch { /* ignore */ } },
      close: () => {},
      via: 'stderr',
    };
  }
}

/** 한 번만 쓰고 닫는 편의 함수. */
export function writeToTerminal(text) {
  const w = openTerminalWriter();
  w.write(text);
  w.close();
  return { via: w.via };
}
