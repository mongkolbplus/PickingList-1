/** Types à¸ªà¸³à¸«à¸£à¸±à¸ÿ session à¸ªà¹ÿà¸ÿà¸ÿ â€” web à¹€à¸£à¸µà¸¢à¸ÿ ERP à¹ÿà¸”à¸¢à¸•à¸£à¸ÿ à¸ÿà¹ÿà¸²à¸ÿ erpApiBaseUrl */

import type { ScanHistoryEntry, WorkflowStatus } from '../types/packing';

export interface ScanSessionItem {
  itemId: string;
  sourceDiKey: number;
  sourceTrdKey: number;
  goodsCode: string;
  skuCode: string;
  skuName: string;
  unitName: string;
  unitQty: number;
  unitWeight: number;
  documentQty: number;
  freeQty: number;
  remainingQty: number;
  scanQty: number;
  boxNo: number;
  seq: number;
  lotNo?: string | null;
  serialNo?: string | null;
  requiresSerial?: boolean;
  requiresLot?: boolean;
  mfgDate?: string | null;
  expDate?: string | null;
}

export interface ShippingAddress {
  diKey: number;
  trhKey: number;
  addbKey: number | null;
  company: string;
  branch: string;
  brNo: string;
  taxId: string;
  regNo: string;
  passport: string;
  visa: string;
  line1: string;
  line2: string;
  line3: string;
  subDistrict: string;
  district: string;
  province: string;
  postCode: string;
  country: string;
  countryCode: string;
  email: string;
  etaxEmail: string;
  phone: string;
  fax: string;
  /** à¸§à¸´à¸ÿà¸µà¸ÿà¸±à¸”à¸ªà¹ÿà¸ÿà¸ÿà¸²à¸ÿ TRANSTKH */
  shipMethod?: string;
}

export interface ScanBox {
  boxNo: number;
  itemCount: number;
  totalQty?: number;
  totalWeight?: number;
  closedAt: string | null;
  /** à¹€à¸­à¸ÿà¸ªà¸²à¸£à¸—à¸µà¹ÿà¸¡à¸µà¸ªà¸´à¸ÿà¸ÿà¹ÿà¸²à¹ÿà¸ÿà¸ÿà¸¥à¹ÿà¸­à¸ÿà¸ÿà¸µà¹ÿ (à¹€à¸£à¸µà¸¢à¸ÿà¸•à¸²à¸¡à¹€à¸¥à¸ÿà¸—à¸µà¹ÿ) â€” à¹ÿà¸ÿà¹ÿà¸ÿà¸´à¸¡à¸ÿà¹ÿà¹ÿà¸ÿà¸ÿà¸°à¸«à¸ÿà¹ÿà¸² */
  documentKeys?: number[];
  documentRefs?: string[];
}

export interface ScanSession {
  sessionId: string;
  module: 'PackingList';
  status: 'open' | 'confirmed' | 'cancelled' | 'paused';
  workflowStatus?: WorkflowStatus;
  currentBoxNo: number;
  partyCode?: string;
  documents: Array<{
    diKey: number;
    diDate: string;
    diRef: string;
    partyCode?: string;
    partyName?: string;
  }>;
  shippingAddresses: ShippingAddress[];
  items: ScanSessionItem[];
  boxes: ScanBox[];
  activePartyCode?: string | null;
  activeDiKey?: number | null;
  confirmedDiKeys?: number[];
  lastConfirmedDiKey?: number | null;
  scanHistory?: ScanHistoryEntry[];
  serialStock?: Record<string, string[]>;
  lotStock?: Array<{
    lotNo: string;
    goodsCode: string;
    qtyOnHand: number;
    mfgDate?: string;
    expDate?: string;
  }>;
  startedAt?: string;
  packerName?: string;
  checkerName?: string;
  notes?: string;
}

export interface PackingReportResult {
  sessionId: string;
  module: string;
  document: ScanSession['documents'][number] | null;
  shippingAddress: ShippingAddress | null;
  boxes: ScanBox[];
  items: ScanSessionItem[];
  totalBoxes: number;
}

export interface PrintLabelResult {
  ok: boolean;
  sessionId: string;
  boxNo: number;
  totalBoxes: number;
  document: ScanSession['documents'][number] | null;
  shippingAddress: ShippingAddress | null;
  itemCount: number;
  totalQty: number;
  totalWeight: number;
}
