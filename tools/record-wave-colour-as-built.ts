import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { FORMATIONS } from "../core/wave-formations.mjs";
import { COMFORT } from "../core/comfort-motion.mjs";
import { WAVE } from "../src/show/waves";
const hash = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const record = {
  authority:
    "Current human four-part review, actual source and new executor evidence; no inferred listening approval",
  application: "Visual Music",
  previous_review: "10b98cf16e18146810860dda96298507ca767b8a",
  previous_publication: "69ab1308a264905dc854420b88d8308cda55a9c7",
  song: {
    path: "public/audio/around-the-world.mp3",
    sha256: await hash("public/audio/around-the-world.mp3"),
    decoded_seconds_previous: 219.66579166666668,
    exact_bytes_preserved: true,
    source_clock:
      "AudioTransport.presentation; one sample-zero music source, complete presented tail",
  },
  motion: {
    ...COMFORT,
    base_route_score_sha256: await hash("show/camera-score.json"),
    fixed_origins_sha256: await hash("show/camera-origins.json"),
    route_owner_sha256: await hash("src/scene/flight.ts"),
    scope:
      "Base camera, no-input travel/turning, lens/altitude and fixed240Hz owner unchanged. Only held attack is .45s at existing1.2x cap/.85s release.",
  },
  waves: {
    ...WAVE,
    formations: FORMATIONS.map((f) => ({
      ...f,
      end: Number.isFinite(f.end) ? f.end : "presented song end",
    })),
    birth:
      "Immutable original event.time selects [kind,cos(angle),sin(angle),mix] for its full life; old and new births overlap",
    shared_surface:
      "Same CPU rawHeight / runtime heightGLSL / exact3m triangle interpolation; nested1.5m LEDs, depth, picking, clearance and star occlusion share it; no horizontal displacement",
    uniform_order:
      "uFrontForms follows state.fronts; uLocalForms follows decorationFronts; every unused slot resets to [0,1,0,0]",
    exchange_support:
      "Exact compact normal-distance window; directional transverse Gaussian footprint is not globally compact",
    musical_status:
      "Existing section anchors retained as authored proposals; no new lyric/downbeat approval",
  },
  lighting: {
    sky: "Black at all elevations/chapters; atmosphere/scattered additive floor term removed",
    emitters:
      "Existing discrete LEDs, local halos/spill and depth-tested stars; no new pass/object/asset",
    colour:
      "Continuous signed crest phase within existing cohesive palette rows; low/accent controls retain local envelope; white rests and core/halo/spill OFF gate remain authoritative",
    off_cell_optimization:
      "When activation*landscapeGate is exactly zero and visualPhase.x is zero, return zero emission/spill/activation before wave and palette work; no epsilon, depth or independent line-art change. Historical idle blend retains its full path.",
    exposure_and_physical_spacing: "unchanged",
  },
  preserved: [
    "exact MP3",
    "silent real-readiness loading",
    "landing ball/Play/invitation",
    "owned portfolio glass/click animation",
    "musical notes/Continue chime/master headroom",
    "one Settings surface",
    "native pointer/primary touch",
    "pause/recovery/reduced motion",
    "smooth terrain/dense entry",
    "complete tail/finite black thank-you/confetti/RAF stop",
  ],
  evidence:
    "evidence/black-sky-wave-colour; historical identities remain under their original directories",
  source_record: "sources/black-sky-wave-colour-source-record.md",
  lifecycle_verification_repair:
    "On first field entry, queue the existing controls refresh after RAF scheduling so Pause appears immediately; no audio clock, camera or UI animation change",
  boundaries:
    "Floor only; no room/SAO/cursor ball/trace/scenery/extra air structures/generated media. No hosting, visibility or unrelated repo/app change.",
  approval:
    "Measurements, captures and tests are technical evidence; human continuous visual/listening, physical device/AV and exact display approval remain pending.",
};
await writeFile(
  "show/black-sky-wave-colour.as-built.json",
  JSON.stringify(record, null, 2) + "\n",
);
console.log(
  "Recorded current source-derived wave, route, sky, colour and lifecycle authority",
);
