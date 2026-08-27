# Storage and Schema Notes

Core migration `0001_strong_raider.sql`은 기존 사용자 테이블을 변경하지 않고 Project, Stage, Task, Schedule, Record, Attachment, History 테이블·관계·인덱스만 추가한다.

사용자 첨부 원본은 서버의 `storagePut` 헬퍼를 통해 객체 저장소에 업로드한다. 데이터베이스의 `Attachment`에는 원본 바이트가 아닌 `storageKey`, 서빙 URL, 파일 이름, MIME 타입, 크기와 Record 연결만 저장한다.
