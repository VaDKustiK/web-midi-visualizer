import type { Frame } from './drawing';

// notes scroll past a playhead, pitch sets vertical position
export function drawPianoScroll(frame: Frame) {
  const { ctx, w, h, u, color, notes, min, max, range, line, text, time } = frame;
  const playhead = w * 0.3;
  for (let p = min; p <= max; p++)
    line(
      w * 0.08,
      h * 0.83 - ((p - min) / range) * h * 0.64,
      w * 0.94,
      h * 0.83 - ((p - min) / range) * h * 0.64,
    );
  for (const n of notes) {
    const x = playhead + (n.start - time) * w * 0.12,
      y = h * 0.83 - ((n.pitch - min) / range) * h * 0.64;
    ctx.fillStyle = n.start <= time && n.end > time ? '#623d83' : '#a07cb999';
    ctx.fillRect(x, y, Math.max(3, n.duration * w * 0.12), Math.max(2, (h * 0.5) / range));
  }
  line(playhead, h * 0.12, playhead, h * 0.87, color);
  text('NOW', playhead - u * 0.03, h * 0.94, 7);
}
