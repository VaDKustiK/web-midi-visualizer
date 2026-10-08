import { type Frame, tau } from './drawing';

// audio energy expands 7 polar contours
export function drawResonance(frame: Frame) {
  const { ctx, u, cx, cy, active, dot, time, audio } = frame;
  const base = u * 0.22;
  for (let layer = 6; layer >= 0; layer--) {
    ctx.beginPath();
    for (let i = 0; i <= 180; i++) {
      const angle = (i / 180) * tau,
        energy = audio.spectrum[Math.floor(4 + (i / 180) * 110)] ?? 0;
      const radius =
        base +
        layer * u * 0.012 +
        Math.sin(angle * 3 + time * 0.5 + layer * 0.3) * u * 0.014 +
        energy * u * 0.06 +
        audio.energy * u * 0.035;
      const x = cx + Math.cos(angle) * radius,
        y = cy + Math.sin(angle) * radius;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${260 + layer * 4},65%,78%,${0.8 - layer * 0.09})`;
    ctx.lineWidth = Math.max(1, u * 0.004);
    ctx.stroke();
  }
  for (const n of active.slice(0, 16)) {
    const a = ((n.pitch % 12) / 12) * tau;
    dot(cx + Math.cos(a) * base * 0.6, cy + Math.sin(a) * base * 0.6, u * 0.004, '#e6d6ff');
  }
}
