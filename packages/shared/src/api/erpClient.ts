import { BPAPUS_BPAPSV, getErpApiBaseUrl } from '../config/erpConfig';
import { th } from '../text/th';

export class ErpError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status = 0, body?: unknown) {
    super(message);
    this.name = 'ErpError';
    this.status = status;
    this.body = body;
  }
}

export interface ErpEnvelope {
  ResponseCode: string;
  ReasonString: string;
  ResponseData: string;
}

export interface ErpRequestBody {
  'BPAPUS-BPAPSV': string;
  'BPAPUS-LOGIN-GUID': string;
  'BPAPUS-FUNCTION': string;
  'BPAPUS-PARAM': string;
  'BPAPUS-FILTER'?: string;
  'BPAPUS-ORDERBY'?: string;
  'BPAPUS-OFFSET'?: string;
  'BPAPUS-FETCH'?: string;
}

function endpointPath(name: string) {
  const base = getErpApiBaseUrl().replace(/\/$/, '');
  return `${base}/${name}`;
}

function describeFetchFailure(error: unknown): string {
  const detail =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : null;
  if (!detail) return th.erpErrors.fallback;
  if (
    /hostname.*not verified/i.test(detail) ||
    /SSLPeerUnverifiedException/i.test(detail) ||
    /certificate.*hostname/i.test(detail)
  ) {
    return th.erpErrors.sslHostname;
  }
  return th.erpErrors.generic(detail);
}

function parseResponseData<T>(envelope: ErpEnvelope): T {
  if (envelope.ResponseCode !== '200') {
    throw new ErpError(
      envelope.ReasonString?.trim() ||
        th.erpErrors.responseCode(envelope.ResponseCode),
      Number(envelope.ResponseCode) || 0,
      envelope,
    );
  }

  if (!envelope.ResponseData?.trim()) {
    throw new ErpError(th.erpErrors.emptyResponse, 0, envelope);
  }

  try {
    return JSON.parse(envelope.ResponseData) as T;
  } catch {
    throw new ErpError('ไม่สามารถอ่านข้อมูลจาก ERP ได้', 0, envelope);
  }
}

export async function erpTestConnection(): Promise<void> {
  const url = endpointPath('DevUsers');
  const probeBody = erpBaseBody(
    '',
    'Login',
    JSON.stringify({
      'BPAPUS-MACHINE': 'mobile',
      'BPAPUS-USERID': '__connection_test__',
      'BPAPUS-PASSWORD': '',
    }),
  );

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(probeBody),
    });

    const text = await response.text();
    if (!text.trim()) {
      if (response.ok || response.status === 405) return;
      throw new ErpError(`ERP ตอบกลับ HTTP ${response.status}`, response.status);
    }

    try {
      const envelope = JSON.parse(text) as Partial<ErpEnvelope>;
      if (
        typeof envelope.ResponseCode === 'string' ||
        typeof envelope.ReasonString === 'string'
      ) {
        return;
      }
    } catch {
      if (response.ok) return;
    }

    throw new ErpError(
      text.slice(0, 200) || `ERP ตอบกลับ HTTP ${response.status}`,
      response.status,
    );
  } catch (error) {
    if (error instanceof ErpError) throw error;
    throw new ErpError(describeFetchFailure(error), 0);
  }
}

export async function erpRequest<T>(
  endpoint: 'DevUsers' | 'LookupErp' | 'UpdateErp' | 'ReadERP',
  body: ErpRequestBody,
): Promise<T> {
  const url = endpointPath(endpoint);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new ErpError(describeFetchFailure(error), 0);
  }

  const text = await response.text();
  let envelope: ErpEnvelope;
  try {
    envelope = JSON.parse(text) as ErpEnvelope;
  } catch {
    throw new ErpError(
      response.ok ? 'ERP ตอบกลับรูปแบบไม่ถูกต้อง' : text || response.statusText,
      response.status,
    );
  }

  return parseResponseData<T>(envelope);
}

export function erpBaseBody(
  loginGuid: string,
  fn: string,
  param = '',
): ErpRequestBody {
  return {
    'BPAPUS-BPAPSV': BPAPUS_BPAPSV,
    'BPAPUS-LOGIN-GUID': loginGuid,
    'BPAPUS-FUNCTION': fn,
    'BPAPUS-PARAM': param,
    'BPAPUS-FILTER': '',
    'BPAPUS-ORDERBY': '',
    'BPAPUS-OFFSET': '0',
    'BPAPUS-FETCH': '0',
  };
}
