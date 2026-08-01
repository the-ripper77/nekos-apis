import type {
  Provider,
  ProviderResult,
  SearchOutcome,
  SearchParams,
  SpecificParams,
} from "./types.ts";
import {
  APIError,
  ClientError,
  NotFoundError,
  buildQuery,
  clampAmount,
  decodeHeaderValue,
} from "./util.ts";

const META_HEADERS = ["anime_name", "artist_name", "artist_href", "source_url"] as const;

const BUCKET_INTERVALS = { search: 5 / 7 + 0.01, category: 60 / 200 + 0.01 } as const;

export type Endpoints = Record<string, string>;

export type NekosBestOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
  headers?: Record<string, string>;
};

export class NekosBestClient implements Provider {
  readonly id = "nekos-best" as const;
  readonly label = "nekos.best";

  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly headers: Record<string, string>;
  private readonly lastRequest: Record<keyof typeof BUCKET_INTERVALS, number> = {
    search: 0,
    category: 0,
  };

  constructor(options: NekosBestOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://nekos.best/api/v2").replace(/\/+$/, "");
    this.fetcher = options.fetcher ?? ((...args) => globalThis.fetch(...args));
    this.headers = { ...options.headers };
  }

  private async throttle(bucket: keyof typeof BUCKET_INTERVALS): Promise<void> {
    const interval = BUCKET_INTERVALS[bucket];
    const elapsed = performance.now() - this.lastRequest[bucket];
    if (elapsed < interval * 1000) {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000 - elapsed));
    }
  }

  private async request<T>(
    path: string,
    bucket: keyof typeof BUCKET_INTERVALS,
    params: Record<string, string | number | undefined> = {},
  ): Promise<T> {
    await this.throttle(bucket);
    const url = `${this.baseUrl}${path}${buildQuery(params)}`;
    let res: Response;
    try {
      res = await this.fetcher(url, { headers: this.headers });
    } catch (cause) {
      throw new ClientError(`could not reach nekos.best: ${String(cause)}`, { cause });
    }
    if (res.status === 404) {
      throw new NotFoundError(`resource not found on nekos.best: ${path}`);
    }
    if (res.status >= 400) {
      throw new APIError(`nekos.best returned HTTP ${res.status} for ${path}`, res.status);
    }
    this.lastRequest[bucket] = performance.now();
    return (await res.json()) as T;
  }

  async getEndpoints(): Promise<Endpoints> {
    return this.request<Endpoints>("/endpoints", "category");
  }

  async getCategories(): Promise<string[]> {
    return Object.keys(await this.getEndpoints());
  }

  async getRandom(category: string | null, amount = 1): Promise<ProviderResult[]> {
    if (!category) throw new Error("category is required");
    const data = await this.request<{ results: unknown[] }>(`/${category}`, "category", {
      amount: clampAmount(amount),
    });
    return data.results.map((item) => parseResult(item));
  }

  async search(params: SearchParams): Promise<SearchOutcome> {
    const query = params.query?.trim() ?? "";
    if (!query) throw new Error("query is required");
    const type = params.type ?? 1;
    const amount = params.amount === "all" ? 20 : clampAmount(params.amount ?? 10);
    const data = await this.request<{ results: unknown[] }>("/search", "search", {
      query,
      type,
      category: params.category,
      amount,
    });
    const items = data.results.map((item) => parseResult(item));
    return { items, count: items.length };
  }

  async getSpecific(params: SpecificParams): Promise<ProviderResult | null> {
    const { category, filename } = params;
    if (!category || !filename) throw new Error("category and filename are required");
    const assetPath = `/${category}/${filename}.${params.format ?? "png"}`;
    let res: Response;
    try {
      res = await this.fetcher(`${this.baseUrl}${assetPath}`, {
        method: "HEAD",
        headers: this.headers,
      });
    } catch (cause) {
      throw new ClientError(`could not reach nekos.best: ${String(cause)}`, { cause });
    }
    if (res.status === 404) return null;
    if (res.status >= 400) {
      throw new APIError(`nekos.best returned HTTP ${res.status} for ${assetPath}`, res.status);
    }
    const meta: Record<string, string> = {};
    for (const key of META_HEADERS) {
      const value = res.headers.get(key);
      if (value) meta[key] = decodeHeaderValue(value);
    }
    return {
      url: `${this.baseUrl}${assetPath}`,
      dimensions: null,
      anime_name: meta.anime_name ?? null,
      artist_name: meta.artist_name ?? null,
      artist_href: meta.artist_href ?? null,
      source_url: meta.source_url ?? null,
    };
  }

  async getAsset(
    category: string,
    filename: string,
    fmt: string,
  ): Promise<{ data: Uint8Array; meta: Record<string, string> }> {
    if (!category || !filename) throw new Error("category and filename are required");
    const path = `/${category}/${filename}.${fmt}`;
    await this.throttle("category");
    const url = `${this.baseUrl}${path}`;
    let res: Response;
    try {
      res = await this.fetcher(url, { headers: this.headers });
    } catch (cause) {
      throw new ClientError(`could not reach nekos.best: ${String(cause)}`, { cause });
    }
    if (res.status === 404) {
      throw new NotFoundError(`resource not found on nekos.best: ${path}`);
    }
    if (res.status >= 400) {
      throw new APIError(`nekos.best returned HTTP ${res.status} for ${path}`, res.status);
    }
    this.lastRequest.category = performance.now();
    const data = new Uint8Array(await res.arrayBuffer());
    const meta: Record<string, string> = {};
    for (const key of META_HEADERS) {
      const value = res.headers.get(key);
      if (value) meta[key] = decodeHeaderValue(value);
    }
    return { data, meta };
  }
}

function parseResult(data: unknown): ProviderResult {
  const item = data as Partial<ProviderResult> & {
    dimensions?: { width?: number; height?: number } | null;
  };
  const dims = item.dimensions;
  return {
    url: String(item.url ?? ""),
    dimensions:
      dims && dims.width != null && dims.height != null
        ? { width: dims.width, height: dims.height }
        : null,
    artist_name: item.artist_name ?? null,
    artist_href: item.artist_href ?? null,
    source_url: item.source_url ?? null,
    anime_name: item.anime_name ?? null,
  };
}
