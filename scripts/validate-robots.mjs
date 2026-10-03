// Validates every robot listed in public/models/index.json: its robot.json must
// match the schema in lib/robot-def.ts, every URDF joint it references must
// exist, and every mesh the URDF references must be on disk.
//   node scripts/validate-robots.mjs        (npm run validate:robots)
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { checkAgainstUrdf, parseRobotDef } from "../lib/robot-def.ts";

const MODELS = "public/models";
const { robots } = JSON.parse(readFileSync(join(MODELS, "index.json"), "utf8"));
let failed = false;

for (const id of robots) {
  const problems = [];
  let def;
  try {
    const raw = JSON.parse(readFileSync(join(MODELS, id, "robot.json"), "utf8"));
    def = parseRobotDef(raw, id, `/models/${id}/`);
  } catch (e) {
    problems.push(e.message);
  }

  if (def) {
    const urdfPath = join("public", def.urdf);
    if (!existsSync(urdfPath)) problems.push(`URDF not found: ${urdfPath}`);
    else {
      const urdf = readFileSync(urdfPath, "utf8");
      const joints = new Set([...urdf.matchAll(/<joint\s+name="([^"]+)"/g)].map((m) => m[1]));
      problems.push(...checkAgainstUrdf(def, joints));
      for (const [, file] of urdf.matchAll(/<mesh\s+filename="([^"]+)"/g))
        if (!existsSync(join(dirname(urdfPath), file))) problems.push(`mesh not found: ${file}`);
    }
  }

  if (problems.length) {
    failed = true;
    console.error(`✖ ${id}\n  ${problems.join("\n  ")}`);
  } else {
    console.log(`✓ ${id}: ${def.servos.length} servos`);
  }
}

process.exit(failed ? 1 : 0);
