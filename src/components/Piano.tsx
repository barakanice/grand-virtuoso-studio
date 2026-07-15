import { useEffect, useMemo, useRef } from "react";
import { buildKeyboard, KEY_MAP } from "@/lib/notes";
import { piano } from "@/lib/piano-engine";

// Reverse map: note name -> keyboard letter
const NOTE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k.toUpperCase()]),
);

type Props = {
  activeNotes: Set<string>;
  upcomingNotes?: Set<string>;
  onNoteOn: (note: string) => void;
  onNoteOff: (note: string) => void;
  showLabels?: boolean;
};

export function Piano({ activeNotes, upcomingNotes, onNoteOn, onNoteOff, showLabels }: Props) {
  const keys = useMemo(() => buildKeyboard(), []);
  const whiteKeys = keys.filter((k) => !k.isBlack);
  const totalWhite = whiteKeys.length;
  const scrollRef = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<string>());

  useEffect(() => {
    // Center around C4 initially
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollLeft = el.scrollWidth * 0.42;
    }
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const note = KEY_MAP[e.key.toLowerCase()];
      if (note && !held.current.has(note)) {
        held.current.add(note);
        onNoteOn(note);
      }
    };
    const up = (e: KeyboardEvent) => {
      const note = KEY_MAP[e.key.toLowerCase()];
      if (note) {
        held.current.delete(note);
        onNoteOff(note);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onNoteOn, onNoteOff]);

  const handlePress = async (note: string) => {
    await piano.init();
    onNoteOn(note);
  };

  return (
    <div
      ref={scrollRef}
      className="relative w-full overflow-x-auto overflow-y-hidden rounded-xl studio-panel"
      style={{ scrollbarWidth: "thin" }}
    >
      <div
        className="relative h-56 select-none"
        style={{ width: `${totalWhite * 40}px` }}
      >
        {/* White keys */}
        <div className="absolute inset-0 flex">
          {whiteKeys.map((k) => {
            const active = activeNotes.has(k.name);
            const upcoming = upcomingNotes?.has(k.name);
            return (
              <button
                key={k.name}
                onMouseDown={() => handlePress(k.name)}
                onMouseUp={() => onNoteOff(k.name)}
                onMouseLeave={() => onNoteOff(k.name)}
                onTouchStart={(e) => { e.preventDefault(); handlePress(k.name); }}
                onTouchEnd={(e) => { e.preventDefault(); onNoteOff(k.name); }}
                className={`relative flex-1 border-r border-black/30 rounded-b-md transition-all duration-75 ${
                  active ? "key-white-active translate-y-[2px]" : "key-white"
                } ${upcoming && !active ? "ring-2 ring-inset ring-primary/70" : ""}`}
                style={{ minWidth: 40 }}
                aria-label={k.name}
              >
                <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex flex-col items-center gap-0.5">
                  {NOTE_TO_KEY[k.name] && (
                    <span className="rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
                      {NOTE_TO_KEY[k.name]}
                    </span>
                  )}
                  {showLabels && (
                    <span className="text-[9px] font-semibold text-black/50">{k.name}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Black keys overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {keys.map((k) => {
            if (!k.isBlack) return null;
            // Position black key between the surrounding white keys
            const prevWhiteIdx = keys
              .slice(0, keys.indexOf(k))
              .filter((n) => !n.isBlack).length - 1;
            const left = (prevWhiteIdx + 1) * 40 - 12; // 24px wide, offset by half
            const active = activeNotes.has(k.name);
            const upcoming = upcomingNotes?.has(k.name);
            return (
              <button
                key={k.name}
                onMouseDown={() => handlePress(k.name)}
                onMouseUp={() => onNoteOff(k.name)}
                onMouseLeave={() => onNoteOff(k.name)}
                onTouchStart={(e) => { e.preventDefault(); handlePress(k.name); }}
                onTouchEnd={(e) => { e.preventDefault(); onNoteOff(k.name); }}
                className={`absolute top-0 h-32 w-6 rounded-b-md pointer-events-auto transition-all duration-75 ${
                  active ? "key-black-active translate-y-[2px]" : "key-black"
                } ${upcoming && !active ? "ring-2 ring-inset ring-primary" : ""}`}
                style={{ left: `${left}px` }}
                aria-label={k.name}
              >
                {NOTE_TO_KEY[k.name] && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[9px] font-bold text-white/90">
                    {NOTE_TO_KEY[k.name]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
