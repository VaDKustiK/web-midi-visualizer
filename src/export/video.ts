import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny';
import type { Song } from '../midi/parser';
import { renderAudio, type AudioEngine } from '../audio/engine';
import { Renderer } from '../visualizers/renderer';
import { emptyFeatures, featuresAt } from '../audio/analysis';
import type { Template } from '../visualizers/templates';

export interface ExportOptions {
  format: 'mp4' | 'webm';
  fps: number;
  height: number;
  aspect: 'wide' | 'square' | 'portrait';
}
export async function exportSupport() {
  const [avc, aac, vp9, opus] = await Promise.all([
    canEncodeVideo('avc'),
    canEncodeAudio('aac'),
    canEncodeVideo('vp9'),
    canEncodeAudio('opus'),
  ]);
  return { mp4: avc && aac, webm: vp9 && opus };
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export async function exportVideo(
  song: Song,
  template: Template,
  engine: AudioEngine,
  options: ExportOptions,
  signal: AbortSignal,
  progress: (value: number, label: string) => void,
) {
  const abort = () => {
    if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
  };
  abort();
  progress(0, 'Rendering instrument audio…');
  await engine.loadInstrument(engine.instrument);
  abort();
  const buffer = await renderAudio(song, engine.instrument, engine.samples, engine.volume);
  abort();
  const canvas = document.createElement('canvas');
  canvas.height = options.height;
  canvas.width =
    Math.round(
      (options.height *
        (options.aspect === 'wide' ? 16 / 9 : options.aspect === 'portrait' ? 9 / 16 : 1)) /
        2,
    ) * 2;
  const context = canvas.getContext('2d', { alpha: false })!,
    target = new BufferTarget();
  const output = new Output({
    format: options.format === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(),
    target,
  });
  const video = new CanvasSource(canvas, {
    codec: options.format === 'mp4' ? 'avc' : 'vp9',
    bitrate: options.height >= 1080 ? 10_000_000 : 5_000_000,
  });
  const audio = new AudioBufferSource({
    codec: options.format === 'mp4' ? 'aac' : 'opus',
    bitrate: 192_000,
  });
  output.addVideoTrack(video, { frameRate: options.fps });
  output.addAudioTrack(audio);
  try {
    await output.start();
    abort();
    await audio.add(buffer);
    audio.close();
    const renderer = new Renderer(song),
      features = emptyFeatures(),
      frames = Math.ceil(song.duration * options.fps);
    for (let i = 0; i < frames; i++) {
      abort();
      const time = i / options.fps;
      if (template.category !== 'Notes') featuresAt(buffer, time, features);
      renderer.draw(context, canvas.width, canvas.height, template, time, features);
      await video.add(time, 1 / options.fps);
      if (i % 12 === 0) {
        progress(0.1 + (i / frames) * 0.85, `Rendering video · ${i + 1} / ${frames} frames`);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    video.close();
    progress(0.97, 'Finishing your video…');
    await output.finalize();
    abort();
    download(
      new Blob([target.buffer!], { type: options.format === 'mp4' ? 'video/mp4' : 'video/webm' }),
      `${song.name}-${template.id}.${options.format}`,
    );
    progress(1, 'Your video is ready.');
  } catch (error) {
    await output.cancel();
    throw error;
  }
}
