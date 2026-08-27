# 자체 운영 환경 변수

`selfhost/docker-compose.yml`과 같은 폴더에 `.env` 파일을 새로 만들고 아래 키를 설정합니다. 이 파일은 저장소에 커밋하지 않습니다.

| 키 | 용도 |
|---|---|
| `MYSQL_PASSWORD` | 앱 전용 MySQL 계정 비밀번호 |
| `MYSQL_ROOT_PASSWORD` | MySQL 관리 비밀번호 |
| `LOCAL_ADMIN_PASSWORD` | 개인 로그인 비밀번호 |
| `JWT_SECRET` | 세션 서명용 32자 이상 무작위 문자열 |
| `LOCAL_ADMIN_NAME` | 화면에 표시할 이름(선택) |
| `APP_PORT` | 로컬 접속 포트(기본 3000) |

예시 형식은 `MYSQL_PASSWORD=긴_무작위_문자열`입니다. 실제 값은 어떤 소스 파일이나 Git 저장소에도 기록하지 않습니다.
