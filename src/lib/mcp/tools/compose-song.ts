import { defineTool } from "@lovable.dev/mcp-js";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const ComposeSchema = z.object({
  title: z.string(),
  description: z.string(),
  key: z.string(),
  bpm: z.number(),
  pianoNotes: z.array(
    z.object({
      note: z.string(),
      time: z.number(),
      duration: z.number(),
    })
  ),
  drumSteps: z.object({
    kick: z.array(z.number()),
    snare: z.array(z.number()),
    clap: z.array(z.number()),
    hat: z.array(z.number()),
    ohat: z.array(z.number()),
    tom: z.array(z.number()),
    rim: z.array(z.number()),
    crash: z.array(z.number()),
  }),
  tips: z.array(z.string()),
});

const SYSTEM = `You are an expert music composer and producer who writes short piano melodies and drum patterns for a virtual piano studio app.

Rules:
- Piano notes use scientific pitch notation (e.g. "C4", "F#4", "Bb3") between A0 and C8, ideally between C3 and C6.
- "time" is in BEATS from song start; "duration" is in BEATS. Notes may overlap for chords.
- Compose a musically coherent 8 to 32 bar melody (aim for 24 to 64 notes) that fits the requested mood and key.
- Drum pattern uses 16 steps (0..15). Only include step indices that should trigger. Return empty arrays for unused drums.
- Choose a sensible BPM (60-180) for the style.
- Keep everything JSON-safe. No commentary, only structured data.`;

export default defineTool({
  name: "compose_song",
  title: "Compose a song with AI",
  description:
    "Generate an original short piano melody plus an optional 16-step drum pattern from a text idea, style, and mood. Uses Lovable AI. Returns notes in scientific pitch notation with beat-based timing plus drum step indices, ready to load into the piano studio.",
  inputSchema: {
    prompt: z.string().describe("Describe the song idea, e.g. 'A hopeful piano intro in C major that builds emotion.'"),
    style: z
      .string()
      .describe("Musical style, e.g. Cinematic, Lo-Fi, Jazz, Classical, Trap, House, Ambient, Pop Ballad.")
      .optional(),
    mood: z
      .string()
      .describe("Emotional mood, e.g. Happy, Melancholic, Epic, Chill, Dark, Romantic, Energetic, Dreamy.")
      .optional(),
    wantBeat: z.boolean().describe("Include a matching 16-step drum pattern. Default true.").optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
  handler: async ({ prompt, style, mood, wantBeat }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        content: [{ type: "text", text: "AI is not configured on this server (missing LOVABLE_API_KEY)." }],
        isError: true,
      };
    }

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const userPrompt = [
      `User idea: ${prompt}`,
      style ? `Style: ${style}` : "",
      mood ? `Mood: ${mood}` : "",
      wantBeat === false ? "Drum pattern optional; empty arrays are fine." : "Include a matching drum pattern.",
      "Compose now.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { output } = await generateText({
        model,
        system: SYSTEM,
        prompt: userPrompt,
        output: Output.object({ schema: ComposeSchema }),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: { song: output },
      };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          const parsed = ComposeSchema.parse(JSON.parse(error.text ?? "{}"));
          return {
            content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }],
            structuredContent: { song: parsed },
          };
        } catch {
          return {
            content: [{ type: "text", text: "AI returned invalid data. Try again with a clearer prompt." }],
            isError: true,
          };
        }
      }
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: message.includes("402")
              ? "AI credits exhausted on this workspace."
              : message.includes("429")
                ? "Rate limited by Lovable AI — try again in a moment."
                : `AI error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  },
});
