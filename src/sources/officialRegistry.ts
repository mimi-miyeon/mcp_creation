import type { McpSearchResult, SearchSource } from "./types.js";

const REGISTRY_SEARCH_URL = "https://registry.modelcontextprotocol.io/v0.1/servers";

export interface RegistryEnvironmentVariable {
  name: string;
  description?: string;
  isRequired?: boolean;
  isSecret?: boolean;
  default?: string;
}

export interface RegistryServerPackage {
  registryType?: string;
  identifier?: string;
  version?: string;
  runtimeHint?: string;
  environmentVariables?: RegistryEnvironmentVariable[];
}

export interface RegistryServerEntry {
  server: {
    name: string;
    description?: string;
    version?: string;
    repository?: { url?: string; subfolder?: string };
    packages?: RegistryServerPackage[];
  };
  _meta?: {
    "io.modelcontextprotocol.registry/official"?: { isLatest?: boolean };
  };
}

interface RegistryResponse {
  servers?: RegistryServerEntry[];
}

/** 정확히 name이 일치하는 최신(latest) registry 엔트리를 찾는다. 없으면 undefined. */
export async function fetchRegistryEntryByName(
  name: string,
): Promise<RegistryServerEntry | undefined> {
  const url = new URL(REGISTRY_SEARCH_URL);
  url.searchParams.set("search", name);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Official MCP Registry 요청 실패 (HTTP ${res.status}). 잠시 후 다시 시도하거나 검색어를 바꿔보세요.`,
    );
  }

  const data = (await res.json()) as RegistryResponse;
  const entries = data.servers ?? [];

  return entries.find(
    (entry) =>
      entry.server.name === name &&
      entry._meta?.["io.modelcontextprotocol.registry/official"]?.isLatest !== false,
  );
}

function toInstallHint(pkg?: RegistryServerPackage): string | undefined {
  if (!pkg) return undefined;
  if (pkg.runtimeHint && pkg.identifier) return `${pkg.runtimeHint} ${pkg.identifier}`;
  if (pkg.registryType && pkg.identifier) return `${pkg.registryType}: ${pkg.identifier}`;
  return undefined;
}

export const officialRegistrySource: SearchSource = {
  id: "official-registry",
  label: "Official MCP Registry",

  async search(query: string): Promise<McpSearchResult[]> {
    const url = new URL(REGISTRY_SEARCH_URL);
    url.searchParams.set("search", query);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Official MCP Registry 요청 실패 (HTTP ${res.status}). 잠시 후 다시 시도하거나 검색어를 바꿔보세요.`,
      );
    }

    const data = (await res.json()) as RegistryResponse;
    const entries = data.servers ?? [];

    const latestOnly = entries.filter(
      (entry) => entry._meta?.["io.modelcontextprotocol.registry/official"]?.isLatest !== false,
    );

    return latestOnly.map(({ server }) => ({
      name: server.name,
      description: server.description,
      repositoryUrl: server.repository?.url,
      installHint: toInstallHint(server.packages?.[0]),
      source: "official-registry",
    }));
  },
};
