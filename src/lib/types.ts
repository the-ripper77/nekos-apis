export type Dimensions = { width: number; height: number };

export type ProviderResult = {
  url: string;
  dimensions: Dimensions | null;
  id?: string | null;
  rating?: string | null;
  tags?: string[];
  artist_name?: string | null;
  artist_href?: string | null;
  source_url?: string | null;
  anime_name?: string | null;
};

export type SearchType = 1 | 2;

export type SearchParams = {
  query?: string;
  type?: SearchType;
  category?: string;
  amount?: number | "all";
  tags?: string;
  rating?: string;
  limit?: number | "all";
};

export type SearchOutcome = { items: ProviderResult[]; count: number };

export type SpecificParams = {
  category?: string;
  filename?: string;
  format?: string;
  id?: string;
};

export type ProviderId = "nekos-best" | "nekosapi";

export interface Provider {
  readonly id: ProviderId;
  readonly label: string;
  getEndpoints(): Promise<Record<string, string>>;
  getCategories(): Promise<string[]>;
  getRandom(category: string | null, amount: number): Promise<ProviderResult[]>;
  search(params: SearchParams): Promise<SearchOutcome>;
  getSpecific(params: SpecificParams): Promise<ProviderResult | null>;
}
