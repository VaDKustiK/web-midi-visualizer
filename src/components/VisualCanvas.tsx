import { useEffect, useRef } from 'react';
import type { Song } from '../midi/parser';
import type { AudioEngine } from '../audio/engine';
import { emptyFeatures, readLive } from '../audio/analysis';
import { previewFeaturesAt, previewLoopSeconds, previewRate } from '../audio/previewAnalysis';
import { Renderer } from '../visualizers/renderer';
import type { Template } from '../visualizers/templates';

interface Props {
  song: Song;
  template: Template;
  engine?: AudioEngine;
  preview?: boolean;
  animate?: boolean;
  previewAudio?: AudioBuffer;
  fps?: number;
  quality?: number;
  onFps?: (fps: number) => void;
}
export default function VisualCanvas({
  song,
  template,
  engine,
  preview = false,
  animate = false,
  previewAudio,
  fps = 0,
  quality = 1.5,
  onFps,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext('2d', { alpha: false })!;
    const renderer = new Renderer(song),
      audio = emptyFeatures(),
      db = new Float32Array(1024);
    let width = 0,
      height = 0,
      frame = 0,
      last = 0,
      frames = 0,
      measuredAt = performance.now();
    let previousTime = -1;
    let previewHistoryReady = false;
    let revision = engine?.timelineRevision;
    const syncTimeline = (time: number) => {
      if (time < previousTime || revision !== engine?.timelineRevision) {
        renderer.reset();
        previewHistoryReady = false;
      }
      previousTime = time;
      revision = engine?.timelineRevision;
    };
    const start = performance.now(),
      previewStart = Math.min(3.8, song.duration / 3);
    const draw = (now: number, force = false) => {
      const interval = preview ? 1000 / 60 : fps ? 1000 / fps : 0;
      if (!force && interval && now - last < interval - 0.5) return;
      last = now - (interval ? (now - last) % interval : 0);
      let time = preview
        ? previewStart + (animate ? ((now - start) / 1000) % previewLoopSeconds : 0)
        : (engine?.time ?? 0);
      if (previewAudio && preview) time = Math.min(time, previewAudio.duration - 0.1);
      syncTimeline(time);
      const frameAudio =
        preview && previewAudio ? (previewFeaturesAt(previewAudio, time) ?? audio) : audio;
      if (!preview && engine?.analyser) readLive(engine.analyser, audio, db);
      if (
        preview &&
        (template.id === 'spectrogram' || template.id === 'spectral-ribbon') &&
        !previewHistoryReady &&
        previewAudio
      ) {
        renderer.reset();
        for (let i = 0; i < Math.floor(time * previewRate); i++) {
          const t = i / previewRate;
          const cached = previewFeaturesAt(previewAudio, t);
          if (cached) renderer.updateHistory(template, t, cached);
        }
        previewHistoryReady = true;
      }
      renderer.draw(ctx, width, height, template, time, frameAudio, !preview && quality > 1);
      if (!preview) {
        frames++;
        if (now - measuredAt >= 1000) {
          onFps?.(Math.round((frames * 1000) / (now - measuredAt)));
          frames = 0;
          measuredAt = now;
        }
      }
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, preview ? 1.5 : quality);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now(), true);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const loop = (now: number) => {
      if (!document.hidden) draw(now);
      frame = requestAnimationFrame(loop);
    };
    if (!preview || animate) frame = requestAnimationFrame(loop);
    const historyTimer =
      !preview && (template.id === 'spectral-ribbon' || template.id === 'spectrogram')
        ? window.setInterval(() => {
            if (!document.hidden || !engine?.playing || !engine.analyser) return;
            const time = engine.time;
            syncTimeline(time);
            readLive(engine.analyser, audio, db);
            renderer.updateHistory(template, time, audio);
          }, 1000 / 24)
        : undefined;
    return () => {
      window.clearInterval(historyTimer);
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [song, template, engine, preview, animate, previewAudio, fps, quality, onFps]);
  return (
    <canvas
      ref={ref}
      className="visual-canvas"
      aria-label={`${template.name} music visualization`}
      role="img"
    />
  );
}
