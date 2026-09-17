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
  - `get_details(url_or_id)` — 특정 결과(결과 URL)의 상세 정보(README, 설치법 등) 조회
- **검색 소스(소스 URL) 결정 (확정)** — 용어 정의는 `docs/GLOSSARY.md` 참고
  - **1순위 — 공식 MCP Registry** (`https://registry.modelcontextprotocol.io/v0.1/servers?search=`): 키 불필요, 검색 파라미터 지원, MCP 서버만 정확히 다뤄 노이즈 없음, 서버명이 `io.github.*` reverse-DNS 형식이라 언어 무관(Python/Node/Go 등 다 잡힘). npm/pypi 등 실제 설치 커맨드까지 응답에 포함.
  - **2순위 — GitHub Search API** (`https://api.github.com/search/repositories`): 키 불필요(비인증 시 분당 10회 제한), 레지스트리에 아직 안 올라온 최신/실험적 프로젝트 보완용.
  - 검토했지만 제외: npm registry(Node 생태계에만 편향, 레지스트리가 이미 포함), smithery.ai(Bearer 토큰 인증 필요), mcp.so(공식 API 없음, 서드파티 스크래퍼만 존재)
  - **확장 방침**: 새 소스가 필요해지면 `src/sources/`에 `SearchSource` 인터페이스(`src/sources/types.ts`)를 구현한 파일을 추가하고 `src/tools/searchMcpServers.ts`의 `sources` 배열에 등록만 하면 됨

### 2단계 — 구현

- **스택**: TypeScript + `@modelcontextprotocol/sdk`, transport는 **stdio** (로컬 실행이므로 원격 HTTP 불필요)
- **모듈/빌드**: ESM + `tsup`(esbuild 기반 번들러), `noExternal`로 SDK·zod까지 단일 파일(`dist/index.js`)에 번들 — Python 스크립트 하나 공유하듯 `.js` 파일 하나만 넘기면 상대방은 Node.js만 있으면 실행 가능. (참고: 순수 `tsc`는 `node_modules` 설치가 별도로 필요해 단일 파일 공유가 안 됨)
- **구조**: `src/index.ts`(서버 부트스트랩) + `src/tools/*.ts`(tool별 파일 분리)
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

- [x] 검색 소스 확정 (1단계) — 공식 MCP Registry + GitHub Search API로 확정
- [x] 프로젝트 스캐폴딩 (2단계 시작) — ESM + tsup 번들 구조로 완료, `npm run build` 정상 동작 확인
- [x] 첫 tool(`search_mcp_servers`) 구현 — 두 소스 결과를 병렬 조회 후 병합해서 반환, 실제 MCP stdio 프로토콜로 end-to-end 테스트 완료(`query=filesystem` 정상 동작 확인)
- [x] `claude mcp add`로 Claude Code에 로컬 등록해서 실제 대화에서 호출 테스트 (3단계) — 실제 대화에서 `search_mcp_servers(query="QA testing")` 호출, Registry 0건 + GitHub 10건 정상 반환 확인
- [x] `get_details(url_or_id)` tool — GitHub URL/`owner/repo`/registry name(`io.github.*`) 세 가지 입력을 분류해 GitHub repo 메타데이터+README, registry의 설치 옵션(패키지·필수/선택 환경변수)을 함께 반환. Inspector CLI로 4개 케이스(GitHub URL, owner/repo, registry name, 존재하지 않는 이름) 모두 확인 완료
