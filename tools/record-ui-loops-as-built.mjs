/** Source-derived overlay; historical wave/camera records retain their scope. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {LOAD_TASKS,MIN_LOADING_SECONDS,READY_REVEAL_SECONDS} from '../core/loading-model.mjs';
import {COMFORT} from '../core/comfort-motion.mjs';
import {FINISH_SECONDS} from '../core/opening-layers.mjs';
import {confettiAt} from '../core/confetti.mjs';
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const paths=['src/main.ts','src/input.ts','src/scene/start-glass.ts','src/style.css','core/loading-model.mjs','core/confetti.mjs','core/comfort-motion.mjs','src/scene/flight.ts','src/scene/world.ts','src/audio/transport.ts','show/camera-score.json','show/camera-origins.json','public/audio/around-the-world.mp3'];
const identities=[];for(const path of paths)identities.push({path,sha256:await hash(path)});
const record={application:'Visual Music',review_baseline:'1c86a4d317ebfc1512cbb5176c5ff08bc15cca70',publication_baseline:'ca4ef694b7978cf929bf4faa580ca995b2b0a89b',
 authority:'Four serial UI tasks plus the requested3.5s minimum, current source and executor evidence; not human approval',
 inherited:'black-sky-wave-colour.as-built.json owns unchanged floor, event-born waves and camera policy; this overlay supersedes its landing-ball, glass brightness and confetti descriptions.',
 loader:{tasks:LOAD_TASKS,minimum_wait_seconds:MIN_LOADING_SECONDS,ready_reveal_seconds:READY_REVEAL_SECONDS,spinner:'Original SVG arc; spin until both real gates and3.5visible seconds complete, pause before the existing reveal/error; reduced motion stationary.',retry:'Generation checks before accepting audio bytes, analysis or decoded completion. Continue owns one unlock/source-zero start and existing chime.'},
 glass:{neutral_film_rgb:.52,film_mix:.12,source:'Owned portfolio optics unchanged; native labels, actual opaque reduced-transparency and forced system colours.',measured_button_body_rgb_before:1,measured_button_body_rgb_after:16},
 confetti:{count:confettiAt(1).length,cap:confettiAt(1,{count:500}).length,cohorts:6,birth_span_upper_bound_seconds:.94,death_upper_bound_seconds:3.82,confetti_window_seconds:4,finite_finish_seconds:FINISH_SECONDS,clock:'AudioTransport.presentation endAge; no repeating emitter, reduced motion omitted, canvas and RAF removed.'},
 motion:{...COMFORT,change:'Only gesture/button ownership repair. Ordinary boost already worked; chorded pointermove buttons now reconciled for canvas-owned gestures. No base pace/lens/route change.',measured_ratio_4s:1.1871514157619159,window_seconds:[84.25,88.25]},
 audio:{sha256:await hash('public/audio/around-the-world.mp3'),decoded_seconds:219.66579166666668,clock:'Sole AudioTransport.presentation; exact complete MP3 and .8s Continue lead preserved.'},
 identities,evidence:'evidence/loader-minimum',previous_complete_review:'evidence/ui-loops',source_record:'sources/ui-loops-source-record.md',
 limits:'Missing newest loader clip: declared human-authored ring fallback. Human continuous listening/motion, physical devices/AV and current uncaptured foreground performance approval remain separate. No generated media or hosting update.'};
await writeFile('show/ui-loops.as-built.json',JSON.stringify(record,null,2)+'\n');
console.log('UI as-built recorded:',identities.length,'source identities');
