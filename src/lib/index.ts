import { NekosApiClient } from "./nekosapi.ts";
import { NekosBestClient } from "./nekosBest.ts";
import type { Provider, ProviderId } from "./types.ts";

export const BASE_URLS: Record<ProviderId, string> = {
  "nekos-best": "/api/nekos-best",
  nekosapi: "/api/nekosapi",
};

export function createProvider(id: ProviderId): Provider {
  return id === "nekosapi"
    ? new NekosApiClient({ baseUrl: BASE_URLS.nekosapi })
    : new NekosBestClient({ baseUrl: BASE_URLS["nekos-best"] });
}

export * from "./types.ts";
export { NekosBestClient } from "./nekosBest.ts";
export { NekosApiClient } from "./nekosapi.ts";
export {
  APIError,
  ClientError,
  NekosError,
  NotFoundError,
  buildQuery,
  clampAmount,
  clampLimit,
  decodeHeaderValue,
} from "./util.ts";
