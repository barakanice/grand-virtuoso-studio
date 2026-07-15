import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import { Piano } from "@/components/Piano";
import { FallingNotes } from "@/components/FallingNotes";
import { BeatMaker } from "@/components/BeatMaker";
import { AiComposer } from "@/components/AiComposer";
import { piano, type InstrumentName } from "@/lib/piano-engine";
import { SONGS, type Song } from "@/lib/songs";
import { exportPianoMidi } from "@/lib/midi-export";
import { Music, Play, Pause, Square, Circle, Volume2, Sparkles, GraduationCap, Gamepad2, Piano as PianoIcon, Drum, Download, Wand2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Virtual Grand Piano Pro — Play, Learn, Compose" },
      { name: "description", content: "A professional virtual grand piano: 88 keys, multiple instruments, learn mode with falling notes, recording, and studio-grade audio effects." },
      { property: "og:title", content: "Virtual Grand Piano Pro" },
      { property: "og:description", content: "Play, learn, and compose on a studio-grade virtual grand piano." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

type Mode = "free" | "learn" | "challenge" | "producer" | "ai";

type RecordedEvent = { note: string; t: number; type: "on" | "off" };

function Studio() {
  const [mode, setMode] = useState<Mode>("free");
  const [instrument, setInstrument] = useState<InstrumentName>("grand");
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [sustain, setSustain] = useState(false);
  const [volume, setVolume] = useState(-6);
  const [reverb, setReverb] = useState(0.25);
  const [ready, setReady] = useState(false);

  // Metronome
  const [metronome, setMetronome] = useState(false);
  const [bpm, setBpm] = useState(100);
  const metroRef = useRef<Tone.Loop | null>(null);
  const metroSynth = useRef<Tone.MembraneSynth | null>(null);

  // Recording
  const [recording, setRecording] = useState(false);
  const recStart = useRef(0);
  const recEvents = useRef<RecordedEvent[]>([]);
  const [hasRecording, setHasRecording] = useState(false);

  // Learn mode
  const [song, setSong] = useState<Song | null>(SONGS[0]);
  const [learnPlaying, setLearnPlaying] = useState(false);
  const [score, setScore] = useState({ hit: 0, miss: 0, combo: 0, best: 0 });
  const upcomingNotes = useMemo(() => {
    if (!song || mode !== "learn") return new Set<string>();
    // highlight next 2 unique notes
    return new Set(song.notes.slice(0, 2).map((n) => n.note));
  }, [song, mode]);

  useEffect(() => {
    piano.setInstrument(instrument);
  }, [instrument]);
  useEffect(() => piano.setVolume(volume), [volume]);
  useEffect(() => piano.setReverb(reverb), [reverb]);
  useEffect(() => piano.setSustain(sustain), [sustain]);

  const ensureReady = useCallback(async () => {
    if (ready) return;
    await piano.init();
    setReady(true);
  }, [ready]);

  const noteOn = useCallback((note: string) => {
    piano.noteOn(note);
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.add(note);
      return next;
    });
    if (recording) {
      recEvents.current.push({ note, t: performance.now() - recStart.current, type: "on" });
    }
  }, [recording]);

  const noteOff = useCallback((note: string) => {
    piano.noteOff(note);
    setActiveNotes((prev) => {
      if (!prev.has(note)) return prev;
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
    if (recording) {
      recEvents.current.push({ note, t: performance.now() - recStart.current, type: "off" });
    }
  }, [recording]);

  // Metronome control
  useEffect(() => {
    if (!ready) return;
    Tone.Transport.bpm.value = bpm;
    if (metronome) {
      if (!metroSynth.current) {
        metroSynth.current = new Tone.MembraneSynth().toDestination();
      }
      metroRef.current?.dispose();
      metroRef.current = new Tone.Loop((time) => {
        metroSynth.current?.triggerAttackRelease("C2", "16n", time);
      }, "4n").start(0);
      Tone.Transport.start();
    } else {
      metroRef.current?.dispose();
      metroRef.current = null;
      Tone.Transport.stop();
    }
  }, [metronome, bpm, ready]);

  const startRecording = async () => {
    await ensureReady();
    recEvents.current = [];
    recStart.current = performance.now();
    setRecording(true);
    setHasRecording(false);
  };
  const stopRecording = () => {
    setRecording(false);
    setHasRecording(recEvents.current.length > 0);
  };
  const playRecording = async () => {
    await ensureReady();
    const events = recEvents.current;
    if (!events.length) return;
    for (const ev of events) {
      setTimeout(() => {
        if (ev.type === "on") noteOn(ev.note);
        else noteOff(ev.note);
      }, ev.t);
    }
  };

  const startLearn = async () => {
    await ensureReady();
    setScore({ hit: 0, miss: 0, combo: 0, best: 0 });
    setLearnPlaying(true);
  };
  const stopLearn = () => setLearnPlaying(false);

  // Auto-play the current song for demonstration (Teach button)
  const teachTimers = useRef<number[]>([]);
  const teachSong = async () => {
    if (!song) return;
    await ensureReady();
    teachTimers.current.forEach((id) => clearTimeout(id));
    teachTimers.current = [];
    const secPerBeat = 60 / song.bpm;
    song.notes.forEach((n) => {
      const startMs = n.time * secPerBeat * 1000;
      const durMs = n.duration * secPerBeat * 1000;
      const on = window.setTimeout(() => {
        piano.playNote(n.note, `${Math.max(0.1, n.duration * secPerBeat)}`, 0.75);
        setActiveNotes((prev) => new Set(prev).add(n.note));
      }, startMs);
      const off = window.setTimeout(() => {
        setActiveNotes((prev) => {
          const next = new Set(prev);
          next.delete(n.note);
          return next;
        });
      }, startMs + durMs);
      teachTimers.current.push(on, off);
    });
  };

  const clearAll = () => {
    teachTimers.current.forEach((id) => clearTimeout(id));
    teachTimers.current = [];
    piano.stopAll();
    setActiveNotes(new Set());
    setLearnPlaying(false);
    setRecording(false);
  };

  const onLearnHit = useCallback((note: string) => {
    // auto-play the note as demo assist
    piano.playNote(note, "8n", 0.7);
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.add(note);
      return next;
    });
    setTimeout(() => {
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    }, 220);
    setScore((s) => {
      const combo = s.combo + 1;
      return { ...s, hit: s.hit + 1, combo, best: Math.max(s.best, combo) };
    });
  }, []);

  const instruments: { key: InstrumentName; label: string }[] = [
    { key: "grand", label: "Grand" },
    { key: "soft", label: "Soft" },
    { key: "electric", label: "Electric" },
    { key: "jazz", label: "Jazz" },
    { key: "classical", label: "Classical" },
    { key: "synth", label: "Synth" },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header className="mx-auto mb-6 flex max-w-[1600px] items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 shadow-[0_0_30px_var(--glow)]">
            <PianoIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gold-text md:text-3xl">Virtual Grand Piano Pro</h1>
            <p className="text-xs text-muted-foreground md:text-sm">Studio-grade piano · 88 keys · Learn · Compose</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <Sparkles className="h-4 w-4 text-gold" /> {ready ? "Audio engine ready" : "Tap any key to start audio"}
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-4">
        {/* Mode switcher */}
        <div className="studio-panel flex flex-wrap items-center gap-2 rounded-xl p-3">
          <ModeButton icon={<Music className="h-4 w-4" />} label="Free Play" active={mode === "free"} onClick={() => setMode("free")} />
          <ModeButton icon={<GraduationCap className="h-4 w-4" />} label="Learn" active={mode === "learn"} onClick={() => setMode("learn")} />
          <ModeButton icon={<Gamepad2 className="h-4 w-4" />} label="Challenge" active={mode === "challenge"} onClick={() => setMode("challenge")} />
          <ModeButton icon={<Drum className="h-4 w-4" />} label="Producer" active={mode === "producer"} onClick={() => setMode("producer")} />
          <div className="mx-2 h-6 w-px bg-border" />
          {instruments.map((inst) => (
            <button
              key={inst.key}
              onClick={() => setInstrument(inst.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                instrument === inst.key
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_var(--glow)]"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              }`}
            >
              {inst.label}
            </button>
          ))}
          <button
            onClick={clearAll}
            className="ml-auto rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:opacity-90"
          >
            Clear All
          </button>
        </div>

        {/* Learn mode song picker + score */}
        {mode === "learn" && (
          <div className="studio-panel flex flex-wrap items-center gap-3 rounded-xl p-3">
            <span className="text-sm font-semibold text-muted-foreground">Song:</span>
            {SONGS.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSong(s); setLearnPlaying(false); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  song?.id === s.id ? "bg-accent text-accent-foreground" : "bg-secondary hover:bg-secondary/70"
                }`}
              >
                {s.title} <span className="opacity-60">· {s.difficulty}</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 text-xs">
              <Stat label="Hits" value={score.hit} />
              <Stat label="Combo" value={score.combo} />
              <Stat label="Best" value={score.best} />
              <button onClick={teachSong} className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 font-semibold text-accent-foreground">
                <GraduationCap className="h-3.5 w-3.5" /> Teach
              </button>
              {!learnPlaying ? (
                <button onClick={startLearn} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground">
                  <Play className="h-3.5 w-3.5" /> Start
                </button>
              ) : (
                <button onClick={stopLearn} className="flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 font-semibold text-destructive-foreground">
                  <Square className="h-3.5 w-3.5" /> Stop
                </button>
              )}
              <button onClick={clearAll} className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 font-semibold hover:bg-secondary/70">
                <Square className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
        )}

        {/* Falling notes runway */}
        {mode === "learn" && (
          <div className="overflow-x-auto rounded-t-xl">
            <FallingNotes
              song={song}
              playing={learnPlaying}
              onNoteHit={onLearnHit}
              onFinish={() => setLearnPlaying(false)}
            />
          </div>
        )}

        {/* Producer / Beat Maker */}
        {mode === "producer" && <BeatMaker onReady={ensureReady} />}


        {/* Piano */}
        <div onMouseDown={ensureReady} onTouchStart={ensureReady}>
          <Piano
            activeNotes={activeNotes}
            upcomingNotes={upcomingNotes}
            onNoteOn={noteOn}
            onNoteOff={noteOff}
            showLabels
          />
        </div>

        {/* Bottom studio controls */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Transport */}
          <div className="studio-panel rounded-xl p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Circle className="h-3.5 w-3.5 text-destructive" /> RECORDER
            </h3>
            <div className="flex items-center gap-2">
              {!recording ? (
                <button onClick={startRecording} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground">
                  <Circle className="h-4 w-4 fill-current" /> Record
                </button>
              ) : (
                <button onClick={stopRecording} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold">
                  <Square className="h-4 w-4" /> Stop
                </button>
              )}
              <button
                onClick={playRecording}
                disabled={!hasRecording}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                <Play className="h-4 w-4" /> Playback
              </button>
            </div>
            <button
              onClick={() => exportPianoMidi(recEvents.current, bpm, "piano-recording.mid")}
              disabled={!hasRecording}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"
            >
              <Download className="h-4 w-4" /> Export MIDI
            </button>
            <div className="mt-2 text-xs text-muted-foreground">
              {recording ? "Recording…" : hasRecording ? "Recording ready" : "No recording yet"}
            </div>
          </div>

          {/* Metronome */}
          <div className="studio-panel rounded-xl p-4">
            <h3 className="mb-3 text-sm font-bold text-muted-foreground">METRONOME</h3>
            <div className="mb-3 flex items-center gap-2">
              <button
                onClick={async () => { await ensureReady(); setMetronome((m) => !m); }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                  metronome ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                {metronome ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {metronome ? "Stop" : "Start"}
              </button>
              <div className="ml-auto font-mono text-2xl gold-text">{bpm}</div>
              <span className="text-xs text-muted-foreground">BPM</span>
            </div>
            <input
              type="range" min={40} max={220} value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-full accent-[color:var(--primary)]"
            />
          </div>

          {/* FX */}
          <div className="studio-panel rounded-xl p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Volume2 className="h-4 w-4" /> STUDIO FX
            </h3>
            <label className="mb-2 flex items-center justify-between text-xs">
              <span>Volume</span><span className="font-mono">{volume} dB</span>
            </label>
            <input type="range" min={-40} max={0} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="mb-3 w-full accent-[color:var(--primary)]" />
            <label className="mb-2 flex items-center justify-between text-xs">
              <span>Reverb</span><span className="font-mono">{Math.round(reverb * 100)}%</span>
            </label>
            <input type="range" min={0} max={100} value={reverb * 100} onChange={(e) => setReverb(Number(e.target.value) / 100)} className="mb-3 w-full accent-[color:var(--primary)]" />
            <button
              onClick={() => setSustain((s) => !s)}
              className={`w-full rounded-lg py-2 text-sm font-semibold transition-all ${
                sustain ? "bg-accent text-accent-foreground shadow-[0_0_20px_var(--glow)]" : "bg-secondary"
              }`}
            >
              Sustain Pedal {sustain ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        <div className="studio-panel rounded-xl p-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Keyboard shortcuts:</span> Z S X D C V G B H N J M · Q 2 W 3 E R 5 T 6 Y 7 U · I 9 O 0 P — spans C3 to E5. Space (hold) is not used; use the Sustain button for damper effect.
        </div>
      </div>
    </main>
  );
}

function ModeButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
        active ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_0_25px_var(--glow)]" : "bg-secondary hover:bg-secondary/70"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-secondary px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}
