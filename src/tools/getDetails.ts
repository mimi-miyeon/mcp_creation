import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchRegistryEntryByName, type RegistryServerPackage } from "../sources/officialRegistry.js";
import { fetchGithubRepoDetails, type GithubRepoDetails } from "../sources/githubDetails.js";

const GITHUB_URL_RE = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/#?].*)?$/i;

interface GithubCoords {
  owner: string;
  repo: string;
}

function parseGithubUrl(input: string): GithubCoords | undefined {
  const m = GITHUB_URL_RE.exec(input.trim());
  if (!m) return undefined;
  return { owner: m[1], repo: m[2] };
}

/**
 * 입력값을 분류한다.
 * - registry name (예: "io.github.owner/repo", "com.pulsemcp/remote-filesystem")은 슬래시 앞부분에 "."을 포함한다.
 * - "owner/repo" 형태의 단순 shorthand는 GitHub repo로 취급한다.
 */
function classify(
  input: string,
): { type: "github"; coords: GithubCoords } | { type: "registry"; name: string } {
  const trimmed = input.trim();

  const githubUrlMatch = parseGithubUrl(trimmed);
  if (githubUrlMatch) return { type: "github", coords: githubUrlMatch };

  const slashIdx = trimmed.indexOf("/");
  if (slashIdx > 0) {
    const before = trimmed.slice(0, slashIdx);
    const after = trimmed.slice(slashIdx + 1);
    if (before.includes(".")) {
      return { type: "registry", name: trimmed };
    }
    if (after.length > 0) {
      return { type: "github", coords: { owner: before, repo: after } };
    }
  }

  return { type: "registry", name: trimmed };
}

function formatPackage(pkg: RegistryServerPackage): string[] {
  const lines: string[] = [];
  const head = [pkg.registryType, pkg.identifier, pkg.version].filter(Boolean).join(" ");
  lines.push(`  - **${head || "패키지"}**${pkg.runtimeHint ? ` (실행: \`${pkg.runtimeHint}\`)` : ""}`);

  const requiredEnv = (pkg.environmentVariables ?? []).filter((e) => e.isRequired);
  const optionalEnv = (pkg.environmentVariables ?? []).filter((e) => !e.isRequired);
  if (requiredEnv.length > 0) {
    lines.push(`    - 필수 환경변수: ${requiredEnv.map((e) => e.name).join(", ")}`);
  }
  if (optionalEnv.length > 0) {
    lines.push(`    - 선택 환경변수: ${optionalEnv.map((e) => e.name).join(", ")}`);
  }
  return lines;
}

function formatGithubSection(details: GithubRepoDetails): string[] {
  const lines: string[] = [];
  lines.push(`## ${details.fullName}${details.archived ? " (archived)" : ""}`);
  if (details.description) lines.push(details.description);
  lines.push(
    `- repo: ${details.htmlUrl}`,
    `- stars: ${details.stars}${details.language ? ` · language: ${details.language}` : ""}${
      details.license ? ` · license: ${details.license}` : ""
    }`,
  );
  if (details.homepage) lines.push(`- homepage: ${details.homepage}`);
  if (details.topics.length > 0) lines.push(`- topics: ${details.topics.join(", ")}`);

  lines.push("\n### README");
  if (details.readme) {
    lines.push(details.readme);
    if (details.readmeTruncated) lines.push("\n_(README가 길어 일부만 표시함)_");
  } else {
    lines.push("_README를 찾을 수 없음_");
  }
  return lines;
}

export function registerGetDetails(server: McpServer) {
  server.registerTool(
    "get_details",
    {
      title: "Get MCP server details",
      description:
        "search_mcp_servers 결과 중 하나(GitHub repo URL, 'owner/repo', 또는 registry name 예: 'io.github.owner/repo')를 받아 README와 설치법 등 상세 정보를 조회한다.",
      inputSchema: {
        urlOrId: z
          .string()
          .describe(
            "search_mcp_servers 결과의 repositoryUrl 또는 registry name. 예: 'https://github.com/foo/bar', 'foo/bar', 'io.github.foo/bar'",
          ),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ urlOrId }) => {
      const target = classify(urlOrId);

      try {
        if (target.type === "github") {
          const details = await fetchGithubRepoDetails(target.coords.owner, target.coords.repo);
          if (!details) {
            return {
              content: [
                {
                  type: "text",
                  text: `GitHub repo를 찾을 수 없습니다: ${target.coords.owner}/${target.coords.repo}. URL 철자를 확인하거나 search_mcp_servers 결과의 repositoryUrl을 그대로 전달해보세요.`,
                },
              ],
            };
          }
          return { content: [{ type: "text", text: formatGithubSection(details).join("\n") }] };
        }

        const entry = await fetchRegistryEntryByName(target.name);
        if (!entry) {
          return {
            content: [
              {
                type: "text",
                text: `Official MCP Registry에서 "${target.name}"과 정확히 일치하는 서버를 찾을 수 없습니다. search_mcp_servers 결과에 나온 이름을 그대로 전달했는지 확인하거나, GitHub repo URL을 대신 전달해보세요.`,
              },
            ],
          };
        }

        const lines: string[] = [`## ${entry.server.name}`];
        if (entry.server.description) lines.push(entry.server.description);
        if (entry.server.version) lines.push(`- version: ${entry.server.version}`);
        if (entry.server.repository?.url) {
          lines.push(
            `- repo: ${entry.server.repository.url}${
              entry.server.repository.subfolder ? ` (subfolder: ${entry.server.repository.subfolder})` : ""
            }`,
          );
        }

        const packages = entry.server.packages ?? [];
        if (packages.length > 0) {
          lines.push("\n### 설치 옵션");
          for (const pkg of packages) lines.push(...formatPackage(pkg));
        }

        const repoUrl = entry.server.repository?.url;
        const coords = repoUrl ? parseGithubUrl(repoUrl) : undefined;
        if (coords) {
          const githubDetails = await fetchGithubRepoDetails(coords.owner, coords.repo).catch(
            () => undefined,
          );
          if (githubDetails) {
            lines.push("\n---\n");
            lines.push(...formatGithubSection(githubDetails));
          }
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `상세 조회 실패: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );
}
