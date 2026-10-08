import { parseMidi, type Song } from './parser';

export const DEMO_AUTHOR = 'flojy';
export const DEMO_TITLE = 'Demo';
const demoUrl = `${import.meta.env.BASE_URL}midi/demo.mid`;
let pending: Promise<Song> | undefined;

export function loadDemoSong(): Promise<Song> {
  pending ??= (async () => {
    const response = await fetch(demoUrl, { cache: 'no-cache' });
    if (!response.ok)
      throw new Error(
        'Demo MIDI is unavailable. Add your file at public/midi/demo.mid, then try again.',
      );
    const data = await response.arrayBuffer();
    if (String.fromCharCode(...new Uint8Array(data, 0, Math.min(4, data.byteLength))) !== 'MThd') {
      throw new Error(
        'Demo MIDI is missing or invalid. Add a valid MIDI file at public/midi/demo.mid, then try again.',
      );
    }
    if (data.byteLength > 20 * 1024 * 1024)
      throw new Error('The demo MIDI must be smaller than 20 MB.');
    return { ...parseMidi(data, 'demo.mid'), name: DEMO_TITLE, author: DEMO_AUTHOR };
  })().catch((error) => {
    pending = undefined;
    throw error;
  });
  return pending;
}
