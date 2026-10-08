import { lowerBound, type Note, type Song } from '../midi/parser';
import type { AudioFeatures } from '../audio/analysis';
import type { Template, TemplateId } from './templates';
import { createFrame, type Frame } from './drawing';
import { SpectralFlow } from './spectralFlow';
import { Spectrogram } from './spectrogram';
import { drawPianoFall } from './pianoFall';
import { drawPianoScroll } from './pianoScroll';
import { drawConstellation } from './constellation';
import { drawRibbons } from './ribbons';
import { drawNoteMatrix } from './noteMatrix';
import { drawEventTerminal } from './eventTerminal';
import { drawWaveform } from './waveform';
import { drawSpectrum } from './spectrum';
import { drawResonance } from './resonance';

// routes each frame to a named algorithm and keeps history isolated to this canvas
export class Renderer {
  private spectralFlow = new SpectralFlow();
  private spectrogram = new Spectrogram();
  private maxEnd: number[];
  private algorithms: Record<TemplateId, (frame: Frame) => void> = {
    fall: drawPianoFall,
    scroll: drawPianoScroll,
    constellation: drawConstellation,
    ribbons: drawRibbons,
    matrix: drawNoteMatrix,
    terminal: drawEventTerminal,
    waveform: drawWaveform,
    spectrum: drawSpectrum,
    resonance: drawResonance,
    'spectral-ribbon': (frame) => this.spectralFlow.draw(frame),
    spectrogram: (frame) => this.spectrogram.draw(frame),
  };
  constructor(readonly song: Song) {
    let end = 0;
    this.maxEnd = song.notes.map((n) => (end = Math.max(end, n.end)));
  }
  private visible(time: number, ahead: number, trail = 0): Note[] {
    let lo = 0,
      hi = this.maxEnd.length;
    while (lo < hi) {
      const m = (lo + hi) >>> 1;
      if (this.maxEnd[m] < time - trail) lo = m + 1;
      else hi = m;
    }
    return this.song.notes
      .slice(lo, lowerBound(this.song.notes, time + ahead))
      .filter((n) => n.end >= time - trail)
      .slice(-2200);
  }

  reset() {
    this.spectralFlow.reset();
    this.spectrogram.reset();
  }

  updateHistory(template: Template, time: number, audio: AudioFeatures) {
    if (template.id === 'spectral-ribbon') this.spectralFlow.update(time, audio);
    else if (template.id === 'spectrogram') this.spectrogram.update(time, audio);
  }
  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    template: Template,
    time: number,
    audio: AudioFeatures,
    detail = true,
  ) {
    const frame = createFrame(
      ctx,
      width,
      height,
      template,
      time,
      audio,
      this.song,
      this.visible(time, 5, 2.5),
      detail,
    );
    this.algorithms[template.id](frame);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
