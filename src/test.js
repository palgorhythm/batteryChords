const { handle } = require("./handler");

// spd hit
console.log("spd hit", handle({ note: 57, velocity: 100, channel: 1 }));

// kick hit
console.log("kick hit", handle({ note: 0, velocity: 100, channel: 1 }));

// tom hit
console.log("tom hit", handle({ note: 1, velocity: 100, channel: 1 }));

// snare hit
console.log("snare hit", handle({ note: 2, velocity: 100, channel: 1 }));
