/** สถานะเอกสารตาม docs/สรุปคุณสมบัติPackinglist.md §4 */
export type WorkflowStatus =
  | 'รอจัดสินค้า'
  | 'กำลังจัดสินค้า'
  | 'จัดบางส่วน'
  | 'จัดสินค้าครบ'
  | 'รอตรวจสอบ'
  | 'ปิดงานแล้ว'
  | 'เสร็จสิ้น'
  | 'พิมพ์เอกสารแล้ว'
  | 'พักงาน'
  | 'มีปัญหา'
  | 'ยกเลิก';

export interface OrgContext {
  company: string;
  companyCode?: string;
  branch: string;
  branchKey: string;
  warehouse: string;
  warehouseKey: string;
}

export interface DocumentListItem {
  diKey: number;
  diDate: string;
  diRef: string;
  partyCode?: string;
  partyName?: string;
  remark?: string;
  /** สถานะจากระบบ (client-side จนกว่าจะ sync ERP) */
  workflowStatus: WorkflowStatus;
}

export type DocumentLookupFunction = 'Oe000304' | 'Oe000404' | 'Oe001304';

export interface ScanHistoryEntry {
  itemId: string;
  boxNo: number;
  qty: number;
  barcode: string;
  at: string;
}

export interface JobAuditEntry {
  at: string;
  action: string;
  detail?: string;
  user?: string;
}

export interface JobRecord {
  id: string;
  sessionId: string;
  documentRefs: string[];
  customerName?: string;
  workflowStatus: WorkflowStatus;
  boxCount: number;
  scannedQty: number;
  packerName?: string;
  checkerName?: string;
  startedAt: string;
  updatedAt: string;
  closedAt?: string;
  printedAt?: string;
  auditLog: JobAuditEntry[];
}

export interface CloseJobSummary {
  documentQty: number;
  scannedQty: number;
  shortQty: number;
  overQty: number;
  boxCount: number;
  anomalies: string[];
}
