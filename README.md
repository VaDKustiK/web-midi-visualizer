# web-midi-visualizer

A MIDI player with 11 visual styles. Drop a MIDI, choose an instrument, and see the music. Files, audio synthesis, visualization, and export stay in the browser.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm run build
npm run dev
```

## What is included

- Drag/drop and file selection, a file-based demo credited to flojy, real preview preparation progress, and local MIDI parsing in a worker.
- 11 visualizer templates.
- Grand piano uses bundled Salamander samples. Soft piano uses separate soft-strike Salamander recordings with a gentler attack and treble rolloff. Acoustic guitar uses clean Iowa recordings edited by N. P. Brosowsky. Electric keys and Synth use local synthesis. A piano file's multiple tracks play together through the selected instrument.
- Cinematic mode. Press C to enter; press C again or Esc to exit. Space pauses/resumes without leaving cinematic mode. Entry and exit use matching subtle 240 ms zoom/fades, disabled when reduced motion is preferred.
- Auto, 60, or 120 FPS caps and three render quality options. Auto follows the screen.
- MP4 (H.264/AAC) or WebM (VP9/Opus), according to encoder availability; 720p/1080p, 30/60 FPS, landscape/square/portrait. Exports include stereo audio and omit all controls.
- GIF of the first eight seconds, 640×360 at 15 FPS. GIF format cannot support sound.
- MIT code license.

## Architecture

See [docs/VISUALIZERS.md](docs/VISUALIZERS.md) for every template's rules.

React manages controls. Canvas 2D draws animation independently. Native Web Audio schedules instruments. `@tonejs/midi` reads MIDI. Mediabunny encodes videos, and gifenc produces GIFs.

The same Canvas 2D renderer and Web Audio voice functions serve live playback, previews, and export.

## Credits

Demo MIDI was made by flojy. As well as this whole project.

Sample licensing: [THIRD_PARTY.md](THIRD_PARTY.md).
