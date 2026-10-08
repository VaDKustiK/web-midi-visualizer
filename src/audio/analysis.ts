export interface AudioFeatures {
  wave: Float32Array;
  spectrum: Float32Array;
  energy: number;
  dominantFrequency: number;
}
export const emptyFeatures = (): AudioFeatures => ({
  wave: new Float32Array(2048),
  spectrum: new Float32Array(1024),
  energy: 0,
  dominantFrequency: 0,
});

export function analyse(
  samples: Float32Array,
  features = emptyFeatures(),
  sampleRate = 44100,
): AudioFeatures {
  const size = 2048,
    re = new Float32Array(size),
    im = new Float32Array(size);
  let energy = 0;
  for (let i = 0; i < size; i++) {
    const sample = samples[i] ?? 0;
    features.wave[i] = sample;
    energy += sample * sample;
    re[i] = sample * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
    }
  }
  for (let len = 2; len <= size; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    for (let base = 0; base < size; base += len) {
      for (let k = 0; k < len / 2; k++) {
        const a = base + k,
          b = a + len / 2;
        const c = Math.cos(angle * k),
          s = Math.sin(angle * k);
        const real = re[b] * c - im[b] * s,
          imaginary = re[b] * s + im[b] * c;
        re[b] = re[a] - real;
        im[b] = im[a] - imaginary;
        re[a] += real;
        im[a] += imaginary;
      }
    }
  }
  let peak = -85;
  features.dominantFrequency = 0;
  for (let i = 0; i < size / 2; i++) {
    const db = 20 * Math.log10(Math.max(1e-8, Math.hypot(re[i], im[i]) / size));
    if (i > 0 && db > peak) {
      peak = db;
      features.dominantFrequency = (i * sampleRate) / size;
    }
    features.spectrum[i] = Math.max(0, Math.min(1, (db + 85) / 70));
  }
  features.energy = Math.min(1, Math.sqrt(energy / size) * 5);
  return features;
}

export function featuresAt(
  buffer: AudioBuffer,
  time: number,
  features = emptyFeatures(),
): AudioFeatures {
  const data = buffer.getChannelData(0),
    start = Math.max(0, Math.floor(time * buffer.sampleRate) - 1024);
  return analyse(data.subarray(start, start + 2048), features, buffer.sampleRate);
}

export function readLive(
  analyser: AnalyserNode,
  features: AudioFeatures,
  db: Float32Array<ArrayBuffer>,
) {
  analyser.getFloatTimeDomainData(features.wave as Float32Array<ArrayBuffer>);
  analyser.getFloatFrequencyData(db);
  let peak = -85;
  features.dominantFrequency = 0;
  for (let i = 1; i < db.length; i++) {
    if (db[i] > peak) {
      peak = db[i];
      features.dominantFrequency = (i * analyser.context.sampleRate) / analyser.fftSize;
    }
  }
  let energy = 0;
  for (let i = 0; i < features.spectrum.length; i++)
    features.spectrum[i] = Math.max(0, Math.min(1, (db[i] + 85) / 70));
  for (const sample of features.wave) energy += sample * sample;
  features.energy = Math.min(1, Math.sqrt(energy / features.wave.length) * 5);
}
