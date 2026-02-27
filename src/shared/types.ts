export interface NoteEvent {
  note: number;
  velocity: number;
  channel: number;
}

export interface ChordEntry {
  chord: string;
  durationBeats: number;
}

export interface Section {
  name: string;
  chords: ChordEntry[];
}

export interface ChartMetadata {
  title?: string;
  time?: [number, number]; // [numerator, denominator]
  form?: string[];         // section playback order, e.g. ["A", "A", "B", "A"]
}

export interface Chart {
  metadata: ChartMetadata;
  sections: Section[];
}

export interface VoicingResult {
  bass: number;
  upper: number[];
}
