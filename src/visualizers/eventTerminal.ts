import type { Frame } from './drawing';
import { lowerBound, noteName } from '../midi/parser';

// display the 10 most recent MIDI note events
export function drawEventTerminal(frame: Frame) {
  const { w, h, color, line, text, song, time } = frame;
  const left = w * 0.19,
    top = h * 0.17,
    step = h * 0.048;
  text('MIDI / EVENT STREAM', left, top, 10, color);
  line(left, top + step * 0.6, w * 0.82, top + step * 0.6, '#513a6855');
  text('TIME     NOTE   VEL   TRACK', left, top + step * 1.6, 6, '#513a6890');
  const end = lowerBound(song.notes, time),
    recent = song.notes.slice(Math.max(0, end - 10), end);
  recent.forEach((n, i) =>
    text(
      `${n.start.toFixed(2).padStart(6, '0')}   ${noteName(n.pitch).padEnd(4)}   ${Math.round(
        n.velocity * 127,
      )
        .toString()
        .padStart(3)}   ${String(n.track + 1).padStart(2, '0')}`,
      left,
      top + step * (3 + i),
      7,
      i === recent.length - 1 ? color : '#513a6890',
    ),
  );
  text('_', left, top + step * 14, 10, Math.floor(time * 2) % 2 ? color : '#513a6850');
}
