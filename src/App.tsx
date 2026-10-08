import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  ChevronDown,
  Code2,
  Keyboard,
  LoaderCircle,
  Maximize2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { AudioEngine, instruments, renderAudio, type Instrument } from './audio/engine';
import { createDemo, formatTime, type Song } from './midi/parser';
import { DEMO_AUTHOR, loadDemoSong } from './midi/demo';
import { templates, type Template } from './visualizers/templates';
import VisualCanvas from './components/VisualCanvas';
import Modal from './components/Modal';
import type { ExportOptions } from './export/video';
import { createPreviews } from './visualizers/previews';
import { previewAudioSeconds } from './audio/previewAnalysis';

const placeholderPreview = createDemo();
const repositoryUrl = ''; // place it here
type Progress = { value: number; label: string };
type ModalKind = 'settings' | 'export' | 'about' | null;
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';

export default function App() {
  const [engine] = useState(() => new AudioEngine());
  const [song, setSong] = useState<Song>();
  const [playerVisible, setPlayerVisible] = useState(false);
  const [demoSong, setDemoSong] = useState<Song>();
  const [selected, setSelected] = useState(templates[0]);
  const [hovered, setHovered] = useState<string>();
  const [modal, setModal] = useState<ModalKind>(null);
  const [cinematic, setCinematic] = useState(false);
  const [cinematicExiting, setCinematicExiting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<Progress>();
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [instrument, setInstrument] = useState<Instrument>('grand');
  const [fps, setFps] = useState(0);
  const [measuredFps, setMeasuredFps] = useState(0);
  const [quality, setQuality] = useState(1.5);
  const [previewAudio, setPreviewAudio] = useState<AudioBuffer>();
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});
  const previewGeneration = useRef(0);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'mp4',
    fps: 60,
    height: 1080,
    aspect: 'wide',
  });
  const [support, setSupport] = useState<{ mp4: boolean; webm: boolean }>();
  const [exportProgress, setExportProgress] = useState<Progress>();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const exportController = useRef<AbortController | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null),
    uploadButton = useRef<HTMLButtonElement>(null),
    playerRef = useRef<HTMLElement>(null),
    galleryRef = useRef<HTMLElement>(null);
  const workerRef = useRef<Worker | undefined>(undefined);
  const busy = !!progress || exporting;

  useEffect(() => {
    let alive = true;
    const generation = previewGeneration.current;
    void loadDemoSong()
      .then(async (demo) => {
        if (!alive) return;
        setDemoSong(demo);
        const snippet = {
          ...demo,
          notes: demo.notes.filter((n) => n.start < previewAudioSeconds),
          duration: Math.min(demo.duration, previewAudioSeconds),
        };
        const buffer = await renderAudio(snippet, 'electric', new Map(), 0.7);
        const images = await createPreviews(demo, buffer);
        if (alive && generation === previewGeneration.current) {
          setPreviewAudio(buffer);
          setPreviewImages(images);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      workerRef.current?.terminate();
      engine.pause();
      exportController.current?.abort();
    };
  }, [engine]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaying(engine.playing);
      setTime(engine.time);
    }, 100);
    return () => clearInterval(timer);
  }, [engine]);
  useEffect(() => {
    if (!cinematicExiting) return;
    const timer = window.setTimeout(() => {
      setCinematic(false);
      setCinematicExiting(false);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [cinematicExiting]);
  useEffect(() => {
    if (!cinematic) return;
    const exit = (event: KeyboardEvent) => {
      if (event.repeat || (event.key.toLowerCase() !== 'c' && event.key !== 'Escape')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setCinematic(false);
        setCinematicExiting(false);
      } else {
        setCinematicExiting(true);
      }
    };
    window.addEventListener('keydown', exit, true);
    return () => {
      window.removeEventListener('keydown', exit, true);
    };
  }, [cinematic]);

  const togglePlayback = useCallback(async () => {
    if (!song || !playerVisible || busy) return;
    if (engine.playing) {
      engine.pause();
      setPlaying(false);
      return;
    }
    try {
      await engine.loadInstrument(instrument);
      engine.instrument = instrument;
      engine.play(song);
      setPlaying(true);
    } catch (error) {
      setError(errorMessage(error));
    }
  }, [engine, song, playerVisible, busy, instrument]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (cinematic) {
        if (event.code === 'Space' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          if (!event.repeat) void togglePlayback();
        }
        return;
      }
      if (
        modal ||
        busy ||
        !song ||
        !playerVisible ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof HTMLElement &&
          (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName) ||
            event.target.isContentEditable))
      )
        return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (!event.repeat) void togglePlayback();
      }
      if (event.key.toLowerCase() === 'c' && !event.repeat) setCinematic(true);
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        engine.seek(
          Math.max(0, Math.min(song.duration, engine.time + (event.key === 'ArrowRight' ? 5 : -5))),
        );
        setTime(engine.time);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [cinematic, modal, song, playerVisible, engine, togglePlayback, busy]);

  const returnToStarter = () => {
    engine.pause();
    setPlaying(false);
    setPlayerVisible(false);
    setCinematic(false);
    setCinematicExiting(false);
    setModal(null);
    setHovered(undefined);
    setError('');
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      uploadButton.current?.focus({ preventScroll: true });
    });
  };

  const prepare = async (next: Song) => {
    previewGeneration.current++;
    engine.reset();
    setPlaying(false);
    setTime(0);
    setError('');
    setProgress({ value: 0.2, label: 'Loading your instrument…' });
    await engine.loadInstrument(instrument, (done, total) =>
      setProgress({
        value: 0.2 + (done / total) * 0.35,
        label: `Loading instrument samples · ${done} / ${total}`,
      }),
    );
    engine.instrument = instrument;
    setProgress({ value: 0.55, label: 'Rendering a short audio preview…' });
    const snippet = {
      ...next,
      notes: next.notes.filter((n) => n.start < previewAudioSeconds),
      duration: Math.min(next.duration, previewAudioSeconds),
    };
    const buffer = await renderAudio(snippet, instrument, engine.samples, 0.7);
    const images = await createPreviews(next, buffer, (done, total) =>
      setProgress({
        value: 0.65 + (done / total) * 0.35,
        label: `Preparing visualizer previews · ${done} / ${total}`,
      }),
    );
    setPreviewAudio(buffer);
    setPreviewImages(images);
    setSong(next);
    setPlayerVisible(true);
    setProgress(undefined);
    requestAnimationFrame(() =>
      playerRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }),
    );
  };

  const loadDemo = async (template?: Template) => {
    if (busy) return;
    if (template) setSelected(template);
    try {
      setProgress({ value: 0.05, label: 'Opening the demo…' });
      await engine.init();
      const demo = await loadDemoSong();
      setDemoSong(demo);
      await prepare(demo);
    } catch (error) {
      setError(errorMessage(error));
      setProgress(undefined);
    }
  };

  const upload = async (file?: File) => {
    if (!file || busy) return;
    setError('');
    if (!/\.(mid|midi)$/i.test(file.name)) {
      setError('Choose a .mid or .midi file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Please choose a MIDI file smaller than 20 MB.');
      return;
    }
    engine.reset();
    setProgress({ value: 0.05, label: 'Reading your MIDI…' });
    try {
      await engine.init();
      const buffer = await file.arrayBuffer();
      const parsed = await new Promise<Song>((resolve, reject) => {
        const worker = new Worker(new URL('./midi/worker.ts', import.meta.url), {
          type: 'module',
        });
        workerRef.current = worker;
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('This MIDI took too long to process. Try a smaller file.'));
        }, 30_000);
        worker.onmessage = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.song);
        };
        worker.onerror = () => {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error('Unable to parse this MIDI file.'));
        };
        worker.postMessage({ buffer, name: file.name }, [buffer]);
      });
      await prepare(parsed);
    } catch (error) {
      setError(errorMessage(error));
      setProgress(undefined);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const changeInstrument = async (next: Instrument) => {
    previewGeneration.current++;
    const previous = instrument;
    engine.pause();
    setPlaying(false);
    setInstrument(next);
    try {
      setProgress({ value: 0.1, label: 'Preparing instrument…' });
      await engine.loadInstrument(next, (done, total) =>
        setProgress({
          value: (done / total) * 0.8,
          label: `Loading instrument samples · ${done} / ${total}`,
        }),
      );
      const source = song ?? demoSong;
      engine.instrument = next;
      if (!source) return;
      const buffer = await renderAudio(
        {
          ...source,
          notes: source.notes.filter((n) => n.start < previewAudioSeconds),
          duration: Math.min(previewAudioSeconds, source.duration),
        },
        next,
        engine.samples,
        0.7,
      );
      const images = await createPreviews(source, buffer, (done, total) =>
        setProgress({
          value: 0.8 + (done / total) * 0.2,
          label: `Refreshing previews · ${done} / ${total}`,
        }),
      );
      engine.instrument = next;
      setPreviewAudio(buffer);
      setPreviewImages(images);
    } catch (error) {
      setInstrument(previous);
      setError(errorMessage(error));
    } finally {
      setProgress(undefined);
    }
  };

  const openExport = async () => {
    setModal('export');
    setExportError('');
    setExportProgress(undefined);
    engine.pause();
    setPlaying(false);
    try {
      const module = await import('./export/video');
      const available = await module.exportSupport();
      setSupport(available);
      setExportOptions((previous) => ({ ...previous, format: available.mp4 ? 'mp4' : 'webm' }));
    } catch (error) {
      setExportError(errorMessage(error));
    }
  };
  const startExport = async () => {
    if (!song || exporting) return;
    if (song.duration > 600) {
      setExportError(
        'Browser export currently supports songs up to 10 minutes to keep audio memory bounded. Live playback still supports longer files.',
      );
      return;
    }
    setExportError('');
    setExporting(true);
    const controller = new AbortController();
    exportController.current = controller;
    try {
      const { exportVideo } = await import('./export/video');
      await exportVideo(song, selected, engine, exportOptions, controller.signal, (value, label) =>
        setExportProgress({ value, label }),
      );
    } catch (error) {
      if (!controller.signal.aborted) setExportError(errorMessage(error));
      else setExportProgress({ value: 0, label: 'Export cancelled.' });
    } finally {
      setExporting(false);
    }
  };
  const startGif = async () => {
    if (!song || exporting) return;
    setExportError('');
    setExporting(true);
    const controller = new AbortController();
    exportController.current = controller;
    try {
      const { exportGif } = await import('./export/gif');
      await exportGif(song, selected, engine, controller.signal, (value, label) =>
        setExportProgress({ value, label }),
      );
    } catch (error) {
      if (!controller.signal.aborted) setExportError(errorMessage(error));
      else setExportProgress({ value: 0, label: 'Export cancelled.' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className={`app${cinematic ? ' is-cinematic' : ''}${cinematicExiting ? ' cinematic-exiting' : ''}`}
    >
      <input
        ref={fileInput}
        type="file"
        accept=".mid,.midi,audio/midi,audio/x-midi"
        className="visually-hidden"
        aria-label="Choose a MIDI file"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <header className="site-header">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="web-midi-visualizer home">
          <span className="brand-icon">
            <AudioLines size={22} />
          </span>
          <span>
            <span className="brand-muted">web-midi-visualizer</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button onClick={() => galleryRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            Visualizers <span className="nav-count">{templates.length}</span>
          </button>
          <button onClick={() => setModal('about')}>
            How it works <ArrowRight size={13} />
          </button>
          <a
            className="source-link"
            href={repositoryUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            role="link"
            aria-disabled={!repositoryUrl || undefined}
            aria-label={
              repositoryUrl ? 'Source code (opens in a new tab)' : 'Source code (coming soon)'
            }
            title={repositoryUrl ? 'Source code' : 'Repository coming soon'}
          >
            <Code2 size={16} aria-hidden="true" />
            <span>Source code</span>
          </a>
          <span className="nav-divider" />
          <button
            className="icon-button"
            onClick={() => setModal('settings')}
            aria-label="Settings"
          >
            <Settings2 size={18} />
          </button>
        </nav>
      </header>

      <main>
        {!playerVisible && (
          <section className="hero">
            <h1>Free online MIDI visualizer</h1>
            <p>Turn MIDI files into animated visuals with instrument playback and video export.</p>
            <button
              ref={uploadButton}
              className={`drop-zone ${dragging ? 'dragging' : ''}`}
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void upload(event.dataTransfer.files[0]);
              }}
            >
              <span className="drop-corner top-left" />
              <span className="drop-corner top-right" />
              <span className="drop-corner bottom-left" />
              <span className="drop-corner bottom-right" />
              <span className="upload-icon">
                {progress ? (
                  <LoaderCircle className="spin" size={25} />
                ) : (
                  <Upload size={25} strokeWidth={1.4} />
                )}
              </span>
              <strong>
                {dragging
                  ? 'Let your music in.'
                  : progress
                    ? progress.label
                    : 'Drop your MIDI here'}
              </strong>
              <span className="drop-caption">
                or <span>browse files</span> on your computer
              </span>
              <span className="file-types">
                .mid / .midi <span>·</span> up to 20 MB
              </span>
              {progress && <progress value={progress.value} max={1} />}
            </button>
            <div className="demo-line">
              Just looking around?{' '}
              <button disabled={busy} onClick={() => void loadDemo()}>
                <Play size={12} fill="currentColor" /> Try a demo <ArrowRight size={13} />
              </button>
            </div>
            <p className="demo-credit">Demo MIDI by {DEMO_AUTHOR}</p>
          </section>
        )}

        {error && (
          <div className="notice error" role="alert">
            <span>{error}</span>
            <button className="icon-button" onClick={() => setError('')} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        )}

        {song && playerVisible && (
          <section className="player-section" ref={playerRef}>
            <div className="player-heading">
              <div>
                <span className="eyebrow">YOUR SESSION</span>
                <h1>{song.name}</h1>
                {song.author && <p className="song-credit">MIDI by {song.author}</p>}
                <p>
                  {song.notes.length.toLocaleString()} notes <span>·</span> {song.bpm} BPM{' '}
                  <span>·</span> {song.tracks} {song.tracks === 1 ? 'track' : 'tracks'}
                </p>
              </div>
              <button className="secondary-button" disabled={busy} onClick={returnToStarter}>
                <ArrowLeft size={15} /> Return
              </button>
            </div>
            <div className="player-surface">
              <VisualCanvas
                song={song}
                template={selected}
                engine={engine}
                fps={fps}
                quality={quality}
                onFps={setMeasuredFps}
              />
              <div className="visual-label">
                <span className="status-dot" />
                {selected.name.toUpperCase()}
              </div>
              <div className="frame-counter">{measuredFps} fps</div>
              <button
                className="cinematic-button"
                disabled={busy}
                onClick={() => setCinematic(true)}
                title="Cinematic mode (C)"
              >
                <Maximize2 size={15} />
                <span>Cinematic</span>
                <kbd>C</kbd>
              </button>
            </div>
            <div className="transport">
              <div className="transport-main">
                <button
                  className="icon-button restart"
                  disabled={busy}
                  onClick={() => {
                    engine.seek(0);
                    setTime(0);
                  }}
                  aria-label="Restart"
                >
                  <RotateCcw size={17} />
                </button>
                <button
                  className="play-button"
                  disabled={busy}
                  onClick={() => void togglePlayback()}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? (
                    <Pause size={17} fill="currentColor" />
                  ) : (
                    <Play size={17} fill="currentColor" />
                  )}
                </button>
                <span className="current-time">{formatTime(time)}</span>
                <input
                  className="seek"
                  type="range"
                  min={0}
                  max={song.duration}
                  step={0.01}
                  value={time}
                  disabled={busy}
                  aria-label="Playback position"
                  style={
                    { '--progress': `${(time / song.duration) * 100}%` } as React.CSSProperties
                  }
                  onChange={(event) => {
                    const next = +event.target.value;
                    engine.seek(next);
                    setTime(next);
                  }}
                />
                <span className="duration">{formatTime(song.duration)}</span>
                <Volume2 size={16} className="volume-icon" />
                <input
                  className="volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  disabled={exporting}
                  aria-label="Volume"
                  onChange={(event) => {
                    const next = +event.target.value;
                    setVolume(next);
                    engine.setVolume(next);
                  }}
                />
              </div>
              <div className="transport-bottom">
                <button
                  className="instrument-trigger"
                  onClick={() => setModal('settings')}
                  disabled={busy}
                >
                  <Music2 size={14} />
                  {instruments.find((i) => i.id === instrument)?.name}
                  <ChevronDown size={12} />
                </button>
                <span className="transport-hint">
                  <kbd>space</kbd> to play / pause
                </span>
                <button
                  className="export-trigger"
                  disabled={busy}
                  onClick={() => void openExport()}
                >
                  <ArrowDownToLine size={14} /> Export video <ArrowRight size={13} />
                </button>
              </div>
            </div>
            {progress && (
              <div className="inline-progress" role="status">
                <LoaderCircle size={15} className="spin" />
                <span>{progress.label}</span>
                <progress value={progress.value} max={1} />
              </div>
            )}
          </section>
        )}

        <section className="gallery" id="visualizers" ref={galleryRef}>
          <div className="gallery-heading">
            <div>
              <div className="eyebrow">FIND YOUR STYLE</div>
              <h2>Discover the visuals</h2>
            </div>
          </div>
          <div className="template-grid">
            {templates.map((template) => (
              <button
                key={template.id}
                className={`template-card ${song && selected.id === template.id ? 'selected' : ''}`}
                disabled={busy}
                aria-label={`Select ${template.name}`}
                aria-pressed={!!song && selected.id === template.id}
                onMouseEnter={() => setHovered(template.id)}
                onMouseLeave={() => setHovered(undefined)}
                onFocus={() => setHovered(template.id)}
                onBlur={() => setHovered(undefined)}
                onClick={() => {
                  if (!song) void loadDemo(template);
                  else {
                    setSelected(template);
                    setPlayerVisible(true);
                    requestAnimationFrame(() =>
                      playerRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }),
                    );
                  }
                }}
              >
                <div className="template-art" style={{ background: template.background }}>
                  {hovered === template.id || !previewImages[template.id] ? (
                    <VisualCanvas
                      song={song ?? demoSong ?? placeholderPreview}
                      template={template}
                      preview
                      animate={hovered === template.id}
                      previewAudio={previewAudio}
                    />
                  ) : (
                    <img
                      className="preview-image"
                      src={previewImages[template.id]}
                      alt={`${template.name} preview`}
                      loading="lazy"
                    />
                  )}
                  <span className={`template-number ${template.light ? 'dark-ink' : ''}`}>
                    {String(templates.indexOf(template) + 1).padStart(2, '0')}
                  </span>
                  {song && selected.id === template.id ? (
                    <span className="selected-badge">
                      <Check size={12} /> SELECTED
                    </span>
                  ) : (
                    <span className="preview-arrow">
                      <ArrowRight size={18} />
                    </span>
                  )}
                </div>
                <div className="template-title">
                  <h3>{template.name}</h3>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="principles">
          <div>
            <Maximize2 size={19} />
            <h3>Cinematic mode</h3>
            <p>
              Press C to enter cinematic mode.
              <br />
              Press C or Esc to leave.
            </p>
          </div>
          <div>
            <SlidersHorizontal size={19} />
            <h3>Built with math</h3>
            <p>Each visual follows mathematical rules.</p>
          </div>
          <div>
            <Code2 size={19} />
            <h3>Open source</h3>
            <p>The project is open source.</p>
          </div>
        </section>
      </main>

      {modal === 'settings' && (
        <Modal title="Make it yours" onClose={() => setModal(null)}>
          <p className="modal-description">A few small adjustments. A different feeling.</p>
          <label className="field-label" htmlFor="instrument">
            INSTRUMENT
          </label>
          <select
            id="instrument"
            value={instrument}
            disabled={busy}
            onChange={(event) => void changeInstrument(event.target.value as Instrument)}
          >
            {instruments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {item.description}
              </option>
            ))}
          </select>
          <p className="field-note">
            Instrument changes pause playback and refresh audio previews.
          </p>
          <label className="field-label" htmlFor="frame-rate">
            FRAME RATE
          </label>
          <select id="frame-rate" value={fps} onChange={(event) => setFps(+event.target.value)}>
            <option value={0}>Auto · follow your display</option>
            <option value={60}>60 FPS</option>
            <option value={120}>120 FPS</option>
          </select>
          <p className="field-note">Actual frame rate depends on your screen and device.</p>
          <label className="field-label" htmlFor="quality">
            RENDER QUALITY
          </label>
          <select
            id="quality"
            value={quality}
            onChange={(event) => setQuality(+event.target.value)}
          >
            <option value={1}>Efficient · standard resolution, fewer effects</option>
            <option value={1.5}>Balanced · recommended</option>
            <option value={2}>High · sharper on high-density displays</option>
          </select>
          {progress && (
            <div className="inline-progress" role="status">
              <span>{progress.label}</span>
              <progress value={progress.value} max={1} />
            </div>
          )}
          <div className="shortcut-box">
            <Keyboard size={17} />
            <div>
              <span>
                <kbd>space</kbd> Play / pause
              </span>
              <span>
                <kbd>←</kbd>
                <kbd>→</kbd> Seek 5 seconds
              </span>
              <span>
                <kbd>C</kbd> Cinematic mode
              </span>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'export' && (
        <Modal
          title="Take the music with you"
          onClose={() => {
            exportController.current?.abort();
            setModal(null);
          }}
        >
          <p className="modal-description">
            Export {selected.name.toLowerCase()} with your selected instrument. No interface. Just
            the music.
          </p>
          <div className="field-row">
            <div>
              <label className="field-label" htmlFor="export-format">
                FORMAT
              </label>
              <select
                id="export-format"
                value={exportOptions.format}
                disabled={exporting || !support}
                onChange={(e) =>
                  setExportOptions((o) => ({ ...o, format: e.target.value as 'mp4' | 'webm' }))
                }
              >
                <option value="mp4" disabled={!support?.mp4}>
                  MP4 · H.264 + AAC
                </option>
                <option value="webm" disabled={!support?.webm}>
                  WebM · VP9 + Opus
                </option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="export-resolution">
                RESOLUTION
              </label>
              <select
                id="export-resolution"
                value={exportOptions.height}
                disabled={exporting}
                onChange={(e) => setExportOptions((o) => ({ ...o, height: +e.target.value }))}
              >
                <option value={720}>720p</option>
                <option value={1080}>1080p</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div>
              <label className="field-label" htmlFor="export-fps">
                FRAME RATE
              </label>
              <select
                id="export-fps"
                value={exportOptions.fps}
                disabled={exporting}
                onChange={(e) => setExportOptions((o) => ({ ...o, fps: +e.target.value }))}
              >
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="export-aspect">
                ASPECT RATIO
              </label>
              <select
                id="export-aspect"
                value={exportOptions.aspect}
                disabled={exporting}
                onChange={(e) =>
                  setExportOptions((o) => ({
                    ...o,
                    aspect: e.target.value as ExportOptions['aspect'],
                  }))
                }
              >
                <option value="wide">16:9 · landscape</option>
                <option value="square">1:1 · square</option>
                <option value="portrait">9:16 · portrait</option>
              </select>
            </div>
          </div>
          <p className="field-note">
            Rendered locally, frame by frame. Keep this tab open. Longer songs take more time and
            memory. Browser export supports up to 10 minutes.
          </p>
          {!support && !exportError && (
            <p className="field-note">Checking your browser’s encoders…</p>
          )}
          {support && !support.mp4 && (
            <p className="field-note">
              This browser cannot encode MP4 with audio.{' '}
              {support.webm
                ? 'WebM is available instead.'
                : 'Try a current Chrome or Edge browser for video export.'}
            </p>
          )}
          {exportProgress && (
            <div className="export-progress" role="status">
              <progress max={1} value={exportProgress.value} />
              <span>{exportProgress.label}</span>
            </div>
          )}
          {exportError && (
            <p className="error-text" role="alert">
              {exportError}
            </p>
          )}
          <button
            className="primary-button"
            disabled={!exporting && (!support || (!support.mp4 && !support.webm))}
            onClick={() => (exporting ? exportController.current?.abort() : void startExport())}
          >
            {exporting ? (
              <>
                <X size={16} /> Cancel export
              </>
            ) : (
              <>
                <ArrowDownToLine size={16} /> Export video
              </>
            )}
          </button>
          <button
            className="secondary-button gif-button"
            disabled={exporting}
            onClick={() => void startGif()}
          >
            Export short GIF <span>8 seconds · 640 × 360 · silent</span>
          </button>
          {(instrument === 'grand' || instrument === 'soft') && (
            <p className="sample-credit">
              Piano audio uses Salamander Grand Piano by Alexander Holm (CC BY 3.0). Please credit
              the samples when sharing piano exports.
            </p>
          )}
          {instrument === 'guitar' && (
            <p className="sample-credit">
              Acoustic guitar samples: University of Iowa, edited by N. P. Brosowsky
              (tonejs-instruments, CC BY 3.0). Please credit the samples when sharing guitar
              exports.
            </p>
          )}
        </Modal>
      )}

      {modal === 'about' && (
        <Modal title="Music in. Motion out." onClose={() => setModal(null)}>
          <p className="modal-description">
            web-midi-visualizer is free and open-source. Everything happens in your browser.
          </p>
          <div className="how-step">
            <span>01</span>
            <div>
              <h3>Read the notes</h3>
              <p>
                Your MIDI becomes a timeline of pitches, velocities, durations, and pedal events.
                Tempo changes are converted into seconds.
              </p>
            </div>
          </div>
          <div className="how-step">
            <span>02</span>
            <div>
              <h3>Give them a voice</h3>
              <p>
                A sampled piano, acoustic guitar, or synthesized instrument plays the timeline. The
                audio clock keeps music and motion together.
              </p>
            </div>
          </div>
          <div className="how-step">
            <span>03</span>
            <div>
              <h3>Draw a perspective</h3>
              <p>
                Each template maps musical data to shapes. Audio templates measure the actual
                waveform and frequency energy.
              </p>
            </div>
          </div>
          <div className="about-tech">
            <Code2 size={16} />
            <span>React · TypeScript · Canvas 2D · Web Audio</span>
          </div>
          <p className="sample-credit">
            Piano samples:{' '}
            <a
              href="https://github.com/sfzinstruments/SalamanderGrandPiano"
              target="_blank"
              rel="noreferrer"
            >
              Salamander Grand Piano
            </a>{' '}
            by Alexander Holm,{' '}
            <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
              CC BY 3.0
            </a>
            . Grand piano MP3 conversions from Tone.js; Soft piano uses separately prepared
            soft-strike recordings.
          </p>
          <p className="sample-credit">
            Acoustic guitar samples: University of Iowa, edited by N. P. Brosowsky in{' '}
            <a
              href="https://github.com/nbrosowsky/tonejs-instruments"
              target="_blank"
              rel="noreferrer"
            >
              tonejs-instruments
            </a>{' '}
            (
            <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
              CC BY 3.0
            </a>
            ). Demo MIDI by {DEMO_AUTHOR}.
          </p>
        </Modal>
      )}
    </div>
  );
}
