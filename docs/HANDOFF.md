# claude-code-notifier — 작업 인수인계 (HANDOFF)

> 새 세션/사람이 이 문서만 읽고도 맥락을 이어받을 수 있도록 정리한 문서.
> 최종 갱신: 2026-06-08

## 한 줄 요약

여러 터미널/IDE에서 Claude Code를 동시에 쓸 때, **어떤 세션이 작업을 끝냈거나(Stop) 입력을 기다리는지(Notification)** 를 놓치지 않도록 **데스크톱 토스트 + 구분되는 소리**로 알려주는 오픈소스 CLI 도구.

## 현재 상태

- **단계**: 프로토타입 (기능 동작, 공개 전)
- **검증**: Windows / Windows Terminal 에서 동작 확인 완료. macOS·Linux 코드 경로는 있으나 **미검증**.
- **이름 확정**: `claude-code-notifier` (npm 가용 확인됨)
  - 이름 변천: `claude-alert`(초기) → `claude-notify`(npm 선점됨) → **`claude-code-notifier`**
- **폴더**: 아직 `C:\project\claude-alert` (이름 변경 예정 — 아래 "남은 작업" 참조)
- **git**: 설계 문서 1커밋만 존재. 프로토타입 코드는 **아직 미커밋**(사용자 요청으로 보류 중).

## 파일 맵

```
src/
├─ cli.js              명령 진입점: install / uninstall / hook / test / config
├─ dispatcher.js       채널 레지스트리, 켜진 채널을 병렬(Promise.allSettled) 실행
├─ context.js          AlertContext 빌더 (cwd→projectName 등)
├─ config.js           ~/.claude-code-notifier/config.json 로드, 이벤트별 채널 토글
├─ install.js          ~/.claude/settings.json 에 Stop/Notification hook 등록·제거
└─ notifiers/
   ├─ toast.js         OS 토스트 (주력 채널)
   ├─ sound.js         OS별 구분되는 시스템 사운드
   └─ window.js        터미널 벨 + 탭 제목 (기본 OFF)
scripts/make-icon.mjs  종 아이콘 PNG 생성기 (의존성 0)
assets/bell.png        생성된 종 아이콘
README.md / README.ko.md
docs/superpowers/specs/2026-06-08-claude-alert-design.md   설계 문서
```

## 핵심 설계 결정 (코드만 봐선 모르는 "왜")

1. **감지는 Claude Code hook으로.** 별도 감시 프로세스 없이 `Stop`(완료)·`Notification`(대기) hook을 settings.json에 등록. `install` 명령이 자동 등록.
2. **토스트가 주력 채널.** 처음엔 "터미널 벨 + 탭 제목 깜빡임"으로 창을 강조하려 했으나:
   - 탭 **제목 깜빡임**은 Claude Code가 세션 중 터미널 제목을 직접 관리해 **덮어써서 안 보임**.
   - **벨/작업표시줄 깜빡임**은 터미널의 시각적 벨 설정(예: Windows Terminal bellStyle)에 의존 → **추가 설정 필요**.
   - 사용자 핵심 기준: **"install 외 추가 설정이 필요하면 아무도 안 쓴다."**
   - 결론: **설정 0으로 항상 뜨는 OS 토스트를 주력**으로, 터미널 벨/제목(`window` 채널)은 **기본 OFF**.
3. **토스트가 "어느 터미널인지" 식별.** 제목에 🔔 + 상태 + **프로젝트명**, 본문에 **전체 경로**(같은 이름 폴더가 여럿이어도 구분).
4. **소리는 "기본 알림음과 구분되게".** 토스트 자체 알림음은 끔(`sound:false`). 전용 `sound` 채널이 OS 내장의 **특색 있는** 소리를 재생:
   - Windows: `tada.wav`(완료) / `chimes.wav`(대기) — `Media.SoundPlayer.PlaySync()` (블로킹)
   - macOS: `Hero.aiff` / `Submarine.aiff` — `afplay`
   - Linux: freedesktop 사운드 — `paplay`
   - **소리 방식은 "A안(각 OS 내장 사운드 사용)" 채택.** "B안(우리 음원 동봉)"은 나중 옵션으로 보류.
5. **종 아이콘은 스크립트로 생성.** 외부 리소스/라이선스 문제 없이 `scripts/make-icon.mjs`가 `assets/bell.png`를 만든다.
6. **hook 식별은 이름·폴더 독립적.** `install.js`의 `isOurs()`가 명령 구조(`cli.js ... hook <event>` 또는 `claude-code-notifier hook <event>`)로 매칭 → 폴더/패키지명이 바뀌어도 기존 hook을 인식·교체.

## 설정 기본값 (`~/.claude-code-notifier/config.json`)

```jsonc
{
  "stop":         { "window": false, "toast": true, "sound": true },
  "notification": { "window": false, "toast": true, "sound": true }
}
```

## 알려진 한계

- 토스트 **좌상단 작은 앱 아이콘**은 node-notifier(SnoreToast)의 등록 아이콘이라, 종으로 바꾸려면 Windows에 AppUserModelID 등록(레지스트리/단축아이콘)이 필요 — 미구현. 현재는 토스트 본문 이미지 + 제목 🔔로 종을 보여줌.
- macOS/Linux 실제 미검증.

## 남은 작업 (우선순위 순)

1. **폴더/저장소 이름 변경** `claude-alert → claude-code-notifier` + **hook 재설치** (아래 절차).
2. **git 커밋** (현재 보류 중 — 사용자 해제 시 진행).
3. **npm 공개** (`claude-code-notifier`).
4. **macOS/Linux 검증**.
5. (선택) 토스트 좌상단 아이콘까지 종으로: AppUserModelID 등록.
6. (사소) 설계 문서 파일명 `...-claude-alert-design.md` → `...-claude-code-notifier-design.md`.

## 폴더 이름 변경 + 세션 이어받기 절차

> 폴더와 세션 기록 폴더를 **함께** rename 해야 새 세션에서 이 대화를 이어받을 수 있다.
> 실행 중인 Claude Code 세션이 폴더를 점유하므로 **반드시 세션을 닫고** 진행.

```powershell
# 1) 이 Claude Code 세션 + 폴더를 연 편집기/터미널 모두 종료

# 2) 프로젝트 폴더 rename
Rename-Item C:\project\claude-alert C:\project\claude-code-notifier

# 3) 세션 기록 폴더도 같은 규칙으로 rename (경로의 :,\ → -)
Rename-Item "C:\Users\click\.claude\projects\C--project-claude-alert" "C:\Users\click\.claude\projects\C--project-claude-code-notifier"

# 4) 새 폴더에서 Claude Code 재시작 + 이전 대화 이어받기
cd C:\project\claude-code-notifier
claude --continue        # 이 프로젝트의 최근 세션 이어받기 (또는: claude 후 /resume)

# 5) hook 경로 갱신 (★ 필수 — 옛 경로 hook 자동 교체됨)
node src\cli.js install

# 6) 동작 확인
node src\cli.js test
```

- 5번 재설치 **전까지는** 알림이 안 뜬다(설치된 hook이 사라진 옛 경로를 가리킴). Claude Code 동작엔 지장 없음.
- 3번으로 세션 기록 + `memory/`가 함께 이동한다. 혹시 `--continue`가 동작하지 않아도, 이 `docs/HANDOFF.md`로 맥락을 복구할 수 있다.
