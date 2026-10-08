import type { Frame } from './drawing';

// draw actual PCM amplitude against sample index
export function drawWaveform(frame: Frame) {
  const { ctx, w, h, u, cy, color, line, text, audio } = frame;
  for (let i = 1; i < 5; i++) line(w * 0.08, (h * i) / 5, w * 0.92, (h * i) / 5);
  for (let i = 1; i < 10; i++) line((w * i) / 10, h * 0.15, (w * i) / 10, h * 0.85);
  line(w * 0.08, cy, w * 0.92, cy, '#ceb7f535');
  ctx.strokeStyle = color;
  ctx.lineWidth = u * 0.005;
  ctx.beginPath();
  for (let i = 0; i < 1024; i++) {
    const x = w * 0.08 + (i / 1023) * w * 0.84,
      y = cy + audio.wave[i] * h * 0.8;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  text('OSC / TIME DOMAIN', w * 0.08, h * 0.91, 6, '#ceb7f570');
}
