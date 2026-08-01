export class NekosError extends Error {}
export class NotFoundError extends NekosError {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
export class APIError extends NekosError {
  readonly code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "APIError";
    this.code = code;
  }
}
export class ClientError extends NekosError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ClientError";
  }
}

export function decodeHeaderValue(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, " "));
}

export function buildQuery(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function clampAmount(amount: number): number {
  return Math.min(Math.max(Math.trunc(amount), 1), 20);
}

export function clampLimit(amount: number): number {
  return Math.min(Math.max(Math.trunc(amount), 1), 100);
}
