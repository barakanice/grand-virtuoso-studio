import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SONGS } from "@/lib/songs";

export default defineTool({
  name: "list_songs",
  title: "List built-in songs",
  description: "List the built-in learnable songs available in Virtual Grand Piano Pro, with id, title, composer, difficulty, and BPM.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const summary = SONGS.map((s) => ({
      id: s.id,
      title: s.title,
      composer: s.composer,
      difficulty: s.difficulty,
      bpm: s.bpm,
      noteCount: s.notes.length,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: { songs: summary },
    };
  },
});

// Keep z referenced to satisfy tree-shaking in strict builds
void z;
