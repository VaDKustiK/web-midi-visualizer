import type { Song } from '../midi/parser';
import { emptyFeatures } from '../audio/analysis';
import { preparePreviewAnalysis, previewFeaturesAt, previewRate } from '../audio/previewAnalysis';
import { Renderer } from './renderer';
import { templates } from './templates';

// reusable thumbnail for templates
export async function createPreviews(
  song: Song,
  audio: AudioBuffer,
  progress?: (done: number, total: number) => void,
): Promise<Record<string, string>> {
  await preparePreviewAnalysis(audio);
  const images: Record<string, string> = {};
  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 448;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const time = Math.min(3.8, song.duration / 3, audio.duration - 0.1);
  for (const [index, template] of templates.entries()) {
    const renderer = new Renderer(song);
    const features = previewFeaturesAt(audio, time) ?? emptyFeatures();
    if (template.id === 'spectrogram' || template.id === 'spectral-ribbon') {
      for (let i = 0; i < Math.floor(time * previewRate); i++) {
        const t = i / previewRate;
        renderer.updateHistory(template, t, previewFeaturesAt(audio, t)!);
      }
    }
    renderer.draw(ctx, 520, 448, template, time, features, false);
    images[template.id] = canvas.toDataURL('image/webp', 0.85);
    progress?.(index + 1, templates.length);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return images;
}
