export const CONFIG = {
  /** MIDI note that advances to the next chord and plays it (kick) */
  triggerNote: 0,

  /** MIDI note that advances to the next section in the form (floor tom) */
  sectionAdvanceNote: 3,

  /** MIDI notes that trigger solo notes (crash cymbal, all 5 zones) */
  soloNotes: [9, 10, 11, 12, 13],

  /** Velocity for auto-comp chord attacks */
  autoCompVelocity: 90,

  /** MIDI channel for output */
  outputChannel: 1,
};
