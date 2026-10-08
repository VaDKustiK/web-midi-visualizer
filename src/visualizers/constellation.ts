import { type Frame, clamp } from './drawing';
import { noteName } from '../midi/parser';

const noise = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// a fixed pitch hash places stars, simultaneous notes connect
export function drawConstellation(frame: Frame) {
  const { ctx, w, h, u, color, notes, active, line, dot, text, time, detail } = frame;
  for (let i = 0; i < 75; i++)
    dot(noise(i) * w, noise(i + 600) * h, noise(i + 300) * 1.2 + 0.25, '#c4addf30');
  const position = (p: number) => [w * (0.12 + noise(p) * 0.76), h * (0.16 + noise(p + 99) * 0.68)];
  for (let i = 0; i < active.length; i++) {
    const n = active[i],
      [x, y] = position(n.pitch);
    for (const other of active.slice(i + 1, i + 4)) {
      const [xx, yy] = position(other.pitch);
      line(x, y, xx, yy, `${color}35`);
    }
  }
  for (const n of notes.filter((n) => n.start <= time)) {
    const [x, y] = position(n.pitch),
      alpha = clamp(1 - Math.max(0, time - n.end) / 2.5);
    ctx.globalAlpha = alpha;
    if (detail) {
      ctx.shadowBlur = u * 0.06;
      ctx.shadowColor = color;
    }
    dot(x, y, u * (0.004 + n.velocity * 0.007));
    ctx.shadowBlur = 0;
    if (detail) text(noteName(n.pitch), x + u * 0.018, y - u * 0.012, 6, '#cbb8f580');
  }
  ctx.globalAlpha = 1;
}
