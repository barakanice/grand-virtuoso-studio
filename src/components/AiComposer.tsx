import { useState } from "react";
import { Sparkles, Wand2, Loader2, Play } from "lucide-react";
import { composeSong, type ComposedSong } from "@/lib/ai-composer.functions";
import type { Song } from "@/lib/songs";

const STYLES = ["Cinematic", "Lo-Fi", "Jazz", "Classical", "Trap", "House", "Ambient", "Pop Ballad"];
const MOODS = ["Happy", "Melancholic", "Epic", "Chill", "Dark", "Romantic", "Energetic", "Dreamy"];

type Props = {
  onLoadSong: (song: Song, composed: ComposedSong) => void;
  onLoadBeat: (pattern: boolean[][], bpm: number) => void;
};

export function AiComposer({ onLoadSong, onLoadBeat }: Props) {
  const [prompt, setPrompt] = useState("A hopeful piano intro in C major that builds emotion");
  const [style, setStyle] = useState("Cinematic");
  const [mood, setMood] = useState("Epic");
  const [wantBeat, setWantBeat] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComposedSong | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const composed = await composeSong({ data: { prompt, style, mood, wantBeat } });
      setResult(composed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to compose";
      setError(msg.includes("402") ? "AI credits exhausted. Add credits in workspace billing." : msg.includes("429") ? "Rate limited — try again in a moment." : msg);
    } finally {
      setLoading(false);
    }
  };

  const loadIntoStudio = () => {
    if (!result) return;
    const song: Song = {
      id: `ai-${Date.now()}`,
      title: result.title,
      composer: "AI Composer",
      difficulty: "Intermediate",
      bpm: result.bpm,
      notes: result.pianoNotes.map((n) => ({ note: n.note, time: n.time, duration: n.duration })),
    };
    onLoadSong(song, result);

    // Convert drumSteps to 8-track boolean matrix in track order used by BeatMaker
    const order: (keyof ComposedSong["drumSteps"])[] = ["kick", "snare", "clap", "hat", "ohat", "tom", "rim", "crash"];
    const pattern: boolean[][] = order.map((k) => {
      const row = Array(16).fill(false);
      (result.drumSteps[k] || []).forEach((s) => {
        if (s >= 0 && s < 16) row[s] = true;
      });
      return row;
    });
    onLoadBeat(pattern, result.bpm);
  };

  return (
    <div className="studio-panel rounded-xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 shadow-[0_0_20px_var(--glow)]">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">AI COMPOSER</h3>
          <p className="text-[10px] text-muted-foreground">Describe an idea → get a melody + beat you can play and edit</p>
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        placeholder="e.g. A sad lo-fi piano loop with soft rain vibes in A minor"
        className="mb-2 w-full resize-none rounded-lg border border-border bg-secondary/40 p-3 text-sm outline-none focus:border-primary"
      />

      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Style:</span>
        {STYLES.map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={`rounded-full px-2.5 py-1 font-semibold ${style === s ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Mood:</span>
        {MOODS.map((m) => (
          <button
            key={m}
            onClick={() => setMood(m)}
            className={`rounded-full px-2.5 py-1 font-semibold ${mood === m ? "bg-accent text-accent-foreground" : "bg-secondary hover:bg-secondary/70"}`}
          >
            {m}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={wantBeat} onChange={(e) => setWantBeat(e.target.checked)} className="accent-[color:var(--primary)]" />
          <span>Include beat</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-bold text-primary-foreground shadow-[0_0_25px_var(--glow)] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {loading ? "Composing…" : "Compose with AI"}
        </button>
        {result && (
          <button
            onClick={loadIntoStudio}
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/70"
          >
            <Play className="h-4 w-4" /> Load into Studio
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-lg border border-border bg-background/40 p-3">
          <div className="mb-1 flex items-center justify-between">
            <h4 className="text-sm font-bold gold-text">{result.title}</h4>
            <span className="font-mono text-xs text-muted-foreground">
              {result.key} · {result.bpm} BPM · {result.pianoNotes.length} notes
            </span>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">{result.description}</p>
          {result.tips?.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
              {result.tips.slice(0, 4).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
