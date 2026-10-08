import type { AudioFeatures } from '../audio/analysis';
import { clamp, type Frame } from './drawing';

// C2–C8 scale
export function frequencyLightness(frequency: number): number {
  const position = Math.max(0, Math.min(1, Math.log2(Math.max(65.406, frequency) / 65.406) / 6));
  return 32 + position * 56;
}

export interface WaveSlice {
  time: number;
  low: number;
  high: number;
  lightness: number;
}

export function waveSlice(audio: AudioFeatures, time: number): WaveSlice {
  let low = 0,
    high = 0;
  for (const sample of audio.wave) {
    low = Math.min(low, sample);
    high = Math.max(high, sample);
  }
  return { time, low, high, lightness: frequencyLightness(audio.dominantFrequency) };
}

// an 8 second waveform envelope, colored by dominant frequency
export class SpectralFlow {
  private history: WaveSlice[] = [];
  reset() {
    this.history = [];
  }
  update(time: number, audio: AudioFeatures) {
    const history = this.history;
    const previous = history[history.length - 1];
    if (previous && time < previous.time) history.length = 0;
    if (
      !history.length ||
      Math.floor(time * 24) > Math.floor(history[history.length - 1].time * 24)
    ) {
      history.push(waveSlice(audio, time));
      while (history.length > 194 || history[0].time < time - 8.1) history.shift();
    }
  }
  draw(frame: Frame) {
    const { ctx, w, h, u, cy, line, text, time, audio } = frame;
    this.update(time, audio);
    const history = this.history;
    const x = (t: number) => w * (0.9 - (time - t) * 0.1);
    const y = (amplitude: number) => cy - clamp(amplitude, -1, 1) * h * 0.36;
    line(w * 0.09, cy, w * 0.91, cy, '#c5a3f525');
    ctx.lineWidth = Math.max(1, u * 0.003);
    for (let i = 1; i < history.length; i++) {
      const a = history[i - 1],
        b = history[i];
      if (b.time - a.time > 0.5) continue;
      const left = x(a.time),
        right = x(b.time),
        middle = (left + right) / 2;
      const gradient = ctx.createLinearGradient(left, 0, right, 0);
      gradient.addColorStop(0, `hsl(270,60%,${a.lightness}%)`);
      gradient.addColorStop(1, `hsl(270,60%,${b.lightness}%)`);
      ctx.fillStyle = gradient;
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(left, y(a.high));
      ctx.bezierCurveTo(middle, y(a.high), middle, y(b.high), right, y(b.high));
      ctx.lineTo(right, y(b.low));
      ctx.bezierCurveTo(middle, y(b.low), middle, y(a.low), left, y(a.low));
      ctx.closePath();
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      for (const edge of ['high', 'low'] as const) {
        ctx.beginPath();
        ctx.moveTo(left, y(a[edge]));
        ctx.bezierCurveTo(middle, y(a[edge]), middle, y(b[edge]), right, y(b[edge]));
        ctx.stroke();
      }
    }
    text('WAVE / FREQUENCY COLOR', w * 0.1, h * 0.86, 6, '#c5a3f580');
    const legend = ctx.createLinearGradient(w * 0.1, 0, w * 0.32, 0);
    legend.addColorStop(0, 'hsl(270,60%,32%)');
    legend.addColorStop(1, 'hsl(270,60%,88%)');
    ctx.fillStyle = legend;
    ctx.fillRect(w * 0.1, h * 0.9, w * 0.22, Math.max(2, u * 0.006));
    text('LOW → HIGH', w * 0.35, h * 0.915, 5, '#c5a3f580');
  }
}
