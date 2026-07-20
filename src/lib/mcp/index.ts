import { defineMcp } from "@lovable.dev/mcp-js";
import composeSongTool from "./tools/compose-song";
import getSongTool from "./tools/get-song";
import listSongsTool from "./tools/list-songs";

export default defineMcp({
  name: "virtual-grand-piano-pro-mcp",
  title: "Virtual Grand Piano Pro",
  version: "0.1.0",
  instructions:
    "Tools for Virtual Grand Piano Pro, an AI-assisted piano studio. Use `list_songs` and `get_song` to browse the built-in learnable repertoire, and `compose_song` to generate an original piano melody plus a 16-step drum pattern from a prompt, style, and mood.",
  tools: [listSongsTool, getSongTool, composeSongTool],
});
