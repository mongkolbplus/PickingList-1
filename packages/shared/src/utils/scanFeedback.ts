export type FeedbackTone = 'success' | 'error' | 'warn' | 'info';

type BrowserAudioContext = AudioContext;

let audioCtx: BrowserAudioContext | null = null;
const activeSources = new Set<AudioNode>();

function AudioContextCtor(): typeof AudioContext | null {
  const w = window as Window &
    typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function getAudioContext(): BrowserAudioContext | null {
  const Ctor = AudioContextCtor();
  if (!Ctor) return null;

  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new Ctor();
  }
  return audioCtx;
}

/** เปิดเสียงบน mobile/PDA — เรียกซ้ำได้หลัง user gesture (แตะ/พิมพ์/สแกน) */
export async function unlockScanFeedback(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state !== 'running') return false;

    // iOS/Safari/WebView — เล่น buffer ว่างเพื่อ unlock output
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate || 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.001;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

function playBeep(
  ctx: BrowserAudioContext,
  frequency: number,
  durationSec: number,
  volume = 0.22,
  type: OscillatorType = 'square',
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  activeSources.add(osc);
  osc.onended = () => {
    activeSources.delete(osc);
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      /* ignore */
    }
  };

  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export async function playScanTone(tone: FeedbackTone) {
  if (tone === 'info') return;

  try {
    await unlockScanFeedback();
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    if (tone === 'success') {
      playBeep(ctx, 880, 0.1, 0.24);
      window.setTimeout(() => {
        if (ctx.state === 'running') playBeep(ctx, 1175, 0.12, 0.24);
      }, 90);
      return;
    }

    if (tone === 'error') {
      playBeep(ctx, 220, 0.16, 0.28);
      window.setTimeout(() => {
        if (ctx.state === 'running') playBeep(ctx, 180, 0.2, 0.28);
      }, 140);
      return;
    }

    // warn
    playBeep(ctx, 520, 0.14, 0.22, 'triangle');
  } catch {
    // browser blocked audio
  }
}

export function vibrateScanTone(tone: FeedbackTone) {
  if (tone === 'info' || !navigator.vibrate) return;

  const pattern =
    tone === 'success'
      ? [40]
      : tone === 'error'
        ? [120, 60, 120]
        : [60, 40, 60];
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export function feedbackForTone(tone: FeedbackTone) {
  void playScanTone(tone);
  vibrateScanTone(tone);
}

/** ผูก unlock เสียงกับ gesture ของผู้ใช้ (สำคัญสำหรับ PDA/สแกนเนอร์) */
export function bindScanFeedbackUnlock() {
  const unlock = () => {
    void unlockScanFeedback();
  };
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener('pointerdown', unlock, opts);
  window.addEventListener('touchstart', unlock, opts);
  window.addEventListener('keydown', unlock, opts);
  window.addEventListener('click', unlock, opts);

  return () => {
    window.removeEventListener('pointerdown', unlock, opts);
    window.removeEventListener('touchstart', unlock, opts);
    window.removeEventListener('keydown', unlock, opts);
    window.removeEventListener('click', unlock, opts);
  };
}

export function noticeClass(tone: FeedbackTone) {
  if (tone === 'success') return 'inline-notice inline-notice--ok';
  if (tone === 'error') return 'inline-notice inline-notice--error';
  if (tone === 'warn') return 'inline-notice inline-notice--warn';
  return 'inline-notice';
}

export function noticeBannerClass(tone: FeedbackTone) {
  if (tone === 'success') return 'banner banner--ok';
  if (tone === 'error') return 'banner banner--error';
  if (tone === 'warn') return 'banner banner--warn';
  return 'banner';
}
