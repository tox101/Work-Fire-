# 일정열정 자체 운영

이 구성은 개인 컴퓨터에서 **MySQL·첨부 저장소·Node 앱을 함께 실행**합니다. 별도 SaaS 사용료는 없지만, 외부에서 모바일로 접속하려면 실행 PC가 켜져 있고 같은 네트워크 또는 개인 VPN에 연결돼 있어야 합니다.

## 1. 준비

Docker Desktop과 Git을 설치한 뒤 프로젝트를 복제합니다. `selfhost/ENVIRONMENT.md`를 기준으로 `selfhost/.env`를 만들고 모든 비밀번호와 `JWT_SECRET`을 긴 무작위 문자열로 설정합니다.

## 2. 실행

프로젝트 루트에서 다음 명령을 실행합니다.

```bash
docker compose --env-file selfhost/.env -f selfhost/docker-compose.yml up -d --build
```

같은 PC에서는 `http://localhost:3000`, 같은 Wi-Fi의 휴대폰에서는 `http://PC의_사설_IP:3000`으로 접속합니다. 첫 화면의 로컬 로그인에서 `LOCAL_ADMIN_PASSWORD`를 입력합니다. 외부 인터넷에 포트 3000을 직접 공개하지 말고, 필요하면 Tailscale 같은 개인 VPN을 사용합니다.

## 3. 데이터 이전

기존 서비스는 삭제하지 않고 읽기·내보내기 가능한 상태로 유지한 채 진행합니다. 먼저 현재 앱의 **Markdown**과 **Records CSV** 내보내기로 사용자 원문 사본을 만듭니다. 전체 관계형 데이터가 필요하면 기존 MySQL에 접근 가능한 환경에서 아래처럼 논리 백업을 만든 뒤, 자체 운영 MySQL에 복원합니다.

```bash
mysqldump --single-transaction --routines --triggers --databases 기존_DB이름 > personal-work-os.sql
docker compose --env-file selfhost/.env -f selfhost/docker-compose.yml exec -T db mysql -u root -p"$MYSQL_ROOT_PASSWORD" < personal-work-os.sql
```

첨부 파일은 기존 객체 저장소에서 내려받아 새 환경의 `uploads_data` 볼륨에 복사하고, Attachment의 파일 키·경로가 새 `/files/<key>` 경로와 일치하는지 확인합니다. DB·첨부 수·무작위 Record 원문을 대조한 뒤에만 기존 환경을 중지합니다.

## 4. 백업과 복구

매주 실행 PC에서 DB와 첨부 볼륨을 함께 백업합니다. DB만 복원하면 첨부 링크가 끊길 수 있습니다.

```bash
docker compose -f selfhost/docker-compose.yml exec -T db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --databases personal_work_os > backup-$(date +%F).sql
docker run --rm -v personal-work-os_uploads_data:/data -v "$PWD":/backup alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

복구는 새 MySQL에 SQL 백업을 넣고 같은 시점의 첨부 압축본을 `uploads_data` 볼륨으로 되돌리는 순서입니다.

## 운영 원칙

`selfhost/.env`, MySQL 볼륨, `uploads_data` 볼륨은 Git에 올리지 않습니다. 공용 네트워크에 공개할 경우 HTTPS 역방향 프록시와 개인 VPN을 먼저 구성합니다. 이 자체 운영 구조에서는 Manus OAuth·Forge 스토리지·Manus 프리뷰가 필요하지 않습니다.
