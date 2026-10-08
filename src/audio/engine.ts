import { lowerBound, type Note, type Song } from '../midi/parser';
import { sampleSets, releaseSeconds, type Instrument, type SampleBank } from './instruments';
export { instruments, type Instrument } from './instruments';
type Voice = { stop: () => void };

export function voice(
  context: BaseAudioContext,
  destination: AudioNode,
  note: Note,
  when: number,
  offset: number,
  instrument: Instrument,
  samples: SampleBank,
): Voice {
  const gain = context.createGain();
  const remaining = Math.max(0.02, note.end - note.start - offset);
  const release = releaseSeconds[instrument];
  const peak = note.velocity * (instrument === 'synth' ? 0.16 : 0.32);
  const attack = Math.min(
    remaining / 2,
    instrument === 'soft'
      ? 0.018
      : instrument === 'synth'
        ? 0.025
        : instrument === 'guitar'
          ? 0.004
          : 0.008,
  );
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(peak, when + attack);
  gain.gain.setValueAtTime(peak, when + remaining);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + remaining + release);
  gain.connect(destination);
  const sources: (AudioBufferSourceNode | OscillatorNode)[] = [];
  let filter: BiquadFilterNode | undefined;
  const sampleSet = sampleSets[instrument];
  const frequency = 440 * Math.pow(2, (note.pitch - 69) / 12);
  if (sampleSet) {
    const nearest = sampleSet.reduce((a, b) =>
      Math.abs(b.pitch - note.pitch) < Math.abs(a.pitch - note.pitch) ? b : a,
    );
    const source = context.createBufferSource();
    source.buffer = samples.get(nearest.path) ?? null;
    if (!source.buffer) throw new Error(`Instrument sample is not loaded: ${nearest.path}`);
    const rate = Math.pow(2, (note.pitch - nearest.pitch) / 12);
    source.playbackRate.value = rate;
    if (instrument === 'soft') {
      filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = Math.min(7000, Math.max(900, frequency * 2.5 + note.velocity * 650));
      filter.Q.value = 0.5;
      source.connect(filter);
      filter.connect(gain);
    } else source.connect(gain);
    source.start(when, Math.min(offset * rate, source.buffer.duration));
    source.stop(when + remaining + release);
    sources.push(source);
  } else if (instrument === 'synth') {
    filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.65;
    filter.frequency.value = Math.min(9000, frequency * 3 + 800 + note.velocity * 1200);
    filter.connect(gain);
    for (const detune of [-4, 4]) {
      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = frequency;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(when);
      osc.stop(when + remaining + release);
      sources.push(osc);
    }
  } else {
    const harmonics = [1, 2, 4];
    harmonics.forEach((harmonic, index) => {
      const osc = context.createOscillator(),
        level = context.createGain();
      osc.frequency.value = frequency * harmonic;
      level.gain.setValueAtTime((1 / (index + 1) ** 2) * Math.exp(-offset * 1.6), when);
      level.gain.exponentialRampToValueAtTime(0.0001, when + remaining + release);
      osc.connect(level);
      level.connect(gain);
      osc.start(when);
      osc.stop(when + remaining + release);
      osc.onended = () => {
        osc.disconnect();
        level.disconnect();
      };
      sources.push(osc);
    });
  }
  let pendingSources = sources.length;
  for (const source of sources)
    source.addEventListener('ended', () => {
      source.disconnect();
      if (--pendingSources === 0) {
        gain.disconnect();
        filter?.disconnect();
      }
    });
  return {
    stop: () => {
      for (const source of sources) {
        try {
          source.stop();
        } catch {
          /* already ended */
        }
      }
      gain.disconnect();
      filter?.disconnect();
    },
  };
}

export class AudioEngine {
  context?: AudioContext;
  analyser?: AnalyserNode;
  private master?: GainNode;
  private bus?: GainNode;
  readonly samples: SampleBank = new Map();
  private loading = new Map<Instrument, Promise<void>>();
  private timer?: ReturnType<typeof setInterval>;
  private origin = 0;
  private pausedAt = 0;
  private cursor = 0;
  private song?: Song;
  private voices: { voice: Voice; end: number }[] = [];
  playing = false;
  timelineRevision = 0;
  instrument: Instrument = 'grand';
  volume = 0.7;

  async init() {
    if (!this.context) {
      this.context = new AudioContext();
      this.bus = this.context.createGain();
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 8;
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.65;
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.bus.connect(limiter);
      limiter.connect(this.analyser);
      this.analyser.connect(this.master);
      this.master.connect(this.context.destination);
    }
    await this.context.resume();
  }

  async loadInstrument(instrument: Instrument, progress?: (done: number, total: number) => void) {
    await this.init();
    const sampleSet = sampleSets[instrument];
    if (sampleSet && !sampleSet.every((sample) => this.samples.has(sample.path))) {
      let loading = this.loading.get(instrument);
      if (!loading) {
        loading = (async () => {
          let done = 0;
          await Promise.all(
            sampleSet.map(async (sample) => {
              if (!this.samples.has(sample.path)) {
                const response = await fetch(`${import.meta.env.BASE_URL}${sample.path}`);
                if (!response.ok)
                  throw new Error(
                    'Instrument samples could not load. Check your connection or choose Electric keys or Synth.',
                  );
                this.samples.set(
                  sample.path,
                  await this.context!.decodeAudioData(await response.arrayBuffer()),
                );
              }
              progress?.(++done, sampleSet.length);
            }),
          );
        })().finally(() => {
          this.loading.delete(instrument);
        });
        this.loading.set(instrument, loading);
      }
      await loading;
    }
  }

  get time() {
    return this.playing && this.context
      ? Math.min(this.song?.duration ?? Infinity, this.context.currentTime - this.origin)
      : this.pausedAt;
  }
  setVolume(value: number) {
    this.volume = value;
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.02);
  }

  play(song: Song, at = this.pausedAt) {
    this.pause();
    this.song = song;
    this.pausedAt = at >= song.duration ? 0 : Math.max(0, at);
    if (this.pausedAt !== at) this.timelineRevision++;
    this.origin = this.context!.currentTime - this.pausedAt;
    this.cursor = lowerBound(song.notes, this.pausedAt);
    for (let i = 0; i < this.cursor; i++) {
      const n = song.notes[i];
      if (n.end > this.pausedAt) this.schedule(n, this.pausedAt - n.start);
    }
    this.playing = true;
    this.tick();
    this.timer = setInterval(() => this.tick(), 25);
  }

  private schedule(note: Note, offset = 0) {
    const when = Math.max(this.context!.currentTime, this.origin + note.start + offset);
    this.voices.push({
      voice: voice(this.context!, this.bus!, note, when, offset, this.instrument, this.samples),
      end: this.origin + note.end + releaseSeconds[this.instrument] + 0.05,
    });
  }
  private tick() {
    if (!this.song || !this.context) return;
    const now = this.context.currentTime;
    this.voices = this.voices.filter((v) => v.end > now);
    while (
      this.cursor < this.song.notes.length &&
      this.song.notes[this.cursor].start < this.time + 0.15
    ) {
      const n = this.song.notes[this.cursor++];
      if (n.end > this.time) this.schedule(n, Math.max(0, this.time - n.start));
    }
    if (this.time >= this.song.duration) {
      this.pause();
      this.pausedAt = this.song.duration;
    }
  }
  pause() {
    this.pausedAt = this.time;
    this.playing = false;
    clearInterval(this.timer);
    this.voices.forEach((v) => v.voice.stop());
    this.voices = [];
  }
  seek(at: number) {
    this.timelineRevision++;
    const wasPlaying = this.playing;
    this.pause();
    this.pausedAt = at;
    if (wasPlaying && this.song) this.play(this.song, at);
  }
  reset() {
    this.timelineRevision++;
    this.pause();
    this.pausedAt = 0;
  }
  dispose() {
    this.pause();
    void this.context?.close();
  }
}

export async function renderAudio(
  song: Song,
  instrument: Instrument,
  samples: SampleBank,
  volume: number,
): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, Math.ceil(song.duration * 44100), 44100);
  const limiter = context.createDynamicsCompressor(),
    master = context.createGain();
  limiter.threshold.value = -10;
  limiter.ratio.value = 8;
  master.gain.value = volume;
  limiter.connect(master);
  master.connect(context.destination);
  for (const note of song.notes) voice(context, limiter, note, note.start, 0, instrument, samples);
  return context.startRendering();
}
