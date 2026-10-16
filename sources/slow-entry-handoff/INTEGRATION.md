# Integration specification

Read/apply `$reference-led-design`, current project instructions and the latest actual BUMER source. Preserve recovery/history. The Hermes ZIP is a mismatched attachment; its test counts/authentication/app are not BUMER evidence. The available local source here is the previous floor-only candidate based on65787fd. Compare the actual working tree before adapting these helpers; do not reset it to this older checkpoint.

## Slower flight

The available camera model uses scored speed150–250, uniform scene scale.4125 and held turbo2.5 with fast4/sec response. Mouse1 is forward acceleration, not an independent optical zoom. Use `comfortIntegrate` as a starting production policy: travel.45, turn.65, held target1.2, held time constant1.25s and release.85s. Preserve altitude,25/30/40-degree lens choreography, terrain scale and near/far planes. Do not slow AudioContext, playbackRate, cue seconds, wave propagation or global requestAnimationFrame.

Keep flight.ts as the only camera/route owner. Thread the same comfort step through fixed240Hz integration, render interpolation, forecast(), reset/replay and snapshots; do not apply a final position multiplier in world.ts. Preserve the original reference-math diagnostic path separately. Existing exact reference-production fixtures must be updated honestly to distinguish the new approved comfort policy from unchanged source-reference fixtures. Do not weaken terrain clearance or remove behavioural assertions.

Event IDs, times and strengths remain unchanged. Once-locked event origins may now differ because they forecast the slower actual route; introduce them once from the same route owner. Preserve their immutability through pause/recovery. Tune speed against real input and normal-speed motion rather than claiming the supplied starting constants are perceptually approved.

## Opening cut: fix the individual layers

In the inspected source, world.ts uses `seconds>=7` to show terrain/depth/caps, and field.setGroundVisible writes uTerrainVisible directly0/1. The first floor chapter ends at12s; globalLightingAt then sets dense directly0→1, creating finer1.5m membership after forward motion begins at8s. These are plausible causes, not a proven full diagnosis. The supplied screenshots have different dimensions/aspects, so they are not a controlled pixel-before/after pair.

Use `openingLayers` for a safe, continuous surface/cap reveal, retaining raw geometry. Keep the sparse point opening; do not hide all LEDs until the reveal. Apply its surface gain to ground emitted/spill colour and the cap/point LOD trade consistently. Ground/depth must stay physically valid while the eye rises; enable real depth only after the full raw height bound plus fixture support and margin clears the eye. Do not fade depth by writing fractional depths, sink lights through terrain, remove occlusion, lower the camera, create a camera pocket or alter raw waves.

Use `denseLayerAt` with the actual section list to crossfade fine emitter weight over about2s. Allocate/prewarm fine buffers before their weight becomes positive, and retain retiring buffers until their weight reaches zero. Thread `weight` into fine points, fine caps and owned fine spill. Use `prepare` for bounded allocation, not visibility. Keep world IDs, common coarse/fine cells, true OFF gates and fixed3m physical terrain. Do not switch the entire board or use callback-count/random-per-frame fades.

Warm the actual terrain, depth, cap, sparse/fine-point, softness, horizon and button-glass variants before enabling Continue. Existing compileAsync on a scene with caps/terrain hidden may omit those programs. Compile hidden variants safely in the same renderer/offscreen pipeline and restore scene/target/viewport state. No second WebGL context. Inspect frame-time and luminance around6–9s and11–15s at the same desktop/portrait viewport, then inspect later density entries/exits. A shader compile pass alone does not prove the pop is fixed.

## Automatic loading to Continue

Use LoadingModel and the DOM/SVG fragments as starting code. Merge into the existing entry/controls DOM and refactor old bindings, rather than inserting duplicate #start/#settings-button IDs. The only normal loading message is the final **click to continue** invitation; show a truthful error/retry when needed. No old app title/song subtitle/Start copy is requested in this composition.

Loading starts on navigation. Mark actual recording bytes/hash acceptance, audio decode, both analysis inputs, font readiness and shader warm-up independently. The model's3.2s minimum is intentional visual pacing, not claimed network progress; do not show invented percentages or mark ready from a timer. Slow loads wait for actual readiness and failures remain retryable. Ignore callbacks from stale retry generations.

After readiness and the calm loading presentation, the ball rolls/topples off the rail, falls onto the glass Play pill, makes one small squash/bounce and settles. Text reveals over roughly1.25s, with Settings slightly delayed. The ball is20px in the provided scaffold, not a new scene sphere/cursor. Before Play is armed, it is disabled and removed from the tab order. In reduced motion use a settled ball and a short/simple reveal rather than bounce. Recompute coordinates on resize so the contact point remains on the actual button.

Drive the loading animation through the app's existing visible UI frame owner; freeze its elapsed presentation when hidden. It must not advance song time or start audio automatically. Cache loading can be intentionally paced; failed loading cannot reach Continue. When the whole page is ready, a single native button supports mouse/touch/Enter/Space and an accessible name. Do not attach duplicate pointerdown+click sound/start handlers.

Continue synchronously requests unlock/resume of the existing transport AudioContext in its trusted activation, then schedules the chime and fade into song sample zero. A short roughly.8s chime/entry lead is acceptable; schedule the one music source after that lead, and make output presentation—not CSS timing—establish song zero. Adapt ShowPlayback/AudioTransport's guarded scheduleFromZero or equivalent in the existing operation-generation owner. Do not call both play() and scheduleFromZero(), create a second source, or let repeat clicks queue starts. If unlock fails, return to the ready invitation with a useful error.

## One Settings control and owned liquid glass

Replace the full Resume/Replay/Settings/Credits toolbar with a single directly opening Settings control. The loading page fades it in once ready; the music scene retains only Settings at top level. Remove the hamburger and retired button handlers/query assumptions from main.ts, controls.ts and index.html, including hard non-null queries that would otherwise crash. Keep existing volume/mute, brightness, reduced motion and fullscreen. Keyboard Space and an appropriate control inside Settings can handle pause/resume and interrupted audio; there is no floating Resume or Replay toolbar. Recovery must remain reachable. No spontaneous song replay.

Preserve credits/licences in the existing static/README/credits records without a floating Credits control. Maintain native focus, Escape closure, focus return and canvas input exclusion while Settings is open. Opening Settings must not acquire held-flight input or unexpectedly restart/stop the song.

The current portfolio source is pinned at08eb0e5c1fd14b683eb4e34fee644ed41069ea90. Adapt its current glassOptics, clean-backdrop sampling, bounded smooth rim and native DOM label/hit-testing model. Existing BUMER start-glass.ts already ports an older version but targets only #start. Generalize to the actual Play/Continue and Settings surfaces and relevant pane buttons. Share one clean encoded scene capture per draw, instance the required surfaces and use exactly one output conversion. Do not sample the previous glass composite into itself, add a second renderer, blur native text or move hitboxes away from their DOM rectangles.

Use soft refraction and subtle neutral edge highlights instead of an opaque pill or harsh permanent outline. The CSS scaffold is a fallback, not proof of optical parity. Keyboard focus and forced-colour fallback remain visible. Do not port portfolio menu particles; retain the current BUMER click treatment. Inspect edges/text at100/125/150/200% and portrait, particularly under active floor highlights.

## Musical button audio

The original ui-tones module supplies a soft sine-partial mallet voice cycling compatible notes, with a short four-note Continue chime. It takes the existing AudioContext/master output; it never creates a new context, music source or an audio file. Respect global mute/volume, actual trusted action and tab/context lifecycle. No automatic loading/ball-impact audio before interaction. Notes happen once per accepted button action, not every hover, slider pixel or animation frame.

Wire reserveHeadroom to the existing music gain/output owner before enabling tones. It supplies a conservative pre-master peak allowance and scheduled note window: reserve headroom before the first note, combine reservations conservatively, then restore the configured music trim after all active voices decay. Do not overwrite user master volume or restore stale gains over a later setting. The helper intentionally requires this callback; its unit tests do not establish full-song mix headroom. Measure the actual combined output under repeated clicks and listen on normal speakers/headphones. Prevent clipping/clicks; tune timbre/levels by listening rather than calling oscillator code high-quality evidence.

## Black fade and thank-you outro

The latest explicit request supersedes8s return/12s perpetual idle as the final presentation. Preserve the exact219.66579s song and destination-presented end semantics. Do not use a fixed219s UI timer or source graph onended alone to cut the music. After actual presented completion, thankYouAt drives an approximately2.6s scene-to-black fade, then **thank you** appears slowly. Fade floor, sky and all composited layers coherently; no leftover stars/glass floating over black.

Confetti is one restrained36-piece flat-paper burst lasting at most4s, pointer-inert, muted complementary colours, no flash or repeating fireworks. Reduced motion omits moving confetti. Drive it from pause-correct presented end age through the existing lifecycle owner, remove its layer when done, stop background GPU/RAF work once the static page settles, and focus/announce the thank-you heading appropriately. Do not preserve a hidden perpetual ambient loop, auto-repeat the song, add a Replay CTA or resurrect scenery.

Update old8s/two-loop capture validators and browser assumptions to the new actual end state; require complete audible tail, black fade, thank-you reveal and completed confetti. Keep the original numerical idle helpers/history recoverable if retired. Restore the correct state after hidden tab/context loss, including during loader, entering and outro.

## Verification and authorized GitHub update

Run helper tests plus the real build and affected app/browser/audio checks. Review uninterrupted normal-speed loading→Continue→opening→song tail→thank-you at desktop and portrait with actual audio. Validate one music source, exact recording hash, mute/SFX headroom, density/cap transitions, slower travel/held ramp, settings/focus, resize/scaling and recovery. Keep limits honest; don't claim listening/device approval or smoothness from counters/stills.

The user explicitly says to update GitHub directly after these fixes. Verify the actual BUMER remote/upstream and preserve a recovery commit. Fetch/reconcile normally, commit only intended BUMER changes/required assets and push the verified branch by normal fast-forward. Do not force-push, change visibility or update Hermes/portfolio. Preserve unrelated edits and avoid committing raw captures, caches, credentials or private handoff archives. If the remote is ahead, integrate and rerun affected checks. If authentication/protection actually blocks publication, report that exact blocker; do not claim push success. GitHub authorization does not request a hosting deployment.

Verify the remote branch commit after push and report its URL/SHA. Also return one complete source/assets/credits/evidence review ZIP with actual-audio recordings, clean extraction/build and preview/capture identities. Do not stop for an extra approval before the already authorized push. In this ChatGPT handoff the BUMER GitHub connection was404, so no repository update has been performed here.
