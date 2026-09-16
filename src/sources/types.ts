export interface McpSearchResult {
  name: string;
  description?: string;
  repositoryUrl?: string;
  installHint?: string;
  source: string;
}

export interface SearchSource {
  id: string;
  label: string;
  search(query: string): Promise<McpSearchResult[]>;
}
