import { parseMidi } from './parser';
self.onmessage = ({ data }: MessageEvent<{ buffer: ArrayBuffer; name: string }>) => {
  try {
    self.postMessage({ song: parseMidi(data.buffer, data.name) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'Unable to read this MIDI file.',
    });
  }
};
