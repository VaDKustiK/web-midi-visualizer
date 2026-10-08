import type { Song, Note } from '../midi/parser';
import type { AudioFeatures } from '../audio/analysis';
import type { Template } from './templates';
export const tau = Math.PI * 2;
export const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

export function createFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: Template,
  time: number,
  audio: AudioFeatures,
  song: Song,
  notes: Note[],
  detail: boolean,
) {
  const w = width,
    h = height,
    u = Math.min(w, h),
    cx = w / 2,
    cy = h / 2;
  const light = template.light,
    color = template.color;
  const ink = light ? '#493459' : '#cbbfd8';
  const grid = light ? '#533a6815' : '#e6d9f40c';
  ctx.fillStyle = template.background;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = Math.max(0.65, u / 650);
  ctx.lineCap = 'round';
  const line = (x: number, y: number, xx: number, yy: number, c = grid) => {
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(xx, yy);
    ctx.stroke();
  };
  const dot = (x: number, y: number, radius: number, c = color) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.1, radius), 0, tau);
    ctx.fill();
  };
  const text = (value: string, x: number, y: number, size = 9, c = ink) => {
    ctx.fillStyle = c;
    ctx.font = `${Math.max(7, (size * u) / 300)}px "SFMono-Regular", Consolas, monospace`;
    ctx.fillText(value, x, y);
  };

  detail = detail && notes.length < 256;
  const active = notes.filter((n) => n.start <= time && n.end > time);
  const min = Math.min(song.minPitch, 48) - 1,
    max = Math.max(song.maxPitch, 72) + 1,
    range = max - min + 1;
  const nx = (pitch: number) => 0.1 * w + ((pitch - min + 0.5) / range) * 0.8 * w;

  return {
    ctx,
    w,
    h,
    u,
    cx,
    cy,
    color,
    light,
    ink,
    grid,
    notes,
    active,
    min,
    max,
    range,
    nx,
    line,
    dot,
    text,
    song,
    time,
    audio,
    detail,
  };
}
export type Frame = ReturnType<typeof createFrame>;
