import type { ScanSession, ShippingAddress } from '../api/client';

function joinParts(parts: Array<string | undefined | null>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' ');
}

function pushLine(lines: string[], value?: string | null) {
  const trimmed = value?.trim();
  if (trimmed) lines.push(trimmed);
}

/** แสดงที่อยู่ตามฟิลด์ ADDRBOOK จาก TRH_SHIP_ADDB */
export function formatShippingAddress(address: ShippingAddress): string[] {
  const lines: string[] = [];

  const company = address.company?.trim();
  const branch = address.branch?.trim();
  if (company) {
    lines.push(branch ? `${company}(${branch})` : company);
  } else {
    pushLine(lines, branch);
  }

  pushLine(lines, address.line1);
  pushLine(lines, address.line2);
  pushLine(lines, address.line3);

  const area = joinParts([address.subDistrict, address.district]);
  pushLine(lines, area);

  const provincePost = joinParts([address.province, address.postCode]);
  pushLine(lines, provincePost);

  pushLine(lines, address.country);
  pushLine(lines, address.countryCode);

  if (address.email?.trim()) {
    lines.push(`eMail ${address.email.trim()}`);
  }
  if (address.etaxEmail?.trim()) {
    lines.push(`eMail ${address.etaxEmail.trim()}`);
  }

  pushLine(lines, address.phone ? `โทร ${address.phone.trim()}` : null);
  pushLine(lines, address.fax ? `Fax ${address.fax.trim()}` : null);

  return lines;
}

/** บรรทัดกลางใบปะกล่อง — ADDB_ADDB_1..3 */
export function formatShippingAddressBodyLines(address: ShippingAddress): string[] {
  const lines: string[] = [];
  pushLine(lines, address.line1);
  pushLine(lines, address.line2);
  pushLine(lines, address.line3);
  return lines;
}

export function formatShippingCompanyLine(address: ShippingAddress): string {
  const company = address.company?.trim() ?? '';
  const branch = address.branch?.trim() ?? '';
  if (!company) return branch;
  return branch ? `${company}(${branch})` : company;
}

export function docRefForAddress(
  address: ShippingAddress,
  documents: Array<{ diKey: number; diRef: string }>,
) {
  return documents.find((doc) => doc.diKey === address.diKey)?.diRef ?? '';
}

export function resolveDisplayShippingAddress(
  session: ScanSession,
): ShippingAddress | null {
  const addresses = session.shippingAddresses ?? [];
  if (!addresses.length) return null;

  if (session.documents.length === 1) {
    const diKey = session.documents[0].diKey;
    return addresses.find((address) => address.diKey === diKey) ?? addresses[0];
  }

  if (session.activeDiKey != null) {
    return (
      addresses.find((address) => address.diKey === session.activeDiKey) ?? null
    );
  }

  // โหมดจัดทีละลูกค้า: ใช้ที่อยู่ของเอกสารแรกของลูกค้าที่กำลังจัด
  if (session.activePartyCode) {
    const partyDoc = session.documents.find(
      (doc) => (doc.partyCode ?? '') === session.activePartyCode,
    );
    if (partyDoc) {
      return (
        addresses.find((address) => address.diKey === partyDoc.diKey) ?? null
      );
    }
  }

  return null;
}

export function hasShippingAddressContent(address: ShippingAddress) {
  return formatShippingAddress(address).length > 0;
}
