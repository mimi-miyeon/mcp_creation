import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { officialRegistrySource } from "../sources/officialRegistry.js";
import { githubSource } from "../sources/github.js";
import type { McpSearchResult, SearchSource } from "../sources/types.js";

// 새 검색 소스를 추가하려면: src/sources/에 SearchSource를 구현한 파일을 만들고 여기 배열에 등록만 하면 됨
const sources: SearchSource[] = [officialRegistrySource, githubSource];

interface SourceOutcome {
  source: SearchSource;
  results?: McpSearchResult[];
  error?: string;
}

function formatResults(query: string, outcomes: SourceOutcome[]): string {
  const lines: string[] = [`"${query}" 검색 결과`];

  for (const { source, results, error } of outcomes) {
    lines.push(`\n## ${source.label}`);

    if (error) {
      lines.push(`- 오류: ${error}`);
      continue;
    }
    if (!results || results.length === 0) {
      lines.push("- 결과 없음");
      continue;
    }

    for (const r of results) {
      lines.push(r.description ? `- **${r.name}** — ${r.description}` : `- **${r.name}**`);
      if (r.repositoryUrl) lines.push(`  - repo: ${r.repositoryUrl}`);
      if (r.installHint) lines.push(`  - install: ${r.installHint}`);
    }
  }

  return lines.join("\n");
}

export function registerSearchMcpServers(server: McpServer) {
  server.registerTool(
    "search_mcp_servers",
    {
      title: "Search MCP servers",
      description:
        "키워드로 관련 MCP 서버를 검색한다. Official MCP Registry + GitHub 결과를 함께 보여준다.",
      inputSchema: {
        query: z.string().describe("검색할 키워드 (예: 'filesystem', 'browser automation')"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ query }) => {
      const outcomes: SourceOutcome[] = await Promise.all(
        sources.map(async (source): Promise<SourceOutcome> => {
          try {
            const results = await source.search(query);
            return { source, results };
          } catch (err) {
            return { source, error: err instanceof Error ? err.message : String(err) };
          }
        }),
      );

      return {
        content: [{ type: "text", text: formatResults(query, outcomes) }],
      };
    },
  );
}
