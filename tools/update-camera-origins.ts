import { writeFile } from "node:fs/promises";
import { createFlight } from "../src/scene/flight";
import { events } from "../src/show/waves";
const f = createFlight(),
  origins = new Map<number, unknown>();
for (let t = 0; t <= 220; t += 0.1) {
  f.advance(t, { turn: 0, tilt: 0 }, false);
  for (const e of f.origins()) origins.set(e.id, e);
}
if (origins.size !== events.length)
  throw Error(`Missing origins ${origins.size}/${events.length}`);
await writeFile(
  "show/camera-origins.json",
  JSON.stringify(
    {
      clock:
        "No-input comfort45% production route; diagnostic origins only. Actual input forecasts lock once.",
      events: [...origins.values()].sort((a: any, b: any) => a.id - b.id),
    },
    null,
    2,
  ) + "\n",
);
