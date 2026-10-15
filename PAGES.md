# Visual Music on GitHub Pages

Live: **https://denoax.github.io/visual-music/**

The source stays in the private `Denoax/bumer-exe` repository. The public `Denoax/visual-music` repository contains the production build, original bundled recording, font, notices and a hash inventory. The account plan rejected Pages on the private source repository; its visibility is unchanged.

Pages serves the public repository’s `main` branch from `/`. `.nojekyll` keeps Vite output unchanged. Relative Vite URLs support the `/visual-music/` project path. No custom domain or account-root site is changed.

To update, build this source with Node 22 and `npm ci && npm run build`. Copy the complete `dist/` file tree into a clean deployment-repository checkout; preserve `.git`, README, credits, `.nojekyll` and its deployment receipt. Remove only obsolete generated files listed in the preceding receipt. Recompute `deployment.json` from every production file, record the source commit, verify the exact MP3 hash and test the production build at the project subpath. Review and commit the scoped changes, then push normally to `main`. Never copy source packs, recordings, local paths, credentials or caches into the public deployment repository.

The source and current runtime are unchanged by this hosting update. Publication smoke checks cover real HTTPS asset loading, browser stereo decode, direct Start at zero, Settings without pause, pause/resume and replay at desktop/portrait sizes. This is not a new full-song, physical-device, foreground-performance or human listening approval. Full existing review recordings remain local.

## Current source-only review

The slow-entry/thank-you continuation explicitly authorizes pushing source without hosting deployment. The public Pages build remains at84b527230038ccaa957d27bb048847926b8befb4. Use the owned local preview for the new review; the live website does not yet contain these changes.
