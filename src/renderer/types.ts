export interface RenderContext {
  owner: string;
  repo: string;
  branch: string;
  basePath: string;
}

export interface AssetMap {
  resolve(relativePath: string): Promise<string | null>;
}
