import "./style.css";
import {
  createProvider,
  type Provider,
  type ProviderId,
  type ProviderResult,
  type SearchParams,
} from "./lib";

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function showError(element: HTMLElement, message: string): void {
  element.innerHTML = `<p class="error">Error: ${escapeHtml(message)}</p>`;
}

type LoadingKind = "surprise" | "search" | "asset";

function loading(element: HTMLElement, kind: LoadingKind): void {
  if (kind === "search") {
    const cards = Array.from(
      { length: 8 },
      () => `
        <div class="card">
          <div class="skeleton skeleton-img"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>`
    ).join("");
    element.innerHTML = `<div class="grid">${cards}</div>`;
    return;
  }
  element.innerHTML = `
    <div class="skeleton skeleton-block"></div>
    <div class="skeleton skeleton-line"></div>
    <div class="skeleton skeleton-line short"></div>
  `;
}

function loadingSpinner(element: HTMLElement, message: string): void {
  element.innerHTML = `<div class="loading"><span class="spinner"></span>${escapeHtml(message)}</div>`;
}

function fadeIn(element: HTMLElement): void {
  element.classList.remove("fade-in");
  void element.offsetWidth;
  element.classList.add("fade-in");
}

function renderMeta(result: ProviderResult): string {
  const parts: string[] = [];
  if (result.dimensions) {
    parts.push(`${result.dimensions.width} &times; ${result.dimensions.height}px`);
  }
  if (result.id) {
    parts.push(`ID: ${escapeHtml(String(result.id))}`);
  }
  if (result.rating) {
    parts.push(`rating: ${escapeHtml(result.rating)}`);
  }
  if (result.anime_name) {
    parts.push(`anime: ${escapeHtml(result.anime_name)}`);
  }
  if (result.artist_name) {
    parts.push(`artist: ${escapeHtml(result.artist_name)}`);
  }
  if (result.tags && result.tags.length > 0) {
    parts.push(
      result.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")
    );
  }
  if (result.artist_href) {
    parts.push(
      `<a href="${escapeHtml(result.artist_href)}" target="_blank" rel="noreferrer">artist page</a>`
    );
  }
  if (result.source_url) {
    parts.push(
      `<a href="${escapeHtml(result.source_url)}" target="_blank" rel="noreferrer">source</a>`
    );
  }
  return `<div class="meta">${parts.join(" &middot; ")}</div>`;
}

function renderResult(result: ProviderResult, block = false): string {
  void block;
  return `
    <img src="${result.url}" alt="Nekos API result" loading="lazy" />
    ${renderMeta(result)}
  `;
}

function fillSelect(select: HTMLSelectElement, categories: string[]): void {
  const first = select.options[0];
  select.length = 0;
  if (first) {
    select.add(first);
  }
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.add(option);
  });
}

const providerSelect = document.getElementById("provider") as HTMLSelectElement;
const providerLogo = document.getElementById("provider-logo") as HTMLImageElement;

const PROVIDER_LOGOS: Record<ProviderId, string> = {
  "nekos-best": "/assets/neko.best.png",
  nekosapi: "/assets/nekosapi.png",
};
const searchCategory = document.querySelector<HTMLSelectElement>(
  '#search-form select[name="category"]'
)!;
const assetCategory = document.querySelector<HTMLSelectElement>(
  '#asset-form select[name="category"]'
)!;

const surpriseResult = document.getElementById("surprise-result")!;
const searchResult = document.getElementById("search-result")!;
const assetResult = document.getElementById("asset-result")!;

const bestSearch = document.getElementById("best-search-fields")!;
const apiSearch = document.getElementById("nekosapi-search-fields")!;
const bestAsset = document.getElementById("best-asset-fields")!;
const apiAsset = document.getElementById("nekosapi-asset-fields")!;

let providerId = providerSelect.value as ProviderId;
let provider: Provider = createProvider(providerId);
let endpoints: Record<string, string> = {};

function filteredCategories(format?: string): string[] {
  const names = Object.keys(endpoints);
  if (!format) return names;
  return names.filter((n) => endpoints[n] === format);
}

function setGroupActive(group: HTMLElement, active: boolean): void {
  group.hidden = !active;
  group
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")
    .forEach((el) => {
      el.disabled = !active;
    });
}

function applyProvider(): void {
  const isBest = providerId === "nekos-best";
  providerLogo.src = PROVIDER_LOGOS[providerId];
  providerLogo.alt = provider.label;
  setGroupActive(bestSearch, isBest);
  setGroupActive(apiSearch, !isBest);
  setGroupActive(bestAsset, isBest);
  setGroupActive(apiAsset, !isBest);
  surpriseResult.innerHTML = "";
  searchResult.innerHTML = "";
  assetResult.innerHTML = "";
  if (isBest) {
    endpoints = {};
    fillSelect(searchCategory, ["loading…"]);
    fillSelect(assetCategory, ["loading…"]);
    provider
      .getEndpoints()
      .then((ep) => {
        endpoints = ep;
        updateCategorySelects();
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        showError(searchCategory.parentElement ?? searchCategory, message);
      });
  } else {
    endpoints = {};
  }
}

function updateCategorySelects(): void {
  const typeSelect = document.querySelector<HTMLSelectElement>(
    '#search-form select[name="type"]'
  );
  const format = typeSelect?.value === "2" ? "gif" : "png";
  const searchCats = filteredCategories(format);
  fillSelect(searchCategory, searchCats.length > 0 ? searchCats : ["(none)"]);
  const allCats = filteredCategories();
  fillSelect(assetCategory, allCats.length > 0 ? allCats : ["(none)"]);
}

providerSelect.addEventListener("change", () => {
  providerId = providerSelect.value as ProviderId;
  provider = createProvider(providerId);
  applyProvider();
});

const searchTypeSelect = document.querySelector<HTMLSelectElement>(
  '#search-form select[name="type"]'
)!;
searchTypeSelect.addEventListener("change", () => {
  if (providerId === "nekos-best") {
    updateCategorySelects();
  }
});

document.getElementById("surprise-btn")!.addEventListener("click", async () => {
  loading(surpriseResult, "surprise");
  const isBest = providerId === "nekos-best";
  if (isBest && Object.keys(endpoints).length === 0) {
    showError(surpriseResult, "Categories not loaded yet, try again.");
    return;
  }
  const category = isBest
    ? filteredCategories()[Math.floor(Math.random() * filteredCategories().length)]
    : null;
  try {
    const [result] = await provider.getRandom(category, 1);
    if (!result) {
      surpriseResult.innerHTML = "<p>No result found.</p>";
      return;
    }
    const source = isBest
      ? `provider: ${escapeHtml(provider.label)} &middot; category: ${escapeHtml(category!)}`
      : `provider: ${escapeHtml(provider.label)}`;
    surpriseResult.innerHTML = `<p class="meta">${source}</p>` + renderResult(result, true);
    fadeIn(surpriseResult);
  } catch (err) {
    showError(surpriseResult, err instanceof Error ? err.message : String(err));
  }
});

document.getElementById("search-form")!.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  const params: SearchParams = {};
  if (providerId === "nekos-best") {
    params.query = String(data.get("query") ?? "").trim();
    params.type = Number(data.get("type")) as SearchParams["type"];
    params.category = String(data.get("category") ?? "") || undefined;
    const raw = String(data.get("amount") ?? "10");
    params.amount = raw === "all" ? "all" : Number(raw);
  } else {
    params.tags = String(data.get("tags") ?? "").trim() || undefined;
    params.rating = String(data.get("rating") ?? "safe");
    const raw = String(data.get("limit") ?? "10");
    params.limit = raw === "all" ? "all" : Number(raw);
  }

  loading(searchResult, "search");
  try {
    const { items, count } = await provider.search(params);
    if (items.length === 0) {
      searchResult.innerHTML = `<p>No results (total ${count}).</p>`;
      return;
    }
    searchResult.innerHTML = `
      <p class="meta">${count} results (showing ${items.length})</p>
      <div class="grid">
        ${items.map((r) => `<div class="card">${renderResult(r)}</div>`).join("")}
      </div>
    `;
    fadeIn(searchResult);
  } catch (err) {
    showError(searchResult, err instanceof Error ? err.message : String(err));
  }
});

document.getElementById("asset-form")!.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);

  loading(assetResult, "asset");
  try {
    const result =
      providerId === "nekos-best"
        ? await provider.getSpecific({
            category: String(data.get("category") ?? ""),
            filename: String(data.get("filename") ?? "").trim(),
            format: String(data.get("format") ?? "png"),
          })
        : await provider.getSpecific({
            id: String(data.get("id") ?? "").trim(),
          });
    if (!result) {
      assetResult.innerHTML = "<p>Not found.</p>";
      return;
    }
    assetResult.innerHTML = renderResult(result, true);
    fadeIn(assetResult);
  } catch (err) {
    showError(assetResult, err instanceof Error ? err.message : String(err));
  }
});

const assetForm = document.getElementById("asset-form") as HTMLFormElement;
const assetFilename = assetForm.querySelector<HTMLInputElement>('input[name="filename"]')!;
const assetFormat = assetForm.querySelector<HTMLSelectElement>('select[name="format"]')!;
document.getElementById("random-filename-btn")!.addEventListener("click", async () => {
  const category = String(new FormData(assetForm).get("category") ?? "");
  if (!category) {
    showError(assetResult, "Pick a category first.");
    return;
  }
  loadingSpinner(assetResult, "Fetching a random filename…");
  try {
    const [result] = await provider.getRandom(category, 1);
    if (!result) {
      assetResult.innerHTML = "<p>No result found.</p>";
      return;
    }
    const last = result.url.split("/").filter(Boolean).pop() ?? "";
    assetFilename.value = last.replace(/\.(png|gif)$/i, "");
    assetFormat.value = last.endsWith(".gif") ? "gif" : "png";
    assetResult.innerHTML =
      `<p class="meta">Filled filename from <code>${escapeHtml(result.url)}</code> &mdash; click Fetch.</p>`;
    fadeIn(assetResult);
  } catch (err) {
    showError(assetResult, err instanceof Error ? err.message : String(err));
  }
});

applyProvider();
