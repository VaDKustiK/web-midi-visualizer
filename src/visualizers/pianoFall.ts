import type { Frame } from './drawing';

// notes fall along pitch lanes
export function drawPianoFall(frame: Frame) {
  const { ctx, w, h, u, color, notes, active, min, max, range, nx, line, dot, time, detail } =
    frame;
  const base = h * 0.81,
    speed = h * 0.16,
    key = (w * 0.8) / range;
  for (let p = min; p <= max; p++) {
    const x = nx(p) - key / 2,
      black = [1, 3, 6, 8, 10].includes((p + 120) % 12);
    if (p % 12 === 0) line(x, h * 0.1, x, base);
    ctx.fillStyle = active.some((n) => n.pitch === p) ? color : black ? '#251b30' : '#463650';
    ctx.fillRect(x + 1, base + 6, Math.max(1, key - 2), h * (black ? 0.055 : 0.085));
  }
  for (const n of notes) {
    const top = base - (n.start + n.duration - time) * speed,
      bottom = base - (n.start - time) * speed;
    if (bottom < 0 || top > base) continue;
    const y = Math.max(h * 0.06, top),
      end = Math.min(base, bottom);
    if (end <= y) continue;
    ctx.fillStyle =
      n.start <= time ? '#e6d6ff' : `${color}${Math.round(100 + n.velocity * 155).toString(16)}`;
    ctx.beginPath();
    ctx.roundRect(nx(n.pitch) - key * 0.39, y, key * 0.78, end - y, Math.min(3, key * 0.2));
    ctx.fill();
    if (detail && n.start <= time && n.end > time) {
      ctx.shadowColor = color;
      ctx.shadowBlur = u * 0.035;
      dot(nx(n.pitch), base, key * 0.4);
      ctx.shadowBlur = 0;
    }
  }
  line(w * 0.1, base, w * 0.9, base, `${color}88`);
}
