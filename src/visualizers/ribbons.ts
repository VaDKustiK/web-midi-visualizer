import type { Frame } from './drawing';

const strandColor = (strand: number, alpha = 1) => `hsla(${258 + strand * 8},55%,72%,${alpha})`;

// Bézier curves connect sequential notes
export function drawRibbons(frame: Frame) {
  const { ctx, w, h, u, notes, min, range, line, dot, time } = frame;
  for (let strand = 0; strand < 5; strand++) {
    const points = notes.filter((n) => n.track % 5 === strand && n.start > time - 2.5).slice(0, 60);
    if (!points.length) continue;
    ctx.strokeStyle = strandColor(strand, 0.75);
    ctx.lineWidth = u * 0.005;
    ctx.beginPath();
    let px = 0,
      py = 0;
    points.forEach((n, i) => {
      const x = w * 0.25 + (n.start - time) * w * 0.12,
        y = h * 0.76 - ((n.pitch - min) / range) * h * 0.52;
      if (!i) ctx.moveTo(x, y);
      else ctx.bezierCurveTo((x + px) / 2, py, (x + px) / 2, y, x, y);
      px = x;
      py = y;
    });
    ctx.stroke();
    for (const n of points)
      dot(
        w * 0.25 + (n.start - time) * w * 0.12,
        h * 0.76 - ((n.pitch - min) / range) * h * 0.52,
        u * 0.008,
        strandColor(strand),
      );
  }
  line(w * 0.25, h * 0.12, w * 0.25, h * 0.88, '#d8b2ef33');
}
