import type { McpSearchResult, SearchSource } from "./types.js";

const GITHUB_SEARCH_URL = "https://api.github.com/search/repositories";

interface GithubRepoItem {
  full_name: string;
  description: string | null;
  html_url: string;
}

interface GithubSearchResponse {
  items?: GithubRepoItem[];
}

export const githubSource: SearchSource = {
  id: "github",
  label: "GitHub",

  async search(query: string): Promise<McpSearchResult[]> {
    const url = new URL(GITHUB_SEARCH_URL);
    url.searchParams.set("q", `${query} mcp server`);
    url.searchParams.set("sort", "stars");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", "10");

    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (res.status === 403) {
      throw new Error(
        "GitHub Search API rate limit에 도달했습니다. 잠시 후 다시 시도하세요 (비인증 요청은 분당 10회 제한).",
      );
    }
    if (!res.ok) {
      throw new Error(`GitHub 검색 요청 실패 (HTTP ${res.status}).`);
    }

    const data = (await res.json()) as GithubSearchResponse;

    return (data.items ?? []).map((item) => ({
      name: item.full_name,
      description: item.description ?? undefined,
      repositoryUrl: item.html_url,
      source: "github",
    }));
  },
};
