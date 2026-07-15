export type Note = {
  name: string; // e.g. "C4"
  midi: number;
  isBlack: boolean;
  whiteIndex: number; // position among white keys (0..51)
};

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function buildKeyboard(): Note[] {
  const notes: Note[] = [];
  let whiteIndex = 0;
  // MIDI 21 (A0) to MIDI 108 (C8)
  for (let midi = 21; midi <= 108; midi++) {
    const pc = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    const name = `${NAMES[pc]}${octave}`;
    const isBlack = NAMES[pc].includes("#");
    notes.push({ name, midi, isBlack, whiteIndex: isBlack ? -1 : whiteIndex });
    if (!isBlack) whiteIndex++;
  }
  return notes;
}

// Computer keyboard mapping — two rows across ~2 octaves starting at C4
export const KEY_MAP: Record<string, string> = {
  z: "C3", s: "C#3", x: "D3", d: "D#3", c: "E3", v: "F3", g: "F#3", b: "G3",
  h: "G#3", n: "A3", j: "A#3", m: "B3",
  q: "C4", "2": "C#4", w: "D4", "3": "D#4", e: "E4", r: "F4", "5": "F#4",
  t: "G4", "6": "G#4", y: "A4", "7": "A#4", u: "B4",
  i: "C5", "9": "C#5", o: "D5", "0": "D#5", p: "E5",
};
