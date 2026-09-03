/** Generate SVG barcode using Code 39 (A-Z 0-9 and - . $ / + % space) */

const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '*': 'nwnnwnwnn',
  $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
};

const WIDE_RATIO = 2.4;
const TEXT_HEIGHT_MM = 3.5;
const TEXT_GAP_MM = 1;

export const PRINT_BARCODE_OPTIONS = {
  targetWidthMm: 40,
  barHeightMm: 10,
  quietZoneModules: 10,
  minNarrowModuleMm: 0.28,
} as const;

export type Code39SvgOptions = {
  targetWidthMm?: number;
  barHeightMm?: number;
  quietZoneModules?: number;
  minNarrowModuleMm?: number;
  /** Legacy pixel mode (preview / backward compat) */
  height?: number;
  moduleWidth?: number;
};

function normalizeForCode39(value: string) {
  return value
    .toUpperCase()
    .replace(/[^0-9A-Z\-. $/+%]/g, '-')
    .slice(0, 32);
}

function measureBarcodeUnits(encoded: string): number {
  let units = 0;
  for (const ch of encoded) {
    const pattern = CODE39[ch];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i += 1) {
      units += pattern[i] === 'w' ? WIDE_RATIO : 1;
    }
    units += 1;
  }
  return units;
}

function resolveNarrowModuleMm(
  encoded: string,
  options: Required<
    Pick<
      Code39SvgOptions,
      'targetWidthMm' | 'quietZoneModules' | 'minNarrowModuleMm'
    >
  >,
): number {
  const units = measureBarcodeUnits(encoded);
  const quietUnits = options.quietZoneModules * 2;
  const ideal =
    units + quietUnits > 0 ? options.targetWidthMm / (units + quietUnits) : options.minNarrowModuleMm;
  return Math.max(options.minNarrowModuleMm, ideal);
}

function buildBarsMm(
  encoded: string,
  narrowMm: number,
  barHeightMm: number,
  startX: number,
): { bars: string; endX: number } {
  const wideMm = narrowMm * WIDE_RATIO;
  const gapMm = narrowMm;
  let bars = '';
  let x = startX;

  for (const ch of encoded) {
    const pattern = CODE39[ch];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i += 1) {
      const isBar = i % 2 === 0;
      const width = pattern[i] === 'w' ? wideMm : narrowMm;
      if (isBar) {
        bars += `<rect x="${x.toFixed(3)}" y="0" width="${width.toFixed(3)}" height="${barHeightMm.toFixed(3)}" fill="#000"/>`;
      }
      x += width;
    }
    x += gapMm;
  }

  return { bars, endX: x };
}

function escapeLabel(raw: string) {
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

/** Render Code 39 barcode SVG sized for reliable print scanning. */
export function renderCode39Svg(value: string, options?: Code39SvgOptions): string {
  const raw = normalizeForCode39(value.trim());
  if (!raw) return '';

  const encoded = `*${raw}*`;
  const label = escapeLabel(raw);

  if (options?.targetWidthMm != null || options?.barHeightMm != null) {
    const targetWidthMm = options?.targetWidthMm ?? PRINT_BARCODE_OPTIONS.targetWidthMm;
    const barHeightMm = options?.barHeightMm ?? PRINT_BARCODE_OPTIONS.barHeightMm;
    const quietZoneModules =
      options?.quietZoneModules ?? PRINT_BARCODE_OPTIONS.quietZoneModules;
    const minNarrowModuleMm =
      options?.minNarrowModuleMm ?? PRINT_BARCODE_OPTIONS.minNarrowModuleMm;

    const narrowMm = resolveNarrowModuleMm(encoded, {
      targetWidthMm,
      quietZoneModules,
      minNarrowModuleMm,
    });
    const quietMm = quietZoneModules * narrowMm;
    const { bars, endX } = buildBarsMm(encoded, narrowMm, barHeightMm, quietMm);
    const svgWidthMm = endX + quietMm;
    const svgHeightMm = barHeightMm + TEXT_GAP_MM + TEXT_HEIGHT_MM;
    const textY = barHeightMm + TEXT_GAP_MM + TEXT_HEIGHT_MM * 0.72;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidthMm.toFixed(2)}mm" height="${svgHeightMm.toFixed(2)}mm" viewBox="0 0 ${svgWidthMm.toFixed(3)} ${svgHeightMm.toFixed(3)}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet">
  <rect width="100%" height="100%" fill="#fff"/>
  <g>${bars}</g>
  <text x="${(svgWidthMm / 2).toFixed(3)}" y="${textY.toFixed(3)}" text-anchor="middle" font-family="Consolas, monospace" font-size="${TEXT_HEIGHT_MM.toFixed(2)}" fill="#000">${label}</text>
</svg>`;
  }

  const height = options?.height ?? 48;
  const narrow = options?.moduleWidth ?? 1.5;
  const wide = narrow * WIDE_RATIO;
  const gap = narrow;
  const quietPx = 8;
  let bars = '';
  let x = 0;

  for (const ch of encoded) {
    const pattern = CODE39[ch];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i += 1) {
      const isBar = i % 2 === 0;
      const width = pattern[i] === 'w' ? wide : narrow;
      if (isBar) {
        bars += `<rect x="${x.toFixed(2)}" y="0" width="${width.toFixed(2)}" height="${height}" fill="#000"/>`;
      }
      x += width;
    }
    x += gap;
  }

  const barWidth = Math.ceil(x);
  const width = barWidth + quietPx * 2;
  const labelY = height + 14;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${labelY + 4}" viewBox="0 0 ${width} ${labelY + 4}" role="img" aria-label="${label}">
  <rect width="100%" height="100%" fill="#fff"/>
  <g transform="translate(${quietPx},0)">${bars}</g>
  <text x="${width / 2}" y="${labelY}" text-anchor="middle" font-family="monospace" font-size="12" fill="#111">${label}</text>
</svg>`;
}

/** @deprecated Use renderCode39Svg - kept for existing imports. */
export function renderCode128Svg(value: string, options?: Code39SvgOptions): string {
  if (options?.height != null || options?.moduleWidth != null) {
    return renderCode39Svg(value, options);
  }
  return renderCode39Svg(value, { ...PRINT_BARCODE_OPTIONS, ...options });
}
