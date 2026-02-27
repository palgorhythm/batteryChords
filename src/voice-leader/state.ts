import type { Chart, VoicingResult } from "../shared/types";
import type { AutoCompState } from "./autoComp";
import { createAutoCompState } from "./autoComp";

export interface VoiceLeaderState {
  chart: Chart | null;
  formIndex: number;     // position in the form order (e.g., 0=first A, 1=second A, 2=B, 3=A)
  chordIndex: number;    // position within the current section's chord list
  currentVoicing: VoicingResult | null;
  playingNotes: number[];
  lastSoloNote: number | null;
  tempo: number;
  autoComp: AutoCompState;
  formPassCount: number;
}

export const STATE: VoiceLeaderState = {
  chart: null,
  formIndex: 0,
  chordIndex: -1,
  currentVoicing: null,
  playingNotes: [],
  lastSoloNote: null,
  tempo: 120,
  autoComp: createAutoCompState(),
  formPassCount: 0,
};

export function resetState(): void {
  STATE.formIndex = 0;
  STATE.chordIndex = -1;
  STATE.currentVoicing = null;
  STATE.playingNotes = [];
  STATE.lastSoloNote = null;
  STATE.autoComp = createAutoCompState();
  STATE.formPassCount = 0;
}
