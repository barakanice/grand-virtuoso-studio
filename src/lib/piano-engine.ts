import * as Tone from "tone";

export type InstrumentName =
  | "grand"
  | "soft"
  | "electric"
  | "jazz"
  | "classical"
  | "synth";

const INSTRUMENT_CONFIG: Record<InstrumentName, Partial<Tone.SynthOptions> | { poly: "fm" | "am" | "synth" }> = {
  grand: { poly: "synth" },
  soft: { poly: "synth" },
  electric: { poly: "fm" },
  jazz: { poly: "am" },
  classical: { poly: "synth" },
  synth: { poly: "fm" },
};

class PianoEngine {
  private synth: Tone.PolySynth | null = null;
  private reverb: Tone.Reverb | null = null;
  private eq: Tone.EQ3 | null = null;
  private volume: Tone.Volume | null = null;
  private currentInstrument: InstrumentName = "grand";
  private sustain = false;
  private held = new Set<string>();
  private sustained = new Set<string>();
  private started = false;

  async init() {
    if (this.started) return;
    await Tone.start();
    this.volume = new Tone.Volume(-6).toDestination();
    this.eq = new Tone.EQ3(0, 0, 0).connect(this.volume);
    this.reverb = new Tone.Reverb({ decay: 2.5, wet: 0.25 }).connect(this.eq);
    await this.reverb.generate();
    this.setInstrument(this.currentInstrument);
    this.started = true;
  }

  setInstrument(name: InstrumentName) {
    this.currentInstrument = name;
    if (this.synth) {
      this.synth.releaseAll();
      this.synth.dispose();
    }
    const cfg = INSTRUMENT_CONFIG[name] as { poly: "fm" | "am" | "synth" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let voice: any = Tone.Synth;
    if (cfg.poly === "fm") voice = Tone.FMSynth;
    if (cfg.poly === "am") voice = Tone.AMSynth;

    const options: Record<InstrumentName, Record<string, unknown>> = {
      grand: {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.4, sustain: 0.3, release: 1.6 },
      },
      soft: {
        oscillator: { type: "sine" },
        envelope: { attack: 0.02, decay: 0.5, sustain: 0.4, release: 2 },
      },
      electric: {
        harmonicity: 3,
        modulationIndex: 10,
        envelope: { attack: 0.003, decay: 0.3, sustain: 0.4, release: 1.2 },
      },
      jazz: {
        harmonicity: 2,
        envelope: { attack: 0.01, decay: 0.6, sustain: 0.5, release: 1.5 },
      },
      classical: {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.6, sustain: 0.4, release: 2.2 },
      },
      synth: {
        harmonicity: 1.5,
        modulationIndex: 5,
        envelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.8 },
      },
    };

    this.synth = new Tone.PolySynth(voice, options[name]);
    if (this.reverb) this.synth.connect(this.reverb);
  }

  noteOn(note: string, velocity = 0.8) {
    if (!this.synth) return;
    this.synth.triggerAttack(note, Tone.now(), velocity);
    this.held.add(note);
  }

  noteOff(note: string) {
    if (!this.synth) return;
    this.held.delete(note);
    if (this.sustain) {
      this.sustained.add(note);
    } else {
      this.synth.triggerRelease(note);
    }
  }

  playNote(note: string, duration = "8n", velocity = 0.8) {
    if (!this.synth) return;
    this.synth.triggerAttackRelease(note, duration, undefined, velocity);
  }

  setSustain(on: boolean) {
    this.sustain = on;
    if (!on && this.synth) {
      for (const n of this.sustained) {
        if (!this.held.has(n)) this.synth.triggerRelease(n);
      }
      this.sustained.clear();
    }
  }

  setReverb(wet: number) {
    if (this.reverb) this.reverb.wet.value = wet;
  }
  setVolume(db: number) {
    if (this.volume) this.volume.volume.value = db;
  }
  setEQ(low: number, mid: number, high: number) {
    if (!this.eq) return;
    this.eq.low.value = low;
    this.eq.mid.value = mid;
    this.eq.high.value = high;
  }

  stopAll() {
    if (this.synth) this.synth.releaseAll();
    this.held.clear();
    this.sustained.clear();
  }
}

export const piano = new PianoEngine();
