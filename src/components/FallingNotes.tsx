import { useEffect, useRef, useState } from "react";
import { buildKeyboard } from "@/lib/notes";
import type { Song } from "@/lib/songs";

type Props = {
  song: Song | null;
  playing: boolean;
  onNoteHit: (note: string) => void;
  onFinish: () => void;
};

// Note falls from top and reaches keyboard bottom at `time` seconds.
// Visual runway = 3 seconds.
const RUNWAY_SEC = 3;

export function FallingNotes({ song, playing, onNoteHit, onFinish }: Props) {
  const keys = buildKeyboard();
  const whiteKeys = keys.filter((k) => !k.isBlack);
  const totalWhite = whiteKeys.length;
  const width = totalWhite * 40;

  const [elapsed, setElapsed] = useState(0);
  const raf = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!playing || !song) return;
    startRef.current = performance.now();
    firedRef.current = new Set();
    const tick = () => {
      const now = (performance.now() - startRef.current) / 1000;
      setElapsed(now);
      // Fire hits when notes reach the bottom
      const secondsPerBeat = 60 / song.bpm;
      song.notes.forEach((n, i) => {
        const hitAt = n.time * secondsPerBeat;
        if (!firedRef.current.has(i) && now >= hitAt) {
          firedRef.current.add(i);
          onNoteHit(n.note);
        }
      });
      const totalDuration =
        (song.notes[song.notes.length - 1].time + song.notes[song.notes.length - 1].duration) *
        secondsPerBeat;
      if (now > totalDuration + 1) {
        onFinish();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, song, onNoteHit, onFinish]);

  if (!song) return null;
  const secondsPerBeat = 60 / song.bpm;

  const noteToX = (name: string): number | null => {
    const key = keys.find((k) => k.name === name);
    if (!key) return null;
    if (!key.isBlack) return key.whiteIndex * 40 + 4;
    // black
    const idx = keys.indexOf(key);
    const prevWhiteIdx = keys.slice(0, idx).filter((n) => !n.isBlack).length - 1;
    return (prevWhiteIdx + 1) * 40 - 12;
  };

  return (
    <div className="relative h-64 overflow-hidden rounded-t-xl border border-b-0 border-border bg-gradient-to-b from-black/60 to-black/30">
      <div className="relative h-full" style={{ width }}>
        {song.notes.map((n, i) => {
          const hitAtSec = n.time * secondsPerBeat;
          const noteHead = elapsed - hitAtSec + RUNWAY_SEC; // seconds since spawn
          if (noteHead < 0 || noteHead > RUNWAY_SEC + n.duration * secondsPerBeat + 0.5) return null;
          const progress = noteHead / RUNWAY_SEC; // 0..1 when reaches bottom
          const top = progress * 100;
          const key = keys.find((k) => k.name === n.note);
          const x = noteToX(n.note);
          if (x == null || !key) return null;
          const heightPx = (n.duration * secondsPerBeat / RUNWAY_SEC) * 256;
          const w = key.isBlack ? 24 : 32;
          const isBlack = key.isBlack;
          return (
            <div
              key={i}
              className={`absolute rounded-md shadow-[0_0_20px_var(--glow)] ${
                isBlack ? "bg-accent" : "bg-primary"
              }`}
              style={{
                left: x,
                top: `${top}%`,
                width: w,
                height: heightPx,
                transform: "translateY(-100%)",
                opacity: progress > 1 ? Math.max(0, 1.2 - progress) : 1,
              }}
            />
          );
        })}
        {/* Hit line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary shadow-[0_0_16px_var(--glow)]" />
      </div>
    </div>
  );
}
