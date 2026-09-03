import { erpBaseBody, erpRequest, ErpError } from './erpClient';

interface LoginResponseData {
  BPAPUS_KEY?: string;
  BPAPUS_GUID?: string;
  BPAPUS_USER?: string;
}

export interface ErpLoginResult {
  loginGuid: string;
  userKey: string;
  username: string;
}

export async function erpLogin(
  username: string,
  password: string,
): Promise<ErpLoginResult> {
  const param = JSON.stringify({
    'BPAPUS-MACHINE': 'dell',
    'BPAPUS-USERID': username.trim(),
    'BPAPUS-PASSWORD': password,
  });

  const data = await erpRequest<LoginResponseData>(
    'DevUsers',
    erpBaseBody('', 'Login', param),
  );

  const loginGuid = data.BPAPUS_GUID?.trim();
  if (!loginGuid) {
    throw new ErpError('เข้าสู่ระบบไม่สำเร็จ — ไม่พบ BPAPUS_GUID จาก ERP');
  }

  return {
    loginGuid,
    userKey: data.BPAPUS_KEY?.trim() ?? '',
    username: username.trim(),
  };
}
