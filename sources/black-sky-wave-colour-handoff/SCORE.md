# Candidate wave score

These are existing song-section anchors, not newly verified lyric labels. An event takes the profile active at its **birth**, then keeps it through its complete 5.6s life. The previous section's live crests finish normally. No song-time remapping or new event detection is introduced.

| Event birth seconds | Formation | New-shape weight | Intent |
|---|---|---:|---|
| 0–25 | Approved circles | 0% | Preserve the opening and first pools exactly |
| 25–40 | Oval fronts | 82% | Wide lateral crests, a different arrival angle |
| 40–56 | Approved circles | 0% | Recognisable breathing space |
| 56–75 | Diagonal ridge packets | 84% | Broad finite swells passing across the floor |
| 75–94 | Rounded chevrons | 80% | A forward crest with trailing wings |
| 94–106 | Crossed ridges | 86% | Two directional fronts intersect without adding energy twice |
| 106–123 | Paired rings | 85% | Two crests separated by 24m, one event clock |
| 123–139 | Diagonal ridges, new heading | 86% | A second direction, using the same restrained language |
| 139–158 | Approved circles | 0% | Quiet white rest; palette row zero remains white |
| 158–175 | Oval fronts, rotated | 88% | Return of the broad shape from another axis |
| 175–190 | Rounded chevrons | 84% | Strong forward flow with local colour along the crest |
| 190–201 | Crossed ridges, new heading | 80% | Short final contrast |
| 201–end | Approved circles | 0% | Resolve into the approved cadence/tail and finite finish |

The unused weight retains the approved circular component. The original base swell and global `14*tanh(height/14)` saturation remain. Lateral vertices stay fixed, so depth, caps, picking and clearance can use the same height field.

Colour is not another mode switch. Existing two-driver waves move a signed colour phase through each active palette, with a local envelope and the existing low/accent controls. The complete physical height kernel still uses all live fronts. Restricted colours stay inside their current LUT family; rainbow sections use the existing cyclic LUT. Neutral and OFF cells remain available as visual rests.

Tune these weights and headings against the actual route and actual audio before accepting the result. Reduce a distracting profile rather than fill every section with a different effect. Keep this score a proposal until continuous visual/listening review supports an as-built record.
