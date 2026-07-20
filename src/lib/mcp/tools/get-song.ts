import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SONGS } from "@/lib/songs";

export default defineTool({
  name: "get_song",
  title: "Get a built-in song",
  description: "Return the full note sequence (note, time in beats, duration in beats) for a built-in song by id.",
  inputSchema: {
    id: z.string().describe("Song id, e.g. 'ode-to-joy', 'twinkle', 'fur-elise'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const song = SONGS.find((s) => s.id === id);
    if (!song) {
      return {
        content: [{ type: "text", text: `No song found with id "${id}". Use list_songs to see available ids.` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(song, null, 2) }],
      structuredContent: { song },
    };
  },
});
