import * as MidiModule from '@tonejs/midi';

// this library exposes a CommonJS default in Node and named exports in the browser bundle
const { Midi } = (MidiModule as { default?: typeof MidiModule }).default ?? MidiModule;

export interface Note {
  pitch: number;
  start: number;
  duration: number;
  end: number;
  velocity: number;
  track: number;
}
export interface Song {
  name: string;
  author?: string;
  notes: Note[];
  duration: number;
  bpm: number;
  tracks: number;
  minPitch: number;
  maxPitch: number;
}

export function parseMidi(data: ArrayBuffer, filename: string): Song {
  const header = new Uint8Array(data, 0, Math.min(4, data.byteLength));
  if (String.fromCharCode(...header) !== 'MThd')
    throw new Error('This file is not a Standard MIDI file. Please choose a .mid or .midi file.');
  const midi = new Midi(data);
  const notes: Note[] = [];
  midi.tracks.forEach((track, trackIndex) => {
    const pedal = [...(track.controlChanges[64] ?? [])].sort((a, b) => a.time - b.time);
    const intervals: [number, number][] = [];
    let down: number | undefined;
    for (const event of pedal) {
      if (event.value >= 0.5 && down === undefined) down = event.time;
      if (event.value < 0.5 && down !== undefined) {
        intervals.push([down, event.time]);
        down = undefined;
      }
    }
    if (down !== undefined) intervals.push([down, midi.duration]);
    for (const note of track.notes) {
      const release = note.time + note.duration;
      const hold = intervals.find(([start, end]) => start <= release && release < end);
      notes.push({
        pitch: note.midi,
        start: note.time,
        duration: note.duration,
        end: hold?.[1] ?? release,
        velocity: note.velocity,
        track: trackIndex,
      });
    }
  });
  if (!notes.length) throw new Error('This MIDI contains no notes. Try another file.');
  if (notes.length > 150_000)
    throw new Error('This file exceeds the 150,000-note limit. Try a shorter arrangement.');
  notes.sort((a, b) => a.start - b.start);
  let minPitch = 127,
    maxPitch = 0,
    end = 0;
  for (const n of notes) {
    minPitch = Math.min(minPitch, n.pitch);
    maxPitch = Math.max(maxPitch, n.pitch);
    end = Math.max(end, n.end);
  }
  if (!Number.isFinite(end) || end > 7200)
    throw new Error('Please choose a MIDI shorter than two hours.');
  return {
    name: filename.replace(/\.(mid|midi)$/i, ''),
    notes,
    duration: end + 1.5,
    bpm: Math.round(midi.header.tempos[0]?.bpm ?? 120),
    tracks: midi.tracks.filter((t) => t.notes.length).length,
    minPitch,
    maxPitch,
  };
}

export function lowerBound(notes: Note[], time: number): number {
  let lo = 0,
    hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (notes[mid].start < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function createDemo(): Song {
  const notes: Note[] = [];
  const chords = [
    [48, 55, 60, 64, 67, 72],
    [45, 52, 57, 60, 64, 69],
    [41, 48, 53, 57, 60, 65],
    [43, 50, 55, 59, 62, 67],
  ];
  for (let bar = 0; bar < 16; bar++) {
    const chord = chords[bar % chords.length];
    for (let step = 0; step < 8; step++) {
      const start = bar * 3.2 + step * 0.4;
      const pitch = chord[[0, 2, 3, 4, 5, 4, 3, 2][step]];
      notes.push({
        pitch,
        start,
        duration: 0.64,
        end: start + 1.15,
        velocity: 0.48 + (step % 3) * 0.12,
        track: 0,
      });
      if (step === 0 || step === 4)
        notes.push({
          pitch: chord[0] - 12,
          start,
          duration: 1.3,
          end: start + 1.6,
          velocity: 0.45,
          track: 1,
        });
    }
  }
  notes.sort((a, b) => a.start - b.start);
  return {
    name: 'A little room for daydreams',
    notes,
    duration: 53,
    bpm: 150,
    tracks: 2,
    minPitch: 29,
    maxPitch: 72,
  };
}

export const noteName = (pitch: number) =>
  ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][pitch % 12] +
  (Math.floor(pitch / 12) - 1);
export const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
