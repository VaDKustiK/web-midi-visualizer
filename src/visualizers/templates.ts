export type Category = 'Notes' | 'Audio' | 'Hybrid';
export type TemplateId =
  | 'fall'
  | 'scroll'
  | 'constellation'
  | 'ribbons'
  | 'spectral-ribbon'
  | 'matrix'
  | 'terminal'
  | 'waveform'
  | 'spectrum'
  | 'spectrogram'
  | 'resonance';
export interface Template {
  id: TemplateId;
  name: string;
  category: Category;
  description: string;
  background: string;
  color: string;
  light?: boolean;
}
export const templates: Template[] = [
  {
    id: 'fall',
    name: 'Piano fall',
    category: 'Notes',
    description: 'A familiar feeling. Notes in free fall.',
    background: '#15111c',
    color: '#c5a3f5',
  },
  {
    id: 'spectrum',
    name: 'Spectrum',
    category: 'Audio',
    description: 'The architecture of your sound.',
    background: '#14111b',
    color: '#c5a3f5',
  },
  {
    id: 'constellation',
    name: 'Constellation',
    category: 'Notes',
    description: 'Small connections. Infinite space.',
    background: '#13101d',
    color: '#cbb8f5',
  },
  {
    id: 'spectrogram',
    name: 'Spectrogram',
    category: 'Audio',
    description: 'Leave a trace in the frequency field.',
    background: '#110d19',
    color: '#c4a0f2',
  },
  {
    id: 'scroll',
    name: 'Piano scroll',
    category: 'Notes',
    description: 'Your composition, unfolding.',
    background: '#eee8f6',
    color: '#7b539b',
    light: true,
  },
  {
    id: 'ribbons',
    name: 'Ribbons',
    category: 'Notes',
    description: 'Melodies with a little room to wander.',
    background: '#19121e',
    color: '#d8b2ef',
  },
  {
    id: 'spectral-ribbon',
    name: 'Spectral flow',
    category: 'Audio',
    description: 'A waveform in violet. Higher frequencies, lighter shades.',
    background: '#15111d',
    color: '#c5a3f5',
  },
  {
    id: 'matrix',
    name: 'Note matrix',
    category: 'Notes',
    description: 'A little order in the oscillation.',
    background: '#16111c',
    color: '#c5a3f5',
  },
  {
    id: 'terminal',
    name: 'Event terminal',
    category: 'Notes',
    description: 'Read between the notes.',
    background: '#e7dff0',
    color: '#513a68',
    light: true,
  },
  {
    id: 'waveform',
    name: 'Waveform',
    category: 'Audio',
    description: 'Sound, down to the smallest detail.',
    background: '#15111d',
    color: '#ceb7f5',
  },
  {
    id: 'resonance',
    name: 'Resonance',
    category: 'Hybrid',
    description: 'A shape that breathes with the music.',
    background: '#15111e',
    color: '#c5a3f5',
  },
];
