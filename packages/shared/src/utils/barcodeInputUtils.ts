export function parseBarcodeInput(raw: string): {
  barcode: string;
  multiplier: number;
} {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d+)\*(.+)$/);
  if (match) {
    const multiplier = Math.max(1, Number(match[1]) || 1);
    const barcode = match[2].trim();
    if (barcode) return { barcode, multiplier };
  }
  return { barcode: trimmed, multiplier: 1 };
}

export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

/** โฟกัสช่องสแกน — allowKeyboard=true เปิดแป้นพิมพ์บนมือถือ */
export function focusBarcodeField(
  input: HTMLInputElement | null | undefined,
  touchDevice: boolean,
  allowKeyboard = false,
) {
  if (!input) return;

  if (!touchDevice || allowKeyboard) {
    input.readOnly = false;
    input.focus({ preventScroll: true });
    input.select();
    return;
  }

  input.readOnly = true;
  input.focus({ preventScroll: true });
  input.select();

  // iOS: โฟกัสซ้ำหลัง blur เพื่อไม่ให้แป้นพิมพ์เด้งขึ้น
  input.blur();
  window.requestAnimationFrame(() => {
    input.readOnly = true;
    input.focus({ preventScroll: true });
    input.select();
  });
}
