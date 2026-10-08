import { featuresAt, type AudioFeatures } from './analysis';

export const previewRate = 24;
export const previewLoopSeconds = 5;
export const previewAudioSeconds = 9;
const cache = new WeakMap<AudioBuffer, AudioFeatures[]>();
const pending = new WeakMap<AudioBuffer, Promise<void>>();

export function preparePreviewAnalysis(buffer: AudioBuffer): Promise<void> {
  if (cache.has(buffer)) return Promise.resolve();
  const existing = pending.get(buffer);
  if (existing) return existing;
  const task = (async () => {
    const frames: AudioFeatures[] = [];
    let batchStart = performance.now();
    const count = Math.max(
      1,
      Math.ceil(Math.min(previewAudioSeconds, buffer.duration) * previewRate),
    );
    for (let i = 0; i < count; i++) {
      frames.push(featuresAt(buffer, i / previewRate));
      if (performance.now() - batchStart >= 4) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        batchStart = performance.now();
      }
    }
    cache.set(buffer, frames);
  })();
  pending.set(buffer, task);
  return task.finally(() => pending.delete(buffer));
}

export function previewFeaturesAt(buffer: AudioBuffer, time: number): AudioFeatures | undefined {
  const frames = cache.get(buffer);
  return frames?.[Math.max(0, Math.min(frames.length - 1, Math.floor(time * previewRate)))];
}
