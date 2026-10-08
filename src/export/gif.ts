import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import type { Song } from '../midi/parser';
import { renderAudio, type AudioEngine } from '../audio/engine';
import { Renderer } from '../visualizers/renderer';
import { emptyFeatures, featuresAt } from '../audio/analysis';
import type { Template } from '../visualizers/templates';
import { download } from './video';

export async function exportGif(
  song: Song,
  template: Template,
  engine: AudioEngine,
  signal: AbortSignal,
  progress: (value: number, label: string) => void,
) {
  const abort = () => {
    if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
  };
  const duration = Math.min(song.duration, 8),
    fps = 15;
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const renderer = new Renderer(song),
    features = emptyFeatures(),
    gif = GIFEncoder();
  let audio: AudioBuffer | undefined;
  if (template.category !== 'Notes') {
    progress(0, 'Preparing audio analysis…');
    await engine.loadInstrument(engine.instrument);
    abort();
    audio = await renderAudio(
      { ...song, notes: song.notes.filter((n) => n.start < duration), duration },
      engine.instrument,
      engine.samples,
      engine.volume,
    );
  }
  const frames = Math.ceil(duration * fps);
  for (let frame = 0; frame < frames; frame++) {
    abort();
    const time = frame / fps;
    if (audio) featuresAt(audio, time, features);
    renderer.draw(ctx, 640, 360, template, time, features, false);
    const data = ctx.getImageData(0, 0, 640, 360).data,
      palette = quantize(data, 128);
    gif.writeFrame(applyPalette(data, palette), 640, 360, {
      palette,
      delay: 1000 / fps,
      repeat: 0,
    });
    progress((frame + 1) / frames, `Rendering GIF · ${frame + 1} / ${frames} frames`);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  abort();
  gif.finish();
  download(
    new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' }),
    `${song.name}-${template.id}.gif`,
  );
  progress(1, 'Your GIF is ready.');
}
