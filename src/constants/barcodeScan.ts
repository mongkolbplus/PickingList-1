import type { BarcodeType } from 'expo-camera';

/** ประเภทบาร์โค้ดที่รองรับ — ครอบคลุม EAN/UPC, Code 39/128 และ QR */
export const BARCODE_SCAN_TYPES: BarcodeType[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'itf14',
  'qr',
  'pdf417',
];
