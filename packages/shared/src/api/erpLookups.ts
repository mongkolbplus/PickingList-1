import { erpBaseBody, erpRequest } from './erpClient';
import { packingListDtPropertiesSqlList } from '../config/erpConfig';
import { fetchErpWarehouses, type ErpWarehouse } from './erpOrg';

/** ประเภทเอกสารจาก Dc000110 */
export interface ErpDocType {
  dtKey: string;
  dtDocCode: string;
  dtThaiDesc: string;
  label: string;
}

export interface ErpCustomer {
  arKey: string;
  arCode: string;
  arName: string;
  label: string;
}

interface Dc000110Row {
  DT_KEY?: string;
  DT_DOCCODE?: string;
  DT_THAIDESC?: string;
}

interface Dc000110Response {
  Dc000110?: Dc000110Row | Dc000110Row[];
}

interface Ar000130Row {
  AR_KEY?: string;
  AR_CODE?: string;
  AR_NAME?: string;
}

interface Ar000130Response {
  Ar000130?: Ar000130Row | Ar000130Row[];
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

const DOCTYPE_PROPERTIES_FILTER = `AND DT_PROPERTIES in (${packingListDtPropertiesSqlList()}) `;

function pickLookupRows<T>(
  data: Record<string, unknown>,
  functionName: string,
): T[] {
  const direct = data[functionName];
  if (direct !== undefined) return asArray(direct as T | T[]);

  const match = Object.entries(data).find(
    ([key]) => key.toLowerCase() === functionName.toLowerCase(),
  );
  if (match) return asArray(match[1] as T | T[]);
  return [];
}

/** ประเภทเอกสาร — LookupErp / Dc000110 */
export async function fetchErpDocTypes(
  loginGuid: string,
): Promise<ErpDocType[]> {
  const body = erpBaseBody(loginGuid, 'Dc000110', '');
  body['BPAPUS-FILTER'] = DOCTYPE_PROPERTIES_FILTER;
  const data = await erpRequest<Dc000110Response & Record<string, unknown>>(
    'LookupErp',
    body,
  );

  return pickLookupRows<Dc000110Row>(data, 'Dc000110')
    .map((row) => {
      const dtKey = String(row.DT_KEY ?? '').trim();
      const dtDocCode = String(row.DT_DOCCODE ?? '').trim();
      const dtThaiDesc = String(row.DT_THAIDESC ?? '').trim();
      const label = [dtDocCode, dtThaiDesc].filter(Boolean).join(' ');
      return { dtKey, dtDocCode, dtThaiDesc, label };
    })
    .filter((row) => row.dtKey && row.label)
    .sort((a, b) => a.label.localeCompare(b.label, 'th'));
}

/** @deprecated ใช้ fetchErpDocTypes */
export const fetchErpDocCategories = fetchErpDocTypes;
export type ErpDocCategory = ErpDocType;

/** ลูกค้า — LookupErp / Ar000130 */
export async function fetchErpCustomers(
  loginGuid: string,
): Promise<ErpCustomer[]> {
  const body = erpBaseBody(loginGuid, 'Ar000130', '');
  const data = await erpRequest<Ar000130Response & Record<string, unknown>>(
    'LookupErp',
    body,
  );

  return pickLookupRows<Ar000130Row>(data, 'Ar000130')
    .map((row) => {
      const arKey = String(row.AR_KEY ?? '').trim();
      const arCode = String(row.AR_CODE ?? '').trim();
      const arName = String(row.AR_NAME ?? '').trim();
      const label = [arCode, arName].filter(Boolean).join(' ') || arName || arCode;
      return { arKey, arCode, arName, label };
    })
    .filter((row) => row.arKey && row.label)
    .sort((a, b) => a.label.localeCompare(b.label, 'th'));
}

export type { ErpWarehouse };
export { fetchErpWarehouses };
