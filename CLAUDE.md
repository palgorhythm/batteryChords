# Claude Code Context for batteryChords

Use this file to quickly resume work on this project in a new Claude session.

## Project Overview

Max for Live MIDI devices for Jacob's solo project BATTERY. Two devices:
- **Chord Selector** (`devices/batteryChords.amxd`) — drum pad chord selection from scales
- **Voice Leader** (`devices/voiceLeader.amxd`) — voice-led jazz chord progressions from `.chart` files

## Architecture

- **TypeScript** source in `src/`, bundled with **esbuild** to single JS files in `devices/`
- `max-api` is external (provided by Max runtime at Ableton/Max load time, not bundled)
- `.amxd` files are built from `.maxpat.json` templates in `devices/templates/` via `scripts/build-amxd.mjs`
- AMPF binary format: 28-byte fixed header prefix + 4-byte LE uint32 JSON length + JSON payload + `\n\0`
- Target runtime: **Ableton Live 12** (bundled Node.js v20)
- Both `.amxd` patches use **presentation mode** — only user-facing controls visible in Ableton

### Source Structure

```
src/
├── shared/               # Shared types (NoteEvent, VoicingResult, Chart) and MIDI helpers
│   ├── types.ts
│   └── midi.ts
├── chord-selector/       # Device 1: pad → key/chord selection
│   ├── main.ts           # Max entry point, MIDI I/O
│   ├── handler.ts        # MIDI routing (kick/snare/tom/pad logic)
│   ├── chords.ts         # Scale-based chord generation using tonal
│   ├── config.ts         # Key mappings, MIDI note ranges
│   └── state.ts          # Runtime state (current chord, key, playing notes)
├── voice-leader/         # Device 2: voice-led jazz progressions
│   ├── main.ts           # Max entry point, message handlers, auto-loads default chart on startup
│   ├── handler.ts        # MIDI routing (trigger pad, solo pads), logs note names per chord
│   ├── chartParser.ts    # Parses .chart text files → Array<{chord, durationBeats}>
│   ├── voicingEngine.ts  # Core voice leading algorithm
│   ├── voicingDict.ts    # Jazz voicing templates per chord quality
│   ├── autoComp.ts       # Transport-synced auto-comp with rhythmic variation patterns
│   ├── config.ts         # Configurable trigger note (36), solo pad range (37-43)
│   └── state.ts          # Runtime state (chart, chord index, current voicing, auto-comp state)
└── max-api.d.ts          # Type declarations for the max-api module
```

### Build Output

```
devices/
├── batteryChords.amxd    # Built M4L device (load in Ableton)
├── batteryChords.js      # esbuild bundle for chord-selector
├── voiceLeader.amxd      # Built M4L device (load in Ableton)
├── voiceLeader.js        # esbuild bundle for voice-leader
└── templates/            # .maxpat JSON source for the Max patches
```

### Chart Format

Simple text lead-sheet format in `charts/*.chart`:
```
# Title: Autumn Leaves
# Time: 4/4
| Cm7     | F7      | Bbmaj7  | Ebmaj7  |
| Dm7 G7  | Cmaj7   |                      ← multiple chords = evenly split
| Dm7(3) G7(1) | Cmaj7 |                   ← explicit beat counts
```

## Key Commands

```bash
npm run build              # Full build: TS → JS bundles → .amxd devices
npm run build:chord-selector  # Build only chord-selector JS
npm run build:voice-leader    # Build only voice-leader JS
npm run build:devices         # Build .amxd from templates
npm run dev                   # Watch mode (auto-rebuild on file changes)
npm run format                # Prettier
npx tsc --noEmit              # Type check (no output, just errors)
```

## Reloading Devices in Ableton

- **JS-only changes** (src/ files): `npm run build:voice-leader`, then in the M4L device click "script stop" → "script start". The `@watch 1` flag SHOULD auto-reload but is unreliable — manual stop/start is safest.
- **Patch structure changes** (templates/): `npm run build` (full), then DELETE the device from the Ableton track and re-drag the new .amxd from `devices/`.
- Each script startup prints a **build ID** (e.g. `voiceLeader [build mm2iqgsa]`) — use this to verify you're running the latest code.
- The build script injects **absolute paths** into the .amxd `node.script` text so Max can find the JS files regardless of search path config.

## Voice Leading Engine — Design Decisions & Lessons Learned

### Algorithm (`voicingEngine.ts`)
1. Parse chord symbol via `Chord.get()` from tonal → root pitch class (0-11) + quality
2. Look up voicing templates from `voicingDict.ts` for that quality
3. **Generate candidates** by placing each template at every octave of the root pitch class (octaves 1-6). ALL notes must fall within the upper range.
4. Bass note: root in bass range, closest to previous bass note
5. **Score candidates** by voice leading distance from previous voicing
6. Small jitter (±2) breaks ties so the same transition doesn't always pick the exact same voicing
7. Pick from top 4 candidates with steep exponential decay (0.45)

### Voice Leading Distance Scoring
- Each voice matched by position (bottom to top, since voicings are sorted)
- **Step motion (1-2 semitones)**: cheap — this is ideal jazz voice leading
- **Small skip (3-4 semitones)**: moderate cost (1.5x)
- **Large leap (5+ semitones)**: expensive (3x) — sounds wrong in comping
- **Guide tone weighting**: bottom 2 voices (3rd and 7th in rootless voicings) weighted 1.8x
- **Common tone reward**: each held note subtracts from the distance (smooth transitions)
- **Voice count mismatch penalty**: 4↔5 is moderate (12), larger changes are very expensive

### Ranges (Critical — learned through iteration)
- **Bass**: C2–E3 (MIDI 36–52)
- **Upper voices**: G3–D5 (MIDI 55–74) — the jazz piano comping sweet spot
- **Solo**: C5–C7 (MIDI 72–96)
- There should be a **gap between bass and upper voices** — this is how pianists actually voice chords (LH bass, RH chord)

### Voicing Dictionary (`voicingDict.ts`)
Templates per chord quality, tagged by feel: `rootless`, `spread`, `quartal`, `rich`
- **Rootless** (4 notes): Bill Evans Type A (3rd on bottom) and Type B (7th on bottom) — the bread and butter
- **Spread** (4 notes): wider intervals, still within range
- **Quartal** (4 notes): stacked 4ths (McCoy Tyner / Herbie style)
- **Rich** (5 notes): extensions (#11, 13, etc.)
- Variety comes from template diversity, NOT from overriding voice leading with randomness

### Critical Bug History
- **Root pitch class bug**: The original candidate generation loop (`for rootMidi = 24; rootMidi <= 72; rootMidi += 12`) only tried roots at C octaves (pitch class 0). For ANY non-C chord, zero candidates were generated and it fell through to a deterministic fallback. Fixed by iterating `rootPc + octave * 12` for octaves 1-6.

### What Sounds Bad (avoid these)
- **Shell voicings (2 notes)**: too thin, jarring texture change when mixed with 4-note voicings
- **20% random voicing skip**: completely ignoring voice leading for "surprise" just sounds wrong
- **Large jitter (±8+)**: lets bad voice leading beat good voice leading by random chance
- **Wide pool with gentle decay**: too many poor candidates get through
- **Bass chromatic approach notes**: sounds like a wrong note without quick rhythmic resolution
- **5th in the bass**: sounds like an unintended inversion without a band establishing the root
- **Notes outside the sweet spot**: "half notes in range is OK" filter lets muddy/thin voicings through — require ALL notes in range
- **Contrary motion scoring bonus**: sounds academic, not musical — just let smoothness win

### What Sounds Good
- **Strict range filtering**: ALL notes must be in G3–D5
- **Strong preference for smooth voice leading**: steep decay, small pool
- **Individual voice leap penalty**: penalize any voice moving >4 semitones
- **Common tone reward**: holding shared notes across chord changes
- **Template variety**: different voicing types (A, B, spread, quartal) provide natural variety without needing randomness hacks
- **Small jitter (±2)**: enough to break ties, not enough to override good decisions
- **Bass always root**: simple and correct
- **Velocity shaping**: inner voices slightly softer than outer voices (natural piano touch)
- **First chord fully random**: picks from all valid candidates so each playthrough starts differently

## Max Patch Communication

### Voice Leader output routing
- Node script prefixes all output: `Max.outlet(["midi", note, vel, ch])` for MIDI, `Max.outlet(["display", chordName])` for chord display, `Max.outlet(["keys", ...notes])` for keyboard
- Max patch uses `route midi display keys` to split the output
- `midi` → `unpack 0 0 0` → `noteout` (and also → `kslider` for visual keyboard)
- `display` → `prepend set` → `comment` (chord name display)
- Presentation mode shows: title, chord name, loadChart button, autocomp on/off, script start/stop, reset, piano keyboard (kslider), and n4m.monitor log

### Chord Selector output
- Direct `Max.outlet([note, vel, ch])` — no prefix routing needed

## User Preferences

- Prefers **TypeScript** for maintainability and readability
- Uses **Ableton Live 12** on macOS
- Jacob plays **drums/pads** as MIDI input (SPD-style controller)
- Wants **jazz-focused** voicings and voice leading (Bill Evans, McCoy Tyner influences)
- Prefers clean, well-organized project structure with everything self-contained
- M4L devices should look **polished** — presentation mode, only user-facing controls visible
- Doesn't want to open Max editor to see logs — logs should be inline in the device
- Testing with Ableton's Computer MIDI Keyboard (press M) — MIDI note 36 = C1 = trigger

## Dependencies

- `tonal` (v6) — music theory: chord parsing, note/MIDI conversion, scale info
- `esbuild` — TypeScript bundler (fast, single-file output)
- `typescript` — type checking only (esbuild handles transpilation)
- `max-api` — NOT a real dependency; provided by Max runtime, excluded from bundle via `--external:max-api`
