"use client";

import { useEffect, useState } from "react";
import { parseRobotDef, type RobotDef } from "./robot-def";

/**
 * Loads every robot listed in /models/index.json and its robot.json. Invalid
 * definitions are skipped and reported in `errors`, so one broken file doesn't
 * take the whole UI down.
 */
export function useRobotDefs(): { defs: RobotDef[] | null; errors: string[] } {
  const [defs, setDefs] = useState<RobotDef[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found: RobotDef[] = [];
      const problems: string[] = [];
      try {
        const index = (await (await fetch("/models/index.json")).json()) as { robots: string[] };
        for (const id of index.robots) {
          const base = `/models/${id}/`;
          try {
            const res = await fetch(`${base}robot.json`);
            if (!res.ok) throw new Error(`${id}/robot.json: HTTP ${res.status}`);
            found.push(parseRobotDef(await res.json(), id, base));
          } catch (e) {
            problems.push(e instanceof Error ? e.message : String(e));
          }
        }
      } catch (e) {
        problems.push(`models/index.json: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (cancelled) return;
      for (const p of problems) console.error(`[robots] ${p}`);
      setDefs(found);
      setErrors(problems);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { defs, errors };
}
