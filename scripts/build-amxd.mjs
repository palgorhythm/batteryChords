/**
 * Build .amxd (Max for Live device) files from .maxpat JSON templates.
 *
 * Injects absolute paths for node.script so Max can find the JS files
 * regardless of search path configuration.
 *
 * AMPF format:
 *   Bytes 0-3:   "ampf" (magic)
 *   Bytes 4-7:   04 00 00 00
 *   Bytes 8-15:  "mmmmmeta"
 *   Bytes 16-19: 04 00 00 00
 *   Bytes 20-23: 01 00 00 00
 *   Bytes 24-27: "ptch"
 *   Bytes 28-31: JSON payload length (little-endian uint32)
 *   Bytes 32+:   JSON payload + \n + \0
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEVICES_DIR = join(ROOT, "devices");

// Fixed 28-byte AMPF header prefix
const HEADER_PREFIX = Buffer.from(
  "616d7066040000006d6d6d6d6d657461040000000100000070746368",
  "hex"
);

function buildAmxd(templatePath, outputPath, jsFileName) {
  let json = readFileSync(templatePath, "utf-8");
  const patch = JSON.parse(json);

  // Inject absolute path for node.script
  const absJsPath = resolve(DEVICES_DIR, jsFileName);
  for (const boxWrapper of patch.patcher.boxes) {
    const box = boxWrapper.box;
    if (box.text && box.text.startsWith("node.script ")) {
      box.text = `node.script ${absJsPath} @autostart 1 @watch 1`;
      console.log(`  node.script → ${absJsPath}`);
    }
  }

  // Update dependency cache bootpath to absolute path
  if (patch.patcher.dependency_cache) {
    for (const dep of patch.patcher.dependency_cache) {
      if (dep.name === jsFileName) {
        dep.bootpath = DEVICES_DIR;
      }
    }
  }

  // Update project devpath
  if (patch.patcher.project) {
    patch.patcher.project.devpath = DEVICES_DIR;
  }

  // Serialize
  const jsonOut = JSON.stringify(patch, null, 2);

  // Create payload: JSON + newline + null byte (matches original format)
  const payload = Buffer.from(jsonOut + "\n\0", "utf-8");

  // Build header: prefix + payload length as LE uint32
  const header = Buffer.alloc(32);
  HEADER_PREFIX.copy(header);
  header.writeUInt32LE(payload.length, 28);

  // Write .amxd
  const output = Buffer.concat([header, payload]);
  writeFileSync(outputPath, output);
  console.log(`  → ${outputPath} (${output.length} bytes)`);
}

// Build both devices
const devices = [
  {
    template: join(ROOT, "devices/templates/batteryChords.maxpat.json"),
    output: join(ROOT, "devices/batteryChords.amxd"),
    jsFile: "batteryChords.js",
  },
  {
    template: join(ROOT, "devices/templates/voiceLeader.maxpat.json"),
    output: join(ROOT, "devices/voiceLeader.amxd"),
    jsFile: "voiceLeader.js",
  },
];

console.log(`Project root: ${ROOT}`);
console.log(`Devices dir:  ${DEVICES_DIR}\n`);

for (const { template, output, jsFile } of devices) {
  try {
    console.log(`Building ${jsFile.replace(".js", ".amxd")}...`);
    buildAmxd(template, output, jsFile);
    console.log("");
  } catch (err) {
    console.error(`Error building ${output}: ${err.message}`);
    process.exit(1);
  }
}

console.log("All devices built successfully!");
