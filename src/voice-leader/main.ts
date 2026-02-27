import Max from "max-api";
import { readFileSync } from "fs";
import { resolve, isAbsolute } from "path";
import { parseChart } from "./chartParser";
import {
  handleMidi,
  advanceAndPlay,
  getNoteOffs,
  voicingToNoteEvents,
  getCurrentChordName,
  getProgressInfo,
} from "./handler";
import { CONFIG } from "./config";
import { STATE, resetState } from "./state";
import { shouldTrigger, resetForNewChord } from "./autoComp";

const PROJECT_ROOT = resolve(__dirname, "..");

function log(msg: string): void {
  Max.post(msg);
  console.log(msg);
}

// ─── Output helpers ───────────────────────────────────────────

function sendMidi(note: number, velocity: number, channel: number): void {
  Max.outlet(["midi", note, velocity, channel]);
}

function sendDisplay(): void {
  Max.outlet(["display", getCurrentChordName()]);
  Max.outlet(["keys", ...STATE.playingNotes]);
}

function sendNoteOffs(): void {
  for (const note of STATE.playingNotes) {
    sendMidi(note, 0, CONFIG.outputChannel);
  }
  STATE.playingNotes = [];
  Max.outlet(["keys"]);
}

function sendNoteEvents(
  noteOffs: { note: number; velocity: number; channel: number }[],
  noteOns: { note: number; velocity: number; channel: number }[]
): void {
  for (const n of noteOffs) {
    sendMidi(n.note, 0, n.channel);
  }
  const offSet = new Set(noteOffs.map((n) => n.note));
  STATE.playingNotes = STATE.playingNotes.filter((n) => !offSet.has(n));

  for (const n of noteOns) {
    sendMidi(n.note, n.velocity, n.channel);
    STATE.playingNotes.push(n.note);
  }

  if (noteOns.length > 0) {
    sendDisplay();
  }
}

function postChordInfo(): void {
  log(`[${getProgressInfo()}] ${getCurrentChordName()}`);
}

// ─── Path resolution ──────────────────────────────────────────

function resolveChartPath(filePath: string): string {
  if (isAbsolute(filePath)) return filePath;
  return resolve(PROJECT_ROOT, filePath);
}

// ─── Message handlers ─────────────────────────────────────────

Max.addHandler("loadChart", (filePath: string) => {
  loadChartFromPath(filePath);
});

Max.addHandler("autocomp", (enabled: number) => {
  STATE.autoComp.enabled = enabled === 1;
  log(`Auto-comp: ${STATE.autoComp.enabled ? "ON" : "OFF"}`);
  if (STATE.autoComp.enabled) {
    const form = STATE.chart?.metadata.form;
    if (form && form.length > 0) {
      const section = STATE.chart!.sections.find(
        (s) => s.name === form[STATE.formIndex]
      );
      if (section && STATE.chordIndex >= 0 && STATE.chordIndex < section.chords.length) {
        resetForNewChord(STATE.autoComp, section.chords[STATE.chordIndex].durationBeats);
      }
    }
  }
});

Max.addHandler("beat", () => {
  if (!STATE.autoComp.enabled || !STATE.chart) return;

  if (shouldTrigger(STATE.autoComp)) {
    sendNoteOffs();
    if (STATE.currentVoicing) {
      const ons = voicingToNoteEvents(STATE.currentVoicing, CONFIG.autoCompVelocity);
      sendNoteEvents([], ons);
    }
  }

  STATE.autoComp.beatCount++;

  if (STATE.autoComp.beatCount >= STATE.autoComp.chordDuration) {
    sendNoteOffs();
    const ons = advanceAndPlay(CONFIG.autoCompVelocity);
    sendNoteEvents([], ons);
    postChordInfo();

    // Get the new current chord's duration for next auto-comp cycle
    const form = STATE.chart.metadata.form;
    if (form && form.length > 0) {
      const section = STATE.chart.sections.find(
        (s) => s.name === form[STATE.formIndex]
      );
      if (section && STATE.chordIndex >= 0 && STATE.chordIndex < section.chords.length) {
        resetForNewChord(STATE.autoComp, section.chords[STATE.chordIndex].durationBeats);
        // Mark beat 0 as already triggered — chord was just played by advanceAndPlay above
        STATE.autoComp.triggeredBeats.add(0);
      }
    }
  }
});

Max.addHandler("tempo", (bpm: number) => {
  STATE.tempo = bpm;
});

Max.addHandler("reset", () => {
  sendNoteOffs();
  resetState();
  Max.outlet(["display", "—"]);
  Max.outlet(["keys"]);
  log("Reset to start of chart");
});

Max.addHandler("triggerNote", (note: number) => {
  CONFIG.triggerNote = note;
  log(`Trigger note set to MIDI ${note}`);
});

Max.addHandler("sectionAdvanceNote", (note: number) => {
  CONFIG.sectionAdvanceNote = note;
  log(`Section advance note set to MIDI ${note}`);
});

Max.addHandler("soloPadStart", (note: number) => {
  CONFIG.soloPadStart = note;
  log(`Solo pad range: MIDI ${note}–${note + CONFIG.soloPadCount - 1}`);
});

Max.addHandler("soloPadCount", (count: number) => {
  CONFIG.soloPadCount = count;
  log(`Solo pad count: ${count}`);
});

// ─── MIDI input handler ───────────────────────────────────────

Max.addHandlers({
  [Max.MESSAGE_TYPES.ALL]: (handled: boolean, ...args: number[]) => {
    // Skip messages already handled by named handlers (beat, loadChart, etc.)
    if (handled) return;

    const [, midiNote, midiVelocity] = args;

    // Guard: ignore non-numeric args (e.g., string messages that leak through)
    if (typeof midiNote !== "number" || typeof midiVelocity !== "number") return;

    if (STATE.autoComp.enabled) {
      // In auto-comp, ignore trigger/section notes (chords are beat-driven)
      // but process solo notes (both note-on and note-off for proper articulation)
      if (midiNote === CONFIG.triggerNote || midiNote === CONFIG.sectionAdvanceNote) return;

      const { noteOffs, noteOns } = handleMidi(midiNote, midiVelocity);
      sendNoteEvents(noteOffs, noteOns);
      return;
    }

    // Manual mode: handle all MIDI
    const { noteOffs, noteOns } = handleMidi(midiNote, midiVelocity);

    if (noteOns.length > 0) {
      postChordInfo();
    }

    sendNoteEvents(noteOffs, noteOns);
  },
});

// ─── Startup ──────────────────────────────────────────────────

const BUILD_ID = Date.now().toString(36);

function loadChartFromPath(filePath: string): void {
  try {
    const absPath = resolveChartPath(filePath);
    log(`Loading chart: ${absPath}`);
    const text = readFileSync(absPath, "utf-8");
    const chart = parseChart(text);
    resetState();
    STATE.chart = chart;

    const sectionNames = chart.sections.map((s) => s.name);
    const totalChords = chart.sections.reduce((sum, s) => sum + s.chords.length, 0);
    const form = chart.metadata.form?.join(" ") ?? sectionNames.join(" ");

    log(`Loaded: ${chart.metadata.title ?? filePath}`);
    log(`Sections: ${sectionNames.join(", ")} (${totalChords} chords total)`);
    log(`Form: ${form}`);
    log(`Trigger: MIDI ${CONFIG.triggerNote} | Section advance: MIDI ${CONFIG.sectionAdvanceNote}`);
  } catch (err) {
    log(`ERROR loading chart: ${err}`);
  }
}

log("═══════════════════════════════════════");
log(`voiceLeader [build ${BUILD_ID}]`);
log("═══════════════════════════════════════");

const DEFAULT_CHART = "charts/giant-steps.chart";
loadChartFromPath(DEFAULT_CHART);
