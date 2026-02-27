# batteryChords

Max for Live MIDI devices for BATTERY. Two devices:

1. **Chord Selector** — drum pads select keys/chords from scales, kick plays the chord, snare/tom play accent notes
2. **Voice Leader** — reads a chord chart, voice-leads through jazz progressions with different voicings each pass through the form

Both devices process MIDI input from drum pads (or any MIDI controller) and output MIDI chord voicings to a synth/instrument on the same Ableton track.

## Setup

### Prerequisites

- Ableton Live 12
- Node.js 20+ (bundled with Live 12's Max)
- npm

### Install & Build

```bash
npm install
npm run build
```

This creates:
- `devices/batteryChords.js` + `devices/batteryChords.amxd`
- `devices/voiceLeader.js` + `devices/voiceLeader.amxd`

### Load in Ableton

1. Drag a `.amxd` file from the `devices/` folder onto a MIDI track
2. Add an instrument (synth, piano, etc.) on the same track
3. Arm the track for MIDI input

### Testing with Keyboard

- Press **M** in Ableton's toolbar to enable Computer MIDI Keyboard
- Or connect any USB MIDI controller
- The keyboard maps to MIDI notes starting at C1 (MIDI 36)

### Development

```bash
npm run dev
```

Watches TypeScript files and rebuilds on changes. With `@watch 1` on the node.script, Max auto-reloads the script when the JS file updates.

---

## Device 1: Chord Selector

Drum pad → key/chord selection system. Hit pads to select a key, then kick/snare/tom trigger the chord.

### MIDI Mapping

| MIDI Notes | Action |
|------------|--------|
| 0 (kick) | Play the current chord |
| 1 (snare) | Play a random upper chord tone (+12 semitones) |
| 2 (tom) | Play a random upper chord tone (+24 semitones) |
| 27-33 | Select C major, pick chord degree |
| 36-42 | Select D major |
| 45-51 | Select E major |
| 54-60 | Select F# major |
| 63-69 | Select G# major |
| 72-78 | Select B major |
| 81-87 | Select C# major |
| 90-96 | Select A# major |

### How It Works

1. Hit a pad in one of the key ranges (e.g., MIDI 27 = C major, 1st chord degree)
2. This selects the key and chord — all output is muted
3. Hit kick (MIDI 0) to hear the chord with a fresh random voicing
4. Hit snare/tom for melodic accent notes from the chord

---

## Device 2: Voice Leader

Jazz voice-led chord progression player. Load a chord chart, then trigger chords with kick. Each pass through the form generates different voicings using voice leading rules.

### MIDI Mapping (configurable)

| MIDI Note | Action |
|-----------|--------|
| 36 (C1, kick) | Advance to next chord + play it |
| 37-43 (C#1-G1) | Solo pads — play random chord/scale tones in upper register |

### Loading a Chart

In the Max device, click the `loadChart` message box and edit the path:

```
loadChart /path/to/your/chart.chart
```

Or use the included charts:
```
loadChart charts/autumn-leaves.chart
loadChart charts/all-the-things.chart
loadChart charts/blues-in-f.chart
```

### Chart File Format

Simple text format — just type chord symbols between bar lines:

```
# Title: My Tune
# Time: 4/4

| Dm7     | G7      | Cmaj7   | Cmaj7   |
| Em7     | A7      | Dm7     | G7      |
```

**Rules:**
- `#` lines are metadata (`# Title:`, `# Time:`)
- `|` separates bars
- One chord per bar = fills the whole bar
- Multiple chords in a bar = evenly split: `| Dm7 G7 |` = 2 beats each
- Explicit beat counts: `| Dm7(3) G7(1) |` = 3 beats + 1 beat
- Blank lines are ignored
- The progression loops automatically

**Supported chord symbols** (parsed by tonal.js):

`C`, `Cm`, `C7`, `Cmaj7`, `Cm7`, `Cm7b5`, `Cdim7`, `CmM7`, `Csus4`, `C6`, `Cm6`, `Cmaj7#5`, `C7#11`, `C7alt`, and more.

### Voice Leading

The voicing engine uses jazz piano voicing conventions:

- **Bill Evans-style rootless voicings** (Type A and Type B) for smooth ii-V-I movement
- **Drop 2 voicings** for wider spacing
- **Quartal voicings** for modal sounds (McCoy Tyner / Herbie Hancock style)
- **Bass note** in octave 2-3 (MIDI 36-52), moving by step or 4th/5th
- **Upper voices** in octave 3-5 (MIDI 48-72), voice-led to minimize movement
- **Guide tone weighting** — 3rds and 7ths get priority in voice leading distance calculation
- **Weighted randomness** — picks from top 3 smoothest candidates so each form pass sounds different

### Solo Pads

MIDI notes 37-43 (configurable) each trigger a random chord tone in the solo register (octave 5-6). The number of pads matches the scale degree count (7 for diatonic chords). This lets you "solo over the changes" with drum pads.

### Auto-Comp Mode

Toggle with the `autocomp 1` / `autocomp 0` message in the Max device.

When enabled, chords advance automatically in sync with Ableton's transport:
- A `metro 4n` in the Max patch sends beat ticks to the Node script
- The script tracks position in the chart and advances based on chord durations
- Rhythmic variation: randomly applies different comping patterns (whole notes, half notes, charleston, syncopation, backbeat)

When disabled (default): kick hit (MIDI 36) advances manually.

### Configurable Parameters

Send these messages to the device:

| Message | Description |
|---------|-------------|
| `loadChart <path>` | Load a .chart file |
| `autocomp <0\|1>` | Toggle auto-comp mode |
| `reset` | Return to start of chart |
| `triggerNote <n>` | Change the trigger MIDI note (default: 36) |
| `soloPadStart <n>` | Change the first solo pad MIDI note (default: 37) |
| `soloPadCount <n>` | Change the number of solo pads (default: 7) |

---

## Project Structure

```
batteryChords/
├── src/
│   ├── shared/           # Shared types & MIDI utilities
│   ├── chord-selector/   # Chord Selector device source
│   └── voice-leader/     # Voice Leader device source
├── devices/              # Built .amxd devices + bundled JS
│   └── templates/        # .maxpat JSON templates
├── charts/               # Example chord chart files
├── scripts/              # Build scripts
├── ableton/              # Ableton Live project
├── package.json
├── tsconfig.json
└── README.md
```

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build everything (TypeScript → JS bundles → .amxd devices) |
| `npm run build:chord-selector` | Build only the chord selector JS |
| `npm run build:voice-leader` | Build only the voice leader JS |
| `npm run build:devices` | Build .amxd files from templates |
| `npm run dev` | Watch mode — auto-rebuild on file changes |
| `npm run format` | Format source with Prettier |

## Tech Stack

- **TypeScript** — source language, compiled with esbuild
- **tonal** — music theory library (chord parsing, note/MIDI conversion)
- **max-api** — Node for Max runtime API (provided by Ableton/Max, not bundled)
- **esbuild** — fast TypeScript bundler
