import { erpBaseBody, erpRequest } from './erpClient';
import type { PackingClosePayload } from '../utils/buildPackingClosePayload';

export interface SavePackingCloseResult {
  raw: unknown;
  message?: string;
}

function pickMessage(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  for (const key of ['ReasonString', 'message', 'Message']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

/** Post packing scan confirmation to ERP (box assignment / close job). */
export async function savePackingScaninfo(
  loginGuid: string,
  payload: PackingClosePayload,
): Promise<SavePackingCloseResult> {
  const param = JSON.stringify(payload);
  const body = erpBaseBody(loginGuid, 'SavePackingScaninfo', param);
  console.log('[ConfirmClose] savePackingScaninfo:send', JSON.stringify({
    endpoint: 'UpdateErp',
    function: 'SavePackingScaninfo',
    loginGuid,
    detailLineCount: payload.ErpUpdFunc[0]?.ImpPackingDetail.length ?? 0,
    body,
  }));
  const raw = await erpRequest<unknown>('UpdateErp', body);
  console.log('[ConfirmClose] savePackingScaninfo:response', JSON.stringify(raw));
  return { raw, message: pickMessage(raw) };
}
