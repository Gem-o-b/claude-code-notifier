# claude-alert 설계 문서

- **작성일**: 2026-06-08
- **상태**: 설계 승인됨 (구현 계획 작성 단계로 이동)

## 1. 문제 정의

여러 터미널/IDE에서 Claude Code를 동시에 사용할 때, 특정 세션이 **작업을 끝냈거나(완료) 사용자 입력을 기다리는(대기)** 상태가 되어도 다른 작업에 몰입해 있으면 이를 즉시 인지하지 못한다. 그 결과 완료된 세션이 방치되어 작업 흐름이 끊긴다.

## 2. 목표 / 비목표

### 목표
- Claude Code 세션이 **완료(Stop)** 또는 **입력 대기(Notification)** 상태가 되면 즉시 사용자에게 알린다.
- **어느 프로젝트/터미널**이 알림을 발생시켰는지 식별 가능해야 한다.
- **크로스플랫폼**(Windows / macOS / Linux)과 **여러 터미널·IDE**(Windows Terminal, iTerm2, VS Code 통합 터미널, JetBrains 등)에서 동작한다.
- **오픈소스**로 공개해 누구나 설치·사용·기여할 수 있게 한다.

### 비목표 (v1)
- 폰 푸시(ntfy/Telegram 등)의 완성 구현 — v1에서는 **확장 지점(인터페이스)만** 제공.
- Claude Code 외 다른 AI CLI 지원.
- GUI 설정 화면.

## 3. 접근 방식 결정

- **런타임/배포**: Node.js CLI + npm 배포 (`npm i -g claude-alert` / `npx claude-alert`).
  - 선정 이유: Claude Code 사용자는 대개 Node 보유 / `node-notifier`로 3개 OS 토스트 일괄 처리 / 단일 코드베이스로 크로스플랫폼 / 기여자 풀이 넓음 / `install` 명령으로 hook 등록 자동화.
  - 대안 B(순수 셸 스크립트): 두 벌 유지보수·배포 어색 → 기각.
  - 대안 C(Go/Rust 단일 바이너리): 의존성 0이지만 v1 개발/릴리스 부담·기여 진입장벽 → 추후 포팅 여지로 보류.
- **감지 메커니즘**: Claude Code의 `Stop`·`Notification` hook 사용 (별도 감시 프로세스 불필요).
- **범용 창 강조 메커니즘**: 터미널 벨(BEL, `\a`) + OSC 제목 변경 escape. 대부분의 터미널/IDE가 공통으로 탭 강조·작업표시줄/Dock 깜빡임으로 반응하므로 OS별 분기 최소화.

## 4. 아키텍처

```
Claude Code  ──(Stop / Notification hook, stdin = JSON)──▶  claude-alert hook <event>
                                                                  │  (이벤트, cwd, session_id 파싱)
                                                                  ▼
                                                          Dispatcher (config 로드)
                                          ┌───────────────────────┼───────────────────────┐
                                          ▼                       ▼                       ▼
                                  WindowEmphasisNotifier    ToastNotifier           SoundNotifier   ( +PushNotifier 확장 )
                                   (BEL + OSC 제목)          (node-notifier)          (사운드 재생)
```

### 4.1 구성 요소
- **CLI 엔트리** (`claude-alert`): 사용자/설치 명령 처리.
- **Hook 핸들러 / Dispatcher**: stdin JSON을 읽어 `AlertContext`를 만들고, config에 켜진 채널을 순차 실행.
- **Notifier 인터페이스**: `notify(ctx)` 단일 메서드. 각 채널이 구현.
- **Config 로더**: 설정 파일 읽기/기본값 생성.

### 4.2 CLI 명령
| 명령 | 설명 |
|------|------|
| `claude-alert install` | 사용자 settings.json에 Stop·Notification hook 자동 등록 + 기본 config 생성 |
| `claude-alert uninstall` | 등록된 hook 제거 |
| `claude-alert hook <stop\|notification>` | 실제 핸들러 (Claude Code가 호출) |
| `claude-alert test` | 샘플 알림 발사 → 설치/터미널 호환 즉시 검증 |
| `claude-alert config` | 현재 설정 경로/내용 표시 |

### 4.3 Notifier 인터페이스
```
interface Notifier {
  notify(ctx: AlertContext): Promise<void>
}

interface AlertContext {
  event: 'stop' | 'notification'
  projectName: string   // cwd에서 추출 — "어느 터미널인지" 식별
  cwd: string
  sessionId?: string
  message: string
}
```
새 채널 추가 = **파일 하나 + config 키 등록**. (폰 푸시는 이 방식으로 v2에서 추가)

### 4.4 설정 파일 (`~/.claude-alert/config.json`)
```jsonc
{
  "stop":         { "window": true, "toast": true,  "sound": "done.wav" },
  "notification": { "window": true, "toast": false, "sound": "ping.wav" }
}
```
- 이벤트별로 채널 on/off, 사운드 파일, (추후) 메시지 템플릿 지정.
- 채널은 각각 독립적으로 토글.

## 5. 데이터 흐름

1. Claude Code가 작업 완료 → `Stop` hook 발동 → `claude-alert hook stop` 실행.
2. 핸들러가 stdin JSON(cwd, session_id 등)을 파싱해 `AlertContext` 생성 (projectName = cwd 마지막 경로 세그먼트).
3. config 로드 → 해당 이벤트에 켜진 채널 목록 결정.
4. 각 채널의 `notify(ctx)` 호출 → 터미널 강조 / 토스트 / 사운드 동시 발생.
5. 핸들러는 빠르게 exit 0.

## 6. 핵심 기술 리스크 (구현 시 최우선 PoC)

**창 강조(BEL + OSC)가 Claude Code가 실행 중인 "그 터미널"에 도달해야 한다.** hook은 자식 프로세스라 stdout이 해당 TTY가 아닐 수 있다.
- 검증 항목: 제어 터미널 장치(macOS/Linux `/dev/tty`, Windows `CON`)에 직접 쓰는 방식으로 벨/OSC가 올바른 창에 전달되는지.
- 이 PoC가 실패하면 창 강조 전략 자체를 재검토해야 하므로 **가장 먼저** 확인한다.

## 7. 에러 처리

- 각 notifier는 `try/catch` + 짧은 타임아웃으로 감싼다. **한 채널 실패가 다른 채널이나 Claude Code 동작을 막지 않는다.**
- hook 핸들러는 어떤 경우에도 빠르게 `exit 0` 한다 (Claude Code 흐름 차단 방지).

## 8. 테스트 전략

- **단위 테스트**: 각 Notifier(출력 스트림 목킹), Config 로더(기본값/병합), AlertContext 빌더(cwd → projectName).
- **통합 테스트**: `install`/`uninstall`을 임시 settings.json 대상으로 검증(기존 설정 보존 포함).
- **수동 크로스플랫폼 검증**: `claude-alert test`로 각 터미널/OS에서 실제 창 강조·토스트·소리 확인.
- **호환성 매트릭스** 문서화: Windows Terminal / iTerm2 / VS Code / JetBrains × Win/macOS/Linux.

## 9. v1 범위 요약

- 이벤트: `Stop`, `Notification`.
- 채널: **창 강조(BEL+OSC) / OS 토스트(node-notifier) / 소리** — 각각 독립 토글.
- 폰 푸시: 인터페이스/확장 지점만 마련.
- CLI: `install` / `uninstall` / `hook` / `test` / `config`.
