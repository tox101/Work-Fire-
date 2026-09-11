# 일정열정 (Personal Work OS)

GitHub에서 직접 내려받아 실행할 수 있는 개인 업무 운영 시스템입니다. 기본 설정은 **Manus 연결 없이 로컬 인증과 로컬 파일 저장소**를 사용합니다.

## 요구 사항

- Node.js 22 이상
- pnpm 10 이상
- MySQL 또는 TiDB 데이터베이스

## GitHub에서 실행하기

```bash
git clone https://github.com/tox101/Work-Fire-.git
cd Work-Fire-
pnpm install
cp .env.example .env
```

`.env`에서 다음 값을 반드시 변경합니다.

```dotenv
AUTH_MODE=local
VITE_AUTH_MODE=local
LOCAL_ADMIN_PASSWORD=사용할_로그인_비밀번호
JWT_SECRET=긴_무작위_문자열
DATABASE_URL=mysql://사용자:비밀번호@호스트:3306/데이터베이스
STORAGE_MODE=local
LOCAL_STORAGE_DIR=./data/uploads
```

그 다음 데이터베이스 마이그레이션과 개발 서버를 실행합니다.

```bash
pnpm db:push
pnpm dev
```

브라우저에서 `http://localhost:3000`을 열고 `LOCAL_ADMIN_PASSWORD`로 로그인합니다.

## 검증 및 프로덕션 빌드

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

GitHub Actions가 `master` 또는 `main` 브랜치에 push/PR이 발생할 때 타입 검사, 테스트, 빌드를 자동으로 실행합니다.

## Render 배포

저장소의 `render.yaml`을 Render Blueprint로 연결하면 Docker 기반 웹 서비스로 배포할 수 있습니다. Render 대시보드에서 다음 비밀 환경 변수를 직접 입력해야 합니다.

| 변수 | 설명 |
|---|---|
| `DATABASE_URL` | MySQL/TiDB 연결 문자열 |
| `LOCAL_ADMIN_PASSWORD` | 로그인 비밀번호 |
| `JWT_SECRET` | 세션 서명용 긴 무작위 문자열 |

`AUTH_MODE=local`, `VITE_AUTH_MODE=local`, `STORAGE_MODE=local`은 Render 설정에 포함되어 있습니다. 로컬 파일 저장소는 컨테이너 재배포 시 초기화될 수 있으므로, 영구 첨부파일이 필요하면 별도의 영구 디스크나 S3 호환 저장소를 구성해야 합니다.

## Manus 연결에 대하여

기존 Manus OAuth/Forge 코드 경로는 호환성을 위해 남아 있지만 기본값이 아닙니다. `AUTH_MODE`와 `STORAGE_MODE`를 별도로 지정하지 않는 한 Manus 서버나 Forge 저장소에 연결하지 않습니다. 일반적인 GitHub/Render 실행에는 Manus API 키가 필요하지 않습니다.

## 보안 주의

- `.env` 파일과 데이터베이스 연결 문자열을 GitHub에 commit하지 마세요.
- `render.yaml`에는 실제 데이터베이스 비밀번호를 저장하지 않고 Render 환경 변수 입력을 사용합니다.
- 이미 노출된 데이터베이스 자격 증명이 있다면 데이터베이스 제공업체에서 비밀번호를 즉시 교체하세요.
