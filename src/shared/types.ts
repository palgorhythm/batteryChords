export interface NoteEvent {
  note: number;
  velocity: number;
  channel: number;
}

export interface ChordEntry {
  chord: string;
  durationBeats: number;
}

export interface ChartMetadata {
  title?: string;
  time?: [number, number]; // [numerator, denominator]
}

export interface Chart {
  metadata: ChartMetadata;
  chords: ChordEntry[];
}

export interface VoicingResult {
  bass: number;
  upper: number[];
}
