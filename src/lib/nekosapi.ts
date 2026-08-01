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
  clampLimit,
} from "./util.ts";

type NekosApiItem = {
  id: number;
  url: string;
  rating?: string;
  tags?: string[];
  artist_name?: string | null;
  source_url?: string | null;
};

export type NekosApiOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
  headers?: Record<string, string>;
  rateLimit?: number;
};

export class NekosApiClient implements Provider {
  readonly id = "nekosapi" as const;
  readonly label = "nekosapi";

  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly headers: Record<string, string>;
  private readonly rateLimit: number;
  private lastRequest = 0;

  constructor(options: NekosApiOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://api.nekosapi.com/v4").replace(/\/+$/, "");
    this.fetcher = options.fetcher ?? ((...args) => globalThis.fetch(...args));
    this.headers = { ...options.headers };
    this.rateLimit = options.rateLimit ?? 0.5;
  }

  private async throttle(): Promise<void> {
    const elapsed = performance.now() - this.lastRequest;
    if (elapsed < this.rateLimit * 1000) {
      await new Promise((resolve) => setTimeout(resolve, this.rateLimit * 1000 - elapsed));
    }
  }

  private async request<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<T> {
    await this.throttle();
    const url = `${this.baseUrl}${path}${buildQuery(params)}`;
    let res: Response;
    try {
      res = await this.fetcher(url, { headers: this.headers });
    } catch (cause) {
      throw new ClientError(`could not reach nekosapi: ${String(cause)}`, { cause });
    }
    if (res.status === 404) {
      throw new NotFoundError(`resource not found on nekosapi: ${path}`);
    }
    if (res.status >= 400) {
      throw new APIError(`nekosapi returned HTTP ${res.status} for ${path}`, res.status);
    }
    this.lastRequest = performance.now();
    return (await res.json()) as T;
  }

  async getEndpoints(): Promise<Record<string, string>> {
    return {};
  }

  async getCategories(): Promise<string[]> {
    return [];
  }

  async getRandom(_category: string | null, amount = 1): Promise<ProviderResult[]> {
    const data = await this.request<NekosApiItem[]>("/images/random", {
      limit: clampAmount(amount),
      rating: "safe",
    });
    return data.map(parseItem);
  }

  async search(params: SearchParams): Promise<SearchOutcome> {
    if (params.limit === "all") {
      const PAGE_SIZE = 100;
      let offset = 0;
      let allItems: ProviderResult[] = [];
      let totalCount = 0;
      // First request to get total count
      const first = await this.request<{ items: NekosApiItem[]; count: number }>("/images", {
        tags: params.tags,
        rating: params.rating ?? "safe",
        limit: PAGE_SIZE,
        offset: 0,
      });
      allItems = first.items.map(parseItem);
      totalCount = first.count;
      offset = PAGE_SIZE;
      while (offset < totalCount) {
        const page = await this.request<{ items: NekosApiItem[]; count: number }>("/images", {
          tags: params.tags,
          rating: params.rating ?? "safe",
          limit: PAGE_SIZE,
          offset,
        });
        allItems = allItems.concat(page.items.map(parseItem));
        if (page.items.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      return { items: allItems, count: totalCount };
    }
    const data = await this.request<{ items: NekosApiItem[]; count: number }>("/images", {
      tags: params.tags,
      rating: params.rating ?? "safe",
      limit: clampLimit(params.limit ?? 10),
    });
    return { items: data.items.map(parseItem), count: data.count };
  }

  async getSpecific(params: SpecificParams): Promise<ProviderResult | null> {
    if (params.id == null || params.id === "") throw new Error("image id is required");
    try {
      const item = await this.request<NekosApiItem>(`/images/${params.id}`);
      return parseItem(item);
    } catch (err) {
      if (err instanceof NotFoundError) return null;
      throw err;
    }
  }
}

function parseItem(item: NekosApiItem): ProviderResult {
  return {
    url: item.url,
    dimensions: null,
    id: String(item.id),
    rating: item.rating ?? null,
    tags: item.tags ?? [],
    artist_name: item.artist_name ?? null,
    artist_href: null,
    source_url: item.source_url ?? null,
    anime_name: null,
  };
}
