import { COMPANY_LOOKUP_CODE_VALUE } from '../config/erpConfig';
import { erpBaseBody, erpRequest } from './erpClient';

export interface ErpCompanyInfo {
  companyCode: string;
  companyName: string;
}

export interface ErpBranch {
  branchKey: string;
  branchCode: string;
  branchName: string;
}

export interface ErpWarehouse {
  warehouseKey: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseGroupKey: string;
  warehouseGroupName: string;
}

interface ReadNextKeyRow {
  CMPNY_TCOMPANYNAME?: string;
  CMPNY_CODE?: string;
}

interface ReadNextKeyResponse {
  READNEXTKEY?: ReadNextKeyRow | ReadNextKeyRow[];
}

interface Dept0400Row {
  BR_KEY?: string;
  BR_CODE?: string;
  BR_THAIDESC?: string;
  BR_ENGDESC?: string;
}

interface Dept0400Response {
  Dept0400?: Dept0400Row | Dept0400Row[];
}

interface Wh000220Row {
  WL_KEY?: string;
  WL_CODE?: string;
  WL_NAME?: string;
  WL_WH?: string;
  WH_NAME?: string;
}

interface Wh000220Response {
  Wh000220?: Wh000220Row | Wh000220Row[];
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function fetchErpCompany(
  loginGuid: string,
): Promise<ErpCompanyInfo | null> {
  const param = JSON.stringify({
    CODE_NAME: 'CMPNY_TCOMPANYNAME',
    CODE_VALUE: COMPANY_LOOKUP_CODE_VALUE,
    TABLE_NAME: 'COMPANYINFO',
    KEY_NAME: 'CMPNY_CODE',
  });
  const body = erpBaseBody(loginGuid, 'READNEXTKEY', param);
  const data = await erpRequest<ReadNextKeyResponse>('ReadERP', body);
  const row = asArray(data.READNEXTKEY)[0];
  if (!row) return null;

  const companyCode = row.CMPNY_CODE?.trim() ?? '';
  const companyName = row.CMPNY_TCOMPANYNAME?.trim() ?? '';
  if (!companyName) return null;

  return { companyCode, companyName };
}

export async function fetchErpBranches(
  loginGuid: string,
): Promise<ErpBranch[]> {
  const body = erpBaseBody(loginGuid, 'Dept0400', '');
  const data = await erpRequest<Dept0400Response>('LookupErp', body);

  return asArray(data.Dept0400)
    .map((row) => ({
      branchKey: row.BR_KEY?.trim() ?? '',
      branchCode: row.BR_CODE?.trim() ?? '',
      branchName:
        row.BR_THAIDESC?.trim() ||
        row.BR_ENGDESC?.trim() ||
        row.BR_CODE?.trim() ||
        row.BR_KEY?.trim() ||
        '',
    }))
    .filter((row) => row.branchKey && row.branchName);
}

export async function fetchErpWarehouses(
  loginGuid: string,
): Promise<ErpWarehouse[]> {
  const body = erpBaseBody(loginGuid, 'Wh000220', '');
  const data = await erpRequest<Wh000220Response>('LookupErp', body);

  return asArray(data.Wh000220)
    .map((row) => ({
      warehouseKey: row.WL_KEY?.trim() ?? '',
      warehouseCode: row.WL_CODE?.trim() ?? '',
      warehouseName: row.WL_NAME?.trim() || row.WL_CODE?.trim() || row.WL_KEY?.trim() || '',
      warehouseGroupKey: row.WL_WH?.trim() ?? '',
      warehouseGroupName: row.WH_NAME?.trim() ?? '',
    }))
    .filter((row) => row.warehouseKey && row.warehouseName);
}
