// Checks pose sequence files against the published contract,
// public/schemas/nexus-pose-sequence.schema.json — the format futurespace exports
// and imports, and nexus-data writes. Validates the example in docs/ and what
// lib/sequence.ts's exportSequence produces, for an eased and a recorded sequence.
//   node scripts/validate-sequences.mjs     (npm run validate:sequences)
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { parseRobotDef } from "../lib/robot-def.ts";
import { exportSequence, parseSequence } from "../lib/sequence.ts";

const schema = JSON.parse(readFileSync("public/schemas/nexus-pose-sequence.schema.json", "utf8"));
const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

const robotJson = JSON.parse(readFileSync("public/models/optimus/robot.json", "utf8"));
const def = parseRobotDef(robotJson, "optimus", "/models/optimus/");
const example = JSON.parse(readFileSync("docs/optimus_wave_sequence.json", "utf8"));
const eased = parseSequence(example, def);
const ids = def.servos.map((s) => s.id);
const recorded = {
  ...eased,
  recording: {
    hz: 50,
    frames: [ids.map(() => 0), ids.map(() => 0.1)],
    episode: "0123456789abcdef",
  },
};

const cases = {
  "docs/optimus_wave_sequence.json": example,
  "exportSequence (eased)": exportSequence(def, eased),
  "exportSequence (recorded)": exportSequence(def, recorded),
};

let failed = false;
for (const [name, doc] of Object.entries(cases)) {
  if (validate(doc)) console.log(`✓ ${name}`);
  else {
    failed = true;
    console.error(`✗ ${name}`);
    for (const e of validate.errors) console.error(`    ${e.instancePath || "/"} ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
