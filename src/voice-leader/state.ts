import type { Chart, VoicingResult } from "../shared/types";
import type { AutoCompState } from "./autoComp";
import { createAutoCompState } from "./autoComp";

export interface VoiceLeaderState {
  chart: Chart | null;
  chordIndex: number;
  currentVoicing: VoicingResult | null;
  playingNotes: number[];
  tempo: number;
  autoComp: AutoCompState;
  formPassCount: number; // how many times we've looped the form
}

export const STATE: VoiceLeaderState = {
  chart: null,
  chordIndex: -1, // starts at -1 so first advance goes to 0
  currentVoicing: null,
  playingNotes: [],
  tempo: 120,
  autoComp: createAutoCompState(),
  formPassCount: 0,
};

export function resetState(): void {
  STATE.chordIndex = -1;
  STATE.currentVoicing = null;
  STATE.playingNotes = [];
  STATE.autoComp = createAutoCompState();
  STATE.formPassCount = 0;
}
