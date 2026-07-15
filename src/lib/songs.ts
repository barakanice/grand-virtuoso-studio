export type SongNote = { note: string; time: number; duration: number };
export type Song = {
  id: string;
  title: string;
  composer: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  bpm: number;
  notes: SongNote[];
};

// Simple built-in songs (time in beats, duration in beats)
export const SONGS: Song[] = [
  {
    id: "ode-to-joy",
    title: "Ode to Joy",
    composer: "Beethoven",
    difficulty: "Beginner",
    bpm: 100,
    notes: [
      ["E4", 1], ["E4", 1], ["F4", 1], ["G4", 1],
      ["G4", 1], ["F4", 1], ["E4", 1], ["D4", 1],
      ["C4", 1], ["C4", 1], ["D4", 1], ["E4", 1],
      ["E4", 1.5], ["D4", 0.5], ["D4", 2],
      ["E4", 1], ["E4", 1], ["F4", 1], ["G4", 1],
      ["G4", 1], ["F4", 1], ["E4", 1], ["D4", 1],
      ["C4", 1], ["C4", 1], ["D4", 1], ["E4", 1],
      ["D4", 1.5], ["C4", 0.5], ["C4", 2],
    ].reduce<SongNote[]>((acc, [n, d]) => {
      const time = acc.length ? acc[acc.length - 1].time + acc[acc.length - 1].duration : 0;
      acc.push({ note: n as string, duration: d as number, time });
      return acc;
    }, []),
  },
  {
    id: "twinkle",
    title: "Twinkle Twinkle Little Star",
    composer: "Traditional",
    difficulty: "Beginner",
    bpm: 90,
    notes: [
      ["C4", 1], ["C4", 1], ["G4", 1], ["G4", 1], ["A4", 1], ["A4", 1], ["G4", 2],
      ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 1], ["D4", 1], ["C4", 2],
      ["G4", 1], ["G4", 1], ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 2],
      ["G4", 1], ["G4", 1], ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 2],
      ["C4", 1], ["C4", 1], ["G4", 1], ["G4", 1], ["A4", 1], ["A4", 1], ["G4", 2],
      ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 1], ["D4", 1], ["C4", 2],
    ].reduce<SongNote[]>((acc, [n, d]) => {
      const time = acc.length ? acc[acc.length - 1].time + acc[acc.length - 1].duration : 0;
      acc.push({ note: n as string, duration: d as number, time });
      return acc;
    }, []),
  },
  {
    id: "fur-elise",
    title: "Für Elise (opening)",
    composer: "Beethoven",
    difficulty: "Intermediate",
    bpm: 120,
    notes: [
      ["E5", 0.5], ["D#5", 0.5], ["E5", 0.5], ["D#5", 0.5], ["E5", 0.5], ["B4", 0.5],
      ["D5", 0.5], ["C5", 0.5], ["A4", 1],
      ["C4", 0.5], ["E4", 0.5], ["A4", 0.5], ["B4", 1],
      ["E4", 0.5], ["G#4", 0.5], ["B4", 0.5], ["C5", 1],
      ["E4", 0.5], ["E5", 0.5], ["D#5", 0.5], ["E5", 0.5], ["D#5", 0.5], ["E5", 0.5],
      ["B4", 0.5], ["D5", 0.5], ["C5", 0.5], ["A4", 1],
    ].reduce<SongNote[]>((acc, [n, d]) => {
      const time = acc.length ? acc[acc.length - 1].time + acc[acc.length - 1].duration : 0;
      acc.push({ note: n as string, duration: d as number, time });
      return acc;
    }, []),
  },
];
