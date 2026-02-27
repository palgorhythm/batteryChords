export const CONFIG = {
  /** MIDI note that advances to the next chord and plays it */
  triggerNote: 36,

  /** MIDI note that advances to the next section in the form */
  sectionAdvanceNote: 39,

  /** First MIDI note in the solo pad range */
  soloPadStart: 37,

  /** Number of solo pads (typically 7 for diatonic scale) */
  soloPadCount: 7,

  /** Velocity for auto-comp chord attacks */
  autoCompVelocity: 90,

  /** MIDI channel for output */
  outputChannel: 1,
};
