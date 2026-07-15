import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const ComposeInput = z.object({
  prompt: z.string().min(1).max(500),
  style: z.string().max(80).optional(),
  mood: z.string().max(80).optional(),
  wantBeat: z.boolean().optional(),
});

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

export type ComposedSong = z.infer<typeof ComposeSchema>;

const SYSTEM = `You are an expert music composer and producer who writes short piano melodies and drum patterns for a virtual piano studio app.

Rules:
- Piano notes use scientific pitch notation (e.g. "C4", "F#4", "Bb3") between A0 and C8, ideally between C3 and C6.
- "time" is in BEATS from song start; "duration" is in BEATS. Notes may overlap for chords.
- Compose a musically coherent 8 to 32 bar melody (aim for 24 to 64 notes) that fits the requested mood and key.
- Drum pattern uses 16 steps (0..15). Only include step indices that should trigger. Return empty arrays for unused drums.
- Choose a sensible BPM (60-180) for the style.
- Keep everything JSON-safe. No commentary, only structured data.`;

export const composeSong = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ComposeInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const userPrompt = [
      `User idea: ${data.prompt}`,
      data.style ? `Style: ${data.style}` : "",
      data.mood ? `Mood: ${data.mood}` : "",
      data.wantBeat ? "Include a matching drum pattern." : "Drum pattern optional; empty arrays are fine.",
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
      return output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          const parsed = JSON.parse(error.text ?? "{}");
          return ComposeSchema.parse(parsed);
        } catch {
          throw new Error("AI returned invalid data. Try again with a clearer prompt.");
        }
      }
      throw error;
    }
  });
