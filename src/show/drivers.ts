import { events, WAVE, type Front } from "./waves";
// Keep both decorative fronts for their COMPLETE life. Merely taking the last
// two physical fronts would cut an old light crest off at each newer birth.
const ids = new Set<number>();
let previous = -Infinity;
for (const event of events)
  if (event.time - previous >= WAVE.lifetime / 2 + 0.02) {
    ids.add(event.id);
    previous = event.time;
  }
export function decorationFronts(fronts: readonly Front[]) {
  return fronts.filter((front) => ids.has(front.id));
}
export const decorativeDriverCount = ids.size;
