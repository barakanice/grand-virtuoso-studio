import pkg from "@tonejs/midi";
import type { Song, SongNote } from "./songs";
const { Midi } = pkg;

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function midiToName(m: number): string {
  const pc = ((m % 12) + 12) % 12;
  const oct = Math.floor(m / 12) - 1;
  return `${NAMES[pc]}${oct}`;
}

export async function importMidiAsSong(file: File): Promise<Song> {
  const buf = await file.arrayBuffer();
  const midi = new Midi(buf);
  const bpm = Math.round(midi.header.tempos[0]?.bpm ?? 100);
  const secPerBeat = 60 / bpm;

  // Collect notes from all non-drum tracks -> piano version
  const raw: { midi: number; time: number; duration: number }[] = [];
  midi.tracks.forEach((tr) => {
    if (tr.channel === 9) return; // skip drums
    tr.notes.forEach((n) => {
      raw.push({ midi: n.midi, time: n.time, duration: n.duration });
    });
  });

  if (!raw.length) throw new Error("No playable notes found in MIDI file");

  raw.sort((a, b) => a.time - b.time);

  // Clamp to piano range (A0..C8 = 21..108)
  const notes: SongNote[] = raw.map((n) => {
    let m = n.midi;
    while (m < 21) m += 12;
    while (m > 108) m -= 12;
    return {
      note: midiToName(m),
      time: n.time / secPerBeat,
      duration: Math.max(0.1, n.duration / secPerBeat),
    };
  });

  const base = file.name.replace(/\.[^.]+$/, "");
  return {
    id: `upload-${Date.now()}`,
    title: base || "Uploaded Song",
    composer: "You",
    difficulty: "Intermediate",
    bpm,
    notes,
  };
}
