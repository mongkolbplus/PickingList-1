const DEFAULT_ERP_API_BASE_URL =
  'http://url-to-erp-api/BplusErpDvSvrIIS31.dll';

export const BPAPUS_BPAPSV = '{167f0c96-86fd-488f-94d1-cc3169d60b1a}';

export const PACKING_LIST_DT_PROPERTIES = [
  201, 202, 203, 205, 206, 207, 209, 211, 212, 213,
  301, 302, 303, 304, 305, 307, 308, 309, 310, 311,
  313, 315, 333, 336, 337, 338, 339, 341,
] as const;

export function packingListDtPropertiesSqlList() {
  return PACKING_LIST_DT_PROPERTIES.join(',');
}

export const COMPANY_LOOKUP_CODE_VALUE = '1030200015008';

let runtimeBaseUrl: string | null = null;
let defaultBaseUrl = DEFAULT_ERP_API_BASE_URL;
let erpHttpMode = true;

function normalizeBaseUrl(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/$/, '');
}

function applyHttpMode(url: string): string {
  if (!erpHttpMode) return url;
  return url.replace(/^https:\/\//i, 'http://');
}

export function getErpHttpMode(): boolean {
  return erpHttpMode;
}

export function setErpHttpMode(enabled: boolean) {
  erpHttpMode = enabled;
}

export function resolveErpConnectionUrl(url: string, httpMode = erpHttpMode): string {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) return url;
  if (!httpMode) return normalized;
  return normalized.replace(/^https:\/\//i, 'http://');
}

export function getErpApiBaseUrl(): string {
  return applyHttpMode(runtimeBaseUrl ?? defaultBaseUrl);
}

export function setErpApiBaseUrl(url: string) {
  runtimeBaseUrl = normalizeBaseUrl(url);
}

export function getDefaultErpApiBaseUrl(): string {
  return defaultBaseUrl;
}

export function configureDefaultErpApiBaseUrl(url: string) {
  const normalized = normalizeBaseUrl(url);
  if (normalized) defaultBaseUrl = normalized;
}

export function normalizeErpApiBaseUrl(url: string): string {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) {
    throw new Error('กรุณากรอกที่อยู่ API');
  }
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error('ที่อยู่ API ต้องขึ้นต้นด้วย http:// หรือ https://');
  }
  return normalized;
}
