# claude-code-notifier

> Claude Code 세션이 **끝났거나 입력을 기다리는 순간**을, 다른 창에 파묻혀 있어도 바로 알려줍니다.

[English README](./README.md)

여러 터미널·IDE에서 Claude Code를 동시에 돌리다 보면, 어떤 세션이 작업을 끝냈거나 승인을 기다리는 걸 놓치기 쉽습니다. `claude-code-notifier`는 Claude Code에 연결돼, **데스크톱 토스트 + 구분되는 소리**로 **어느 프로젝트**가 당신을 필요로 하는지 알려줍니다.

## 기능

- 🔔 **데스크톱 토스트** — 프로젝트명과 전체 경로를 표시해, 어느 터미널로 가야 할지 바로 파악.
- 🔊 **구분되는 소리** — 일반 알림음과 다른 소리로 "완료"와 "대기"를 구분.
- 🖥️ **크로스플랫폼** — Windows·macOS·Linux. 단일 코드베이스, OS별 추가 설정 없음.
- ⚙️ **설정 0으로 시작** — `install` 한 번이면 Claude Code에 연결. 채널은 개별 on/off 가능.
- 🧩 **확장 가능한 채널** — 파일 하나만 추가하면 새 채널(예: 폰 푸시) 등록.

## 동작 방식

Claude Code는 특정 시점에 명령을 실행할 수 있습니다. `claude-code-notifier install`은 두 개의 [hook](https://docs.claude.com/en/docs/claude-code/hooks)을 등록합니다:

- **`Stop`** — Claude가 응답을 마쳤을 때 → "✅ 작업 완료"
- **`Notification`** — Claude가 입력/권한을 기다릴 때 → "⏳ 입력 대기중"

각 이벤트는 `claude-code-notifier hook <event>`를 실행하고, 핸들러가 stdin의 세션 정보를 읽어 켜진 채널로 알림을 보냅니다.

## 요구 사항

- [Node.js](https://nodejs.org) ≥ 18
- [Claude Code](https://docs.claude.com/en/docs/claude-code)

## 설치

```bash
npm install -g @gem-o-b/claude-code-notifier
claude-code-notifier install
```

`install`은 `~/.claude/settings.json`에 hook을 등록하고, 기본 설정을 `~/.claude-code-notifier/config.json`에 생성합니다. **Claude Code 세션을 재시작**해야 hook이 적용됩니다.

바로 확인:

```bash
claude-code-notifier test
```

hook 제거:

```bash
claude-code-notifier uninstall
```

<details>
<summary>소스에서 설치하기</summary>

```bash
git clone https://github.com/Gem-o-b/claude-code-notifier.git
cd claude-code-notifier
npm install
node src/cli.js install
```

</details>

## 명령어

| 명령 | 설명 |
| --- | --- |
| `install` | `Stop` / `Notification` hook 등록 + 기본 설정 생성 |
| `uninstall` | 등록된 hook 제거 |
| `test` | 지금 바로 샘플 알림 발사 |
| `config` | 설정 경로/내용 출력 |
| `hook <stop\|notification>` | hook 핸들러 (Claude Code가 호출 — 직접 호출 X) |

## 설정

`~/.claude-code-notifier/config.json`에서 이벤트별로 채널을 켜고 끕니다:

```jsonc
{
  "stop":         { "window": false, "toast": true, "sound": true, "webhook": false, "telegram": false },
  "notification": { "window": false, "toast": true, "sound": true, "webhook": false, "telegram": false },
  "channels": {
    "webhook":  { "url": "https://hooks.slack.com/services/XXX/YYY/ZZZ" },
    "telegram": { "botToken": "123456:ABC-DEF...", "chatId": "987654321" }
  }
}
```

| 채널 | 하는 일 | 기본값 |
| --- | --- | --- |
| `toast` | 프로젝트명 + 경로가 담긴 OS 데스크톱 알림 | **on** |
| `sound` | 완료/대기를 구분하는 특색 있는 소리 | **on** |
| `window` | 터미널 벨 + 탭 제목 (작업표시줄/탭 깜빡임) | off |
| `webhook` | 임의 URL로 POST — Slack / Discord / ntfy / 커스텀 | off |
| `telegram` | Telegram 봇으로 메시지 전송 | off |

### `window` 채널에 대하여

`window` 채널은 터미널 벨과 탭 제목 변경을 보냅니다. 이게 **눈에 보이는** 깜빡임이 되는지는 터미널의 벨 설정에 따라 다르고, Claude Code 세션 안에서는 탭 제목을 Claude Code가 직접 관리하므로 **기본 OFF**입니다. 쓰고 싶다면 설정에서 켠 뒤, 터미널의 시각적 벨도 켜세요 (예: Windows Terminal → *벨 알림 스타일* → "창"/"작업 표시줄").

### 메신저 채널 (자리를 비워도 알림)

토스트·소리는 PC 앞에 있을 때만 통합니다. `webhook`·`telegram` 채널은 휴대폰/팀으로 푸시해요. 인증 정보를 `channels`에 넣고(로컬에만 저장, 저장소엔 안 들어감) 이벤트별 토글을 `true`로 켜세요.

**범용 `webhook`** — `channels.webhook.url` 설정. 본문에 `text`(Slack)·`content`(Discord)·구조화 필드가 함께 들어가 바로 동작합니다:
- **Slack** — [Incoming Webhook](https://api.slack.com/messaging/webhooks) 만들어 URL 사용
- **Discord** — 서버 설정 → 연동 → 웹후크 → 새 웹후크 → URL 복사
- **ntfy** — `https://ntfy.sh/내토픽` (또는 자체 호스팅 서버)

**`telegram`** — `channels.telegram.botToken` + `chatId` 설정:
1. 텔레그램에서 [@BotFather](https://t.me/BotFather) → `/newbot` → 봇 토큰 복사
2. 새 봇과 대화 시작(아무 메시지나 전송)
3. `https://api.telegram.org/bot<토큰>/getUpdates` 열어서 숫자 `chat.id` 확인

> **프라이버시:** 메신저 채널은 프로젝트명·전체 경로를 외부 서비스로 보냅니다. 민감하면 끄세요. 네트워크 실패는 격리되며(5초 타임아웃) Claude Code를 막지 않습니다.

## 플랫폼 지원

| | 토스트 | 소리 | 터미널 벨 |
| --- | --- | --- | --- |
| **Windows** | SnoreToast | `tada.wav` / `chimes.wav` | `CONOUT$` |
| **macOS** | 알림 센터 | `Hero.aiff` / `Submarine.aiff` | `/dev/tty` |
| **Linux** | `notify-send` | freedesktop 사운드 | `/dev/tty` |

> 상태: **Windows / Windows Terminal**에서 검증 완료. macOS·Linux는 코드 경로는 있으나 아직 미검증 — 테스터 환영.

## 종 아이콘

토스트 아이콘(`assets/bell.png`)은 외부 리소스 없이 생성됩니다:

```bash
node scripts/make-icon.mjs
```

## 확장: 채널 추가하기

각 채널은 `notify(ctx)`와 `name`을 내보내는 모듈입니다. 새 채널(예: 폰 푸시) 추가:

1. `src/notifiers/push.js`에 `notify(ctx)` 작성
2. `src/dispatcher.js`에 등록
3. 설정에 키 추가

`ctx`는 `{ event, projectName, cwd, sessionId, message }`를 제공합니다.

## 라이선스

MIT
