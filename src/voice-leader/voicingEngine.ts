import Max from "max-api";
import { Chord, Note } from "tonal";
import type { VoicingResult } from "../shared/types";
import { closestOctave, randPick, weightedPick } from "../shared/midi";
import { getVoicingTemplates } from "./voicingDict";

// ─── Ranges ───────────────────────────────────────────────────
// Evans rootless voicing sweet spot: roughly Eb3 to Bb4.
// Bass in a separate register below, with a gap.

const BASS_RANGE = { min: 36, max: 52 };   // C2–E3
const UPPER_RANGE = { min: 55, max: 74 };  // G3–D5

// ─── Chord parsing ────────────────────────────────────────────

function parseChord(symbol: string): { rootPc: number; quality: string; notes: string[] } | null {
  let chord = Chord.get(symbol);
  if (chord.empty) {
    const cleaned = symbol
      .replace(/maj/i, "M")
      .replace(/min/i, "m")
      .replace(/dim/i, "dim")
      .replace(/aug/i, "aug");
    chord = Chord.get(cleaned);
    if (chord.empty) return null;
  }
  const rootMidi = Note.midi(`${chord.tonic}0`);
  return {
    rootPc: rootMidi != null ? rootMidi % 12 : 0,
    quality: chord.type,
    notes: chord.notes,
  };
}

// ─── Candidate generation ─────────────────────────────────────

interface ScoredCandidate {
  voicing: number[];
  feel: string;
  distance: number;
}

function generateCandidates(rootPc: number, quality: string): ScoredCandidate[] {
  const templates = getVoicingTemplates(quality);
  const candidates: ScoredCandidate[] = [];

  for (const template of templates) {
    for (let octave = 1; octave <= 6; octave++) {
      const rootMidi = rootPc + octave * 12;

      const voicing = template.intervals.map((interval) => rootMidi + interval);

      // ALL notes must be in the sweet spot
      if (!voicing.every((n) => n >= UPPER_RANGE.min && n <= UPPER_RANGE.max)) continue;

      candidates.push({
        voicing: [...voicing].sort((a, b) => a - b),
        feel: template.feel,
        distance: 0,
      });
    }
  }

  return candidates;
}

// ─── Voice leading distance ───────────────────────────────────
//
// Core principle: each voice should move as little as possible.
// The 3rd and 7th (guide tones) are weighted more because they
// define the harmony. Large leaps in any single voice are penalized
// heavily — a voice jumping > 4 semitones sounds wrong.

function voiceLeadingDistance(prev: number[], next: number[]): number {
  if (prev.length === 0 || next.length === 0) return Infinity;

  // Different voice count → greedy match with penalty
  if (prev.length !== next.length) {
    const diff = Math.abs(prev.length - next.length);
    const penalty = diff === 1 ? 12 : 40 + diff * 15;
    const shorter = prev.length < next.length ? prev : next;
    const longer = prev.length < next.length ? next : prev;
    const used = new Set<number>();
    let d = penalty;
    for (const p of shorter) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let j = 0; j < longer.length; j++) {
        if (used.has(j)) continue;
        const dd = Math.abs(p - longer[j]);
        if (dd < bestDist) { bestDist = dd; bestIdx = j; }
      }
      if (bestIdx >= 0) { used.add(bestIdx); d += bestDist; }
    }
    return d;
  }

  // Same voice count: match by position (bottom to top)
  let dist = 0;
  let commonTones = 0;

  for (let i = 0; i < prev.length; i++) {
    const d = Math.abs(prev[i] - next[i]);
    if (d === 0) {
      commonTones++;
      continue;
    }
    // Penalize large leaps in any individual voice
    // 1-2 semitones = ideal (step motion), 3-4 = ok, 5+ = bad
    let cost: number;
    if (d <= 2) cost = d;           // step: cheap
    else if (d <= 4) cost = d * 1.5; // small skip: moderate
    else cost = d * 3;               // large leap: expensive

    // Guide tone weighting (bottom 2 voices = 3rd and 7th in rootless voicings)
    const weight = i <= 1 ? 1.8 : 1.0;
    dist += cost * weight;
  }

  // Reward common tones — each held note is a sign of good voice leading
  dist -= commonTones * 3;

  return Math.max(0, dist);
}

// ─── Bass voice ───────────────────────────────────────────────

function chooseBass(rootPc: number, prevBass: number | null): number {
  if (prevBass == null) {
    return closestOctave(rootPc, 43, BASS_RANGE.min, BASS_RANGE.max);
  }
  return closestOctave(rootPc, prevBass, BASS_RANGE.min, BASS_RANGE.max);
}

// ─── Main voice leading function ──────────────────────────────

export function voiceLead(
  prevVoicing: VoicingResult | null,
  chordSymbol: string
): VoicingResult {
  const parsed = parseChord(chordSymbol);
  if (!parsed) {
    return { bass: 48, upper: [60, 64, 67, 71] };
  }

  const { rootPc, quality, notes } = parsed;
  const candidates = generateCandidates(rootPc, quality);

  if (candidates.length === 0) {
    Max.post(`Warning: no voicing candidates for ${chordSymbol}, using fallback`);
    const fallback = notes.slice(0, 4).map((n) => {
      const midi = Note.midi(`${n}4`);
      return midi ?? 60;
    });
    return {
      bass: chooseBass(rootPc, prevVoicing?.bass ?? null),
      upper: fallback,
    };
  }

  // ─── First chord: pick randomly ───────────────────────────────

  if (!prevVoicing || prevVoicing.upper.length === 0) {
    const chosen = randPick(candidates);
    return {
      bass: chooseBass(rootPc, null),
      upper: chosen.voicing,
    };
  }

  // ─── Score candidates by voice leading quality ────────────────
  //
  // Small jitter (±2) breaks ties between equally smooth options
  // so the same transition doesn't always pick the same voicing.
  // But the jitter is small enough that genuinely smooth voice
  // leading always beats a large-leap alternative.

  for (const c of candidates) {
    const base = voiceLeadingDistance(prevVoicing.upper, c.voicing);
    const jitter = (Math.random() - 0.5) * 4;
    c.distance = Math.max(0, base + jitter);
  }
  candidates.sort((a, b) => a.distance - b.distance);

  // ─── Pick from top candidates ─────────────────────────────────
  //
  // Pool of 4 with steep decay (0.45) — strongly prefers the
  // smoothest option but gives ~30% chance to alternatives.
  // This is where variety comes from: the templates provide
  // genuinely different voicings, and the small pool ensures
  // we only pick GOOD ones.

  const poolSize = Math.min(candidates.length, 4);
  const pool = candidates.slice(0, poolSize);
  const weights = pool.map((_, i) => Math.pow(0.45, i));
  const chosen = weightedPick(pool, weights);

  return {
    bass: chooseBass(rootPc, prevVoicing.bass),
    upper: chosen.voicing,
  };
}

// ─── Scale for soloing ────────────────────────────────────────

export function getScaleForChord(chordSymbol: string): number[] {
  const parsed = parseChord(chordSymbol);
  if (!parsed) return [0, 2, 4, 6, 7, 9, 11]; // lydian fallback

  const chord = Chord.get(chordSymbol);
  const scaleName = chord.type.includes("minor")
    ? "dorian"
    : chord.type.includes("dominant") || chord.type === "7"
      ? "mixolydian"
      : chord.type.includes("diminished") || chord.type.includes("half")
        ? "locrian"
        : "lydian";

  const rootPc = parsed.rootPc;
  const scaleIntervals: Record<string, number[]> = {
    lydian:     [0, 2, 4, 6, 7, 9, 11],  // #4, no natural 4th over major chords
    dorian:     [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian:    [0, 1, 3, 5, 6, 8, 10],
  };

  return (scaleIntervals[scaleName] ?? scaleIntervals.ionian).map(
    (i) => (rootPc + i) % 12
  );
}
