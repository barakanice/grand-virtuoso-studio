import pkg from "@tonejs/midi";
const { Midi } = pkg;

// Convert a note name like "C#4" to a MIDI number
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteNameToMidi(name: string): number {
  const m = name.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!m) return 60;
  let pc = PC[m[1]];
  if (m[2] === "#") pc += 1;
  if (m[2] === "b") pc -= 1;
  const oct = parseInt(m[3], 10);
  return (oct + 1) * 12 + pc;
}

function download(bytes: Uint8Array, filename: string) {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([buf], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type PianoRecEvent = { note: string; t: number; type: "on" | "off" };

export function exportPianoMidi(events: PianoRecEvent[], bpm: number, filename = "piano.mid") {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  const track = midi.addTrack();
  track.name = "Piano";

  const held: Record<string, number> = {};
  for (const ev of events) {
    const time = ev.t / 1000; // ms -> seconds
    if (ev.type === "on") {
      held[ev.note] = time;
    } else if (ev.type === "off" && held[ev.note] !== undefined) {
      const start = held[ev.note];
      delete held[ev.note];
      track.addNote({
        midi: noteNameToMidi(ev.note),
        time: start,
        duration: Math.max(0.05, time - start),
        velocity: 0.8,
      });
    }
  }
  // Close any hanging notes
  const last = events.length ? events[events.length - 1].t / 1000 : 0;
  for (const n of Object.keys(held)) {
    track.addNote({
      midi: noteNameToMidi(n),
      time: held[n],
      duration: Math.max(0.1, last - held[n]),
      velocity: 0.8,
    });
  }

  download(new Uint8Array(midi.toArray()), filename);
}

// General MIDI drum notes (channel 10)
export const GM_DRUMS: Record<string, number> = {
  kick: 36,
  snare: 38,
  clap: 39,
  hat: 42,
  ohat: 46,
  tom: 45,
  rim: 37,
  crash: 49,
};

export function exportBeatMidi(
  pattern: boolean[][],
  trackIds: string[],
  bpm: number,
  filename = "beat.mid"
) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  const track = midi.addTrack();
  track.name = "Drums";
  track.channel = 9; // GM drum channel

  const stepSec = 60 / bpm / 4; // 16th note
  pattern.forEach((row, ri) => {
    const drum = GM_DRUMS[trackIds[ri]] ?? 36;
    row.forEach((on, si) => {
      if (!on) return;
      track.addNote({
        midi: drum,
        time: si * stepSec,
        duration: stepSec * 0.9,
        velocity: 0.9,
      });
    });
  });

  download(new Uint8Array(midi.toArray()), filename);
}
