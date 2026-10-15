# Loader loop 01 source record

User request: replace the rejected loading screen with a spinning loading effect; stop at real readiness and reveal Play. The latest reference clip was absent. This candidate is a documented fallback, not a claimed match to an unseen effect. The previous Inspora page was reported as generated UI and was not reused as an asset or quality authority.

Inspected human-authored source: Griffin Johnston, LDRS Ring 2, https://uiball.com/ldrs/ and https://github.com/GriffinJohnston/ldrs/tree/main/src/elements . Retrieved 2026-10-15. Raw ring2.ts and ring2.scss plus the MIT notice accompany this record; their delivered bytes are hashed by the patch manifest. The public catalogue and actual source were inspected. A live visual match to the catalogue is not claimed.

Observed in source: a partial round-ended SVG circle rotates linearly above a faint static track, with size, stroke, speed and opacity controls. No unknown internal technique is inferred.

Adaptation: original native SVG markup and CSS at 64px with a 2.2px stroke, 24% arc and 1.45s period. The existing black entry background, native Play and owned GPU glass remain. No runtime package, new renderer, image, texture or video dependency was added. The MIT notice is retained conservatively for the inspected reference.

State adaptation: existing audio-byte/decode, analysis, font and shader gates remain authoritative. Their completion pauses the CSS rotation at its current orientation immediately; the arc fades out over .24s, Play fades in during .10–.42s, invitation and Settings follow. There is no fake percentage or forced minimum duration. Reduced motion keeps the loader stationary and reveals ready controls immediately after actual readiness. Error stops the loader; retry has a new generation. Continue and audio unlocking remain owned by the existing transport.

Verification details are in the delivery evidence and LOOP_STATE.json. Build/unit results are separate from browser, continuous perceptual and physical-device claims.

Executor observation: refreshed the official LDRS catalogue/source listing and inspected the bundled Ring2 TypeScript/SCSS and MIT notice. Actual current desktop loading/ready and short-portrait frames are saved in evidence/ui-loops/01-candidate-browser. Native SVG/CSS adaptation remains dependency-free. Continuous short page recordings are retained; selected frames and computed animation checks do not establish human motion approval. A real-network stale-retry regression exposed an older asynchronous transport mutation; its failing/passing evidence is recorded separately.
