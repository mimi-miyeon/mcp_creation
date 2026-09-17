const GITHUB_API_BASE = "https://api.github.com/repos";
const README_MAX_CHARS = 8000;

export interface GithubRepoDetails {
  fullName: string;
  description?: string;
  htmlUrl: string;
  stars: number;
  language?: string;
  license?: string;
  homepage?: string;
  topics: string[];
  archived: boolean;
  readme?: string;
  readmeTruncated: boolean;
}

interface GithubRepoResponse {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  license: { name?: string; spdx_id?: string } | null;
  homepage: string | null;
  topics?: string[];
  archived: boolean;
}

async function fetchReadme(owner: string, repo: string): Promise<string | undefined> {
  const res = await fetch(`${GITHUB_API_BASE}/${owner}/${repo}/readme`, {
    headers: { Accept: "application/vnd.github.raw" },
  });
  if (!res.ok) return undefined;
  return res.text();
}

/** GitHub repo의 메타데이터 + README를 함께 조회한다. repo가 없으면 undefined. */
export async function fetchGithubRepoDetails(
  owner: string,
  repo: string,
): Promise<GithubRepoDetails | undefined> {
  const res = await fetch(`${GITHUB_API_BASE}/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (res.status === 404) return undefined;
  if (res.status === 403) {
    throw new Error(
      "GitHub API rate limit에 도달했습니다. 잠시 후 다시 시도하세요 (비인증 요청은 분당 10회 제한).",
    );
  }
  if (!res.ok) {
    throw new Error(`GitHub repo 조회 실패 (HTTP ${res.status}): ${owner}/${repo}`);
  }

  const data = (await res.json()) as GithubRepoResponse;
  const readme = await fetchReadme(owner, repo);

  return {
    fullName: data.full_name,
    description: data.description ?? undefined,
    htmlUrl: data.html_url,
    stars: data.stargazers_count,
    language: data.language ?? undefined,
    license: data.license?.name ?? data.license?.spdx_id ?? undefined,
    homepage: data.homepage || undefined,
    topics: data.topics ?? [],
    archived: data.archived,
    readme: readme ? readme.slice(0, README_MAX_CHARS) : undefined,
    readmeTruncated: (readme?.length ?? 0) > README_MAX_CHARS,
  };
}
