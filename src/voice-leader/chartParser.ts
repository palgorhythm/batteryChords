import type { Chart, ChartMetadata, ChordEntry, Section } from "../shared/types";

/**
 * Parse a .chart file into a structured chord progression with sections.
 *
 * Format:
 *   # Title: Autumn Leaves
 *   # Time: 4/4
 *   # Form: A A B A
 *
 *   [A]
 *   | Cm7     | F7      | Bbmaj7  | Ebmaj7  |
 *   | Am7b5   | D7      | Gm7     | Gm7     |
 *
 *   [B]
 *   | Am7b5   | D7      | Gm7     | Gm7     |
 *   | Cm7     | F7      | Bbmaj7  | Ebmaj7  |
 *
 * If no [Section] markers are present, the entire chart is one section
 * (backwards compatible with the old format).
 */
export function parseChart(text: string): Chart {
  const lines = text.split("\n");
  const metadata: ChartMetadata = {};
  const sections: Section[] = [];

  let beatsPerBar = 4;
  let currentSectionName = "_default";
  let currentChords: ChordEntry[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Metadata lines
    if (line.startsWith("#")) {
      const content = line.slice(1).trim();
      const colonIdx = content.indexOf(":");
      if (colonIdx === -1) continue;

      const key = content.slice(0, colonIdx).trim().toLowerCase();
      const value = content.slice(colonIdx + 1).trim();

      if (key === "title") {
        metadata.title = value;
      } else if (key === "time") {
        const match = value.match(/(\d+)\/(\d+)/);
        if (match) {
          metadata.time = [parseInt(match[1]), parseInt(match[2])];
          beatsPerBar = metadata.time[0];
        }
      } else if (key === "form") {
        metadata.form = value.split(/\s+/).filter((s) => s.length > 0);
      }
      continue;
    }

    // Section markers: [A], [B], [Verse], etc.
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      // Save the previous section if it has chords
      if (currentChords.length > 0) {
        sections.push({ name: currentSectionName, chords: currentChords });
        currentChords = [];
      }
      currentSectionName = sectionMatch[1].trim();
      continue;
    }

    // Chord lines — split by | to get bars
    if (!line.includes("|")) continue;

    const bars = line
      .split("|")
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    for (const bar of bars) {
      const tokens = parseBarTokens(bar);
      if (tokens.length === 0) continue;

      const hasExplicitDurations = tokens.some((t) => t.beats !== null);

      if (hasExplicitDurations) {
        const explicitTotal = tokens
          .filter((t) => t.beats !== null)
          .reduce((sum, t) => sum + t.beats!, 0);
        const implicitCount = tokens.filter((t) => t.beats === null).length;
        const remaining = beatsPerBar - explicitTotal;
        const perImplicit =
          implicitCount > 0 ? remaining / implicitCount : 0;

        for (const token of tokens) {
          currentChords.push({
            chord: token.chord,
            durationBeats: token.beats ?? perImplicit,
          });
        }
      } else {
        const perChord = beatsPerBar / tokens.length;
        for (const token of tokens) {
          currentChords.push({ chord: token.chord, durationBeats: perChord });
        }
      }
    }
  }

  // Save the last section
  if (currentChords.length > 0) {
    sections.push({ name: currentSectionName, chords: currentChords });
  }

  // If no form order was specified, use sections in order of appearance
  if (!metadata.form) {
    metadata.form = sections.map((s) => s.name);
  }

  return { metadata, sections };
}

interface BarToken {
  chord: string;
  beats: number | null;
}

function parseBarTokens(bar: string): BarToken[] {
  const tokens: BarToken[] = [];
  const regex = /([A-Ga-g][#b]?[A-Za-z0-9/#+\-]*?)(?:\((\d+(?:\.\d+)?)\))?(?:\s|$)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(bar)) !== null) {
    tokens.push({
      chord: match[1],
      beats: match[2] ? parseFloat(match[2]) : null,
    });
  }

  if (tokens.length === 0) {
    const parts = bar.split(/\s+/).filter((p) => p.length > 0);
    for (const part of parts) {
      tokens.push({ chord: part, beats: null });
    }
  }

  return tokens;
}
