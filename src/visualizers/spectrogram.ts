import type { AudioFeatures } from '../audio/analysis';
import type { Frame } from './drawing';

// shift a small image over time with each new column containing log FFT energy
export class Spectrogram {
  private history = document.createElement('canvas');
  private historyContext: CanvasRenderingContext2D;
  private lastColumn = -1;
  constructor() {
    this.history.width = 256;
    this.history.height = 128;
    this.historyContext = this.history.getContext('2d', {
      alpha: false,
      willReadFrequently: true,
    })!;
    this.reset();
  }
  reset() {
    this.lastColumn = -1;
    this.historyContext.fillStyle = '#110d19';
    this.historyContext.fillRect(0, 0, 256, 128);
  }
  update(time: number, audio: AudioFeatures) {
    const column = Math.floor(time * 24),
      hist = this.historyContext;
    if (column < this.lastColumn) this.reset();
    if (column !== this.lastColumn) {
      const advance = this.lastColumn < 0 ? 1 : Math.min(256, column - this.lastColumn);
      hist.drawImage(this.history, -advance, 0);
      hist.fillStyle = '#110d19';
      hist.fillRect(256 - advance, 0, advance, 128);
      for (let row = 0; row < 128; row++) {
        const index = Math.floor(Math.pow(950, row / 127)),
          value = audio.spectrum[index] ?? 0;
        hist.fillStyle = `hsl(${268 + value * 12},${35 + value * 30}%,${5 + value * 80}%)`;
        hist.fillRect(255, 127 - row, 1, 1);
      }
      this.lastColumn = column;
    }
  }
  draw(frame: Frame) {
    const { ctx, w, h, text, time, audio } = frame;
    this.update(time, audio);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.history, w * 0.12, h * 0.18, w * 0.76, h * 0.59);
    ctx.imageSmoothingEnabled = true;
    text('FREQUENCY / TIME', w * 0.12, h * 0.88, 6, '#c4a0f280');
  }
}
