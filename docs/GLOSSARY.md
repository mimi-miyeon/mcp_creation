# mcp_creation — 용어 정리

프로젝트 안에서 "URL"이라는 말이 서로 다른 두 층위에서 쓰여 헷갈리기 쉽다. 이 문서는 그 둘을 구분하기 위한 명칭을 정의한다.

---

## 1. 소스 URL (Source URL)

**mcp_creation이 검색을 수행하기 위해 조회하는 대상**의 주소. `search_mcp_servers` tool 내부에서 사용하며, 사용자에게는 보통 노출되지 않는다.

PLAN.md의 "검색 소스"가 여기 해당한다.

### 1-1. API형 소스 (API Source)

검색 파라미터를 받아 구조화된 결과를 돌려주는 API 엔드포인트.

- 공식 MCP Registry: `https://registry.modelcontextprotocol.io/v0.1/servers?search=`
- GitHub Search API: `https://api.github.com/search/repositories`
- `src/sources/`에 `SearchSource` 인터페이스(`src/sources/types.ts`)를 구현해서 추가

### 1-2. 목록형 소스 (Curated List Source)

사람이 수작업으로 정리해 둔 "모음/큐레이션 페이지". API가 아니라 마크다운 목록이나 웹페이지 형태라 파싱/스크래핑이 필요하다.

- 예: awesome-mcp-servers류의 GitHub README, 사용자가 나중에 제시할 수도 있는 특정 모음 URL
- 아직 확정된 소스는 아니며, 필요해지면 1-1과 마찬가지로 `SearchSource`를 구현해서 추가하는 형태가 될 가능성이 높음

---

## 2. 결과 URL (Result URL) / 대상 URL (Target URL)

**소스 URL을 조회해서 실제로 찾아낸, 사용자가 최종적으로 설치·사용하게 될 개별 MCP 서버 또는 plugin**의 주소.

- `search_mcp_servers`의 응답 항목 하나하나가 가리키는 주소 (예: 특정 MCP 서버의 GitHub repo, npm 패키지 페이지)
- `get_details(url_or_id)` tool의 입력값이 되는 것도 이 URL/ID
- 사용자가 Skill/Subagent를 만들 때 실제로 골라서 쓰게 되는 대상

---

## 요약 비교

| 구분 | 소스 URL | 결과 URL |
|---|---|---|
| 무엇의 주소인가 | 검색을 수행할 창구 | 검색으로 찾아낸 개별 MCP/plugin |
| 개수 | 소수 (현재 2개 확정) | 검색할 때마다 다수 |
| 사용 위치 | `search_mcp_servers` 내부 구현 | tool의 응답 결과, `get_details` 입력 |
| 예시 | MCP Registry API, GitHub Search API | `io.github.foo/bar`, 특정 npm 패키지 페이지 |

---

## 흐름

```
사용자 질의
   │
   ▼
search_mcp_servers(query)
   │  내부적으로 소스 URL(API형/목록형)을 조회
   ▼
검색 결과 목록 (각 항목이 결과 URL을 가짐)
   │
   ▼
get_details(url_or_id)   ← 결과 URL 중 하나를 입력으로 받음
   │
   ▼
README, 설치법 등 상세 정보
```
