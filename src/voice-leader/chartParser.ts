import type { Chart, ChartMetadata, ChordEntry } from "../shared/types";

/**
 * Parse a .chart file into a structured chord progression.
 *
 * Format:
 *   # Title: Autumn Leaves
 *   # Time: 4/4
 *
 *   | Cm7     | F7      | Bbmaj7  | Ebmaj7  |
 *   | Dm7 G7  | Cmaj7   |                      ← two chords in one bar = evenly split
 *   | Dm7(3) G7(1) | Cmaj7 |                   ← explicit beat counts
 */
export function parseChart(text: string): Chart {
  const lines = text.split("\n");
  const metadata: ChartMetadata = {};
  const chords: ChordEntry[] = [];

  let beatsPerBar = 4;

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
      }
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
      const hasExplicitDurations = tokens.some((t) => t.beats !== null);

      if (hasExplicitDurations) {
        // Use explicit beat counts; chords without count get remaining beats split evenly
        const explicitTotal = tokens
          .filter((t) => t.beats !== null)
          .reduce((sum, t) => sum + t.beats!, 0);
        const implicitCount = tokens.filter((t) => t.beats === null).length;
        const remaining = beatsPerBar - explicitTotal;
        const perImplicit =
          implicitCount > 0 ? remaining / implicitCount : 0;

        for (const token of tokens) {
          chords.push({
            chord: token.chord,
            durationBeats: token.beats ?? perImplicit,
          });
        }
      } else {
        // Evenly split the bar
        const perChord = beatsPerBar / tokens.length;
        for (const token of tokens) {
          chords.push({ chord: token.chord, durationBeats: perChord });
        }
      }
    }
  }

  return { metadata, chords };
}

interface BarToken {
  chord: string;
  beats: number | null;
}

function parseBarTokens(bar: string): BarToken[] {
  const tokens: BarToken[] = [];
  // Match chord names optionally followed by (N) for beat count
  const regex = /([A-Ga-g][#b]?[A-Za-z0-9/#+\-]*?)(?:\((\d+(?:\.\d+)?)\))?(?:\s|$)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(bar)) !== null) {
    tokens.push({
      chord: match[1],
      beats: match[2] ? parseFloat(match[2]) : null,
    });
  }

  // Fallback: if regex didn't match, split by whitespace
  if (tokens.length === 0) {
    const parts = bar.split(/\s+/).filter((p) => p.length > 0);
    for (const part of parts) {
      tokens.push({ chord: part, beats: null });
    }
  }

  return tokens;
}

export function chartToString(chart: Chart): string {
  const lines: string[] = [];
  if (chart.metadata.title) {
    lines.push(`# Title: ${chart.metadata.title}`);
  }
  if (chart.metadata.time) {
    lines.push(`# Time: ${chart.metadata.time[0]}/${chart.metadata.time[1]}`);
  }
  lines.push("");

  const beatsPerBar = chart.metadata.time?.[0] ?? 4;
  let currentBarBeats = 0;
  let barChords: string[] = [];

  for (const entry of chart.chords) {
    barChords.push(entry.chord);
    currentBarBeats += entry.durationBeats;

    if (currentBarBeats >= beatsPerBar) {
      lines.push(`| ${barChords.join(" ").padEnd(7)} |`);
      barChords = [];
      currentBarBeats = 0;
    }
  }

  if (barChords.length > 0) {
    lines.push(`| ${barChords.join(" ")} |`);
  }

  return lines.join("\n");
}
