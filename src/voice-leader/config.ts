export const CONFIG = {
  /** MIDI note that advances to the next chord and plays it */
  triggerNote: 36,

  /** First MIDI note in the solo pad range. Solo pads span triggerNote+1 to triggerNote+7 */
  soloPadStart: 37,

  /** Number of solo pads (typically 7 for diatonic scale) */
  soloPadCount: 7,

  /** Velocity for auto-comp chord attacks */
  autoCompVelocity: 90,

  /** MIDI channel for output */
  outputChannel: 1,
};
