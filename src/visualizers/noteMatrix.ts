import { type Frame, clamp } from './drawing';

// octave and pitch class select a cell, velocity and release control brightness
export function drawNoteMatrix(frame: Frame) {
  const { ctx, u, cx, cy, notes, text, song, time } = frame;
  const firstOctave = Math.min(2, Math.floor(song.minPitch / 12)),
    rows = Math.max(7, Math.floor(song.maxPitch / 12) - firstOctave + 1),
    cell = u * Math.min(0.055, 0.65 / rows),
    gap = cell * 0.22,
    left = cx - cell * 6,
    top = cy - (cell * rows) / 2;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < 12; col++) {
      const pitch = firstOctave * 12 + row * 12 + col;
      const note = notes.find((n) => n.pitch === pitch && n.start <= time && n.end + 0.7 > time);
      ctx.fillStyle = note
        ? `rgba(197,163,245,${clamp((1 - Math.max(0, time - note.end) / 0.7) * note.velocity + 0.15)})`
        : '#c5a3f50c';
      ctx.fillRect(left + col * cell, top + (rows - 1 - row) * cell, cell - gap, cell - gap);
    }
  for (let i = 0; i < 12; i++)
    text(
      ['C', '·', 'D', '·', 'E', 'F', '·', 'G', '·', 'A', '·', 'B'][i],
      left + i * cell,
      top + (rows + 1) * cell,
      6,
      '#c5a3f570',
    );
}
