import type { Frame } from './drawing';

// sample logarithmically spaced FFT bins into 48 bars
export function drawSpectrum(frame: Frame) {
  const { ctx, w, h, color, line, text, audio } = frame;
  const count = 48,
    left = w * 0.12,
    base = h * 0.78,
    bar = (w * 0.76) / count;
  for (let i = 0; i < 4; i++) line(left, base - i * h * 0.16, w * 0.88, base - i * h * 0.16);
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.pow(900, i / count));
    const value = audio.spectrum[index] ?? 0,
      height = Math.max(1, value * h * 0.55);
    ctx.fillStyle = i % 4 === 0 ? '#e2cfff' : color;
    ctx.globalAlpha = 0.45 + value * 0.55;
    ctx.fillRect(left + i * bar, base - height, Math.max(1, bar * 0.62), height);
  }
  ctx.globalAlpha = 1;
  text('LOW', left, h * 0.87, 6, '#c5a3f570');
  text('HIGH', w * 0.81, h * 0.87, 6, '#c5a3f570');
}
