import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { Play, Square, Trash2, Drum } from "lucide-react";

type Track = {
  id: string;
  name: string;
  key: string; // keyboard shortcut
  color: string;
  trigger: (time: number) => void;
};

const STEPS = 16;

export function BeatMaker({ onReady }: { onReady: () => Promise<void> }) {
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(90);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(-6);
  const [current, setCurrent] = useState(-1);

  const busRef = useRef<Tone.Volume | null>(null);
  const kickRef = useRef<Tone.MembraneSynth | null>(null);
  const snareRef = useRef<Tone.NoiseSynth | null>(null);
  const hatRef = useRef<Tone.MetalSynth | null>(null);
  const openHatRef = useRef<Tone.MetalSynth | null>(null);
  const clapRef = useRef<Tone.NoiseSynth | null>(null);
  const tomRef = useRef<Tone.MembraneSynth | null>(null);
  const rimRef = useRef<Tone.MetalSynth | null>(null);
  const crashRef = useRef<Tone.MetalSynth | null>(null);

  const seqRef = useRef<Tone.Sequence | null>(null);

  const initial = (): boolean[][] =>
    Array.from({ length: 8 }, () => Array(STEPS).fill(false));
  const [pattern, setPattern] = useState<boolean[][]>(initial);

  // Init instruments once
  useEffect(() => {
    const bus = new Tone.Volume(volume).toDestination();
    busRef.current = bus;
    kickRef.current = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 } }).connect(bus);
    snareRef.current = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } }).connect(bus);
    hatRef.current = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.05, release: 0.02 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 } as never).connect(bus);
    openHatRef.current = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.3, release: 0.2 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 } as never).connect(bus);
    clapRef.current = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.002, decay: 0.15, sustain: 0 } }).connect(bus);
    tomRef.current = new Tone.MembraneSynth({ pitchDecay: 0.1, octaves: 4 }).connect(bus);
    rimRef.current = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.04, release: 0.02 }, harmonicity: 3.1, modulationIndex: 16, resonance: 2000, octaves: 0.5 } as never).connect(bus);
    crashRef.current = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 1.2, release: 0.8 }, harmonicity: 8, modulationIndex: 40, resonance: 6000, octaves: 2 } as never).connect(bus);
    return () => {
      seqRef.current?.dispose();
      [kickRef, snareRef, hatRef, openHatRef, clapRef, tomRef, rimRef, crashRef].forEach((r) => r.current?.dispose());
      bus.dispose();
    };
  }, []);

  useEffect(() => { if (busRef.current) busRef.current.volume.value = volume; }, [volume]);
  useEffect(() => { Tone.Transport.bpm.value = bpm; }, [bpm]);
  useEffect(() => { Tone.Transport.swing = swing; Tone.Transport.swingSubdivision = "16n"; }, [swing]);

  const tracks: Track[] = [
    { id: "kick", name: "Kick", key: "1", color: "from-orange-500 to-red-600", trigger: (t) => kickRef.current?.triggerAttackRelease("C1", "8n", t) },
    { id: "snare", name: "Snare", key: "2", color: "from-yellow-400 to-orange-500", trigger: (t) => snareRef.current?.triggerAttackRelease("16n", t) },
    { id: "clap", name: "Clap", key: "3", color: "from-pink-500 to-rose-600", trigger: (t) => clapRef.current?.triggerAttackRelease("16n", t) },
    { id: "hat", name: "Hi-Hat", key: "4", color: "from-cyan-400 to-blue-500", trigger: (t) => hatRef.current?.triggerAttackRelease("32n", t, 0.4) },
    { id: "ohat", name: "Open Hat", key: "5", color: "from-teal-400 to-cyan-600", trigger: (t) => openHatRef.current?.triggerAttackRelease("8n", t, 0.4) },
    { id: "tom", name: "Tom", key: "6", color: "from-purple-500 to-fuchsia-600", trigger: (t) => tomRef.current?.triggerAttackRelease("A2", "8n", t) },
    { id: "rim", name: "Rim", key: "7", color: "from-lime-400 to-green-500", trigger: (t) => rimRef.current?.triggerAttackRelease("16n", t, 0.5) },
    { id: "crash", name: "Crash", key: "8", color: "from-amber-400 to-yellow-500", trigger: (t) => crashRef.current?.triggerAttackRelease("2n", t, 0.5) },
  ];


  const toggleStep = (row: number, step: number) => {
    setPattern((p) => {
      const next = p.map((r) => r.slice());
      next[row][step] = !next[row][step];
      return next;
    });
  };

  const patternRef = useRef(pattern);
  useEffect(() => { patternRef.current = pattern; }, [pattern]);

  const start = async () => {
    await onReady();
    seqRef.current?.dispose();
    const steps = Array.from({ length: STEPS }, (_, i) => i);
    seqRef.current = new Tone.Sequence(
      (time, step) => {
        const pat = patternRef.current;
        pat.forEach((row, ri) => {
          if (row[step]) tracks[ri].trigger(time);
        });
        Tone.Draw.schedule(() => setCurrent(step), time);
      },
      steps,
      "16n"
    ).start(0);
    Tone.Transport.start();
    setPlaying(true);
  };
  const stop = () => {
    seqRef.current?.dispose();
    seqRef.current = null;
    Tone.Transport.stop();
    setPlaying(false);
    setCurrent(-1);
  };
  const clear = () => setPattern(initial());

  const presets: Record<string, boolean[][]> = {
    "Boom Bap": (() => {
      const p = initial();
      [0, 8].forEach((i) => (p[0][i] = true));
      [4, 12].forEach((i) => (p[1][i] = true));
      [0, 2, 4, 6, 8, 10, 12, 14].forEach((i) => (p[3][i] = true));
      return p;
    })(),
    "Trap": (() => {
      const p = initial();
      [0, 6, 10].forEach((i) => (p[0][i] = true));
      [4, 12].forEach((i) => (p[1][i] = true));
      [0, 2, 4, 6, 7, 8, 10, 11, 12, 14, 15].forEach((i) => (p[3][i] = true));
      return p;
    })(),
    "House": (() => {
      const p = initial();
      [0, 4, 8, 12].forEach((i) => (p[0][i] = true));
      [4, 12].forEach((i) => (p[2][i] = true));
      [2, 6, 10, 14].forEach((i) => (p[4][i] = true));
      return p;
    })(),
  };

  return (
    <div className="studio-panel rounded-xl p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
            <Drum className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">BEAT MAKER</h3>
            <p className="text-[10px] text-muted-foreground">16-step drum sequencer · Producer mode</p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!playing ? (
            <button onClick={start} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              <Play className="h-3.5 w-3.5" /> Play
            </button>
          ) : (
            <button onClick={stop} className="flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
              <Square className="h-3.5 w-3.5" /> Stop
            </button>
          )}
          <button onClick={clear} className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/70">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
          {Object.entries(presets).map(([name, p]) => (
            <button key={name} onClick={() => setPattern(p)} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/70">
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Pads */}
      <div className="mb-4 grid grid-cols-4 gap-2 md:grid-cols-8">
        {tracks.map((t) => (
          <button
            key={t.id}
            onMouseDown={async () => { await onReady(); t.trigger(Tone.now()); }}
            className={`group relative aspect-square rounded-xl bg-gradient-to-br ${t.color} p-2 text-left shadow-lg transition-all active:scale-95 active:brightness-125`}
          >
            <div className="absolute right-1.5 top-1.5 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
              {t.key}
            </div>
            <div className="absolute bottom-1.5 left-2 text-[11px] font-bold uppercase tracking-wider text-white drop-shadow">
              {t.name}
            </div>
          </button>
        ))}
      </div>

      {/* Sequencer grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px] space-y-1">
          {tracks.map((t, ri) => (
            <div key={t.id} className="flex items-center gap-2">
              <div className="w-20 shrink-0 text-xs font-semibold text-muted-foreground">{t.name}</div>
              <div className="grid flex-1 grid-cols-16 gap-1" style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0,1fr))` }}>
                {Array.from({ length: STEPS }).map((_, si) => {
                  const on = pattern[ri][si];
                  const isBeat = si % 4 === 0;
                  const isCurrent = current === si;
                  return (
                    <button
                      key={si}
                      onClick={() => toggleStep(ri, si)}
                      className={`h-7 rounded transition-all ${
                        on
                          ? `bg-gradient-to-br ${t.color} shadow-[0_0_10px_var(--glow)]`
                          : isBeat
                          ? "bg-secondary/80 hover:bg-secondary"
                          : "bg-secondary/40 hover:bg-secondary/70"
                      } ${isCurrent ? "ring-2 ring-primary" : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 flex items-center justify-between text-xs">
            <span>Tempo</span><span className="font-mono gold-text">{bpm} BPM</span>
          </label>
          <input type="range" min={60} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-full accent-[color:var(--primary)]" />
        </div>
        <div>
          <label className="mb-1 flex items-center justify-between text-xs">
            <span>Swing</span><span className="font-mono">{Math.round(swing * 100)}%</span>
          </label>
          <input type="range" min={0} max={80} value={swing * 100} onChange={(e) => setSwing(Number(e.target.value) / 100)} className="w-full accent-[color:var(--primary)]" />
        </div>
        <div>
          <label className="mb-1 flex items-center justify-between text-xs">
            <span>Drum Volume</span><span className="font-mono">{volume} dB</span>
          </label>
          <input type="range" min={-40} max={0} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full accent-[color:var(--primary)]" />
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Producer tip: Layer the piano over your beat — record a chord progression in free-play while the sequencer runs. Click a pad to trigger a drum live, or paint the grid to build a loop.
      </p>
    </div>
  );
}
