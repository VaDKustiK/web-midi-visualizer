export type Instrument = 'grand' | 'soft' | 'electric' | 'guitar' | 'synth';
export type SampleBank = Map<string, AudioBuffer>;
export const instruments: { id: Instrument; name: string; description: string }[] = [
  { id: 'grand', name: 'Grand piano', description: 'Sampled · bright and natural' },
  { id: 'soft', name: 'Soft piano', description: 'Soft-strike samples · gentle' },
  { id: 'electric', name: 'Electric keys', description: 'Synthesized · mellow' },
  { id: 'guitar', name: 'Acoustic guitar', description: 'Sampled · plucked' },
  { id: 'synth', name: 'Synth', description: 'Synthesized · warm and sustained' },
];

type Sample = { pitch: number; path: string };
const pianoPitches = [24, 36, 48, 60, 72, 84, 96];
export const sampleSets: Partial<Record<Instrument, Sample[]>> = {
  grand: pianoPitches.map((pitch) => ({ pitch, path: `samples/C${pitch / 12 - 1}.mp3` })),
  soft: pianoPitches.map((pitch) => ({ pitch, path: `samples/soft/C${pitch / 12 - 1}.mp3` })),
  guitar: [
    [40, 'E2'],
    [45, 'A2'],
    [48, 'C3'],
    [52, 'E3'],
    [55, 'G3'],
    [60, 'C4'],
    [64, 'E4'],
    [67, 'G4'],
    [71, 'B4'],
  ].map(([pitch, name]) => ({ pitch: Number(pitch), path: `samples/guitar/${name}.mp3` })),
};

export const releaseSeconds: Record<Instrument, number> = {
  grand: 0.55,
  soft: 0.65,
  electric: 0.55,
  guitar: 0.18,
  synth: 0.3,
};
