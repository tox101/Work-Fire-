# Core Design Decisions

- `Project`, `Stage`, `Task`, `Schedule`, `Record`, `Attachment`, `History`는 사용자별 관계형 데이터로 분리한다.
- `Record`의 원문은 변경 없이 보존하며, 연결 상태는 별도 메타데이터로 관리한다.
- 미완료 `Schedule`은 자동 이월하지 않고 현재 상태만 저장한다.
- `History`는 Task의 시작·완료·보류와 핵심 엔터티의 변경 이력을 append 방식으로 저장한다.
- `Continue`는 최신 진행 Task 또는 최근 미완료 Task와 최신 연결 Record, 다음 행동을 결합해 복원한다.
- 첨부 원본은 객체 저장소에 두고 `Attachment`에는 키와 메타데이터만 저장한다.

