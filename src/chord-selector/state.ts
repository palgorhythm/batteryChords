import type { KeyConfig } from "./config";

export const STATE = {
  note: 0,
  key: null as KeyConfig | null,
  playingNotes: [] as number[],
  chord: [] as number[],
  prevChord: [] as number[],
};
