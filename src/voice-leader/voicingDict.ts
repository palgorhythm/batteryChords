/**
 * Jazz voicing dictionary.
 *
 * Templates tagged by feel:
 *   - rootless: 4 notes, Bill Evans Type A/B — the bread and butter
 *   - spread:   4 notes, wider intervals for open sound
 *   - quartal:  4 notes, stacked 4ths (McCoy Tyner / Herbie)
 *   - rich:     5 notes, full sound with extensions
 *
 * Every template has been validated to produce at least one voicing
 * where ALL notes land in MIDI 48-72 (C3-C5).
 */

export type VoicingFeel = "rootless" | "spread" | "quartal" | "rich";

export interface VoicingTemplate {
  name: string;
  feel: VoicingFeel;
  intervals: number[];
}

// prettier-ignore
const VOICING_TEMPLATES: Record<string, VoicingTemplate[]> = {

  // ─── Major 7th ──────────────────────────────────────────────
  "M7": [
    { name: "A: 3-5-7-9",       feel: "rootless", intervals: [4, 7, 11, 14] },
    { name: "B: 7-9-3-5",       feel: "rootless", intervals: [11, 14, 16, 19] },
    { name: "A: 3-5-6-9",       feel: "rootless", intervals: [4, 7, 9, 14] },
    { name: "B: 6-9-3-5",       feel: "rootless", intervals: [9, 14, 16, 19] },
    { name: "spread: 3-7-9-5",  feel: "spread",   intervals: [4, 11, 14, 19] },
    { name: "spread: 3-9-5-7",  feel: "spread",   intervals: [4, 14, 19, 23] },
    { name: "quartal: 9-5-R-3", feel: "quartal",  intervals: [2, 7, 12, 16] },
    { name: "rich: 3-5-7-9-#11",feel: "rich",     intervals: [4, 7, 11, 14, 18] },
    { name: "rich: 3-5-6-9-7",  feel: "rich",     intervals: [4, 7, 9, 14, 23] },
  ],

  // ─── Minor 7th ──────────────────────────────────────────────
  "m7": [
    { name: "A: b3-5-b7-9",     feel: "rootless", intervals: [3, 7, 10, 14] },
    { name: "B: b7-9-b3-5",     feel: "rootless", intervals: [10, 14, 15, 19] },
    { name: "A: b3-5-b7-11",    feel: "rootless", intervals: [3, 7, 10, 17] },
    { name: "spread: b3-b7-9-5",feel: "spread",   intervals: [3, 10, 14, 19] },
    { name: "spread: b3-9-5-b7",feel: "spread",   intervals: [3, 14, 19, 22] },
    { name: "quartal: 9-5-R-11",feel: "quartal",  intervals: [2, 7, 12, 17] },
    { name: "quartal: b3-b7-11",feel: "quartal",  intervals: [3, 10, 17, 22] },
    { name: "rich: b3-5-b7-9-11",feel: "rich",    intervals: [3, 7, 10, 14, 17] },
  ],

  // ─── Dominant 7th ───────────────────────────────────────────
  "7": [
    { name: "A: 3-13-b7-9",     feel: "rootless", intervals: [4, 9, 10, 14] },
    { name: "B: b7-9-3-13",     feel: "rootless", intervals: [10, 14, 16, 21] },
    { name: "A: 3-b7-9-13",     feel: "rootless", intervals: [4, 10, 14, 21] },
    { name: "spread: 3-b7-9-5", feel: "spread",   intervals: [4, 10, 14, 19] },
    { name: "spread: 3-9-13-b7",feel: "spread",   intervals: [4, 14, 21, 22] },
    { name: "quartal: 9-13-3-b7",feel: "quartal", intervals: [2, 9, 16, 22] },
    { name: "rich: 3-5-b7-9-13",feel: "rich",     intervals: [4, 7, 10, 14, 21] },
  ],

  // ─── Dominant 7th altered ───────────────────────────────────
  "7alt": [
    { name: "3-b7-b9-#9",       feel: "rootless", intervals: [4, 10, 13, 15] },
    { name: "3-b7-#9-b13",      feel: "rootless", intervals: [4, 10, 15, 20] },
    { name: "b7-b9-3-b13",      feel: "rootless", intervals: [10, 13, 16, 20] },
    { name: "spread: 3-b9-b13-b7",feel: "spread", intervals: [4, 13, 20, 22] },
    { name: "rich: 3-b7-b9-#9-b13",feel: "rich",  intervals: [4, 10, 13, 15, 20] },
  ],

  // ─── Dominant 7th #11 (lydian dominant) ─────────────────────
  "7#11": [
    { name: "3-#11-b7-9",       feel: "rootless", intervals: [4, 6, 10, 14] },
    { name: "b7-9-3-#11",       feel: "rootless", intervals: [10, 14, 16, 18] },
    { name: "spread: 3-b7-9-#11",feel: "spread",  intervals: [4, 10, 14, 18] },
    { name: "rich: 3-b7-9-#11-13",feel: "rich",   intervals: [4, 10, 14, 18, 21] },
  ],

  // ─── Half-diminished (minor 7 flat 5) ──────────────────────
  "m7b5": [
    { name: "A: b3-b5-b7-R",    feel: "rootless", intervals: [3, 6, 10, 12] },
    { name: "B: b7-R-b3-b5",    feel: "rootless", intervals: [10, 12, 15, 18] },
    { name: "A: b3-b5-b7-11",   feel: "rootless", intervals: [3, 6, 10, 17] },
    { name: "spread: b3-b7-R-b5",feel: "spread",  intervals: [3, 10, 12, 18] },
    { name: "rich: b3-b5-b7-9-11",feel: "rich",   intervals: [3, 6, 10, 14, 17] },
  ],

  // ─── Diminished 7th ─────────────────────────────────────────
  "dim7": [
    { name: "b3-b5-bb7-R",      feel: "rootless", intervals: [3, 6, 9, 12] },
    { name: "b5-bb7-R-b3",      feel: "rootless", intervals: [6, 9, 12, 15] },
    { name: "bb7-R-b3-b5",      feel: "rootless", intervals: [9, 12, 15, 18] },
    { name: "spread: b3-bb7-R-b5",feel: "spread", intervals: [3, 9, 12, 18] },
  ],

  // ─── Minor-Major 7th ───────────────────────────────────────
  "mM7": [
    { name: "A: b3-5-7-9",      feel: "rootless", intervals: [3, 7, 11, 14] },
    { name: "B: 7-9-b3-5",      feel: "rootless", intervals: [11, 14, 15, 19] },
    { name: "spread: b3-7-9-5", feel: "spread",   intervals: [3, 11, 14, 19] },
    { name: "rich: b3-5-7-9-11",feel: "rich",     intervals: [3, 7, 11, 14, 17] },
  ],

  // ─── Augmented Major 7th ────────────────────────────────────
  "maj7#5": [
    { name: "A: 3-#5-7-9",      feel: "rootless", intervals: [4, 8, 11, 14] },
    { name: "B: 7-9-3-#5",      feel: "rootless", intervals: [11, 14, 16, 20] },
    { name: "spread: 3-7-9-#5", feel: "spread",   intervals: [4, 11, 14, 20] },
  ],

  // ─── Sus4 ───────────────────────────────────────────────────
  "sus4": [
    { name: "quartal: R-4-b7-9",feel: "quartal",  intervals: [0, 5, 10, 14] },
    { name: "quartal: 4-b7-9-5",feel: "quartal",  intervals: [5, 10, 14, 17] },
    { name: "spread: 4-b7-R-9", feel: "spread",   intervals: [5, 10, 12, 14] },
    { name: "rich: R-4-5-b7-9", feel: "rich",     intervals: [0, 5, 7, 10, 14] },
  ],

  // ─── 6/9 ────────────────────────────────────────────────────
  "6": [
    { name: "3-5-6-9",          feel: "rootless", intervals: [4, 7, 9, 14] },
    { name: "6-9-3-5",          feel: "rootless", intervals: [9, 14, 16, 19] },
    { name: "spread: 3-6-9-5",  feel: "spread",   intervals: [4, 9, 14, 19] },
  ],

  // ─── Minor 6 ───────────────────────────────────────────────
  "m6": [
    { name: "b3-5-6-9",         feel: "rootless", intervals: [3, 7, 9, 14] },
    { name: "6-9-b3-5",         feel: "rootless", intervals: [9, 14, 15, 19] },
    { name: "spread: b3-6-9-5", feel: "spread",   intervals: [3, 9, 14, 19] },
  ],

  // ─── Major triad ───────────────────────────────────────────
  "M": [
    { name: "3-5-R-3",          feel: "rootless", intervals: [4, 7, 12, 16] },
    { name: "5-R-3-5",          feel: "rootless", intervals: [7, 12, 16, 19] },
    { name: "R-3-5-R",          feel: "rootless", intervals: [0, 4, 7, 12] },
  ],

  // ─── Minor triad ───────────────────────────────────────────
  "m": [
    { name: "b3-5-R-b3",        feel: "rootless", intervals: [3, 7, 12, 15] },
    { name: "5-R-b3-5",         feel: "rootless", intervals: [7, 12, 15, 19] },
    { name: "R-b3-5-R",         feel: "rootless", intervals: [0, 3, 7, 12] },
  ],
};

// prettier-ignore
const QUALITY_ALIASES: Record<string, string> = {
  "Major":        "M",
  "":             "M",
  "major seventh": "M7",
  "major ninth":  "M7",
  "major thirteenth": "M7",
  "sixth":        "6",
  "major sixth":  "6",
  "sixth added ninth": "6",
  "minor":        "m",
  "minor seventh": "m7",
  "minor ninth":  "m7",
  "minor eleventh": "m7",
  "minor sixth":  "m6",
  "minor/major seventh": "mM7",
  "dominant seventh": "7",
  "ninth":        "7",
  "thirteenth":   "7",
  "dominant seventh flat ninth": "7alt",
  "dominant seventh sharp ninth": "7alt",
  "altered":      "7alt",
  "lydian dominant seventh": "7#11",
  "half-diminished seventh": "m7b5",
  "half-diminished": "m7b5",
  "diminished seventh": "dim7",
  "diminished":   "dim7",
  "augmented":    "maj7#5",
  "augmented major seventh": "maj7#5",
  "suspended fourth": "sus4",
  "suspended fourth seventh": "sus4",
  "sus4":         "sus4",
};

export function getVoicingTemplates(quality: string): VoicingTemplate[] {
  const key = VOICING_TEMPLATES[quality] ? quality : (QUALITY_ALIASES[quality] ?? "M7");
  return VOICING_TEMPLATES[key] ?? VOICING_TEMPLATES["M7"];
}

export function getQualityKey(quality: string): string {
  if (VOICING_TEMPLATES[quality]) return quality;
  return QUALITY_ALIASES[quality] ?? "M7";
}
