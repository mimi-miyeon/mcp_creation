# mcp_creation — 로컬 MCP 제작 계획

## 프로젝트 목표

Skill/Subagent를 만들 때 도움이 되는 MCP·plugin을 웹에서 찾아주는 **로컬 MCP 서버**를 만든다.

기능은 두 가지로 나뉜다:

1. **On-demand 검색** — 사용자가 요청하면 관련 MCP/plugin을 검색해서 알려줌 ✅ 지금 작업 범위
2. **Proactive 제안** — 사용자가 요청하지 않아도 스스로 찾아서 제안 ⏸️ 보류 (MCP만으로는 불가능. Skill/훅 조합으로 추후 별도 작업)

> MCP 서버는 수동적이라 tool 호출이 있어야만 동작한다. "알아서 제안"하는 동작은 MCP가 아니라 Claude에게 "언제 이 tool을 호출할지"를 알려주는 Skill(또는 훅)의 역할이다. 그래서 1번(검색 tool)부터 만들고, 2번은 나중에 Skill로 얹는다.

---

## 전체 흐름 (4단계)

### 1단계 — 설계

- **Tool 목록 정하기** (예시)
  - `search_mcp_servers(query)` — 키워드로 관련 MCP 서버 검색
  - `search_plugins(query)` — 관련 plugin/skill 검색
  - `get_details(url_or_id)` — 특정 결과의 상세 정보(README, 설치법 등) 조회
- **검색 소스 결정 (미정 — 다음 대화에서 확정)**
  - GitHub Search API — 공개 repo 검색, 키 없이도 가능(rate limit 있음)
  - npm registry API — `"mcp-server"` 키워드로 패키지 검색, 키 불필요
  - 공식/커뮤니티 레지스트리 — `modelcontextprotocol/servers`, smithery.ai, mcp.so 등 큐레이션 목록
  - 범용 웹서치 API (Brave Search 등) — API 키 필요
  - 여러 소스를 조합 가능
  - 시작 추천안: **GitHub Search API + npm registry** (키 불필요, 바로 시작 가능)

### 2단계 — 구현

- **스택**: TypeScript + `@modelcontextprotocol/sdk`, transport는 **stdio** (로컬 실행이므로 원격 HTTP 불필요)
- 프로젝트 셋업: `npm init`, SDK 설치, `tsconfig.json` 구성
- 공통 유틸: API 클라이언트(인증 필요 시), 에러 핸들링, 응답 포맷(JSON/Markdown), 페이지네이션
- Tool별 구현 순서
  1. Zod로 input schema 정의 (제약조건 + 설명 명확히)
  2. 검색/fetch 로직 구현 (async/await)
  3. 결과 포맷팅 (가능하면 `outputSchema` + `structuredContent` 사용)
  4. 에러 메시지는 다음 행동을 제안하는 형태로 작성
  5. Annotation 부여: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`

### 3단계 — 테스트

- `npm run build`로 컴파일 확인
- `npx @modelcontextprotocol/inspector`로 tool 단위 테스트
- `claude mcp add`로 Claude Code에 로컬 등록 후 실제 대화에서 호출 테스트

### 4단계 — 평가 (선택)

- 실제로 있을 법한 질문 10개 작성 (예: "서브에이전트에서 파일시스템 접근을 도와줄 MCP 뭐 있어?")
- 각 질문에 대해 직접 답을 검증해서 정답 기준 마련
- `<evaluation>` XML 포맷으로 QA 세트 정리 (mcp-builder 스킬의 evaluation 가이드 참고)

---

## 참고 자료

- MCP 공식 스펙: `https://modelcontextprotocol.io/sitemap.xml` (각 페이지 뒤에 `.md` 붙이면 마크다운으로 조회 가능)
- TypeScript SDK: `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md`
- Claude Code 내 `mcp-builder` 스킬: best practices, 언어별 구현 가이드, evaluation 가이드 포함

---

## 다음 액션

- [ ] 검색 소스 확정 (1단계)
- [ ] 프로젝트 스캐폴딩 (2단계 시작)
- [ ] 첫 tool(`search_mcp_servers`) 구현
